---
title: 05 — bits-ui + daisyUI + shadcn (agnostic unstyled VM primitives)
type: research-shard
status: active
parent: "[[docs/work/hardening/research/2026-06-15-frontend-stack-deep-research/index|Frontend Stack Deep Research]]"
created: 2026-06-15T00:00:00
updated: 2026-06-15T00:00:00
created_by: opus-4-8
updated_by: opus-4-8
tags:
  - agent/research
  - frontend/primitives
  - style/headless
---

# 05 — bits-ui + daisyUI + shadcn-svelte

Goal (pkm-ai agreement): recreate **agnostic, UNSTYLED headless primitives** so styling stays under the D-PSS headless style law (`data-vm-*` hooks + Obsidian-native theming). bits-ui = the primitive base;
daisyUI + shadcn = recipe REFERENCES, not dependencies.

## bits-ui (`bits-ui` 2.18.1) — IN USE

Headless Svelte 5 primitives (Floating-UI based), zero baked styles. Components we'd use: Popover, DropdownMenu, Dialog, Select, Toggle, Tooltip, Combobox. Key mechanics:
- **`child` snippet** (render-delegation, asChild-equivalent): `{#snippet child({ props })}<button {...props}/>{/snippet}` — `props` carries merged handlers + ARIA + data-attrs. Floating content has a **two-level** child structure:
  outer `wrapperProps` element (positioning, MUST stay unstyled) + inner `props` element (your styles).
- **Portal** to `document.body` by default; `to` prop retargets. We have `servicePortalResolver.ts` for this.
- **Focus**: `trapFocus` (default true), `onOpenAutoFocus`/`onCloseAutoFocus` (call `e.preventDefault()` to override).

### FnR breakage hypothesis (`flag` — reproduce before trusting)

Likely cause: bits-ui **portal + `trapFocus`** colliding with Obsidian's editor focus + event delegation — FnR dialog portals to global `body`, traps focus, and interferes with the editor's input/event flow.
Proposed fix: **`trapFocus={false}` in editor contexts + portal scoped to the active `Document`/plugin container** (via `servicePortalResolver.ts`), not the global body. This is a HYPOTHESIS from docs, not a reproduction — verify against the actual beta FnR regression before committing.

## daisyUI — REFERENCE ONLY

It is **Tailwind plugin classes + themes**, NOT headless and NOT Svelte-specific (`btn`, `card`, semantic colors via CSS vars, `data-theme`). Opposite of what we want (baked styling). Value = study its color-system and component-composition conventions; **do not add as a dependency** (would fight Obsidian theming).

## shadcn-svelte — REFERENCE ONLY (copy-recipe)

Not installed; it is a **copy-recipe registry** that wraps bits-ui + Tailwind. BORROW: composition structure, a11y patterns (focus/keyboard/ARIA), TypeScript prop shapes, snippet usage. DROP: its Tailwind classes + web-app design system (we use `data-vm-*` + Obsidian vars).

## Strategy — VM primitive layer

```
bits-ui (headless) → VM wrapper (adds data-vm-*, NO styles, scopes portal to activeDocument)
  → VM components (compose primitives) → Obsidian plugin UI (Obsidian CSS vars)
```
- Thin VM wrappers pass bits-ui props through, add `data-vm-*` hooks (`data-vm-popover-content`, `data-vm-state="open"`, `data-vm-dialog-overlay`, …), apply NO classes/inline styles.
- Styling lives in one global layer keyed on `data-vm-*`, referencing Obsidian vars (`--background-primary`, `--radius-m`, …) — theme-follows-Obsidian for free.
- Portal target = resolved active Document (servicePortalResolver), not global body (the FnR fix).
- We already have `vmPopover.svelte` + `vmDialog.svelte` on bits-ui — these are the first wrappers to harden.

## Citations

- bits-ui.com (child-snippet, portal, styling, components: popover/dropdown-menu/dialog).
- daisyui.com (Tailwind plugin + llms.txt); shadcn-svelte.com (cli/theming/about).
- Local: .claude/skills/vm-frontend-llms-docs/{BITS_UI,DAISYUI,SHADCN_SVELTE}.md.
- In-repo: src/components/overlays/vmPopover.svelte, vmDialog.svelte, services/servicePortalResolver.ts.
</content>
