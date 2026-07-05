# Design system

## Foundation

- **Tailwind CSS v4**, CSS-first. There is **no `tailwind.config.js`** — everything is
  configured in `app/globals.css`:
  - `@import 'tailwindcss'` + `tw-animate-css` + `shadcn/tailwind.css`.
  - Dark mode via custom variant `@custom-variant dark (&:is(.dark *))`, class-based,
    driven by `next-themes`.
  - Design tokens defined in `:root` (light) and `.dark` in **oklch**, then re-mapped to
    Tailwind `--color-*` utilities via `@theme inline`.
- **shadcn** config in `components.json`: style `base-nova`, base color `neutral`, RSC on,
  CSS variables, **Phosphor** icon library, aliases (`@/components`, `@/lib/utils`, `@/components/ui`, `@/lib`, `@/hooks`).

## Tokens

Full shadcn token set: `--background`, `--foreground`, `--card`, `--popover`,
`--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`,
`--input`, `--ring`, `--chart-1..5`, `--sidebar-*`.

- **Primary is a vivid lime/chartreuse** (`oklch(0.8882 0.1981 125.5383)`). This is the
  signature accent — `text-primary`, lime highlights, the dithered hero wave (`#bbf047`).
- Light theme: white bg; dark theme: near-black (`oklch(0.1913 0 0)`).
- `--radius: 0.25rem` base with sm/md/lg/xl derivations; a shadow scale; spacing base
  `0.25rem`.
- **Typography is the Geist family only**, from the `geist` npm package (no font files
  in `public/`): `--font-sans` → **Geist Sans** (body), `--font-mono` → **Geist Mono**
  (micro-labels, eyebrows, numerics, addresses — the "terminal" accent),
  `--font-heading` → **Geist Pixel Square** (all h1–h6, via a base-layer rule).
  `app/font.ts` is the single import point and re-exports the other pixel variants
  (Grid/Circle/Triangle/Line) for decorative one-offs.
  - ⚠️ The pixel faces ship a **single 500 weight — never `font-bold` a heading**, and
    don't add `tracking-*` to headings (the face is already wide; size down instead:
    page titles max `text-3xl md:text-4xl`).
  - `kbd/code/samp` use the mono face via a base rule. Root font-size is 100%.

## Base layer

- Universal `border-border outline-ring/50`.
- `body { bg-background text-foreground }`.
- `button { cursor: pointer }`.

## Component primitives

Use the `ui/` primitives (`Button`, `Input`, `Textarea`, `Select`, `Kbd`, `InputGroup`)
rather than raw elements. They wrap `@base-ui/react` and carry consistent
`data-slot`/`data-*` state styling. `Button` and `InputGroup` expose `cva` variants;
prefer variants over ad-hoc classes.

`InputGroup` exists but is currently unused — `search-dialog.tsx` rolls its own input.
If you build new input-with-addon UIs, prefer `InputGroup` for consistency.

## Aesthetic rules (match these in new work)

- **Three-tier type system:** pixel headings (uppercase, weight 500, no extra tracking),
  `font-mono uppercase tracking-widest` micro-labels/eyebrows/chips, and **sentence-case
  Geist Sans body copy** (`text-sm leading-relaxed`). Body paragraphs are never
  uppercase — only labels and headings are.
- **The max-width frame (`Container`, `max-w-400`) with dashed `border-x` verticals is a
  landing-page-only device** — the landing page and the navbar rendered on it. Every
  other route is **full-bleed**: no `Container`, no `border-x` (the navbar switches per
  route via `usePathname`). Horizontal dashed hairlines stay everywhere.
- **Dashed borders** (`border-dashed`) are reserved for the landing frame and the navbar/section hairlines. All internal borders — cards, tables, panels, dividers, interactive controls — use solid borders.
- Numerics (bonds, weights, countdowns) use `font-mono tabular-nums`.
- Phosphor icons only (`@phosphor-icons/react`).
- Animations via `motion` (`import { m } from 'motion/react'` pattern; `AnimatePresence`
  for enter/exit). Keep transitions subtle.
- `CornerMarkers` for decorative L-brackets on framed sections.
- Compose classes with `cn()` from `@/lib/utils`.

## Theming & hydration

- `next-themes` `ThemeProvider` is configured `attribute="class"`,
  `defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange`. Root `<html>` has
  `suppressHydrationWarning`.
- Auth-dependent UI must be hydration-safe — use `useHydrated()` (see
  [`auth-and-wallet.md`](auth-and-wallet.md)) to avoid Privy SSR mismatches, as
  `navbar-auth.tsx` does.
