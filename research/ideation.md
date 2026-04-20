# Opal Ideation (Current Iteration)

**Date:** 2026-04-20  
**Stage:** Core thesis locked, mechanism primitives open for iteration

## 1. Core Idea (Stable)

Prediction markets are growing fast, but Solana still lacks a widely adopted shared layer for resolving subjective claims, something like UMA used by polymarket.

Opal is a propose -> dispute -> resolve system for subjective, real-world statements. It lets onchain applications handle claims such as:

- "Kanye West's Delhi concert got postponed"

The core value proposition is:
- Anyone can assert a claim by posting a bond (locking tokens in an escrow).
- If undisputed during a liveness window, the claim finalizes as true and bond is returned.
- If disputed, the disputer posts a counter-bond and the claim moves to resolution.
- A disputer can also choose `Cannot Be Verified` for claims where ground truth is not available yet (for example, a match result that has not been officially announced).
- Users are incentivized by game theory: truthful claims and correct votes should be the highest expected-value behavior over time.

## 2. Problem Framing (Stable)

Current Solana oracle landscape is strong for objective data, weaker for subjective truth:

- `Pyth`: robust for price feeds.
- `Switchboard`: supports custom feeds, but source-of-truth often still API-driven.
- `Solana-LLM-Oracle`: enables LLM inference, but is not by itself a reliable source for subjective truth.

Opal focuses specifically on subjective verification with onchain finality.

## 3. Mechanism Primitives (Open to Change)

These are candidate design primitives. The implementation can change while preserving the core idea, we will use a combination of these primitives to do this in the most efficient & reliable manner possible.

### A. Futarchy-Inspired Incentive Layer

**Brief explanation:** Futarchy is often summarized as "vote on values, bet on beliefs." In practice, it uses markets/incentives to push participants toward decisions that are expected to produce better outcomes.

**How this applies to Opal:**

- Use market-style incentives so manipulative voters pay a real economic cost.
- Calibrate bond/reward logic so truthful claims and correct votes are the profit-maximizing path over repeated participation.
- Optionally increase required stake when statements are high impact or highly contentious.

### B. Time-Weighted Average Voting (TWAV)

**Brief explanation:** Time-weighted voting gives stronger aggregate influence to votes that are committed earlier (or across a longer portion of the voting window), reducing the impact of last-minute swings.

**Why it matters for Opal:**

- Reduces "deadline sniping" where actors wait until the final moments to flip sentiment.
- Produces a smoother, harder-to-manipulate signal over the full resolution window.
- Can improve predictability for integrators that depend on resolution quality.

### C. Private Voting

**Brief explanation:** Private voting hides intermediate vote direction during the active voting period (using magicblock's ephemeral rollups).

**Why it matters for Opal:**

- If participants can see a live 50-50 split, they may coordinate to swing the outcome.
- If they cannot see sentiment while voting, they are more likely to vote honestly because coordinated manipulation is harder and financially riskier.
- Privacy reduces herding and social pressure effects.

### D. Slashing and Escalation Economics

**New required primitive:** Add explicit slashing for incorrect or malicious behavior, inspired by UMA-style dispute economics.

Candidate slashing policy:

- Incorrect proposer loses all or part of the assertion bond.
- Incorrect disputer loses all or part of the dispute bond.
- Voters/jurors who vote against final truth (especially in clear-majority or appeal-confirmed outcomes) can be partially slashed.
- Honest voters and the winning side receive a share of slashed collateral as reward.

Design goal:

- Being wrong in good faith should be tolerable but costly enough to discourage spam.
- Coordinated manipulation should be unprofitable in expectation.

## 4. Dispute vs Appeal

- `Dispute`: First challenge step. A participant disagrees with a proposed claim during the liveness window and posts a counter-bond.
- `Appeal`: A later challenge step after an initial resolution, used only when the system allows escalation to a higher-confidence round.

Simple default:

- If you want less complexity at launch, ship only `Dispute` first and keep `Appeal` disabled until needed.

## 5. UMA-Inspired Quirks to Include

Beyond "assert -> dispute -> resolve," UMA works because of system-level details that make the game robust. Opal should consider equivalent patterns:

- **Liveness windows:** Assertions have explicit dispute periods; uncontested assertions finalize quickly.
- **Bond sizing:** Bond amounts should be dynamic relative to value-at-risk so attacking low-bond assertions is not cheap.
- **Escalation path:** Disputes can escalate into a stronger/final arbitration layer for hard cases (this is where appeals may exist if enabled).
- **Finality guarantees:** Once resolved, outcomes should be clearly immutable for consumers (unless explicitly in an appeal state).
- **Economic symmetry:** Both proposer and disputer must post meaningful collateral so disputes are not free griefing.
- **Oracle composability:** Resolutions should be easy to consume by prediction markets and other protocols via a clean interface.
- **Clear state machine:** Every claim should move through explicit stages (`Proposed`, `Disputed`, `Voting`, `Resolved`, optional `Appealed`).
- **Public audit trail:** Claims, disputes, evidence, and final outcomes should be fully queryable for reputation and trust.

## 6. Open Design Questions (Iteration Queue)

- Should voting be token-weighted, reputation-weighted, or hybrid?
- Should private voting use simple commit-reveal first, then upgrade to stronger privacy later?
- What is the right formula for bond sizing (fixed tiers vs volatility/contention based)?
- Should we launch with no appeals first, then add limited appeal rounds later?
- How should fees be split across proposers, disputers, voters, and protocol treasury?

## 7. What Is Fixed vs What Is Open

- Fixed: `Propose -> Dispute -> Resolve` flow and bonded accountability.
- Open: Exact resolution mechanism (vote design, weighting model, privacy model, escalation rules).
- Reason: Even UMA has produced incorrect resolutions in some cases, so resolution design should be treated as an iterative component, not a solved constant.

## 8. Current Positioning Statement

Opal is a Solana-native oracle for subjective truth: a dispute-and-resolution layer that allows protocols to settle claims no price feed or API can reliably answer.

## 9. Non-Negotiables vs Flexible Components

**Non-negotiables (must stay):**

- Propose -> dispute -> resolve flow with bonded claims.
- Dispute mechanism with counter-bond.
- Economically enforced honest behavior.
- Transparent, composable onchain settlement output.

**Flexible components (can evolve):**

- Exact voting mechanism and privacy implementation.
- Bond/slash formulas and reward distribution.
- Escalation/arbitration architecture.
- Resolution timing and liveness parameters.
