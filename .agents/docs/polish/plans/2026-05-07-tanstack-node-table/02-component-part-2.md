---
title: TanStack node table component part 2
type: implementation-plan
status: active
parent: "[[docs/work/polish/plans/2026-05-07-tanstack-node-table/index|tanstack-node-table-plan]]"
created: 2026-05-07T08:26:53
updated: 2026-05-07T08:26:53
tags:
  - agent/plan
  - initiative/polish
  - table
  - svelte
created_by: codex
updated_by: codex
---

# ViewNodeTable Component Part 2

Continuation of [[docs/work/polish/plans/2026-05-07-tanstack-node-table/02-component|ViewNodeTable component]].

- [ ] **Step 4: Create `ViewNodeTable.svelte`**

Create a Svelte 5 component with this public prop contract:

```ts
interface Props<TNode extends NodeBase = NodeBase> {
	rows: ViewRow<TNode>[];
	columns: ViewColumn<TNode>[];
	selectedIds?: ReadonlySet<string>;
	focusedId?: string | null;
	activeId?: string | null;
	onRowClick: (id: string, e: MouseEvent) => void;
	onPrimaryAction?: (id: string, e: MouseEvent) => void;
	onContextMenu: (id: string, e: MouseEvent) => void;
	onRowKeydown?: (id: string, e: KeyboardEvent) => void;
	onSelectAll?: (ids: string[], e: Event) => void;
	icon: (node: HTMLElement, name: string) => { update(n: string): void };
}
```

Implementation requirements:

- import `createTable`, `getCoreRowModel`, `getSortedRowModel`,
  `functionalUpdate`, and `type SortingState` from `@tanstack/table-core`;
- import `createVirtualizer` from `@tanstack/svelte-virtual`;
- derive `rowSelection` from `selectedIds`;
- set `getRowId: (row) => row.id`;
- use `buildNodeTableColumnDefs(columns)`;
- render root `.vm-node-table` with `role="grid"` and
  `aria-multiselectable="true"`;
- render header buttons with `data-vm-table-header={header.column.id}`;
- render body rows with `data-id={row.id}`, `role="row"`, `aria-selected`,
  `is-selected`, `is-focused`, and `is-active-node`;
- render cells with `role="gridcell"` and `data-vm-table-cell`;
- call parent callbacks for row click, primary action, row keydown, and context
  menu;
- keep row virtualization local to the component.

- [ ] **Step 5: Run Svelte autofixer on the component**

Run:

```powershell
npx @sveltejs/mcp svelte-autofixer .\src\components\views\ViewNodeTable.svelte --svelte-version 5
```

Expected: no blocking Svelte 5 issues remain. Apply any concrete fixes before
continuing.

- [ ] **Step 6: Run the component test until it passes**

Run:

```powershell
pnpm exec vp test run --project component --config vitest.config.ts test/component/viewTableSelection.test.ts --fileParallelism=false
```

Expected: `viewTableSelection.test.ts` passes.
