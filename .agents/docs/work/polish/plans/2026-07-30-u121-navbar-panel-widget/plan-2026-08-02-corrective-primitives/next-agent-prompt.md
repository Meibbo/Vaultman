---
title: U121-003 corrective explorer primitives implementation plan
type: implementation-plan
status: pending-approval
lifecycle: active
parent: "[[../index|U121 Scene-owned Navbar panelWidget]]"
spec: "[[../spec-2026-08-02-corrective-primitives/index|Approved corrective specification]]"
created_by: codex-gpt5-root
updated_by: codex-gpt5-root
dateCreated: 2026-08-02
updated: 2026-08-02
tags:
  - agent/plan
  - initiative/polish
  - release/1.2.1
  - u121/003
  - tdd
---

# U121-003 Corrective Explorer Primitives Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct the remaining U121-003 regressions by making panelWidget publication, SearchControl, menu lifecycle, selection, Cell capabilities, property-value interactions and touch routing explicit Scene/PanelExplorer-owned contracts.

**Architecture:** Keep one persistent panelWidget host per Scene. A generation-guarded Scene controller accepts provider projections atomically; each PanelExplorer owns one generic selection axon; one capability resolver feeds rendering plus View/Sort/Filter; property widgets dispatch OperationNodes through a narrow interaction port. Native Obsidian classes and behavior remain the styling and interaction source of truth.

**Tech Stack:** TypeScript, Svelte 5, Obsidian API 1.12.x, Vitest, ESLint, Prettier, Stylelint, esbuild, Obsidian Web Lab, PowerShell.

---

## Authorization checkpoint

The specification is approved. **Product implementation was authorized by the
developer on 2026-08-02** (claude-opus-5-root session), for the full plan, shards
01 through 06. The same exchange added the amendment scope now recorded in spec
shards 06–08 and plan shards 07–09.

Execute from:

- Worktree: `C:\Users\vic_A\Desktop\vaultman\.claude\worktrees\u121-029-union`
- Branch: `claude/u121-029-panel-widget`
- Rejected reference commit: `cac504a9`
- Smoke vault: `C:\Users\vic_A\My Drive\Start of The Road`
- Installed plugin target: `C:\Users\vic_A\My Drive\Start of The Road\.obsidian\plugins\vaultman`

Do not push, merge, tag, release or close GitHub issues under this plan. Keep code
commits free of `.agents/`; agent documentation is local-only.

## Required skills during execution

1. `vm-start-session` and repository bootloader before work.
2. `executing-plans` or `subagent-driven-development` to track every checkbox.
3. `systematic-debugging` / `diagnose` for any failing behavior whose cause is not
   already proven by a red test.
4. `test-driven-development` for every product change.
5. `svelte-code-writer` and `svelte-core-bestpractices` before editing or
   analysing any `.svelte` file; run the Svelte autofixer on every changed Svelte
   file before and after corrections.
6. `scss-professional` only if SCSS/Sass becomes involved; this plan expects the
   current `styles.css` surface instead.
7. `requesting-code-review` and `verification-before-completion` before the final
   code commit or completion claim.

## Planned file map

### New product contracts

| File | Responsibility |
| --- | --- |
| `src/logic/logicScenePanelWidgetController.ts` | Atomic owner/generation reducer and Scene-local controller |
| `src/logic/logicMenuSession.ts` | At-most-one native menu lifecycle per Scene panelWidget |
| `src/components/layout/searchControl.svelte` | Atomic search input plus configured trailing ActionCells |
| `src/logic/logicNodeSelection.ts` | Generic ordered selection axon and visible-range reconciliation |
| `src/logic/logicOperationTargetSet.ts` | Selected-plus-invoked target construction and compatibility intersection |
| `src/logic/logicCellCapabilities.ts` | Effective provider/engine/topology Cell availability and fallback |
| `src/logic/logicBadgeSort.ts` | Semantic badge classification and stable binary grouping |
| `src/types/typePropertyValueInteraction.ts` | Narrow rename-value OperationNode dispatch port |
| `src/logic/logicNodeSwipe.ts` | Pure horizontal-swipe recognizer state machine |
| `src/utils/nodeTooltipSwipe.ts` | DOM binding that invokes the existing tooltip projection |

### Existing product integration surfaces

| Area | Files |
| --- | --- |
| panelWidget | `src/types/typePanelWidget.ts`, `src/logic/logicPanelWidgetProjection.ts`, `src/logic/logicPanelWidgetOverflow.ts`, `src/VaultmanFrame.svelte`, `src/components/layout/navbarPanelWidgetHost.svelte`, `src/components/layout/navbarFilters.svelte`, `src/components/pages/pageFilters.svelte`, `src/components/pages/pageStatistics.svelte` |
| selection engines | `src/components/layout/viewTree.ts`, `src/components/layout/viewNodeTable.ts`, `src/components/layout/viewGrid.ts`, `src/components/layout/viewFilesGrid.ts` |
| provider adapters | `src/components/containers/explorerFiles.ts`, `explorerProps.ts`, `explorerTags.ts`, `explorerSnippets.ts`, `explorerPlugins.ts`, `src/components/pages/tabContent.svelte` |
| Cells and sort | `src/logic/logicCellRegistry.ts`, `src/logic/logicSortMenu.ts`, `src/logic/logicSort.ts`, `src/logic/logicScopedSort.ts` |
| operations and menus | `src/types/typeCMenu.ts`, `src/services/serviceContextMenu.ts`, provider action registrations above |
| Properties | `src/logic/logicProps.ts`, `src/utils/renderPropertyValue.ts`, `src/components/containers/explorerProps.ts` |
| settings and placement | `src/types/typeSettings.ts`, `src/VaultmanSettings.ts`, `src/logic/logicFrameActivation.ts`, `src/main.ts`, `src/i18n/en.ts`, `src/i18n/es.ts` |
| styling | `styles.css` |

Do not create provider-specific duplicates of any new contract. Delete
`src/logic/logicFileSelection.ts` only after every caller and its focused tests
have moved to `logicNodeSelection.ts`.

## Plan shards and dependency order

0. [[07-cell-format-core-parity|`cell_format` Core parity]] — runs first, see its
   sequencing note
1. [[01-controller-and-provider-liveness|Scene controller and provider liveness]]
2. [[02-search-menu-and-mobile|SearchControl, MenuSession and mobile toolbar]]
3. [[03-selection-engines-and-operations|Selection axon, engine Cells and batch operations]]
4. [[04-cell-capabilities-and-sorts|Cell capabilities, file-count and By badges]]
5. [[05-properties-settings-and-touch|Properties, placement settings and swipe tooltip]]
6. [[06-integration-verification-and-smoke|Integrated gates, build sync and live smoke]]
7. [[next-agent-prompt|Self-contained next-agent prompt]]

The shards are sequential at their contract boundaries. Within a shard, preserve
the red-green-refactor order; do not combine several red suites with a large
unreviewable implementation batch.

### Amendment shards

Shard 07 is written and runs before shard 01, for the reason stated in its
sequencing note: it is a dependency-free render-map refactor that task 5.2 then
builds on.

Shards 08 and 09 are specified but **not yet planned**. Write each one against
its spec shard immediately before executing it, so it is planned against the
codebase as it exists after the preceding slices rather than against the state at
amendment time:

- 08 — value operations, from
  [[spec-2026-08-02-corrective-primitives/07-value-operations|spec shard 07]].
  Depends on the OperationTargetSet of plan shard 03 and the capability resolver
  of plan shard 04, so it runs after both.
- 09 — `reveal this file` properties mode, from
  [[../spec-2026-08-02-corrective-primitives/08-reveal-this-file-properties|spec shard 08]].
  Depends on the panelWidget slot contract of plan shard 02, the capability
  resolver of shard 04 and the interaction port of shard 05, so it runs last. Its
  spec is fully resolved; nothing in it is waiting on the developer.

## Commit boundaries

Create small code-only commits after each green task:

1. `fix: make panel widget publication generation safe`
2. `fix: restore native search and menu lifecycle`
3. `feat: unify explorer selection and operation targets`
4. `fix: resolve explorer cells by capability`
5. `fix: restore property widgets and mobile interactions`
6. `test: lock U121-003 integrated regressions`

Before every commit run the focused test named in that task plus `pnpm run check`.
Before the final code commit run the full gate in shard 06. Documentation updates
must be a separate local `docs:` commit and must never be pushed.

## Spec-to-plan coverage

| Approved requirement | Owning task |
| --- | --- |
| Atomic owner/generation and multiple instances | 1.1–1.3 |
| Persistent host and Statistics softlock | 1.2–1.3 |
| Atomic SearchControl and native Core parity | 2.1–2.2 |
| Condensed overflow and responsive second row | 2.2 |
| One-menu lifecycle | 2.3 |
| Mobile toolbar safety and native theme classes | 2.4 |
| One selection axon for every explorer | 3.1–3.2 |
| Tree/Table/Cards checkbox placement and live repaint | 3.3 |
| Shift range, pruning and multi-target context menu | 3.1, 3.4 |
| CellCapabilityResolver and no flat chevron slot | 4.1–4.2 |
| Folder file-count validity and fallback | 4.3 |
| By badges semantic stable grouping | 4.4 |
| Props topology, empty values and conflicts | 5.1 |
| Format and working property widgets | 5.2 |
| Left/right sidebar migration | 5.3 |
| Touch swipe to existing tooltip | 5.4 |
| Reactive responsiveness, full gates and exact-build smoke | 6.1–6.4 |

## Definition of done

- Every planned red test fails for the stated reason before its implementation.
- Every focused suite, repository gate and Svelte autofixer pass.
- No provider-specific selection store, panelWidget cache or Cell availability
  fork remains in the migrated path.
- Product state updates within the next reactive flush/frame and does not require
  an unrelated action.
- `main.js`, `styles.css` and `manifest.json` SHA-256 hashes match between the
  worktree build and the Start of The Road plugin directory.
- The complete live acceptance matrix is recorded against that exact build.
- The developer explicitly accepts the smoke result before U121-003 is closed.

## Adversarial trade-offs and exclusions

- Mixed selections intentionally lose single-target-only menu entries instead of
  preserving the unsafe status quo that silently acted on one node or a subset.
- Invalid saved Cells/sorts are hidden or normalized only in the effective
  projection; their persisted preference is retained for a later compatible
  provider/topology.
- Folder selection does not imply descendant expansion. Operations that need
  recursive semantics remain unavailable until their OperationNode declares and
  tests that contract explicitly.
- This patch does not implement the full sandbox PSS/PVPUI/WASA architecture,
  global Scene presets or per-instance settings expansion. It establishes narrow
  stable seams without claiming those roadmap capabilities.
- It does not promise a speculative 0.30-second instance-open target. It forbids
  new vault-wide work and treats any near-one-second interaction stall as a failed
  smoke requiring a measured diagnosis, while U121-029 remains separately closed.
