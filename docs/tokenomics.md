# Opal Tokenomics

Opal uses two assets with separate jobs:

- PUSD is the collateral asset for assertion bonds, dispute bonds, slashing, rewards, and treasury fees.
- OPAL is the protocol token for voting weight, governance/config control, and voter participation incentives.

This separation keeps dispute collateral stable while still giving OPAL holders responsibility for final subjective resolution.

## Assets

### PUSD

PUSD is used for assertion bonds, first dispute bonds, second dispute bonds, slashed collateral, disputer rewards, voter reward payouts, and protocol treasury fees.

### OPAL

OPAL is used for private voting weight, governance over protocol parameters, possible future staking or reputation layers, and voter participation incentives.

During voting escalation, OPAL is locked and counted with time-weighted influence.

## Bond Model

### Assertion Bond

The asserter posts a PUSD bond when creating an assertion. The bond makes incorrect statements costly and funds rewards when a dispute is correct.

### First Dispute Bond

The LLM disputer posts a PUSD bond to challenge the default optimistic `True` resolution. This creates economic symmetry and prevents free griefing.

### Second Dispute Bond

The vote disputer posts a PUSD bond to challenge the LLM result and open private OPAL voting.

## Dispute Correctness

The first dispute does not need to store a challenged resolution because it always challenges the default `True` answer.

```text
llm_dispute_correct = settlement_resolution != True
```

The second dispute stores the LLM result it challenged:

```text
challenged_llm_resolution
vote_dispute_correct = settlement_resolution != challenged_llm_resolution
```

For the first dispute, settlement uses the LLM outcome if no vote happens, or the final vote outcome if the LLM result is challenged. For the second dispute, settlement always uses the final vote outcome.

## Settlement Defaults

### Undisputed Assertion

If the liveness window expires with no dispute:

- assertion resolves `True`
- asserter bond is returned
- configured protocol fees may be collected

### First Dispute Settles Correct

If `LLMDisputeAccount.dispute_correct == true`:

- the LLM disputer wins
- the asserter bond is slashed or reallocated according to config
- the LLM disputer bond is returned with configured reward share
- treasury receives configured fees/share

### First Dispute Settles Incorrect

If `LLMDisputeAccount.dispute_correct == false`:

- the asserter wins
- the LLM disputer bond is slashed or reallocated according to config
- the asserter bond is returned
- treasury receives configured fees/share

### Second Dispute Settles Correct

If `VoteDisputeAccount.dispute_correct == true`:

- the vote disputer wins
- the LLM result is overturned
- the vote disputer bond is returned with configured reward share
- correct voters may receive a share of slashed PUSD collateral
- treasury receives configured fees/share

### Second Dispute Settles Incorrect

If `VoteDisputeAccount.dispute_correct == false`:

- the LLM result is upheld
- the vote disputer bond is slashed or reallocated according to config
- correct voters may receive configured rewards if voting occurred
- treasury receives configured fees/share

### `TooEarly` And `Unresolvable`

`TooEarly` and `Unresolvable` are valid settlement resolutions. For the first dispute, either is correct because either differs from default `True`. For the second dispute, either is correct only if it differs from the challenged LLM result.

For example, if an assertion starts as default `True` and the LLM resolves `Unresolvable`, the first dispute is correct because the settlement resolution differs from `True`.

## Voter Rewards And Slashing

Voting is the final escalation layer, so voters take on protocol responsibility.

Correct voters:

- recover locked OPAL
- may receive a share of slashed PUSD collateral
- may receive additional configured OPAL incentives if governance enables them

Incorrect voters:

- recover or lose OPAL according to `incorrect_vote_slash_bps`
- do not receive winning-side PUSD rewards

Unrevealed or invalid votes:

- should be excluded from valid weighted totals
- may be penalized by governance-configured parameters

The exact slashing implementation must be deterministic and visible before a voter commits OPAL.

## Time-Weighted Voting

Canonical vote influence:

```text
vote_influence = locked_opal * time_weight
```

Design intent:

- reduce deadline sniping
- reward earlier commitment
- make coordinated late manipulation more expensive

The exact `time_weight` curve belongs in protocol config or implementation docs, but it must be deterministic, monotonic over the voting window, and auditable.

## Protocol Parameters

The following names should be used consistently in code and docs:

| Parameter                        | Purpose                                                                 |
| -------------------------------- | ----------------------------------------------------------------------- |
| `assertion_bond_min_PUSD`        | Minimum PUSD bond for a new assertion                                   |
| `llm_dispute_bond_ratio`         | First dispute bond relative to assertion bond                           |
| `vote_dispute_bond_ratio`        | Second dispute bond relative to assertion bond or first dispute bond    |
| `protocol_fee_bps`               | Protocol fee applied during settlement                                  |
| `llm_disputer_reward_share_bps`  | Share of slashed PUSD allocated to a correct LLM disputer               |
| `vote_disputer_reward_share_bps` | Share of slashed PUSD allocated to a correct vote disputer              |
| `voter_reward_share_bps`         | Share of slashed PUSD allocated to correct voters                       |
| `treasury_share_bps`             | Share of slashed PUSD allocated to treasury                             |
| `incorrect_vote_slash_bps`       | OPAL slash rate for incorrect voters                                    |
| `supermajority_bps`              | Required weighted-vote threshold; default `6700`                        |
| `liveness_window_seconds`        | Time an assertion remains open for first dispute                        |
| `llm_challenge_window_seconds`   | Time to challenge the LLM result                                        |
| `vote_setup_window_seconds`      | Time allowed to initialize MagicBlock voting before vote casting starts |
| `voting_window_seconds`          | Time OPAL holders have to cast private votes                            |

Governance may tune these values, but integrators should be able to identify the active config used by any assertion.

## Risk Notes

**Low-value statement griefing**
Bond minimums should be high enough that spam and frivolous disputes are uneconomic.

**Value-at-risk mismatch**
Prediction markets may secure more value than the assertion bond. Integrators should choose or require bond tiers appropriate to market value.

**Whale capture**
OPAL-weighted voting can be captured by concentrated holders. TWAV, private voting, quorum requirements, and governance distribution all matter.

**V1 resolver centralization**
Switchboard single-LLM resolution is a practical v1 path, not the final trust model. Nosana inference and/or an LLM Council are future hardening paths.

**Weak auxiliary data**
Offchain auxiliary data gives asserters flexibility, but weak guidance increases `Unresolvable` outcomes.
