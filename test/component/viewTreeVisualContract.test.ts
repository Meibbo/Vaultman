import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import ViewTree from '../../src/components/views/viewTree.svelte';
import type { FileMeta, TreeNode } from '../../src/types/typeNode';

describe('ViewTree visual contracts', () => {
	let target: HTMLDivElement;
	let app: ReturnType<typeof mount> | null = null;

	beforeEach(() => {
		target = document.createElement('div');
		document.body.appendChild(target);
		vi.stubGlobal(
			'ResizeObserver',
			class {
				observe(): void {}
				disconnect(): void {}
			},
		);
	});

	afterEach(() => {
		if (app) {
			void unmount(app);
			app = null;
		}
		target.remove();
		vi.unstubAllGlobals();
	});

	function renderTree(
		nodes: TreeNode[],
		props: Partial<{
			providerId: string;
			visibleFields: readonly string[];
			selectedIds: Set<string>;
			activeFilterIds: Set<string>;
			focusedId: string | null;
		}> = {},
	) {
		app = mount(ViewTree as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				nodes,
				expandedIds: new Set<string>(),
				onToggle: vi.fn(),
				onRowClick: vi.fn(),
				onContextMenu: vi.fn(),
				icon: vi.fn(() => ({ update: vi.fn() })),
				...props,
			},
		});
		flushSync();
	}

	it('keeps selected and filtered state classes mirrored on rows and surfaces', () => {
		renderTree(
			[
				{ id: 'selected', label: 'Selected', depth: 0, meta: {} },
				{ id: 'filtered', label: 'Filtered', depth: 0, meta: {} },
				{ id: 'combined', label: 'Combined', depth: 0, meta: {} },
			],
			{
				selectedIds: new Set(['selected', 'combined']),
				activeFilterIds: new Set(['filtered', 'combined']),
			},
		);

		const selected = rowById('selected');
		const selectedSurface = surfaceFor(selected);
		const filtered = rowById('filtered');
		const filteredSurface = surfaceFor(filtered);
		const combined = rowById('combined');
		const combinedSurface = surfaceFor(combined);

		expect(selected.classList.contains('is-selected')).toBe(true);
		expect(selectedSurface.classList.contains('is-selected')).toBe(true);
		expect(filtered.classList.contains('is-active-filter')).toBe(true);
		expect(filteredSurface.classList.contains('is-active-filter')).toBe(true);
		expect(combined.classList.contains('is-selected')).toBe(true);
		expect(combined.classList.contains('is-active-filter')).toBe(true);
		expect(combinedSurface.classList.contains('is-selected')).toBe(true);
		expect(combinedSurface.classList.contains('is-active-filter')).toBe(true);
	});

	it('renders non-markdown extensions while keeping markdown extensions out of the row text', () => {
		renderTree(
			[
				fileNode('Docs/manual.pdf', 'Manual', 'pdf'),
				fileNode('Notes/note.md', 'Note', 'md'),
			],
			{ providerId: 'files' },
		);

		const pdf = rowById('Docs/manual.pdf');
		const markdown = rowById('Notes/note.md');

		expect(pdf.querySelector('[data-node-field="ext"]')?.textContent).toBe('pdf');
		expect(markdown.querySelector('[data-node-field="ext"]')).toBeNull();
		expect(markdown.textContent).not.toContain('md');
	});

	it('keeps the extension field visually separated at the trailing edge', () => {
		const source = readFileSync('src/styles/explorer/_virtual-list.scss', 'utf8');
		const fieldZoneBlock = cssBlock(source, '.vm-tree-field-zone');

		expect(fieldZoneBlock).toMatch(/margin-left:\s*auto|justify-content:\s*flex-end/);
		expect(fieldZoneBlock).toContain('flex: 0 0 auto');
	});

	it('uses a translucent accent filter marker without replacing the selected row background', () => {
		const source = readFileSync('src/styles/explorer/_virtual-list.scss', 'utf8');
		const activeFilterBlock = cssBlock(source, '.vm-tree-row-surface.is-active-filter');
		const selectedFilterBlock = cssBlock(source, '.vm-tree-row-surface.is-active-filter.is-selected');

		expect(activeFilterBlock).toContain('color-mix(in srgb, var(--interactive-accent)');
		expect(activeFilterBlock).not.toContain('background: var(--interactive-accent)');
		expect(activeFilterBlock).toContain('inset 3px 0');
		expect(selectedFilterBlock).toContain('var(--text-faint)');
		expect(selectedFilterBlock).toContain('inset 3px 0');
	});

	function rowById(id: string): HTMLElement {
		const row = Array.from(target.querySelectorAll<HTMLElement>('[data-id]')).find(
			(element) => element.dataset.id === id,
		);
		expect(row).toBeTruthy();
		return row!;
	}

	function surfaceFor(row: HTMLElement): HTMLElement {
		return row.querySelector('.vm-tree-row-surface') as HTMLElement;
	}
});

function fileNode(id: string, label: string, extension: string): TreeNode<FileMeta> {
	return {
		id,
		label,
		depth: 0,
		meta: {
			file: {
				path: id,
				name: `${label}.${extension}`,
				basename: label,
				extension,
			} as FileMeta['file'],
			isFolder: false,
			folderPath: '',
		},
	};
}

function cssBlock(source: string, selector: string): string {
	const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	return source.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\n\\t\\t\\}`))?.[1] ?? '';
}
