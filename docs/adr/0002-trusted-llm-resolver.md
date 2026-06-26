# Single trusted off-chain LLM resolver for the MVP; the Switchboard council is dropped

The first-pass dispute resolution is a **single LLM call**, posted on-chain by a trusted, authority-gated off-chain resolver (productionizing the existing mock path), binding `prompt_hash` / `response_hash` / `evidence_hash` on-chain for auditability. This supersedes the three-feed Switchboard On-Demand "council" (and removes the `switchboard-on-demand` dependency).

**Why.** The LLM layer does **not** need to be trustless, because the staked vote is the trust backstop ([ADR-0003](0003-private-staked-voting.md)): a wrong or corrupt verdict is challengeable into the trust-minimized vote. The council was buying trust-minimization at a layer that is _already_ backstopped, at the cost of operating three live LLM feeds. The "real" Switchboard path was never actually stood up — tests only ever ran the mock — so collapsing it loses no working functionality. A trusted resolver ships fastest and is fully under our control while we also absorb the MagicBlock integration.

**Considered options.** 3-feed council (rejected: operational overhead, unbuilt, redundant with the vote); single Switchboard feed (rejected for MVP: still net-new feed/job work plus a live external dependency); **trusted resolver (chosen)**.

**Consequences.** The MVP first pass is centralized and must be trusted to call the LLM honestly — acceptable _only_ because the vote can override it. Trust-minimized inference (Switchboard, or TEE-attested) is the documented `Vision` upgrade. The Switchboard-specific fields on `LlmResolutionRound` become reserved/removable.
