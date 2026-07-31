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

function makePanel(scope: 'folders' | 'files' | 'both'): PrivatePanel {
	const panel = Object.create(
		FilesExplorerPanel.prototype,
	) as unknown as PrivatePanel;
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

describe('U121-010 Files Tree glyph projection', () => {
	it('uses root sibling positions and inherits the top-level branch color', () => {
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

		expect(rootFile.labelColor).toBe('var(--vaultman-rainbow-10)');
		expect(firstFolder.labelColor).toBe('var(--vaultman-rainbow-1)');
		expect(childFile.labelColor).toBe(firstFolder.labelColor);
		expect(secondFolder.labelColor).toBe('var(--vaultman-rainbow-2)');
	});

	it('carries a branch color through an out-of-scope folder to scoped files', () => {
		const childFile: TestNode = {
			meta: {
				isFolder: false,
				folderPath: 'Projects',
				file: { path: 'Projects/Child.md' },
			},
		};
		const folder: TestNode = {
			meta: { isFolder: true, folderPath: 'Projects' },
			children: [childFile],
		};
		const panel = makePanel('files');

		panel._decorateTreeWithIcons([folder]);

		expect(folder.labelColor).toBeUndefined();
		expect(childFile.labelColor).toBe('var(--vaultman-rainbow-10)');
	});

	it('inherits the pastel rainbow color through the whole root branch', () => {
		const childFile: TestNode = {
			meta: {
				isFolder: false,
				folderPath: 'Projects',
				file: { path: 'Projects/Child.md' },
			},
		};
		const folder: TestNode = {
			meta: { isFolder: true, folderPath: 'Projects' },
			children: [childFile],
		};
		const panel = makePanel('both');
		panel.plugin.settings.explorerGlyphColor = 'rainbow-pastel';

		panel._decorateTreeWithIcons([folder]);

		expect(folder.labelColor).toBe('var(--vaultman-rainbow-pastel-10)');
		expect(childFile.labelColor).toBe(folder.labelColor);
	});

	it('preserves the glyph fallback on expansion while Iconic still wins', () => {
		const panel = makePanel('folders');
		const folder: TestNode = {
			labelColor: 'var(--color-rainbow-10, #ec4899)',
			meta: { isFolder: true, folderPath: 'Projects' },
		};
		panel.bubbleIndex = {
			nodesById: new Map([['Projects', folder]]),
		};
		panel.expandedIds.add('Projects');

		panel._refreshFolderIcon('Projects');

		expect(folder.icon).toBe('lucide-folder-open');
		expect(folder.iconColor).toBe(folder.labelColor);

		panel._resolveFileIcon.mockReturnValue({
			icon: 'lucide-folder-open',
			color: '#abcdef',
		});
		panel._refreshFolderIcon('Projects');

		expect(folder.iconColor).toBe('#abcdef');
		expect(folder.labelColor).toBe(
			'var(--color-rainbow-10, #ec4899)',
		);
	});
});
