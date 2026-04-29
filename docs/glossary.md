# Opal Oracle Glossary

This glossary is the shared vocabulary for Opal. It gives the project overview and names the terms used throughout the protocol docs. Detailed mechanics live in [architecture.md](architecture.md), [resolution.md](resolution.md), and [tokenomics.md](tokenomics.md).

## Core Protocol

**Opal**
A Solana-native optimistic oracle for verifying real-world statements. Statements are considered true by default unless an economically incentivized disputer challenges them, so the protocol design does not require an external monitoring or bot layer.

**Assertion** - `AssertionAccount`
The onchain object created when an asserter posts a natural-language statement with a PUSD bond attached.

**Statement** - `statement: String`
The short, human-readable text being asserted. A statement is the sentence whose truth the protocol is asked to resolve.

**Auxiliary Data** - `auxiliary_hash: String`
Offchain plain text supplied by the asserter to help resolve the statement. It is stored outside the assertion account, and the assertion stores only its content hash. The protocol does not enforce a schema for this text, but it should ideally include source priority, evidence links, and ambiguity handling. Weak auxiliary data increases the chance of `Unresolvable`.

**Proposed LLM Resolution** - `LLMResolutionRound.outcome`
The non-final result posted by the LLM resolver after the first dispute. It opens the LLM challenge window and becomes final only if no second dispute is filed.

**Final Resolution** - `outcome: Option<ResolutionOutcome>`
The terminal result on the assertion. It is `None` until `state == Resolved`.

## States And Outcomes

**Assertion State** - `AssertionState`
The lifecycle stage of an assertion.

- `Asserted` - initial liveness state; the statement is optimistically treated as `True`, first dispute is allowed, and `outcome = None`.
- `PendingLLM` - first dispute has been filed and the protocol is waiting for the Switchboard-backed LLM result.
- `AssertedLLM` - the LLM result has been posted on `LLMResolutionRound`, and the LLM challenge window is open.
- `PendingVote` - the LLM result has been challenged and the vote resolution round is being initialized.
- `Voting` - OPAL-weighted private voting is active or settling through MagicBlock.
- `Resolved` - terminal state; `outcome` is set and integrators can safely settle irreversible positions.

**Resolution Outcome** - `ResolutionOutcome`
The possible answer values used by LLM and vote resolution rounds, and by the final assertion outcome.

- `True` - the statement is verified as correct.
- `False` - the statement is verified as incorrect.
- `TooEarly` - the statement cannot be resolved yet because the relevant real-world truth does not exist or has not been published at resolution time.
- `Unresolvable` - the statement cannot be safely resolved from available evidence, auxiliary data, or voting consensus.

**TooEarly**
A first-class outcome for premature assertions. It is distinct from `False` because the same statement may later become resolvable.

**Unresolvable**
A first-class outcome for statements that cannot be safely resolved. It is not a protocol failure.

## Participants

**Asserter** - `asserter: Pubkey`
The participant who submits an assertion and locks the assertion bond.

**Disputer**
The participant who challenges the current resolution stage by posting a dispute bond.

**LLM Disputer**
The first disputer. This participant challenges the default optimistic `True` assumption and triggers LLM resolution.

**Vote Disputer**
The second disputer. This participant challenges the proposed LLM resolution and triggers OPAL voting.

**Voter**
An OPAL holder who locks OPAL to participate in the final private voting escalation.

**LLM Resolver**
The v1 resolution service for first disputes. It uses Switchboard On-Demand/Oracle Quotes to call a configured LLM path and return a numeric outcome code.

**LLM Council**
A future hardening path where multiple models or model operators produce independent outputs before aggregation.

**Integrator**
Any protocol or application that consumes Opal outcomes. Integrators can infer the current resolution stage from `AssertionAccount.state` and the linked round accounts, but final settlement should require `state == Resolved`.

## Accounts

**AssertionAccount** - `seeds: [b"assertion", id]`
The primary PDA for an assertion. It stores the statement, auxiliary data hash, current state, final outcome, dispute pointers, resolution round pointers, and finalization metadata.

**LLMDisputeAccount** - `seeds: [b"llm_dispute", assertion_pubkey]`
The first dispute account. It records the disputer, linked `LLMResolutionRound`, settlement resolution, and whether the dispute was correct.

**VoteDisputeAccount** - `seeds: [b"vote_dispute", assertion_pubkey]`
The second dispute account. It records the disputer, the LLM resolution it challenged, linked `VoteResolutionRound`, settlement resolution, and whether the dispute was correct.

**BondVault**
A PDA-controlled PUSD token account that holds assertion and dispute collateral until settlement.

**LLMResolutionRound** - `seeds: [b"llm_round", assertion_pubkey]`
The account that tracks Switchboard-backed LLM resolution for the first dispute. Its `outcome` is the proposed LLM resolution while the assertion is in `AssertedLLM`.

**VoteResolutionRound** - `seeds: [b"vote_round", assertion_pubkey]`
The account that tracks MagicBlock private voting for the second dispute.

**VoteRecord** - `seeds: [b"vote", vote_round_pubkey, voter_pubkey]`
The per-voter record for an escalated assertion. It tracks locked OPAL, private vote metadata, vote timing, and settlement status.

**ProtocolConfig**
The account containing tunable protocol parameters such as bond ratios, fee shares, windows, Switchboard config, MagicBlock config, and the supermajority threshold.

**Treasury**
The protocol-controlled destination for configured PUSD fees and treasury shares.

## Economics

**Assertion Bond**
PUSD collateral posted by the asserter when creating an assertion.

**Dispute Bond**
PUSD collateral posted by an LLM disputer or vote disputer.

**OPAL**
The protocol token used for voting weight, governance/config control, and voter participation incentives.

**Dispute Correctness**
Whether a dispute was upheld by its settlement layer. The first dispute is correct when settlement resolves to anything other than `True`. The second dispute is correct when the final vote resolution differs from the LLM resolution it challenged.

**Settlement Split**
The configured distribution of slashed collateral and protocol fees between correct disputers, correct voters, and treasury.

**Slashing**
Loss of some or all posted collateral or locked voting stake for being on the wrong side of a finalized dispute, according to protocol parameters.

## Time Windows

**Liveness Window** - `liveness_deadline`
The period during which an `Asserted` statement can receive its first dispute. If no dispute is filed before the deadline, the assertion finalizes as `Resolved(True)`.

**LLM Challenge Window** - `llm_challenge_deadline`
The period after the LLM resolver posts a result during which a vote disputer may challenge that result.

**Vote Setup Window**
The short intermediary period represented by `PendingVote`, during which the vote round is initialized and optionally can be extended to give time for community discussion before votes are accepted.

**Voting Window**
The period during which OPAL holders cast private votes in the MagicBlock voting environment.

**Reveal Phase**
The period after private voting closes, when votes are settled onchain and tallied.

**Time-Weighted Average Vote** - `TWAV`
The rule that a vote's influence is `locked_opal * time_weight`, giving earlier commitments more weight than late commitments.

## Resolution Terms

**Switchboard On-Demand Feed**
The v1 mechanism for producing the LLM outcome code. The feed should return a numeric code that maps to `True`, `False`, `TooEarly`, or `Unresolvable`, and the program should verify feed identity, queue, freshness, and value before accepting it.

**MagicBlock Private Ephemeral Rollup**
The private execution environment used for the OPAL-weighted voting escalation.

**Private Payments API**
A MagicBlock API for private SPL token deposit, transfer, and withdrawal transactions. It may help with OPAL custody flows, but Opal vote casting should be a custom private voting instruction rather than only a token transfer.

**Supermajority Threshold** - `supermajority_bps = 6700`
The required weighted-vote threshold for a decisive voting outcome. If no outcome reaches the threshold, the assertion resolves `Unresolvable`.

## Quick Reference

| Concept          | Account / Type           | Notes                                                                        |
| ---------------- | ------------------------ | ---------------------------------------------------------------------------- |
| Assertion        | `AssertionAccount`       | One natural-language statement with collateral                               |
| Statement text   | `statement: String`      | Short onchain text                                                           |
| Auxiliary data   | `auxiliary_hash: String` | Offchain text hash                                                           |
| Lifecycle        | `AssertionState`         | `Asserted`, `PendingLLM`, `AssertedLLM`, `PendingVote`, `Voting`, `Resolved` |
| Final answer     | `outcome`                | Set only in `Resolved`                                                       |
| First dispute    | `LLMDisputeAccount`      | Challenges default optimistic `True`                                         |
| Second dispute   | `VoteDisputeAccount`     | Challenges LLM resolution                                                    |
| First resolution | `LLMResolutionRound`     | Switchboard-backed LLM result                                                |
| Final escalation | `VoteResolutionRound`    | MagicBlock private vote                                                      |
| Collateral asset | PUSD                     | Bonds, slashing, rewards, treasury                                           |
| Voting asset     | OPAL                     | Voting weight and governance                                                 |
