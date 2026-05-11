import { parseYaml as parseYamlImpl, stringifyYaml as stringifyYamlImpl } from './yaml';

type TestGlobal = typeof globalThis & {
	activeWindow?: Window;
};

const testGlobal = globalThis as TestGlobal;
testGlobal.activeWindow ??= globalThis as unknown as Window;

// ===== Class stubs =====

export class TFile {
	path = '';
	name = '';
	basename = '';
	extension = 'md';
	parent: TFolder | null = null;
	stat = { ctime: 0, mtime: 0, size: 0 };
}

export class TFolder {
	path = '';
	name = '';
	parent: TFolder | null = null;
	children: Array<TFile | TFolder> = [];
	isRoot(): boolean {
		return this.parent === null;
	}
}

export class TAbstractFile {
	path = '';
	name = '';
}

export class Component {
	private _children: Component[] = [];
	private _events: Array<{ off: () => void }> = [];
	private _intervals: number[] = [];
	addChild<T extends Component>(child: T): T {
		this._children.push(child);
		return child;
	}
	removeChild<T extends Component>(child: T): T {
		this._children = this._children.filter((c) => c !== child);
		return child;
	}
	register(cb: () => void): void {
		this._events.push({ off: cb });
	}
	registerEvent(ref: { off?: () => void } | unknown): void {
		if (ref && typeof (ref as { off?: () => void }).off === 'function') {
			this._events.push(ref as { off: () => void });
		}
	}
	registerInterval(id: number): number {
		this._intervals.push(id);
		return id;
	}
	registerDomEvent(): void {
		// no-op for tests
	}
	load(): void {
		this.onload?.();
	}
	unload(): void {
		this.onunload?.();
		for (const e of this._events) e.off();
		for (const i of this._intervals) clearInterval(i);
		for (const c of this._children) c.unload();
		this._events = [];
		this._intervals = [];
		this._children = [];
	}
	onload?(): void;
	onunload?(): void;
}

export interface WorkspaceLeaf {
	app?: App;
	getViewState?(): { type?: string };
}

export abstract class View extends Component {
	app: App | undefined;
	leaf: WorkspaceLeaf;
	containerEl: HTMLElement;

	constructor(leaf: WorkspaceLeaf) {
		super();
		this.leaf = leaf;
		this.app = leaf.app;
		this.containerEl = makeEl();
		this.containerEl.addClass?.('workspace-leaf-content');
		const type = this.getViewType();
		if (type) this.containerEl.setAttribute?.('data-type', type);
	}

	protected onOpen(): Promise<void> {
		return Promise.resolve();
	}

	protected onClose(): Promise<void> {
		return Promise.resolve();
	}

	abstract getViewType(): string;
	abstract getDisplayText(): string;
}

export abstract class ItemView extends View {
	contentEl: HTMLElement;

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
		this.contentEl = makeEl();
		this.contentEl.addClass?.('view-content');
		this.containerEl.appendChild?.(this.contentEl);
	}

	addAction(): HTMLElement {
		return makeEl();
	}
}

export class Events {
	private listeners = new Map<string, Set<(...data: unknown[]) => unknown>>();
	on(name: string, cb: (...data: unknown[]) => unknown): { off: () => void } {
		let set = this.listeners.get(name);
		if (!set) {
			set = new Set();
			this.listeners.set(name, set);
		}
		set.add(cb);
		return { off: () => set!.delete(cb) };
	}
	off(name: string, cb: (...data: unknown[]) => unknown): void {
		this.listeners.get(name)?.delete(cb);
	}
	trigger(name: string, ...data: unknown[]): void {
		this.listeners.get(name)?.forEach((cb) => cb(...data));
	}
}

export class Notice {
	message = '';
	constructor(msg = '', _timeout = 0) {
		this.message = msg;
	}
	setMessage(msg: string): this {
		this.message = msg;
		return this;
	}
	hide(): void {
		// no-op
	}
}

export interface MenuItem {
	title: string;
	icon: string | undefined;
	submenu: Menu | null;
	onClickCb: (() => void) | undefined;
	setTitle(t: string): MenuItem;
	setIcon(i: string): MenuItem;
	onClick(cb: () => void): MenuItem;
	setSubmenu(): Menu;
}

export class Menu {
	items: Array<{ title: string; icon?: string; submenu?: Menu | null; onClick?: () => void }> = [];
	addItem(cb: (item: MenuItem) => void): this {
		const wrapper: MenuItem = {
			title: '',
			icon: undefined,
			submenu: null,
			onClickCb: undefined,
			setTitle(t: string) {
				this.title = t;
				return this;
			},
			setIcon(i: string) {
				this.icon = i;
				return this;
			},
			onClick(c: () => void) {
				this.onClickCb = c;
				return this;
			},
			setSubmenu() {
				this.submenu = new Menu();
				return this.submenu;
			},
		};
		cb(wrapper);
		this.items.push({
			title: wrapper.title,
			icon: wrapper.icon,
			submenu: wrapper.submenu,
			onClick: wrapper.onClickCb,
		});
		return this;
	}
	addSeparator(): this {
		this.items.push({ title: '---' });
		return this;
	}
	showAtPosition(_pos: { x: number; y: number }): this {
		return this;
	}
	showAtMouseEvent(_e: MouseEvent): this {
		return this;
	}
}

export class Modal {
	contentEl: HTMLElement;
	app: App;
	private opened = false;
	constructor(app: App) {
		this.app = app;
		this.contentEl = makeEl();
	}
	open(): void {
		this.opened = true;
		this.onOpen?.();
	}
	close(): void {
		this.opened = false;
		this.onClose?.();
	}
	onOpen?(): void;
	onClose?(): void;
}

export abstract class FuzzySuggestModal<T> extends Modal {
	getSuggestions(_query: string): Array<{ item: T; match: unknown }> {
		return this.getItems().map((item) => ({ item, match: null }));
	}
	renderSuggestion(item: { item: T }, el: HTMLElement): void {
		el.textContent = this.getItemText(item.item);
	}
	onChooseSuggestion(item: { item: T }, evt: MouseEvent | KeyboardEvent): void {
		this.onChooseItem(item.item, evt);
	}
	abstract getItems(): T[];
	abstract getItemText(item: T): string;
	abstract onChooseItem(item: T, evt: MouseEvent | KeyboardEvent): void;
}

export class MarkdownRenderer {
	static async render(
		_app: App,
		markdown: string,
		el: HTMLElement,
		_sourcePath: string,
		_component: Component,
	): Promise<void> {
		el.textContent = markdown;
	}
}

export class AbstractInputSuggest<T> {
	app: App;
	inputEl: HTMLInputElement;
	private closed = false;
	constructor(app: App, inputEl: HTMLInputElement) {
		this.app = app;
		this.inputEl = inputEl;
	}
	close(): void {
		this.closed = true;
	}
	getSuggestions(_query: string): T[] | Promise<T[]> {
		return [];
	}
	renderSuggestion(_value: T, _el: HTMLElement): void {}
	selectSuggestion(_value: T): void {}
}

export interface CachedMetadata {
	frontmatter?: Record<string, unknown>;
	tags?: Array<{ tag: string; position?: unknown }>;
}

export interface App {
	vault: Vault;
	metadataCache: MetadataCache;
	fileManager: FileManager;
	workspace: Workspace;
}

export interface Vault {
	configDir: string;
	getFiles(): TFile[];
	getMarkdownFiles(): TFile[];
	getFileByPath(path: string): TFile | null;
	getAbstractFileByPath(path: string): TFile | TFolder | null;
	getAllFolders(includeRoot?: boolean): TFolder[];
	read(file: TFile): Promise<string>;
	cachedRead(file: TFile): Promise<string>;
	modify(file: TFile, content: string): Promise<void>;
	create(path: string, content: string): Promise<TFile>;
	process(file: TFile, fn: (current: string) => string): Promise<void>;
	adapter: VaultAdapter;
	on(name: string, cb: (...args: unknown[]) => unknown): { off: () => void };
	offref(ref: { off: () => void }): void;
}

export interface VaultAdapter {
	read(path: string): Promise<string>;
	write(path: string, content: string): Promise<void>;
	exists(path: string): Promise<boolean>;
	list(path: string): Promise<{ files: string[]; folders: string[] }>;
}

export interface MetadataCache {
	getFileCache(file: TFile): CachedMetadata | null;
	getAllPropertyInfos?(): Record<string, { type: string }>;
	getTags?(): Record<string, number>;
	on(name: string, cb: (...args: unknown[]) => unknown): { off: () => void };
}

export interface FileManager {
	processFrontMatter(file: TFile, fn: (fm: Record<string, unknown>) => void): Promise<void>;
	renameFile(file: TFile, newPath: string): Promise<void>;
	trashFile(file: TFile): Promise<void>;
}

export interface Workspace {
	on(name: string, cb: (...args: unknown[]) => unknown): { off: () => void };
	getActiveFile(): TFile | null;
}

// ===== Pure helpers =====

export function getAllTags(meta: CachedMetadata | null | undefined): string[] | null {
	if (!meta) return null;
	const fm = meta.frontmatter ?? {};
	const out: string[] = [];
	const fmTags = fm.tags ?? fm.tag;
	if (Array.isArray(fmTags)) {
		for (const t of fmTags) out.push(`#${String(t).replace(/^#/, '')}`);
	} else if (typeof fmTags === 'string') {
		for (const t of fmTags.split(/[,\s]+/)) {
			if (t) out.push(`#${t.replace(/^#/, '')}`);
		}
	}
	for (const t of meta.tags ?? []) {
		out.push(t.tag.startsWith('#') ? t.tag : `#${t.tag}`);
	}
	return out;
}

export function prepareSimpleSearch(query: string) {
	const q = query.toLowerCase();
	return (text: string): { score: number } | null => {
		if (!q) return { score: 0 };
		return text.toLowerCase().includes(q) ? { score: 1 } : null;
	};
}

export function prepareFuzzySearch(query: string) {
	return prepareSimpleSearch(query);
}

export function setIcon(_el: HTMLElement, _name: string): void {
	// no-op for tests
}

export const parseYaml = parseYamlImpl;
export const stringifyYaml = stringifyYamlImpl;

// ===== Mock factories used by individual tests =====

export interface MockAppOptions {
	files?: TFile[];
	metadata?: Map<string, CachedMetadata>;
	folders?: TFolder[];
	configDir?: string;
	adapterFiles?: Map<string, string>;
}

export function mockTFile(
	path: string,
	options: { frontmatter?: Record<string, unknown> } = {},
): TFile {
	const file = new TFile();
	file.path = path;
	const segs = path.split('/');
	file.name = segs[segs.length - 1];
	const dot = file.name.lastIndexOf('.');
	file.extension = dot >= 0 ? file.name.slice(dot + 1) : '';
	file.basename = dot >= 0 ? file.name.slice(0, dot) : file.name;
	const parentPath = segs.slice(0, -1).join('/');
	if (parentPath) {
		const folder = new TFolder();
		folder.path = parentPath;
		folder.name = parentPath.split('/').pop() ?? '';
		file.parent = folder;
	}
	(file as TFile & { _frontmatter?: Record<string, unknown> })._frontmatter = options.frontmatter;
	return file;
}

export function mockTFolder(path: string): TFolder {
	const folder = new TFolder();
	folder.path = path;
	folder.name = path.split('/').pop() ?? '';
	return folder;
}

export function mockApp(opts: MockAppOptions = {}): App {
	const files = opts.files ?? [];
	const folders = opts.folders ?? [];
	const meta = opts.metadata ?? new Map<string, CachedMetadata>();
	const adapterFiles = opts.adapterFiles ?? new Map<string, string>();

	for (const f of files) {
		if (!meta.has(f.path)) {
			const fm = (f as TFile & { _frontmatter?: Record<string, unknown> })._frontmatter;
			if (fm) meta.set(f.path, { frontmatter: { ...fm } });
		}
	}

	const events = new Events();

	const vault: Vault = {
		configDir: opts.configDir ?? '.obsidian',
		getFiles: () => [...files],
		getMarkdownFiles: () => [...files],
		getFileByPath: (path) => files.find((f) => f.path === path) ?? null,
		getAbstractFileByPath: (path) =>
			files.find((f) => f.path === path) ?? folders.find((f) => f.path === path) ?? null,
		getAllFolders: () => [...folders],
		read: async (file) => adapterFiles.get(file.path) ?? '',
		cachedRead: async (file) => adapterFiles.get(file.path) ?? '',
		modify: async (file, content) => {
			adapterFiles.set(file.path, content);
		},
		create: async (path, content) => {
			const f = mockTFile(path);
			files.push(f);
			adapterFiles.set(path, content);
			events.trigger('create', f);
			return f;
		},
		process: async (file, fn) => {
			const cur = adapterFiles.get(file.path) ?? '';
			adapterFiles.set(file.path, fn(cur));
		},
		adapter: {
			read: async (path) => {
				const v = adapterFiles.get(path);
				if (v == null) throw new Error(`ENOENT: ${path}`);
				return v;
			},
			write: async (path, content) => {
				adapterFiles.set(path, content);
			},
			exists: async (path) => adapterFiles.has(path),
			list: async (path) => {
				const prefix = path.endsWith('/') ? path : `${path}/`;
				const files = [...adapterFiles.keys()].filter((candidate) => {
					if (!candidate.startsWith(prefix)) return false;
					return !candidate.slice(prefix.length).includes('/');
				});
				return { files, folders: [] };
			},
		},
		on: (name, cb) => events.on(name, cb),
		offref: (ref) => ref.off(),
	};

	const metadataCache: MetadataCache = {
		getFileCache: (file) => meta.get(file.path) ?? null,
		on: (name, cb) => events.on(`meta:${name}`, cb),
	};

	const fileManager: FileManager = {
		processFrontMatter: async (file, fn) => {
			const cur = meta.get(file.path) ?? { frontmatter: {} };
			const fm = { ...cur.frontmatter };
			fn(fm);
			meta.set(file.path, { ...cur, frontmatter: fm });
		},
		renameFile: async (file, newPath) => {
			const old = file.path;
			file.path = newPath;
			file.name = newPath.split('/').pop() ?? '';
			file.basename = file.name.replace(/\.md$/, '');
			const m = meta.get(old);
			if (m) {
				meta.delete(old);
				meta.set(newPath, m);
			}
			const c = adapterFiles.get(old);
			if (c != null) {
				adapterFiles.delete(old);
				adapterFiles.set(newPath, c);
			}
		},
		trashFile: async (file) => {
			const idx = files.indexOf(file);
			if (idx >= 0) files.splice(idx, 1);
			meta.delete(file.path);
			adapterFiles.delete(file.path);
		},
	};

	const workspace: Workspace = {
		on: (name, cb) => events.on(`ws:${name}`, cb),
		getActiveFile: () => null,
	};

	return { vault, metadataCache, fileManager, workspace };
}

// Used by tests that mount Modals — attach a minimal HTMLElement-like surface
function makeEl(): HTMLElement {
	if (typeof document !== 'undefined') return document.createElement('div');
	const stub = {
		empty() {},
		addClass() {},
		removeClass() {},
		toggleClass() {},
		createEl(_tag: string, opts?: { text?: string; cls?: string }) {
			const child = makeEl();
			if (opts?.text) (child as unknown as { textContent: string }).textContent = opts.text;
			return child;
		},
		createDiv(opts?: { text?: string; cls?: string }) {
			const child = makeEl();
			if (opts?.text) (child as unknown as { textContent: string }).textContent = opts.text;
			return child;
		},
		createSpan(opts?: { text?: string }) {
			const child = makeEl();
			if (opts?.text) (child as unknown as { textContent: string }).textContent = opts.text;
			return child;
		},
		addEventListener() {},
		appendChild() {},
		focus() {},
		getAttribute() {
			return null;
		},
		setAttribute() {},
		setText() {},
		remove() {},
	};
	return stub as unknown as HTMLElement;
}
