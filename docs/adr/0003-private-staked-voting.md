# Private staked voting on MagicBlock; security from slashing, not the weight curve

The final escalation is a private, per-dispute, USDC-staked vote with **linear weight** (1 staked USDC = 1 vote), settled by **Schelling-point slashing**: losing-side voters are slashed, winning-side voters are rewarded from the losing side. Votes are kept **private during the voting window** via a MagicBlock private ephemeral rollup; only the aggregate outcome is committed on-chain. We reject sub-linear/"quadratic" weighting, time-weighted voting (TWAV), and OPAL-weighting.

**Why linear + slashing.** No per-token weight curve can resist _both_ whales and Sybils — they are the same dial: sub-linear weight resists whales but _rewards_ token-splitting across identities, while linear weight is Sybil-neutral but whale-exposed. The real defense is economic — slashing makes being wrong cost money, which is Sybil-neutral and whale-deterring — so weight stays **linear**.

**Why private.** A public running tally collapses the vote into a Keynesian beauty contest: under public voting + slashing, "follow the visible majority" is the safe, dominant strategy, so the oracle tracks the loudest mover rather than the truth. Sealing the tally removes the visible leader, forcing voters to coordinate on the only remaining focal point — the truth. TWAV was rejected because weighting earlier votes more _empowers_ a first-moving attacker and down-weights late honest correction — the inverse of its intent.

**Considered options.** Public + anti-sniping (rejected: bandwagon-prone); on-chain commit-reveal (viable; rejected for MVP in favour of MagicBlock's amount-hiding and no-reveal UX); quadratic + proof-of-personhood (`Vision`).

**Consequences.** MagicBlock is the MVP's critical-path dependency (delegation, ER endpoints, liveness). The irreducible residual is a 51%-of-stake attack, mitigated by bond/reward sizing and voter-base growth; proof-of-personhood is the `Vision` hardening. Voter-reward sufficiency at small scale is an open economic question. See [ADR-0002](0002-trusted-llm-resolver.md) (the vote backstops the LLM) and [ADR-0004](0004-single-asset-usdc.md).
