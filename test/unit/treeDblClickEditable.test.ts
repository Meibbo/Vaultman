import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TreeNode } from '../../src/types/typeTree';

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
	clientHeight = 800;
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
	oncontextmenu: ((event: MouseEvent) => void) | null = null;
	onkeydown: ((event: KeyboardEvent) => void) | null = null;
	onpointerenter: (() => void) | null = null;
	onpointerleave: (() => void) | null = null;

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

function stubDblClickTarget(target: unknown): MouseEvent {
	return {
		target,
		preventDefault: () => {},
		stopPropagation: () => {},
	} as unknown as MouseEvent;
}

describe('A13: dblclick inside an editable field never toggles the row', () => {
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

	async function renderParentRow(onRowDoubleClick: (id: string, event: MouseEvent) => void) {
		const { UnifiedTreeView } = await import('../../src/components/layout/viewTree');
		const container = new TinyElement('div') as unknown as HTMLElement;
		const view = new UnifiedTreeView(container);
		const nodes: TreeNode[] = [
			{
				id: 'prop:status',
				label: 'status',
				depth: 0,
				meta: {},
				children: [{ id: 'prop:status::done', label: 'done', depth: 1, meta: {} }],
			},
		];
		view.render({
			nodes,
			expandedIds: new Set<string>(),
			onToggle: () => {},
			onRowClick: () => {},
			onRowDoubleClick,
			onContextMenu: () => {},
		});
		const row = (container as unknown as TinyElement).findByDataId('prop:status');
		if (!row) throw new Error('parent row was not rendered');
		if (typeof row.ondblclick !== 'function') {
			throw new Error('parent row exposes no dblclick handler');
		}
		return row;
	}

	it('ignores a dblclick whose target is the filter/value input', async () => {
		const onRowDoubleClick = vi.fn();
		const row = await renderParentRow(onRowDoubleClick);
		// The props/tags value widget renders a real <input> inside the row.
		row.ondblclick?.(stubDblClickTarget(new TinyElement('input')));
		expect(onRowDoubleClick).not.toHaveBeenCalled();
	});

	it('ignores a dblclick whose target is a textarea', async () => {
		const onRowDoubleClick = vi.fn();
		const row = await renderParentRow(onRowDoubleClick);
		row.ondblclick?.(stubDblClickTarget(new TinyElement('textarea')));
		expect(onRowDoubleClick).not.toHaveBeenCalled();
	});

	it('ignores a dblclick inside a contenteditable region', async () => {
		const onRowDoubleClick = vi.fn();
		const row = await renderParentRow(onRowDoubleClick);
		const editableChild = {
			tagName: 'SPAN',
			isContentEditable: true,
			closest: (_selector: string) => null,
		};
		row.ondblclick?.(stubDblClickTarget(editableChild));
		expect(onRowDoubleClick).not.toHaveBeenCalled();
	});

	it('still expands when the dblclick lands on the row name', async () => {
		const onRowDoubleClick = vi.fn();
		const row = await renderParentRow(onRowDoubleClick);
		const label = new TinyElement('span', 'vaultman-tree-label', 'status');
		const event = stubDblClickTarget(label);
		row.ondblclick?.(event);
		expect(onRowDoubleClick).toHaveBeenCalledTimes(1);
		expect(onRowDoubleClick).toHaveBeenCalledWith('prop:status', event);
	});
});
