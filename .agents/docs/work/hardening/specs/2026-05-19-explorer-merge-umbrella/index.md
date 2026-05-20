---
title: Explorer Merge Umbrella — proto-v5 ↔ production merge + release pipeline v1.2.0 → v2.0.0
type: spec-index
status: draft
parent: "[[docs/work/hardening/index|hardening]]"
created: 2026-05-19T00:00:00
updated: 2026-05-19T00:00:00
tags:
  - agent/spec
  - initiative/hardening
  - explorer/umbrella
  - explorer/refactor
  - explorer/proto-v5-merge
created_by: claude-opus-4-7
---

# Explorer Merge Umbrella

Umbrella spec que captura las decisiones del brainstorm 2026-05-19: cómo el `proto-v5`
(en `C:\Users\vic_A\Downloads\Vaultman (1)\`) se mergea con el Explorer de producción;
cómo el refactor SOLID de los god-objects (panelExplorer 1329 LoC + 5 views 4377 LoC + serviceQueue 1043 LoC deferred)
se interleavea con el merge del proto; y la release pipeline `v1.2.0 → v2.0.0`
que orquesta implementaciones, bug fixes y el major version jump después del catch-up `1.1.0`.

Este NO es un implementation spec único. Es el index que ordena hijos:

- 11 sub-systems NUEVOS (N.R, A.R, V.D, P.D, T.G, 0-A.S, K.B, API, I.E, B.P, C.D)
- 1 cross-cutting (R.D — Release Discipline)
- 9 sub-systems pre-existentes con merge layer (5, 6, 8, 10, 11, 12, 4-I, 2, N)

Cada hijo tiene (o tendrá) su propio ciclo spec/plan/impl. Esta umbrella loquea el
orden y el merge map.

## Locked decisions (del brainstorm)

- `proto-v5 ≠ canónico`. Estamos haciendo un **merge** prototipo + producción.
- Tree view se KEEP (proto tiene tree con sticky-parents funcional en `pages.jsx:323-367`
  que es referencia para arreglar el nuestro roto).
- View mode mapping:
  - `viewTree` → KEEP + sticky-parents fix per proto reference
  - `viewList` → proto Nautilus tiles (horizontal icon + multi-meta)
  - `viewTable` → Bases table parity (`bases-tr`, `bases-table-cell`, `data-property`) — NOT proto
  - `viewGrid` → proto Nautilus icons (Adwaita SVG folders + file-type labels). Rich rows-only
    mode = hidrato de viewList + tiles fusionado.
  - `viewCards` → Bases cards parity (`bases-cards-item`, `bases-cards-property`, `bases-cards-cover`,
    `mod-title`) — NOT proto
- Theme system:
  - DROP proto's 6 built-in palettes (Catppuccin/Gruvbox/Dracula/Nord) — Obsidian nativo
  - DROP proto's custom hex picker — Obsidian nativo
  - ADD: provider de system themes Obsidian (detecta themes instalados)
  - ADD: recent themes UI (últimos 3 usados + 4to slot custom picker)
- Mode toggle (sidebar/desktop/both) DROPPED — `serviceLayout.resolveDashboardEnabled` ya cubre
  responsive (width ≥ 800 + main-leaf). NO hay desktop/sidebar split — frame único responsive.
- Theme Builder UI accedido desde Settings (sub-system 10).
- Adwaita SVG icons = sub-feature del Theme Builder (10): user importa Gnome icons + Lucide
  section (Obsidian native) + per-node manual override.
- StackIsland primitive ADOPT con opción squircle-up-center además del default arriba-derecha.
- dashboard3 redefinido: hidratación del módulo "send tabs to Obsidian tabs" + control de qué
  tab muestra qué bars (toolbar/bottom/top). NO 4-column frame divide (Obsidian core + tab-mount
  module ya lo cubren).
- Suggestion rows cap: chips → bits-ui input con `−/+`.
- Operator system: 9-type map (tag/list/select/text/number/date/checkbox/folder/link) =
  primitive del sub-system 4-I (Bases-parity filter logical switching).

## Locked non-goals (esta umbrella, sesiones futuras)

- No tocar serviceQueue refactor (1043 LoC) — deferred post-v1.8.
- No retomar sub-systems retained-in-human: 1 (Unified input), 3 (in-editor diff).
- proto-list mode (sin equivalencia clara) — observación, no in-scope hasta sesión futura.
- viewGrid dual-mode (icons full + rich rows-only) — pendiente decidir si toggle interno o
  views separados; default = una sola view con toggle, se decide en spec de v1.5.0.
- IndexOverlay (formerly AZIndexOverlay) — future, post-v1.6.0.
- Tab-mount module enhancement details (dashboard3 redefinition) — su propio spec dentro de
  v1.6.0 / sub-system 5.
- Statusbar al pie ("X of Y selected · free: GB") — deferred al sub-system serviceStats futuro.
- viewOutlineExplorer (77 LoC, out-of-band) — preserve sin cambios.
- ViewMarkmap (deferred) — preserve hidden.
- proto's Desktop mode big-picture full-screen — NO existe en producción (no hay desktop/sidebar
  split).

## Release pipeline v1.2.0 → v2.0.0

`v1.1.0` fue el release catch-up ya completado para reconciliar `main` y activar la release
automation. No contiene los sub-systems del umbrella; ver
[[docs/work/hardening/plans/2026-05-20-release-1-1-0-catch-up|Release 1.1.0 catch-up]].

| Version | Tema | Sub-systems incluidos | SemVer rationale |
|---|---|---|---|
| **v1.2.0** | Explorer Hardening + sticky-parents | A.R + viewTree sticky fix + 0-A.S + T.G basis + close 0-A | MINOR — no-breaking, fix visible bugs |
| **v1.3.0** | Architecture cleanup | V.D + P.D + N.R primitive | MINOR — refactor no-breaking |
| **v1.4.0** | Keyboard + Public API | K.B + API v1 (`vaultman.v1`) | MINOR — adds public API |
| **v1.5.0** | Nautilus rewrites + Adwata icons | viewList=tiles + viewGrid=icons + Adwata SVG primer | MINOR — visual rewrite, no-breaking |
| **v1.6.0** | Theme Builder + Layout extension | 10 (Theme Builder UI desde Settings) + 6 (Layout settings, recent themes, dashboard3 redef) + 8 (Color governance) + 5 (Settings UI refresh) | MINOR — adds opt-in features |
| **v1.7.0** | Design system migration | N (SCSS→UnoCSS) + 12 (bits-ui adoption preset) + StackIsland adoption | MINOR — internal, visible polish |
| **v1.8.0** | NN Interop | I.E direction B (Vaultman providers → NN explorer) | MINOR — opt-in feature |
| **v2.0.0** ⚠️ | Bases Parity BREAKING | B.P (`note.X`/`file.X`/`formula.X` IDs + `bases-` vocab + `registerBasesView`) + C.D (cross-provider cell data) + viewTable Bases rewrite + viewCards Bases rewrite | MAJOR — breaking property IDs |

**R.D Release Discipline** = cross-cutting desde `1.1.0` catch-up y todo el umbrella:
- Keep a Changelog hygiene: `[Unreleased]` section accumulating cada commit/sub-system
- Bare SemVer tags (`1.1.0`, `1.2.0`...) via release-please (`include-v-in-tag: false`)
- branch hygiene: push `sandbox → origin/sandbox` before release branch/PR if sandbox is source
- main merge ÚNICAMENTE en releases con AI-files-strip pipeline
- manifest.json + versions.json bump (Obsidian community plugin distribution)
- GitHub Release con release.yml assets, SBOM, checksums y notes desde release-please

**Human-retained**: sub-systems 1, 3 + serviceQueue refactor (paralelo cuando capacidad).

## Sub-system inventory (resumen)

Detalle completo en [[02-sub-system-inventory]].

| ID | Name | Origin | First release |
|---|---|---|---|
| **0-A** | Native-DOM parity + ViewHost + NodeElementMask | existing | v1.2.0 (close) |
| **N.R** | NodeRow Primitive | NEW | v1.3.0 |
| **A.R** | Action Routing Contract | NEW | v1.2.0 (FIRST DETAIL SPEC) |
| **V.D** | View Decomposition (god → shells) | NEW | v1.3.0 |
| **P.D** | Panel Decomposition (panelExplorer split) | NEW | v1.3.0 |
| **T.G** | Test Invariant Gates (WDIO + ARIA + cross-view) | NEW | v1.2.0 |
| **0-A.S** | Adversarial Scroll Harness + tree triple-write fix | existing sibling | v1.2.0 |
| **K.B** | Keyboard + Hotkeys/Macros Provider | NEW | v1.4.0 |
| **API** | Vaultman public API `vaultman.v1` | NEW | v1.4.0 |
| **I.E** | NN Interop engine swap (direction B) | NEW | v1.8.0 |
| **B.P** | Bases Parity (extends 4-I) | extends existing 4-I | v2.0.0 |
| **C.D** | Cross-provider Cell Data | NEW | v2.0.0 |
| **R.D** | Release Discipline | NEW cross-cutting | from 1.1.0 catch-up |
| **N** | SCSS → UnoCSS migration | existing | v1.7.0 |
| **5** | Settings UI refresh (+ recent themes + dashboard3 redef) | existing | v1.6.0 |
| **6** | Layout extension | existing | v1.6.0 |
| **7** | Toolbar contract | existing | TBD post-v1.6 |
| **8** | Color governance | existing | v1.6.0 |
| **9** | Snippet provider UX | existing | TBD |
| **10** | Theme Builder UI (+ Adwata icons sub-feature) | existing | v1.6.0 |
| **11** | Workspaces provider | existing | TBD |
| **12** | bits-ui adoption preset + StackIsland | existing | v1.7.0 |
| **4-I** | Bases-parity filter logical switching | existing | extended by B.P at v2.0.0 |
| **2** | Queue data-model restructure | existing | TBD post-v1.7 |

## Shards

- [[01-merge-map]] — proto-v5 ↔ production component-by-component mapping
- [[02-sub-system-inventory]] — full descriptions de los 13 sub-systems nuevos
- [[03-dependency-graph]] — Mermaid + sequencing rationale
- [[04-release-pipeline]] — per-version detail + shippable criterion + SemVer rationale + R.D
- [[05-ambiguities-and-deferred]] — proto-list, viewGrid dual, dashboard3, IndexOverlay
- [[06-next-actions]] — first detail spec target (A.R) + execution mode handoff

## Status

- Status: 🟡 spec-drafted, release catch-up complete, next writing-plans handoff para A.R como first detail spec.
- Source brainstorm: 2026-05-19 sesión (transcript de Claude Opus 4.7).
- Approver: User (Meibbo) aprobó pipeline 2026-05-19.
- Build order: locked. R.D está instalado desde `1.1.0`; umbrella arranca en `v1.2.0`.
- Unblocks: A.R detail spec → A.R plan → v1.2.0 execution.

## Adjacent docs

- [[docs/work/roadmap-overview|Roadmap Overview]] — debe actualizarse con los 13 nuevos sub-systems
  (N.R, A.R, V.D, P.D, T.G, 0-A.S, K.B, API, I.E, B.P, C.D, R.D) + release pipeline columna.
  Pendiente en [[06-next-actions]].
- [[docs/current/status|Current status]] — debe linkar este umbrella como next initiative.
- [[docs/current/handoff|Current handoff]] — next action = umbrella review + escribir A.R spec.
- [[docs/work/hardening/specs/2026-05-18-explorer-sub-system-0-a-native-dom-parity/index|0-A spec]]
  — close pendiente, in-flight commits (cd2d8fc…cfc2604).
- [[docs/work/hardening/backlog/2026-05-15-explorer-ui-vision/index|Explorer UI Vision backlog]]
  — canonical source of sub-systems 1-12+N+O.

## Source references

- proto-v5 files: `C:\Users\vic_A\Downloads\Vaultman (1)\Vaultman Prototype v5.html` (124 KB)
  + `C:\Users\vic_A\Downloads\Vaultman (1)\proto-v5\*.jsx` (10 files, ~170 KB total):
  app.jsx, control-island.jsx, data.jsx, desktop.jsx, nautilus.jsx, pages.jsx, popups.jsx,
  search-island.jsx, sidebar.jsx, stack-island.jsx
- External research outputs en el transcript del brainstorm:
  1. Internal arch audit (LoC + behavior matrix + service inventory + SOLID violations)
  2. External research (Svelte 5 patterns + Electron testing + TanStack Virtual + WAI-ARIA tree)
  3. Bases parity + NN interop + web-lab integration (con conflict register)
