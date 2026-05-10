---
title: Shard 2 - Data Grid & Virtualization (Exhaustive)
type: research-shard
parent: "[[docs/work/research/2026-05-10-vaultman-codebase-recognition/index|index]]"
created: 2026-05-10
---

# Shard 2: Data Grid & Virtualization

## Current State Analysis

The heart of Vaultman is its high-performance list and grid rendering, powered by a sophisticated integration between **TanStack Table**, **TanStack Virtual**, and a custom **View Size Service**.

### 1. View Size Presets (`src/services/serviceViewSize.ts`)
Vaultman supports dynamic scaling of UI elements through presets. This service bridges structural logic with CSS variables.

```typescript
// serviceViewSize.ts - The Sizing Contract
export const VIEW_SIZE_PRESETS: Record<ViewSizePresetId, ViewSizePreset> = {
	medium: {
		id: 'medium',
		tileWidth: 128,
		tileHeight: 72,
		iconSize: 24,
		labelLineClamp: 1,
		gap: 8,
		treeRowHeight: 28,
		treeIconSize: 16,
		treeToggleSize: 20,
	},
    // ...
};

// Transversal Injection: Converts presets to CSS variables
export function viewSizeCssVars(preset: ViewSizePreset): string {
	return [
		`--vm-node-grid-tile-w: ${preset.tileWidth}px`,
		`--vm-node-grid-tile-h: ${preset.tileHeight}px`,
		// ...
	].join('; ');
}
```

### 2. Table Logic & Adapter (`src/services/serviceViewTableAdapter.ts`)
The table adapter is responsible for the mapping between the hierarchical node tree and the flat view required by TanStack Table.

**Column Definitions:**
```typescript
const FILE_NODE_TABLE_COLUMNS: readonly ViewColumn<TreeNode>[] = [
	{ id: 'label', label: 'Name', icon: 'lucide-file', sortable: true, minWidth: 180 },
	{ id: 'fileType', label: 'Type', icon: 'lucide-file-type', sortable: true, minWidth: 88, getValue: (node) => fileTypeForNode(node) },
	{ id: 'path', label: 'Path', icon: 'lucide-folder-tree', sortable: true, minWidth: 220, getValue: (node) => filePathForNode(node) },
];
```

### 3. The Rendering Shell (`ViewNodeTable.svelte`)
The table rendering uses absolute positioning for virtualization. This is a critical invariant that must survive the shadcn transition.

```svelte
<!-- ViewNodeTable.svelte Virtualization Core -->
<script lang="ts">
    const rowVirtualizer = createVirtualizer<HTMLDivElement, HTMLDivElement>({
		count: tableRows.length,
		getScrollElement: () => outerEl ?? null,
		estimateSize: () => TABLE_ROW_HEIGHT, // Current: Fixed 32px
        // ...
	});
</script>

<div class="vm-node-table-inner" style:--vm-node-table-total-h={`${totalHeight}px`}>
    {#each renderedRows as virtualRow (virtualRow.key)}
        <div 
            class="vm-node-table-row" 
            style:--vm-node-table-y={`${virtualRow.start}px`}
        >
            <!-- Cell content -->
        </div>
    {/each}
</div>
```

### 4. Transition Friction: Table Component Integration
- **shadcn-svelte `Table`:** The standard shadcn `Table` component is designed for static or standard scrolling lists. Integrating it with `TanStack Virtual` requires replacing the `TableBody` with a custom virtualized container that maintains the absolute positioning (`top: ${virtualRow.start}px`) for each row.
- **Dynamic Height (Pretext):** The current `estimateSize` is a hardcoded constant. The transition to `shadcn-svelte` allows for multiline cells, necessitating the integration of `pretextjs` to calculate accurate heights without DOM reflows.

### 5. Implementation Sharding Vector
The "Beta" sub-agent must:
1.  **Port ViewNodeTable:** Replace `.vm-node-table-*` classes with shadcn table utilities (`tw-table-auto`, `tw-border-collapse`).
2.  **Preserve Virtualization:** Ensure the `div` wrapper for `TableRow` continues to use the `virtualRow.start` logic.
3.  **Sync ViewSizeService:** Update `viewSizeCssVars` to possibly use Tailwind arbitrary values or maintain CSS variables that Tailwind classes can consume.
