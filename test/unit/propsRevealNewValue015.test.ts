import { beforeAll, describe, expect, it, vi } from 'vitest';
import { TFile } from 'obsidian';

import {
	resolveRevealTarget,
	validateRevealMutationGuard,
	type RevealTargetContext,
} from '../../src/logic/logicRevealActiveFileProps';
import { PropsExplorerPanel, type PanelPluginCtx } from '../../src/components/containers/explorerProps';
import type { TreeNode, PropMeta } from '../../src/types/typeTree';

class TestClassList {
	private readonly values = new Set<string>();

	add(...tokens: string[]): void {
		for (const t of tokens) if (t) this.values.add(t);
	}

	remove(...tokens: string[]): void {
		for (const t of tokens) this.values.delete(t);
	}

	contains(token: string): boolean {
		return this.values.has(token);
	}

	toggle(token: string, force?: boolean): boolean {
		const shouldAdd = force ?? !this.values.has(token);
		if (shouldAdd) this.add(token);
		else this.remove(token);
		return shouldAdd;
	}

	set(value: string): void {
		this.values.clear();
		for (const t of value.split(/\s+/)) if (t) this.values.add(t);
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
	readonly style: Record<string, string> & {
		setProperty: (name: string, val: string) => void;
		removeProperty: (name: string) => void;
	} = Object.assign({} as Record<string, string>, {
		setProperty: (name: string, val: string) => {
			this.style[name] = val;
		},
		removeProperty: (name: string) => {
			delete this.style[name];
		},
	});
	parentElement: TestElement | null = null;
	textContent = '';
	value = '';
	scrollTop = 0;
	clientHeight = 800;
	clientWidth = 400;
	ownerDocument: Document | null = null;
	onclick: ((event: MouseEvent) => void) | null = null;

	constructor(readonly tagName = 'div', cls = '', text = '') {
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

	private create(tagName: string, options: CreateOptions | string): TestElement {
		const normalized = typeof options === 'string' ? { cls: options } : options;
		const child = new TestElement(tagName, normalized.cls ?? '', normalized.text ?? '');
		child.value = normalized.value ?? '';
		if (normalized.type) child.setAttribute('type', normalized.type);
		for (const [name, val] of Object.entries(normalized.attr ?? {})) {
			child.setAttribute(name, String(val));
		}
		return this.appendChild(child);
	}

	appendChild<T extends TestElement>(child: T): T {
		child.remove();
		child.parentElement = this;
		this.children.push(child);
		return child;
	}

	contains(target: unknown): boolean {
		return (
			target === this ||
			this.children.some((child) => child.contains(target))
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

	setAttr(name: string, value: string): void {
		this.setAttribute(name, value);
	}

	removeAttribute(name: string): void {
		this.attributes.delete(name);
	}

	addEventListener(): void {}
	removeEventListener(): void {}
	scrollIntoView(): void {}
	scrollTo(): void {}
	focus(): void {}
	select(): void {}
	dispatchEvent(): boolean {
		return true;
	}

	querySelector(selector: string): TestElement | null {
		if (selector.startsWith('.')) {
			const cls = selector.slice(1);
			return this.find((node) => node.classList.contains(cls));
		}
		return null;
	}

	querySelectorAll(_selector: string): TestElement[] {
		return [];
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

beforeAll(() => {
	const runFrame = (callback: FrameRequestCallback): number => {
		callback(0);
		return 1;
	};
	vi.stubGlobal('requestAnimationFrame', runFrame);
	vi.stubGlobal('cancelAnimationFrame', () => {});
	const body = new TestElement('body');
	const doc = {
		body,
		querySelector: () => null,
		querySelectorAll: () => [],
		createElement: (tag: string) => new TestElement(tag),
	};
	vi.stubGlobal('document', doc);
	vi.stubGlobal('activeDocument', {
		body,
	});
	vi.stubGlobal('window', {
		document: doc,
		requestAnimationFrame: runFrame,
		cancelAnimationFrame: () => {},
		setTimeout: (fn: () => void) => {
			fn();
			return 1;
		},
		clearTimeout: () => {},
	});
	vi.stubGlobal('HTMLElement', TestElement);
	vi.stubGlobal('HTMLInputElement', TestElement);
});

describe('U130-GGC-015 target resolution', () => {
	const propNode: TreeNode<PropMeta> = {
		id: 'status',
		label: 'status',
		count: 1,
		depth: 0,
		coreCls: 'tree-item-self',
		children: [],
		meta: { propName: 'status', propType: 'text', isValueNode: false },
	};

	it('returns null when reveal mode is inactive', () => {
		const ctx: RevealTargetContext = {
			isRevealing: false,
			revealAnchor: 'current-file',
			currentFilePath: 'notes/active.md',
			instanceId: 'vm-1',
		};
		expect(resolveRevealTarget(propNode, ctx)).toBeNull();
	});

	it('returns null when there is no target file path', () => {
		const ctx: RevealTargetContext = {
			isRevealing: true,
			revealAnchor: 'current-file',
			currentFilePath: null,
			instanceId: 'vm-1',
		};
		expect(resolveRevealTarget(propNode, ctx)).toBeNull();
	});

	it('resolves unpinned reveal target to currentFilePath', () => {
		const ctx: RevealTargetContext = {
			isRevealing: true,
			revealAnchor: 'current-file',
			currentFilePath: 'notes/active.md',
			instanceId: 'vm-1',
		};
		const target = resolveRevealTarget(propNode, ctx);
		expect(target).toEqual({
			propName: 'status',
			targetPath: 'notes/active.md',
			ownerInstanceId: 'vm-1',
		});
	});

	it('resolves pinned reveal target to revealAnchorPath outranking currentFilePath', () => {
		const ctx: RevealTargetContext = {
			isRevealing: true,
			revealAnchor: 'pinned',
			revealAnchorPath: 'notes/pinned.md',
			currentFilePath: 'notes/active.md',
			instanceId: 'vm-2',
		};
		const target = resolveRevealTarget(propNode, ctx);
		expect(target).toEqual({
			propName: 'status',
			targetPath: 'notes/pinned.md',
			ownerInstanceId: 'vm-2',
		});
	});

	it('rejects synthetic add-property row as a target', () => {
		const addRow: TreeNode<PropMeta> = {
			id: '__add_property__',
			label: '+ Add property',
			count: 0,
			depth: 0,
			coreCls: 'tree-item-self',
			children: [],
			meta: {
				propName: '',
				propType: 'text',
				isValueNode: false,
				isAddPropertyRow: true,
			},
		};
		const ctx: RevealTargetContext = {
			isRevealing: true,
			revealAnchor: 'current-file',
			currentFilePath: 'notes/active.md',
			instanceId: 'vm-1',
		};
		expect(resolveRevealTarget(addRow, ctx)).toBeNull();
	});
});

describe('U130-GGC-015 mutation guard', () => {
	it('blocks write when not in reveal mode', () => {
		const result = validateRevealMutationGuard({
			expectedTargetPath: 'notes/active.md',
			expectedOwnerInstanceId: 'vm-1',
			actualTargetPath: 'notes/active.md',
			actualInstanceId: 'vm-1',
			isRevealing: false,
		});
		expect(result).toEqual({ allowed: false, reason: 'not_revealing' });
	});

	it('blocks write when actual target path is missing', () => {
		const result = validateRevealMutationGuard({
			expectedTargetPath: 'notes/active.md',
			expectedOwnerInstanceId: 'vm-1',
			actualTargetPath: null,
			actualInstanceId: 'vm-1',
			isRevealing: true,
		});
		expect(result).toEqual({ allowed: false, reason: 'no_target_path' });
	});

	it('blocks cross-target write when expected target path differs from actual path', () => {
		const result = validateRevealMutationGuard({
			expectedTargetPath: 'notes/original.md',
			expectedOwnerInstanceId: 'vm-1',
			actualTargetPath: 'notes/switched.md',
			actualInstanceId: 'vm-1',
			isRevealing: true,
		});
		expect(result).toEqual({ allowed: false, reason: 'target_path_mismatch' });
	});

	it('blocks cross-instance write when expected owner differs from actual instance', () => {
		const result = validateRevealMutationGuard({
			expectedTargetPath: 'notes/active.md',
			expectedOwnerInstanceId: 'vm-1',
			actualTargetPath: 'notes/active.md',
			actualInstanceId: 'vm-2',
			isRevealing: true,
		});
		expect(result).toEqual({ allowed: false, reason: 'owner_instance_mismatch' });
	});

	it('allows mutation when target and owner match in reveal mode', () => {
		const result = validateRevealMutationGuard({
			expectedTargetPath: 'notes/active.md',
			expectedOwnerInstanceId: 'vm-1',
			actualTargetPath: 'notes/active.md',
			actualInstanceId: 'vm-1',
			isRevealing: true,
		});
		expect(result).toEqual({ allowed: true });
	});
});

function createMockPluginCtx(files: Record<string, Record<string, unknown>>): {
	plugin: PanelPluginCtx;
	processFrontMatterSpy: ReturnType<typeof vi.fn>;
	setActiveFile: (path: string | null) => void;
} {
	const mockFiles = new Map<string, TFile>();
	for (const path of Object.keys(files)) {
		const f = new TFile();
		f.path = path;
		f.basename = path.replace(/^.*\//, '').replace(/\.md$/, '');
		mockFiles.set(path, f);
	}

	let activeFile: TFile | null = null;
	const fileOpenListeners = new Set<(file: TFile | null) => void>();

	const setActiveFile = (path: string | null) => {
		activeFile = path ? (mockFiles.get(path) ?? null) : null;
		for (const listener of fileOpenListeners) {
			listener(activeFile);
		}
	};

	const processFrontMatterSpy = vi.fn(
		async (file: TFile, fn: (fm: Record<string, unknown>) => void) => {
			const current = files[file.path] ?? {};
			fn(current);
		},
	);

	const plugin: PanelPluginCtx = {
		app: {
			vault: {
				getFileByPath: (p: string) => mockFiles.get(p) ?? null,
				getMarkdownFiles: () => Array.from(mockFiles.values()),
				on: vi.fn().mockReturnValue({ id: 'dummy' }),
			},
			metadataCache: {
				getFileCache: (file: TFile) => ({
					frontmatter: files[file.path] ?? {},
				}),
				on: vi.fn().mockReturnValue({ id: 'dummy' }),
			},
			fileManager: {
				processFrontMatter: processFrontMatterSpy,
			},
			workspace: {
				openLinkText: vi.fn(),
				getActiveFile: () => activeFile,
				on: vi.fn((event: string, listener: (file: TFile | null) => void) => {
					if (event === 'file-open') {
						fileOpenListeners.add(listener);
					}
					return listener;
				}),
				offref: vi.fn((listener: unknown) => {
					fileOpenListeners.delete(listener as (file: TFile | null) => void);
				}),
			},
		} as unknown as PanelPluginCtx['app'],
		filterService: {
			activeFilter: { type: 'group', logic: 'all', children: [] },
			setPropertyNodePolarity: vi.fn(),
		} as unknown as PanelPluginCtx['filterService'],
		contextMenuService: {
			invokeAction: vi.fn(),
		} as unknown as PanelPluginCtx['contextMenuService'],
		queueService: {
			queue: [],
			addOrRun: vi.fn(),
			remove: vi.fn(),
		} as unknown as PanelPluginCtx['queueService'],
		propertyIndex: {
			getPropertyNames: () => ['status', 'tags'],
			getPropertyValues: (name: string) =>
				name === 'status' ? ['open', 'in-progress', 'done'] : ['book', 'work'],
		} as unknown as PanelPluginCtx['propertyIndex'],
	};

	return { plugin, processFrontMatterSpy, setActiveFile };
}

describe('PropsExplorerPanel New value in Props Reveal', () => {
	it('projects cell_hover on node_prop in Props Reveal when cell_hover pill is active', () => {
		const files = {
			'notes/test.md': { status: 'open' },
		};
		const { plugin, setActiveFile } = createMockPluginCtx(files);
		const container = new TestElement('div') as unknown as HTMLElement;
		const panel = new PropsExplorerPanel(container, plugin);

		panel.setSelectionScope({ instanceId: 'vm-1', revision: 1, scene: 'props' });
		panel.setVisibleCells(new Set(['icon', 'text', 'cell_hover']));

		// Not revealing yet: property nodes have no cell_hover
		const initialTree = panel.lastRenderTree;
		const propBefore = initialTree.find((n) => n.id === 'status');
		const hoverCellBefore = propBefore?.cells?.find((c) => c.kind === 'cell_hover');
		expect(hoverCellBefore).toBeUndefined();

		// Activate reveal mode on notes/test.md
		setActiveFile('notes/test.md');
		panel.toggleRevealActiveFile();

		const revealTree = panel.lastRenderTree;
		const propNode = revealTree.find((n) => n.id === 'status');
		expect(propNode).toBeDefined();

		const hoverCell = propNode?.cells?.find((c) => c.kind === 'cell_hover');
		expect(hoverCell).toBeDefined();
		expect(hoverCell?.actions).toEqual([
			expect.objectContaining({
				id: 'new-value',
				icon: 'lucide-plus',
				label: 'New value',
			}),
		]);
	});

	it('invoking new-value expands the property, creates a temporary node_value, and sets editingId', () => {
		const files = {
			'notes/test.md': { status: 'open' },
		};
		const { plugin, setActiveFile } = createMockPluginCtx(files);
		const container = new TestElement('div') as unknown as HTMLElement;
		const panel = new PropsExplorerPanel(container, plugin);

		panel.setSelectionScope({ instanceId: 'vm-1', revision: 1, scene: 'props' });
		panel.setVisibleCells(new Set(['icon', 'text', 'cell_hover', 'nested']));
		setActiveFile('notes/test.md');
		panel.toggleRevealActiveFile();

		expect(panel.hasExpandedNodes()).toBe(false);

		const started = panel.startNewValueForProp('status');
		expect(started).toBe(true);

		// Property is expanded
		expect(panel.hasExpandedNodes()).toBe(true);

		// State tracks target and owner
		const addingState = panel.revealAddingState;
		expect(addingState).toBeDefined();
		expect(addingState?.stage).toBe('subsequent_value');
		expect(addingState?.propName).toBe('status');
		expect(addingState?.targetPath).toBe('notes/test.md');
		expect(addingState?.ownerInstanceId).toBe('vm-1');

		// Projected tree contains the temporary child in editing mode
		const tree = panel.lastRenderTree;
		const prop = tree.find((n) => n.id === 'status');
		expect(prop).toBeDefined();
		const tempChild = prop?.children?.find((c) => c.id === addingState?.tempId);
		expect(tempChild).toBeDefined();
		expect(tempChild?.meta.isValueNode).toBe(true);
		expect(tempChild?.meta.rawValue).toBe('');
	});

	it('cancellation via onCancelRename writes nothing to frontmatter', () => {
		const files = {
			'notes/test.md': { status: 'open' },
		};
		const { plugin, processFrontMatterSpy, setActiveFile } = createMockPluginCtx(files);
		const container = new TestElement('div') as unknown as HTMLElement;
		const panel = new PropsExplorerPanel(container, plugin);

		panel.setSelectionScope({ instanceId: 'vm-1', revision: 1, scene: 'props' });
		panel.setVisibleCells(new Set(['icon', 'text', 'cell_hover', 'nested']));
		setActiveFile('notes/test.md');
		panel.toggleRevealActiveFile();

		panel.startNewValueForProp('status');
		expect(panel.revealAddingState).toBeDefined();

		// Simulate cancel (Escape) via options callback
		const opts = (panel as unknown as { view: { _opts?: { onCancelRename?: () => void } } })
			.view._opts;
		expect(opts?.onCancelRename).toBeDefined();
		opts?.onCancelRename?.();

		// State cleared and zero writes made
		expect(panel.revealAddingState).toBeUndefined();
		expect(processFrontMatterSpy).not.toHaveBeenCalled();

		// Projected tree no longer has any temporary child
		const tree = panel.lastRenderTree;
		const prop = tree.find((n) => n.id === 'status');
		expect(prop?.children?.length).toBe(1);
		expect(prop?.children?.[0].meta.rawValue).toBe('open');
	});

	it('cancellation via empty string blur writes nothing to frontmatter', async () => {
		const files = {
			'notes/test.md': { status: 'open' },
		};
		const { plugin, processFrontMatterSpy, setActiveFile } = createMockPluginCtx(files);
		const container = new TestElement('div') as unknown as HTMLElement;
		const panel = new PropsExplorerPanel(container, plugin);

		panel.setSelectionScope({ instanceId: 'vm-1', revision: 1, scene: 'props' });
		panel.setVisibleCells(new Set(['icon', 'text', 'cell_hover']));
		setActiveFile('notes/test.md');
		panel.toggleRevealActiveFile();

		panel.startNewValueForProp('status');
		const tempId = panel.revealAddingState!.tempId;

		const opts = (panel as unknown as {
			view: {
				_opts?: { onBlurRename?: (id: string, val: string) => void };
			};
		}).view._opts;
		expect(opts?.onBlurRename).toBeDefined();
		opts?.onBlurRename?.(tempId, '   ');

		expect(panel.revealAddingState).toBeUndefined();
		expect(processFrontMatterSpy).not.toHaveBeenCalled();
	});

	it('committing a non-empty value writes to the target note frontmatter', async () => {
		const files: Record<string, Record<string, unknown>> = {
			'notes/test.md': { status: 'open' },
		};
		const { plugin, processFrontMatterSpy, setActiveFile } = createMockPluginCtx(files);
		const container = new TestElement('div') as unknown as HTMLElement;
		const panel = new PropsExplorerPanel(container, plugin);

		panel.setSelectionScope({ instanceId: 'vm-1', revision: 1, scene: 'props' });
		panel.setVisibleCells(new Set(['icon', 'text', 'cell_hover']));
		setActiveFile('notes/test.md');
		panel.toggleRevealActiveFile();

		panel.startNewValueForProp('status');
		const tempId = panel.revealAddingState!.tempId;

		const opts = (panel as unknown as {
			view: {
				_opts?: { onRename?: (id: string, val: string) => void };
			};
		}).view._opts;
		opts?.onRename?.(tempId, 'closed');

		// Wait for promise tick
		await new Promise((resolve) => setTimeout(resolve, 10));

		expect(processFrontMatterSpy).toHaveBeenCalledOnce();
		expect(files['notes/test.md'].status).toEqual(['open', 'closed']);
	});

	it('targets pinned reveal note over workspace active file', () => {
		const files = {
			'notes/active.md': { tags: ['active-tag'] },
			'notes/pinned.md': { tags: ['pinned-tag'] },
		};
		const { plugin, setActiveFile } = createMockPluginCtx(files);
		const container = new TestElement('div') as unknown as HTMLElement;
		const panel = new PropsExplorerPanel(container, plugin);

		panel.setSelectionScope({ instanceId: 'vm-1', revision: 1, scene: 'props' });
		panel.setVisibleCells(new Set(['icon', 'text', 'cell_hover']));
		setActiveFile('notes/active.md');
		panel.toggleRevealActiveFile();

		// Pin to notes/pinned.md
		panel.setSortState({
			activeScope: 'all',
			sorts: { all: { sortBy: 'name', direction: 'asc' } },
			nodeTypeFilter: null,
			revealAnchor: 'pinned',
			revealAnchorPath: 'notes/pinned.md',
		});

		panel.startNewValueForProp('tags');
		expect(panel.revealAddingState?.targetPath).toBe('notes/pinned.md');
	});

	it('mutation guard prevents cross-instance writes when instance ID or target does not match', async () => {
		const files: Record<string, Record<string, unknown>> = {
			'notes/instance1.md': { status: 'draft' },
			'notes/instance2.md': { status: 'published' },
		};
		const { plugin, processFrontMatterSpy, setActiveFile } = createMockPluginCtx(files);

		// Instance 1
		const container1 = new TestElement('div') as unknown as HTMLElement;
		const panel1 = new PropsExplorerPanel(container1, plugin);
		panel1.setSelectionScope({ instanceId: 'inst-1', revision: 1, scene: 'props' });
		panel1.setVisibleCells(new Set(['icon', 'text', 'cell_hover']));
		setActiveFile('notes/instance1.md');
		panel1.toggleRevealActiveFile();

		panel1.startNewValueForProp('status');
		const tempId = panel1.revealAddingState!.tempId;

		// Simulate external/mismatched instance hijacking the panel selection scope
		panel1.setSelectionScope({ instanceId: 'inst-2', revision: 1, scene: 'props' });

		const opts = (panel1 as unknown as {
			view: {
				_opts?: { onRename?: (id: string, val: string) => void };
			};
		}).view._opts;
		opts?.onRename?.(tempId, 'in-review');

		await new Promise((resolve) => setTimeout(resolve, 10));

		// Mutation guard blocked the write because inst-2 !== inst-1
		expect(processFrontMatterSpy).not.toHaveBeenCalled();
		expect(files['notes/instance1.md'].status).toBe('draft');
	});

	it('does not write to the old note after an unpinned reveal changes its active file', async () => {
		const files: Record<string, Record<string, unknown>> = {
			'notes/first.md': { status: 'draft' },
			'notes/second.md': { status: 'published' },
		};
		const { plugin, processFrontMatterSpy, setActiveFile } = createMockPluginCtx(files);
		const panel = new PropsExplorerPanel(new TestElement('div') as unknown as HTMLElement, plugin);
		panel.setSelectionScope({ instanceId: 'vm-1', revision: 1, scene: 'props' });
		panel.setVisibleCells(new Set(['icon', 'text', 'cell_hover']));
		setActiveFile('notes/first.md');
		panel.toggleRevealActiveFile();
		expect(panel.startNewValueForProp('status')).toBe(true);
		const tempId = panel.revealAddingState!.tempId;
		setActiveFile('notes/second.md');
		const opts = (panel as unknown as {
			view: { _opts?: { onRename?: (id: string, val: string) => void } };
		}).view._opts;
		opts?.onRename?.(tempId, 'review');
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(processFrontMatterSpy).not.toHaveBeenCalled();
		expect(files['notes/first.md'].status).toBe('draft');
		expect(files['notes/second.md'].status).toBe('published');
	});
});
