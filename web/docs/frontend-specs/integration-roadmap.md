# On-chain integration roadmap

The frontend is a complete UI shell over mock data. This is the plan to replace the mock
with real Anchor program reads/writes. Authoritative program details live in
`../../../docs/architecture.md`, `../../../AGENTS.md`, and `programs/opal/`.

## Program facts to anchor against

- **Program ID (localnet):** `8NCcxyAzKiAHxJ9DMnADtxShYutS9w81wHcXqgCavTBy` (devnet TBD).
- **Artifacts:** `anchor build` writes `target/idl/opal.json` and `target/types/opal.ts`
  at the repo root. The web app does **not** consume these yet.
- **PDA seeds:**
  - `ProtocolConfig`: `[b"protocol_config"]` (singleton).
  - `AssertionAccount`: `[b"assertion", assertion_id]` (caller-supplied id → clients can
    pre-compute the PDA off-chain).
  - Dispute/round PDAs derive from the **assertion account key** (not the id):
    `[b"llm_dispute", assertion]`, `[b"vote_dispute", assertion]`,
    `[b"llm_round", assertion]`, `[b"vote_round", assertion]`, `[b"bond_vault", assertion_id]`.
- **Instructions (from `programs/opal/src/lib.rs`):** `create_assertion`,
  `set_council_feeds`, `dispute_assertion`, `submit_llm_resolution`
  (+ `submit_mock_llm_resolution` under `mock-llm`), `finalize_llm_resolution`,
  `challenge_llm_resolution`, `open_vote`, `finalize_vote_resolution_placeholder`,
  `finalize_undisputed`.
- Accounts are **zero-copy `#[repr(C, packed)]`** with sentinels — see decoding gotchas
  in [`data-model.md`](data-model.md).

## Decision needed first: client library

`@solana/kit` (v6) is already a dep; `@coral-xyz/anchor` is **not**. Options:

1. **Add `@coral-xyz/anchor`** and use the generated `target/types/opal.ts` for typed
   account fetch + instruction builders (fastest path, matches the integration tests).
2. **Stay on `@solana/kit`** and hand-write account decoders + instruction builders from
   the IDL (lighter bundle, more work, aligns with the wallet infra already using kit).

Pick one and record it here. Whichever is chosen, copy/generate the IDL into `web/`
(e.g. `web/lib/opal-idl.json` + program-id constant) so the web build doesn't depend on
`target/` being present.

## Phased plan

### Phase 1 — Read path (replace listings)

Swap `data/assertion.ts` for a data layer that fetches and decodes real accounts.

- Add a program/RPC client module (`web/lib/opal/`): program id, PDA helpers, account
  decoders that produce the existing `AssertionAccount` frontend type (map `u8` state →
  union, `i64` → ISO string, `255` outcome → `null`, etc. per the mapping table in
  [`data-model.md`](data-model.md)).
- Replace `ASSERTIONS` consumers:
  - Feed (`assertion/browse`) → `getProgramAccounts` for all assertions.
  - Detail (`assertion/browse/[id]`) → fetch assertion PDA by id + its linked dispute/round
    accounts.
  - Dashboard (`filterAssertionsByAddress`) → filter fetched accounts by asserter/disputer.
- Keep `lib/assertion-labels.ts` / `assertion-stats.ts` as-is — they operate on the
  frontend type, so they keep working once the decoder outputs that type.
- Consider account **subscriptions** (the wss RPC is already configured) for live updates.

### Phase 2 — Write path (replace stubbed handlers)

Wire the four detail-page handlers + make-form submit to real transactions signed by the
Privy embedded wallet (get it via the Privy Solana hooks, as `wallet-context.tsx` does
for `currentAddress`).

| UI seam | Instruction | Notes |
| --- | --- | --- |
| `make` `handleSubmit` | `create_assertion` | Client generates `assertion_id`, derives PDA + bond vault, funds bond (stablecoin). Store aux text off-chain, put its hash on-chain. |
| detail `handleFileDispute` | `dispute_assertion` | Requires `set_council_feeds` already run (else `CouncilFeedsNotConfigured`). |
| detail `handleChallengeLlm` | `challenge_llm_resolution` | Allowed in `AssertedLLM` before `llm_challenge_deadline`. |
| detail `handleOpenVote` | `open_vote` | Currently permissionless placeholder; auth policy TBD. |
| detail `handleCastVote` + `voting-panel` | (no real instruction yet) | Real MagicBlock private voting is not implemented on-chain — keep the mock/disclaimer until it exists. |
| (new UI) | `finalize_undisputed` / `finalize_llm_resolution` / `finalize_vote_resolution_placeholder` | No finalize UI exists yet; add it. |

Each write should: build + simulate the tx, sign via Privy wallet, send to devnet,
optimistically update or refetch the affected account, and surface errors (map
`OpalError` variants to user copy).

### Phase 3 — Polish

- Loading/empty/error states for real network latency (mock is instant today).
- Replace `as any` casts in dashboards with the typed decoder output.
- Real aux-data storage (Arweave/IPFS) matching `auxiliaryUrl`/`auxiliaryHash`.
- Rename `PUSD` → `USD` in UI when the program does its `pusd`→`usd` rename.

## Constraints & gotchas

- **Devnet only** — `NEXT_PUBLIC_SOLANA_CLUSTER` throws on anything but `devnet`. The
  program's localnet program-id above will differ once deployed to devnet; make the
  program id an env/const, not a literal.
- `outcome` is only valid when `state === 'Resolved'` — never render it otherwise.
- Bonds/amounts are `u64` base units on-chain; convert for display.
- Follow the repo's `AGENTS.md` guidance (surgical changes, simplicity first) and Next 16
  breaking-change caveat (`web/AGENTS.md`).
