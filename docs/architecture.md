# Opal Architecture

Opal is a Solana-native optimistic oracle for natural-language statements. The protocol treats every new assertion as true by default during `Asserted`; disputers can challenge that default for direct economic upside, so the protocol design does not require an external monitoring or bot layer.

This document describes the target architecture for the prediction-market wedge. Resolution rules are detailed in [resolution.md](resolution.md), and economics are detailed in [tokenomics.md](tokenomics.md).

## Design Invariants

- `AssertionAccount` does not store a tentative resolution field.
- The current non-final answer is inferred from state: `Asserted` means default `True`; `AssertedLLM` means read `LLMResolutionRound.outcome`; `PendingVote` and `Voting` mean that LLM answer is under challenge and no final answer exists yet.
- `outcome` is `None` until `state == Resolved`.
- `Asserted` and `AssertedLLM` are liveness states: the current answer can still be challenged.
- `PendingLLM` and `PendingVote` are intermediary states: a dispute has been accepted, but the next resolution layer is not finished or active yet.
- `Resolved` is terminal: `outcome` is set and irreversible consumers can settle.
- The statement lives onchain as a string.
- Auxiliary data lives offchain as plain text; only `auxiliary_hash` is stored onchain.
- PUSD is the collateral asset for bonds, slashing, rewards, and fees.
- OPAL is the voting and governance asset.
- V1 LLM resolution uses Switchboard On-Demand/Oracle Quotes to return a numeric outcome code from a configured LLM path.
- The hardened future resolver may use Nosana-powered inference and/or an LLM Council, but v1 implementation should not require that.
- Final escalation uses MagicBlock private voting with OPAL-weighted TWAV.

## Onchain Account Model

### `AssertionAccount`

The primary PDA for an assertion. It intentionally stores enough summary fields that an integrator can read one account and know the current state, whether the assertion was disputed once or twice, and which round accounts contain the LLM and vote resolutions.

```rust
pub struct AssertionAccount {
    pub id: Pubkey,
    pub asserter: Pubkey,
    pub statement: String,
    pub auxiliary_hash: String,
    pub bond_vault: Pubkey,
    pub state: AssertionState,
    pub liveness_deadline: i64,
    pub outcome: Option<ResolutionOutcome>,
    pub finalized_at: Option<i64>,
    pub dispute_count: u8,
    pub llm_dispute: Option<Pubkey>,
    pub vote_dispute: Option<Pubkey>,
    pub llm_resolution_round: Option<Pubkey>,
    pub vote_resolution_round: Option<Pubkey>,
    pub bump: u8,
}
```

Implementation notes:

- On creation, `state = Asserted`, `outcome = None`, and `dispute_count = 0`.
- While `state = Asserted`, the current non-final answer is the optimistic default `True`.
- When the first dispute is filed, `dispute_count = 1`, `llm_dispute` is set, `llm_resolution_round` is set, and `state = PendingLLM`.
- When the LLM result is posted, `state = AssertedLLM`; the current non-final answer is `LLMResolutionRound.outcome`.
- When the second dispute is filed, `dispute_count = 2`, `vote_dispute` is set, `vote_resolution_round` is set, and `state = PendingVote`.
- When voting is active, `state = Voting`; the LLM result remains the challenged result until the vote resolves.
- When finalized, `state = Resolved` and `outcome` is set.

### `LLMDisputeAccount`

The first dispute account. It does not need to store the challenged resolution because the first dispute always challenges the default optimistic `True`.

```rust
pub struct LLMDisputeAccount {
    pub assertion: Pubkey,
    pub disputer: Pubkey,
    pub bond_amount_PUSD: u64,
    pub created_at: i64,
    pub resolution_round: Pubkey,
    pub settlement_resolution: Option<ResolutionOutcome>,
    pub dispute_correct: Option<bool>,
    pub settled: bool,
    pub bump: u8,
}
```

`dispute_correct = settlement_resolution != True`. If the LLM result is not challenged, `settlement_resolution` is the LLM result. If the LLM result is challenged, `settlement_resolution` is the final vote result.

### `VoteDisputeAccount`

The second dispute account. It challenges the LLM result stored on `LLMResolutionRound`.

```rust
pub struct VoteDisputeAccount {
    pub assertion: Pubkey,
    pub disputer: Pubkey,
    pub challenged_llm_resolution_round: Pubkey,
    pub challenged_llm_resolution: ResolutionOutcome,
    pub bond_amount_PUSD: u64,
    pub created_at: i64,
    pub resolution_round: Pubkey,
    pub settlement_resolution: Option<ResolutionOutcome>,
    pub dispute_correct: Option<bool>,
    pub settled: bool,
    pub bump: u8,
}
```

`dispute_correct = settlement_resolution != challenged_llm_resolution`.

### `BondVault`

A PDA-controlled PUSD token account holding assertion and dispute collateral until settlement.

### `LLMResolutionRound`

The account tracking Switchboard-backed LLM resolution for the first dispute.

```rust
pub struct LLMResolutionRound {
    pub assertion: Pubkey,
    pub dispute: Pubkey,
    pub switchboard_program: Pubkey,
    pub switchboard_queue: Pubkey,
    pub switchboard_feed: Pubkey,
    pub switchboard_feed_hash: [u8; 32],
    pub switchboard_quote: Option<Pubkey>,
    pub switchboard_quote_slot: Option<u64>,
    pub max_staleness_slots: u64,
    pub prompt_hash: [u8; 32],
    pub variable_overrides_hash: Option<[u8; 32]>,
    pub response_hash: Option<[u8; 32]>,
    pub evidence_hash: Option<[u8; 32]>,
    pub outcome_code: Option<u8>,
    pub outcome: Option<ResolutionOutcome>,
    pub requested_at: i64,
    pub resolved_at: Option<i64>,
    pub challenge_deadline: Option<i64>,
    pub settled: bool,
    pub bump: u8,
}
```

The Switchboard feed should produce a numeric outcome code. The program maps codes to outcomes: `0 = True`, `1 = False`, `2 = TooEarly`, `3 = Unresolvable`.

### `VoteResolutionRound`

The account tracking MagicBlock private voting for the second dispute.

```rust
pub struct VoteResolutionRound {
    pub assertion: Pubkey,
    pub dispute: Pubkey,
    pub magicblock_validator: Pubkey,
    pub permission_account: Option<Pubkey>,
    pub delegated_vote_state: Option<Pubkey>,
    pub delegated: bool,
    pub committed: bool,
    pub voting_starts_at: Option<i64>,
    pub voting_deadline: Option<i64>,
    pub reveal_deadline: Option<i64>,
    pub total_valid_weight: u128,
    pub aggregate_votes: VotesPerOutcome,
    pub final_outcome: Option<ResolutionOutcome>,
    pub settled: bool,
    pub bump: u8,
}
```

`PendingVote` exists so the protocol can create the vote round, delegate required vote state to MagicBlock, and initialize any permission or private token plumbing before votes are accepted.

### `VoteRecord`

The per-voter account for an escalated assertion.

```rust
pub struct VoteRecord {
    pub vote_round: Pubkey,
    pub voter: Pubkey,
    pub locked_opal: u64,
    pub commitment: [u8; 32],
    pub choice: Option<ResolutionOutcome>,
    pub voted_at: i64,
    pub revealed_at: Option<i64>,
    pub settled: bool,
    pub bump: u8,
}
```

Votes are private during the active voting window. The revealed `choice` is populated only during reveal/settlement.

### `ProtocolConfig`

The account containing protocol-level parameters: bond minimums and ratios, protocol fee shares, voter reward and slashing shares, liveness/challenge/voting windows, Switchboard feed config, MagicBlock validator/config, treasury address, and governance authority.

### `Treasury`

The protocol-controlled destination for configured PUSD fees and treasury allocations.

## Instruction Flow

1. `create_assertion`
   - Stores the statement and auxiliary data hash.
   - Locks the asserter's PUSD bond.
   - Sets `state = Asserted`, `outcome = None`, and `liveness_deadline`.

2. `dispute_assertion`
   - Allowed while the assertion is `Asserted` and before `liveness_deadline`.
   - Locks the first disputer's PUSD bond.
   - Creates `LLMDisputeAccount`.
   - Creates `LLMResolutionRound`.
   - Sets `state = PendingLLM`, `dispute_count = 1`, and round/dispute pointers on `AssertionAccount`.

3. `submit_llm_resolution`
   - Called with a valid Switchboard On-Demand update or Oracle Quote for the configured LLM feed.
   - Verifies feed identity, queue, quote freshness, and numeric outcome code.
   - Maps the feed's numeric outcome code to `ResolutionOutcome`.
   - Stores the LLM result on `LLMResolutionRound`.
   - Sets `AssertionAccount.state = AssertedLLM` and opens the LLM challenge deadline.

4. `finalize_llm_resolution`
   - Allowed after the LLM challenge window if no vote dispute exists.
   - Sets `state = Resolved` and `outcome = LLMResolutionRound.outcome`.
   - Sets `LLMDisputeAccount.settlement_resolution`, computes `dispute_correct`, and settles bonds.

5. `challenge_llm_resolution`
   - Allowed while the assertion is `AssertedLLM` and before the LLM challenge deadline.
   - Locks the second disputer's PUSD bond.
   - Creates `VoteDisputeAccount` with `challenged_llm_resolution = LLMResolutionRound.outcome`.
   - Creates `VoteResolutionRound`.
   - Sets `state = PendingVote`, `dispute_count = 2`, and round/dispute pointers on `AssertionAccount`.

6. `open_vote`
   - Initializes/delegates MagicBlock vote state from the base layer.
   - Sets voting deadlines.
   - Moves the assertion from `PendingVote` to `Voting`.

7. `cast_vote`
   - Used during `Voting`.
   - Sent to the MagicBlock ER connection after delegation.
   - Locks OPAL and records a private vote commitment through the custom MagicBlock voting path.

8. `reveal_or_settle_vote`
   - Used after the voting window.
   - Sent to the ER connection while vote state is delegated.
   - Reveals or settles private votes, computes TWAV influence, and updates aggregate totals.

9. `finalize_vote_resolution`
   - Resolves the assertion from aggregate weighted votes.
   - Commits and undelegates vote state back to Solana when needed.
   - Sets `VoteResolutionRound.final_outcome`.
   - Sets `AssertionAccount.state = Resolved` and `AssertionAccount.outcome = VoteResolutionRound.final_outcome`.
   - Sets settlement fields on both dispute accounts and settles PUSD/OPAL rewards and slashing.

10. `finalize_undisputed`
    - Allowed after `liveness_deadline` if no dispute exists.
    - Sets `state = Resolved` and `outcome = True`.
    - Returns the asserter bond minus configured fees.

## State Machine

```text
Asserted(default=True)
  | liveness expires with no dispute
  v
Resolved(True)

Asserted(default=True)
  | first dispute
  v
PendingLLM
  | Switchboard LLM result posted
  v
AssertedLLM(LLMResolutionRound.outcome)
  | LLM challenge window expires
  v
Resolved(LLMResolutionRound.outcome)

AssertedLLM(LLMResolutionRound.outcome)
  | second dispute
  v
PendingVote
  | vote round initialized
  v
Voting
  | MagicBlock private TWAV finalized
  v
Resolved(VoteResolutionRound.final_outcome)
```

## Integrator Contract

Prediction markets and other consumers should read assertion id, statement, auxiliary hash, state, final outcome, dispute count, dispute pointers, resolution round pointers, and finalized timestamp.

Integrator rules:

- In `Asserted`, the current non-final answer is the optimistic default `True`.
- In `AssertedLLM`, the current non-final answer is `LLMResolutionRound.outcome`.
- In `PendingVote` and `Voting`, the LLM answer is under challenge; final answer is not available until `Resolved`.
- Irreversible market settlement should require `state == Resolved`.
- Consumers should ignore `AssertionAccount.outcome` unless `state == Resolved`.
- Consumers can inspect `dispute_count`, `llm_dispute`, `vote_dispute`, `llm_resolution_round`, and `vote_resolution_round` to understand whether the assertion was disputed once or twice and what each layer produced.
- A later correction requires a new assertion. It must not mutate a resolved assertion.

## External Systems

**Switchboard**
V1 uses Switchboard On-Demand/Oracle Quotes to produce a numeric LLM outcome code. The feed may call an LLM through an `LlmTask` or through an HTTP endpoint, then parse/map the response into an allowed numeric outcome code. The client fetches oracle signatures/update instructions through Crossbar, and `submit_llm_resolution` verifies the quote/feed identity, queue, freshness, and value before updating Opal state.

Switchboard implementation requirements:

- Store the expected feed hash and queue on `LLMResolutionRound`.
- Use the mainnet or devnet Switchboard program and queue from protocol config.
- Verify the quote account is canonical for the expected queue/feed hash.
- Reject stale quotes using `max_staleness_slots`.
- Reject values outside the allowed outcome code set.
- If the feed value is scaled, require exact scaled values for the four outcome codes rather than rounding.
- If variable overrides are used to pass assertion-specific data, store `variable_overrides_hash` and require the offchain transcript hash to match. The safer v1 default is an assertion-specific prompt/feed hash so the feed identity commits to the statement and auxiliary data.

**MagicBlock**
MagicBlock Private Ephemeral Rollups provide the private execution environment for the OPAL-weighted voting escalation. Opal programs should use the MagicBlock Anchor setup with `ephemeral-rollups-sdk`, the `#[ephemeral]` program macro, `#[delegate]` contexts for delegation, and `#[commit]` contexts for commit/undelegate.

MagicBlock implementation requirements:

- Use dual connections: base layer for initialization/delegation, ER connection for operations on delegated vote state, commits, and undelegation.
- Resolve the devnet ER endpoint and validator together through the MagicBlock router when env overrides are absent.
- Send delegation transactions to the base layer.
- Send `cast_vote`, reveal/settlement mutations, commit, and undelegate transactions to the ER connection after delegation.
- Use matching PDA seeds between account definitions and delegate calls.
- Check delegation status before accepting ER-side vote mutations.
- Use `skipPreflight: true` for ER transactions where the client stack requires it.
- Wait for state propagation after delegation and undelegation in tests.

**Private Payments API**
The Private Payments API can help build unsigned SPL token transactions for private OPAL deposit, transfer, or withdrawal flows, but Opal should not model vote casting as only a payment. The API is stateless: it builds unsigned transactions and the client signs/submits them to the indicated base or ER endpoint. If used for OPAL, the OPAL mint must be passed explicitly; do not rely on API defaults. Vote casting needs a custom private voting instruction because the protocol must preserve choice, timestamp, locked OPAL, TWAV, reveal/settlement, and slashing semantics.

**Nosana and LLM Council Future Path**
Future resolver hardening may move model inference to Nosana and/or query an LLM Council. That path should preserve the same consumer-facing finality: integrators still read resolved assertions.
