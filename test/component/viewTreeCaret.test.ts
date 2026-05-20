import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import ViewTree from '../../src/components/views/viewTree.svelte';
import type { TreeNode } from '../../src/types/typeNode';

describe('ViewTree caret hit-target', () => {
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

	it('keeps the branch caret target at least 24 by 24 CSS px', () => {
		const onToggle = vi.fn();
		const onRowClick = vi.fn();
		app = mount(ViewTree as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				nodes: [
					{
						id: 'parent',
						label: 'Parent',
						depth: 0,
						meta: {},
						children: [{ id: 'child', label: 'Child', depth: 1, meta: {} }],
					},
				] satisfies TreeNode[],
				expandedIds: new Set(['parent']),
				onToggle,
				onRowClick,
				onContextMenu: vi.fn(),
				icon: vi.fn(() => ({ update: vi.fn() })),
			},
		});
		flushSync();

		const toggle = target.querySelector<HTMLElement>('.vm-tree-toggle:not(.is-placeholder)');
		expect(toggle).not.toBeNull();
		toggle!.click();
		expect(onToggle).toHaveBeenCalledWith('parent', expect.any(MouseEvent));
		expect(onRowClick).not.toHaveBeenCalled();

		const source = readFileSync('src/styles/explorer/_tree.scss', 'utf8');
		const toggleBlock = source.match(/&-toggle\s*\{[^}]*\}/s)?.[0] ?? '';
		expect(toggleBlock).toContain('min-width: 24px');
		expect(toggleBlock).toContain('min-height: 24px');
	});
});
