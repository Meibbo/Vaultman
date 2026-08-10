import { beforeEach, describe, expect, it, vi } from 'vitest';

import propsExplorerSource from '../../src/components/containers/explorerProps.ts?raw';
import tableSource from '../../src/components/layout/viewNodeTable.ts?raw';
import valueRendererSource from '../../src/utils/renderPropertyValue.ts?raw';
import type {
	CoreMetadataTreeAnatomy,
	TreeViewOptions,
} from '../../src/components/layout/viewTree';
import type { PropMeta, TreeNode } from '../../src/types/typeTree';

class TestClassList {
	private readonly values = new Set<string>();

	constructor(initial = '') {
		this.set(initial);
	}

	add(...classes: string[]): void {
		for (const value of classes) if (value) this.values.add(value);
	}

	remove(...classes: string[]): void {
		for (const value of classes) this.values.delete(value);
	}

	contains(value: string): boolean {
		return this.values.has(value);
	}

	toggle(value: string, force?: boolean): boolean {
		const enabled = force ?? !this.values.has(value);
		if (enabled) this.values.add(value);
		else this.values.delete(value);
		return enabled;
	}

	set(value: string): void {
		this.values.clear();
		this.add(...value.split(/\s+/));
	}

	toString(): string {
		return [...this.values].join(' ');
	}
}

interface CreateOptions {
	cls?: string;
	text?: string;
	type?: string;
	value?: string;
	attr?: Record<string, string | number | boolean>;
}

class TestElement {
	readonly children: TestElement[] = [];
	readonly classList = new TestClassList();
	readonly dataset: Record<string, string> = {};
	readonly attributes = new Map<string, string>();
	readonly style: Record<string, unknown> = {
		setProperty: (name: string, value: string) => {
			this.style[name] = value;
		},
		removeProperty: (name: string) => {
			delete this.style[name];
		},
	};
	parentElement: TestElement | null = null;
	textContent = '';
	value = '';
	readOnly = false;
	hidden = false;
	tabIndex = 0;
	draggable = false;
	scrollTop = 0;
	clientHeight = 800;
	onclick: ((event: MouseEvent) => void) | null = null;
	onauxclick: ((event: MouseEvent) => void) | null = null;
	oncontextmenu: ((event: MouseEvent) => void) | null = null;
	ondragstart: ((event: DragEvent) => void) | null = null;
	ondragend: ((event: DragEvent) => void) | null = null;
	ondragover: ((event: DragEvent) => void) | null = null;
	ondragenter: ((event: DragEvent) => void) | null = null;
	ondragleave: ((event: DragEvent) => void) | null = null;
	ondrop: ((event: DragEvent) => void) | null = null;

	constructor(
		readonly tagName = 'div',
		cls = '',
		text = '',
	) {
		this.className = cls;
		this.textContent = text;
	}

	get className(): string {
		return this.classList.toString();
	}

	set className(value: string) {
		this.classList.set(value);
	}

	addClass(value: string): void {
		this.classList.add(value);
	}

	removeClass(value: string): void {
		this.classList.remove(value);
	}

	toggleClass(value: string, force?: boolean): boolean {
		return this.classList.toggle(value, force);
	}

	createDiv(options: CreateOptions | string = {}): TestElement {
		return this.create('div', options);
	}

	createSpan(options: CreateOptions | string = {}): TestElement {
		return this.create('span', options);
	}

	createEl(tagName: string, options: CreateOptions = {}): TestElement {
		return this.create(tagName, options);
	}

	private create(
		tagName: string,
		options: CreateOptions | string,
	): TestElement {
		const normalized = typeof options === 'string' ? { cls: options } : options;
		const child = new TestElement(
			tagName,
			normalized.cls ?? '',
			normalized.text ?? '',
		);
		child.value = normalized.value ?? '';
		if (normalized.type) child.setAttribute('type', normalized.type);
		for (const [name, value] of Object.entries(normalized.attr ?? {})) {
			child.setAttribute(name, String(value));
		}
		return this.appendChild(child);
	}

	appendChild<T extends TestElement>(child: T): T {
		child.remove();
		child.parentElement = this;
		this.children.push(child);
		return child;
	}

	contains(target: TestElement): boolean {
		return (
			target === this || this.children.some((child) => child.contains(target))
		);
	}

	empty(): void {
		for (const child of this.children) child.parentElement = null;
		this.children.length = 0;
	}

	remove(): void {
		if (!this.parentElement) return;
		const index = this.parentElement.children.indexOf(this);
		if (index >= 0) this.parentElement.children.splice(index, 1);
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

	addEventListener(): void {}
	removeEventListener(): void {}
	scrollIntoView(): void {}
	scrollTo(): void {}
	getBoundingClientRect(): Pick<DOMRect, 'top' | 'bottom'> {
		return { top: 0, bottom: 28 };
	}

	querySelector(selector: string): TestElement | null {
		if (!selector.startsWith('.')) return null;
		const className = selector.slice(1);
		return this.find((node) => node.classList.contains(className));
	}

	findAll(className: string): TestElement[] {
		const matches: TestElement[] = [];
		for (const child of this.children) {
			if (child.classList.contains(className)) matches.push(child);
			matches.push(...child.findAll(className));
		}
		return matches;
	}

	private find(predicate: (node: TestElement) => boolean): TestElement | null {
		for (const child of this.children) {
			if (predicate(child)) return child;
			const nested = child.find(predicate);
			if (nested) return nested;
		}
		return null;
	}
}

vi.mock('obsidian', () => ({
	Platform: { isMobile: false },
	getIcon: () => ({}),
	setIcon: (container: TestElement, icon: string) => {
		container.createSpan({ cls: `svg-icon ${icon}` });
	},
	setTooltip: () => {},
}));

const property: TreeNode<PropMeta> = {
	id: 'status',
	label: 'status',
	depth: 0,
	icon: 'lucide-list-checks',
	children: [
		{
			id: 'status::done',
			label: 'done',
			depth: 1,
			children: [],
			meta: {
				propName: 'status',
				propType: 'text',
				isValueNode: true,
				rawValue: 'done',
			},
		},
	],
	meta: { propName: 'status', propType: 'text', isValueNode: false },
};

function metadataOptions(onReorderStart = vi.fn()): TreeViewOptions {
	const coreMetadata: CoreMetadataTreeAnatomy = {
		heading: 'Properties',
		addButtonLabel: 'Add property',
		propertyKey: (node) => (node.meta as PropMeta).propName,
		propertyType: (node) => (node.meta as PropMeta).propType,
		renderValue: (container, node) => {
			container.createSpan({
				cls: 'vaultman-property-value-text',
				text: node.label,
			});
			return true;
		},
		onReorderStart,
	};
	return {
		nodes: [property],
		expandedIds: new Set<string>(),
		visibleCells: new Set(['icon', 'text', 'format']),
		onToggle: () => {},
		onRowClick: () => {},
		onContextMenu: () => {},
		coreMetadata,
	};
}

describe('U121-003 shard 9.3 — Core file-properties Tree anatomy', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.stubGlobal('activeDocument', {
			body: { classList: { contains: () => false } },
		});
		const runFrame = (callback: FrameRequestCallback): number => {
			callback(0);
			return 1;
		};
		vi.stubGlobal('requestAnimationFrame', runFrame);
		vi.stubGlobal('cancelAnimationFrame', () => {});
		vi.stubGlobal('window', {
			requestAnimationFrame: runFrame,
			cancelAnimationFrame: () => {},
			setTimeout,
			clearTimeout,
		});
	});

	it('renders the recorded Core container, heading, property and add-button structure', async () => {
		const { UnifiedTreeView } =
			await import('../../src/components/layout/viewTree');
		const container = new TestElement();
		new UnifiedTreeView(container as unknown as HTMLElement).render(
			metadataOptions(),
		);

		expect(container.classList.contains('metadata-container')).toBe(true);
		const heading = container.querySelector('.metadata-properties-heading');
		expect(
			heading?.querySelector('.metadata-properties-title')?.textContent,
		).toBe('Properties');
		const properties = container.querySelector('.metadata-properties');
		const row = properties?.querySelector('.metadata-property');
		expect(row?.getAttribute('data-property-key')).toBe('status');
		expect(row?.getAttribute('data-property-type')).toBe('text');

		const key = row?.querySelector('.metadata-property-key');
		expect(key?.children.map((child) => child.className)).toEqual([
			'metadata-property-icon',
			'metadata-property-key-input',
		]);
		expect(key?.children[1]?.tagName).toBe('input');
		expect(key?.children[1]?.value).toBe('status');

		const value = row?.querySelector('.metadata-property-value');
		expect(value?.getAttribute('data-property-key')).toBe('status');
		expect(value?.getAttribute('data-property-type')).toBe('text');
		expect(value?.children[0]?.dataset.id).toBe('status::done');
		expect(
			value?.querySelector('.vaultman-property-value-text')?.textContent,
		).toBe('done');
		expect(container.querySelector('.metadata-add-button')).not.toBeNull();
	});

	it('puts the Tree-only reorder gesture on Core’s property icon', async () => {
		const { UnifiedTreeView } =
			await import('../../src/components/layout/viewTree');
		const container = new TestElement();
		const onReorderStart = vi.fn();
		new UnifiedTreeView(container as unknown as HTMLElement).render(
			metadataOptions(onReorderStart),
		);

		const icon = container.querySelector('.metadata-property-icon');
		expect(icon?.draggable).toBe(true);
		const event = {} as DragEvent;
		icon?.ondragstart?.(event);
		expect(onReorderStart).toHaveBeenCalledWith('status', event);
	});

	it('can return to the virtual Tree without leaving Core classes or markup behind', async () => {
		const { UnifiedTreeView } =
			await import('../../src/components/layout/viewTree');
		const container = new TestElement();
		const view = new UnifiedTreeView(container as unknown as HTMLElement);
		view.render(metadataOptions());
		view.render({
			nodes: [{ id: 'ordinary', label: 'Ordinary', depth: 0, meta: {} }],
			expandedIds: new Set<string>(),
			onToggle: () => {},
			onRowClick: () => {},
			onContextMenu: () => {},
		});

		expect(container.classList.contains('metadata-container')).toBe(false);
		expect(container.classList.contains('vaultman-core-metadata-tree')).toBe(
			false,
		);
		expect(container.classList.contains('vaultman-tree-virtual-viewport')).toBe(
			true,
		);
		expect(container.querySelector('.metadata-property')).toBeNull();
		expect(container.querySelector('.vaultman-tree-row')).not.toBeNull();
	});

	it('keeps VIECO visibility and plain-value fallback inside the Core structure', async () => {
		const { UnifiedTreeView } =
			await import('../../src/components/layout/viewTree');
		const container = new TestElement();
		const opts = metadataOptions();
		opts.visibleCells = new Set(['text']);
		opts.coreMetadata!.renderValue = () => false;
		new UnifiedTreeView(container as unknown as HTMLElement).render(opts);

		const icon = container.querySelector('.metadata-property-icon');
		expect(icon).not.toBeNull();
		expect(icon?.querySelector('.svg-icon')).toBeNull();
		expect(
			container.querySelector('.metadata-property-value')?.textContent,
		).toBe('');
		expect(
			container.querySelector('.vaultman-property-value-text')?.textContent,
		).toBe('done');
	});

	// U121-029: the two guards below assert the *wiring* from the Props explorer
	// into the Core anatomy — `coreMetadata:` on the render call and the
	// `coreMetadataReveal` branch of the projection. Both were deliberately
	// commented out when the `reveal this file` composition was taken back to the
	// drawing board; the renderer itself (viewCoreMetadataTree) is untouched and
	// the five guards above still cover it. Parked rather than deleted, because
	// the plan is to reach the same result from another angle — reveal as a
	// composition over the propScene, extended to the tagScene — not to drop it.
	it.skip('uses shard 07’s value renderer instead of creating a second formatter', () => {
		const treeBranch = propsExplorerSource.slice(
			propsExplorerSource.indexOf('this.view.render({'),
			propsExplorerSource.indexOf(
				'\n\t}\n',
				propsExplorerSource.indexOf('this.view.render({'),
			),
		);
		expect(treeBranch).toContain('coreMetadata:');
		expect(treeBranch).toContain('this._renderPropertyValueLabel');
		expect(valueRendererSource).toContain('propertyAttributeContainer');
	});

	it('keeps Table and Cards on their own Cells with no metadata-property clone', () => {
		const tableBranch = propsExplorerSource.slice(
			propsExplorerSource.indexOf("if (this.viewMode === 'table')"),
			propsExplorerSource.indexOf('this.view.render({'),
		);
		const cardsBranch = propsExplorerSource.slice(
			propsExplorerSource.indexOf('private _renderGrid()'),
			propsExplorerSource.indexOf('private _handlePropDragOver('),
		);
		expect(tableBranch).toContain('nodes: nodesWithIcons');
		expect(tableBranch).not.toContain('coreMetadata');
		expect(cardsBranch).toContain(
			'this._scopeProjection(this.logic.getTree())',
		);
		expect(cardsBranch).not.toContain('metadata-property');
		expect(tableSource).not.toContain('metadata-property');
	});

	it.skip('keeps the property/value pairs intact for Core while retaining NAVCO sort', () => {
		const projection = propsExplorerSource.slice(
			propsExplorerSource.indexOf('const sorted = this._applySort(tree);'),
			propsExplorerSource.indexOf("if (this.viewMode === 'table')"),
		);
		expect(projection).toContain('const sorted = this._applySort(tree);');
		expect(projection).toContain(
			'if (!this._nestedEnabled() && !coreMetadataReveal)',
		);
	});
});
