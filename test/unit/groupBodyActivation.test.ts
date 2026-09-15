import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
	collectGroupMemberIds,
	groupMemberEntityId,
	isGroupHeader,
	projectGroupedTree,
	toggleGroupMembers,
} from '../../src/logic/logicTreeGroupProjection';
import type { FileMeta, TreeNode } from '../../src/types/typeTree';

/**
 * U130 carril B-groupbody: el cuerpo del row de un `node_group` responde a
 * los inputs como una carpeta, EN EL MOTOR (`UnifiedTreeView`).
 *
 * - `open`: clic en el cuerpo -> `onToggle(id)`, nunca `onRowClick`.
 * - La copia sticky del mismo row pasa por el mismo camino (`_renderRow`).
 * - Teclado: `Enter`/`Space` hace lo mismo que el clic.
 * - `select` (files): el cuerpo selecciona/deselecciona a los MIEMBROS.
 * - La proyeccion marca la cabecera con `isGroupHeader` para que el motor la
 *   reconozca sin conocer `_groupIds`.
 */

class TinyClassList {
	private readonly classes = new Set<string>();

	add(...classNames: string[]): void {
		for (const className of classNames) {
			if (className) this.classes.add(className);
		}
	}

	remove(...classNames: string[]): void {
		for (const className of classNames) {
			if (className) this.classes.delete(className);
		}
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
	tabIndex = 0;
	draggable = false;
	offsetTop = 0;
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

	findStickyByDataId(id: string): TinyElement | null {
		return this.find(
			(el) => el.dataset.id === id && el.dataset.sticky === 'true',
		);
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

vi.mock('obsidian', async (importOriginal) => {
	const actual =
		(await importOriginal()) as Record<string, unknown>;
	return {
		...(actual as object),
		setIcon: (el: TinyElement, icon: string) => {
			el.createEl('svg', { cls: `svg-icon ${icon}` });
		},
		setTooltip: () => {},
	};
});

const GROUP_ID = 'vaultman.group.preset:A';

function groupNodes(): TreeNode[] {
	const children: TreeNode[] = [];
	for (let index = 0; index < 40; index += 1) {
		children.push({
			id: `f-${index}.md`,
			label: `f-${index}.md`,
			depth: 1,
			meta: {},
		});
	}
	return [
		{
			id: GROUP_ID,
			label: 'A',
			depth: 0,
			meta: {},
			showCaret: true,
			isGroupHeader: true,
			children,
		},
	];
}

interface RenderSpies {
	onToggle: (id: string) => void;
	onRowClick: (id: string, event?: MouseEvent) => void;
	onContextMenu: (id: string, event: MouseEvent) => void;
	onGroupActivate?: (id: string) => void;
}

async function renderGroupView(spies: RenderSpies, scrollTop = 0) {
	const { UnifiedTreeView } = await import(
		'../../src/components/layout/viewTree'
	);
	const container = new TinyElement('div') as unknown as HTMLElement;
	container.scrollTop = scrollTop;
	const view = new UnifiedTreeView(container);
	view.render({
		nodes: groupNodes(),
		expandedIds: new Set<string>([GROUP_ID]),
		stickyParentRows: true,
		onToggle: spies.onToggle,
		onRowClick: spies.onRowClick,
		onContextMenu: spies.onContextMenu,
		...(spies.onGroupActivate
			? { onGroupActivate: spies.onGroupActivate }
			: {}),
	});
	return container as unknown as TinyElement;
}

function click(el: TinyElement): void {
	if (typeof el.onclick !== 'function') {
		throw new Error('la fila no expone onclick');
	}
	el.onclick({} as MouseEvent);
}

function pressKey(el: TinyElement, key: string): void {
	if (typeof el.onkeydown !== 'function') {
		throw new Error('la fila no expone onkeydown');
	}
	el.onkeydown({
		key,
		target: el,
		preventDefault: () => {},
	} as unknown as KeyboardEvent);
}

describe('B-groupbody: el cuerpo del row de grupo expande/colapsa en el motor', () => {
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

	it('criterio 1 (open): clic en el cuerpo llama a onToggle, no a onRowClick', async () => {
		const onToggle = vi.fn();
		const onRowClick = vi.fn();
		const container = await renderGroupView({
			onToggle,
			onRowClick,
			onContextMenu: () => {},
		});
		const row = container.findByDataId(GROUP_ID);
		if (!row) throw new Error('la fila del grupo no se pinto');
		click(row);
		expect(onToggle).toHaveBeenCalledTimes(1);
		expect(onToggle).toHaveBeenCalledWith(GROUP_ID);
		expect(onRowClick).not.toHaveBeenCalled();
	});

	it('criterio 1 (sticky): la copia fijada llama a onToggle, no a onRowClick', async () => {
		const onToggle = vi.fn();
		const onRowClick = vi.fn();
		// 10 filas x 28px: la primera visible es un hijo, la cabecera queda fijada.
		const container = await renderGroupView(
			{ onToggle, onRowClick, onContextMenu: () => {} },
			280,
		);
		const sticky = container.findStickyByDataId(GROUP_ID);
		if (!sticky) throw new Error('la copia sticky del grupo no se pinto');
		click(sticky);
		expect(onToggle).toHaveBeenCalledTimes(1);
		expect(onToggle).toHaveBeenCalledWith(GROUP_ID);
		expect(onRowClick).not.toHaveBeenCalled();
	});

	it('criterio 5 (teclado): Enter y Espacio hacen lo mismo que el clic', async () => {
		for (const key of ['Enter', ' ']) {
			const onToggle = vi.fn();
			const onRowClick = vi.fn();
			const container = await renderGroupView({
				onToggle,
				onRowClick,
				onContextMenu: () => {},
			});
			const row = container.findByDataId(GROUP_ID);
			if (!row) throw new Error('la fila del grupo no se pinto');
			pressKey(row, key);
			expect(onToggle).toHaveBeenCalledTimes(1);
			expect(onToggle).toHaveBeenCalledWith(GROUP_ID);
			expect(onRowClick).not.toHaveBeenCalled();
		}
	});

	it('una fila normal sigue entrando por onRowClick (sin sobre-enrutado)', async () => {
		const onToggle = vi.fn();
		const onRowClick = vi.fn();
		const container = await renderGroupView({
			onToggle,
			onRowClick,
			onContextMenu: () => {},
		});
		const row = container.findByDataId('f-0.md');
		if (!row) throw new Error('la fila normal no se pinto');
		click(row);
		expect(onRowClick).toHaveBeenCalledTimes(1);
		expect(onRowClick).toHaveBeenCalledWith('f-0.md', expect.anything());
		expect(onToggle).not.toHaveBeenCalled();
	});

	it('la escena puede adueñarse del cuerpo via onGroupActivate (el chevron queda en onToggle)', async () => {
		const onToggle = vi.fn();
		const onRowClick = vi.fn();
		const onGroupActivate = vi.fn();
		const container = await renderGroupView({
			onToggle,
			onRowClick,
			onContextMenu: () => {},
			onGroupActivate,
		});
		const row = container.findByDataId(GROUP_ID);
		if (!row) throw new Error('la fila del grupo no se pinto');
		click(row);
		expect(onGroupActivate).toHaveBeenCalledTimes(1);
		expect(onGroupActivate).toHaveBeenCalledWith(GROUP_ID);
		expect(onToggle).not.toHaveBeenCalled();
		expect(onRowClick).not.toHaveBeenCalled();
	});
});

describe('B-groupbody: la proyeccion marca la cabecera para el motor', () => {
	const member = (id: string, label: string): TreeNode => ({
		id,
		label,
		depth: 0,
		meta: null,
	});

	it('projectGroupedTree marca isGroupHeader en la cabecera', () => {
		const [header] = projectGroupedTree({
			nodes: [member('a1', 'alfa'), member('b1', 'beta')],
			groups: [],
			memberships: {},
			providerId: 'props',
			noGroupLabel: 'Sin grupo',
			filtered: false,
		});
		expect(isGroupHeader(header.id)).toBe(true);
		expect(header.isGroupHeader).toBe(true);
	});

	it('los miembros no llevan la marca', () => {
		const [header] = projectGroupedTree({
			nodes: [member('a1', 'alfa')],
			groups: [],
			memberships: {},
			providerId: 'props',
			noGroupLabel: 'Sin grupo',
			filtered: false,
		});
		for (const child of header.children ?? []) {
			expect(child.isGroupHeader).not.toBe(true);
		}
	});
});

describe('B-groupbody criterio 2: select en files selecciona a los miembros', () => {
	type FilesHarness = {
		interactionMode: 'open' | 'select' | 'filter' | 'add';
		selectedFilePaths: Set<string>;
		selectionAnchorPath: string | null;
		_lastRenderTree: TreeNode<FileMeta>[];
		_groupIds: Set<string>;
		_activateGroupRow: (id: string) => void;
		projectedNodes: (
			nodes: readonly TreeNode<FileMeta>[],
		) => TreeNode<FileMeta>[];
		_applyFileSelection: (selection: {
			selectedPaths: Set<string>;
			anchorPath: string | null;
		}) => void;
		_toggleFolderWithStickyAnchor: (id: string) => void;
	};

	function fileNode(id: string): TreeNode<FileMeta> {
		return {
			id,
			label: id,
			depth: 1,
			meta: { file: null, folder: null, isFolder: false, folderPath: id },
		};
	}

	async function filesHarness(): Promise<{
		panel: FilesHarness;
		applied: Array<{ selectedPaths: Set<string>; anchorPath: string | null }>;
		toggled: string[];
	}> {
		const { FilesExplorerPanel } = await import(
			'../../src/components/containers/explorerFiles'
		);
		const panel = Object.create(
			FilesExplorerPanel.prototype,
		) as unknown as FilesHarness;
		const applied: Array<{
			selectedPaths: Set<string>;
			anchorPath: string | null;
		}> = [];
		const toggled: string[] = [];
		const projected: TreeNode<FileMeta>[] = [
			{
				id: 'g1',
				label: 'g1',
				depth: 0,
				meta: { file: null, folder: null, isFolder: true, folderPath: '' },
				showCaret: true,
				isGroupHeader: true,
				children: [fileNode('a.md'), fileNode('b.md')],
			},
		];
		panel.interactionMode = 'select';
		panel.selectedFilePaths = new Set<string>();
		panel.selectionAnchorPath = null;
		panel._lastRenderTree = [];
		panel._groupIds = new Set<string>(['g1']);
		panel.projectedNodes = () => projected;
		panel._applyFileSelection = (selection) => {
			panel.selectedFilePaths = new Set(selection.selectedPaths);
			panel.selectionAnchorPath = selection.anchorPath;
			applied.push(selection);
		};
		panel._toggleFolderWithStickyAnchor = (id: string) => {
			toggled.push(id);
		};
		return { panel, applied, toggled };
	}

	it('en select, el cuerpo selecciona a todos los miembros (no al id del grupo)', async () => {
		const { panel, applied, toggled } = await filesHarness();
		panel._activateGroupRow('g1');
		expect(toggled).toEqual([]);
		expect(applied).toHaveLength(1);
		expect([...(applied[0]?.selectedPaths ?? [])].sort()).toEqual([
			'a.md',
			'b.md',
		]);
		expect(applied[0]?.selectedPaths.has('g1')).toBe(false);
	});

	it('en select con miembros ya seleccionados, el cuerpo los deselecciona', async () => {
		const { panel, applied } = await filesHarness();
		panel.selectedFilePaths = new Set<string>(['a.md']);
		panel._activateGroupRow('g1');
		expect(applied).toHaveLength(1);
		expect([...(applied[0]?.selectedPaths ?? [])]).toEqual([]);
	});

	it('fuera de select, el cuerpo colapsa/expande (fallback open)', async () => {
		const { panel, applied, toggled } = await filesHarness();
		panel.interactionMode = 'open';
		panel._activateGroupRow('g1');
		expect(toggled).toEqual(['g1']);
		expect(applied).toEqual([]);
	});
});

describe('B-groupbody: helpers puros de miembros (compartidos por las 5 scenes)', () => {
	it('groupMemberEntityId quita solo el sufijo @grupo de las filas multi-grupo', () => {
		expect(groupMemberEntityId('a.md')).toBe('a.md');
		expect(groupMemberEntityId('a.md@vaultman.group.preset:A')).toBe('a.md');
	});

	it('collectGroupMemberIds recorre descendientes y deduplica entidades', () => {
		const rows: TreeNode<unknown>[] = [
			{ id: 'x.md@g1', label: 'x', depth: 1 },
			{
				id: 'folder:f',
				label: 'f',
				depth: 1,
				children: [
					{ id: 'y.md', label: 'y', depth: 2 },
					{ id: 'x.md@g1', label: 'x', depth: 2 },
				],
			},
		];
		expect(collectGroupMemberIds(rows)).toEqual(['x.md', 'folder:f', 'y.md']);
		expect(collectGroupMemberIds(undefined)).toEqual([]);
	});

	it('toggleGroupMembers conmuta el bloque entero: alguno dentro → fuera todos; ninguno → dentro todos', () => {
		const none = toggleGroupMembers(new Set(['z.md']), ['a.md', 'b.md']);
		expect(none.anySelected).toBe(false);
		expect([...none.next].sort()).toEqual(['a.md', 'b.md', 'z.md']);
		const some = toggleGroupMembers(new Set(['a.md', 'z.md']), ['a.md', 'b.md']);
		expect(some.anySelected).toBe(true);
		expect([...some.next]).toEqual(['z.md']);
	});
});
