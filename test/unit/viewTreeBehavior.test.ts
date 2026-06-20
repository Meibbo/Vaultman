import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TreeNode } from '../../src/types/typeTree';

class TinyClassList {
	private readonly classes = new Set<string>();

	constructor(initial = '') {
		for (const className of initial.split(/\s+/)) {
			if (className) this.classes.add(className);
		}
	}

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
	readonly style: Record<string, string | ((name: string, value: string) => void)> =
		{
			setProperty: (name: string, value: string) => {
				this.style[name] = value;
			},
		};
	readonly classList = new TinyClassList();
	parentElement: TinyElement | null = null;
	textContent = '';
	scrollTop = 0;
	clientHeight = 800;
	draggable = false;
	onclick: ((event: MouseEvent) => void) | null = null;
	ondragstart: ((event: DragEvent) => void) | null = null;
	ondragend: ((event: DragEvent) => void) | null = null;
	ondragover: ((event: DragEvent) => void) | null = null;
	ondragenter: ((event: DragEvent) => void) | null = null;
	ondragleave: ((event: DragEvent) => void) | null = null;
	ondrop: ((event: DragEvent) => void) | null = null;
	oncontextmenu: ((event: MouseEvent) => void) | null = null;

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
		return this.appendChild(
			new TinyElement('div', options.cls ?? '', options.text ?? ''),
		);
	}

	createSpan(options: { cls?: string; text?: string } = {}): TinyElement {
		return this.appendChild(
			new TinyElement('span', options.cls ?? '', options.text ?? ''),
		);
	}

	createEl(
		tagName: string,
		options: { cls?: string; text?: string; value?: string } = {},
	): TinyElement {
		const el = new TinyElement(tagName, options.cls ?? '', options.text ?? '');
		if (options.value) el.setAttribute('value', options.value);
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

	getBoundingClientRect(): Pick<DOMRect, 'top' | 'bottom'> {
		return { top: 0, bottom: 28 };
	}

	querySelector(selector: string): TinyElement | null {
		if (!selector.startsWith('.')) return null;
		const className = selector.slice(1);
		return this.find((el) => el.classList.contains(className));
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
	setIcon: (el: TinyElement, icon: string) => {
		el.createEl('svg', { cls: `svg-icon ${icon}` });
	},
}));

describe('UnifiedTreeView behavior', () => {
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

	it('updates the native collapse caret in place so Obsidian can animate it', async () => {
		const { UnifiedTreeView } = await import(
			'../../src/components/layout/viewTree'
		);
		const root: TreeNode = {
			id: 'folder:Projects',
			label: 'Projects',
			depth: 0,
			meta: {},
			coreCls: 'tree-item-self nav-folder-title is-clickable',
			children: [
				{
					id: 'file:Projects/Alpha.md',
					label: 'Alpha.md',
					depth: 1,
					meta: {},
				},
			],
		};
		const container = new TinyElement('div') as unknown as HTMLElement;
		const view = new UnifiedTreeView(container);
		const baseOptions = {
			nodes: [root],
			onToggle: () => {},
			onRowClick: () => {},
			onContextMenu: () => {},
		};

		view.render({ ...baseOptions, expandedIds: new Set<string>() });
		const firstCaret = container.querySelector(
			'.collapse-icon',
		) as unknown as TinyElement | null;

		expect(firstCaret).not.toBeNull();
		expect(firstCaret?.classList.contains('is-collapsed')).toBe(true);

		view.render({
			...baseOptions,
			expandedIds: new Set<string>(['folder:Projects']),
		});
		const secondCaret = container.querySelector(
			'.collapse-icon',
		) as unknown as TinyElement | null;

		expect(secondCaret).toBe(firstCaret);
		expect(secondCaret?.classList.contains('is-collapsed')).toBe(false);
		expect(secondCaret?.getAttribute('aria-expanded')).toBe('true');
	});

	it('keeps Obsidian collapsible styling on the row and the collapse icon', async () => {
		const { UnifiedTreeView } = await import(
			'../../src/components/layout/viewTree'
		);
		const container = new TinyElement('div') as unknown as HTMLElement;
		const view = new UnifiedTreeView(container);

		view.render({
			nodes: [
				{
					id: 'folder:Projects',
					label: 'Projects',
					depth: 2,
					meta: {},
					coreCls: 'tree-item-self nav-folder-title is-clickable',
					children: [
						{
							id: 'file:Projects/Alpha.md',
							label: 'Alpha.md',
							depth: 3,
							meta: {},
						},
					],
				},
			],
			expandedIds: new Set<string>(),
			onToggle: () => {},
			onRowClick: () => {},
			onContextMenu: () => {},
		});

		const row = container.querySelector(
			'.vaultman-tree-row',
		) as unknown as TinyElement | null;
		const caret = container.querySelector(
			'.collapse-icon',
		) as unknown as TinyElement | null;

		expect(row).not.toBeNull();
		expect(caret).not.toBeNull();
		expect(row?.classList.contains('tree-item-self')).toBe(true);
		expect(row?.classList.contains('mod-collapsible')).toBe(true);
		expect(caret?.classList.contains('tree-item-icon')).toBe(true);
		expect(caret?.classList.contains('collapse-icon')).toBe(true);
	});

	it('marks expanded set changes for temporary virtual row structure animation', async () => {
		const scheduledTimers: Array<() => void> = [];
		vi.stubGlobal('window', {
			clearTimeout: vi.fn(),
			setTimeout: vi.fn((callback: TimerHandler) => {
				if (typeof callback === 'function') {
					scheduledTimers.push(callback as () => void);
				}
				return scheduledTimers.length;
			}),
			requestAnimationFrame: (callback: FrameRequestCallback) => {
				callback(0);
				return 1;
			},
			cancelAnimationFrame: () => {},
		});
		const { UnifiedTreeView } = await import(
			'../../src/components/layout/viewTree'
		);
		const root: TreeNode = {
			id: 'folder:Projects',
			label: 'Projects',
			depth: 0,
			meta: {},
			coreCls: 'tree-item-self nav-folder-title is-clickable',
			children: [
				{
					id: 'file:Projects/Alpha.md',
					label: 'Alpha.md',
					depth: 1,
					meta: {},
				},
			],
		};
		const container = new TinyElement('div') as unknown as HTMLElement;
		const view = new UnifiedTreeView(container);
		const baseOptions = {
			nodes: [root],
			onToggle: () => {},
			onRowClick: () => {},
			onContextMenu: () => {},
		};

		view.render({ ...baseOptions, expandedIds: new Set<string>() });
		expect(
			(container as unknown as TinyElement).classList.contains(
				'vaultman-tree-structure-animating',
			),
		).toBe(false);

		view.render({
			...baseOptions,
			expandedIds: new Set<string>(['folder:Projects']),
		});
		expect(
			(container as unknown as TinyElement).classList.contains(
				'vaultman-tree-structure-animating',
			),
		).toBe(true);

		scheduledTimers.at(-1)?.();
		expect(
			(container as unknown as TinyElement).classList.contains(
				'vaultman-tree-structure-animating',
			),
		).toBe(false);
	});
});
