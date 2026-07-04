# Codebase organization and developer-workflow conventions

Two quality-of-life conventions, decided now and implemented in their own follow-up PRs (this docs PR only records them).

**Instruction modules group by the concept they act on.** `programs/opal/src/instructions/` moves from a flat list into concept subdirectories — `protocol/`, `assertion/`, `llm/`, `vote/` — so "where do I change X?" is obvious. The instruction that _acts on_ a thing lives with that thing even when it opens the next round: `dispute_assertion` → `assertion/` (you are disputing the assertion), `challenge_llm_resolution` → `llm/` (you are challenging the LLM result). Each subdir carries its own `mod.rs`; the `pub use` re-export paths in `lib.rs` update accordingly. No instruction is renamed — only relocated.

**Test targets split by environment.** `bun run test:local` runs the fast logic suite on a localnet validator with the `mock-llm` feature; `anchor test` runs real integration against **devnet**, where the trusted resolver ([ADR-0002](0002-trusted-llm-resolver.md)) and the MagicBlock ER ([ADR-0003](0003-private-staked-voting.md)) actually exist, without the mock.

**Why.** Past ~a dozen instructions a flat directory stops scaling, and concept-grouping makes the lifecycle legible. And the MVP's real dependencies can't run on a bare localnet, so logic tests and integration tests need different targets.

**Considered options / consequences.** Grouping by which round an instruction _opens_ was rejected as less discoverable. Defaulting `anchor test` to devnet has a cost — contributors need a funded devnet keypair and a deployed program, and the command must skip the local validator (`anchor test --skip-local-validator`) so it doesn't fight the devnet provider; wire that in the test-split PR. Both changes are deferred to follow-up PRs.
