---
title: U121-010 plan — Tree projection
type: plan
status: active
parent: "[[docs/work/polish/plans/2026-07-30-u121-010-glyph-color-projection/index|U121-010 plan]]"
created: 2026-07-30T00:00:00
updated: 2026-07-30T00:00:00
created_by: codex-gpt5-root
updated_by: codex-gpt5-root
tags:
  - agent/plan
  - initiative/polish
  - release/1.2.1
  - explorer/files
  - glyph-color
---

# Tree projection

### Task 3: Fix Tree distribution and expansion refresh

**Files:**

- Create: `test/unit/explorerGlyphProjection.test.ts`
- Modify: `src/components/containers/explorerFiles.ts`

- [ ] **Step 1: Write the failing Tree behavior tests**

Create a focused test that imports `FilesExplorerPanel`, constructs a private
method harness with `Object.create(FilesExplorerPanel.prototype)`, and uses this
structural node type:

```ts
import { describe, expect, it, vi } from 'vitest';

import { FilesExplorerPanel } from '../../src/components/containers/explorerFiles';

interface TestNode {
	icon?: string;
	iconColor?: string;
	labelColor?: string;
	meta: {
		isFolder: boolean;
		folderPath: string;
		file?: { path: string };
	};
	children?: TestNode[];
}

interface PrivatePanel {
	plugin: {
		settings: {
			explorerGlyphColor: string;
			explorerGlyphCustomColor: string;
			explorerGlyphScope: string;
		};
	};
	expandedIds: Set<string>;
	bubbleIndex: { nodesById: Map<string, TestNode> } | null;
	_resolveFileIcon: ReturnType<typeof vi.fn>;
	_decorateTreeWithIcons(nodes: TestNode[]): void;
	_refreshFolderIcon(id: string): void;
}

function makePanel(
	scope: 'folders' | 'files' | 'both',
): PrivatePanel {
	const panel = Object.create(
		FilesExplorerPanel.prototype,
	) as PrivatePanel;
	panel.plugin = {
		settings: {
			explorerGlyphColor: 'rainbow',
			explorerGlyphCustomColor: '#123456',
			explorerGlyphScope: scope,
		},
	};
	panel.expandedIds = new Set<string>();
	panel.bubbleIndex = null;
	panel._resolveFileIcon = vi.fn(
		(_path: string, _isFolder: boolean, defaultIcon: string) => ({
			icon: defaultIcon,
		}),
	);
	return panel;
}
```

Add one test that decorates:

```ts
const rootFile: TestNode = {
	meta: {
		isFolder: false,
		folderPath: '',
		file: { path: 'Alpha.md' },
	},
};
const childFile: TestNode = {
	meta: {
		isFolder: false,
		folderPath: 'Projects',
		file: { path: 'Projects/Child.md' },
	},
};
const firstFolder: TestNode = {
	meta: { isFolder: true, folderPath: 'Projects' },
	children: [childFile],
};
const secondFolder: TestNode = {
	meta: { isFolder: true, folderPath: 'Reference' },
};
const panel = makePanel('both');

panel._decorateTreeWithIcons([rootFile, firstFolder, secondFolder]);

expect(rootFile.labelColor).toContain('--color-rainbow-10');
expect(firstFolder.labelColor).toContain('--color-rainbow-1');
expect(childFile.labelColor).toBe(firstFolder.labelColor);
expect(secondFolder.labelColor).toContain('--color-rainbow-2');
```

Add a `scope=files` test proving the folder stays uncolored while its child
inherits the branch color. Add the expansion regression:

```ts
const panel = makePanel('folders');
const folder: TestNode = {
	labelColor: 'var(--color-rainbow-10, #ec4899)',
	meta: { isFolder: true, folderPath: 'Projects' },
};
panel.bubbleIndex = { nodesById: new Map([['Projects', folder]]) };
panel.expandedIds.add('Projects');

panel._refreshFolderIcon('Projects');

expect(folder.icon).toBe('lucide-folder-open');
expect(folder.iconColor).toBe(folder.labelColor);
```

Then change `_resolveFileIcon` to return
`{ icon: 'lucide-folder-open', color: '#abcdef' }` and assert the icon color is
`#abcdef` while `labelColor` remains the glyph color.

- [ ] **Step 2: Run RED**

```powershell
pnpm exec vitest run --config vitest.unit.config.mts test/unit/explorerGlyphProjection.test.ts
```

Expected failures:

- the current global DFS bucket gives the child a different color;
- the first root node starts at slot 1 instead of slot 10;
- `_refreshFolderIcon()` produces `undefined` without an Iconic color.

- [ ] **Step 3: Replace Tree decoration with branch projection**

Update the glyph-color import to use:

```ts
import {
	explorerRainbowGlyphColor,
	normalizeGlyphColorChoice,
	normalizeGlyphColorScope,
	resolveExplorerGlyphColor,
	resolveExplorerGlyphDecoration,
} from '../../logic/logicGlyphColor';
```

Replace `_decorateTreeWithIcons()` with:

```ts
private _decorateTreeWithIcons(nodes: TreeNode<FileMeta>[]): void {
	const rainbow =
		normalizeGlyphColorChoice(
			this.plugin.settings.explorerGlyphColor,
		).choice === 'rainbow';
	const walk = (
		subtree: TreeNode<FileMeta>[],
		inheritedRainbowColor?: string,
	): void => {
		for (const [position, node] of subtree.entries()) {
			const resolved = this._resolveFileIcon(
				node.meta.file?.path ?? node.meta.folderPath,
				node.meta.isFolder,
				node.icon ?? (node.meta.isFolder ? 'lucide-folder' : 'lucide-file'),
			);
			node.icon = resolved?.icon;
			const branchColor = rainbow
				? inheritedRainbowColor ?? explorerRainbowGlyphColor(position)
				: undefined;
			const glyphColor = this._explorerGlyphColorFor(
				node.meta.isFolder,
				position,
				branchColor,
			);
			const decoration = resolveExplorerGlyphDecoration(
				glyphColor,
				resolved?.color,
			);
			node.iconColor = decoration.iconColor;
			node.labelColor = decoration.labelColor;
			if (node.children?.length) walk(node.children, branchColor);
		}
	};
	walk(nodes);
}
```

Replace `_explorerGlyphColorFor()` with:

```ts
private _explorerGlyphColorFor(
	isFolder: boolean,
	position: number,
	inheritedRainbowColor?: string,
): string | null {
	return resolveExplorerGlyphColor({
		choice: normalizeGlyphColorChoice(
			this.plugin.settings.explorerGlyphColor,
		).choice,
		customColor: this.plugin.settings.explorerGlyphCustomColor,
		scope: normalizeGlyphColorScope(
			this.plugin.settings.explorerGlyphScope,
		),
		kind: isFolder ? 'folder' : 'file',
		position,
		inheritedRainbowColor,
	});
}
```

Update `_refreshFolderIcon()` after assigning `node.icon`:

```ts
const decoration = resolveExplorerGlyphDecoration(
	node.labelColor ?? null,
	resolved?.color,
);
node.iconColor = decoration.iconColor;
```

Do not call `_render()` or derive a new tree position during expansion.

- [ ] **Step 4: Run GREEN**

```powershell
pnpm exec vitest run --config vitest.unit.config.mts test/unit/explorerGlyphProjection.test.ts test/unit/glyphColor.test.ts test/unit/badgeBubbling.test.ts
```

Expected: all selected files PASS, including the incremental expansion guard.
