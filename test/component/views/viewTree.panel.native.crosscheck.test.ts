import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, type Component } from 'svelte';
import { withContext } from '../_helpers/withContext';
import ViewTree from '../../../src/components/views/viewTree.svelte';
import type { TreeNode } from '../../../src/types/typeNode';
import { iconStub, makeMask, maskContext, resizeObserverStub } from './nodeElementMaskTestHelpers';
import { nativePresetContext } from './nativeClassEmissionTestHelpers';

const nodes: TreeNode[] = [
	{
		id: 'root',
		label: 'Projects',
		depth: 0,
		meta: {},
		icon: 'lucide-folder',
		children: [
			{
				id: 'archive',
				label: 'Archive',
				depth: 1,
				meta: {},
				icon: 'lucide-folder',
				children: [{ id: 'old', label: 'Old.md', depth: 2, meta: {}, icon: 'lucide-file' }],
			},
			{ id: 'alpha', label: 'Alpha.md', depth: 1, meta: {}, icon: 'lucide-file' },
		],
	},
];

describe('viewTree - native preset cross-check vs obsidian-web-lab', () => {
	let target: HTMLDivElement;
	let app: { destroy(): void } | null = null;

	beforeEach(() => {
		target = document.createElement('div');
		document.body.appendChild(target);
		vi.stubGlobal('ResizeObserver', resizeObserverStub);
	});

	afterEach(() => {
		app?.destroy();
		app = null;
		target.remove();
		vi.unstubAllGlobals();
	});

	it('emits the same structural class set on tree rows as obsidian core file-explorer', () => {
		const fixture = readFileSync(
			resolve(process.cwd(), 'test/fixtures/obsidian-web-lab/file-explorer-tree.html'),
			'utf-8',
		);
		const expectedClasses = new Set<string>();
		fixture.replace(/class="([^"]+)"/g, (_, classes: string) => {
			classes.split(/\s+/).forEach((className) => expectedClasses.add(className));
			return _;
		});

		app = withContext(
			target,
			ViewTree as unknown as Component<Record<string, unknown>>,
			{
				nodes,
				expandedIds: new Set<string>(['root']),
				onToggle: vi.fn(),
				onRowClick: vi.fn(),
				onContextMenu: vi.fn(),
				icon: iconStub(),
			},
			[...nativePresetContext(), ...maskContext(makeMask())],
		);
		flushSync();

		const actualClasses = new Set<string>();
		target.querySelectorAll('*').forEach((el) => {
			el.classList.forEach((className) => actualClasses.add(className));
		});

		for (const className of [
			'tree-item',
			'tree-item-self',
			'tree-item-inner',
			'tree-item-children',
			'collapse-icon',
		]) {
			expect(expectedClasses.has(className), `Fixture missing '${className}'`).toBe(true);
			expect(actualClasses.has(className), `Missing native class '${className}'`).toBe(true);
		}
	});
});
