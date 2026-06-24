---
title: TanStack node table dependency and adapter
type: implementation-plan
status: active
parent: "[[docs/work/polish/plans/2026-05-07-tanstack-node-table/index|tanstack-node-table-plan]]"
created: 2026-05-07T08:26:53
updated: 2026-05-07T08:26:53
tags:
  - agent/plan
  - initiative/polish
  - table
  - tanstack
created_by: codex
updated_by: codex
---

# Dependency And Adapter

## Purpose

Add stable TanStack Table Core and start the pure adapter test loop.

Continuation: [[docs/work/polish/plans/2026-05-07-tanstack-node-table/01-dependency-adapter-part-2|Dependency and adapter part 2]]

## Files

- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Create: `src/services/serviceViewTableAdapter.ts`
- Create: `test/unit/services/serviceViewTableAdapter.test.ts`

## Task 1: Adapter Tests And Dependency

- [ ] **Step 1: Write the failing adapter test**

Create `test/unit/services/serviceViewTableAdapter.test.ts` with these cases:

```ts
import { describe, expect, it } from 'vitest';
import type { RowSelectionState } from '@tanstack/table-core';
import {
	DEFAULT_NODE_TABLE_COLUMNS,
	buildNodeTableColumnDefs,
	nodeRowsFromTree,
	rowSelectionFromSnapshot,
	rowSelectionIds,
	resolveRowSelectionUpdate,
} from '../../../src/services/serviceViewTableAdapter';
import type { NodeSelectionSnapshot } from '../../../src/types/typeSelection';
import type { TreeNode } from '../../../src/types/typeNode';

const tree: TreeNode[] = [
	{
		id: 'parent',
		label: 'Parent',
		depth: 0,
		meta: {},
		count: 2,
		children: [{ id: 'child', label: 'Child', depth: 1, meta: {}, icon: 'lucide-file' }],
	},
];

describe('serviceViewTableAdapter', () => {
	it('flattens tree nodes into stable table rows with default cells', () => {
		const rows = nodeRowsFromTree(tree);

		expect(rows.map((row) => row.id)).toEqual(['parent', 'child']);
		expect(rows[0].cells.map((cell) => [cell.columnId, cell.display])).toEqual([
			['label', 'Parent'],
			['detail', ''],
			['count', '2'],
		]);
		expect(rows[1].depth).toBe(1);
		expect(rows[1].icon).toBe('lucide-file');
	});

	it('builds TanStack column definitions from Vaultman columns', () => {
		const defs = buildNodeTableColumnDefs(DEFAULT_NODE_TABLE_COLUMNS);

		expect(defs.map((column) => column.id)).toEqual(['label', 'detail', 'count']);
		expect(defs[0].enableSorting).toBe(true);
		expect(defs[1].enableSorting).toBe(false);
		expect(defs[0].accessorFn?.(nodeRowsFromTree(tree)[0], 0)).toBe('Parent');
	});

	it('converts node selection snapshots to row selection state', () => {
		const snapshot: NodeSelectionSnapshot = {
			ids: new Set(['parent', 'child']),
			anchorId: 'parent',
			focusedId: 'child',
			hoveredId: null,
			activeId: 'child',
		};

		expect(rowSelectionFromSnapshot(snapshot)).toEqual({ parent: true, child: true });
	});

	it('resolves TanStack row selection updates without losing stable ids', () => {
		const previous: RowSelectionState = { parent: true };
		const next = resolveRowSelectionUpdate((state) => ({ ...state, child: true }), previous);

		expect(rowSelectionIds(next)).toEqual(['parent', 'child']);
	});
});
```

- [ ] **Step 2: Run the failing unit test**

Run:

```powershell
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceViewTableAdapter.test.ts
```

Expected: fail because `@tanstack/table-core` or
`src/services/serviceViewTableAdapter.ts` is missing.

- [ ] **Step 3: Install TanStack Table Core**

Run:

```powershell
pnpm add -D @tanstack/table-core@8.21.3
```

Expected: `package.json` and `pnpm-lock.yaml` change, and npm installs version
`8.21.3`.
