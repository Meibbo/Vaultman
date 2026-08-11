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
	readonly style: Record<
		string,
		string | ((name: string, value: string) => void)
	> = {
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
	clientHeight = 800;
	lastScrollIntoViewOptions: ScrollIntoViewOptions | undefined;
	lastScrollToOptions: ScrollToOptions | undefined;
	draggable = false;
	onclick: ((event: MouseEvent) => void) | null = null;
	onauxclick: ((event: MouseEvent) => void) | null = null;
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
	scrollIntoView(options?: ScrollIntoViewOptions): void {
		this.lastScrollIntoViewOptions = options;
	}

	scrollTo(options?: ScrollToOptions): void {
		this.lastScrollToOptions = options;
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

	findByDataId(id: string): TinyElement | null {
		if (this.dataset.id === id) return this;
		return this.find((el) => el.dataset.id === id);
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

	it('prepares only virtual-window nodes before their row signatures render', async () => {
		const { UnifiedTreeView } =
			await import('../../src/components/layout/viewTree');
		const container = new TinyElement('div') as unknown as HTMLElement;
		const view = new UnifiedTreeView(container);
		const nodes = Array.from({ length: 1_000 }, (_, index) => ({
			id: `file:${index}`,
			label: `File ${index}`,
			depth: 0,
			meta: {},
			children: [],
		}));
		const prepared: string[] = [];

		view.render({
			nodes,
			expandedIds: new Set<string>(),
			prepareNode: (node) => {
				prepared.push(node.id);
				node.icon = 'lucide-file';
			},
			onToggle: () => {},
			onRowClick: () => {},
			onContextMenu: () => {},
		});

		expect(prepared.length).toBeGreaterThan(0);
		expect(prepared.length).toBeLessThan(nodes.length);
		expect(
			(container.querySelector('.lucide-file') as unknown as TinyElement | null),
		).not.toBeNull();
	});

	it('updates the native collapse caret in place so Obsidian can animate it', async () => {
		const { UnifiedTreeView } =
			await import('../../src/components/layout/viewTree');
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
		const { UnifiedTreeView } =
			await import('../../src/components/layout/viewTree');
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
		const { UnifiedTreeView } =
			await import('../../src/components/layout/viewTree');
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

	it('dots a collapsed parent hiding an active filter instead of decorating it', async () => {
		const { UnifiedTreeView } =
			await import('../../src/components/layout/viewTree');
		const root: TreeNode = {
			id: 'prop:status',
			label: 'status',
			depth: 0,
			meta: {},
			children: [
				{
					id: 'prop:status::done',
					label: 'done',
					depth: 1,
					meta: {},
				},
			],
		};
		const container = new TinyElement('div') as unknown as HTMLElement;
		const view = new UnifiedTreeView(container);
		const baseOptions = {
			nodes: [root],
			activeFilterIds: new Set(['prop:status::done']),
			onToggle: () => {},
			onRowClick: () => {},
			onContextMenu: () => {},
		};

		// BT5-038: collapsed, the parent hides an active filter — it gets a dot,
		// never the filter decoration itself.
		view.render({ ...baseOptions, expandedIds: new Set<string>() });
		const collapsedRow = container.querySelector(
			'.vaultman-tree-row',
		) as unknown as TinyElement | null;
		expect(collapsedRow?.classList.contains('is-active-filter')).toBe(false);
		expect(
			container.querySelector('.vaultman-tree-bubble-dot--filter'),
		).not.toBeNull();

		view.render({
			...baseOptions,
			expandedIds: new Set<string>(['prop:status']),
		});
		const expandedParentRow = container.querySelector(
			'.vaultman-tree-row',
		) as unknown as TinyElement | null;
		expect(expandedParentRow?.classList.contains('is-active-filter')).toBe(
			false,
		);
		// Expanded, the child is visible and carries the real decoration; the
		// parent no longer needs the dot.
		expect(
			container.querySelector('.vaultman-tree-bubble-dot--filter'),
		).toBeNull();
	});

	it('forwards modifier and middle-click mouse events to row consumers', async () => {
		const { UnifiedTreeView } =
			await import('../../src/components/layout/viewTree');
		const container = new TinyElement('div') as unknown as HTMLElement;
		const view = new UnifiedTreeView(container);
		const received: MouseEvent[] = [];
		view.render({
			nodes: [{ id: 'alpha.md', label: 'Alpha', depth: 0, meta: {} }],
			expandedIds: new Set<string>(),
			onToggle: () => {},
			onRowClick: (_id, event) => {
				if (event) received.push(event);
			},
			onContextMenu: () => {},
		});
		const row = container.querySelector(
			'.vaultman-tree-row',
		) as unknown as TinyElement | null;
		const modifierEvent = { ctrlKey: true, button: 0 } as MouseEvent;
		const preventDefault = vi.fn();
		const middleEvent = {
			button: 1,
			preventDefault,
		} as unknown as MouseEvent;

		row?.onclick?.(modifierEvent);
		row?.onauxclick?.(middleEvent);

		expect(received).toEqual([modifierEvent, middleEvent]);
		expect(preventDefault).toHaveBeenCalledOnce();
	});

	it('passes smooth behavior to a rendered row', async () => {
		const { UnifiedTreeView } =
			await import('../../src/components/layout/viewTree');
		const container = new TinyElement('div') as unknown as HTMLElement;
		const view = new UnifiedTreeView(container);
		view.render({
			nodes: [{ id: 'alpha.md', label: 'Alpha', depth: 0, meta: {} }],
			expandedIds: new Set<string>(),
			onToggle: () => {},
			onRowClick: () => {},
			onContextMenu: () => {},
		});

		view.scrollToId('alpha.md', 'start', 'smooth');

		const row = container.querySelector(
			'.vaultman-tree-row',
		) as unknown as TinyElement | null;
		expect(row?.lastScrollIntoViewOptions).toEqual({
			block: 'start',
			inline: 'nearest',
			behavior: 'smooth',
		});
	});

	it('uses smooth scrolling when the target row is outside the virtual window', async () => {
		const { UnifiedTreeView } =
			await import('../../src/components/layout/viewTree');
		const tinyContainer = new TinyElement('div');
		tinyContainer.clientHeight = 28;
		const view = new UnifiedTreeView(tinyContainer as unknown as HTMLElement);
		view.render({
			nodes: Array.from({ length: 100 }, (_, index) => ({
				id: `node-${index}`,
				label: `Node ${index}`,
				depth: 0,
				meta: {},
			})),
			expandedIds: new Set<string>(),
			onToggle: () => {},
			onRowClick: () => {},
			onContextMenu: () => {},
		});

		view.scrollToId('node-99', 'start', 'smooth');

		expect(tinyContainer.lastScrollToOptions).toEqual({
			top: 99 * 28,
			behavior: 'smooth',
		});
	});

	it('renders an Obsidian-native toggle cell and handles one click', async () => {
		const { UnifiedTreeView } =
			await import('../../src/components/layout/viewTree');
		const tinyContainer = new TinyElement('div');
		const onCellClick = vi.fn();
		const view = new UnifiedTreeView(tinyContainer as unknown as HTMLElement);
		view.render({
			nodes: [
				{
					id: 'plugin:alpha',
					label: 'Alpha',
					depth: 0,
					meta: {},
					cells: [
						{
							id: 'state',
							kind: 'toggle',
							enabled: true,
							style: 'native',
							label: 'Enabled',
						},
					],
				},
			],
			expandedIds: new Set<string>(),
			visibleCells: new Set(['text', 'state']),
			onToggle: () => {},
			onRowClick: () => {},
			onCellClick,
			onContextMenu: () => {},
		});

		const toggle = tinyContainer.querySelector('.checkbox-container');
		const input = tinyContainer.querySelector('.vaultman-addon-toggle-input');
		expect({
			tag: toggle?.tagName,
			classes: toggle?.className,
			inputTag: input?.tagName,
			inputType: input?.getAttribute('type'),
		}).toMatchInlineSnapshot(`
			{
			  "classes": "checkbox-container vaultman-addon-toggle-cell is-enabled",
			  "inputTag": "input",
			  "inputType": "checkbox",
			  "tag": "div",
			}
		`);

		const preventDefault = vi.fn();
		const stopPropagation = vi.fn();
		toggle?.onclick?.({
			preventDefault,
			stopPropagation,
		} as unknown as MouseEvent);
		expect(preventDefault).toHaveBeenCalledOnce();
		expect(stopPropagation).toHaveBeenCalledOnce();
		expect(onCellClick).toHaveBeenCalledWith(
			'plugin:alpha',
			'state',
			expect.anything(),
		);
	});

	it('re-renders a toggle cell from native to badge style in place', async () => {
		const { UnifiedTreeView } =
			await import('../../src/components/layout/viewTree');
		const tinyContainer = new TinyElement('div');
		const view = new UnifiedTreeView(
			tinyContainer as unknown as HTMLElement,
		);
		const options = {
			expandedIds: new Set<string>(),
			visibleCells: new Set(['text', 'state']),
			onToggle: () => {},
			onRowClick: () => {},
			onCellClick: () => {},
			onContextMenu: () => {},
		};
		const node = (style: 'native' | 'badge'): TreeNode => ({
			id: 'snippet:cards',
			label: 'Cards',
			depth: 0,
			meta: {},
			cells: [
				{
					id: 'state',
					kind: 'toggle',
					enabled: true,
					style,
					label: 'Enabled',
				},
			],
		});

		view.render({ ...options, nodes: [node('native')] });
		expect(tinyContainer.querySelector('.checkbox-container')).not.toBeNull();

		view.render({ ...options, nodes: [node('badge')] });
		expect(tinyContainer.querySelector('.checkbox-container')).toBeNull();
		expect(tinyContainer.querySelector('.vaultman-addon-cell')).not.toBeNull();
	});

	it('updates the active file row in place and preserves it across viewport refreshes', async () => {
		const { UnifiedTreeView } =
			await import('../../src/components/layout/viewTree');
		const tinyContainer = new TinyElement('div');
		const view = new UnifiedTreeView(
			tinyContainer as unknown as HTMLElement,
		);
		view.render({
			nodes: [
				{ id: 'Notes/Alpha.md', label: 'Alpha', depth: 0, meta: {} },
				{ id: 'Notes/Beta.md', label: 'Beta', depth: 0, meta: {} },
			],
			expandedIds: new Set<string>(),
			onToggle: () => {},
			onRowClick: () => {},
			onContextMenu: () => {},
		});

		const alpha = tinyContainer.findByDataId('Notes/Alpha.md');
		const beta = tinyContainer.findByDataId('Notes/Beta.md');
		expect(alpha).not.toBeNull();
		expect(beta).not.toBeNull();

		view.setActiveId('Notes/Alpha.md');
		expect(alpha?.classList.contains('is-active')).toBe(true);
		expect(beta?.classList.contains('is-active')).toBe(false);

		view.setActiveId('Notes/Beta.md');
		expect(alpha?.classList.contains('is-active')).toBe(false);
		expect(beta?.classList.contains('is-active')).toBe(true);

		view.refreshViewport();
		expect(tinyContainer.findByDataId('Notes/Alpha.md')).toBe(alpha);
		expect(tinyContainer.findByDataId('Notes/Beta.md')).toBe(beta);
		expect(beta?.classList.contains('is-active')).toBe(true);
	});

	it('applies a stored active id when its virtual row becomes visible later', async () => {
		const { UnifiedTreeView } =
			await import('../../src/components/layout/viewTree');
		const tinyContainer = new TinyElement('div');
		tinyContainer.clientHeight = 28;
		const view = new UnifiedTreeView(
			tinyContainer as unknown as HTMLElement,
		);
		view.render({
			nodes: Array.from({ length: 100 }, (_, index) => ({
				id: `note-${index}.md`,
				label: `Note ${index}`,
				depth: 0,
				meta: {},
			})),
			expandedIds: new Set<string>(),
			onToggle: () => {},
			onRowClick: () => {},
			onContextMenu: () => {},
		});

		view.setActiveId('note-99.md');
		expect(tinyContainer.findByDataId('note-99.md')).toBeNull();

		view.scrollToId('note-99.md', 'end', 'auto');
		const active = tinyContainer.findByDataId('note-99.md');
		expect(active).not.toBeNull();
		expect(active?.classList.contains('is-active')).toBe(true);
	});

	it('repaints a recycled row and carries glyph color into hover styling', async () => {
		const { UnifiedTreeView } =
			await import('../../src/components/layout/viewTree');
		const container = new TinyElement('div');
		const view = new UnifiedTreeView(
			container as unknown as HTMLElement,
		);
		const options = {
			expandedIds: new Set<string>(),
			onToggle: () => {},
			onRowClick: () => {},
			onContextMenu: () => {},
		};

		view.render({
			...options,
			nodes: [
				{
					id: 'Alpha.md',
					label: 'Alpha',
					depth: 0,
					meta: {},
					labelColor: '#111111',
				},
			],
		});
		const firstRow = container.findByDataId('Alpha.md');
		const firstLabel = container.querySelector(
			'.vaultman-tree-label',
		);
		expect(firstRow?.classList.contains('vaultman-glyph-colored')).toBe(true);
		expect(firstRow?.style['--vaultman-glyph-color']).toBe('#111111');

		view.render({
			...options,
			nodes: [
				{
					id: 'Alpha.md',
					label: 'Alpha',
					depth: 0,
					meta: {},
					labelColor: '#222222',
				},
			],
		});
		const secondRow = container.findByDataId('Alpha.md');
		const secondLabel = container.querySelector(
			'.vaultman-tree-label',
		);

		expect(firstLabel?.style.color).toBe('#111111');
		expect(secondLabel?.style.color).toBe('#222222');
		expect(secondRow?.classList.contains('vaultman-glyph-colored')).toBe(true);
		expect(secondRow?.style['--vaultman-glyph-color']).toBe('#222222');
		expect(secondLabel).not.toBe(firstLabel);

		view.render({
			...options,
			nodes: [{ id: 'Alpha.md', label: 'Alpha', depth: 0, meta: {} }],
		});
		const defaultRow = container.findByDataId('Alpha.md');
		expect(defaultRow?.classList.contains('vaultman-glyph-colored')).toBe(false);
		expect(defaultRow?.style['--vaultman-glyph-color']).toBeUndefined();
	});

	it('tints from the glyph alone when only the icon is colored', async () => {
		// The panel explorers colour the glyph through iconColor and never set a
		// labelColor, so a tint keyed off the label skipped all of them.
		const { UnifiedTreeView } =
			await import('../../src/components/layout/viewTree');
		const container = new TinyElement('div');
		const view = new UnifiedTreeView(container as unknown as HTMLElement);

		view.render({
			expandedIds: new Set<string>(),
			onToggle: () => {},
			onRowClick: () => {},
			onContextMenu: () => {},
			nodes: [
				{
					id: 'status',
					label: 'status',
					depth: 0,
					meta: {},
					iconColor: '#33aa77',
				},
			],
		});

		const row = container.findByDataId('status');
		expect(row?.classList.contains('vaultman-glyph-colored')).toBe(true);
		expect(row?.style['--vaultman-glyph-color']).toBe('#33aa77');
	});

	it('renders every generic highlight channel independently on one row', async () => {
		const { UnifiedTreeView } =
			await import('../../src/components/layout/viewTree');
		const container = new TinyElement('div');
		const view = new UnifiedTreeView(
			container as unknown as HTMLElement,
		);

		view.render({
			nodes: [{ id: 'Alpha.md', label: 'Alpha', depth: 0, meta: {} }],
			expandedIds: new Set<string>(),
			highlightIds: {
				hover: new Set(['Alpha.md']),
				inclusive: new Set(['Alpha.md']),
				exclusive: new Set(['Alpha.md']),
				deletion: new Set(['Alpha.md']),
			},
			onToggle: () => {},
			onRowClick: () => {},
			onContextMenu: () => {},
		});

		const row = container.findByDataId('Alpha.md');
		expect(row?.classList.contains('is-explorer-hover-highlight')).toBe(true);
		expect(row?.classList.contains('is-active-filter')).toBe(true);
		expect(row?.classList.contains('is-excluded-filter')).toBe(true);
		expect(row?.classList.contains('is-deletion-highlight')).toBe(true);
	});

	it('renders at most two generic collapsed status dots before operation badges', async () => {
		const { UnifiedTreeView } =
			await import('../../src/components/layout/viewTree');
		const container = new TinyElement('div');
		const view = new UnifiedTreeView(
			container as unknown as HTMLElement,
		);

		view.render({
			nodes: [
				{
					id: 'root',
					label: 'Root',
					depth: 0,
					meta: {},
					badges: [{ text: 'delete queued', solid: true }],
					children: [
						{ id: 'included', label: 'Included', depth: 1, meta: {} },
						{ id: 'excluded', label: 'Excluded', depth: 1, meta: {} },
						{ id: 'deleted', label: 'Deleted', depth: 1, meta: {} },
					],
				},
			],
			expandedIds: new Set<string>(),
			highlightIds: {
				inclusive: new Set(['included']),
				exclusive: new Set(['excluded']),
				deletion: new Set(['deleted']),
			},
			onToggle: () => {},
			onRowClick: () => {},
			onContextMenu: () => {},
		});

		const row = container.findByDataId('root');
		const zone = row?.querySelector(
			'.vaultman-tree-badge-zone',
		) as TinyElement | null;
		expect(zone?.children).toHaveLength(3);
		expect(
			zone?.children[0]?.classList.contains(
				'vaultman-tree-bubble-dot--deletion',
			),
		).toBe(true);
		expect(
			zone?.children[1]?.classList.contains(
				'vaultman-tree-bubble-dot--filter-excluded',
			),
		).toBe(true);
		expect(zone?.children[2]?.classList.contains('vaultman-badge')).toBe(true);
	});
});
