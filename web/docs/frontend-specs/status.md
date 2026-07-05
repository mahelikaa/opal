# Status: done / stubbed / known issues

Snapshot of what actually works vs. what's a placeholder. Keep this file updated as work
lands.

## ✅ Done (functional against mock data)

- **Complete mock assertion lifecycle** — every state now has an action screen and the
  full flow is walkable end-to-end in one session: create → dispute → post LLM council
  verdict (mock `submit_llm_resolution`) → challenge → open vote → cast vote → finalize.
  Finalize screens exist for all three paths (undisputed / LLM / vote), plus a
  settlement summary on `Resolved`. Actions are deadline-gated via `isDeadlinePast`;
  user-triggered mock windows are short (5 min) so the flow stays demoable.
- **Client-side assertion store** (`lib/assertion-store.ts`) — `useSyncExternalStore`
  over the mock seed, plus **all mock protocol transitions** (`fileLlmDispute`,
  `submitLlmResolution`, `fileVoteDispute`, `openVote`, `castVote`,
  `finalizeAssertion`) — the single module to swap for real reads/txs. Created
  assertions and state transitions persist across navigation and show up in browse.
  Resets on hard refresh (a created assertion's URL 404s after refresh — expected
  until on-chain reads land).
- **Dedicated vote screen** (`/assertion/browse/[id]/vote`) — full-screen voting flow:
  large outcome cards with select → confirm bar, wallet-gated, recorded state with live
  tally, blocked notices when voting isn't open/has closed. The detail page's action
  card links here while voting is live; `voting-panel.tsx` is now a read-only tally.
- **Dedicated dispute screen** (`/assertion/browse/[id]/dispute`) — make-style
  accordion (Claim → Reason → Stake Summary) serving both dispute layers (first
  dispute on `Asserted`, LLM challenge on `AssertedLLM`), with blocked notices for
  ineligible states/expired windows. Detail-page actions link here instead of inline
  forms.
- **Create flow** — the make form now actually creates an `AssertionAccount` in the
  store (mock id, toy aux hash, liveness from the chosen window) and navigates to it.

- **Landing page** (`/`) — full marketing site: hero (dithered wave bg), 3-layer process
  section with custom SVG art, resolution-layers, consumers, footer.
- **Browse feed** (`/assertion/browse`) — filter (stage + quick filters), sort, animated
  grid of assertion cards, empty state.
- **Assertion detail** (`/assertion/browse/[id]`) — full detail view, live countdown,
  timeline, all section components render.
- **Make form** (`/assertion/make`) — complete multi-section accordion with validation +
  keyboard nav.
- **User dashboard** (`/u/[address]` + assertions/disputes/votes/earnings) — all tabs
  render derived views with filters + search.
- **Auth** — Privy social login + Solana embedded wallet; `useWallet()` context; SSR-safe
  auth UI; ⌘K profile search dialog with address validation.
- **Design system** — `ui/` primitives, tokens, dark mode.
- **Env validation** — `bun run check-env`.

## ⚠️ Stubbed / simulated (no real chain interaction)

The single biggest gap: **no on-chain integration exists at all** (no Anchor client, no
IDL, no program-ID/PDA derivation, no RPC account reads, no transaction submission).

| Feature | Where | What's fake |
| --- | --- | --- |
| All listing data | every page | Seeded from `data/assertion.ts` (10 records) via the in-memory store, not chain |
| Create assertion | `assertion/make` `handleSubmit` | No `create_assertion` tx; adds a mock record to the client store. `mockHash` is a toy hash |
| File dispute | dispute screen → `fileLlmDispute` (store) | Store update only; mirrors `dispute_assertion`; reason text is discarded |
| Post LLM verdict | `dispute-action` → `submitLlmResolution` (store) | Store update; user picks the council verdict instead of reading Switchboard feeds; mirrors `submit_llm_resolution` |
| Challenge LLM | dispute screen → `fileVoteDispute` (store) | Store update only; mirrors `challenge_llm_resolution`; reason text is discarded |
| Open vote | `dispute-action` → `openVote` (store) | Store update only; mirrors `open_vote`; sets a 5-min mock voting window |
| Cast vote | vote screen (`/assertion/browse/[id]/vote`) → `castVote` (store) | Store update; `MOCK_VOTE_WEIGHT=5000`; user vote tracked locally via `useUserVote`; disclaimer that MagicBlock TWAV is not wired |
| Finalize (undisputed/LLM/vote) | `dispute-action` → `finalizeAssertion` (store) | Store update; leading outcome wins (no supermajority rule); settles dispute fields locally |
| User dashboard stats | `/u/[address]/*` | Derived from the client store (all tabs read `useAssertions()`), typed — but still mock data underneath |

Also note protocol-side placeholders that the UI should not over-promise on: LLM
resolution is a 3-feed Switchboard council (mocked in tests); voting is a MagicBlock
placeholder; `vote_disputer_reward_share_bps` / `voter_reward_share_bps` exist but aren't
distributed. See `../../../README.md` §"Current State" and `../../../docs/`.

## 🐞 Known bugs / cleanup items

- `common/logo.tsx` — the `Logo` component appears **unused** (navbar uses
  `/img/logo.svg` via `next/image`).
- Unused `m` (motion) imports in a couple of landing/common files.

Fixed on `frontend/design-revamp` (see [`changelog.md`](changelog.md)): dashboard
sub-pages now read the client store with typed derivations (no `as any`);
`MISALIGNED` vote status is actually produced; `globals.css` duplication removed.

## 🔜 Not started

- Any read from the Anchor program (decode `AssertionAccount` etc.).
- Any transaction (create/dispute/challenge/open-vote/finalize).
- Wiring the Privy embedded wallet as a transaction signer.
- Real-time updates (account subscriptions) — RPC wss is configured but unused by app code.
- Aux-data storage/retrieval (the `auxiliaryUrl`/`auxiliaryHash` flow is illustrative).

See [`integration-roadmap.md`](integration-roadmap.md) for the plan.
