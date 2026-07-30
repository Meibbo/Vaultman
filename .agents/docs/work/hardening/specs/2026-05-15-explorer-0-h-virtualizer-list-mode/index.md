---
title: Explorer Phase 0 sub-system H — virtualizer consolidation and list view mode
type: spec-index
status: draft
parent: "[[docs/work/hardening/index|hardening]]"
created: 2026-05-15T00:00:00
updated: 2026-05-15T00:00:00
tags:
  - agent/spec
  - initiative/hardening
  - explorer/views
  - explorer/virtualization
---

# Explorer Phase 0 Sub-System H — Virtualizer Consolidation And `list` View Mode

This spec is the first of three Phase 0 foundation specs derived from the [[docs/work/hardening/research/2026-05-14-explorer-libraries-and-parity-research/index|explorer libraries and parity worldview research]] and the [[docs/work/hardening/research/2026-05-14-explorer-libraries-and-parity-research/brainstorm-handoff|brainstorm handoff]].

The three Phase 0 specs were chosen in dependency order during the brainstorm session on 2026-05-14 / 2026-05-15:

1. **0-H** (this spec) — virtualizer consolidation and `list` view-mode wiring.
2. **0-B** (next session) — `serviceTheme` unification and token layer.
3. **0-A** (after 0-B) — native-DOM parity contract and view-host extraction from `panelExplorer.svelte`, including in-editor class vocabulary.

0-H is the smallest, fully-independent first spec. After re-verification against the canonical `claude/explorer` branch, it is most accurately framed as **Group 4 (G4) of EDP-009 "explorer row input contract"** — finishing the row-contract migration for the last unmigrated view (`viewList.svelte`) and then collapsing the now-unused custom virtualizer service.

## Decision summary

- Build one new view component `src/components/views/ViewNodeList.svelte` by renaming and rewriting `src/components/views/viewList.svelte` on `@tanstack/svelte-virtual` with `ExplorerRowInput<NodeBase>` as the row payload (per the EDP-009 contract in `src/services/serviceExplorerRowInput.ts`).
- Wire the previously-unwired `list` view mode in `src/components/containers/panelExplorer.svelte` (currently falls through to `<ViewEmptyLanding>` at `:1274` in the view-mode switch at `:1122-1278`).
- Migrate the two current `viewList.svelte` consumers (`src/components/containers/explorerQueue.svelte:4,142` and `src/components/containers/explorerActiveFilters.svelte:4,243`) to consume `ViewNodeList` with `ExplorerRowInput<NodeBase>[]` adapted via `rowInputFromViewRow`.
- Delete `src/components/views/viewGrid.svelte` (already dead — zero references in `src/` and `test/` on both `claude/explorer` and `sandbox`).
- Delete `src/services/serviceVirtualizer.svelte.ts` (custom `Virtualizer` base class plus dead `TreeVirtualizer` subclass) once no consumers remain.
- Keep `@tanstack/svelte-virtual` (currently v3.13.24) as the sole virtualization engine across every Explorer view component.
- Defer `@chenglou/pretext` and `@dnd-kit/svelte` integration to their own initiatives — both are flagged as research WATCH/KEEP, neither is broken, bringing either in expands 0-H's risk surface without immediate value.
- Preserve the existing queue-specific row handling (`is-queue-child`, `is-counter-slot`, `'remove'` action special-case) bit-for-bit inside `ViewNodeList`. A follow-up task is queued ("Decouple queue knowledge from ViewNodeList") to handle the leakage cleanly without expanding 0-H.

## Shards

1. [[docs/work/hardening/specs/2026-05-15-explorer-0-h-virtualizer-list-mode/01-context-and-edp-009|Context and EDP-009 alignment]]
2. [[docs/work/hardening/specs/2026-05-15-explorer-0-h-virtualizer-list-mode/02-architecture|Architecture]]
3. [[docs/work/hardening/specs/2026-05-15-explorer-0-h-virtualizer-list-mode/03-api-contract|`ViewNodeList` API contract]]
4. [[docs/work/hardening/specs/2026-05-15-explorer-0-h-virtualizer-list-mode/04-panelexplorer-wiring|`panelExplorer.svelte` wiring]]
5. [[docs/work/hardening/specs/2026-05-15-explorer-0-h-virtualizer-list-mode/05-migration-sequence|Incremental migration sequence]]
6. [[docs/work/hardening/specs/2026-05-15-explorer-0-h-virtualizer-list-mode/06-testing-strategy|Testing strategy]]
7. [[docs/work/hardening/specs/2026-05-15-explorer-0-h-virtualizer-list-mode/07-risks-and-open-items|Risks and open items]]

## Non-goals

- Do not migrate any DnD-using consumer to `@dnd-kit/svelte`. The existing HTML5 native drag implementation in `viewList.svelte:108-143` is preserved bit-for-bit in `ViewNodeList`.
- Do not integrate `@chenglou/pretext` into `ViewNodeList`. TanStack measured heights with a constant `estimateSize` plus per-row `measureElement` are sufficient. A pretext audit is a separate initiative.
- Do not refactor the queue-specific row handling in 0-H. A follow-up task is queued; that work decouples `is-queue-child` and the inline- cancel `id === 'remove'` special-case behind a generic `layout` hint on `ViewAction<NodeBase>`.
- Do not extend native-DOM parity in 0-H. `ViewNodeList` emits only the existing `vm-view-list-*` / `vm-explorer-popup-*` class vocabulary;
  provider-specific native classes (`nav-file*`, `tag-pane-tag*`, etc.)
  are sub-system 0-A's territory.
- Do not build any new in-editor renderer. The 1-foundation brainstorm decision scopes in-editor surfaces into 0-A's class vocabulary and into the context-agnostic view host; actual in-editor renderers belong to a later fast-follow sub-phase.
- Do not unify queue/active-filters callback surfaces with the `list` view mode beyond what optional callbacks already allow. They share a component, not an interaction model.

## Locked brainstorm answers

For traceability — these were resolved during the brainstorm and are inputs to this spec rather than open questions:

- **Phase 0 ambition:** "Full foundations" (includes unocss-preset-theme token layer in 0-B and decided wiring for `list` mode in 0-H).
- **Sub-system A surface scope:** "Panel + in-editor now."
- **In-editor interpretation:** "1-foundation" — 0-A makes the contract in-editor-complete and the view components context-agnostic; new in-editor renderers are a separate fast-follow sub-phase.
- **Phase 0 structure:** "Three specs, dep order" — H, B, A as separate spec→plan→impl cycles.
- **First spec:** 0-H.
- **0-H component shape:** "Primitive+wrapper, incremental" — corrected during architecture review to **one component** (`ViewNodeList`) with opt-in callback presence, after reading `viewList.svelte:1-216` and confirming both widget consumers already use `ExplorerRenderModel<NodeBase>` with `ViewRow<NodeBase>` rows.
- **`list` view mode disposition:** "Wire it, dual-purpose" — one component serves the `list` view mode AND the existing widget call sites.
- **`@chenglou/pretext` + `@dnd-kit/svelte`:** both deferred.
- **API additions:** ARIA mode-switching by callback presence (`listbox`/`option` vs `list`/`listitem`); `onContextMenu` callback.
- **Queue leak:** preserve bit-for-bit in 0-H; follow-up task spawned.
- **Spec path:** Vaultman convention (`.agents/docs/work/hardening/specs/...`).

## Source notes

- This spec is authored on the `claude/explorer` branch (worktree `.claude/worktrees/jovial-wilson-f81c67`). `claude/explorer` is the canonical Explorer development branch per the brainstorm handoff;
  `sandbox` was used for the brainstorm doc work but had diverged 44 commits behind on Explorer code.
- Re-verification on 2026-05-15 against `claude/explorer` confirmed:
  `viewList.svelte` (216 LOC) is byte-identical to `sandbox`;
  `viewGrid.svelte` has zero references in `src/` and `test/`;
  `panelExplorer.svelte` view-mode switch is at `:1122-1278` with no `list` branch (falls to `ViewEmptyLanding` at `:1274`);
  `@tanstack/svelte-virtual` is the virtualization engine for all four migrated capital-letter `View*` components;
  `serviceVirtualizer.svelte.ts` is consumed only by `viewList.svelte` and `viewGrid.svelte` (the latter dead).
- EDP-009 row input contract: defined in `src/services/serviceExplorerRowInput.ts` with `ExplorerRowInput<TMeta>` as the central row payload type. Migrated views on `claude/explorer`:
  `viewTree.svelte`, `ViewNodeTable.svelte`, `ViewNodeCards.svelte`, `ViewNodeGrid.svelte`. Unmigrated: `viewList.svelte` (explicitly out of EDP-009's G1/G2/G3 scope).
- `ExplorerRenderModel<NodeBase>` is defined at `src/types/typeViews.ts:238-251`.
- `EXPLORER_VIEW_MODES` on `claude/explorer` lists six modes:
  `'tree'`, `'table'`, `'grid'`, `'cards'`, `'markmap'`, `'list'`.
