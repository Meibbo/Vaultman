import type {
	CapabilityResult,
	FragilityRecord,
	PlatformAdapter,
	PlatformAdapterContext,
} from '../platform/platformAdapter';

const MOBILE_BODY_CLASSES = [
	'is-phone',
	'is-mobile',
	'mod-mobile',
	'is-tablet',
] as const;

export const HOVER_SURFACES_ADAPTER_ID = 'hover-surfaces';

export type HoverSurfaceId = 'sidebars' | 'ribbons' | 'tabbar' | 'statusbar';

export const HOVER_SURFACES: readonly HoverSurfaceId[] = [
	'sidebars',
	'ribbons',
	'tabbar',
	'statusbar',
] as const;

export interface HoverSurfaceConfig {
	readonly hover: boolean;
	readonly pin: boolean;
}

export interface HoverSurfaceSwitches {
	readonly hide: boolean;
	readonly hover: boolean;
	readonly pin: boolean;
}

export interface HoverSurfacesConfig {
	readonly sidebars: HoverSurfaceSwitches;
	readonly ribbons: HoverSurfaceSwitches;
	readonly tabbar: HoverSurfaceSwitches;
	readonly statusbar: HoverSurfaceSwitches;
	readonly lock: boolean;
	readonly nestedRibbon: boolean;
}

export const DEFAULT_HOVER_SURFACES_CONFIG: HoverSurfacesConfig = {
	sidebars: { hide: false, hover: false, pin: true },
	ribbons: { hide: false, hover: false, pin: false },
	tabbar: { hide: false, hover: false, pin: false },
	statusbar: { hide: false, hover: false, pin: false },
	lock: false,
	nestedRibbon: false,
};

const SIDEBAR_SELECTOR =
	'.workspace-split.mod-left-split, .workspace-split.mod-right-split';
const RIBBON_SELECTOR = '.workspace-ribbon.mod-left, .workspace-ribbon.mod-right';
const TABBAR_CONTAINER_SELECTOR =
	'.workspace-tab-header-container, .view-header';
const STATUSBAR_SELECTOR = '.status-bar';

const OVERLAY_SELECTOR = [
	'.menu',
	'.menu-container',
	'.modal-container',
	'.modal',
	'.popover',
	'.hover-popover',
	'.suggestion-container',
	'.suggestion',
	'.cMenu-modal',
	'.cMenu-bar',
	'.cmenu',
	'.editingToolbar-sub-menu',
	'.editingToolbar-sub-menu-container',
	'.cmdr-menu',
	'.cmdr-popover',
	'.dropdown-container',
	'.tooltip',
].join(', ');

const PERSISTENT_SELECTOR = [
	'.workspace-tab-header',
	'.obsidian-vertical-tabs-container .tree-item.is-tab',
	'[role=tab]',
	'input',
	'textarea',
	'select',
	'[contenteditable=true]',
].join(', ');

const QUICK_ACTION_SELECTOR =
	'a, .nav-file-title, .nav-folder-title, .tree-item-self:not(.is-tab), [data-href]';

const LAYOUT_CONTAINER_SELECTOR =
	'.app-container, .horizontal-main-container, .workspace';

const BODY_CLASS_LOCK = 'mb-hover-locked';
const BODY_CLASS_NESTED_RIBBON = 'mb-nested-hover-ribbon';
const BODY_CLASS_HIDE_SIDEBARS = 'mb-hide-sidebars';
const BODY_CLASS_HIDE_RIBBONS = 'mb-hide-ribbons';
const BODY_CLASS_HIDE_TABBAR = 'mb-hide-tabbar';
const BODY_CLASS_HIDE_STATUSBAR = 'mb-hide-statusbar';
const SIDEBAR_HOVERED_CLASS = 'mb-sidebar-hovered';
const SIDEBAR_PINNED_CLASS = 'mb-sidebar-pinned';
const RIBBON_HOVERED_CLASS = 'mb-ribbon-hovered';
const TABBAR_HOVERED_CLASS = 'mb-tabbar-hovered';
const STATUSBAR_HOVERED_CLASS = 'mb-statusbar-hovered';

const MB_CLASS_PREFIX = 'mb-';

interface SurfaceState {
	config: HoverSurfacesConfig;
}

interface ListenersHandle {
  readonly pointermove: (event: Event) => void;
  readonly pointerdown: (event: Event) => void;
  readonly click: (event: Event) => void;
  readonly focusin: (event: Event) => void;
  readonly scroll: (event: Event) => void;
}

interface Point {
	x: number;
	y: number;
}

interface WorkspaceWithSplits {
	leftSplit?: { size?: number };
	rightSplit?: { size?: number };
	on(name: string, callback: (...args: unknown[]) => unknown): unknown;
	offref?(ref: unknown): void;
}

const asElement = (target: EventTarget | null): Element | null => {
	if (!target) return null;
	const candidate = target as unknown as { closest?: unknown; parentElement?: unknown };
	if (typeof candidate.closest === 'function') {
		return candidate as Element;
	}
	const maybeParent = (target as { parentElement?: Element | null }).parentElement;
	return maybeParent ?? null;
};

const closest = (target: EventTarget | null, selector: string): Element | null => {
	const base = asElement(target);
	return base?.closest(selector) ?? null;
};

interface RectLike {
	left: number;
	right: number;
	top: number;
	bottom: number;
}

const elementRect = (el: Element): RectLike | null => {
	if (!el.isConnected) return null;
	const view = el.ownerDocument?.defaultView;
	if (!view || typeof (view as Window).getComputedStyle !== 'function') {
		return null;
	}
	const rect = (el as Element & { getBoundingClientRect(): DOMRect }).getBoundingClientRect();
	return {
		left: rect.left,
		right: rect.right,
		top: rect.top,
		bottom: rect.bottom,
	};
};

export class HoverSurfacesAdapter implements PlatformAdapter {
	readonly id = HOVER_SURFACES_ADAPTER_ID;
	readonly fragility: FragilityRecord;

	private readonly state: SurfaceState = { config: DEFAULT_HOVER_SURFACES_CONFIG };
	private applied = false;
	private ctx: PlatformAdapterContext | null = null;
	private listeners: ListenersHandle | null = null;
	private observer: MutationObserver | null = null;
	private resizeRef: unknown = null;
	private layoutRef: unknown = null;
	private lastPointer: Point = { x: 0, y: 0 };
	private activeSurface: Element | null = null;
	private pinnedSidebars = new WeakSet<Element>();

	constructor() {
		this.fragility = {
			id: this.id,
		title: 'Hover, pin and lock surfaces',
		summary:
			'Puts and removes mb-sidebar-hovered / mb-sidebar-pinned on left+right sidebars, ' +
			'mb-ribbon-hovered on ribbons, mb-tabbar-hovered on tab headers / view headers, ' +
			'mb-statusbar-hovered on the status bar; mb-hide-{sidebars,ribbons,tabbar,statusbar} ' +
			'on body collapse each surface (hide action), mb-nested-hover-ribbon makes a hidden ' +
			'ribbon the trigger that reveals the sidebar, and mb-hover-locked on body when lock is on. ' +
			'Hover/pin/nested only act on hidden surfaces: expanded surfaces are never touched. ' +
			'Owns the overlay/persistent guards and the layout drift reset from the legacy Mb-sidebars hover script.',
			privateSymbols: ['app.workspace.leftSplit.size', 'app.workspace.rightSplit.size'],
			selectorSources: [
				SIDEBAR_SELECTOR,
				RIBBON_SELECTOR,
				TABBAR_CONTAINER_SELECTOR,
				STATUSBAR_SELECTOR,
				OVERLAY_SELECTOR,
				PERSISTENT_SELECTOR,
				QUICK_ACTION_SELECTOR,
				LAYOUT_CONTAINER_SELECTOR,
			],
			obsidianAssumptions: [
				'workspace-split.mod-{left,right}-split exist in the document.',
				'workspace-ribbon.mod-{left,right} exist when ribbons are enabled.',
				'workspace-tab-header-container and .status-bar live on the active document.',
				'workspace.leftSplit / rightSplit expose a numeric size property.',
			],
			fallback:
				'On probe failure the surfaces stay native: no listeners are attached and the body ' +
				'is left untouched. The CSS side of the feature remains inert (no body class added).',
			mobile: {
				supported: 'no',
				notes:
					'Hover / pin / lock rely on pointer movement. Touch surfaces have no stable hover ' +
					'state, so the adapter is disabled on mobile even though the CSS side would still ' +
					'leave surfaces hidden.',
			},
		};
	}

	probe(ctx: PlatformAdapterContext): CapabilityResult {
		try {
			const body = ctx.doc?.body;
			if (body) {
				const classes = body.classList;
				for (const cls of MOBILE_BODY_CLASSES) {
					if (classes.contains(cls)) {
						return { ok: false, reason: 'mobile:no-pointer' };
					}
				}
			}
			const ws = ctx.app?.workspace;
			if (!ws || typeof ws.on !== 'function') {
				return { ok: false, reason: 'workspace unavailable' };
			}
			if (!ctx.doc || typeof ctx.doc.addEventListener !== 'function') {
				return { ok: false, reason: 'document unavailable' };
			}
			return { ok: true };
		} catch (error) {
			return { ok: false, reason: `probe threw: ${String(error)}` };
		}
	}

	apply(ctx: PlatformAdapterContext): void {
		this.ctx = ctx;
		this.applyConfig(this.state.config);
		this.installListeners(ctx);
		this.installMutationObserver(ctx.doc);
		this.wireWorkspace(ctx);
		this.applied = true;
	}

	revert(): void {
		this.removeListeners();
		this.observer?.disconnect();
		this.observer = null;
		this.teardownWorkspace();
		this.clearSurfaceClasses();
		this.clearBodyClass();
		this.activeSurface = null;
		this.ctx = null;
		this.applied = false;
	}

	updateConfig(config: HoverSurfacesConfig): void {
		this.state.config = config;
		if (!this.applied) return;
		this.syncBodyClasses();
		this.collapseAllIfLocked();
	}

	private syncBodyClasses(): void {
		const config = this.state.config;
		const body = this.ctx?.doc?.body;
		if (!body) return;
		for (const cls of [
			BODY_CLASS_LOCK,
			BODY_CLASS_NESTED_RIBBON,
			BODY_CLASS_HIDE_SIDEBARS,
			BODY_CLASS_HIDE_RIBBONS,
			BODY_CLASS_HIDE_TABBAR,
			BODY_CLASS_HIDE_STATUSBAR,
		]) {
			body.classList.remove(cls);
		}
		if (config.lock) body.classList.add(BODY_CLASS_LOCK);
		if (config.nestedRibbon) body.classList.add(BODY_CLASS_NESTED_RIBBON);
		if (config.sidebars.hide) body.classList.add(BODY_CLASS_HIDE_SIDEBARS);
		if (config.ribbons.hide) body.classList.add(BODY_CLASS_HIDE_RIBBONS);
		if (config.tabbar.hide) body.classList.add(BODY_CLASS_HIDE_TABBAR);
		if (config.statusbar.hide) body.classList.add(BODY_CLASS_HIDE_STATUSBAR);
	}

	applyConfig(config: HoverSurfacesConfig): void {
		this.state.config = config;
	}

	getConfig(): HoverSurfacesConfig {
		return this.state.config;
	}

	private clearBodyClass(): void {
		const body = this.ctx?.doc?.body;
		if (!body) return;
		for (const cls of Array.from(body.classList)) {
			if (cls.startsWith(MB_CLASS_PREFIX)) body.classList.remove(cls);
		}
	}

	private installListeners(ctx: PlatformAdapterContext): void {
		const handle: ListenersHandle = {
			pointermove: (event) => this.onPointerMove(event),
			pointerdown: (event) => this.onPointerDown(event),
			click: (event) => this.onClick(event),
			focusin: (event) => this.onFocusIn(event),
			scroll: (event) => this.onLayoutScroll(event),
		};
		const doc = ctx.doc;
		doc.addEventListener('pointermove', handle.pointermove, true);
		doc.addEventListener('pointerdown', handle.pointerdown, true);
		doc.addEventListener('click', handle.click, true);
		doc.addEventListener('focusin', handle.focusin, true);
		doc.addEventListener('scroll', handle.scroll, { capture: true, passive: true });
		this.listeners = handle;
	}

	private removeListeners(): void {
		const handle = this.listeners;
		const doc = this.ctx?.doc;
		if (!handle || !doc) {
			this.listeners = null;
			return;
		}
		doc.removeEventListener('pointermove', handle.pointermove, true);
		doc.removeEventListener('pointerdown', handle.pointerdown, true);
		doc.removeEventListener('click', handle.click, true);
		doc.removeEventListener('focusin', handle.focusin, true);
		doc.removeEventListener('scroll', handle.scroll, true);
		this.listeners = null;
	}

	private installMutationObserver(doc: Document): void {
		const obs = new MutationObserver(() => this.onMutation());
		obs.observe(doc.body, { childList: true, subtree: true });
		this.observer = obs;
	}

	private wireWorkspace(ctx: PlatformAdapterContext): void {
		const ws = ctx.app?.workspace as WorkspaceWithSplits | null | undefined;
		if (!ws || typeof ws.on !== 'function') return;
		try {
			this.resizeRef = ws.on('resize', () => this.syncSidebarWidths());
			this.layoutRef = ws.on('layout-change', () => this.syncSidebarWidths());
		} catch {
			this.resizeRef = null;
			this.layoutRef = null;
		}
		this.syncSidebarWidths();
	}

	private teardownWorkspace(): void {
		const ctx = this.ctx;
		const ws = ctx?.app?.workspace as WorkspaceWithSplits | null | undefined;
		if (ws?.offref) {
			try {
				if (this.resizeRef) ws.offref(this.resizeRef);
			} catch {
				// defensive: workspace can be torn down before us
			}
			try {
				if (this.layoutRef) ws.offref(this.layoutRef);
			} catch {
				// defensive: workspace can be torn down before us
			}
		}
		this.resizeRef = null;
		this.layoutRef = null;
	}

	private syncSidebarWidths(): void {
		const ctx = this.ctx;
		if (!ctx) return;
		try {
			const ws = ctx.app.workspace as WorkspaceWithSplits | null | undefined;
			const ls = ws?.leftSplit?.size;
			const rs = ws?.rightSplit?.size;
			const root = ctx.doc.documentElement;
			if (typeof ls === 'number' && ls > 50 && root) {
				root.style.setProperty('--sidebar-left-width', `${Math.round(ls)}px`);
			}
			if (typeof rs === 'number' && rs > 50 && root) {
				root.style.setProperty('--sidebar-right-width', `${Math.round(rs)}px`);
			}
		} catch {
			// defensive: workspace internals may shift
		}
	}

	private resetLayoutScroll(): void {
		const ctx = this.ctx;
		if (!ctx) return;
		const unscroll = (el: Element | Window | Document | null): void => {
			if (!el) return;
			const sLeft = (el as { scrollLeft?: number }).scrollLeft;
			const sTop = (el as { scrollTop?: number }).scrollTop;
			if (typeof sLeft === 'number' && sLeft !== 0) {
				(el as { scrollLeft?: number }).scrollLeft = 0;
			}
			if (typeof sTop === 'number' && sTop !== 0) {
				(el as { scrollTop?: number }).scrollTop = 0;
			}
		};
		try {
			unscroll(ctx.doc.scrollingElement);
		} catch {
			// defensive
		}
		unscroll(ctx.doc.documentElement);
		unscroll(ctx.doc.body);
		const containers = ctx.doc.querySelectorAll(LAYOUT_CONTAINER_SELECTOR);
		containers.forEach((el) => unscroll(el));
	}

	private onLayoutScroll(event: Event): void {
		const target = event.target;
		if (!target) return;
		const ctx = this.ctx;
		const doc = ctx?.doc as unknown as { defaultView?: unknown } | undefined;
		if (target === doc?.defaultView) return; // window
		if (target === ctx?.doc || target === (ctx?.doc as unknown as { documentElement?: unknown })?.documentElement) {
			this.resetLayoutScroll();
			return;
		}
		if (typeof (target as { matches?: unknown }).matches !== 'function') return;
		if ((target as Element).matches(LAYOUT_CONTAINER_SELECTOR)) {
			this.resetLayoutScroll();
		}
	}

	private hasActiveOverlay(): boolean {
		const ctx = this.ctx;
		if (!ctx) return false;
		const modal = ctx.doc.querySelector('.modal-container, .modal');
		const menu = ctx.doc.querySelector(
			'.menu, .cMenu-modal, .suggestion-container, .popover',
		);
		return Boolean(modal || menu);
	}

	private isPointerOverElement(el: Element): boolean {
		if (!el.isConnected) return false;
		const rect = elementRect(el);
		if (!rect) return false;
		const { x, y } = this.lastPointer;
		return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
	}

	private clearSidebarHoverExceptPinned(): void {
		const ctx = this.ctx;
		if (!ctx) return;
		const all = ctx.doc.querySelectorAll(SIDEBAR_SELECTOR);
		all.forEach((sidebar) => {
			if (!this.pinnedSidebars.has(sidebar)) {
				sidebar.classList.remove(SIDEBAR_HOVERED_CLASS);
			}
		});
	}

	private clearRibbonHover(): void {
		const ctx = this.ctx;
		if (!ctx) return;
		ctx.doc.querySelectorAll(RIBBON_SELECTOR).forEach((el) => {
			el.classList.remove(RIBBON_HOVERED_CLASS);
		});
	}

	private clearTabbarHover(): void {
		const ctx = this.ctx;
		if (!ctx) return;
		ctx.doc.querySelectorAll(TABBAR_CONTAINER_SELECTOR).forEach((el) => {
			el.classList.remove(TABBAR_HOVERED_CLASS);
		});
	}

	private clearStatusbarHover(): void {
		const ctx = this.ctx;
		if (!ctx) return;
		ctx.doc.querySelectorAll(STATUSBAR_SELECTOR).forEach((el) => {
			el.classList.remove(STATUSBAR_HOVERED_CLASS);
		});
	}

	private collapseAllIfLocked(): void {
		if (!this.state.config.lock) return;
		this.clearSidebarHoverExceptPinned();
		this.clearRibbonHover();
		this.clearTabbarHover();
		this.clearStatusbarHover();
		this.activeSurface = null;
	}

	private setSidebarHovered(sidebar: Element): void {
		const ctx = this.ctx;
		if (!ctx) return;
		ctx.doc.querySelectorAll(SIDEBAR_SELECTOR).forEach((other) => {
			if (other !== sidebar && !this.pinnedSidebars.has(other)) {
				other.classList.remove(SIDEBAR_HOVERED_CLASS);
			}
		});
		sidebar.classList.add(SIDEBAR_HOVERED_CLASS);
		this.activeSurface = sidebar;
	}

	private setRibbonHovered(ribbon: Element): void {
		ribbon.classList.add(RIBBON_HOVERED_CLASS);
		this.activeSurface = ribbon;
	}

	private setTabbarHovered(tabbar: Element): void {
		tabbar.classList.add(TABBAR_HOVERED_CLASS);
		this.activeSurface = tabbar;
	}

	private setStatusbarHovered(statusbar: Element): void {
		statusbar.classList.add(STATUSBAR_HOVERED_CLASS);
		this.activeSurface = statusbar;
	}

	private pinSidebar(sidebar: Element): void {
		sidebar.classList.add(SIDEBAR_PINNED_CLASS);
		this.pinnedSidebars.add(sidebar);
	}

	private unpinSidebar(sidebar: Element): void {
		sidebar.classList.remove(SIDEBAR_PINNED_CLASS);
		sidebar.classList.remove(SIDEBAR_HOVERED_CLASS);
		this.pinnedSidebars.delete(sidebar);
	}

	private releaseOutside(target: EventTarget | null): void {
		if (closest(target, OVERLAY_SELECTOR)) return;
		const ctx = this.ctx;
		if (!ctx) return;
		const base = asElement(target);
		ctx.doc.querySelectorAll(SIDEBAR_SELECTOR).forEach((sidebar) => {
			if (!this.pinnedSidebars.has(sidebar)) return;
			if (!sidebar.isConnected) {
				this.unpinSidebar(sidebar);
				return;
			}
			if (base && sidebar.contains(base)) return;
			this.unpinSidebar(sidebar);
		});
		this.clearSidebarHoverExceptPinned();
	}

	private onPointerMove(event: Event): void {
		const config = this.state.config;
		if (config.lock) {
			this.collapseAllIfLocked();
			return;
		}
		const pe = event as PointerEvent;
		this.lastPointer = { x: pe.clientX, y: pe.clientY };
		const overlay = closest(pe.target, OVERLAY_SELECTOR);
		if (overlay) {
			if (config.sidebars.hide && config.sidebars.hover && this.activeSurface) {
				this.activeSurface.classList.add(SIDEBAR_HOVERED_CLASS);
			}
			return;
		}
		// Ribbon oculto + nested: el ribbon es el disparador de la sidebar
		// (Mb-sidebars.css 305-324): hover sobre el ribbon oculto lo revela y
		// empuja la sidebar hacia dentro. Sin nested, el ribbon oculto no revela.
		if (config.ribbons.hide && config.nestedRibbon) {
			const ribbon = closest(pe.target, RIBBON_SELECTOR);
			if (ribbon) {
				this.setRibbonHovered(ribbon);
				const leftSidebar = this.leftFloatingSidebar();
				if (leftSidebar && config.sidebars.hide && config.sidebars.hover) {
					this.setSidebarHovered(leftSidebar);
				}
				return;
			}
		}
		if (config.sidebars.hide && config.sidebars.hover) {
			const sidebar = closest(pe.target, SIDEBAR_SELECTOR);
			if (sidebar) {
				this.setSidebarHovered(sidebar);
				return;
			}
		}
		if (config.ribbons.hide && config.ribbons.hover) {
			const ribbon = closest(pe.target, RIBBON_SELECTOR);
			if (ribbon) {
				this.setRibbonHovered(ribbon);
				return;
			}
		}
		if (config.tabbar.hide && config.tabbar.hover) {
			const tabbar = closest(pe.target, TABBAR_CONTAINER_SELECTOR);
			if (tabbar) {
				this.setTabbarHovered(tabbar);
				return;
			}
		}
		if (config.statusbar.hide && config.statusbar.hover) {
			const statusbar = closest(pe.target, STATUSBAR_SELECTOR);
			if (statusbar) {
				this.setStatusbarHovered(statusbar);
				return;
			}
		}
		if (this.hasActiveOverlay()) {
			if (config.sidebars.hide && config.sidebars.hover && this.activeSurface) {
				this.activeSurface.classList.add(SIDEBAR_HOVERED_CLASS);
			}
			return;
		}
		if (config.sidebars.hide && config.sidebars.hover) this.clearSidebarHoverExceptPinned();
		if (config.ribbons.hide && config.ribbons.hover) this.clearRibbonHover();
		if (config.tabbar.hide && config.tabbar.hover) this.clearTabbarHover();
		if (config.statusbar.hide && config.statusbar.hover) this.clearStatusbarHover();
		this.activeSurface = null;
	}

	private leftFloatingSidebar(): Element | null {
		const ctx = this.ctx;
		if (!ctx) return null;
		const all = ctx.doc.querySelectorAll(SIDEBAR_SELECTOR);
		for (const el of Array.from(all)) {
			if (el.classList.contains('mod-left-split')) return el;
		}
		return null;
	}

	private onPointerDown(event: Event): void {
		const config = this.state.config;
		if (config.lock) return;
		if (closest(event.target, OVERLAY_SELECTOR)) return;
		const sidebar = closest(event.target, SIDEBAR_SELECTOR);
		if (
			sidebar &&
			config.sidebars.hide &&
			config.sidebars.pin &&
			closest(event.target, PERSISTENT_SELECTOR)
		) {
			this.pinSidebar(sidebar);
		}
		this.releaseOutside(event.target);
	}

	private onClick(event: Event): void {
		const config = this.state.config;
		if (config.lock) return;
		if (closest(event.target, OVERLAY_SELECTOR)) return;
		const sidebar = closest(event.target, SIDEBAR_SELECTOR);
		if (sidebar && config.sidebars.hide && config.sidebars.pin && closest(event.target, QUICK_ACTION_SELECTOR)) {
			this.unpinSidebar(sidebar);
		}
		this.releaseOutside(event.target);
	}

	private onFocusIn(event: Event): void {
		const config = this.state.config;
		if (config.lock) return;
		if (closest(event.target, OVERLAY_SELECTOR)) return;
		const sidebar = closest(event.target, SIDEBAR_SELECTOR);
		if (
			sidebar &&
			config.sidebars.hide &&
			config.sidebars.pin &&
			closest(event.target, PERSISTENT_SELECTOR)
		) {
			this.pinSidebar(sidebar);
		}
		this.releaseOutside(event.target);
	}

	private onMutation(): void {
		const config = this.state.config;
		if (config.lock) {
			this.collapseAllIfLocked();
			return;
		}
		const active = this.activeSurface;
		if (!active) return;
		if (this.pinnedSidebars.has(active)) return;
		if (!this.hasActiveOverlay() && !this.isPointerOverElement(active)) {
			if (config.sidebars.hide && config.sidebars.hover) this.clearSidebarHoverExceptPinned();
			if (config.ribbons.hide && config.ribbons.hover) this.clearRibbonHover();
			if (config.tabbar.hide && config.tabbar.hover) this.clearTabbarHover();
			if (config.statusbar.hide && config.statusbar.hover) this.clearStatusbarHover();
			this.activeSurface = null;
		}
	}

	private clearSurfaceClasses(): void {
		const ctx = this.ctx;
		if (!ctx) return;
		ctx.doc.querySelectorAll(SIDEBAR_SELECTOR).forEach((sidebar) => {
			sidebar.classList.remove(SIDEBAR_PINNED_CLASS);
			sidebar.classList.remove(SIDEBAR_HOVERED_CLASS);
		});
		ctx.doc.querySelectorAll(RIBBON_SELECTOR).forEach((el) => {
			el.classList.remove(RIBBON_HOVERED_CLASS);
		});
		ctx.doc.querySelectorAll(TABBAR_CONTAINER_SELECTOR).forEach((el) => {
			el.classList.remove(TABBAR_HOVERED_CLASS);
		});
		ctx.doc.querySelectorAll(STATUSBAR_SELECTOR).forEach((el) => {
			el.classList.remove(STATUSBAR_HOVERED_CLASS);
		});
	}
}

export function createHoverSurfacesAdapter(): HoverSurfacesAdapter {
	return new HoverSurfacesAdapter();
}