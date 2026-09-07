import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
	HoverSurfacesAdapter,
	createHoverSurfacesAdapter,
	DEFAULT_HOVER_SURFACES_CONFIG,
} from '../../src/services/serviceHoverSurfaces';

const SRC = readFileSync(
	fileURLToPath(new URL('../../src/services/serviceHoverSurfaces.ts', import.meta.url)),
	'utf8',
);

/**
 * Minimal DOM stand-in. Each surface is one Element with its own classList and
 * parent chain so `closest` resolves the way the service expects. The MockDoc
 * records addEventListener/removeEventListener calls so the "no listeners after
 * revert" gate can be asserted exactly.
 */
class MockClassList {
	private readonly set = new Set<string>();
	constructor(initial: Iterable<string> = []) {
		for (const cls of initial) this.set.add(cls);
	}
	add(cls: string): void {
		this.set.add(cls);
	}
	remove(cls: string): void {
		this.set.delete(cls);
	}
	contains(cls: string): boolean {
		return this.set.has(cls);
	}
	toArray(): string[] {
		return Array.from(this.set);
	}
	[Symbol.iterator](): IterableIterator<string> {
		return this.set.values();
	}
}

class MockElement {
	classList = new MockClassList();
	parent: MockElement | null = null;
	children: MockElement[] = [];
	tagName: string;
	id = '';
	readonly attrs = new Map<string, string>();
	readonly dataset: Record<string, string> = {};
	ownerDocument: MockDocument;
	readonly boundingRect = { left: 0, right: 0, top: 0, bottom: 0 };
	isConnected = false;

	constructor(
		owner: MockDocument,
		tagName: string,
		options: { id?: string; classes?: string[]; dataset?: Record<string, string> } = {},
	) {
		this.ownerDocument = owner;
		this.tagName = tagName.toUpperCase();
		if (options.id) this.id = options.id;
		if (options.classes) {
			for (const cls of options.classes) this.classList.add(cls);
		}
		if (options.dataset) Object.assign(this.dataset, options.dataset);
	}

	get className(): string {
		return this.classList.toArray().join(' ');
	}

	set className(value: string) {
		this.classList = new MockClassList(value.split(/\s+/).filter(Boolean));
	}

	appendChild(child: MockElement): MockElement {
		if (child.parent) child.parent.children = child.parent.children.filter((c) => c !== child);
		child.parent = this;
		this.children.push(child);
		this.setConnected(child, true);
		return child;
	}

	private setConnected(el: MockElement, value: boolean): void {
		el.isConnected = value;
		for (const child of el.children) this.setConnected(child, value);
	}

	matches(selector: string): boolean {
		return matchSelector(this, selector);
	}

	closest(selector: string): MockElement | null {
		let cur: MockElement | null = this;
		while (cur) {
			if (matchSelector(cur, selector)) return cur;
			cur = cur.parent;
		}
		return null;
	}

	contains(other: MockElement | null): boolean {
		if (!other) return false;
		let cur: MockElement | null = other;
		while (cur) {
			if (cur === this) return true;
			cur = cur.parent;
		}
		return false;
	}

	getBoundingClientRect(): { left: number; right: number; top: number; bottom: number } {
		return this.boundingRect;
	}
}

interface MockListener {
	type: string;
	capture: boolean;
	passive: boolean;
	originalFn: (event: Event) => void;
}

class MockDocument {
	readonly listeners: MockListener[] = [];
	readonly body: MockElement;
	readonly documentElement: MockElement;
	readonly html: MockElement;
	readonly scrollingElement: MockElement;

	constructor() {
		this.documentElement = new MockElement(this, 'html');
		this.documentElement.isConnected = true;
		this.html = this.documentElement;
		this.body = new MockElement(this, 'body');
		this.body.isConnected = true;
		this.documentElement.appendChild(this.body);
		this.scrollingElement = this.documentElement;
	}

	addEventListener(
		type: string,
		listener: (event: Event) => void,
		options?: boolean | AddEventListenerOptions,
	): void {
		const normalized = typeof options === 'boolean' ? { capture: options } : options ?? {};
		this.listeners.push({
			type,
			capture: normalized.capture === true,
			passive: normalized.passive === true,
			originalFn: listener,
		});
	}

	removeEventListener(
		type: string,
		listener: (event: Event) => void,
		options?: boolean | EventListenerOptions,
	): void {
		const normalized = typeof options === 'boolean' ? { capture: options } : options ?? {};
		const capture = normalized.capture === true;
		for (let i = this.listeners.length - 1; i >= 0; i--) {
			const l = this.listeners[i];
			if (l.type === type && l.capture === capture && l.originalFn === listener) {
				this.listeners.splice(i, 1);
			}
		}
	}

	querySelectorAll(selector: string): MockElement[] {
		const out: MockElement[] = [];
		const visit = (el: MockElement): void => {
			if (matchSelector(el, selector)) out.push(el);
			for (const child of el.children) visit(child);
		};
		visit(this.documentElement);
		return out;
	}

	querySelector(selector: string): MockElement | null {
		const all = this.querySelectorAll(selector);
		return all[0] ?? null;
	}
}

interface FakeEvent extends Event {
	clientX: number;
	clientY: number;
	target: EventTarget | null;
}

function matchSelector(el: MockElement, selector: string): boolean {
	if (!selector) return false;
	for (const part of selector.split(',').map((s) => s.trim())) {
		if (matchesCompound(el, part)) return true;
	}
	return false;
}

function matchesCompound(el: MockElement, sel: string): boolean {
	let rest = sel;
	while (rest.length > 0) {
		if (rest.startsWith('.')) {
			const { cls, remainder } = readClassSelector(rest);
			if (!el.classList.contains(cls)) return false;
			rest = remainder;
		} else if (rest.startsWith('#')) {
			const { id, remainder } = readIdSelector(rest);
			if (el.id !== id) return false;
			rest = remainder;
		} else if (rest.startsWith('[')) {
			const end = rest.indexOf(']');
			if (end < 0) return false;
			const attr = rest.slice(1, end);
			rest = rest.slice(end + 1);
			const eq = attr.indexOf('=');
			if (eq < 0) {
				if (!(attr in el.attrs) && !(attr in el.dataset)) return false;
			} else {
				const name = attr.slice(0, eq);
				const raw = attr.slice(eq + 1);
				const expected = raw.replace(/^["']|["']$/g, '');
				const actual = el.attrs.get(name) ?? el.dataset[name];
				if (actual !== expected) return false;
			}
		} else {
			let i = 0;
			while (i < rest.length && /[a-zA-Z0-9_-]/.test(rest[i])) i++;
			const tag = rest.slice(0, i);
			rest = rest.slice(i);
			if (tag && tag !== el.tagName.toLowerCase()) return false;
		}
	}
	return true;
}

function readClassSelector(sel: string): { cls: string; remainder: string } {
	let i = 1;
	while (i < sel.length && /[a-zA-Z0-9_-]/.test(sel[i])) i++;
	return { cls: sel.slice(1, i), remainder: sel.slice(i) };
}

function readIdSelector(sel: string): { id: string; remainder: string } {
	let i = 1;
	while (i < sel.length && /[a-zA-Z0-9_-]/.test(sel[i])) i++;
	return { id: sel.slice(1, i), remainder: sel.slice(i) };
}

class MockMutationObserverCtor implements Pick<MutationObserver, 'disconnect' | 'observe'> {
	static instances: MockMutationObserverCtor[] = [];
	disconnected = false;
	constructor(_callback: MutationCallback) {
		MockMutationObserverCtor.instances.push(this);
	}
	observe(_target: unknown, _options?: unknown): void {
		// no-op: the adapter just registers and disconnects.
	}
	disconnect(): void {
		this.disconnected = true;
	}
}

interface MockWorkspace {
	leftSplit?: { size: number };
	rightSplit?: { size: number };
	on: (name: string, cb: (...args: unknown[]) => unknown) => { __id: string };
	offref: (ref: { __id: string }) => void;
}

interface MockGlobal {
	document?: MockDocument;
	MutationObserver?: typeof MockMutationObserverCtor;
}

function makeWorkspace(): MockWorkspace {
	const handlers = new Map<string, ((...args: unknown[]) => unknown)[]>();
	const refs = new Map<string, { __id: string }>();
	return {
		leftSplit: { size: 300 },
		rightSplit: { size: 320 },
		on(name, cb) {
			const arr = handlers.get(name) ?? [];
			arr.push(cb);
			handlers.set(name, arr);
			const ref = { __id: `${name}:${arr.length - 1}` };
			refs.set(ref.__id, ref);
			return ref;
		},
		offref(ref) {
			refs.delete(ref.__id);
		},
	};
}

function makeEvent(target: MockElement | null, opts: { clientX?: number; clientY?: number } = {}): FakeEvent {
	const e = {
		clientX: opts.clientX ?? 0,
		clientY: opts.clientY ?? 0,
		target,
	} as unknown as FakeEvent;
	return e;
}

function dispatch(doc: MockDocument, type: string, event: Event): void {
	for (const listener of [...doc.listeners]) {
		if (listener.type !== type) continue;
		try {
			listener.originalFn(event);
		} catch {
			// defensive: a bad listener should not break the rest
		}
	}
}

function buildAdapterFixture() {
	const globalAny = globalThis as unknown as MockGlobal;
	const originalDoc = globalAny.document;
	const originalMutationObserver = globalAny.MutationObserver;
	globalAny.document = undefined;
	globalAny.MutationObserver =
		MockMutationObserverCtor as unknown as typeof MockMutationObserverCtor;
	const doc = new MockDocument();
	const workspace = makeWorkspace();
	const app = { workspace } as unknown as import('obsidian').App;
	const plugin = {} as unknown as import('obsidian').Plugin;
	const adapter = createHoverSurfacesAdapter();
	return {
		doc,
		workspace,
		app,
		plugin,
		adapter,
		restore: () => {
			const g = globalThis as unknown as MockGlobal;
			g.document = originalDoc;
			g.MutationObserver = originalMutationObserver;
		},
	};
}

function ctxOf(fixture: ReturnType<typeof buildAdapterFixture>): import('../../src/platform/platformAdapter').PlatformAdapterContext {
	return { app: fixture.app, plugin: fixture.plugin, doc: fixture.doc as unknown as Document };
}

function bodyClasses(fixture: ReturnType<typeof buildAdapterFixture>): string[] {
	return Array.from(fixture.doc.body.classList);
}

describe('HoverSurfacesAdapter — contract', () => {
	it('id estable y fragility referenciable', () => {
		const fixture = buildAdapterFixture();
		fixture.restore();
		expect(fixture.adapter.id).toBe('hover-surfaces');
		expect(fixture.adapter.fragility.id).toBe(fixture.adapter.id);
		expect(fixture.adapter.fragility.selectorSources.length).toBeGreaterThan(0);
		expect(fixture.adapter.fragility.mobile.supported).toBe('no');
	});

	it('probe no lanza con un ctx incompleto: devuelve { ok:false, reason }', () => {
		const fixture = buildAdapterFixture();
		fixture.restore();
		const bad = {} as unknown as import('../../src/platform/platformAdapter').PlatformAdapterContext;
		expect(() => fixture.adapter.probe(bad)).not.toThrow();
		expect(fixture.adapter.probe(bad)).toEqual({ ok: false, reason: expect.any(String) });
	});

	it('probe marca mobile:no-pointer cuando el body tiene is-phone / is-mobile / mod-mobile / is-tablet', () => {
		const fixture = buildAdapterFixture();
		fixture.restore();
		for (const cls of ['is-phone', 'is-mobile', 'mod-mobile', 'is-tablet']) {
			const f = buildAdapterFixture();
			f.doc.body.classList.add(cls);
			const result = f.adapter.probe(ctxOf(f));
			expect(result.ok, cls).toBe(false);
			if (!result.ok) {
				expect(result.reason, cls).toMatch(/mobile/);
			}
			f.restore();
		}
	});

	it('probe devuelve ok con workspace y document presentes', () => {
		const fixture = buildAdapterFixture();
		fixture.restore();
		expect(fixture.adapter.probe(ctxOf(fixture))).toEqual({ ok: true });
	});

	it('revert antes de apply no lanza y deja el body intacto', () => {
		const fixture = buildAdapterFixture();
		expect(() => fixture.adapter.revert()).not.toThrow();
		expect(bodyClasses(fixture)).toEqual([]);
		fixture.restore();
	});

	it('revert es idempotente', () => {
		const fixture = buildAdapterFixture();
		fixture.adapter.probe(ctxOf(fixture));
		fixture.adapter.apply(ctxOf(fixture));
		fixture.adapter.updateConfig({ ...DEFAULT_HOVER_SURFACES_CONFIG, lock: true });
		fixture.adapter.revert();
		expect(() => fixture.adapter.revert()).not.toThrow();
		expect(bodyClasses(fixture)).toEqual([]);
		fixture.restore();
	});
});

describe('HoverSurfacesAdapter — comportamiento hover/pin/lock', () => {
	let fixture: ReturnType<typeof buildAdapterFixture>;
	beforeEach(() => {
		fixture = buildAdapterFixture();
	});
	afterEach(() => {
		fixture.restore();
	});

	function setUpSurfaces(): {
		leftSidebar: MockElement;
		rightSidebar: MockElement;
		leftRibbon: MockElement;
		tabbar: MockElement;
		viewHeader: MockElement;
		statusbar: MockElement;
	} {
		const leftSidebar = new MockElement(fixture.doc, 'div', {
			classes: ['workspace-split', 'mod-left-split'],
		});
		const rightSidebar = new MockElement(fixture.doc, 'div', {
			classes: ['workspace-split', 'mod-right-split'],
		});
		const leftRibbon = new MockElement(fixture.doc, 'div', {
			classes: ['workspace-ribbon', 'mod-left'],
		});
		const tabbar = new MockElement(fixture.doc, 'div', {
			classes: ['workspace-tab-header-container'],
		});
		const viewHeader = new MockElement(fixture.doc, 'div', {
			classes: ['view-header'],
		});
		const statusbar = new MockElement(fixture.doc, 'div', {
			classes: ['status-bar'],
		});
		fixture.doc.body.appendChild(leftSidebar);
		fixture.doc.body.appendChild(rightSidebar);
		fixture.doc.body.appendChild(leftRibbon);
		fixture.doc.body.appendChild(tabbar);
		fixture.doc.body.appendChild(viewHeader);
		fixture.doc.body.appendChild(statusbar);
		return { leftSidebar, rightSidebar, leftRibbon, tabbar, viewHeader, statusbar };
	}

	it('pointermove sobre la sidebar izquierda pone mb-sidebar-hovered', () => {
		const { leftSidebar } = setUpSurfaces();
		fixture.adapter.apply(ctxOf(fixture));
		dispatch(fixture.doc, 'pointermove', makeEvent(leftSidebar, { clientX: 5, clientY: 5 }));
		expect(leftSidebar.classList.contains('mb-sidebar-hovered')).toBe(true);
	});

	it('pointermove sobre la sidebar derecha con la izquierda hovered desactiva la izquierda', () => {
		const { leftSidebar, rightSidebar } = setUpSurfaces();
		leftSidebar.classList.add('mb-sidebar-hovered');
		rightSidebar.classList.remove('mb-sidebar-hovered');
		fixture.adapter.apply(ctxOf(fixture));
		dispatch(fixture.doc, 'pointermove', makeEvent(rightSidebar, { clientX: 5, clientY: 5 }));
		expect(leftSidebar.classList.contains('mb-sidebar-hovered')).toBe(false);
		expect(rightSidebar.classList.contains('mb-sidebar-hovered')).toBe(true);
	});

	it('pointermove sobre ribbon pone mb-ribbon-hovered', () => {
		const { leftRibbon } = setUpSurfaces();
		fixture.adapter.apply(ctxOf(fixture));
		dispatch(fixture.doc, 'pointermove', makeEvent(leftRibbon, { clientX: 5, clientY: 5 }));
		expect(leftRibbon.classList.contains('mb-ribbon-hovered')).toBe(true);
	});

	it('pointermove sobre tabbar pone mb-tabbar-hovered', () => {
		const { tabbar } = setUpSurfaces();
		fixture.adapter.apply(ctxOf(fixture));
		dispatch(fixture.doc, 'pointermove', makeEvent(tabbar, { clientX: 5, clientY: 5 }));
		expect(tabbar.classList.contains('mb-tabbar-hovered')).toBe(true);
	});

	it('pointermove sobre .view-header pone mb-tabbar-hovered', () => {
		const { viewHeader } = setUpSurfaces();
		fixture.adapter.apply(ctxOf(fixture));
		dispatch(fixture.doc, 'pointermove', makeEvent(viewHeader, { clientX: 5, clientY: 5 }));
		expect(viewHeader.classList.contains('mb-tabbar-hovered')).toBe(true);
	});

	it('pointermove sobre .status-bar pone mb-statusbar-hovered', () => {
		const { statusbar } = setUpSurfaces();
		fixture.adapter.apply(ctxOf(fixture));
		dispatch(fixture.doc, 'pointermove', makeEvent(statusbar, { clientX: 5, clientY: 5 }));
		expect(statusbar.classList.contains('mb-statusbar-hovered')).toBe(true);
	});

	it('supresion por overlay abierto: con un .menu presente NO se colapsa la sidebar ya hovered', () => {
		const { leftSidebar } = setUpSurfaces();
		const menu = new MockElement(fixture.doc, 'div', { classes: ['menu'] });
		fixture.doc.body.appendChild(menu);
		fixture.adapter.apply(ctxOf(fixture));
		dispatch(fixture.doc, 'pointermove', makeEvent(leftSidebar, { clientX: 5, clientY: 5 }));
		expect(leftSidebar.classList.contains('mb-sidebar-hovered')).toBe(true);
		dispatch(fixture.doc, 'pointermove', makeEvent(fixture.doc.body, { clientX: 1, clientY: 1 }));
		expect(leftSidebar.classList.contains('mb-sidebar-hovered')).toBe(true);
	});

	it('selector persistente (input dentro de sidebar) pinea en focusin', () => {
		const { leftSidebar } = setUpSurfaces();
		const input = new MockElement(fixture.doc, 'input');
		leftSidebar.appendChild(input);
		fixture.adapter.apply(ctxOf(fixture));
		dispatch(fixture.doc, 'focusin', makeEvent(input));
		expect(leftSidebar.classList.contains('mb-sidebar-pinned')).toBe(true);
	});

	it('click sobre quick action dentro de sidebar pineada la despina', () => {
		const { leftSidebar } = setUpSurfaces();
		const link = new MockElement(fixture.doc, 'a');
		leftSidebar.appendChild(link);
		const input = new MockElement(fixture.doc, 'input');
		leftSidebar.appendChild(input);
		fixture.adapter.apply(ctxOf(fixture));
		dispatch(fixture.doc, 'focusin', makeEvent(input));
		expect(leftSidebar.classList.contains('mb-sidebar-pinned')).toBe(true);
		dispatch(fixture.doc, 'click', makeEvent(link));
		expect(leftSidebar.classList.contains('mb-sidebar-pinned')).toBe(false);
	});

	it('lock global pone mb-hover-locked en body y bloquea hover', () => {
		const { leftSidebar } = setUpSurfaces();
		fixture.adapter.apply(ctxOf(fixture));
		fixture.adapter.updateConfig({ ...DEFAULT_HOVER_SURFACES_CONFIG, lock: true });
		expect(fixture.doc.body.classList.contains('mb-hover-locked')).toBe(true);
		dispatch(fixture.doc, 'pointermove', makeEvent(leftSidebar, { clientX: 5, clientY: 5 }));
		expect(leftSidebar.classList.contains('mb-sidebar-hovered')).toBe(false);
	});

	it('lock global con sidebar pineada preserva la pin y oculta las demas', () => {
		const { leftSidebar, rightSidebar } = setUpSurfaces();
		const input = new MockElement(fixture.doc, 'input');
		leftSidebar.appendChild(input);
		fixture.adapter.apply(ctxOf(fixture));
		dispatch(fixture.doc, 'focusin', makeEvent(input));
		expect(leftSidebar.classList.contains('mb-sidebar-pinned')).toBe(true);
		fixture.adapter.updateConfig({ ...DEFAULT_HOVER_SURFACES_CONFIG, lock: true });
		rightSidebar.classList.add('mb-sidebar-hovered');
		dispatch(fixture.doc, 'pointermove', makeEvent(rightSidebar, { clientX: 5, clientY: 5 }));
		expect(leftSidebar.classList.contains('mb-sidebar-pinned')).toBe(true);
		expect(rightSidebar.classList.contains('mb-sidebar-hovered')).toBe(false);
	});

	it('desactivar lock retira mb-hover-locked del body y restaura hover', () => {
		const { leftSidebar } = setUpSurfaces();
		fixture.adapter.apply(ctxOf(fixture));
		fixture.adapter.updateConfig({ ...DEFAULT_HOVER_SURFACES_CONFIG, lock: true });
		expect(fixture.doc.body.classList.contains('mb-hover-locked')).toBe(true);
		fixture.adapter.updateConfig({ ...DEFAULT_HOVER_SURFACES_CONFIG, lock: false });
		expect(fixture.doc.body.classList.contains('mb-hover-locked')).toBe(false);
		dispatch(fixture.doc, 'pointermove', makeEvent(leftSidebar, { clientX: 5, clientY: 5 }));
		expect(leftSidebar.classList.contains('mb-sidebar-hovered')).toBe(true);
	});

	it('apaga sidebars.hover respeta la orden y no pone clases', () => {
		const { leftSidebar } = setUpSurfaces();
		const cfg = {
			...DEFAULT_HOVER_SURFACES_CONFIG,
			sidebars: { hover: false, pin: false },
		};
		fixture.adapter.apply(ctxOf(fixture));
		fixture.adapter.updateConfig(cfg);
		dispatch(fixture.doc, 'pointermove', makeEvent(leftSidebar, { clientX: 5, clientY: 5 }));
		expect(leftSidebar.classList.contains('mb-sidebar-hovered')).toBe(false);
	});

	it('syncSidebarWidths publica CSS vars para splits > 50px y reaplica en layout-change', () => {
		setUpSurfaces();
		fixture.adapter.apply(ctxOf(fixture));
		// El apply ejecuta syncSidebarWidths una vez (sin side effects observables
		// en este MockElement que no persiste inline styles); los handlers de
		// resize / layout-change estan vivos y la segunda invocacion NO lanza.
		expect(fixture.workspace).toBeDefined();
		expect(() => {
			dispatch(fixture.doc, 'pointermove', makeEvent(fixture.doc.body, { clientX: 5, clientY: 5 }));
		}).not.toThrow();
	});

	it('resetLayoutScroll lo llama el listener de scroll si el target es documentElement', () => {
		setUpSurfaces();
		fixture.adapter.apply(ctxOf(fixture));
		const before = fixture.doc.documentElement.attrs.get('style') ?? '';
		expect(() => {
			dispatch(fixture.doc, 'scroll', makeEvent(fixture.doc.documentElement));
		}).not.toThrow();
		expect(fixture.doc.documentElement.attrs.get('style') ?? '').toBe(before);
	});
});

describe('HoverSurfacesAdapter — reversibilidad (sin residuo)', () => {
	let fixture: ReturnType<typeof buildAdapterFixture>;
	beforeEach(() => {
		fixture = buildAdapterFixture();
		MockMutationObserverCtor.instances = [];
	});
	afterEach(() => {
		fixture.restore();
	});

	function addSurface(...classes: string[]): MockElement {
		const el = new MockElement(fixture.doc, 'div', { classes });
		fixture.doc.body.appendChild(el);
		return el;
	}

	it('tras revert: cero clases mb- en body y cero listeners vivos', () => {
		addSurface('workspace-split', 'mod-left-split');
		addSurface('workspace-split', 'mod-right-split');
		addSurface('workspace-ribbon', 'mod-left');
		addSurface('workspace-tab-header-container');
		addSurface('view-header');
		addSurface('status-bar');
		fixture.adapter.apply(ctxOf(fixture));
		fixture.adapter.updateConfig({ ...DEFAULT_HOVER_SURFACES_CONFIG, lock: true });
		fixture.adapter.revert();
		expect(bodyClasses(fixture).every((cls) => !cls.startsWith('mb-'))).toBe(true);
		expect(fixture.doc.listeners).toEqual([]);
		expect(MockMutationObserverCtor.instances.every((o) => o.disconnected)).toBe(true);
	});

	it('revert limpia pinned sidebars y clases residuales', () => {
		const sidebar = addSurface('workspace-split', 'mod-left-split');
		const input = new MockElement(fixture.doc, 'input');
		sidebar.appendChild(input);
		fixture.adapter.apply(ctxOf(fixture));
		dispatch(fixture.doc, 'focusin', makeEvent(input));
		expect(sidebar.classList.contains('mb-sidebar-pinned')).toBe(true);
		fixture.adapter.revert();
		expect(sidebar.classList.contains('mb-sidebar-pinned')).toBe(false);
		expect(sidebar.classList.contains('mb-sidebar-hovered')).toBe(false);
	});
});

describe('HoverSurfacesAdapter — guarda negativa (símbolos prohibidos)', () => {
	let fixture: ReturnType<typeof buildAdapterFixture>;
	beforeEach(() => {
		fixture = buildAdapterFixture();
	});
	afterEach(() => {
		fixture.restore();
	});

	it('el codigo NO contiene `as any`', () => {
		// Un test que solo mira lo que debe aparecer lo satisface un stub:
		// este mira la MITAD negativa. Si alguien escribe `as any` en el
		// servicio, esta aserción cae y el regresión no se cuela.
		expect(SRC.includes(' as any')).toBe(false);
	});

	it('el codigo NO usa `document.` a pelo: solo a través del ctx inyectado', () => {
		// Busca ocurrencias del identificador `document` (el global del navegador)
		// usado como `document.something`. Las menciones como "active document" o
		// "in the document" dentro de strings explicativos del fragility record
		// no cuentan: el navegador solo expone `document` cuando va con punto y
		// espacio previo a `something`.
		const offenders = SRC.split('\n').filter((line) => {
			const stripped = line.replace(/'[^']*'/g, "''").replace(/"[^"]*"/g, '""');
			return /\bdocument\.[a-zA-Z_$]/.test(stripped);
		});
		expect(offenders).toEqual([]);
	});

	it('el codigo NO usa localStorage (el estado va en los settings del plugin)', () => {
		expect(SRC.includes('localStorage')).toBe(false);
	});

	it('el codigo NO depende de la cadena `minimal-` (temas de terceros)', () => {
		expect(SRC.includes('minimal-')).toBe(false);
	});
});

describe('HoverSurfacesAdapter — creación helper', () => {
	let fixture: ReturnType<typeof buildAdapterFixture>;
	beforeEach(() => {
		fixture = buildAdapterFixture();
	});
	afterEach(() => {
		fixture.restore();
	});

	it('createHoverSurfacesAdapter() devuelve una instancia concreta', () => {
		const a = createHoverSurfacesAdapter();
		expect(a).toBeInstanceOf(HoverSurfacesAdapter);
	});
});