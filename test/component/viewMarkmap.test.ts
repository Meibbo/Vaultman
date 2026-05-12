import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import ViewMarkmap from '../../src/components/views/ViewMarkmap.svelte';
import type { TreeNode } from '../../src/types/typeNode';

const nodes: TreeNode[] = [
	{
		id: 'project',
		label: 'Project',
		depth: 0,
		meta: {},
		icon: 'lucide-folder',
		children: [
			{
				id: 'thread',
				label: 'Thread',
				depth: 1,
				meta: {},
				count: 3,
				children: [{ id: 'task', label: 'Task', depth: 2, meta: {}, icon: 'lucide-check' }],
			},
		],
	},
];

describe('ViewMarkmap', () => {
	let target: HTMLDivElement;
	let app: ReturnType<typeof mount> | null = null;

	beforeEach(() => {
		target = document.createElement('div');
		document.body.appendChild(target);
	});

	afterEach(() => {
		if (app) void unmount(app);
		app = null;
		target.remove();
	});

	it('renders a compact mind-map projection from tree nodes', () => {
		app = mount(ViewMarkmap as unknown as Component<Record<string, unknown>>, {
			target,
			props: {
				nodes,
				selectedIds: new Set(['thread']),
				focusedId: 'task',
				onNodeClick: vi.fn(),
				onNodeKeydown: vi.fn(),
				icon: vi.fn(() => ({ update: vi.fn() })),
			},
		});
		flushSync();

		expect(target.querySelector('.vm-markmap-view')).not.toBeNull();
		expect(target.querySelectorAll('.vm-markmap-card')).toHaveLength(3);
		expect(target.querySelector('[data-vm-markmap-node="thread"]')?.classList).toContain(
			'is-selected',
		);
		expect(target.querySelector('[data-vm-markmap-node="task"]')?.classList).toContain(
			'is-focused',
		);
		expect(target.querySelector('[data-vm-markmap-edge="project:thread"]')).not.toBeNull();
		expect(target.textContent).toContain('Project');
		expect(target.textContent).toContain('3');
	});
});
