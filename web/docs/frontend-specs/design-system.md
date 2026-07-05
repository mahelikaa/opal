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
- Font vars: `--font-sans: var(--font-hind)` (body, regular weight), `--font-heading:
  var(--font-khand)` (headings — a base-layer rule sets h1–h6 to Khand bold), `--font-mono`
  also resolves to Hind — the site ships **no monospace face**; `font-mono` spots rely on
  `tabular-nums` for alignment. Loaded in `app/font.ts`: local Khand/Hind variable fonts.
  A base rule also forces `kbd/code/samp` to the sans face. Root font-size is 112.5%.

> ⚠️ **Cleanup note:** in `globals.css`, most token blocks, the `@theme inline` mappings,
> and the `@layer base` rules are **literally duplicated** (each var defined twice, base
> rules repeated). Harmless but sloppy — if you touch this file, consider de-duplicating,
> but don't let it block other work.

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

- Uppercase text with **wide letter-spacing** for labels/eyebrows.
- **Dashed borders** (`border-dashed`) are reserved for the **outermost page frame only** (the `border-x` page verticals and the navbar lines). All internal borders — cards, tables, panels, dividers, interactive controls — use solid borders.
- Numerics (bonds, weights, countdowns) use `tabular-nums` — no monospace face is shipped.
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
