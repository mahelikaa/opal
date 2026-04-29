# Opal Resolution

Resolution is the process that turns the optimistic default answer into a final answer. An assertion starts in `Asserted`, where the statement is treated as `True` by default; disputes move the assertion through LLM resolution and, if necessary, private OPAL voting.

## Assertion Requirements

Every assertion includes:

1. An onchain `statement`: a short natural-language sentence.
2. An onchain `auxiliary_hash`: the content hash of offchain plain text that helps resolvers and voters interpret the statement.

The protocol does not enforce a schema for the auxiliary data behind `auxiliary_hash`. It should ideally include source priority, evidence links, and ambiguity handling. If the auxiliary data is vague, missing, or contradictory, the statement is more likely to resolve `Unresolvable`.

## Outcome Rules

**`True`**
The available evidence verifies the statement.

**`False`**
The available evidence contradicts the statement.

**`TooEarly`**
The real-world truth needed to resolve the statement does not exist yet or has not been published at resolution time.

**`Unresolvable`**
The statement cannot be safely resolved. Use this when source priority is unclear, evidence conflicts, evidence is unavailable, the statement is ambiguous, auxiliary data is too weak, or voting fails to reach the configured supermajority threshold.

## Current Answer By State

`AssertionAccount` does not store a tentative resolution field. The current non-final answer is inferred from state and linked round accounts:

- `Asserted`: current non-final answer is the optimistic default `True`.
- `PendingLLM`: the default `True` has been disputed and no LLM answer has been posted yet.
- `AssertedLLM`: current non-final answer is `LLMResolutionRound.outcome`.
- `PendingVote`: the LLM answer has been challenged and vote setup is in progress.
- `Voting`: final answer is pending vote settlement.
- `Resolved`: final answer is `AssertionAccount.outcome`.

## Lifecycle

### 1. Asserted

When an assertion is created:

- the asserter posts a PUSD assertion bond
- `state = Asserted`
- `outcome = None`
- `liveness_deadline` is set
- `auxiliary_hash` points to offchain auxiliary data

If the liveness window expires with no dispute, the assertion resolves `True` without LLM review or voting.

### 2. First Dispute: LLM Path

A disputer may challenge an `Asserted` statement before the liveness deadline by posting a PUSD bond.

The first dispute:

- creates `LLMDisputeAccount`
- creates `LLMResolutionRound`
- moves the assertion to `PendingLLM`

The economic reason this does not need an external monitoring layer is that a correct disputer can win collateral by challenging the incorrect default `True` resolution.

### 3. Switchboard LLM Resolution

V1 uses Switchboard On-Demand/Oracle Quotes to produce the LLM result. A Switchboard feed is made from jobs and tasks; for Opal, the feed must return a numeric outcome code that the program can map deterministically.

Recommended outcome code mapping:

| Code | Outcome        |
| ---- | -------------- |
| `0`  | `True`         |
| `1`  | `False`        |
| `2`  | `TooEarly`     |
| `3`  | `Unresolvable` |

The LLM path should:

- build a prompt from the statement and offchain auxiliary data identified by `auxiliary_hash`
- ask for one allowed outcome
- map the LLM response into the numeric outcome code
- fetch the Switchboard update/quote through Crossbar
- verify feed identity, queue, quote freshness, and allowed outcome code in `submit_llm_resolution`
- store `switchboard_feed_hash`, `switchboard_quote`, `switchboard_quote_slot`, `prompt_hash`, optional `variable_overrides_hash`, optional `response_hash`, optional `evidence_hash`, `outcome_code`, and `outcome` on `LLMResolutionRound`

The feed can use a Switchboard `LlmTask` directly or call a controlled HTTP endpoint that runs the LLM and returns a parseable result. Because Switchboard feeds are consumed onchain as numeric values, the full natural-language response should be stored by hash/reference rather than treated as the direct onchain output.

Switchboard verification rules:

- the quote/feed must match the expected feed hash for this `LLMResolutionRound`
- the quote must come from the configured queue
- the quote must be recent enough under `max_staleness_slots`
- the quote value must map exactly to one of the four allowed outcome codes
- if Switchboard scaling is used, Opal should compare against exact scaled constants for `0`, `1`, `2`, and `3`
- if variable overrides are used, the override hash must be stored and auditable; the safer default is an assertion-specific prompt/feed hash

When the LLM result is accepted:

- `LLMResolutionRound.outcome = llm_outcome`
- `state = AssertedLLM`
- `llm_challenge_deadline` opens

### 4. LLM Result Unchallenged

If no second dispute is filed before the LLM challenge deadline:

- the assertion becomes `Resolved`
- `outcome = LLMResolutionRound.outcome`
- `LLMDisputeAccount.settlement_resolution = outcome`
- `LLMDisputeAccount.dispute_correct = outcome != True`
- bonds are settled according to [tokenomics.md](tokenomics.md)

### 5. Second Dispute: Vote Path

If a participant challenges the LLM result during the challenge window, they post the second PUSD dispute bond.

The second dispute:

- creates `VoteDisputeAccount`
- stores `challenged_llm_resolution = LLMResolutionRound.outcome`
- creates `VoteResolutionRound`
- moves the assertion to `PendingVote`

`PendingVote` exists because there is setup work before votes should be accepted: initialize the vote round, configure MagicBlock execution, set deadlines, and prepare OPAL locking or private token plumbing.

### 6. MagicBlock Private Voting

Opal should use a custom MagicBlock private voting flow for vote casting.

The private payments API can help with private SPL token deposit, transfer, and withdrawal flows, but it should not be the canonical vote-casting mechanism. A vote is not just a payment; it needs a private choice, locked OPAL, a voting timestamp, TWAV calculation, reveal/settlement behavior, and slashing eligibility. The API only builds unsigned transactions; the client still signs and submits them to the base or ER endpoint indicated by the response.

Recommended voting architecture:

- the program uses MagicBlock's `ephemeral-rollups-sdk` and `#[ephemeral]` macro
- `open_vote` initializes `VoteResolutionRound`, delegates required vote state from the base layer to MagicBlock, and moves the assertion from `PendingVote` to `Voting`
- the client uses a base-layer connection for initialization/delegation and an ER connection for delegated vote mutations
- voters lock OPAL in protocol-controlled escrow or a MagicBlock-compatible private token flow; if the Private Payments API is used, pass the OPAL mint explicitly
- `cast_vote` is sent to the ER connection and records a private vote commitment with `locked_opal` and `voted_at`
- live vote direction remains hidden during the voting window
- after voting closes, reveal/settlement runs on the ER connection while state is delegated
- aggregate results are committed back to Solana
- `finalize_vote_resolution` writes the final outcome to `AssertionAccount`, commits or undelegates vote state as needed, and settles rewards/slashing

Canonical influence:

```text
vote_influence = locked_opal * time_weight
```

`time_weight` should be deterministic and monotonic: earlier valid votes get more weight than later valid votes.

### 7. Vote Tally

A decisive outcome requires:

```text
winning_outcome_weight >= 67% of total_valid_weight
```

The protocol parameter is:

```text
supermajority_bps = 6700
```

If no outcome reaches the threshold, the vote outcome is `Unresolvable`.

When voting finalizes:

- `VoteResolutionRound.final_outcome` is set
- `AssertionAccount.outcome` is set to that value
- `state = Resolved`
- both dispute accounts receive their settlement fields

## Dispute Correctness

For `LLMDisputeAccount`, the challenged answer is implicit: the first dispute always challenges the default `True`. It is correct when the settlement resolution is anything other than `True`.

```text
llm_dispute_correct = settlement_resolution != True
```

If the LLM result is not challenged, the settlement resolution is the LLM result. If the LLM result is challenged, the settlement resolution is the final vote result.

For `VoteDisputeAccount`, the challenged answer is explicit: it stores `challenged_llm_resolution` from `LLMResolutionRound.outcome`. It is correct when the vote settlement differs from that LLM result.

```text
vote_dispute_correct = settlement_resolution != challenged_llm_resolution
```

This rule means the second dispute is correct whenever voting moves the protocol away from the LLM result it challenged.

## Finality

Once `state == Resolved`:

- `outcome` must be set
- settlement can occur
- consumers should treat the result as final
- later corrections require a new assertion

The protocol should support linking related or corrective assertions, but it should not mutate the outcome of a resolved assertion.

## Future Resolver Path

V1 resolver:

- Switchboard custom feed
- one configured LLM path
- numeric outcome code posted to `LLMResolutionRound`

Future hardening:

- Nosana-powered custom inference
- multiple model outputs
- LLM Council aggregation
- richer evidence attestations

Future resolver changes should preserve the same state machine and integrator contract.
