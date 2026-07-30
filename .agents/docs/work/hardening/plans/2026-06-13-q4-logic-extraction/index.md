---
title: Plan — Q4 logic-extraction (Wave 1 lane A, spine)
type: plan
status: in-progress
parent: "[[docs/work/hardening/specs/2026-06-12-wave-1-specs/01-q4-logic-extraction|Spec — Q4 logic-extraction]]"
created: 2026-06-13T00:00:00
updated: 2026-06-13T00:00:00
created_by: claude-opus-4-8
updated_by: claude-fable-5
worktree: umbrella-v2/wave-1-q4
base: sandbox HEAD de4e29b
tags:
  - agent/plan
  - initiative/hardening
  - umbrella-v2/wave-1
  - lane/q4
---

# Plan — Q4 logic-extraction

Lane A, serial, head of the spine. Gates N.R -> V.D -> P.D. Extract pure logic out of the god-providers into testable `logic*` modules; leave thin providers that only orchestrate. Order by alpha value: `logicFiles` -> `logicProps` -> `logicTags` -> `logicBadge` -> `logicFnR`.

> Coordinator note (claude-fable-5, 2026-06-13): plan recuperado verbatim del reporte
> del subagente (lane A). Slice 1 verificado y commiteado local `69f33d9` en
> `umbrella-v2/wave-1-q4`; NO aterrizado a sandbox aún (decisión de aterrizaje del dev
> pendiente). El subagente NO escribió en `.agents/` por la constraint de seguridad;
> este archivo lo aterriza el coordinador.

## Ground truth discovered (worktree `C:/tmp/vaultman-uv2-q4`)

- `src/logic/` already holds `logicsFiles.ts` (class `FilesLogic`), `logicProps.ts` (`PropsLogic`), `logicTags.ts` (`TagsLogic`), `logicExplorerSnapshot.ts`, `logicExplorer.ts`, `logicKeyboard.ts`. The first three are NOT pure: each `import { ... type App } from 'obsidian'` and reads `app.metadataCache` inside the builder. This is the core debt the spec targets ("cero `app`/DOM/Svelte imports").
- Tests live under `test/unit/**/*.test.ts` (NOT colocated in `src/`). The vitest `unit` project runs in `node` with `obsidian` aliased to `test/helpers/obsidian-mocks.ts`.
  Existing coverage: `test/unit/logic/logicsFiles.test.ts` (5), `test/unit/components/explorerFiles.test.ts` (26). Baseline: both green (31 tests).
- `node_modules` was missing; `pnpm install` ran once and succeeded (exit 0). Full runtime verify is available (`vitest`, `svelte-check` present).
- Snapshot machinery exists: `buildExplorerSnapshot` (pure, in `logicExplorerSnapshot`), `ExplorerSnapshot`/`ExplorerDataPlaneRevisions` in `typeExplorerDataPlane.ts` (the EDP-004 reserved-revision comment is present: queue/filter/decoration revisions must NOT be added here). `ExplorerSnapshotKind = file|folder|tag|prop|value|unknown`.
- THE DUAL-SNAPSHOT GATE: `src/components/containers/panelExplorer.svelte` line ~471 `publishProviderSnapshot()` is hard-gated `if (provider.id !== 'files' || !service || !provider.getSnapshot) return;`. Only files publishes to the data plane; props/tags/ content fall back to the recursive tree path. Closing this dual path (props/tags/ content publish snapshots) is spec scope item 4.
- Namespaced ids today: files emit `id = file.path`, folders `id = folder:${path}`;
  props `id = propName` and `propName::rawValue`; tags `id = tagPath`. None namespaced.
  D6 wants `file.`/`note.`/`formula.` etc. This is the single allowed 2.0.0 breaking event.

## Parity invariants (MANDATORY, ledger cluster 01 ADOPT-stable + SDF issues)

- **SDF-003 (sort execution).** Provider sorts the flat file list; the tree builder must PRESERVE the caller-provided order inside each sibling group. Folders-first is a stable partition only — it must not re-sort leaf siblings by label/path.
- **SDF-007 / SDF-008 (tags nested vs simple).** Nested = level-1 roots WITH children;
  Simple = level-1 roots WITHOUT children. The sandbox "simple = all leaves at any depth" shape is the old/wrong one (ledger CONTRADICE -> ADOPT-stable). Slice 3 fixes this.
- **C-2 (full-vault Files).** Files source is full vault incl. non-md (`.base`/`.canvas`/ images), not md-only. Keep `vault.getFiles()` / `filesIndex.nodes`.
- **C-3 (tags Nested/Simple semantics)** as above; **honest frontmatter key casing** (props): case-sensitive prop keys, no lowercase merge.
- **Hidden-file filtering** (dotpath) stays (ADOPT-sandbox).
- **Namespaced ids** on every emitted node (D6); snapshot tests verify the format.
- **No `obsidian`/Svelte/DOM import in any `logic*` graph** (AC#1) — enforced by an import-boundary unit test per module until the eslint boundary rule is wired.

## Strategy

Test-first per slice (RED -> GREEN -> refactor). Each slice is a vertical ending in a verified local commit. Thin provider target: providers keep orchestration (actions, services/indexes, modals, queueing, subscriptions, revision-keyed caching) but delegate ALL projection/sort/group/hierarchy/label/icon computation to the pure module. The pure module receives plain descriptors and returns `TreeNode<TMeta>[]`, never touching `app`.

## Namespacing scheme (D6)

| Domain | Node kind | Old id | New namespaced id |
|---|---|---|---|
| files | file | `file.path` | `file.${file.path}` |
| files | folder | `folder:${path}` | `folder.${path}` |
| files | adopted (header/task/block) | provider-assigned | unchanged this wave (outline owns it) |
| props | prop | `propName` | `note.${propName}` |
| props | value | `propName::rawValue` | `note.${propName}::${rawValue}` |
| tags | tag | `tagPath` | `tag.${tagPath}` |
| fnr/formula | rule | n/a | `formula.${id}` (slice 5, only if FnR emits nodes) |

`note.` for props (note-level metadata, matches D6 example `note.X`); `file.`/`folder.`
for files; `tag.` for tags; `formula.` for FnR. The snapshot `domainKey`/`pathFor` stay the RAW path/value (reveal-by-path + filter toggles keep working); only the node `id` carries the namespace.

## Relation kinds (Node contract, spec item 3 — TYPE + emission only)

`NodeRelationKind = 'holarchy' | 'adopted' | 'related'` in `src/types/typeTreeNode.ts`.
- `holarchy` = parent/child containment (default for structural trees).
- `adopted` = external-provider placement (outline headers/tasks under a file).
- `related` = heterarchy (links/backlinks): DEFER (N4), type only, no emission.
Consumption is N.R/V.D, out of Q4 scope.

## Slices

### Slice 1 — `logicFiles` (DONE — commit 69f33d9)
Pure files tree/sort/hierarchy/label/icon; thin provider; namespaced ids; SDF-003 order preserved; full-vault + hidden + extension kept; relation-kind type + holarchy/adopted emission. See closeout below.

### Slice 2 — `logicProps`
Pure prop/value tree; drop `App` from `PropsLogic`; namespaced ids (`note.<prop>`, `note.<prop>::<value>`); honest casing; dual-snapshot for props (provider gains `getStructuralTree`/`getSnapshot`/`getStructuralRevisions`, `propsRevision`). RED: rewrite `logicProps.test.ts` for pure `buildPropTree(indexNodes, propTypeByName)` + boundary + snapshot. Biggest provider (~25 KB) -> largest absolute drop expected.

### Slice 3 — `logicTags`
Pure hierarchical tag tree; drop `App`; namespaced ids (`tag.<path>`); FIX nested/simple to stable (SDF-008: Nested = roots WITH children, Simple = roots WITHOUT); all/leaf search pure; dual-snapshot (`tagsRevision`). Put "roots with/without children" projection in `logicExplorerHierarchy` (reusable). Provider keeps queue-routed rename/set/delete via `serviceTagQueue` (sandbox queue-safety WINS).

### Slice 4 — `logicBadge`
Pure badge derivation: node queue/filter/decoration state (plain data) -> `NodeBadge[]` (kind/color/queueIndex/inherited). Inherited folder-badge bubbling (SDF-016/§06.17) is the parity target. Services keep impure plumbing.

### Slice 5 — `logicFnR`
Pure FnR projection/labels (preview/label/scope-summary) keeping preview-before-apply invariant. Namespace `formula.<id>` if FnR emits nodes.

### Slice 6 — Close the dual-snapshot path + grep-gate
Remove the `provider.id !== 'files'` gate in `panelExplorer.svelte` so any provider with `getSnapshot` publishes; recursive fallback ONLY for non-snapshot add-on providers (snippets/plugins/operations). Confirm EDP-004 reserved-revision boundary. Wave-closing gate: `pnpm run verify` + `plugin-dev` smoke. Content engine stays DEFERred (ledger CONTRADICE — two real engines; D-C-1 resolves search separately).

## Cross-slice verify (final)
`pnpm run verify` (lint + check + build + test:unit + test:component). Every `logic*` has a passing boundary test. Record per-provider LOC deltas. Namespaced-id snapshot tests pass for all four domains.

## Risks / watch-list
- Namespaced ids break testers' saved marks/presets (D6, accepted, alpha line).
- God-providers with hidden shared state: extract per-slice with RED/GREEN, commit per verified slice; never batch.
- Serial lane: no other lane touches providers/data-plane while Q4 lives.
- `logicProps`/`logicTags`/`logicsFiles` import `obsidian` for the `App` type only — the pure rewrite must drop even the type import (use `typeTreeNode.ts` seam).

## Status log / Slice 1 closeout
- 2026-06-13: Plan written. `pnpm install` OK. Baseline files tests green (31).
- Slice 1 (`logicFiles`) DONE, commit 69f33d9. Pure module + thin provider + namespaced ids
  + SDF-003 fix + relation kinds. Verify: unit 965 pass (1 pre-existing unrelated failure:
  `explorerNotebookNavigatorComparison` imports an absent external repo), svelte-check 0/0 (1165 files), files component tests 76 pass.
- Provider LOC: 613 -> 627 (+14). Pure logic (252 lines, fully tested) left the provider's `app` reach; the only added provider code is the `toDescriptors` impurity boundary.
  AC#2 (no inline projection/sort/hierarchy) verified by grep.
- Open: `src/logic/logicsFiles.ts` left as a deprecated re-export shim of `logicFiles` (knip + ADR-009 + docs reference the old name; rename needs those refs updated — out of lane A's safe scope, flagged for the coordinator).
- 2026-06-14: Slice 2 (`logicProps`) DONE, commit `5e6751f`, landed to sandbox (`5e6751f`).
  Pure `buildPropTree`/`sortPropValuesByFrequency`/`isCompatible`/`filterPropTree` (`App` + `prepareSimpleSearch` dropped; `getAllPropertyInfos` moved to a provider boundary). D6 namespaced ids `note.<prop>` / `note.<prop>::<value>`; honest casing (no lowercase merge, C-3); raw value preserved in meta + snapshot domainKey. Provider 803→836 (+33; base already delegated to a separate IMPURE `PropsLogic` class, so this was a purification, not an inline-logic extraction). Boundary + snapshot tests added. Verify: check 0/0 (1171 files), unit 1040 pass (same 1 pre-existing notebook-navigator failure). Open: unused 2-line shim `src/components/containers/explorerProps.ts` (container layer; rename/remove out of lane A scope — coordinator).
- 2026-06-14: Slice 3 (`logicTags`) DONE, commit `417d809`, landed to sandbox. Pure `buildTagTree`/`filterTagTree` (`App`+`prepareSimpleSearch` dropped; `getTags()` moved to provider boundary). D6 ids `tag.<path>`; raw path in `meta.tagPath` + snapshot domainKey `#<path>`; holarchy relation. New pure `logicExplorerHierarchy.projectNestedSimple` FIXES SDF-008 (Nested=roots-with-children, Simple=childless-roots-only; old `_collectLeaves` all-leaves shape removed); `searchMode==='leaf'` routes to it. Provider 448→472 (+24;
  purification — base already delegated to an impure class + had the dual-snapshot trio).
  Boundary + `projectNestedSimple` + namespaced-snapshot tests. Verify: check 0/0 (1172 files), unit 1056 pass (same 1 pre-existing notebook-navigator failure). Wart (pre-existing, not lane A): `explorerTags.ts` carries inherited mojibake bytes in a comment (git shows "Bin" in --stat; content correct, type-checks clean) — coordinator follow-up.
- 2026-06-14: Slice 4 (`logicBadge`) DONE, commit `a86aed0`, landed to sandbox. New pure `src/logic/logicBadge.ts`: `deriveNodeBadges` (plain state → `NodeBadge[]`), `nodeBadgesFromLayers` (re-homed `utilViewLayers` projection), `bubbleNodeBadges` (inherited folder-badge bubbling, SDF-016/§06.17), `colorFromTone`. Imports only `typeTreeNode` (AC#1). `serviceExplorerLayers` re-pointed to the pure projection; `serviceOverlayProjection` filter tones via shared `BadgeTone`.
  Providers' `handleHoverBadge` unchanged. Verify: check 0/0 (1173), unit 1075 pass + badge component 13 pass (same 1 pre-existing notebook-navigator failure). Follow-up (out of lane A):
  collapse `utils/utilViewLayers` + `utils/utilBadgeBubbling` into thin re-export shims of `logicBadge` and re-point `serviceExplorerRowInput` + `providers/explorerProps`.
- 2026-06-14: Slice 5 (`logicFnR`) DONE, commit `7c022e0`, landed to sandbox. New pure `src/logic/logicFnR.ts`: `fnrRenamePreview` / `fnrScopeSummary` / `fnrContentReplaceLabel` / `fnrContentReplaceScopeCount` / `formulaNodeId` — structured app-free i18n descriptors (key+params); imports nothing from `obsidian`/`typeFnR`.
  Preview-before-apply (§014) preserved: projections never mutate; `translate()` + queue mutation stay at the boundary. Re-pointed `Toolbar.svelte#renameContext`, `tabContent.svelte#scopeLabel`, `serviceFnR.buildContentReplaceChange` (the FnR preview logic lived inline across those 2 components + the service, not only in serviceFnR — so the extraction legitimately touched them). Verify: check 0/0 (1174 files), unit 1089 pass (same 1 pre-existing notebook-navigator failure). Subagent was cut by the account limit before commit/verify; coordinator inspected the diffs (clean re-points), committed, and verified.
- 2026-06-15: Slice 6 (close dual-snapshot path) DONE, commit `d81be5e`, landed to sandbox.
  Removed the `provider.id !== 'files'` gate in `panelExplorer.svelte#publishProviderSnapshot()`
  + the `filesSnapshot` reader + the snapshot subscribe; publish/read now key on `provider.id` (publish gated on `getSnapshot` presence, read on snapshot existence). Added the dual-snapshot trio to `explorerContent` (bare `getStructuralTree` + `contentRevision`-only `getStructuralRevisions` + `getSnapshot`; `getTree()` untouched). Recursive fallback now scoped to add-on providers without `getSnapshot`. EDP-004 boundary held. Tests: +5 component + new `explorerContentSnapshot.test.ts`. Verify: check 0/0 (1174), unit 1092 pass (same 1 pre-existing notebook-navigator failure), panelExplorer component 74 pass (isolated). Wave-closing smoke:
  build synced to `plugin-dev`, `plugin:reload` + `dev:errors` → "No errors captured".

## Q4 COMPLETE (2026-06-15)

All 6 slices landed to sandbox (`d81be5e`, `2.0.0-alpha.1`): logicFiles · logicProps · logicTags(+SDF-008) · logicBadge · logicFnR · dual-snapshot close. Pure `logic*` modules with boundary tests; thin providers; D6 namespaced ids; SDF-008 nested/simple fixed; props/tags/ content publish to the data plane (recursive fallback only for add-on providers). **Spine N0 gate for N.R is open.** Coordinator follow-ups (out of per-slice scope): collapse the shims (`logicsFiles`, `components/containers/explorerProps`, `utilViewLayers`+`utilBadgeBubbling`) + re-point their other importers; fix the inherited mojibake in `explorerTags.ts`.
