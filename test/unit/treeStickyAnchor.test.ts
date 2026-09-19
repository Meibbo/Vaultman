import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TreeNode } from '../../src/types/typeTree';
import { stickyTreeRows } from '../../src/logic/logicTreeSticky';
import { flattenVisibleTreeWithChain } from '../../src/utils/treeVirtualization';

class TinyClassList {
	private readonly classes = new Set<string>();

	add(...classNames: string[]): void {
		for (const className of classNames) {
			if (className) this.classes.add(className);
		}
	}

	remove(...classNames: string[]): void {
		for (const className of classNames) this.classes.delete(className);
	}

	contains(className: string): boolean {
		return this.classes.has(className);
	}

	toggle(className: string, force?: boolean): boolean {
		const shouldHave = force ?? !this.classes.has(className);
		if (shouldHave) this.classes.add(className);
		else this.classes.delete(className);
		return shouldHave;
	}

	toString(): string {
		return [...this.classes].join(' ');
	}

	set(value: string): void {
		this.classes.clear();
		for (const className of value.split(/\s+/)) {
			if (className) this.classes.add(className);
		}
	}
}

class TinyElement {
	readonly children: TinyElement[] = [];
	readonly dataset: Record<string, string> = {};
	readonly attributes = new Map<string, string>();
	readonly style: Record<string, string | ((name: string, value: string) => void)> = {
		setProperty: (name: string, value: string) => {
			this.style[name] = value;
		},
		removeProperty: (name: string) => {
			delete this.style[name];
		},
	};
	readonly classList = new TinyClassList();
	parentElement: TinyElement | null = null;
	textContent = '';
	scrollTop = 0;
	clientHeight = 200;
	draggable = false;
	onclick: ((event: MouseEvent) => void) | null = null;
	ondblclick: ((event: MouseEvent) => void) | null = null;
	onauxclick: ((event: MouseEvent) => void) | null = null;
	ondragstart: ((event: DragEvent) => void) | null = null;
	ondragend: (() => void) | null = null;
	ondragover: ((event: DragEvent) => void) | null = null;
	ondragenter: ((event: DragEvent) => void) | null = null;
	ondragleave: (() => void) | null = null;
	ondrop: ((event: DragEvent) => void) | null = null;
	oncontextMenu: ((event: MouseEvent) => void) | null = null;
	onkeydown: ((event: KeyboardEvent) => void) | null = null;
	onpointerenter: (() => void) | null = null;
	onpointerleave: (() => void) | null = null;
	offsetTop = 0;

	constructor(
		readonly tagName = 'div',
		cls = '',
		text = '',
	) {
		this.classList.set(cls);
		this.textContent = text;
	}

	get className(): string {
		return this.classList.toString();
	}

	set className(value: string) {
		this.classList.set(value);
	}

	addClass(className: string): void {
		this.classList.add(className);
	}

	removeClass(className: string): void {
		this.classList.remove(className);
	}

	toggleClass(className: string, force?: boolean): boolean {
		return this.classList.toggle(className, force);
	}

	createDiv(options: { cls?: string; text?: string } = {}): TinyElement {
		return this.appendChild(new TinyElement('div', options.cls ?? '', options.text ?? ''));
	}

	createSpan(options: { cls?: string; text?: string } = {}): TinyElement {
		return this.appendChild(
			new TinyElement('span', options.cls ?? '', options.text ?? ''),
		);
	}

	createEl(
		tagName: string,
		options: { cls?: string; text?: string; value?: string; attr?: Record<string, string> } = {},
	): TinyElement {
		const el = new TinyElement(tagName, options.cls ?? '', options.text ?? '');
		if (options.value) el.setAttribute('value', options.value);
		for (const [name, value] of Object.entries(options.attr ?? {})) {
			el.setAttribute(name, value);
		}
		return this.appendChild(el);
	}

	appendChild<T extends TinyElement>(child: T): T {
		if (child.parentElement) child.remove();
		child.parentElement = this;
		this.children.push(child);
		return child;
	}

	contains(child: TinyElement): boolean {
		return (
			this.children.includes(child) ||
			this.children.some((item) => item.contains(child))
		);
	}

	closest(): TinyElement | null {
		return null;
	}

	empty(): void {
		for (const child of this.children) child.parentElement = null;
		this.children.length = 0;
	}

	remove(): void {
		const parent = this.parentElement;
		if (!parent) return;
		const index = parent.children.indexOf(this);
		if (index >= 0) parent.children.splice(index, 1);
		this.parentElement = null;
	}

	setAttribute(name: string, value: string): void {
		this.attributes.set(name, value);
	}

	getAttribute(name: string): string | null {
		return this.attributes.get(name) ?? null;
	}

	removeAttribute(name: string): void {
		this.attributes.delete(name);
	}

	setText(text: string): void {
		this.textContent = text;
	}

	addEventListener(): void {}
	removeEventListener(): void {}
	scrollIntoView(): void {}
	scrollTo(options?: ScrollToOptions): void {
		if (typeof options?.top === 'number') this.scrollTop = options.top;
	}

	getBoundingClientRect(): Pick<DOMRect, 'top' | 'bottom'> {
		return { top: 0, bottom: 28 };
	}

	querySelector(selector: string): TinyElement | null {
		if (!selector.startsWith('.')) return null;
		const className = selector.slice(1);
		return this.find((el) => el.classList.contains(className));
	}

	querySelectorAll(selector: string): TinyElement[] {
		if (!selector.startsWith('.')) return [];
		const className = selector.slice(1);
		const out: TinyElement[] = [];
		this.collect((el) => el.classList.contains(className), out);
		return out;
	}

	private collect(predicate: (el: TinyElement) => boolean, out: TinyElement[]): void {
		for (const child of this.children) {
			if (predicate(child)) out.push(child);
			child.collect(predicate, out);
		}
	}

	private find(predicate: (el: TinyElement) => boolean): TinyElement | null {
		for (const child of this.children) {
			if (predicate(child)) return child;
			const descendant = child.find(predicate);
			if (descendant) return descendant;
		}
		return null;
	}
}

vi.mock('obsidian', () => ({
	Platform: { isMobile: false },
	getIcon: () => ({}),
	setIcon: (el: TinyElement, icon: string) => {
		el.createEl('svg', { cls: `svg-icon ${icon}` });
	},
	setTooltip: () => {},
}));

function leaf(id: string, depth: number): TreeNode {
	return { id, label: id, depth, meta: {} };
}

describe('A14: collapsing a pinned row parks it under the sticky stack', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.stubGlobal('activeDocument', {
			body: {
				classList: {
					contains: () => false,
				},
			},
		});
		vi.stubGlobal('window', {
			clearTimeout,
			setTimeout,
			requestAnimationFrame: (callback: FrameRequestCallback) => {
				callback(0);
				return 1;
			},
			cancelAnimationFrame: () => {},
		});
	});

	interface NestedTree {
		root: TreeNode;
		branch: TreeNode;
		branch2: TreeNode;
	}

	function buildTree(): NestedTree {
		const leaves = Array.from({ length: 10 }, (_, i) => leaf(`leaf-${i}`, 2));
		const branch: TreeNode = {
			id: 'branch',
			label: 'branch',
			depth: 1,
			meta: {},
			children: leaves,
		};
		const branch2Leaves = Array.from({ length: 3 }, (_, i) => leaf(`b2-${i}`, 2));
		const branch2: TreeNode = {
			id: 'branch2',
			label: 'branch2',
			depth: 1,
			meta: {},
			children: branch2Leaves,
		};
		const tails = Array.from({ length: 30 }, (_, i) => leaf(`tail-${i}`, 0));
		const root: TreeNode = {
			id: 'root',
			label: 'root',
			depth: 0,
			meta: {},
			children: [branch, branch2, ...tails],
		};
		return { root, branch, branch2 };
	}

	async function renderTreeView(
		container: TinyElement,
		nodes: TreeNode[],
		expandedIds: Set<string>,
	) {
		const { UnifiedTreeView } = await import('../../src/components/layout/viewTree');
		const view =
			(container as unknown as { __view?: InstanceType<typeof UnifiedTreeView> })
				.__view ?? new UnifiedTreeView(container as unknown as HTMLElement);
		(container as unknown as { __view?: InstanceType<typeof UnifiedTreeView> }).__view =
			view;
		view.render({
			nodes,
			expandedIds,
			stickyParentRows: true,
			onToggle: () => {},
			onRowClick: () => {},
			onContextMenu: () => {},
		});
		return view;
	}

	function stickyIds(container: TinyElement): string[] {
		const layer = container.querySelector('.vaultman-tree-sticky-layer');
		if (!layer) return [];
		return layer.querySelectorAll('.vaultman-tree-row--sticky').map((row) => row.dataset.id);
	}

	it('anchors a collapsing pinned branch under its surviving headers', async () => {
		const { root } = buildTree();
		const container = new TinyElement('div');
		// Row pitch is 28px on desktop: scrollTop 200 lands inside the branch.
		container.scrollTop = 200;
		await renderTreeView(container, [root], new Set(['root', 'branch', 'branch2']));
		expect(stickyIds(container).sort()).toEqual(['branch', 'root']);

		// Collapse the pinned branch the way a scene toggle does: same nodes
		// minus its children, expanded set minus its id.
		const collapsed = buildTree();
		collapsed.branch.children = [];
		await renderTreeView(container, [collapsed.root], new Set(['root', 'branch2']));
		// fileScene parks it at (index - survivors) * rowHeight = (1 - 1) * 28.
		expect(container.scrollTop).toBe(0);
	});

	it('leaves the scroll alone when the collapsed row was never pinned', async () => {
		const { root } = buildTree();
		const container = new TinyElement('div');
		container.scrollTop = 200;
		await renderTreeView(container, [root], new Set(['root', 'branch', 'branch2']));
		expect(stickyIds(container).sort()).toEqual(['branch', 'root']);

		// branch2 sits below the viewport edge: visible, never pinned.
		const collapsed = buildTree();
		collapsed.branch2.children = [];
		await renderTreeView(container, [collapsed.root], new Set(['root', 'branch']));
		expect(container.scrollTop).toBe(200);
	});

	it('reports the sticky cost per window render (u130 lane-b probe)', async () => {
		const tree: TreeNode[] = Array.from({ length: 200 }, (_, p) => ({
			id: `p-${p}`,
			label: `p-${p}`,
			depth: 0,
			meta: {},
			children: Array.from({ length: 15 }, (_, c) => leaf(`p-${p}-c${c}`, 1)),
		}));
		const expanded = new Set<string>(tree.map((node) => node.id));
		const { rows, parentIndex, subtreeEnd } = flattenVisibleTreeWithChain(
			tree,
			expanded,
		);
		const rowHeight = 28;
		const viewportHeight = 400;

		let calls = 0;
		for (let s = 1; s < rows.length * rowHeight; s += rowHeight) {
			stickyTreeRows(rows, {
				rowHeight,
				scrollTop: s,
				viewportHeight,
				parentIndex,
				subtreeEnd,
			});
			calls += 1;
		}

		const container = new TinyElement('div');
		container.clientHeight = viewportHeight;
		container.scrollTop = 20000;
		const renderStart = performance.now();
		await renderTreeView(container, tree, expanded);
		const renderMs = performance.now() - renderStart;
		// NOTE: dynamic import — `resetModules` in beforeEach isolates the
		// monitor singleton, so the static import would read a stale instance.
		const { vaultmanPerfMonitor } = await import(
			'../../src/utils/performanceMonitor'
		);
		const windowEntry = vaultmanPerfMonitor
			.recent(20)
			.filter((entry) => entry.label === 'tree.window')
			.at(-1);

		expect(calls).toBeGreaterThan(100);
		expect(windowEntry?.ms ?? 0).toBeLessThan(3000);
		expect(renderMs).toBeLessThan(5000);
	});
});
