---
title: UI Modernization Vertical Threads Implementation Plan
type: implementation-plan
status: active
parent: "[[docs/work/polish/index|polish]]"
created: 2026-05-11T23:55:00
updated: 2026-05-11T09:28:16
tags:
  - agent/plan
  - initiative/polish
  - elastic-ui
  - vertical-threads
  - vfs-immutability
  - chameleon
  - svelte5
  - unocss
  - bits-ui
  - dnd-kit
  - pretextjs
created_by: opus
updated_by: codex
glossary_candidates:
  - Vertical thread plan
  - Foul Detection
  - Adopted Node
  - Diff Navbar
  - Immutable VFS Snapshot
  - Notes for Nodes
---

# UI Modernization Vertical Threads Implementation Plan

## 2026-05-11 Execution Status

- Continued in Claude worktree
  `C:\Users\vic_A\Desktop\vaultman\.claude\worktrees\sleepy-engelbart-9e6dc6`
  on branch `claude/sleepy-engelbart-9e6dc6`.
- Baseline gates before new edits:
  `pnpm run check` passed with 0 errors / 0 warnings; focused vertical-thread
  unit gate passed 17 files / 86 tests; `pnpm run build:plugin` passed.
- Latest completed slice:
  [[docs/work/polish/plans/2026-05-11-ui-modernization-vertical-threads/03-thread-vfs-review#task-38--cutover-gate-remove-the-mutable-path|T3.8 immutable VFS cutover]].
  `StagedOp.apply` now returns replacement VFS state, queue replay no longer
  mutates staged VFS objects, and `lint:full` reports zero
  `vaultman-local/no-mutable-vfs` violations.
- Previous completed slices:
  [[docs/work/polish/plans/2026-05-11-ui-modernization-vertical-threads/02-thread-engine-views#task-20--gate-confirm-t1-contracts-available|T2.0 contract gate]],
  [[docs/work/polish/plans/2026-05-11-ui-modernization-vertical-threads/02-thread-engine-views#task-21--pretextjs-heightmap-in-servicetextmeasure|T2.1 PretextJS heightmap]],
  and
  [[docs/work/polish/plans/2026-05-11-ui-modernization-vertical-threads/02-thread-engine-views#task-22--viewnodetable-migration-to-pretextjs-heights--mode-aware-dom|T2.2 ViewNodeTable measured heights]].
  `serviceTextMeasure` now owns cached row-height measurement, and
  `ViewNodeTable` feeds those heights into the active TanStack virtualizer.
- Previous completed slices:
  [[docs/work/polish/plans/2026-05-11-ui-modernization-vertical-threads/02-thread-engine-views#task-27--taboutlines-workspace-tab|T2.7 tabOutlines workspace tab]]
  and
  [[docs/work/polish/plans/2026-05-11-ui-modernization-vertical-threads/02-thread-engine-views#task-25--cross-pollination-explorerfiles-can-adopt-outline-headers|T2.5 explorerFiles adopted-node cache integration]].
  `tabOutlines` is registered through the real `typeTab`/`tabRegistry` route
  and mounts active-file outlines; `explorerFiles` now attaches cached adopted
  children without making `getTree()` async.
- Previous completed slice:
  [[docs/work/polish/plans/2026-05-11-ui-modernization-vertical-threads/02-thread-engine-views#task-26--folder-context-menu--is-in-folder-filter-badge|T2.6 folder context menu and is-in-folder filter badge]].
- Previous completed slice:
  [[docs/work/polish/plans/2026-05-11-ui-modernization-vertical-threads/01-thread-styling-identity#task-18--faint-mode-auto-bind-on-the-active-window|T1.8 Faint Mode active-window binding]]
  plus
  [[docs/work/polish/plans/2026-05-11-ui-modernization-vertical-threads/02-thread-engine-views#task-24--exploreroutline-provider-adopted-nodes|T2.4 explorerOutline adopted-node provider]].
- Previous partial slice now closed:
  [[docs/work/polish/plans/2026-05-11-ui-modernization-vertical-threads/02-thread-engine-views#task-25--cross-pollination-explorerfiles-can-adopt-outline-headers|T2.5 adoption service foundation and explorerFiles integration]].
- Previous completed slice:
  [[docs/work/polish/plans/2026-05-11-ui-modernization-vertical-threads/01-thread-styling-identity#task-17--snippet-mimicry-smoke-close-the-test-loop-from-12|T1.7 snippet mimicry smoke]]
  and panel-level mirror class integration.
- Earlier completed slice:
  [[docs/work/polish/plans/2026-05-11-ui-modernization-vertical-threads/02-thread-engine-views#task-23--mirror-class-arbitration-across-grid-cards-tree|T2.3 mirror class arbitration across grid, cards, tree]].
- Latest verification:
  T4 continuation added missing component gates and the immutable
  `buildMoveBlockOps()` helper. Focused T4 unit passed 8 files / 52 tests;
  focused T4 component passed 5 files / 9 tests; full unit passed 117 files /
  723 tests; full component passed 61 files / 290 tests; `pnpm run
  lint:full`, `pnpm run check`, `pnpm run build:plugin`, and `git diff
  --check` passed.
- Previous verification:
  T3.8 RED/GREEN completed: pure `serviceDiff` and immutable `serviceQueue`
  snapshot tests failed 3/38 red, then passed. Full unit passed 116 files /
  722 tests; full component passed 56 files / 281 tests; `pnpm run check`,
  `pnpm run build:plugin`, and `git diff --check` passed. Follow-up lint
  stabilization cleared the unrelated T4/config residuals: `lint:full` now
  passes, `uno.config.ts` is included in the ESLint project service, and
  UnoCSS uses non-deprecated `presetWind3` with preflight disabled.
- Previous verification:
  T2.1/T2.2 RED/GREEN completed: `serviceTextMeasurePretext` failed 4/4 on
  missing `measureRowHeight()`, `viewNodeTableHeightmap` failed 1/2 on fixed
  32px offsets, then focused unit gate passed 3 files / 13 tests and focused
  component gate passed 5 files / 20 tests. Svelte autofixer returned
  `issues: []` for `ViewNodeTable.svelte`; `pnpm run check`,
  `pnpm run build:plugin`, and `git diff --check` passed.
- Previous verification:
  T2.7 tab registration RED/GREEN completed: `tabOutlinesRegistration` failed
  3/3 on missing tab registration/host rendering, then focused component gate
  passed 5 files / 13 tests. T2.5 cache-backed adoption passed focused unit
  gate 4 files / 31 tests after a red guard caught disabled adoption still
  reading content.
- Previous verification:
  T2.6 RED/GREEN completed: `explorerFiles` failed 1/15 on missing folder
  panel context menu, `serviceFilter` failed 1/21 on missing
  `addIsInFolderFilter`, then the focused regression gate passed 4 files /
  48 tests.
- Verification after T1.8/T2.4:
  `test/component/frameFaintMultiWindow.test.ts` failed 1/1 red on
  frame-local focus being ignored, then passed 1/1 after `frameVaultman`
  accepted an optional `activeWindow` prop for focus/blur binding. The
  adopted-node focused unit gate passed 3 files / 14 tests and the combined
  component smoke passed 3 files / 7 tests.
- Verification after T1.7:
  `test/component/snippetMimicry.test.ts` failed 3/3 red on missing
  panel-level mirror class routing, then passed 3/3 after `PanelExplorer`
  routed `plugin.themeService` to the views and `ViewNodeTable` emitted
  metadata mirror classes. Focused regression gate passed 5 files / 50 tests.
- Verification after T2.3:
  `test/component/viewNodeMirrorClasses.test.ts` passed 3/3 after failing red
  on missing mirror classes; focused affected component gate passed 7 files /
  61 tests; Svelte autofixer returned `issues: []` for the three changed
  components.
- T1.7, T1.8, and T2.0 through T2.7 are now closed for the scoped
  vertical-thread requirements implemented in this worktree.

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` (recommended) or
> `superpowers:executing-plans` to implement this plan thread-by-thread.
> Steps use checkbox (`- [ ]`) syntax for tracking. Do not commit unless the
> user explicitly asks.

**Goal:** Transform Vaultman into an Elastic, Chameleon, IDE-grade plugin by
landing four parallelizable vertical threads that together replace the
handmade UI stack with UnoCSS + DaisyUI + Bits UI, virtualize all node
surfaces with PretextJS-measured rows, migrate the VFS to structural
immutability with a Cursor-like Diff Navbar review UX, and ship deep
DOM mimicry + a 3-column dashboard.

**Architecture:** This plan re-slices the existing horizontal shard plan
(`2026-05-11-elastic-ui-chameleon`, ALPHA/BETA/GAMMA/DELTA) into four
**vertical threads** organized by domain rather than layer. Each thread owns
a complete feature slice end-to-end (types → services → views → styles →
tests) so that a single subagent or developer can drive it to "done" with
minimal cross-thread coordination. The existing horizontal plan stays as
the authoritative breakdown for low-level migration steps; this plan is the
**execution surface** that picks up scope and delivers product-visible
behavior per thread.

**Tech Stack:** Svelte 5 runes (`$state`, `$derived`, `$effect`, `$props`)
and snippets (`{@render}`), UnoCSS (Uno + Icons + Attributify, no preflight),
DaisyUI semantic classes via Uno shortcuts where compatible, Bits UI v1 for
headless overlays and portals, PretextJS (`@chenglou/pretext@^0.0.6`) via
`serviceTextMeasure`, TanStack Table Core + Svelte Virtual for the node
surfaces, `@dnd-kit/svelte@^0.4.0` (current canonical adapter — DnD
dependency gate from the chameleon plan stands), `@git-diff-view/svelte`
for the Cursor-like Diff Navbar, Obsidian 1.x metadata APIs.

---

## Source Intake

Specs synthesized (12 inputs, plus historical context):

- [[docs/superpowers/specs/2026-05-10-shadcn-tailwind-transition/index|Spec Index]]
- [[docs/superpowers/specs/2026-05-10-shadcn-tailwind-transition/00-risk-assessment|00 Risk Assessment]]
- [[docs/superpowers/specs/2026-05-10-shadcn-tailwind-transition/01-shard-alpha-core-bridge|01 ALPHA Core Bridge]]
- [[docs/superpowers/specs/2026-05-10-shadcn-tailwind-transition/02-shard-beta-data-virtualization|02 BETA Virtualization]]
- [[docs/superpowers/specs/2026-05-10-shadcn-tailwind-transition/03-shard-gamma-overlays-portals|03 GAMMA Overlays]]
- [[docs/superpowers/specs/2026-05-10-shadcn-tailwind-transition/04-shard-delta-interaction-a11y|04 DELTA Interaction]]
- [[docs/superpowers/specs/2026-05-10-shadcn-tailwind-transition/05-elastic-ui-architecture|05 Elastic UI Architecture]]
- [[docs/superpowers/specs/2026-05-10-shadcn-tailwind-transition/06-multi-identity-theme-logic|06 Multi-Identity Theme]]
- [[docs/superpowers/specs/2026-05-10-shadcn-tailwind-transition/07-expansion-dom-interception|07 DOM Interception]]
- [[docs/superpowers/specs/2026-05-10-shadcn-tailwind-transition/08-expansion-new-explorers|08 New Explorers]]
- [[docs/superpowers/specs/2026-05-10-shadcn-tailwind-transition/09-expansion-services-dnd|09 Services & DnD]]
- [[docs/superpowers/specs/2026-05-10-shadcn-tailwind-transition/10-expansion-visual-logic|10 Visual Polish]]
- [[docs/superpowers/specs/2026-05-10-shadcn-tailwind-transition/11-bitsui-mainview-spec|11 Main View Bits UI]]

**Spec 12 gap (declared by user prompt, not yet authored as a spec file):**
The user prompt names "Spec 12: Interactive Diff Review & Robust VFS
(Structural Immutability)". No `12-*.md` spec file exists in the spec
folder. Thread 3 of this plan treats the user prompt as the authoritative
spec for that scope and includes its derivation; the source-of-truth spec
should be authored under
`.agents/docs/superpowers/specs/2026-05-10-shadcn-tailwind-transition/12-data-layer-vfs-immutability.md`
as a follow-up so future agents have a stable reference. Thread 3 task 1.0
covers spec authoring; treat the user prompt as the spec until that file
exists.

Related existing plan inspected and intentionally **not duplicated**:

- [[docs/work/polish/plans/2026-05-11-elastic-ui-chameleon/index|Elastic UI Chameleon Plan]]
  — Horizontal ALPHA/BETA/GAMMA/DELTA shards. This vertical plan reuses
  contracts, settings types, and gates from that plan; threads consume
  rather than redefine `typeElasticUi.ts`, `serviceTheme.svelte.ts`,
  `serviceLayout.ts` extensions, and the DnD dependency gate.

Code anchors verified:

- `package.json` (deps confirmed: `@chenglou/pretext@^0.0.6`,
  `@dnd-kit/svelte@^0.4.0`, `@git-diff-view/svelte@^0.1.3`,
  `@svar-ui/svelte-filemanager@^2.5.0`, `@tanstack/svelte-virtual@3.13.24`,
  `@tanstack/table-core@8.21.3`, `svelte@^5.55.1`).
- `src/services/serviceTheme.ts` (current shape; will be moved to
  `serviceTheme.svelte.ts` by Thread 1).
- `src/services/serviceDiff.ts` (current diff infrastructure to preserve).
- `src/services/serviceNodeBinding.ts` (alias logic for `#`, `$`, `%`).
- `src/types/typeOps.ts` (current mutable `VirtualFileState` shape).
- `src/components/views/{ViewNodeTable,ViewNodeGrid,ViewNodeCards,viewTree,viewList,viewGrid,viewDiff}.svelte`.
- `src/providers/explorer{Files,Tags,Props,Snippets,Plugins,Content}.ts`.
- `src/components/frame/{frameVaultman,DetachedTabHost}.svelte`.

---

## Vertical Thread Map

| Thread | Domain | Owns | Primary Specs |
| :--- | :--- | :--- | :--- |
| **T1** | Styling & Identity | UnoCSS install/config, DaisyUI integration via shortcuts, `serviceTheme.svelte.ts`, Faint Mode root binding, Multi-Identity (`native`/`bases`/`outline`/`bookmarks`), settings UI surface, root class arbitration | 01, 05, 06, 10 |
| **T2** | Engine & High-Performance Views | PretextJS row measurement, virtualized `ViewNodeTable`/`ViewNodeGrid`/`ViewNodeCards`, Adopted Nodes (outline headers as virtual children), `viewTree` audit, `tabOutlines` explorer | 02, 08, 11 (Adopted Nodes part) |
| **T3** | VFS & Review UX | Immutable `VirtualFileState` snapshots, `StagedOp.apply` returns new state, Cursor-like Diff Navbar, file/op/snapshot review modes, queue refactor for snapshot timeline | User-prompt Spec 12, partial 03 (modal hosting) |
| **T4** | Ecosystem & Interception | DOM mimicry classes per identity, `serviceDnD` polish (alias-aware drops), 3-Column Dashboard (Filters/Explorer/Add-ons), DOM event hijacking (Ctrl+Click on `.cm-hashtag` / snippets / plugins), Foul Detection telemetry, Bits UI portal correctness | 03, 04, 07, 09, 11 (dashboard) |

Each thread document is self-contained: it lists its own files, tasks
(TDD-formatted), and verification envelope. Threads coordinate only via
shared types in `src/types/typeElasticUi.ts` (owned by T1) and
`src/types/typeOps.ts` (owned by T3).

---

## Non-Negotiable Gates (inherited from Chameleon plan + extended)

- **Preflight off:** Uno reset / preflight must remain disabled. Vaultman
  must not reset Obsidian global element styles. Preflight on is a P0 bug.
- **Native mirror classes in Thin mode:** Thin + `native` identity must
  emit `nav-file`, `nav-file-title`, `nav-folder`, `tree-item`,
  `tree-item-self`, `tree-item-inner`, `metadata-container`,
  `metadata-property`, `metadata-property-key` on the matching roots.
  Community snippets targeting these classes must keep working — verified
  by a snippet-smoke test (`test/component/snippetMimicry.test.ts`).
- **Bits UI portals:** Every `Portal` resolves to the current Vaultman
  root in the **current window** (frame's `activeDocument`), not to the
  main-window `document.body`. Pop-out windows must not lose modals. T4
  owns the portal-resolver test.
- **`serviceTheme.svelte.ts` owns `.vm-root` classes:** Mode, identity,
  faint state, and reduced-motion flags are set there and only there.
  Components never call `activeDocument.body.classList.toggle(...)`.
- **Alias canonical:** `#tag`, `$snippet`, `%plugin`, `[property]`. Owned
  by `serviceNodeBinding.ts`. Threads consume; only T4 may extend it for
  adopted-node and folder cases.
- **DnD dependency:** `@dnd-kit/svelte@^0.4.0` stays canonical. The user
  prompt's mention of `@thisux/sveltednd` is read as a reference to the
  *previous* adapter — current handoff says that package stays removed.
  T4 task 4.0 re-confirms this gate before any DnD work.
- **VFS immutability gate (T3):** Once T3 lands snapshot mode, no service
  outside `serviceQueue.svelte.ts` may mutate a `VirtualFileState`
  directly. Lint via a custom `eslint` rule lives in T3 task 3.7.
- **Unrelated dirty files preserved:** Threads must inspect
  `git status --short` before starting and before handing off. Do not
  revert files the thread did not touch.

---

## Thread Dependency Graph

```
                       T1 (Styling & Identity)
                        │
                        ├── exports VaultmanUiMode, VaultmanUiIdentity,
                        │   ElasticUiSettings, serviceTheme runes
                        │
        ┌───────────────┴───────────────┐
        ▼                               ▼
   T2 (Engine & Views)             T4 (Ecosystem & Interception)
        │                               │
        │                               │
        └──────────────┬────────────────┘
                       ▼
                  T3 (VFS & Review UX)
                       │
                       └─ consumes T1 modes for diff-navbar Thin/Thick rendering,
                          T2 virtual list for snapshot timeline,
                          T4 portal target for diff modal
```

**Execution order:**

1. T1 ships first (foundation). Settings, theme service, root classes are
   gating contracts for everything else. T1 itself depends on running the
   Chameleon plan's `00-contracts-and-gates` first to materialize
   `typeElasticUi.ts`.
2. T2 and T4 run in parallel after T1 ships the theme service and mode
   classes. They are disjoint in file ownership.
3. T3 runs last, OR in parallel with T2/T4 once T3 task 1.0 (immutability
   contract) is approved. The Diff Navbar UI tasks in T3 depend on T4's
   portal target being defined.

---

## Parallel Ownership Matrix

| Path family | T1 | T2 | T3 | T4 |
| :--- | :---: | :---: | :---: | :---: |
| `uno.config.ts`, `src/styles/_*.scss`, `src/main.scss` | **owns** | reads | reads | reads |
| `src/services/serviceTheme.svelte.ts` | **owns** | reads | reads | reads |
| `src/services/serviceLayout.ts` | extends | reads | reads | extends |
| `src/types/typeElasticUi.ts` | **owns** | reads | reads | reads |
| `src/services/serviceTextMeasure.ts` | — | **owns** | — | — |
| `src/components/views/ViewNode{Table,Grid,Cards}.svelte` | reads | **owns** | reads | reads |
| `src/components/views/{viewTree,viewList,viewGrid}.svelte` | reads | **owns** | reads | reads |
| `src/providers/explorer{Snippets,Plugins,Outline}.ts` | reads | **owns** | reads | extends |
| `src/types/typeOps.ts`, `src/services/serviceDiff.ts`, `src/services/serviceQueue.svelte.ts` | reads | reads | **owns** | reads |
| `src/components/views/viewDiff.svelte`, new `viewDiffNavbar.svelte` | reads | reads | **owns** | reads |
| `src/services/serviceDnd*.ts`, `src/services/serviceNativeSurfaceBinding.ts` | reads | reads | reads | **owns** |
| `src/components/frame/frameVaultman.svelte` (3-column layout) | reads | reads | reads | **owns** |
| `src/components/layout/overlays/*.svelte`, Bits UI wrappers | reads | reads | reads | **owns** |
| `src/services/serviceNodeBinding.ts` (alias logic) | reads | reads | reads | **owns** |

When a thread must write into another thread's file (rare), it must
record the cross-thread edit in its thread doc handoff section.

---

## Global Verification Envelope

Every thread runs this at handoff. Per the chameleon plan, sequential Vite
commands are required (transient resolver issue).

```bash
pnpm run check
pnpm exec vp test run --project unit --config vitest.config.ts --fileParallelism=false
pnpm exec vp test run --project component --config vitest.config.ts --fileParallelism=false
pnpm run build:plugin
```

Then live Obsidian smoke via the local CLI (fallback form if `vault=` is
rejected):

```bash
obsidian vault=plugin-dev plugin:reload id=vaultman
obsidian vault=plugin-dev command id=vaultman:open
obsidian vault=plugin-dev dev:errors
```

**Expected:** `svelte-check found 0 errors and 0 warnings`, focused
Vitest files pass, `build:plugin` exits 0, plugin reloads, Vaultman opens,
Obsidian dev errors contain no Vaultman stack.

Doc health is informational only; the doc-health residuals captured in
`status.md` are unrelated to this plan.

---

## Threads

- [[docs/work/polish/plans/2026-05-11-ui-modernization-vertical-threads/01-thread-styling-identity|T1 Styling & Identity]]
- [[docs/work/polish/plans/2026-05-11-ui-modernization-vertical-threads/02-thread-engine-views|T2 Engine & High-Performance Views]]
- [[docs/work/polish/plans/2026-05-11-ui-modernization-vertical-threads/03-thread-vfs-review|T3 VFS & Review UX]]
- [[docs/work/polish/plans/2026-05-11-ui-modernization-vertical-threads/04-thread-ecosystem-interception|T4 Ecosystem & Interception]]

---

## Notes for Nodes — Canonical Alias Table

Spec 07 + `serviceNodeBinding.ts` set the alias prefixes; this plan freezes
them as a global invariant and forbids re-derivation in any thread.

| Node kind | YAML alias prefix | Source explorer | Owning thread for explorer | Owning thread for binding |
| :--- | :--- | :--- | :--- | :--- |
| Tag | `#tagname` | `explorerTags.ts` | T2 (existing) | T4 |
| Snippet (CSS file) | `$snippetname` | `explorerSnippets.ts` | T2 (extend for outline) | T4 |
| Plugin | `%pluginid` | `explorerPlugins.ts` | T2 (extend for outline) | T4 |
| Property | `[propname]` | `explorerProps.ts` | T2 (existing) | T4 |
| Folder | clean label | `explorerFiles.ts` | T2 (existing) | T4 |
| File | clean label | `explorerFiles.ts` | T2 (existing) | T4 |
| Outline node (adopted) | `[[file#header]]` link, no alias prefix | new `explorerOutline.ts` | T2 | T4 |

Filename for created notes is always the **clean label**, never the
prefixed token. Aliases are written to the `aliases:` array in YAML. T4
task 4.5 covers folder-context-menu support and alias propagation.

---

## VFS Snapshot Transition — Canonical Outline

T3 implements this transition; this section freezes the contract.

**Before (current, mutable):**

```ts
export interface StagedOp {
    apply: (vfs: VirtualFileState) => void; // mutates in place
}
```

**After (Thread 3, immutable / structural sharing):**

```ts
export interface StagedOp {
    apply: (vfs: VirtualFileState) => VirtualFileState; // returns new
}

export interface VirtualFileState {
    readonly file: TFile;
    readonly originalPath: string;
    readonly newPath?: string;
    readonly deleted?: boolean;
    readonly fm: Readonly<Record<string, unknown>>;
    readonly body: string;
    readonly ops: readonly StagedOp[];
    readonly fmInitial: Readonly<Record<string, unknown>>;
    readonly bodyInitial: string;
    readonly bodyLoaded: boolean;
}
```

Snapshots are produced by re-applying ops from `initial` state up to a
given op index. `serviceQueue.svelte.ts` keeps a `Map<path, VFSChain>`
where `VFSChain` is `{ initial, snapshots[], head }`. Diff queries
operate on snapshot indices. Body LCS diffing (`computeBodyHunks`)
remains unchanged.

The Cursor-like Diff Navbar (T3 task 3.5) traverses snapshots with
`Prev change / Next change / Prev file / Next file` bindings (mapped via
`logicKeyboard.ts`), mirroring Cursor's review UX.

---

## Foul Detection Logic (T4 task 4.7)

"Foul Detection" is the safety layer that monitors three mimicry-failure
modes and surfaces them as developer-visible diagnostics without crashing
the plugin:

1. **Snippet drift foul** — A community snippet targeting `.nav-file`
   produced zero computed-style overrides on a Vaultman node where it
   should have. Detected by reading `getComputedStyle` on a node sample
   after applying a snippet and comparing against the unstyled baseline.
   When fouled, write a warning to `serviceMessage.ts` and tag the
   node-root with `data-vm-foul="snippet-drift"` for inspection.
2. **Portal target foul** — A Bits UI portal mounted into a node not
   contained by the current frame's `activeDocument`. Detected in the
   portal-resolver helper by asserting `target.ownerDocument === activeDocument`.
   When fouled, log via `console.error` with `[vaultman:foul:portal]`
   prefix and re-mount to a safe fallback (frame root).
3. **DOM mimicry foul** — A class arbitration that should have emitted a
   native mirror class (per the gates) is missing in Thin + native mode.
   Detected by a development-only `$effect` in `frameVaultman.svelte`
   that queries the root with `:not(.nav-file)` and counts hits on
   surfaces that should mirror.

Foul Detection is **off by default** in production builds. T1 ships the
`vaultmanFoulDetection` boolean in settings; T4 wires the three foul
hooks. T4 task 4.7 lists the exact test bodies and fallback paths.

---

## Risk Register (selected, severity-ordered)

1. **CRITICAL — Portal collisions in pop-out windows.** Mitigated by the
   portal-resolver helper + Foul Detection portal foul (T4 4.2, 4.7).
2. **HIGH — VFS migration breaks queue replay.** Mitigated by parallel
   strangler implementation: keep mutable path until T3 task 3.6
   migration verification passes; cut over atomically.
3. **HIGH — UnoCSS Preflight global reset.** Mitigated by config gate
   T1 1.1 + a build-time grep test.
4. **MEDIUM — Bundle inflation from Uno + Bits UI.** Mitigated by Uno
   safelist scoped to `vm-*` prefixes and Bits UI tree-shaking
   verification in T4 4.0.
5. **MEDIUM — Bits UI ARIA conflicts with Obsidian shortcuts.** Mitigated
   by `preventScroll=false` and explicit `loop=false` for focus traps
   in T4 4.3.
6. **MEDIUM — TanStack virtualization regresses on heterogeneous rows.**
   Mitigated by PretextJS heightmap caching keyed on label + column
   width in T2 2.1.
7. **LOW — A snippet-mimicry test produces false positives** in
   development if a user has zero snippets installed. T1 1.4 ships a
   fixture snippet so the test is deterministic.

---

## Execution Handoff

Plan complete and saved to
`.agents/docs/work/polish/plans/2026-05-11-ui-modernization-vertical-threads/`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — Dispatch a fresh subagent per
   thread, two-stage code review between threads, fast iteration. Use
   `superpowers:subagent-driven-development`.
2. **Inline Execution** — Execute threads in this session with
   checkpoints. Use `superpowers:executing-plans`.

When picking option 1, the recommended dispatch order is **T1 first**,
then **T2 + T4 in parallel**, then **T3** (or T3 in parallel from
task 3.1 once the immutability contract is approved).

---

## Source Links

- [[docs/work/polish/plans/2026-05-11-elastic-ui-chameleon/index|Elastic UI Chameleon Plan (horizontal slicing)]]
- [[docs/work/polish/plans/2026-05-10-dock-toolbar-groups-virtualizer/index|Dock Toolbar Groups Virtualizer Plan]]
- [[docs/current/status|Current Status]]
- [[docs/current/handoff|Current Handoff]]
