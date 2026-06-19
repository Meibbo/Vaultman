---
title: Current status
type: agent-status
status: active
parent: "[[docs/work/pkm-ai/index|pkm-ai]]"
archive_source: docs/archive/pkm-ai/active-docs/2026-05-11T080321-current-status.md
created: 2026-05-04T01:36:20
updated: 2026-06-07T08:11:13-05:00
tags:
  - agent/current
created_by: dec
updated_by: codex-gpt-5
---

# Current Status

Compact route index after archiving the oversized current status:
[[docs/archive/pkm-ai/active-docs/2026-05-11T080321-current-status|2026-05-11 status archive]].

## Active Rules

- `main` must contain zero AI workflow files.
- Active detail belongs in source records, not this index.
- Do not revert or overwrite unrelated user/agent changes.
- Obsidian CLI runtime tests and live smokes must target `plugin-dev`
  explicitly, using command-specific syntax such as
  `obsidian vault=plugin-dev eval code="..."`.

## Current Route

- Active initiative: [[docs/work/hardening/index|Hardening]].
- **LATEST (2026-06-18)**: **View Addressing Canon NOW-tier LOCKED + landed** (sin código; sandbox @
  `cc23ad9`). El grill de V.D destapó un conflicto 3-vías en el canon engine/mode/orientation (tracer vs
  explorer-model vs proto) — se lockeó el NOW-tier y se aterrizó en home canónico:
  [[docs/architecture/explorer-model/05-view-canon|05 View Canon]] (living) + **ADR 0012** (supersede la
  taxonomía-view de ADR 0008) + glossary L129-131 + research-inventory. Esencial: **orientation ≠ h/v**
  (→`direction`); Linear modes flat/indent/cascade/detail; Geometry grid/cards/masonry/table (**group-box
  fuera**); validity compose-free; viewScope 4; regime + regime-flip. DEFERRED: Canvas/Charts N4 ·
  viewScope-filter/composición N3. **Next = thread A: pilot Linear del perf-runtime** (desbloqueado).
  Detalle: session-log 2026-06-18 + [[docs/work/hardening/specs/2026-06-17-vd-shared-render-runtime/index|V.D shard]].
- **LATEST (2026-06-17)**: **V.D grill EN CURSO** (sin código; sandbox @ `cc23ad9`). Modelo del
  shared render-runtime validado con el dev. LOCKED: runtime = **Linear+Geometry only** (Canvas/Charts
  aparte/deferred); **canon engines CORREGIDO → Linear/Geometry/Canvas/Charts** (Table=modo Geometry,
  Charts=4º; `typeViewConfig` L64 + `glossary` L129 STALE); Geometry = **Opt-1** (un GeometryView +
  mode-strategies); reservar seam size/order/slot+`media` (wired solo slot regime); `ViewPlacement.regime`
  = frontera engine (slot=virtualizable, coordinates=Canvas); selection box/lasso = hit-test geométrico del
  shared service. Open: Q-C..Q-H. Detalle:
  [[docs/work/hardening/specs/2026-06-17-vd-shared-render-runtime/index|V.D grill checkpoint]] + session-log 2026-06-17.
- **LATEST (2026-06-16)**: **N.R NodeRow cell primitive ATERRIZADO** — sandbox @ `cc23ad9`
  (FF de `d81be5e`). `NodeRow` + `NodeBadgeZone` extraídos del cell inline de `viewTree`, pilot
  tree, contrato headless `data-vm-*` (D-PSS-2 B1; contrato anticipa el abanico, cabla solo tree —
  Q1/D7). `metric` slot (prop/word-count por nodo) definido sin cablear; StatCard = panel MyWorkspace
  fuera de scope. Verify: svelte-check 0/0 · autofixer `issues:[]` · build ok · test:unit 1092/1092
  (1 ajeno notebook-nav) · viewTree+tests nuevos verde. `verify` chain corta en `eslint .` por 7
  errores ajenos pre-existentes (opción A = dejados). **Next spine = V.D** (shared render-runtime
  monta NodeRow; el perf fix real). Detalle:
  [[docs/work/hardening/plans/2026-06-15-nr-noderow-cell/index|N.R plan]] + handoff (sección V.D) +
  session-log 2026-06-16.
- **LATEST (2026-06-15)**: **Q4 COMPLETO (6/6)** — sandbox @ `d81be5e` (`2.0.0-alpha.1`):
  logicFiles · logicProps · logicTags(+SDF-008) · logicBadge · logicFnR · cierre dual-snapshot.
  Módulos `logic*` puros + boundary tests; providers delgados; D6 namespaced ids; props/tags/
  content publican snapshots. Wave-closing smoke limpio (reload + dev:errors). **Spine N0 listo
  para N.R.** Plan:
  [[docs/work/hardening/plans/2026-06-13-q4-logic-extraction/index|Q4 plan]] (status log por slice).
  Pendiente wave 1: PA slices 2-5, lane C tracer ya aterrizado. Next: PA 2-5 · V.D (ViewHost sobre
  `ViewConfig` resuelto) · N.R. Buen punto de checkpoint (sesión 3 días). Detalle:
  [[docs/current/handoff|handoff]] + session-log 2026-06-15.
- **LATEST (2026-06-15, tarde)**: **Frontend stack deep-research** (pre-N.R) — 6 Explore agents read-only +
  verificación repo/web →
  [[docs/work/hardening/research/2026-06-15-frontend-stack-deep-research/index|Frontend Stack Deep Research]]
  (ledger de verificación + 6 shards). **D-FE-1: N.R = celda Svelte 5** (stack ya casado con svelte-virtual +
  pretext; imperative-builder prematuro); **lever real = V.D shared-runtime**. Correcciones: presetWind4 EXISTE ·
  UnoCSS ya cableado · dnd-kit oficial supersede HanielU · render-tag = html-in-canvas (N4). Skill
  `vm-explorer-virtualization`. Abiertas D-FE-2..5. Statusline configurado. Sin código tocado; sandbox @
  `d81be5e`. Detalle: [[docs/current/handoff|handoff]] + session-log 2026-06-15.
- **2026-06-14**: Wave 1 N0 (3 lanes Q4-s1/PlatformAdapter/tracer) aterrizado `22979b1`; eslint
  `.worktrees` hang RESUELTO (`c2062d9`); spike MillerColumns murió en rama (informe guardado).
- **LATEST (2026-06-12, tarde)**: **Fase C-lite escrita** — grill D-C-1/5/7 locked
  (content search nativo + seam · conflict gate identity+VFS · diff único VfsChain) en
  [[docs/work/hardening/specs/2026-06-10-vaultman-2-0-synthesis-umbrella/01-locked-decisions-grill|umbrella shard 01]];
  3 specs de wave 1 en
  [[docs/work/hardening/specs/2026-06-12-wave-1-specs/index|Wave 1 specs]] (Q4 ·
  PlatformAdapter · tracer ViewConfig), **draft pendiente review dev**. Prioridad alpha:
  MyWorkspace + Symbiont Explorer + node-notes. Next: review → tag respaldo → lanes A/B.
- **LATEST (2026-06-12)**: **Fase B COMPLETA** — function-union ledger 8/8 clusters
  (~595 filas) + síntesis transversal:
  [[docs/work/hardening/research/2026-06-11-function-union-ledger/index|ledger index]] ·
  [[docs/work/hardening/research/2026-06-11-function-union-ledger/09-sintesis-transversal|síntesis (shard 09)]].
  Cluster 08 re-lanzado y escrito (ServiceAPI/diagnostics SOLO-SANDBOX; mobile = gap de
  los 3 streams; labels `beta`-en-canary CONTRADICE D4). Síntesis: 16 CONTRADICE
  (C-1..C-16), 5 duales internos sandbox (gates N1/N2), inputs por spec de wave 1 (§7),
  7 decisiones dev abiertas (§8). Next: **Fase C-lite** (specs Q4 ∥ PlatformAdapter ∥
  tracer) — C-1/C-5/C-7 gatean el spec Q4.
- **LATEST (2026-06-10)**: Iniciativa fundada —
  [[docs/work/hardening/specs/2026-06-10-vaultman-2-0-synthesis-umbrella/index|Vaultman 2.0 Synthesis Umbrella]]
  (proto-v12 × sandbox × stable → línea `2.0.0`). Grill de 9 decisiones locked (D1-D9):
  absorbe el spine del roadmap-dispatch; sandbox sigue canary (waves en worktree
  `umbrella-v2/wave-N`, dev intacto hasta gates); paridad stable `1.1.1` por sistema vía
  function-union ledger; canon por preset (proto=polish/demo · stable-minimal=native ·
  sandbox=decorations); pirámide N0-N4 = orden de gates; **PSS grill CERRADO
  2026-06-11** (D-PSS-1..10 en shard 01 de la umbrella: facetas×cascada, estilo
  headless 4+3 `data-vm-*`, 4 clases de storage, payload `.scene`/CR-2 destrabado,
  labels `alpha→beta→rc`, tests de aceptación legacy-1.1/native-Bases/barebones);
  dominios
  **MyWorkspace** + **Symbiont Explorer**; whiteboard Node Distribution digitalizado.
  Supersede la Explorer Merge Umbrella 2026-05-19. Stable `1.1.1` publicado 2026-06-09
  (`main`=`dev`=`33d9d23`) queda hotfix-only. Fix pkm-ai: AGENTS.md + vm-start-session
  ahora apuntan a los tools `.ts` vía `npx tsx` (la migración 2026-06-04 dejó paths
  `.mjs` muertos). Nuevo:
  [[docs/work/pkm-ai/items/2026-06-10-agent-tooling-working-memory|agent tooling working-memory]]
  + open de research TanStack virtualizer/Svelte en la umbrella. Next: PSS grill →
  Fase B ledger.
- **LATEST (2026-06-07)**: Stable `1.1.0` Data/Files parity
  [[docs/work/hardening/issues/stable-1-1-data-files-parity/016-explorer-view-parity-and-stat-card-routing|SDF-016]]
  completed the requested resizable-table + working Files-grid subcut in product worktree
  `hotfix/1.0.2-css-scorecard`: Files now exposes selectable `Tree`, `Table`, and `Grid`; `Table` is the
  repaired Bases-style table renderer, `Grid` is a dedicated row-virtualized card renderer; Files/generic
  node tables now have working header resizers with clamped in-memory widths. Verification: focused
  RED/GREEN, Svelte MCP autofixer `issues: []`, `pnpm run check`, full unit `37` files / `130` tests,
  full `pnpm run verify` including `eslint .`, stylelint, production build, and scorecard `17`; build was
  synced to `plugin-dev`; CLI bridge was restarted; reload/open and DOM smoke confirmed Grid cards,
  draggable/data-path/scroll, Table rows, resizer `300px -> 360px`, and final `dev:errors` clean. SDF-016
  remains open for Content parity and the next indexed/batched filter-performance cut.
- **LATEST (2026-06-07)**: Stable `1.1.0` Data/Files parity
  [[docs/work/hardening/issues/stable-1-1-data-files-parity/016-explorer-view-parity-and-stat-card-routing|SDF-016]]
  completed the first recommended follow-up after cuts 1-3 in product worktree
  `hotfix/1.0.2-css-scorecard`: `all` filter groups now narrow candidates and cache metadata per
  evaluation; minimal Data header now matches Core `nav-header > nav-buttons-container >
  clickable-icon.nav-action-button`; dock-off Tabs menu now includes `Statistics`; panel cmenu has
  `Clean selection`; DnD payloads can include same-surface active filters as temporary multi-selection.
  Verification: focused RED/GREEN, focused unit `5` files / `15` tests, `pnpm run check`, full unit `36`
  files / `125` tests, scorecard `17`, format check, stylelint, targeted ESLint, build synced to
  `plugin-dev`, reload/open, DOM smoke, final `dev:errors` clean. Full `pnpm run lint`/`eslint .` timed
  out without diagnostics. Perf improved from `filter.applyFilters` pikes up to `490.2ms` to roughly
  `70-113ms`, but burst FPS still dropped to about `12fps`; next subcut should add indexed/batched filter
  evaluation plus the newly requested resizable table and working Files grid.
- **LATEST (2026-06-07)**: Stable `1.1.0` Data/Files parity
  [[docs/work/hardening/issues/stable-1-1-data-files-parity/016-explorer-view-parity-and-stat-card-routing|SDF-016]]
  completed cuts 1-3 in product worktree `hotfix/1.0.2-css-scorecard`: dock defaults off with
  Filters/Queue in the Data Tabs menu, quick double-click clears Filters/Queue lists, Queue warning
  indicators surface bulk-risk operations, minimal View menu hides DnD/Cards, Files/Tags/Props rows now
  emit Vaultman DnD payloads, and Core Bases multi-select context menus get Vaultman batch operations.
  Verification: Svelte MCP autofixer no issues on `navbarPillFab.svelte`, focused unit `4` files / `15`
  tests, full `pnpm run verify` (`35` unit files / `119` tests; scorecard `17` checks), build synced to
  `plugin-dev`, `plugin:reload` passed, DOM smoke confirmed dock off plus Tabs menu actions and
  draggable explorer rows, final `dev:errors` clean. SDF-016 remains open for Content parity and Files
  grid parity.
- **LATEST (2026-06-06)**: Stable `1.1.0` Data/Files parity
  [[docs/work/hardening/issues/stable-1-1-data-files-parity/016-explorer-view-parity-and-stat-card-routing|SDF-016]]
  SDF-016d completed a row reuse/signature cut in product worktree
  `hotfix/1.0.2-css-scorecard`: `UnifiedTreeView`, Files Table, and generic Node Table now keep row
  shell maps, remove only stale virtual rows, and skip child DOM rebuilds when `rowSignature` is
  unchanged. Verification: focused RED/GREEN guards, focused virtualization gate `5` unit files / `13`
  tests, `pnpm run check`, lint, format check, stylelint, `pnpm run build` synced to `plugin-dev`,
  runtime sync DOM smoke confirmed `data-render-signature` on `66/66` visible rows, final `dev:errors`
  clean, full unit `33` files / `111` tests, scorecard `17` checks. Post-signature numeric perf was not
  freshly captured because CLI timer/RAF promises stopped resolving reliably after reload.
- **LATEST (2026-06-06)**: Stable `1.1.0` Data/Files parity
  [[docs/work/hardening/issues/stable-1-1-data-files-parity/016-explorer-view-parity-and-stat-card-routing|SDF-016]]
  SDF-016c completed a targeted explorer scroll/lifecycle cut in product worktree
  `hotfix/1.0.2-css-scorecard`: Files Table now destroys its root state before Tree remounts,
  Files/Node table scroll handlers coalesce window DOM rebuilds through RAF scheduling, and table
  renderers now emit `files.table.window` / `node.table.window` perf entries. Verification: RED/GREEN
  source guards, focused virtualization gate `5` unit files / `8` tests, `pnpm run check`, lint,
  format check, stylelint, `pnpm run build` synced to `plugin-dev`, runtime DOM smoke confirmed
  expanded Files Tree `scrollHeight=301887` with no stale `vaultman-files-table-root`, Files Table
  `scrollHeight=333570`, final `dev:errors` clean. Remaining risk: explorer scroll jank is still
  measurable (`tree.window` around `17-27ms`, Files Table windows mostly `13-23ms` with one `34.6ms`
  spike). DnD native DOM research was captured as the next separate slice.
- **LATEST (2026-06-06)**: Stable `1.1.0` Data/Files parity
  [[docs/work/hardening/issues/stable-1-1-data-files-parity/016-explorer-view-parity-and-stat-card-routing|SDF-016]]
  SDF-016b completed the Props/Tags generic table slice in product worktree
  `hotfix/1.0.2-css-scorecard`: Props and Tags now expose selectable `Table` through the centralized
  view-mode contract, render via a shared `viewNodeTable.ts` using Bases/core table classes and stable
  node table column offsets, and mount correctly when reached from Statistics card routing. SDF-016
  remains in progress because Content table parity and Files grid parity are still deferred. Verification:
  focused gate `4` unit files / `16` tests, Svelte MCP autofixer no issues on the touched Svelte
  component, `pnpm run check`, stylelint, targeted Prettier, `pnpm run build` synced to `plugin-dev`,
  runtime Props/Tags table smoke from Statistics routing, final clean `dev:errors` and captured console,
  and full `pnpm run verify` passed (`30` unit files / `100` tests; scorecard `17` checks).
- **LATEST (2026-06-06)**: Stable `1.1.0` Data/Files parity
  [[docs/work/hardening/issues/stable-1-1-data-files-parity/016-explorer-view-parity-and-stat-card-routing|SDF-016]]
  is now in progress in product worktree `hotfix/1.0.2-css-scorecard`: the Statistics card routing
  slice is complete and the view-mode availability contract is explicit. Folders/Files route to
  Data/Files, Props/Values to Data/Props, Tags to Data/Tags, and Word Count to Data/Content while
  preserving filter/search state and closing open islands. Files View now presents Tree/Table as
  selectable and Grid/DnD/Cards as disabled; Props/Tags present Tree/Grid selectable and Table/DnD/Cards
  disabled. `pnpm run verify` passed (`29` unit files / `96` tests; scorecard `17` checks); build
  synced to `plugin-dev`; CLI smokes confirmed all Statistics routes, view-menu disabled/enabled states,
  Files Table scroll/columns, clean `dev:errors`, and no console errors. Remaining SDF-016 work:
  generic table views for Props/Tags/Content and real Files grid once its interaction defects are fixed.
- **LATEST (2026-06-06)**: Stable `1.1.0` Data/Files parity
  [[docs/work/hardening/issues/stable-1-1-data-files-parity/011-bases-parity-table-view-layout|SDF-011]]
  is complete in product worktree `hotfix/1.0.2-css-scorecard`: Files table view now mirrors Core
  Bases' absolute `.bases-td` column positioning with stable offsets/widths, visible column
  separators, header/body alignment, horizontal header sync, and non-Markdown file names retaining
  their extensions. `pnpm run verify` passed (`27` unit files / `87` tests; scorecard `17` checks);
  build synced to `plugin-dev`; reload/open passed; DOM smoke confirmed header/body columns at
  `0/300/411`, scrollWidth `612`, near-bottom rows did not duplicate the first rows, and final
  `dev:errors` plus console error capture were clean. CLI screenshot capture failed with
  `TypeError: Cannot read properties of undefined (reading 'includes')`, so SDF-011 records DOM
  evidence instead.
- **LATEST (2026-06-06)**: Stable `1.1.0` Data/Files parity
  [[docs/work/hardening/issues/stable-1-1-data-files-parity/007-nested-flat-hierarchy-mode-all-explorers|SDF-007]]
  and
  [[docs/work/hardening/issues/stable-1-1-data-files-parity/008-correct-tags-nested-simple-grouping|SDF-008]]
  are complete in product worktree `hotfix/1.0.2-css-scorecard`: Files, Props, and Tags now expose
  `Nested` in minimal/native and popup View controls with `Nested` on by default; a shared pure
  hierarchy helper projects flat `level1/level2/levelN` labels while preserving node ids/meta; Files
  flat mode no longer toggles hidden folder expansion; Props flat mode shows `prop/value` rows with
  original ids; Tags `Nested tags` now returns only roots with children and `Simple tags` returns only
  childless root tags. `pnpm run verify` passed (`25` unit files / `82` tests; scorecard `17`
  checks); build synced to `plugin-dev`; reload/open passed; runtime DOM smokes confirmed Files flat
  rows (`depth=0`, no carets), Props flat `prop/value` labels, Tags nested roots all with carets,
  Tags simple roots with no slash ids/carets, default `Nested` checked after final reload, and final
  `dev:errors` returned `No errors captured`.
- **LATEST (2026-06-06)**: Stable `1.1.0` Data/Files parity
  [[docs/work/hardening/issues/stable-1-1-data-files-parity/003-repair-files-explorer-sort-execution|SDF-003]],
  [[docs/work/hardening/issues/stable-1-1-data-files-parity/004-split-date-sort-created-modified-cache|SDF-004]],
  and
  [[docs/work/hardening/issues/stable-1-1-data-files-parity/005-statistics-shared-cache-scoped-projections|SDF-005]]
  are complete in product worktree `hotfix/1.0.2-css-scorecard`: Files tree now preserves caller
  sort order while keeping folders first; explorer sort state migrates legacy `date` to `mtime`;
  Sort menus expose `Modified time` and `Created time`; per-file statistics cache records persist
  `ctime`; Props/Tags date-derived sorts use one-pass timestamp indexes instead of nested
  `nodes x files` scans; Statistics scopes use a pure projection where `selected` is the focused
  editor file and folder counts project from scoped files. `pnpm run verify` passed (`24` unit files /
  `79` tests; scorecard `17` checks); build synced to `plugin-dev`; reload/open passed; DOM/runtime
  smokes confirmed Files Sort menu labels, Props Modified/Created sort clicks, selected-file
  statistics over the active editor, clean `ctime`/`mtime`, filtered markdown count `11068`, and final
  `dev:errors` returned `No errors captured`. Note: Props `Modified time` first smoke rendered in
  about `909 ms`; keep it on the performance watch list if user-visible jank persists.
- **LATEST (2026-06-06)**: Stable `1.1.0` Data/Files parity
  [[docs/work/hardening/issues/stable-1-1-data-files-parity/006-zero-result-filters-warning-indicator|SDF-006]]
  and
  [[docs/work/hardening/issues/stable-1-1-data-files-parity/009-content-active-tab-header-label|SDF-009]]
  are complete in product worktree `hotfix/1.0.2-css-scorecard`: the active-filters FAB now switches
  from numeric count to a visible warning badge when active filters return zero files, and the minimal
  Data Tabs button shows `Content` as visible text when Content is the active tab. `pnpm run verify`
  passed (`21` unit files / `72` tests; scorecard `17` checks); build synced to `plugin-dev`;
  reload/open passed; runtime smoke confirmed warning badge with rendered `lucide-alert-triangle`,
  zero-result aria label, filter cleanup, Content visible label, `Tabs: Content` aria, and final
  `dev:errors` returned `No errors captured`.
- **LATEST (2026-06-06)**: Stable `1.1.0` Data/Files parity
  [[docs/work/hardening/issues/stable-1-1-data-files-parity/015-queue-duplicate-contradictory-operation-guards|SDF-015]]
  is complete in product worktree `hotfix/1.0.2-css-scorecard`: `OperationQueueService` now gates
  `add`, `addBatch`, and bypass `addOrRun` through a stable conflict policy. Exact duplicates are
  skipped, partial duplicate targets merge into one queued op, property/tag/file contradictions on
  overlapping files are blocked, action presets cannot materialize duplicate/conflicting changes, and
  bypass no longer runs an operation that conflicts with the pending queue. `pnpm run verify` passed
  (`19` unit files / `66` tests; scorecard `17` checks); build synced to `plugin-dev`; reload/open
  passed; runtime smoke confirmed duplicate skip, target merge, contradiction block, bypass
  `processFrontMatter` calls `0`, queue cleanup, and final `dev:errors` returned `No errors captured`.
- **LATEST (2026-06-06)**: Stable `1.1.0` Data/Files parity dock follow-up completed in
  product worktree `hotfix/1.0.2-css-scorecard`: minimal dock FABs no longer emit `title` attributes
  that duplicate Obsidian tooltips, queue/filter FABs receive active state from their open islands,
  and minimal dock styling now gives page buttons the squarer hover/active treatment while FAB
  island states stay round. Added
  [[docs/work/hardening/issues/stable-1-1-data-files-parity/016-explorer-view-parity-and-stat-card-routing|SDF-016]]
  for future table/grid view parity and Statistics-card routing. `pnpm run verify` passed with
  `18` unit files / `59` tests and scorecard `17` checks; build synced to `plugin-dev`; reload passed;
  DOM smoke confirmed dock FABs have no `title`, page buttons compute `4px` radius, FABs compute
  `50%` radius, queue/filters FABs become `is-active` while their islands are open, and final
  `dev:errors` returned `No errors captured`.
- **LATEST (2026-06-06)**: Stable `1.1.0` Data/Files parity
  [[docs/work/hardening/issues/stable-1-1-data-files-parity/014-data-tab-switch-performance-and-offset-regression|SDF-014]]
  is complete in product worktree `hotfix/1.0.2-css-scorecard`: Data tabs now keep visited panes
  mounted, no longer use the keyed in-flow `fade` transition, Props/Tags receive per-tab search state,
  and Files/Props/Tags setter paths no-op when view/sort/cells/search state is unchanged. Runtime
  smoke improved from repeated `20-41 fps` pressure samples and many tree render actions to
  `46/56/57/60/60 fps`, only `2` tree render actions, `maxTopDelta=0`, and one active pane. Native
  workspace-tab reference in the same `plugin-dev` session stayed at `56/60 fps`, `0` long tasks, and
  `maxTopDelta=0`. `pnpm run verify` passed (`17` unit files / `56` tests; scorecard `17` checks);
  build synced to `plugin-dev`; reload and fresh `dev:errors` passed.
- **LATEST (2026-06-06)**: Added three new Stable `1.1.0` Data/Files parity follow-up issues:
  [[docs/work/hardening/issues/stable-1-1-data-files-parity/013-empty-folder-caret-and-extension-icons|SDF-013]]
  for empty-folder caret affordance and extension-aware file icons,
  [[docs/work/hardening/issues/stable-1-1-data-files-parity/014-data-tab-switch-performance-and-offset-regression|SDF-014]]
  for sampler-backed Data tab switching FPS/layout-offset diagnosis, and
  [[docs/work/hardening/issues/stable-1-1-data-files-parity/015-queue-duplicate-contradictory-operation-guards|SDF-015]]
  for sandbox-researched duplicate/contradictory queue operation guards. SDF-014 is now completed;
  SDF-015 still needs sandbox/runtime research before implementation.
- **LATEST (2026-06-06)**: Stable `1.1.0` Data/Files parity issue
  [[docs/work/hardening/issues/stable-1-1-data-files-parity/012-data-files-tab-menu-and-filter-fab-clear|SDF-012]]
  is complete: Files moved from the bottom dock into the Data header Tabs menu as the first option;
  the dock now normalizes to Data + Statistics only; legacy `ops` page-order settings migrate through
  `resolveDockPageOrder()`; double-clicking the active-filters FAB clears all filters; the filters
  header has `8px` padding; and Statistics scope pills now carry scope-color styling aligned with the
  stats grid. `pnpm run verify` passed; build synced to `plugin-dev`; CLI reload and fresh
  `dev:errors` passed; DOM smokes confirmed dock/menu order, Files-in-Data rendering, active-filter
  quick clear, and Statistics pill color variables.
- **LATEST (2026-06-06)**: Stable `1.1.0` Data/Files parity issues
  [[docs/work/hardening/issues/stable-1-1-data-files-parity/001-native-extension-cell-polish|SDF-001]]
  and
  [[docs/work/hardening/issues/stable-1-1-data-files-parity/002-explorer-expand-state-header-action|SDF-002]]
  are complete: `.md` extension cells are suppressed, non-markdown extension/type cells use
  `nav-file-tag`, and explorer headers now react to real expanded-node state after row/caret
  expansion. `pnpm run verify` passed; final build synced to `plugin-dev`; CLI reload and fresh
  `dev:errors` passed; Files/Props DOM smokes passed.
- **LATEST (2026-06-06)**: Follow-up tracker published for Stable `1.1.0`
  Data/Files parity:
  [[docs/work/hardening/issues/stable-1-1-data-files-parity/index|Stable 1.1.0 Data/Files parity local issues]].
  It now contains 16 local issues: SDF-001 through SDF-006, SDF-009, and SDF-012 through SDF-015
  are completed; SDF-007, SDF-008, SDF-010, SDF-011, and SDF-016 remain active follow-up work.
- **LATEST (2026-06-06)**: Stable `1.1.0` Data/Files parity Task 6L completed in
  [[docs/work/hardening/plans/2026-06-05-stable-1-1-0-data-files-parity/index|Data/Files parity plan]]:
  Files extension display is now the same tree type cell used by Props (`TreeNode.typeText` /
  `.vaultman-tree-type`) instead of a badge; Props `property names` search no longer leaks value
  nodes; explorer expand/collapse labels now follow real expanded-node state; Files filters/search no
  longer render unrelated empty folders and sparse filtered top-level folders auto-expand when fewer
  than four level-1 folders are visible; Content search preview lifted the old ten-file visual cap
  while keeping `matchedFiles` complete. Focused tests, `pnpm run verify`, final sync to
  `plugin-dev`, CLI reload, `dev:errors`, and DOM smokes passed.
- **LATEST (2026-06-06)**: Stable `1.1.0` Data/Files parity Task 6K completed in
  [[docs/work/hardening/plans/2026-06-05-stable-1-1-0-data-files-parity/index|Data/Files parity plan]]:
  minimal filters header centering now matches Obsidian's `.nav-buttons-container` behavior
  (`justify-content:center`); explorer search state is split per surface (`props`, `tags`, `files`)
  so Props/Tags terms no longer bleed into Files search or create accidental `file_name` filters;
  Props search now expands ancestors only when descendant values match, preserving parent-only
  collapsed semantics; the native Search adapter no longer opens/focuses the core Search leaf when no
  existing Search view is available; Settings now has a separate Action presets section for staged
  operation templates. `pnpm run verify` passed; final build was synced to `plugin-dev`; CLI reload,
  `dev:errors`, header CSS DOM, Props `journal` DOM, Files bleed DOM, Content focus DOM, and Settings
  DOM smokes passed.
- **LATEST (2026-06-05)**: Stable `1.1.0` Data/Files parity Task 6J completed in
  [[docs/work/hardening/plans/2026-06-05-stable-1-1-0-data-files-parity/index|Data/Files parity plan]]:
  the minimal Data tabbar is now a native Obsidian `Menu` button in the filters header,
  Props uses `lucide-archive`, the ribbon icon remains verified as `lucide-vault`, minimal dock
  active icons now use Obsidian sidebar active contrast instead of accent halo, the minimal filters
  header carries Obsidian's `nav-buttons-container` class while children keep
  `clickable-icon nav-action-button`, and Files tree extension cells show every file extension
  including `.md`, `.base`, and `.png`. Files tree scroll was repaired after finding a stale scoped
  `overflow:hidden` rule overriding the virtual viewport; a higher-specificity Vaultman view
  override restores `overflow-y:auto` only on `.vaultman-files-tab-content.vaultman-tree-virtual-viewport`.
  Prior 6H content
  search/Bases work remains in place. `pnpm run verify` passed; `pnpm run build` synced to
  `plugin-dev`; after restarting a stale Obsidian CLI bridge, `plugin:reload`, `dev:errors`, tabs
  menu DOM, dock contrast DOM, header class/size DOM, Files scroll DOM, and `.base` Files
  search/extension badge smoke all passed. Residual
  from Task 6E still stands: Files table switch recorded one `868 ms` long-task sample.
- **NAVIGATION (read first, in this order)**: [[docs/architecture/zoom-out-map|zoom-out-map]] · [[docs/architecture/dev-glossary|dev-glossary]] · [[docs/architecture/operational-watch-list|operational-watch-list]] · [[docs/architecture/research-inventory|research-inventory]] · [[docs/architecture/pending-decisions|pending-decisions (S-1..S-14)]] · [[docs/architecture/tooling-libraries|tooling-libraries]] · [[docs/architecture/vaultman-identity|vaultman-identity]] · [[docs/architecture/decision-graph|decision-graph]] · [[docs/current/2026-05-28-checkpoint|2026-05-28 checkpoint (wave summary + next-chat prompt)]]. Cluster = full project context in <10 minutes. **Changed since 2026-05-27** → see [[docs/sessions/session-log|session-log]] + [[docs/architecture/agent-memory-routing-best-practices|best-practices recon]].
- **LATEST (2026-05-29)**: feature-request grill checkpoint closed: [[docs/current/2026-05-29-checkpoint|2026-05-29 checkpoint]] · [[docs/work/hardening/items/2026-05-29-dev-pending-question-inventory|dev question inventory]] · [[docs/work/hardening/visuals/2026-05-29-pending-decisions-roadmap-map|Mermaid map]]. S-26 locked; next = S-27 panelData.
- **LATEST (2026-05-27)**: 3-day architecture / style / version-streams grill closed. Hubs:
  [[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/index|Foundation Discovery]]
  (decision-ledger + [[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/decision-changelog|decision-changelog]]
  + [[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/roadmap-dispatch|roadmap-dispatch]]),
  [[docs/architecture/explorer-model/index|explorer-model]] (4 shards; ADRs 0001–0008 Accepted),
  [[docs/work/hardening/research/2026-05-26-style-source-reconciliation/index|style-source-reconciliation]],
  [[docs/work/hardening/research/2026-05-27-version-streams-distillation/index|version-streams]],
  [[docs/work/pkm-ai/items/2026-05-27-agent-memory-routing-upgrade|pkm-ai memory item]].
  Next: hand `publish`; proto-design integration grill (v7 incoming); fold Style/Theme + Kbd/API/NN into
  roadmap; then NOW-tier specs (logic-extraction, PlatformAdapter). Full route + opens: [[docs/current/handoff|handoff]].
  (Earlier V.D + NodeElement-cache specs of 2026-05-25 are folded into these hubs; records still valid.
  Removed status/handoff text preserved: [[docs/archive/pkm-ai/active-docs/2026-05-27T000000-handoff-status-superseded-sections|2026-05-27 superseded sections archive]].)
- **LATEST (2026-05-20)**: [[docs/work/hardening/plans/2026-05-16-explorer-variable-scroll-repair/2026-05-20-stress-vault-matrix|0-A.S stress-vault scroll matrix]]
  — runner-level view switching, delay percentiles/histogram, explicit
  `--vault=<name>`, and active Files-surface targeting are implemented. The
  valid 50k Files matrix passed Tree/List/Table with zero blanks; Grid/Cards
  still need expanded-row coverage, and 100k is blocked by Obsidian
  CLI/runtime readiness.
- [[docs/work/hardening/plans/2026-05-20-explorer-AR-action-routing/index|A.R implementation plan]]
  — Gate-0 and Tasks 1-9 are complete; verification source:
  [[docs/work/hardening/plans/2026-05-20-explorer-AR-action-routing/05-verification|Task 9 verification matrix + live smoke]].
- [[docs/work/hardening/specs/2026-05-19-explorer-merge-umbrella/index|Explorer Merge Umbrella]]
  — proto-v5 ↔ production merge + release pipeline renumerado `v1.2.0→v2.0.0` después del
  catch-up `1.1.0`. A.R spec + plan existen para `v1.2.0`; implementation queda gateada por
  0-A C12/C13 (closed 2026-05-20).
- Completed Explorer Phase 0 sub-system 0-A:
  [[docs/work/hardening/specs/2026-05-18-explorer-sub-system-0-a-native-dom-parity/index|0-A spec]]
  and
  [[docs/work/hardening/plans/2026-05-18-explorer-sub-system-0-a-native-dom-parity/index|0-A implementation plan]];
  closeout evidence in
  [[docs/work/hardening/plans/2026-05-18-explorer-sub-system-0-a-native-dom-parity/baseline-log|0-A baseline log]].
- A.R records imported from `claude/pensive-khorana-ed62bd`:
  [[docs/work/hardening/specs/2026-05-20-explorer-AR-action-routing/index|A.R Action Routing spec]]
  and
  [[docs/work/hardening/plans/2026-05-20-explorer-AR-action-routing/index|A.R implementation plan]].
- Release catch-up complete:
  [[docs/work/hardening/plans/2026-05-20-release-1-1-0-catch-up|Release 1.1.0 catch-up]].
- Completed Explorer Phase 0 sub-system B:
  [[docs/work/hardening/specs/2026-05-15-explorer-0-b-servicetheme-token-layer/index|serviceTheme token-layer spec]]
  and
  [[docs/work/hardening/plans/2026-05-15-explorer-0-b-servicetheme-token-layer/index|executed 0-B implementation plan]].
- Completed Explorer Phase 0 sub-system O:
  [[docs/work/hardening/specs/2026-05-17-explorer-sub-system-o-framevaultman-decomposition/index|frameVaultman decomposition spec]]
  and
  [[docs/work/hardening/plans/2026-05-17-explorer-sub-system-o-framevaultman-decomposition/index|executed O implementation plan]].
- Completed Explorer platform spec:
  [[docs/work/hardening/specs/2026-05-15-explorer-view-platform-pass/index|Explorer View Platform pass spec]].
- Completed Explorer platform plan:
  [[docs/work/hardening/plans/2026-05-15-explorer-view-platform-pass/index|Explorer View Platform pass implementation plan]].
- Verification and live probe record:
  [[docs/work/hardening/plans/2026-05-15-explorer-view-platform-pass/perf-baseline|Explorer View Platform perf baseline]].
- Post-review performance/Menu repair:
  [[docs/work/hardening/plans/2026-05-15-explorer-view-platform-pass/07-performance-comparison-repair|Explorer platform performance comparison repair]].
- OpenSSF hardening route captured from 2026-05-16 external research:
  [[docs/work/hardening/research/2026-05-16-openssf-osps-baseline/index|OpenSSF OSPS baseline research]]
  and
  [[docs/work/hardening/plans/2026-05-16-openssf-osps-baseline/index|OpenSSF OSPS baseline implementation plan]].
- Active Explorer scroll forensics:
  [[docs/work/hardening/specs/2026-05-16-notebook-navigator-scroll-forensics/index|Notebook Navigator scroll forensics]].
- Active multiview virtualization research:
  [[docs/work/hardening/research/2026-05-16-multiview-virtualization-research/index|Multiview virtualization research]].
- Completed Explorer scroll smoke harness plan:
  [[docs/work/hardening/plans/2026-05-16-explorer-scroll-smoke-harness/index|Explorer scroll smoke harness implementation plan]].
- Active Explorer variable scroll repair:
  [[docs/work/hardening/plans/2026-05-16-explorer-variable-scroll-repair/index|Explorer variable scroll repair]].
- Toolbar architecture map captured for Polish:
  [[docs/work/polish/research/2026-05-17-toolbar-architecture/index|Toolbar architecture and primitive ordering map]].
- Codebase architecture cluster phases 01-10 captured:
  [[docs/work/research/2026-05-17-codebase-architecture-cluster/index|Codebase architecture cluster]];
  latest layer:
  [[docs/work/research/2026-05-25-codebase-orphan-files-audit|Orphan Files Audit]].


## Verification Snapshot

- Release 1.1.0 catch-up final gate on 2026-05-20:
  - Clean candidate `pnpm run verify`: exit 0.
  - Clean candidate `pnpm run security:audit`: exit 0 for high+ threshold.
  - Main after PR #22 passed CI, CodeQL, and OpenSSF Scorecard.
  - GitHub Release `1.1.0` published with `main.js`, `manifest.json`, `styles.css`,
    `SHA256SUMS`, and `sbom.cdx.json`.
- Explorer 0-B final gate on 2026-05-17:
  - `pnpm verify` passed: unit 140 files / 882 tests; component 73 files /
    398 tests; lint 11 pre-existing warnings, 0 errors.
  - Required legacy-symbol queries returned zero matches for
    `applyVaultmanTheme`, `vm-glass-blur`, body-scoped `vm-theme`,
    `normalizeLayoutTheme` / `LAYOUT_THEME_OPTIONS` / `LayoutTheme`, and
    `updateGlassBlur`.
  - Targeted theme gates passed: unit 4 files / 61 tests; component 3 files /
    23 tests.
  - `dist/build/styles.css` contains `.vm-theme-native` and
    `.vm-theme-vaultman`; each block has six `--vm-*` properties.
  - Live `plugin-dev` smoke was partial: reload/open succeeded and
    `dev:errors` initially returned `No errors captured`; later DOM/eval
    inspection commands timed out.
- Task 17 focused unit gate passed: 5 files / 17 tests.
- Task 17 focused component gate passed: 5 files / 54 tests.
- Task 18 `pnpm check` passed: 0 errors / 0 warnings.
- Task 18 `pnpm run build` passed and synced build artifacts to `plugin-dev`.
- Task 18 `pnpm verify` passed:
  - Unit: 135 files / 821 tests.
  - Component: 69 files / 372 tests.
  - Lint: 8 warnings in pre-existing unrelated files, 0 errors.
- Task 18 `git diff --check` passed.
- Task 19 live Obsidian CLI target confirmed as `plugin-dev`.
- Task 19 live scenarios ran through `window.__vaultmanPerfProbe`; details are
  in the perf baseline.
- Task 19 `obsidian vault=plugin-dev dev:errors`: `No errors captured.`
- Post-review repair `pnpm verify` passed:
  - Unit: 136 files / 824 tests.
  - Component: 69 files / 372 tests.
  - Lint: 8 pre-existing warnings, 0 errors.
- Notebook Navigator original focused tests passed with Node 24.15.0:
  4 files / 19 tests.
- Notebook Navigator comparison bridge passed with logged medians:
  Notebook Navigator list `61.1534 ms`; Vaultman projection `26.9575 ms`;
  Notebook Navigator lookups `0.7050 ms`; Vaultman lookups `0.1517 ms`.
- Live `plugin-dev` view menu smoke after reload:
  `["Tree","List","Table","Grid","Cards"]`, `hasMarkmap=false`, and
  `obsidian vault=plugin-dev dev:errors` returned `No errors captured.`
- Explorer Sub-system O final gate on 2026-05-18:
  - `frameVaultman.svelte` reduced from 866 LOC pre-O to 335 LOC.
  - Targeted O component matrix passed: 10 files / 60 tests.
  - `pnpm check` passed: 0 errors / 0 warnings.
  - `pnpm verify` was invoked once as required. It passed lint, check, build,
    unit tests (140 files / 882 tests), then failed in component full-suite
    load on three pre-existing timing-sensitive files. User explicitly
    accepted the exception after targeted reruns passed:
    `viewTableStress.test.ts`, `pageFiltersRenameHandoff.test.ts`, and
    `vmDialogPortal.test.ts`.
  - Final live `plugin-dev` smoke returned `No errors captured.`
- Explorer Sub-system 0-A C12/C13 closeout on 2026-05-20:
  - `pnpm verify` passed: lint 0 warnings / 0 errors; `svelte-check` 0 warnings / 0 errors;
    unit 145 files / 932 tests; component 104 files / 508 tests.
  - Strict flicker live smokes passed for Tree/List/Table/Grid/Cards with
    `blankFrames=0`, `maxBlank=0ms`, `flickerFrames=0`, and `maxFlickerRows=0`.
  - Non-strict live scroll baseline passed for Tree/List/Table/Grid/Cards with
    `blankFrames=0`, `blank>100ms=0`, `blank>250ms=0`, and `maxBlank=0ms`.
  - Live preset/menu gate: native `menuCount=1`, vaultman `menuCount=5`,
    node-elements submenu visible only under vaultman, and final
    `obsidian vault=plugin-dev dev:errors` returned `No errors captured.`
- A.R Tasks 1-5 on 2026-05-20:
  - Latest source record:
    [[docs/work/hardening/plans/2026-05-20-explorer-AR-action-routing/02-seam-normalization|Task 5 seam normalization]].
  - Commits through `refactor(A.R): normalize explorer row seams`.
  - Focused gate passed: 9 files / 112 tests.
  - `pnpm run check` and `pnpm run lint` passed with 0 errors / 0 warnings.
- A.R Task 6a on 2026-05-20:
  - Source record:
    [[docs/work/hardening/plans/2026-05-20-explorer-AR-action-routing/03-view-adoption-task-6a-tree|Task 6a viewTree adoption]].
  - Focused gate passed: 3 files / 24 tests.
  - `pnpm run check` and `pnpm run lint` passed with 0 errors / 0 warnings.
- A.R Task 6b on 2026-05-20:
  - Source record:
    [[docs/work/hardening/plans/2026-05-20-explorer-AR-action-routing/03-view-adoption-task-6b-table|Task 6b ViewNodeTable adoption]].
  - Focused table gate passed: 8 files / 25 tests.
  - Panel/delegation gate passed: 2 files / 50 tests.
  - `pnpm run check` and `pnpm run lint` passed with 0 errors / 0 warnings.
- A.R Task 6c on 2026-05-20:
  - Source record:
    [[docs/work/hardening/plans/2026-05-20-explorer-AR-action-routing/03-view-adoption-task-6c-grid|Task 6c ViewNodeGrid adoption]].
  - Focused grid/delegation gate passed: 4 files / 33 tests.
  - Expanded grid/panel gate passed: 9 files / 84 tests.
  - `pnpm run check` and `pnpm run lint` passed with 0 errors / 0 warnings.
- A.R Task 6d on 2026-05-20:
  - Source record:
    [[docs/work/hardening/plans/2026-05-20-explorer-AR-action-routing/03-view-adoption-task-6d-cards|Task 6d ViewNodeCards adoption]].
  - Action-adoption gate passed: 1 file / 4 tests.
  - Expanded cards/panel gate passed: 9 files / 70 tests.
  - `pnpm run check` and `pnpm run lint` passed with 0 errors / 0 warnings.
- A.R Task 7 on 2026-05-20:
  - Source record:
    [[docs/work/hardening/plans/2026-05-20-explorer-AR-action-routing/04-expand-and-cmenu|Task 7 expand/collapse-all data-gated]].
  - Focused expand-all gate passed: 1 file / 2 tests.
  - Panel/grid regression gate passed: 3 files / 67 tests.
  - `pnpm run check` and `pnpm run lint` passed with 0 errors / 0 warnings.
- A.R Task 8 on 2026-05-20:
  - Source record:
    [[docs/work/hardening/plans/2026-05-20-explorer-AR-action-routing/04-expand-and-cmenu|Task 8 cmenu trigger + standard set]].
  - Trigger/standard-set gate passed: 2 files / 11 tests.
  - Expanded provider cmenu gate passed: 7 files / 79 tests.
  - `pnpm run check` and `pnpm run lint` passed with 0 errors / 0 warnings.
- A.R Task 9 on 2026-05-20:
  - Source record:
    [[docs/work/hardening/plans/2026-05-20-explorer-AR-action-routing/05-verification|Task 9 verification matrix + live smoke]].
  - Added keyboard-nav parity and structural-attribute anti-drift tests across
    Tree/List/Table/Grid/Cards.
  - `pnpm run verify` passed: lint 0 warnings / 0 errors; `svelte-check`
    0 warnings / 0 errors; unit 148 files / 953 tests; component 114 files /
    543 tests.
  - Live `plugin-dev` explicit-switch scroll smokes passed for
    Tree/List/Table/Grid/Cards with `blankFrames=0`, `blank>100ms=0`,
    `blank>250ms=0`, and final `dev:errors` returned `No errors captured.`
- 0-A.S scroll harness follow-up on 2026-05-20:
  - Source record:
    [[docs/work/hardening/plans/2026-05-16-explorer-variable-scroll-repair/index|Explorer variable scroll repair]].
  - Runner-level view switching, event-loop delay percentiles/histogram, and
    `--vault=<name>` selection are implemented.
  - Fresh local gate passed: targeted Vitest 3 files / 32 tests; `pnpm run check`;
    `pnpm run lint`; `pnpm run build`; `git diff --check` with LF-to-CRLF
    warnings only.
- Stress-vault matrix follow-up on 2026-05-20:
  - Source record:
    [[docs/work/hardening/plans/2026-05-16-explorer-variable-scroll-repair/2026-05-20-stress-vault-matrix|0-A.S stress-vault scroll matrix]].
  - Harness correction passed fresh targeted gate: 3 files / 33 tests;
    `pnpm run check`; `pnpm run lint`; `pnpm run build`; `git diff --check`
    with LF-to-CRLF warnings only.
  - 50k Tree/List/Table Files matrix passed with zero blank frames and no
    Obsidian dev errors.
  - 50k Grid/Cards measurements were collapsed-topology only; Grid `Expand all`
    at 50k did not return within about 90 seconds.
  - 100k corpus exists locally, but basic `stress-vault` eval timed out after
    5 minutes; Obsidian was recovered and `plugin-dev` eval returned `=> 2`.

## Known Residuals

- User-reported Explorer blanking regression has a current code repair:
  variable-height fallbacks are bounded by scroll position, and live
  `plugin-dev` smoke passed with zero blank frames in Tree/List/Table/Grid/Cards.
  Treat event-loop delay spikes as the remaining performance issue.
- 2026-05-16 research found no safe wholesale virtualizer replacement. Keep
  TanStack as the default, add a shared layout/index service, and prototype
  `virtua` only behind the same live blank-frame harness.
- Scroll smoke harness is implemented in `src/dev/perfProbe.ts` and
  `scripts/run-explorer-scroll-smoke.mjs`. Live runs default to `plugin-dev`
  and now accept `--vault=<name>` so registered stress vaults can be targeted
  explicitly without script edits.
- Live multiview smoke after variable scroll repair passed with
  `blankFrames=0`, `blank>100ms=0`, `blank>250ms=0`, `maxBlank=0ms`, and no
  Obsidian dev errors for Tree/List/Table/Grid/Cards. Max event-loop delay
  remained uneven: Tree 108 ms, List 258 ms, Table 1312 ms, Grid 600 ms,
  Cards 24 ms.
- Follow-up scroll-idle jank pass in Table/Grid defers variable row measurement
  and virtualizer resizing until 96 ms after active scroll. Fresh zero-delay
  live smokes passed with no blanks and no dev errors: Table maxDelay 29 ms,
  Grid 58 ms, List 37 ms.
- Large-vault stress pass changes the next scroll focus: the valid 50k
  Tree/List/Table Files matrix had zero blanks but showed sustained event-loop
  pressure in Tree/List; Grid/Cards are not yet valid large-row measurements
  because the hierarchy stayed collapsed.
- Map/ViewNodeMap remains deferred and is not exposed as a selectable
  next-release view after the post-review repair.
- The 0-A C12/C13 closeout handoff commit is scoped to scroll-smoke harness,
  perf probe, tests, restored fixture, and linked hardening/current docs.

## Next Action

- **PRIMARY (post A.R Task 9 2026-05-20)**: continue the 0-A.S scroll harness
  follow-up from the stress-vault source record by adding fine-grained marks
  around Tree visible-row work, List row projection, and Grid expansion/render
  readiness.
- Explorer 0-B, O, 0-A, and A.R are complete.
- For Explorer scroll work, continue from the variable scroll repair record:
  view switching, percentile/histogram reporting, `--vault` selection, and
  active Files-surface targeting are done. Split 100k into launch/index
  readiness before retrying scroll bursts.
- If resuming OpenSSF hardening, begin with
  [[docs/work/hardening/plans/2026-05-16-openssf-osps-baseline/01-scope-docs-workflow-permissions|Scope, public docs, and workflow permissions]].
- If continuing the architecture cluster, next run coverage reconciliation:
  compare tracked source/config/test/doc paths against phases 01-09, mark
  generated-artifact exclusions, and produce a final coverage matrix.
