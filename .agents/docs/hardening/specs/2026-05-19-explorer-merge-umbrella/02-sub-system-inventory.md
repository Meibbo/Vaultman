---
title: Sub-system Inventory — full descriptions de los 13 nuevos sub-systems
type: spec-shard
status: draft
parent: "[[index|umbrella]]"
created: 2026-05-19T00:00:00
updated: 2026-05-19T00:00:00
---

# Sub-system Inventory

Full descriptions de los **11 sub-systems NUEVOS** + **R.D cross-cutting** + comentarios sobre
los 9 sub-systems pre-existentes (5, 6, 8, 10, 11, 12, 4-I, 2, N) que reciben merge layer.

## NEW: N.R — NodeRow Primitive

- **Goal**: extraer un Svelte 5 component compartido que carga la metáfora "row de nodo".
  Embedded por todos los views (tree, list, table, grid, cards). Carries: icon slot, label
  slot, badges slot, counters slot, cmenu trigger, hover state, drag handle, selection state,
  focus state, expanded state.
- **Scope**:
  - New `src/components/primitives/NodeRow.svelte`
  - New `src/components/primitives/CaretButton.svelte` (WCAG 2.5.8 hit-target ≥ 24×24 CSS px)
  - Consumes context: `NodeElementMask` (from 0-A) + `RowActionContext` (from A.R)
  - Exposes layout variant prop: `tree` (with indent + caret), `flat` (no indent), `cell`
    (table cell content), `card` (vertical card body)
- **Out-of-scope**: behaviors (those are A.R), data fetching, decomposition of views
- **Depends on**: 0-A (NodeElementMask), A.R (action routing context shape)
- **~Commits**: 6-8
- **First release**: v1.3.0

## NEW: A.R — Action Routing Contract

- **Goal**: unificar caret click + keyboard nav + selection consumption + expand/collapse all +
  context menu en TODOS los views/explorers/mount-contexts. Resolver la divergencia
  `(id, MouseEvent)` vs `(row, SelectModifiers)` y los 3 contratos keyboard distintos.
- **Scope**:
  - New `src/services/serviceKeyboardNav.ts` (gap actual; `serviceNavigation.svelte.ts` solo
    cubre page/tab routing)
  - New `src/services/serviceRowAction.ts` (builder pattern: `getCaretProps(id)`, `getRowProps(id)`,
    `getKeyboardHandlers(id)` returning prop-bags spreaded onto markup, estilo Melt UI)
  - Normalizar contract en ViewHost (`src/components/explorer/ViewHost.svelte:174-186` vs 144-173)
    → single `(id, MouseEvent)` contract; `(row, SelectModifiers)` ViewNodeList variant migra
  - Fix viewTree caret leaf placeholder (`viewTree.svelte:974-978`) — placeholder no traga clicks
  - WAI-ARIA Tree View pattern compliance: Right opens / Left closes / Up-Down nav / Home-End /
    Enter activates / typing type-ahead
  - Standard 10-item cmenu (Open/Rename/Move/Tag/Prop/Duplicate/Queue/Delete) routed via A.R
  - Expand/collapse all enabled for non-tree views via `nodeExpansionCommand` propagation
- **Out-of-scope**: virtualization, scroll, decomposition of god-objects, NodeRow primitive
  (es prereq pero se entrega en V.D / N.R)
- **Depends on**: 0-A (close)
- **~Commits**: 8-12
- **First release**: v1.2.0 ← **FIRST DETAIL SPEC TARGET**

## NEW: V.D — View Decomposition

- **Goal**: shrink 5 view god-objects (4377 LoC total) → thin shells delegating to services +
  N.R primitive.
- **Scope**: viewTree 1142 → ~250 LoC, ViewNodeList 464 → ~150, ViewNodeTable 858 → ~200,
  ViewNodeGrid 1230 → ~250, ViewNodeCards 606 → ~200. Total: ~1050 LoC (vs 4377). Cada view
  becomes "layout-around-NodeRow":
  - viewTree: indent + caret + sticky-parents wrapper around NodeRow
  - ViewNodeList: flat wrapper around NodeRow
  - ViewNodeTable: column layout around NodeRow as cell-source
  - ViewNodeGrid: grid layout around NodeRow as card/icon
  - ViewNodeCards: vertical card layout around NodeRow
- **Out-of-scope**: action routing (es prereq, A.R first), panel host (P.D), behaviors
- **Depends on**: A.R (action contract) + N.R (primitive)
- **~Commits**: 12-18
- **First release**: v1.3.0

## NEW: P.D — Panel Decomposition

- **Goal**: panelExplorer.svelte 1329 LoC → orchestrators focused. 27 props split por responsabilidad.
- **Scope**: extract:
  - `ProjectionAssembler` (treeRowInputs derivation + idToIndex + visible projection)
  - `ExpansionOrchestrator` (autoExpandedIds + manualExpanded/Collapsed + nodeExpansionCommand)
  - `SearchSortOrchestrator` (searchTerm + sortBy + sortDirection + sortTarget)
  - `BadgeBubblingOrchestrator` (bubbleHiddenTreeBadges + activeOpsByNode + detectBadgeContradictions)
  - `MouseActionResolver` (resolveNodeMouseActions wrapper)
  - `SelectionAuthResolver` (fallbackSelectionService + plugin.selectionService chain)
  - `ManualDndOrchestrator` (applyManualNodeReorder)
- **Out-of-scope**: provider refactor (separate, post-v1.5)
- **Depends on**: A.R + N.R + V.D
- **~Commits**: 8-12
- **First release**: v1.3.0

## NEW: T.G — Test Invariant Gates anti-IA

- **Goal**: prevenir regresiones cuando agentes IA tocan views/services. La causa raíz que el
  usuario reporta ("ni los tests han evitado que se rompan estos componentes") es **intent drift**:
  el comportamiento diverge del spec SIN que falle un test unitario. T.G ataca eso con
  spec-anchored invariants + statistical gates, NO con más unit tests.

- **Tres tiers de test (pirámide)**:
  1. **Vitest jsdom** — pure service logic (selection state machine, expand-collapse, type-ahead
     buffer). Corre contra los `.svelte.ts` reales. Rápido. (Ya existe parcialmente: `test:cover`.)
  2. **Vitest browser mode** (`@vitest/browser-playwright`) — component contracts contra el DOM
     real que sirve obsidian-web-lab (mismo `app.js` + `app.css` que Electron). Cubre DOM emission,
     CSS class presence, event wiring, layout math, virt counters. NO cubre plugin lifecycle /
     settings persistence / workspace state (Electron-only — gate con `describe.skipIf(!process.versions.electron)`).
  3. **wdio-obsidian-service** — E2E en Obsidian real (versioned download, sandboxed config,
     Windows + CI). Para los casos que solo fallan con `app.js` real.

- **Invariant suites (spec-anchored, cross-view — TODOS los views deben pasar)**:
  - WAI-ARIA Tree View pattern compliance (Right opens / Left closes / Up-Down nav / Home-End /
    Enter activates / type-ahead) — keyboard behaviors mandatorios
  - Caret hit-target snapshot (WCAG 2.5.8 ≥ 24×24 CSS px)
  - Selection contract parity (mismo `(id, MouseEvent)` en los 5 views × mount-contexts)
  - Keyboard nav parity (Arrows/Home/End/PageUp/Down/Enter/Space/typeahead idénticos)
  - Native-DOM emission snapshot vs Bases / Obsidian real (diff byte-for-byte contra DOM del web-lab)
  - **Assert structural attrs** (`aria-expanded`, `aria-selected`, `aria-activedescendant`,
    `data-row-key`) NO CSS classes — eso es lo que frena el drift de agentes

- **Anti-drift statistical gates (research 2026-05-19)**:
  - **AgentAssay-style**: cada invariant suite corre N=5 veces, aplica Wilson confidence intervals +
    Fisher's exact test → gate pasa solo si el pass-rate es estadísticamente estable (maneja
    non-determinismo de outputs de agentes)
  - **CUSUM drift detection** entre iteraciones del pipeline: trackea pass-rate acumulado a través de
    los sub-systems v1.2.0→v2.0.0; detecta intent-drift / loops / hallucinated tool calls antes de v2.0.0
  - Mismo evaluator gatea CI y merge (no drift dev-time vs merge-time)

- **Integración con CI existente** (`.github/workflows/ci.yml`):
  - ci.yml actual NO incluye `sandbox` en trigger branches (`[main, hardening, hardening-*]`) →
    los 180 commits de sandbox NUNCA pasaron CI. **T.G debe AGREGAR `sandbox` al trigger.**
  - Agregar tiers como jobs: jsdom (existente `test:cover`), browser-mode (nuevo), wdio (nuevo)
  - `claude-code-action@v1` como neutral reviewer feeding severity al auto-merge matrix

- **Out-of-scope**: feature work
- **Depends on**: A.R (contract a testear). Tier 1 jsdom puede arrancar antes (service logic ya existe).
- **~Commits**: 6-10 (subió de 4-8 al agregar statistical gates + CI integration)
- **First release**: v1.2.0 (basis: jsdom + browser-mode + WAI-ARIA suite + sandbox-en-CI);
  extends v1.3.0 (wdio tier + CUSUM cross-sub-system) + V.D coverage

## EXISTING SIBLING: 0-A.S — Adversarial Scroll Harness + tree scroll fix

- **Goal**: fix tree scroll triple-write race (`viewTree.svelte:420-441` — `scrollToIndex` +
  `outerEl.scrollTop` + `dispatchEvent('scroll')`). Add burst harness con percentile/histogram.
- **Scope**:
  - Single-write scroll path en viewTree (only `scrollToIndex`)
  - Normalize `consumedScrollTargetSerial` (currently duplicated 4× across views)
  - Shared scroll-target serial consumption pattern
  - Percentile + histogram reporting en `scripts/run-explorer-scroll-smoke.mjs`
  - Runner-level view switching pendiente per existing scroll-repair plan
- **Out-of-scope**: action routing, view decomposition
- **Depends on**: independent (sibling track)
- **~Commits**: 5-8
- **First release**: v1.2.0

## NEW: K.B — Keyboard + Hotkeys/Macros Provider

- **Goal**: módulo aparte que se encarga de TODA la interacción del keyboard con el plugin
  y con el resto del workspace. Más broad que A.R row-nav. Includes hotkey provider y macros
  provider.
- **Scope**:
  - New provider type `HotkeysProvider` para registrar hotkeys per-context
  - New provider type `MacrosProvider` para sequenceable actions
  - Workspace-wide keyboard interaction routing
  - Integrates con A.R row-nav (row keyboard nav delega a K.B's row context)
- **Out-of-scope**: cross-plugin keyboard sharing (defer to API + I.E)
- **Depends on**: A.R (row keyboard contract)
- **~Commits**: 6-10
- **First release**: v1.4.0

## NEW: API — Vaultman public API `vaultman.v1`

- **Goal**: estable public API surface para handshake cross-plugin. NN-shaped namespaces
  para idiomatic Obsidian plugin authors.
- **Scope**:
  - `app.plugins.getPlugin("vaultman").api` exposed con `vaultman.v1` namespace versioned
  - 6 sub-namespaces: `navigation`, `metadata`, `selection`, `menus`, `events`, `themes`
  - Events bus: `selection-changed`, `view-mode-changed`, `provider-changed`, `theme-changed`,
    `layout-changed`, `nav-item-changed`
  - Types published como separate npm package `@vaultman/api` para consumers
  - Onload detection pattern (post-`onLayoutReady`)
- **Out-of-scope**: render override hooks (NN doesn't expose them; defer to I.E)
- **Depends on**: V.D + P.D (need clean architecture before exposing)
- **~Commits**: 4-6
- **First release**: v1.4.0

## NEW: I.E — NN Interop engine swap (direction B)

- **Goal**: first cross-plugin compatibility step. Settings option para que Vaultman renderee
  o que sus providers se inyecten en NN.
- **Scope**:
  - Setting `explorer.engine: 'vaultman' | 'notebook-navigator'` (default `'vaultman'`)
  - Direction B (Vaultman providers → NN explorer) — FIRST: NN's API estable hoy
  - On `onLayoutReady`: check `app.plugins.getPlugin("notebook-navigator")?.api` exists
  - Subscribe to `api.on('selection-changed')` y re-emit en UNIVERSAL_DND_VOCAB state-mod bus
  - Write Vaultman metadata via `api.metadata.setFolderMeta/setTagMeta/setPropertyMeta`
  - Register cmenu items via `api.menus.registerFileMenu / registerFolderMenu`
  - Direction A (Vaultman-renderer ← NN-data): DEFERRED, NN renderer not pluggable (upstream blocker)
- **Out-of-scope**: render override (upstream limitation)
- **Depends on**: API (`vaultman.v1` ready first)
- **~Commits**: 6-10
- **First release**: v1.8.0

## NEW: B.P — Bases Parity (extiende 4-I)

- **Goal**: full Bases plugin parity — namespaced property IDs, DOM vocabulary, `registerBasesView()`
  inheritance del query pipeline, formula language hosting (no rebuild).
- **Scope** ⚠️ BREAKING:
  - Property addressing: `prop:area` → `prop.note.area` (breaking)
  - DOM vocab: emit `bases-tr`, `bases-table-cell`, `bases-td`, `bases-cards-item`,
    `bases-cards-property mod-title`, `bases-cards-cover` cuando `preset.useNativeDom === true`
  - Implement `registerBasesView()` para Vaultman table view (inherit Bases pipeline)
  - `data-property="note.X"` attribute convention
  - viewTable rewrite per Bases (CSS classes + cell semantics)
  - viewCards rewrite per Bases (cards classes + cover/title properties)
  - Polyfill para leer Base results (open-detached-leaf → `controller.results` → unload)
- **Out-of-scope**: inline `key:: value` query (Dataview territory; future provider)
- **Depends on**: 4-I (filter logical switching base) + C.D (cell semantics)
- **~Commits**: 10-15
- **First release**: v2.0.0 ⚠️ MAJOR breaking

## NEW: C.D — Cross-provider Cell Data

- **Goal**: cell semantics — la celda en (`row=file`, `column=prop:area`) debe yield el value
  de esa property en ese file específico. Cross-provider lookup at cell level.
- **Scope**:
  - Extend `ExplorerRowInput<NodeBase>` con cross-provider property lookup
  - `Cell.getValue(propertyId)` method aligned con Bases' `entry.getValue(propertyName)`
  - Resolver namespaced IDs (`note.X` / `file.X` / `formula.X`) — uses B.P's parser
- **Out-of-scope**: formula evaluation (use Bases' pipeline via B.P)
- **Depends on**: B.P (namespaced IDs + property resolution)
- **~Commits**: 8-12
- **First release**: v2.0.0

## NEW cross-cutting: R.D — Release Discipline

- **Goal**: cada release ships clean. Keep a Changelog + SemVer + branch hygiene + push origin.
- **Scope**: continuo desde el catch-up `1.1.0` y el umbrella `v1.2.0+`
  - `[Unreleased]` section accumulating en `CHANGELOG.md` cada commit/sub-system
  - `1.1.0` catch-up reconciled package/changelog through release-please
  - Bare SemVer tagging: `1.1.0`, `1.2.0`... via release-please (`include-v-in-tag: false`)
  - Push `sandbox → origin/sandbox` before release branch/PR when sandbox is the source
  - Merge `sandbox → main` ÚNICAMENTE en releases, vía sanitized main/release-please pipeline
    with AI-file guard (`.agents/`, `CLAUDE.md`, `AGENTS.md`, `.claude/`, `.codex/`)
  - manifest.json + versions.json bump (Obsidian community plugin distribution)
  - GitHub Release con notes desde CHANGELOG section
  - Per-release: pre-merge checklist + post-merge smoke en `plugin-dev`
- **~Commits**: continuo (no concentrated; cada release gate)
- **First release**: `1.1.0` catch-up complete; continues from umbrella `v1.2.0`

## Pre-existing sub-systems con merge layer (resumen)

### 5 — Settings UI refresh
- Existing 🟠 (blocker: 0-B impl). En esta umbrella ABSORBS:
  - dashboard3 redefinition (hidratación tab-mount module + control bars per-tab)
  - Recent themes UI (3 + custom slot)
  - Suggestion rows input bits-ui −/+ (instead of chips)
  - Placeholder settings que están — rediseñar con merge proto
- First release: v1.6.0

### 6 — Layout extension
- Existing 🟠 (blocker: O + 0-A). Merge layer:
  - Bottom nav layouts pill/dual/drawer (proto ControlLayoutSection)
  - Drawer corner + direction
  - Pill style variants
  - Swap tabs ↔ pill items toggle
- First release: v1.6.0

### 8 — Color governance
- Existing 🟠 (independent). Merge layer:
  - Recent accent integration con Theme Builder
- First release: v1.6.0

### 10 — Theme Builder UI
- Existing 🟠 (blocker: 5 + 6). En esta umbrella ABSORBS:
  - Adwata SVG icons sub-feature (Gnome import + Lucide section + per-node manual)
  - Recent themes UI consumption
  - Bar visibility toggles (toolbar/bottom/top show-hide)
  - Accedido desde Settings
- First release: v1.6.0

### 11 — Workspaces provider
- Existing 🟠 (independent). Merge layer: posible integration con I.E (workspaces como interop seam)
- First release: TBD (probably v1.8+)

### 12 — bits-ui adoption preset
- Existing 🟠 (blocker: N recomendado). Merge layer:
  - StackIsland primitive adoption con squircle-up-center option
  - Vaultman preset rewrite based on HTML + 10 React files del proto-v5
  - Suggestion rows input componente (bits-ui −/+)
- First release: v1.7.0

### 4-I — Bases-parity filter logical switching
- Existing 🟠 (independent). En esta umbrella EXTENDED por B.P at v2.0.0:
  - 4-I delivers: filter tree (groups AND/OR + subgroups + orphans) + 9-type OPERATORS +
    FilterComposer (parseManualFilter)
  - B.P (v2.0.0) extends con: namespaced property IDs + `bases-` DOM vocab + `registerBasesView`
- First release: TBD pre-v2 (4-I baseline) → extended v2.0.0 (B.P)

### 2 — Queue data-model restructure
- Existing 🟠 (independent). Merge layer: adopt StackIsland for queue UI (replaces QueueIslandV2)
- First release: TBD post-v1.7

### N — SCSS → UnoCSS migration
- Existing 🟠 esqueleto. Pre-req del 12 (bits-ui).
- First release: v1.7.0
