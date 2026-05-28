---
title: Style Source Reconciliation (stable · beta · proto-v6 · native · docs)
type: research-index
status: active
parent: "[[docs/work/hardening/index|hardening]]"
created: 2026-05-26T00:00:00
updated: 2026-05-26T00:00:00
created_by: claude-opus-4-7
updated_by: claude-opus-4-7
tags:
  - agent/research
  - initiative/hardening
  - explorer/style-theme
  - proto/merge
---

# Style Source Reconciliation

Method + matrix for juggling style across versions, feeding **N (SCSS→UnoCSS)** and the
**proto-v6 integration** grill. Per the locked norm: prototypes are merge INPUTS, not
canonical. Decide concern-by-concern, source-attributed.

Related: [[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/roadmap-dispatch|roadmap-dispatch]]
(constraint: proto-v6 breaking style → before N) · [[docs/work/hardening/specs/2026-05-19-explorer-merge-umbrella/index|merge umbrella]] (built vs v5) · [[docs/work/hardening/research/2026-05-26-style-source-reconciliation/proto-v6-sidebar-map|proto-v6 sidebar map]] (piece → model → roadmap).

## Sources + authority

| Source | Authoritative for | Where |
|---|---|---|
| **stable v1.0.0** | proven UX; "prettiest" decorations + filter/search highlights; **HAS** per-node decorations | git tag (1.0.0 / 1.1.0) |
| **sandbox / beta** | latest functional architecture; may carry STYLE regressions vs stable | current tree |
| **intermediate** | optional midpoints | git history |
| **proto-v6** | aspirational STYLE (Claude-design); merge INPUT; **lacks** per-node decorations + separated table engine | `C:\Users\vic_A\Downloads\vaultman\proto-v6` |
| **native preset** | chameleon "native" target; `bases-*` / app.css vocabulary | obsidian-web-lab app.css |
| **docs (LOCKED)** | engine/mode view organization + render-runtime + cell/view-config + 0-B token layer → **SUPERSEDES** structural conflicts | explorer-model, ADRs, 0-B |

## Decision vocab (per concern)

Maps the user's diferencias / parecidos / adiciones / eliminaciones / superseded:

- **ADOPT** — take ~as-is (attribute the source).
- **RESHAPE** — take the idea, restructure to our model.
- **MAP** — translate to our tokens + a UnoCSS | SCSS target.
- **ADD** — new in a source, worth adding.
- **FIX** — wanted but half-done; complete/repair it (e.g. beta's broken FnR island).
- **DROP** — reject on merits (won't bring it).
- **DEFER** — postpone, or out of this pass's scope (folds the old "EXCLUDE").
- **SUPERSEDE** — our docs/decision overrides the source.

## Translation target

Per the 0-B token layer: prefer **UnoCSS utility**, **SCSS** only where structural/complex.
Every ADOPT/RESHAPE row notes its target. N consumes this matrix; proto-v6 breaking style
lands BEFORE N (roadmap constraint).

## Matrix (grows style-by-style)

| # | Concern | Sources (compact) | Decision | Target | Status |
|---|---|---|---|---|---|
| 1 | per-node decorations / badges | stable = basic badges · **beta = full `.vm-badge` (quick-action / hover / undoable / inherited)** = richest · proto LACKS · docs = `serviceDecorate` + descriptors-on-projection | **ADOPT beta's badge/decoration system** → RESHAPE to projection descriptors; proto DROP | tokens + descriptors | evidence-in |
| 2a | "in-filters" highlight | stable = 2px border + 8% tint · **beta = inset-shadow + child-opacity elevation; virtual-list 14% + 78% accent**; cards = accent border (richer) | ADOPT **beta's** in-filters + MAP tokens (dev recalled stable as prettiest — see note) | tokens | evidence-in |
| 2b | "search-result" highlight | stable + beta = **identical transient pulse** (`vm-search-pulse` 0.8s) · proto/text = `<mark>` · NOT durable `serviceMark` | **RESOLVED: transient decoration** (row pulse + `<mark>` text), not a mark | tokens | resolved |
| 3 | table engine | proto-v6 = NOT separated (`.vm-grid-table` = styled list, hard-coded cols, no tree/icons) · docs = Table own engine (tanstack-table, cols from view-config) | SUPERSEDE proto with docs Table engine; ADD proto visual tokens if nice | engine + tokens | seeded |
| 4 | theming | proto palettes (Catppuccin/Gruvbox/Dracula/Nord) = **DROP** — Obsidian handles themes (LOCKED, [[docs/work/hardening/specs/2026-05-19-explorer-merge-umbrella/01-merge-map|merge-map]] L41); ADD = system-theme provider (`app.customCss.themes`) + recent-themes UI (Theme Builder #10) · color-mix **technique** (tint via color-mix, not opacity) = ADOPT → MAP to 0-B | tokens | aligned to umbrella; dev reopen = optional beta theme-preset-slot |
| 5 | density / radius / type / glass tokens | proto-v6: `--vm-glass-blur` 14px, radius-s 6 / -m 10, Inter + JetBrains, 4–6px spacing | ADOPT scale → MAP to 0-B tokens | tokens | evidence-in |
| 6 | Nautilus icon grid (Geometry visuals) | proto-v6 `.naut-icons-grid` parametric SVG, 4 sizes; cosmetic, no hierarchy | RESHAPE into Geometry engine (grid mode) + ADD icon sizes; hierarchy from our model | engine + tokens | evidence-in |
| 7 | row selection color | stable = **accent** tint 12% · beta = **text-faint** 11% (less prominent — possible regression) | OPEN: restore accent, or keep text-faint? | tokens | OPEN |

## Process

1. Read-only research subagents build evidence per source → fill matrix cells.
2. Grill **one concern at a time**: compare sources → pick a decision verb + target → record the row.
3. Output feeds N (UnoCSS) + the proto-v6 integration grill.

## Source evidence — proto-v6 (agent, 2026-05-26)

- Styling = **CSS custom-properties (tokens) bound via `data-theme`, NO framework** (not
  Tailwind/UnoCSS); BEM `.vm-*` + `.is-*`. Vars mirror Obsidian native (`--background-primary`,
  `--text-muted`, `--interactive-accent`) → chameleon-friendly. **N target = MAP these tokens
  into 0-B + UnoCSS**, not adopt raw CSS.
- Tinting via `color-mix(in srgb, … N%, transparent)`, not opacity — ADOPT (theme-consistent).
- Views: tree (sticky parents + connector lines) · Nautilus icon grid + tile list (4 sizes
  each) · card grid · content/search (`<mark>`). **Table = legacy styled list** (`.vm-grid-table`),
  not an engine.
- CONFIRMED missing: per-node decorations · separated table engine · tree+grid hybrid · column
  customization · focus ring · scoped nested-search highlight · ARIA labels · per-node cmenu wiring.
- Adopt-worthy: multi-theme color-mix tokens · radius/type/spacing scale · glass blur · compact density.
- Files: `Vaultman Prototype v6.html` (tokens L8–82) · `proto-v6/nautilus.jsx` · `proto-v6/control-island.jsx`.

## Source evidence — stable↔beta (agent, 2026-05-26)

Net: **beta is MORE complete than stable** (fuller badges, inset-shadow filters, virtualized tree +
indent guides, better cards). Surprises vs the dev's assumptions:

- **per-node decorations**: beta's `.vm-badge` (quick-action / hover / undoable / inherited) >
  stable's basic badges → row 1 source = **beta**, not stable.
- **in-filters highlight**: beta UPGRADED it (inset shadow + child-opacity elevation; virtual-list
  14% + 78% accent) — not a stable-only win. (Dev recalled stable as "prettiest" — likely taste, or
  conflated with the selection regression below.)
- **search-result**: stable + beta share an IDENTICAL transient pulse (`@keyframes vm-search-pulse`,
  0.8s), refactored to tokens, no regression → search = transient, NOT a durable mark.
- **regression found**: row selection tint stable **accent 12%** → beta **text-faint 11%** (less
  prominent). Likely the regression the dev sensed.

Files: `src/styles/explorer/{_explorer,_tree,_virtual-list,_cards,_tags}.scss` ·
`components/_badges.scss` · `_animations.scss`.

## Status

Both evidence agents IN (proto-v6 + stable↔beta). Matrix rows 1–7. Evidence corrected assumptions:
row 1 source = beta (not stable); 2a in-filters = beta improved; 2b search = transient (RESOLVED);
NEW row 7 = selection-color regression (accent→text-faint). Pending dev calls: confirm row 1 / 2a
source = beta; row 7 (restore accent?); rows 4–6 adopt. Then the matrix feeds N + the proto-v6 grill.
