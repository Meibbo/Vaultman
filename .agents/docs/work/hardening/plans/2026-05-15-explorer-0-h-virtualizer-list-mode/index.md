---
title: Explorer 0-H — virtualizer + list mode implementation plan
type: plan-index
status: draft
parent: "[[docs/work/hardening/specs/2026-05-15-explorer-0-h-virtualizer-list-mode/index|0-H spec]]"
created: 2026-05-15T00:00:00
updated: 2026-05-15T00:00:00
tags:
  - agent/plan
  - initiative/hardening
  - explorer/views
  - explorer/virtualization
---

# Explorer 0-H — Virtualizer + List Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate `viewList.svelte` to `@tanstack/svelte-virtual` as `ViewNodeList.svelte` consuming `ExplorerRowInput<NodeBase>`, wire the `list` view mode in `panelExplorer.svelte`, and delete the now-unused custom virtualizer service. Completes EDP-009 G4.

**Architecture:** One component (`ViewNodeList.svelte`) with opt-in callback presence. Consumers pass `rowInputs: ExplorerRowInput<NodeBase>[]` directly. TanStack virtualizer mirrors `viewTree.svelte`'s `createVirtualizer` + `$effect`/`untrack`/`setOptions` pattern. Spec: `.agents/docs/work/hardening/specs/2026-05-15-explorer-0-h-virtualizer-list-mode/`.

**Tech Stack:** Svelte 5 runes; `@tanstack/svelte-virtual` v3.13.24; Vitest + svelte `mount`/`unmount`/`flushSync` for component tests; pnpm scripts (`pnpm check`, `pnpm lint`, `pnpm test:component`, `pnpm verify`).

**Project commands cheat-sheet:**

| Action                    | Command                                                             |
|---------------------------|---------------------------------------------------------------------|
| Type-check                | `pnpm check`                                                        |
| Lint                      | `pnpm lint:fast` (vp lint) / `pnpm lint:full` (eslint .)            |
| Component tests           | `pnpm test:component`                                               |
| Unit tests                | `pnpm test:unit`                                                    |
| Full gate                 | `pnpm verify`                                                       |
| Format                    | `pnpm format` / `pnpm format:check`                                 |

---

## File structure

### Will create

| Path                                                                       | Responsibility                                                              |
|----------------------------------------------------------------------------|-----------------------------------------------------------------------------|
| `src/components/views/ViewNodeList.svelte`                                 | TanStack-virtualized list view; consumes `ExplorerRowInput<NodeBase>[]`.    |
| `test/component/ViewNodeList.test.ts`                                      | Unit/component tests for new callback surface (replaces viewList.test.ts).  |
| `test/integration/panelExplorer-list-mode.test.ts` (or equivalent location)| End-to-end smoke for `list` view mode wired through `panelExplorer`.        |

### Will modify

| Path                                                                       | Change                                                                       |
|----------------------------------------------------------------------------|------------------------------------------------------------------------------|
| `src/components/views/viewList.svelte`                                     | Task 1: TanStack rewrite in place. Task 2: rename to `ViewNodeList.svelte`.  |
| `src/components/containers/explorerQueue.svelte:4,142`                     | Update import + tag; pass `rowInputs` instead of `model`.                    |
| `src/components/containers/explorerActiveFilters.svelte:4,243`             | Update import + tag; pass `rowInputs` + `canReorder` instead of `model`.     |
| `src/components/containers/panelExplorer.svelte`                           | Add `listRowInputs` derived, `isListEmpty`, `{:else if viewMode === 'list'}` branch around lines 1122-1278. |
| `test/component/viewList.test.ts`                                          | Rename to `ViewNodeList.test.ts`; update import; update `model` → `rowInputs` after step 3. |
| `test/component/reactiveExplorers.test.ts`                                 | Update queue + active-filters tests for new prop shape if any breaks.         |

### Will delete

| Path                                       | Why                                                              |
|--------------------------------------------|------------------------------------------------------------------|
| `src/components/views/viewGrid.svelte`     | Dead — zero `src/` and `test/` refs (verified on claude/explorer).|
| `src/services/serviceVirtualizer.svelte.ts`| No remaining consumers after Task 1 ships TanStack rewrite.       |

### Ground-truth references (do not re-derive — read these)

- TanStack pattern: `src/components/views/viewTree.svelte:241-287`. Mirror its `createVirtualizer({ count, getScrollElement, getItemKey, estimateSize, observeElementRect, overscan, initialRect })` + `$effect(() => untrack(() => $rowVirtualizer.setOptions(...)))`. The `untrack` is essential — prevents infinite reactive loops.
- Row-input contract: `src/services/serviceExplorerRowInput.ts:11-38` (the `ExplorerRowInput<TMeta>` interface) + lines 61-155 (helper signatures).
- `nodeRowsFromRowInputs` is at `src/services/serviceViewTableAdapter.ts:239` but returns table rows. List doesn't need it — pass `rowInputs` through directly.
- Drag-and-drop gate is `model.capabilities.canDrag && model.capabilities.canDrop` (per `viewList.svelte:104-106`). `ExplorerProvider` itself has no `capabilities` field; capabilities live on the `ExplorerRenderModel` produced via `ViewService.getModel({ capabilities: {...} })`.

---

## Tasks

### Task 0: Audit + capture pre-migration baselines

**Goal:** Confirm existing test coverage is adequate; capture pre-migration perfProbe baseline so Task 6 has a reference.

**Files:**
- Audit: `test/component/viewList.test.ts`, `test/component/reactiveExplorers.test.ts`
- Audit: `perfProbe.ts` invocation pattern (grep for it)
- Modify (only if gaps): `test/component/reactiveExplorers.test.ts`

- [ ] **Step 0.1: Audit existing widget-consumer test coverage**

Run:
```bash
ls test/component/viewList.test.ts test/component/reactiveExplorers.test.ts
```
Expected: both files exist (confirmed by ground-truth read).

Open each and verify they cover:
- `viewList.test.ts`: mount with `ExplorerRenderModel`, assert rows render, assert action click fires `onAction`.
- `reactiveExplorers.test.ts`: mount `ExplorerQueue` and `ExplorerActiveFilters`, assert queue items render through `ViewList`, assert action dispatch.

If coverage is materially absent for any of: render rows, action dispatch, reorder (active-filters only) — add minimal tests in Step 0.2 below. Otherwise note coverage as adequate and skip to Step 0.3.

- [ ] **Step 0.2 (conditional): Add DOM-snapshot baseline tests**

If `reactiveExplorers.test.ts` lacks snapshot assertions, add to its existing `describe` block:

```typescript
it('queue list rendering — DOM snapshot (pre-migration baseline)', () => {
  const queue = mountQueueWithFixture(/* representative queue: 3 ops, 2 with details */);
  flushSync();
  expect(queue.container.innerHTML).toMatchSnapshot();
  unmount(queue);
});

it('active-filters list rendering — DOM snapshot (pre-migration baseline)', () => {
  const filters = mountActiveFiltersWithFixture(/* representative: 2 filters, one with reorder */);
  flushSync();
  expect(filters.container.innerHTML).toMatchSnapshot();
  unmount(filters);
});
```

The exact `mountQueueWithFixture` / `mountActiveFiltersWithFixture` helpers are already in `reactiveExplorers.test.ts` — reuse the existing `MutableIndex` setup and `ContentTab` mount patterns.

- [ ] **Step 0.3: Capture pre-migration perfProbe baseline**

Run:
```bash
pnpm test:component -- --grep 'perf' 2>&1 || true
# OR find the actual perfProbe entry point — grep for perfProbe in src/ and test/
```

Locate `perfProbe.ts` (research §2 mentioned it). Run its 4 scenarios (`tree-scroll`, `operation-badges`, `filter-select`, `filters-search`) against a representative vault (or mocked dataset of 1000+ nodes). Save numeric output to:
```
.agents/docs/work/hardening/plans/2026-05-15-explorer-0-h-virtualizer-list-mode/perf-baseline.md
```

Record per-scenario wall-clock, jank-frame counts, max heap usage. This file is the reference Task 6 compares against. Use this template:

```markdown
# 0-H pre-migration perfProbe baseline

Captured: <ISO date>
Branch: claude/explorer @ <commit before Task 1>

| Scenario           | Wall clock (ms) | Jank frames | Notes |
|--------------------|-----------------|-------------|-------|
| tree-scroll        |                 |             |       |
| operation-badges   |                 |             |       |
| filter-select      |                 |             |       |
| filters-search     |                 |             |       |
```

- [ ] **Step 0.4: Commit (only if Step 0.2 added tests; otherwise skip)**

```bash
git add test/component/reactiveExplorers.test.ts test/component/__snapshots__/ \
        .agents/docs/work/hardening/plans/2026-05-15-explorer-0-h-virtualizer-list-mode/perf-baseline.md
git commit -m "test(0-h): add pre-migration DOM snapshot baselines for queue + active-filters

Captured perfProbe baseline numbers in perf-baseline.md for Task 6 comparison.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 1: Rewrite `viewList.svelte` on TanStack (keep filename, keep API)

**Goal:** Replace the in-house `Virtualizer` with `@tanstack/svelte-virtual` in `viewList.svelte`. Behavior is byte-identical from the consumer side; only the virtualizer underneath changes.

**Files:**
- Modify: `src/components/views/viewList.svelte`
- Test: `test/component/viewList.test.ts` (existing tests stay green)

- [ ] **Step 1.1: Confirm existing tests green pre-change**

Run:
```bash
pnpm test:component -- viewList
```
Expected: PASS (current state).

- [ ] **Step 1.2: Swap imports**

In `src/components/views/viewList.svelte`, replace line 2:

```typescript
// REMOVE
import { Virtualizer } from '../../services/serviceVirtualizer.svelte';

// ADD
import { createVirtualizer } from '@tanstack/svelte-virtual';
import { untrack } from 'svelte';
import { fallbackFixedVirtualRows, observeListRect /* if exists, else copy from serviceScroll */ } from '../../services/serviceScroll';
```

Verify `serviceScroll` exports `fallbackFixedVirtualRows` (used by `viewTree`). If `observeListRect` does not exist, use `observeTreeRect` from `serviceScroll` or replicate the helper inline — it's a tiny ResizeObserver wrapper.

- [ ] **Step 1.3: Replace virtualizer instantiation and effect**

Replace the existing `const virtualizer = new Virtualizer<…>()` (line 23) and its companion `$effect` blocks (lines 27-41) with the TanStack pattern mirroring `viewTree.svelte:244-287`. Code:

```typescript
// New replacement for the old `virtualizer` declaration and effects.
const LIST_OVERSCAN = 5;
const LIST_FALLBACK_HEIGHT = 400;
const LIST_FALLBACK_WIDTH = 320;

let outerEl: HTMLDivElement | undefined = $state();
let draggingRowId: string | null = $state(null);
let fallbackScrollTop = $state(0);
let fallbackViewportHeight = $state(LIST_FALLBACK_HEIGHT);

const rowHeight = $derived(model.virtualization.rowHeight);
const rowCount = $derived(model.rows.length);

const rowVirtualizer = createVirtualizer<HTMLDivElement, HTMLDivElement>({
  count: 0,
  getScrollElement: () => outerEl ?? null,
  getItemKey: (index) => model.rows[index]?.id ?? index,
  estimateSize: () => rowHeight,
  overscan: LIST_OVERSCAN,
  initialRect: { width: LIST_FALLBACK_WIDTH, height: LIST_FALLBACK_HEIGHT },
});

const virtualRows = $derived($rowVirtualizer.getVirtualItems());
const renderedVirtualRows = $derived.by(() => {
  const rows = virtualRows.filter((vr) => vr.index < rowCount);
  if (rows.length > 0 || rowCount === 0) return rows;
  return fallbackFixedVirtualRows({
    count: rowCount,
    rowHeight,
    viewportHeight: fallbackViewportHeight,
    scrollTop: fallbackScrollTop,
    overscan: LIST_OVERSCAN,
    getKey: (index) => model.rows[index]?.id ?? index,
  });
});
const totalH = $derived($rowVirtualizer.getTotalSize());

$effect(() => {
  const count = rowCount;
  const rows = model.rows;
  const scrollElement = outerEl;
  const height = rowHeight;
  untrack(() =>
    $rowVirtualizer.setOptions({
      count,
      getScrollElement: () => scrollElement ?? null,
      getItemKey: (index) => rows[index]?.id ?? index,
      estimateSize: () => height,
      overscan: LIST_OVERSCAN,
      initialRect: { width: LIST_FALLBACK_WIDTH, height: LIST_FALLBACK_HEIGHT },
    }),
  );
});

$effect(() => {
  if (!outerEl) return;
  fallbackViewportHeight = outerEl.clientHeight || LIST_FALLBACK_HEIGHT;
  const ro = new ResizeObserver(() => {
    if (outerEl) fallbackViewportHeight = outerEl.clientHeight;
  });
  ro.observe(outerEl);
  return () => ro.disconnect();
});

function onScroll(e: Event) {
  fallbackScrollTop = (e.currentTarget as HTMLDivElement).scrollTop;
}
```

- [ ] **Step 1.4: Update the template to use TanStack virtual rows**

Replace the existing template inner loop (lines 148-213) — replace `{#each virtualizer.visible as row, i (row.id)}` with TanStack's virtualizer items. The loop and per-row markup stay otherwise identical:

```svelte
<div bind:this={outerEl} class="vm-view-list vm-explorer-popup-list" role="list" onscroll={onScroll}>
  <div class="vm-view-list-inner vm-explorer-popup-inner" style="height: {totalH}px">
    {#each renderedVirtualRows as virtualRow (virtualRow.key)}
      {@const row = model.rows[virtualRow.index]}
      {#if row}
        {@const iconName = rowIcon(row)}
        {@const badges = allBadges(row)}
        <div
          class="vm-view-list-row vm-explorer-popup-row {row.cls ?? ''}"
          class:is-selected={row.layers.state?.selected}
          class:is-disabled={row.disabled || row.layers.state?.disabled}
          class:is-group={isGroupRow(row)}
          class:is-dragging={draggingRowId === row.id}
          style="position: absolute; top: 0; left: 0; right: 0; height: {virtualRow.size}px;
                 transform: translateY({virtualRow.start}px);
                 --vm-list-depth-indent: {(row.depth ?? 0) * 14}px"
          data-id={row.id}
          data-index={virtualRow.index}
          role="listitem"
          draggable={dragEnabled()}
          ondragstart={(event) => handleDragStart(event, row)}
          ondragover={(event) => handleDragOver(event, row)}
          ondrop={(event) => handleDrop(event, row)}
          ondragend={handleDragEnd}
        >
          <!-- icon / label / detail / badges / actions — KEEP existing markup unchanged (lines 168-211 of original) -->
        </div>
      {/if}
    {/each}
  </div>
</div>
```

Note: `virtualRow.size` and `virtualRow.start` (TanStack-provided) replace the old `absIdx * virtualizer.rowHeight` math. Position is now absolute with transform.

- [ ] **Step 1.5: Run the existing test suite — confirm green**

```bash
pnpm test:component -- viewList
pnpm test:component -- reactiveExplorers
pnpm check
```
Expected: PASS / PASS / no type errors.

If `viewList.test.ts`'s assertions about row order or row count fail because the template now uses absolute positioning, adjust the test selectors (not the implementation) to query rendered rows via `[role="listitem"]` rather than depending on the inner DOM structure that changed.

- [ ] **Step 1.6: Commit**

```bash
git add src/components/views/viewList.svelte test/component/viewList.test.ts
git commit -m "refactor(0-h): migrate viewList.svelte to @tanstack/svelte-virtual

Step 1 of EDP-009 G4 / 0-H. Replaces the in-house Virtualizer from
serviceVirtualizer.svelte with createVirtualizer from @tanstack/svelte-virtual,
mirroring the viewTree.svelte pattern (\$effect + untrack + setOptions).
Behavior is byte-identical from the consumer side; only the virtualizer
underneath changes. Existing queue + active-filters consumers untouched.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 2: Rename `viewList.svelte` → `ViewNodeList.svelte`

**Goal:** Rename the file and update the two import sites. No behavior change.

**Files:**
- Rename: `src/components/views/viewList.svelte` → `src/components/views/ViewNodeList.svelte`
- Modify: `src/components/containers/explorerQueue.svelte:4,142`
- Modify: `src/components/containers/explorerActiveFilters.svelte:4,243`
- Rename: `test/component/viewList.test.ts` → `test/component/ViewNodeList.test.ts`
- Audit: grep `src/` and `test/` for any remaining `viewList` / `ViewList` references

- [ ] **Step 2.1: Rename the file via git**

```bash
git -C "$(git rev-parse --show-toplevel)" mv \
  src/components/views/viewList.svelte \
  src/components/views/ViewNodeList.svelte
```

- [ ] **Step 2.2: Update `explorerQueue.svelte`**

In `src/components/containers/explorerQueue.svelte`, line 4:
```svelte
<!-- REMOVE -->
import ViewList from '../views/viewList.svelte';

<!-- ADD -->
import ViewNodeList from '../views/ViewNodeList.svelte';
```

Line 142 — update the tag:
```svelte
<!-- REMOVE -->
<ViewList {model} {icon} onAction={handleAction} />

<!-- ADD -->
<ViewNodeList {model} {icon} onAction={handleAction} />
```

(The `model` prop continues to work because Task 3 is what adds `rowInputs`. Step 2 is rename-only.)

- [ ] **Step 2.3: Update `explorerActiveFilters.svelte`**

In `src/components/containers/explorerActiveFilters.svelte`, line 4:
```svelte
<!-- REMOVE -->
import ViewList from '../views/viewList.svelte';

<!-- ADD -->
import ViewNodeList from '../views/ViewNodeList.svelte';
```

Line 243:
```svelte
<!-- REMOVE -->
<ViewList {model} {icon} onAction={handleAction} onReorder={handleReorder} />

<!-- ADD -->
<ViewNodeList {model} {icon} onAction={handleAction} onReorder={handleReorder} />
```

- [ ] **Step 2.4: Rename and update tests**

```bash
git mv test/component/viewList.test.ts test/component/ViewNodeList.test.ts
```

In `test/component/ViewNodeList.test.ts`, update line 3:
```typescript
// REMOVE
import ViewList from '../../src/components/views/viewList.svelte';

// ADD
import ViewNodeList from '../../src/components/views/ViewNodeList.svelte';
```

Update all `ViewList` usages in the file body to `ViewNodeList` (component instantiation in `mount(ViewList, …)` calls). Rename the top-level `describe('ViewList', …)` to `describe('ViewNodeList', …)`.

- [ ] **Step 2.5: Grep for any remaining `viewList` / `ViewList` references**

```bash
grep -rn "viewList\|ViewList" src/ test/ --include="*.svelte" --include="*.ts" --include="*.tsx"
```
Expected: ZERO matches (apart from comments referencing the historical name, which are fine). Address any remaining production-code matches.

- [ ] **Step 2.6: Run tests**

```bash
pnpm test:component
pnpm check
```
Expected: PASS / no type errors.

- [ ] **Step 2.7: Commit**

```bash
git add -A src/components/views/ViewNodeList.svelte \
       src/components/containers/explorerQueue.svelte \
       src/components/containers/explorerActiveFilters.svelte \
       test/component/ViewNodeList.test.ts
# Confirm no other files in `git status` you didn't intend
git status
git commit -m "refactor(0-h): rename viewList.svelte to ViewNodeList.svelte

Step 2 of EDP-009 G4 / 0-H. Pure rename — file moved, 2 import sites
updated (explorerQueue + explorerActiveFilters), and the matching
test file renamed. No prop or behavior changes; the component is
identical to Task 1's output. The capital-letter ViewNodeList name
aligns with the EDP-009 row-input contract consumers (ViewNodeTable,
ViewNodeCards, ViewNodeGrid).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 3: Add `rowInputs` prop with back-compat to `model`

**Goal:** Consumers switch from `model: ExplorerRenderModel<NodeBase>` to `rowInputs: ExplorerRowInput<NodeBase>[]` + `canReorder?: boolean`. `ViewNodeList` accepts EITHER prop during transition.

**Files:**
- Modify: `src/components/views/ViewNodeList.svelte`
- Modify: `src/components/containers/explorerQueue.svelte`
- Modify: `src/components/containers/explorerActiveFilters.svelte`
- Modify: `test/component/ViewNodeList.test.ts`

- [ ] **Step 3.1: Write failing test for `rowInputs` prop acceptance**

In `test/component/ViewNodeList.test.ts`, add a new test:

```typescript
it('accepts rowInputs prop directly (without model)', () => {
  const rowInputs: ExplorerRowInput<ListNode>[] = [
    rowInputFromViewRow(row('a', 'Row A', '', [])),
    rowInputFromViewRow(row('b', 'Row B', '', [])),
  ];
  const target = document.createElement('div');
  document.body.appendChild(target);
  const cmp = mount(ViewNodeList, {
    target,
    props: { rowInputs, canReorder: false, icon: stubIcon },
  });
  flushSync();
  expect(target.querySelectorAll('[role="listitem"]').length).toBe(2);
  expect(target.textContent).toContain('Row A');
  expect(target.textContent).toContain('Row B');
  unmount(cmp);
});
```

Note: imports needed at top of file:
```typescript
import type { ExplorerRowInput } from '../../src/services/serviceExplorerRowInput';
import { rowInputFromViewRow } from '../../src/services/serviceExplorerRowInput';
```

- [ ] **Step 3.2: Run test — confirm fail**

```bash
pnpm test:component -- ViewNodeList
```
Expected: FAIL — `rowInputs` prop unknown / component renders zero rows.

- [ ] **Step 3.3: Add `rowInputs` prop and internal adapter to `ViewNodeList`**

In `src/components/views/ViewNodeList.svelte`, update the `Props` interface and script:

```typescript
import type { ExplorerRowInput } from '../../services/serviceExplorerRowInput';
import { rowInputFromViewRow } from '../../services/serviceExplorerRowInput';

interface Props {
  // New canonical API
  rowInputs?: readonly ExplorerRowInput<NodeBase>[];
  canReorder?: boolean;

  // Back-compat (removed in Task 5)
  model?: ExplorerRenderModel<NodeBase>;

  // Existing widget callbacks
  onAction?: (action: ViewAction<NodeBase>, row: ExplorerRowInput<NodeBase>) => void;
  onReorder?: (request: ListReorderRequest) => void;
  icon?: (node: HTMLElement, name: string) => { update(n: string): void };
}

let { rowInputs, canReorder, model, onAction, onReorder, icon }: Props = $props();
```

Add a derived "effective rows" that resolves either input:

```typescript
const effectiveRows = $derived<readonly ExplorerRowInput<NodeBase>[]>(
  rowInputs ?? model?.rows.map((r) => rowInputFromViewRow(r as ViewRow<NodeBase>)) ?? [],
);

const effectiveCanReorder = $derived(
  canReorder ?? Boolean(model?.capabilities?.canDrag && model?.capabilities?.canDrop),
);

const effectiveRowHeight = $derived(
  model?.virtualization?.rowHeight ?? 32,
);
```

Replace every reference to `model.rows` in the template + virtualizer setup with `effectiveRows`. Replace `model.virtualization.rowHeight` with `effectiveRowHeight`. Replace `model.capabilities.canDrag && model.capabilities.canDrop && onReorder` (in `dragEnabled()`) with `effectiveCanReorder && onReorder !== undefined`.

Update the action handler signature to pass the `ExplorerRowInput` directly (not `ViewRow`):

```typescript
function handleAction(action: ViewAction<NodeBase>, row: ExplorerRowInput<NodeBase>) {
  if (action.disabled) return;
  action.run?.(/* run signature may need the underlying node */ row.node);
  onAction?.(action, row);
}
```

Note: `action.run` historically took `ViewRow<NodeBase>`. If callers depend on the row shape, pass `row.node` or document the type change as part of EDP-009 alignment. Audit `serviceQueuePresentation.ts` and `serviceActiveFilterPresentation.ts` for `action.run` invocations.

- [ ] **Step 3.4: Run test — confirm pass**

```bash
pnpm test:component -- ViewNodeList
```
Expected: PASS (both old `model`-based tests AND the new `rowInputs` test).

- [ ] **Step 3.5: Migrate `explorerQueue.svelte` to pass `rowInputs`**

In `src/components/containers/explorerQueue.svelte`, line 142, change from:

```svelte
<ViewNodeList {model} {icon} onAction={handleAction} />
```

to:

```svelte
<ViewNodeList
  rowInputs={model.rows.map((r) => rowInputFromViewRow(r as ViewRow<NodeBase>))}
  canReorder={false}
  {icon}
  onAction={handleAction}
/>
```

Add the import at the top of `explorerQueue.svelte`:

```typescript
import { rowInputFromViewRow } from '../../services/serviceExplorerRowInput';
```

The `handleAction` signature will need to accept `ExplorerRowInput<NodeBase>` instead of `ViewRow<NodeBase>` — update its body to read `row.node` (which is the original `TreeNode<NodeBase>`).

- [ ] **Step 3.6: Migrate `explorerActiveFilters.svelte` to pass `rowInputs`**

In `src/components/containers/explorerActiveFilters.svelte`, line 243, change from:

```svelte
<ViewNodeList {model} {icon} onAction={handleAction} onReorder={handleReorder} />
```

to:

```svelte
<ViewNodeList
  rowInputs={model.rows.map((r) => rowInputFromViewRow(r as ViewRow<NodeBase>))}
  canReorder={Boolean(model.capabilities.canDrag && model.capabilities.canDrop)}
  {icon}
  onAction={handleAction}
  onReorder={handleReorder}
/>
```

Add the same `rowInputFromViewRow` import. Update `handleAction` similarly to read `row.node`.

- [ ] **Step 3.7: Run full tests**

```bash
pnpm test:component
pnpm check
```
Expected: PASS / no type errors. The DOM-snapshot tests added in Task 0 should still match — the rendered HTML is identical bit-for-bit because the same row data flows through.

- [ ] **Step 3.8: Commit**

```bash
git add src/components/views/ViewNodeList.svelte \
        src/components/containers/explorerQueue.svelte \
        src/components/containers/explorerActiveFilters.svelte \
        test/component/ViewNodeList.test.ts
git commit -m "refactor(0-h): consumers pass rowInputs to ViewNodeList

Step 3 of EDP-009 G4 / 0-H. ViewNodeList now accepts a canonical
rowInputs prop (readonly ExplorerRowInput<NodeBase>[]) plus a canReorder
boolean. The legacy 'model' prop is retained as a back-compat path
(removed in Task 5). explorerQueue and explorerActiveFilters now build
rowInputs via rowInputFromViewRow at the call site; the row builders
inside each container are untouched.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 4: Add Explorer-mode callback surface + wire `list` view mode in `panelExplorer`

**Goal:** `ViewNodeList` gains the Explorer-mode callbacks (`onSelect`, `onActivate`, `onFocus`, `onContextMenu`, `selectedIds`, `focusedId`) and ARIA mode-switching. `panelExplorer.svelte` gets the `{:else if viewMode === 'list'}` branch with full wiring.

**Files:**
- Modify: `src/components/views/ViewNodeList.svelte`
- Modify: `src/components/containers/panelExplorer.svelte`
- Modify: `test/component/ViewNodeList.test.ts`
- Create: `test/integration/panelExplorer-list-mode.test.ts` (or extend `reactiveExplorers.test.ts`)

#### Sub-task 4a: `onSelect` + click + modifier capture

- [ ] **Step 4a.1: Write failing test**

```typescript
it('onSelect fires with SelectModifiers on click', () => {
  const onSelect = vi.fn();
  const rowInputs = [rowInputFromViewRow(row('a', 'Row A', '', []))];
  const target = document.createElement('div');
  document.body.appendChild(target);
  const cmp = mount(ViewNodeList, { target, props: { rowInputs, onSelect, icon: stubIcon } });
  flushSync();

  const rowEl = target.querySelector('[role="option"]') as HTMLElement;
  expect(rowEl).toBeTruthy(); // ARIA listbox mode active
  rowEl.click();
  expect(onSelect).toHaveBeenCalledWith(
    rowInputs[0],
    { ctrl: false, shift: false, alt: false },
  );

  // With modifiers
  rowEl.dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true, shiftKey: true }));
  expect(onSelect).toHaveBeenLastCalledWith(
    rowInputs[0],
    { ctrl: true, shift: true, alt: false },
  );
  unmount(cmp);
});
```

- [ ] **Step 4a.2: Run test — confirm fail**

```bash
pnpm test:component -- ViewNodeList
```
Expected: FAIL — `onSelect` not wired; `role="option"` not on row.

- [ ] **Step 4a.3: Add `onSelect` prop and click handler**

In `Props` interface, add:
```typescript
onSelect?: (row: ExplorerRowInput<NodeBase>, modifiers: SelectModifiers) => void;
```

Add the `SelectModifiers` interface:
```typescript
interface SelectModifiers { ctrl: boolean; shift: boolean; alt: boolean; }
```

Wire the click handler on the row element:
```svelte
<div
  role={onSelect || onFocus ? 'option' : 'listitem'}
  onclick={onSelect ? (e) => handleSelect(e, row) : undefined}
  ...
>
```

Helper:
```typescript
function handleSelect(event: MouseEvent, row: ExplorerRowInput<NodeBase>) {
  if (!onSelect) return;
  onSelect(row, {
    ctrl: event.ctrlKey || event.metaKey,
    shift: event.shiftKey,
    alt: event.altKey,
  });
}
```

Also adjust the container's `role`:
```svelte
<div role={onSelect || onFocus ? 'listbox' : 'list'} ...>
```

- [ ] **Step 4a.4: Run test — confirm pass**

```bash
pnpm test:component -- ViewNodeList
```
Expected: PASS.

#### Sub-task 4b: `onContextMenu`

- [ ] **Step 4b.1: Write failing test**

```typescript
it('onContextMenu fires on right-click with (event, row)', () => {
  const onContextMenu = vi.fn();
  const rowInputs = [rowInputFromViewRow(row('a', 'Row A', '', []))];
  const target = document.createElement('div');
  document.body.appendChild(target);
  const cmp = mount(ViewNodeList, { target, props: { rowInputs, onContextMenu, icon: stubIcon } });
  flushSync();

  const rowEl = target.querySelector('[data-id="a"]') as HTMLElement;
  rowEl.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));
  expect(onContextMenu).toHaveBeenCalledTimes(1);
  expect(onContextMenu.mock.calls[0][1]).toEqual(rowInputs[0]);
  unmount(cmp);
});
```

- [ ] **Step 4b.2: Run test — confirm fail**

```bash
pnpm test:component -- ViewNodeList
```
Expected: FAIL.

- [ ] **Step 4b.3: Add `onContextMenu` prop and handler**

In `Props`:
```typescript
onContextMenu?: (event: MouseEvent, row: ExplorerRowInput<NodeBase>) => void;
```

On the row element:
```svelte
oncontextmenu={onContextMenu ? (e) => onContextMenu(e, row) : undefined}
```

- [ ] **Step 4b.4: Run test — confirm pass**

#### Sub-task 4c: `onActivate` + double-click + Enter

- [ ] **Step 4c.1: Write failing test**

```typescript
it('onActivate fires on double-click and on Enter', () => {
  const onActivate = vi.fn();
  const rowInputs = [rowInputFromViewRow(row('a', 'Row A', '', []))];
  const target = document.createElement('div');
  document.body.appendChild(target);
  const cmp = mount(ViewNodeList, {
    target,
    props: { rowInputs, onActivate, onFocus: vi.fn(), icon: stubIcon, focusedId: 'a' },
  });
  flushSync();

  const rowEl = target.querySelector('[data-id="a"]') as HTMLElement;
  rowEl.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
  expect(onActivate).toHaveBeenCalledWith(rowInputs[0]);

  // Enter on focused row
  onActivate.mockClear();
  target.querySelector('[role="listbox"]')!.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
  );
  expect(onActivate).toHaveBeenCalledWith(rowInputs[0]);
  unmount(cmp);
});
```

- [ ] **Step 4c.2: Run test — confirm fail**

- [ ] **Step 4c.3: Add `onActivate` prop and handlers**

In `Props`:
```typescript
onActivate?: (row: ExplorerRowInput<NodeBase>) => void;
```

On the row:
```svelte
ondblclick={onActivate ? () => onActivate(row) : undefined}
```

Add container-level keydown handler (preview — full keyboard nav added in sub-task 4d):
```typescript
function handleKeydown(event: KeyboardEvent) {
  if (!effectiveRows.length) return;
  const idx = focusedId
    ? effectiveRows.findIndex((r) => r.id === focusedId)
    : -1;
  if (event.key === 'Enter' && idx >= 0 && onActivate) {
    onActivate(effectiveRows[idx]);
    event.preventDefault();
    return;
  }
  // ArrowDown/ArrowUp/Home/End/PageDown/PageUp/Space — added in 4d
}
```

On the container:
```svelte
<div
  role={onSelect || onFocus ? 'listbox' : 'list'}
  tabindex={onSelect || onFocus ? 0 : undefined}
  onkeydown={onSelect || onFocus || onActivate ? handleKeydown : undefined}
  ...
>
```

- [ ] **Step 4c.4: Run test — confirm pass**

#### Sub-task 4d: `onFocus` + keyboard navigation + auto-scroll

- [ ] **Step 4d.1: Write failing tests**

```typescript
it('Arrow keys move focus and fire onFocus', () => {
  const onFocus = vi.fn();
  const rowInputs = [
    rowInputFromViewRow(row('a', 'A', '', [])),
    rowInputFromViewRow(row('b', 'B', '', [])),
    rowInputFromViewRow(row('c', 'C', '', [])),
  ];
  const target = document.createElement('div');
  document.body.appendChild(target);
  const cmp = mount(ViewNodeList, {
    target,
    props: { rowInputs, onFocus, focusedId: 'a', icon: stubIcon },
  });
  flushSync();
  const container = target.querySelector('[role="listbox"]')!;
  container.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
  expect(onFocus).toHaveBeenLastCalledWith('b');
  container.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
  expect(onFocus).toHaveBeenLastCalledWith('c');
  container.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
  expect(onFocus).toHaveBeenLastCalledWith('a');
  unmount(cmp);
});

it('Space fires onSelect with empty modifiers', () => {
  const onSelect = vi.fn();
  const rowInputs = [rowInputFromViewRow(row('a', 'A', '', []))];
  const target = document.createElement('div');
  document.body.appendChild(target);
  const cmp = mount(ViewNodeList, {
    target,
    props: { rowInputs, onSelect, focusedId: 'a', icon: stubIcon },
  });
  flushSync();
  const container = target.querySelector('[role="listbox"]')!;
  container.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
  expect(onSelect).toHaveBeenCalledWith(rowInputs[0], { ctrl: false, shift: false, alt: false });
  unmount(cmp);
});
```

- [ ] **Step 4d.2: Run tests — confirm fail**

- [ ] **Step 4d.3: Implement full keyboard handling + auto-scroll**

Extend `handleKeydown`:

```typescript
function handleKeydown(event: KeyboardEvent) {
  if (!effectiveRows.length) return;
  const idx = focusedId
    ? effectiveRows.findIndex((r) => r.id === focusedId)
    : 0;

  let nextIdx: number | null = null;
  if (event.key === 'ArrowDown') nextIdx = Math.min(idx + 1, effectiveRows.length - 1);
  else if (event.key === 'ArrowUp') nextIdx = Math.max(idx - 1, 0);
  else if (event.key === 'Home') nextIdx = 0;
  else if (event.key === 'End') nextIdx = effectiveRows.length - 1;
  else if (event.key === 'PageDown') nextIdx = Math.min(idx + 10, effectiveRows.length - 1);
  else if (event.key === 'PageUp') nextIdx = Math.max(idx - 10, 0);

  if (nextIdx !== null && nextIdx !== idx) {
    onFocus?.(effectiveRows[nextIdx].id);
    event.preventDefault();
    return;
  }
  if (event.key === 'Enter' && idx >= 0 && onActivate) {
    onActivate(effectiveRows[idx]);
    event.preventDefault();
    return;
  }
  if (event.key === ' ' && idx >= 0 && onSelect) {
    onSelect(effectiveRows[idx], { ctrl: false, shift: false, alt: false });
    event.preventDefault();
    return;
  }
}
```

Auto-scroll on external `focusedId` change:

```typescript
$effect(() => {
  if (!focusedId) return;
  const idx = effectiveRows.findIndex((r) => r.id === focusedId);
  if (idx < 0) return;
  untrack(() => $rowVirtualizer.scrollToIndex(idx, { align: 'auto' }));
});
```

- [ ] **Step 4d.4: Run tests — confirm pass**

#### Sub-task 4e: `selectedIds` external prop + ARIA `aria-selected` + `aria-activedescendant`

- [ ] **Step 4e.1: Write failing test**

```typescript
it('aria-selected and aria-activedescendant reflect selectedIds + focusedId', () => {
  const rowInputs = [
    rowInputFromViewRow(row('a', 'A', '', [])),
    rowInputFromViewRow(row('b', 'B', '', [])),
  ];
  const target = document.createElement('div');
  document.body.appendChild(target);
  const cmp = mount(ViewNodeList, {
    target,
    props: {
      rowInputs,
      selectedIds: new Set(['a']),
      focusedId: 'b',
      onSelect: vi.fn(),
      onFocus: vi.fn(),
      icon: stubIcon,
    },
  });
  flushSync();
  const listbox = target.querySelector('[role="listbox"]')!;
  expect(listbox.getAttribute('aria-activedescendant')).toBe('vm-listrow-b');
  const rowA = target.querySelector('[data-id="a"]')!;
  expect(rowA.getAttribute('aria-selected')).toBe('true');
  expect(rowA.id).toBe('vm-listrow-a');
  unmount(cmp);
});
```

- [ ] **Step 4e.2: Run test — confirm fail**

- [ ] **Step 4e.3: Add `selectedIds` + ARIA attributes**

In `Props`:
```typescript
selectedIds?: ReadonlySet<string>;
focusedId?: string | null;
```

In the row markup:
```svelte
<div
  id="vm-listrow-{row.id}"
  aria-selected={onSelect || onFocus
    ? selectedIds?.has(row.id) || row.layers.state?.selected || false
    : undefined}
  class:is-selected={selectedIds?.has(row.id) || row.layers.state?.selected}
  ...
>
```

On the container:
```svelte
<div
  role={onSelect || onFocus ? 'listbox' : 'list'}
  aria-activedescendant={onSelect || onFocus && focusedId ? `vm-listrow-${focusedId}` : undefined}
  ...
>
```

- [ ] **Step 4e.4: Run test — confirm pass**

#### Sub-task 4f: Stable `getItemKey` via `rowInputVirtualKey`

- [ ] **Step 4f.1: Update `getItemKey` in both `createVirtualizer` and `setOptions`**

In `ViewNodeList.svelte`, replace `getItemKey: (index) => effectiveRows[index]?.id ?? index` with:

```typescript
import { rowInputVirtualKey } from '../../services/serviceExplorerRowInput';

// in createVirtualizer + setOptions:
getItemKey: (index) => rowInputVirtualKey(effectiveRows, index),
```

- [ ] **Step 4f.2: Run all tests — confirm green**

```bash
pnpm test:component
```
Expected: PASS.

#### Sub-task 4g: Wire `list` view mode in `panelExplorer.svelte`

- [ ] **Step 4g.1: Read panelExplorer's existing wiring patterns**

Read `src/components/containers/panelExplorer.svelte:1122-1278` to confirm structure. Read `:130-202` for the derived-state pattern used by tree/grid/cards/markmap/table modes. Note the names of the locals: `handleNodeClick`, `handleSecondaryAction`, `handleTertiaryAction`, `handleContextMenu`, `handleRowKeydown`, `selectedNodeIds`, `selectedNodeMap`, `focusedNodeId`, `selectionService` (verify exact name — likely accessed via `plugin.selectionService` or a local).

- [ ] **Step 4g.2: Add `listRowInputs` and `isListEmpty` derived state**

In `panelExplorer.svelte` near lines 153-202 (alongside `tableRows`, `cardNodes`, etc.), add:

```typescript
import { rowInputFromTreeNode } from '../../services/serviceExplorerRowInput';
import type { ExplorerRowInput } from '../../services/serviceExplorerRowInput';

// ... after tableRows / cardNodes / markmapNodes derived ...
const listRowInputs = $derived.by((): readonly ExplorerRowInput[] => {
  if (viewMode !== 'list') return [];
  // Mirror the tree pattern: prefer the snapshot if available, fall back to direct tree-node conversion.
  const snapshot = filesSnapshot;
  if (snapshot) {
    return snapshot.rows.map((row) => {
      const decorated = decoratedNodeById.get(row.id);
      return rowInputFromSnapshotRow({
        ...row,
        label: decorated?.label ?? row.label,
        node: decorated ?? row.node,
      });
    });
  }
  return nodes.map((node) => rowInputFromTreeNode(node));
});
const isListEmpty = $derived(viewMode === 'list' && listRowInputs.length === 0);
```

If `decoratedNodeById` doesn't extend cleanly to all providers, simplify to:
```typescript
const listRowInputs = $derived(
  viewMode === 'list' ? nodes.map((node) => rowInputFromTreeNode(node)) : [],
);
```

- [ ] **Step 4g.3: Add the `{:else if viewMode === 'list'}` branch**

Between the `markmap` branch and the `table` branch (or after `table`, before the fallback `{:else}`), insert:

```svelte
{:else if viewMode === 'list'}
  <div class="vm-list-container">
    {#if isListEmpty}
      <ViewEmptyLanding state={emptyState} {icon} />
    {:else}
      <ViewNodeList
        rowInputs={listRowInputs}
        canReorder={false}
        selectedIds={selectedNodeIds}
        focusedId={focusedNodeId}
        onSelect={(row, mods) => handleNodeClick(row.node, /* synthesize MouseEvent from mods */ syntheticMouseEvent(mods))}
        onActivate={(row) => handlePrimaryAction(row.node)}
        onFocus={(id) => setFocusedNodeId(id)}
        onContextMenu={(event, row) => handleContextMenu(row.node, event, [])}
        onAction={(action, row) => handleRowAction(action, row.node)}
        {icon}
      />
    {/if}
  </div>
```

Adjust the handler names + arguments to match what `panelExplorer.svelte` already exposes. The wiring above is illustrative — read the `<ViewTree …/>` mount at ~:1124 and the `<ViewNodeTable …/>` mount at ~:1247 to copy the exact local names. In particular:
- `handleNodeClick` likely takes `(node, event)` — adapt `onSelect` accordingly. If the panel's handler expects a real `MouseEvent`, synthesize via `new MouseEvent('click', { ctrlKey: mods.ctrl, shiftKey: mods.shift, altKey: mods.alt })`, OR add a small adapter helper.
- `setFocusedNodeId` may not exist as a separate function; it may live on the selection service. Use whatever the existing tree/table use.

- [ ] **Step 4g.4: Add `.vm-list-container` CSS**

Search `src/styles/` for `.vm-tree-container` to find the panel's SCSS partial. Add `.vm-list-container { height: 100%; display: flex; flex-direction: column; }` alongside the existing container styles (mirror the structure).

- [ ] **Step 4g.5: Run tests and panel smoke**

```bash
pnpm test:component
pnpm check
```
Expected: PASS / no type errors.

#### Sub-task 4h: Integration test for `list` view mode

- [ ] **Step 4h.1: Add a `list` mode scenario to `reactiveExplorers.test.ts` (or a new file)**

Add at the bottom of `test/component/reactiveExplorers.test.ts`:

```typescript
describe('panelExplorer list view mode', () => {
  it('renders list mode when viewMode = list and provider has nodes', () => {
    // Reuse existing helpers to construct a panelExplorer with a Files provider
    const target = mountPanelExplorerWithFiles({
      viewMode: 'list',
      files: [mockTFile('a.md'), mockTFile('b.md')],
    });
    flushSync();
    const listbox = target.querySelector('.vm-list-container [role]');
    expect(listbox).toBeTruthy();
    expect(target.querySelectorAll('.vm-list-container [data-id]').length).toBe(2);
    unmountTarget(target);
  });

  it('falls to empty state when list mode has no nodes', () => {
    const target = mountPanelExplorerWithFiles({ viewMode: 'list', files: [] });
    flushSync();
    expect(target.querySelector('.vm-fallback-container, .vm-empty-landing')).toBeTruthy();
    unmountTarget(target);
  });

  it('click on a list row dispatches selection through selectionService', () => {
    const target = mountPanelExplorerWithFiles({
      viewMode: 'list',
      files: [mockTFile('a.md'), mockTFile('b.md')],
    });
    flushSync();
    const rowA = target.querySelector('[data-id]') as HTMLElement;
    rowA.click();
    flushSync();
    expect(rowA.getAttribute('aria-selected')).toBe('true');
    unmountTarget(target);
  });
});
```

The `mountPanelExplorerWithFiles` / `unmountTarget` helpers are illustrative — replicate the panel-mounting pattern already used by other integration scenarios in `reactiveExplorers.test.ts` (or create a small helper if absent). Read the file's existing `describe` blocks for the canonical mount + cleanup pattern.

- [ ] **Step 4h.2: Run integration tests**

```bash
pnpm test:component
```
Expected: PASS.

- [ ] **Step 4h.3: Commit (consolidates 4a–4h)**

```bash
git add src/components/views/ViewNodeList.svelte \
        src/components/containers/panelExplorer.svelte \
        src/styles/<panel-styles-file>.scss \
        test/component/ViewNodeList.test.ts \
        test/component/reactiveExplorers.test.ts
git commit -m "feat(0-h): add Explorer-mode callback surface + wire list view mode

Step 4 of EDP-009 G4 / 0-H. ViewNodeList gains onSelect, onActivate,
onFocus, onContextMenu, selectedIds, and focusedId props. Container
role switches between listbox (when Explorer-mode callbacks are wired)
and list (widget mode); rows toggle between option and listitem
correspondingly. Keyboard nav: Arrow/Home/End/PageUp/PageDown move
focus, Enter activates, Space selects. Auto-scrolls to externally-
controlled focusedId. Stable virtualizer keys via rowInputVirtualKey
from serviceExplorerRowInput.

panelExplorer.svelte wires the previously-unwired list view mode in
its view-mode switch, builds listRowInputs from the files snapshot
(or direct tree-node conversion as fallback), and routes callbacks
through the existing selection / activation / context-menu locals.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 5: Remove back-compat + delete dead code

**Goal:** Drop the legacy `model` prop from `ViewNodeList`. Delete `viewGrid.svelte` and `serviceVirtualizer.svelte.ts`.

**Files:**
- Modify: `src/components/views/ViewNodeList.svelte` (remove `model` prop + adapter)
- Modify: `test/component/ViewNodeList.test.ts` (remove back-compat tests)
- Delete: `src/components/views/viewGrid.svelte`
- Delete: `src/services/serviceVirtualizer.svelte.ts`

- [ ] **Step 5.1: Pre-delete safety grep**

```bash
git -C "$(git rev-parse --show-toplevel)" grep -E "serviceVirtualizer\\.svelte|viewGrid\\.svelte" -- src/ test/
```
Expected: ZERO matches in `src/` and `test/`. Matches in `.agents/docs/` are acceptable (historical references).

If any match remains in `src/` or `test/`, address it (likely an unused import) before continuing.

- [ ] **Step 5.2: Remove `model` prop and back-compat adapter from `ViewNodeList`**

In `src/components/views/ViewNodeList.svelte`:

- Remove `model?: ExplorerRenderModel<NodeBase>` from the `Props` interface.
- Remove the `effectiveRows`, `effectiveCanReorder`, `effectiveRowHeight` derived values; replace with direct prop references:

```typescript
let { rowInputs = [], canReorder = false, onAction, onReorder, onSelect, onActivate, onFocus, onContextMenu, selectedIds, focusedId, icon }: Props = $props();

const rowCount = $derived(rowInputs.length);
const ROW_HEIGHT = 32; // constant; per-consumer override deferred per spec shard 03
```

- Replace every reference to `effectiveRows` with `rowInputs`.
- Replace `effectiveCanReorder` with `canReorder`.
- Replace `effectiveRowHeight` with `ROW_HEIGHT`.

- [ ] **Step 5.3: Update `ViewNodeList.test.ts` to remove back-compat tests**

Remove the `'accepts model prop (back-compat)'` test added in Task 3 (or whatever name was used). Keep all other tests.

- [ ] **Step 5.4: Run tests**

```bash
pnpm test:component
pnpm check
```
Expected: PASS / no type errors.

- [ ] **Step 5.5: Delete `viewGrid.svelte`**

```bash
git rm src/components/views/viewGrid.svelte
```

Re-grep to verify no consumer:
```bash
git grep "viewGrid" -- src/ test/
```
Expected: ZERO matches.

- [ ] **Step 5.6: Delete `serviceVirtualizer.svelte.ts`**

```bash
git rm src/services/serviceVirtualizer.svelte.ts
```

Re-grep:
```bash
git grep -E "serviceVirtualizer|from .*serviceVirtualizer" -- src/ test/
```
Expected: ZERO matches in `src/` and `test/`.

- [ ] **Step 5.7: Run full gate**

```bash
pnpm verify
```
Expected: PASS — lint + check + build + test:unit + test:component all green.

- [ ] **Step 5.8: Commit**

```bash
git add -A src/components/views/ViewNodeList.svelte test/component/ViewNodeList.test.ts
git status # confirm viewGrid.svelte and serviceVirtualizer.svelte.ts show as deleted
git commit -m "chore(0-h): remove back-compat model prop + delete dead virtualizer

Step 5 of EDP-009 G4 / 0-H. ViewNodeList now accepts only rowInputs;
the legacy model prop and its internal adapter are removed. Deletes
viewGrid.svelte (dead; zero refs in src/ and test/) and
serviceVirtualizer.svelte.ts (no remaining consumers after Tasks 1-4).

Net: -2 files, -1 virtualization codepath. The Explorer now runs on
a single virtualizer (@tanstack/svelte-virtual) across all five view
modes.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 6: Performance + cross-theme + foul-detection verification

**Goal:** Confirm no perf regression vs Task 0 baseline. Smoke-test the 5 Vaultman themes. Verify `serviceFoulDetection` still passes.

**Files:**
- Test: `test/component/ViewNodeList.test.ts` (cross-theme + stress tests)
- Modify: `.agents/docs/work/hardening/plans/2026-05-15-explorer-0-h-virtualizer-list-mode/perf-baseline.md` (append post-migration measurements)

- [ ] **Step 6.1: Run perfProbe post-migration**

Run the same `perfProbe.ts` invocation as Task 0. Capture numbers per scenario. Append to `perf-baseline.md`:

```markdown
## Post-migration measurement

Captured: <ISO date>
Branch: claude/explorer @ <commit after Task 5>

| Scenario           | Wall clock (ms) | Δ vs baseline | Jank frames | Δ vs baseline | Status |
|--------------------|-----------------|---------------|-------------|---------------|--------|
| tree-scroll        |                 | +X%           |             | +Y            | PASS/FAIL |
| operation-badges   |                 | …             |             | …             | …      |
| filter-select      |                 | …             |             | …             | …      |
| filters-search     |                 | …             |             | …             | …      |
```

Threshold: regression > +10% wall clock OR +5% jank frames in any scenario → INVESTIGATE before declaring 0-H done. Acceptable regressions are documented inline with rationale.

- [ ] **Step 6.2: Large-list stress test**

Add to `test/component/ViewNodeList.test.ts`:

```typescript
it.each([1_000, 10_000, 50_000])('renders %d rows without crashing', (n) => {
  const rowInputs = Array.from({ length: n }, (_, i) =>
    rowInputFromViewRow(row(`r${i}`, `Row ${i}`, '', [])),
  );
  const target = document.createElement('div');
  document.body.appendChild(target);
  const cmp = mount(ViewNodeList, { target, props: { rowInputs, icon: stubIcon } });
  flushSync();
  // Virtualization: only ~overscan rows actually rendered, regardless of n
  const rendered = target.querySelectorAll('[role="listitem"], [role="option"]');
  expect(rendered.length).toBeLessThan(50);
  unmount(cmp);
});
```

- [ ] **Step 6.3: Queue stress test**

In `reactiveExplorers.test.ts`, add a test that loads 1000 queue ops and asserts the panel still mounts + responds:

```typescript
it('renders 1000 queue ops without crashing', () => {
  const ops = Array.from({ length: 1000 }, (_, i) => makeQueueChange(`op-${i}`));
  const queue = mountQueueWithFixture(ops);
  flushSync();
  expect(queue.container.querySelectorAll('[data-id]').length).toBeGreaterThan(0); // virtualized
  expect(queue.container.querySelectorAll('[data-id]').length).toBeLessThan(50);
  unmount(queue);
});
```

- [ ] **Step 6.4: Cross-theme smoke**

```typescript
it.each(['vm-theme-default', 'vm-theme-native', 'vm-theme-polish', 'vm-theme-glass', 'vm-theme-custom'])(
  'renders without breaking layout under %s',
  (themeClass) => {
    document.body.classList.add(themeClass);
    const rowInputs = [rowInputFromViewRow(row('a', 'A', '', []))];
    const target = document.createElement('div');
    document.body.appendChild(target);
    const cmp = mount(ViewNodeList, { target, props: { rowInputs, icon: stubIcon } });
    flushSync();
    const rowEl = target.querySelector('[data-id="a"]') as HTMLElement;
    expect(rowEl).toBeTruthy();
    // Smoke: row has non-zero rendered dimensions (no display:none accidents)
    const rect = rowEl.getBoundingClientRect();
    expect(rect.width).toBeGreaterThan(0);
    unmount(cmp);
    document.body.classList.remove(themeClass);
  },
);
```

- [ ] **Step 6.5: serviceFoulDetection smoke**

If `serviceFoulDetection.svelte.ts` exposes a test-friendly entry point (search for `checkDomMimicry` export), add:

```typescript
it('foul-detection passes for queue rendering under thin+native mode', () => {
  document.body.classList.add('vm-mode-thin', 'vm-id-native');
  const queue = mountQueueWithFixture(/* small queue */);
  flushSync();
  // Trigger foul check
  const result = checkDomMimicry(); // or whatever the entry point is
  expect(result.fouls.filter((f) => f.kind === 'dom-mimicry').length).toBe(0);
  unmount(queue);
  document.body.classList.remove('vm-mode-thin', 'vm-id-native');
});
```

If no exported entry point exists, skip this test and note it in the post-migration measurement doc.

- [ ] **Step 6.6: Run all tests**

```bash
pnpm verify
```
Expected: PASS.

- [ ] **Step 6.7: Commit**

```bash
git add test/component/ViewNodeList.test.ts \
        test/component/reactiveExplorers.test.ts \
        .agents/docs/work/hardening/plans/2026-05-15-explorer-0-h-virtualizer-list-mode/perf-baseline.md
git commit -m "test(0-h): perf + stress + cross-theme + foul-detection verification

Final verification for EDP-009 G4 / 0-H. Stress-tests ViewNodeList at
1k/10k/50k rows (virtualizer renders ~overscan count regardless),
stress-tests the queue surface at 1000 ops, smokes all 5 vm-theme-*
classes, and (if checkDomMimicry is exposed) confirms serviceFoulDetection
passes under vm-mode-thin + vm-id-native. perf-baseline.md updated with
post-migration measurements.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Self-review checklist (executor — run BEFORE declaring done)

1. **All seven open items resolved** — review spec shard 07 O1-O7; each should have either a concrete Task step or a recorded answer.
2. **Per-provider activate matrix audited** — for each of the 7 providers, confirm the `onActivate(node)` body either exists in current `panelExplorer.svelte` dispatch or has been added in Task 4g (trivial cases: Plugins/Snippets toggle) or explicitly deferred to a follow-up spec (non-trivial: Tags/Props filter integration, Properties value editor). Document deferrals in the commit messages or a follow-up issue.
3. **No `viewList` references in production code** — `git grep "viewList"` in `src/` and `test/` returns zero matches.
4. **No `serviceVirtualizer` references in production code** — same grep, zero matches.
5. **No `viewGrid` references in production code** — same.
6. **DOM snapshots match for queue + active-filters** — Task 0's snapshot test passes against Task 5's final state (byte-identical render).
7. **Full gate green** — `pnpm verify` passes.
8. **Performance within threshold** — Task 6's measurements vs Task 0 baseline.

---

## Execution handoff

Plan complete. Saved to
`.agents/docs/work/hardening/plans/2026-05-15-explorer-0-h-virtualizer-list-mode/index.md`.

Two execution options:

1. **Subagent-driven (recommended)** — Fresh subagent per task with two-stage review between tasks. Faster iteration; isolated context per task. Uses `superpowers:subagent-driven-development`.
2. **Inline execution** — Execute tasks in the current session using `superpowers:executing-plans`. Batch execution with checkpoints for review.

If subagent-driven, the parent agent dispatches Task 0 → reviews output → dispatches Task 1 → reviews → ... → Task 6 → final verification.

If inline, the executing agent reads this plan and works task-by-task with periodic check-ins.

**Recommendation:** given context budget on the current session and the spec/plan are now committed as canonical artifacts, start execution in a fresh session. Bootstrap prompt:

> Implement the 0-H plan at `.agents/docs/work/hardening/plans/2026-05-15-explorer-0-h-virtualizer-list-mode/index.md` against the canonical branch `claude/explorer` (worktree `.claude/worktrees/jovial-wilson-f81c67`). Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`. The spec is at the sibling `specs/2026-05-15-explorer-0-h-virtualizer-list-mode/` folder. Read the spec's `index.md` + `03-api-contract.md` + `04-panelexplorer-wiring.md` + `07-risks-and-open-items.md` before starting Task 1. All file paths, line numbers, and code snippets in the plan have been ground-truthed against `claude/explorer` at the time of writing; verify they still hold at the start of each task.
