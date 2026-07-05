import type {
	CapabilityResult,
	FragilityRecord,
	PlatformAdapter,
	PlatformAdapterContext,
} from '../platformAdapter';
import {
	NATIVE_SURFACE_HOVER_SOURCE,
	handleNativeBindingHover,
	resolveNativeBindingTarget,
	type NativeBindingTarget,
} from '../../services/serviceNativeSurfaceBinding';
import {
	aliasForPluginId,
	aliasForSnippetFile,
	aliasForTag,
} from '../../services/serviceAliasTokens';

export const NATIVE_BINDING_OPEN_EVENT = 'vm:open-node-note';

export const NATIVE_BINDING_TAG_SELECTORS = [
	'.tag-pane-tag',
	'a.tag[href^="#"]',
	'.metadata-property[data-property-key="tags"] .multi-select-pill',
	'span.cm-hashtag',
] as const;

export const NATIVE_BINDING_FOLDER_SELECTORS = [
	'.nav-folder-title',
	'[data-path][data-type="folder"]',
	'.view-header-breadcrumb[data-path]',
	'.view-header-breadcrumb-separator + .view-header-breadcrumb[data-path]',
] as const;

export const LEGACY_NATIVE_CLICK_SELECTORS = [
	'.cm-hashtag',
	'[data-snippet-name]',
	'[data-plugin-id]',
] as const;

export interface NativeBindingAdapterRoutes {
	bindNativeTarget(target: NativeBindingTarget, event: MouseEvent): void | Promise<void>;
	openNodeAlias(alias: string, event: MouseEvent): void | Promise<void>;
}

export interface NativeBindingAdapterOptions {
	routes: NativeBindingAdapterRoutes;
	enabled?: () => boolean;
}

type EventDoc = Pick<Document, 'addEventListener' | 'removeEventListener'>;

const FRAGILITY: FragilityRecord = {
	id: 'native-binding',
	title: 'Native surface binding',
	summary:
		'Consolidates the wired native tag/folder binding path and the legacy ' +
		'vm:open-node-note click interceptor behind one PlatformAdapter. Routing ' +
		'from selector hits into provider actions remains an injected dependency.',
	privateSymbols: [
		'plugin.registerHoverLinkSource',
		"app.workspace.trigger('hover-link')",
		NATIVE_BINDING_OPEN_EVENT,
	],
	selectorSources: [
		...NATIVE_BINDING_TAG_SELECTORS,
		...NATIVE_BINDING_FOLDER_SELECTORS,
		...LEGACY_NATIVE_CLICK_SELECTORS,
	],
	obsidianAssumptions: [
		'Obsidian native tag/folder surfaces keep stable class/data-path selectors',
		'Plugin.registerHoverLinkSource registers the hover source for the plugin lifecycle',
		'Ctrl/Cmd-click on legacy native rows can still be represented as vm:open-node-note',
		'Selector-to-provider routing is injected; this adapter does not touch filterService, nodeBindingService, or providers',
	],
	fallback:
		'Native-surface binding is disabled. Vaultman leaves Obsidian native clicks and hover behavior untouched.',
	mobile: {
		supported: 'degraded',
		notes:
			'Modifier-click and hover-link behavior are desktop-first; mobile support is degraded until the is-phone inventory decides the supported subset.',
	},
};

export function dispatchOpenNodeNoteEvent(doc: Document, alias: string): void {
	doc.dispatchEvent(
		new CustomEvent(NATIVE_BINDING_OPEN_EVENT, {
			detail: { alias },
			bubbles: true,
		}),
	);
}

export class NativeBindingAdapter implements PlatformAdapter {
	readonly id = FRAGILITY.id;
	readonly fragility = FRAGILITY;

	private readonly routes: NativeBindingAdapterRoutes;
	private readonly enabled: () => boolean;
	private teardowns: Array<() => void> = [];
	private isApplied = false;

	constructor(options: NativeBindingAdapterOptions) {
		this.routes = options.routes;
		this.enabled = options.enabled ?? (() => true);
	}

	probe(ctx: PlatformAdapterContext): CapabilityResult {
		try {
			if (!isEventDocument(ctx.doc)) {
				return { ok: false, reason: 'document event API is not available' };
			}
			if (typeof this.routes.bindNativeTarget !== 'function') {
				return { ok: false, reason: 'bindNativeTarget route is not available' };
			}
			if (typeof this.routes.openNodeAlias !== 'function') {
				return { ok: false, reason: 'openNodeAlias route is not available' };
			}
			if (typeof pluginWithHoverSource(ctx.plugin).registerHoverLinkSource !== 'function') {
				return { ok: false, reason: 'plugin.registerHoverLinkSource is not available' };
			}
		} catch (error) {
			return { ok: false, reason: `probe failed: ${errorMessage(error)}` };
		}
		return { ok: true };
	}

	apply(ctx: PlatformAdapterContext): void {
		const capability = this.probe(ctx);
		if (!capability.ok) {
			throw new Error(capability.reason);
		}
		this.revert();

		const doc = ctx.doc;
		const hoverPlugin = pluginWithHoverSource(ctx.plugin);
		if (typeof hoverPlugin.registerHoverLinkSource !== 'function') {
			throw new Error('plugin.registerHoverLinkSource is not available');
		}
		hoverPlugin.registerHoverLinkSource(NATIVE_SURFACE_HOVER_SOURCE, {
			display: 'Vaultman native surfaces',
			defaultMod: true,
		});

		const clickHandler = (event: Event) => {
			if (!this.enabled()) return;
			void this.handleClick(event as MouseEvent).catch((error: unknown) => {
				warnRouteError('click', error);
			});
		};
		const auxClickHandler = (event: Event) => {
			if (!this.enabled()) return;
			void this.handleNativeBindingClick(event as MouseEvent).catch((error: unknown) => {
				warnRouteError('auxclick', error);
			});
		};
		const mouseoverHandler = (event: Event) => {
			if (!this.enabled()) return;
			handleNativeBindingHover(event as MouseEvent, { app: ctx.app });
		};

		doc.addEventListener('click', clickHandler, true);
		doc.addEventListener('auxclick', auxClickHandler, true);
		doc.addEventListener('mouseover', mouseoverHandler, false);
		this.teardowns = [
			() => doc.removeEventListener('click', clickHandler, true),
			() => doc.removeEventListener('auxclick', auxClickHandler, true),
			() => doc.removeEventListener('mouseover', mouseoverHandler, false),
		];
		this.isApplied = true;
	}

	revert(): void {
		for (const teardown of this.teardowns.splice(0)) {
			teardown();
		}
		this.isApplied = false;
	}

	get applied(): boolean {
		return this.isApplied;
	}

	private async handleClick(event: MouseEvent): Promise<void> {
		if (await this.handleNativeBindingClick(event)) return;
		this.handleLegacyOpenNodeClick(event);
	}

	private async handleNativeBindingClick(event: MouseEvent): Promise<boolean> {
		if (!isNativeBindingClick(event)) return false;
		const target = resolveNativeBindingTarget(event.target);
		if (!target) return false;
		event.preventDefault();
		event.stopImmediatePropagation();
		await this.routes.bindNativeTarget(target, event);
		return true;
	}

	private handleLegacyOpenNodeClick(event: MouseEvent): boolean {
		if (!event.ctrlKey && !event.metaKey) return false;
		const target = asElement(event.target);
		if (!target) return false;
		const alias = legacyAliasForTarget(target);
		if (!alias) return false;
		void Promise.resolve(this.routes.openNodeAlias(alias, event)).catch((error: unknown) => {
			warnRouteError('open-node-alias', error);
		});
		return true;
	}
}

function isNativeBindingClick(event: MouseEvent): boolean {
	return event.metaKey || event.ctrlKey || event.altKey || event.button === 1;
}

function isEventDocument(doc: Document): doc is Document & EventDoc {
	return (
		typeof doc?.addEventListener === 'function' &&
		typeof doc?.removeEventListener === 'function'
	);
}

function pluginWithHoverSource(plugin: PlatformAdapterContext['plugin']): {
	registerHoverLinkSource?: (
		source: string,
		info: { display: string; defaultMod: boolean },
	) => void;
} {
	return plugin as unknown as {
		registerHoverLinkSource?: (
			source: string,
			info: { display: string; defaultMod: boolean },
		) => void;
	};
}

function legacyAliasForTarget(target: HTMLElement): string {
	const tag = target.closest<HTMLElement>('.cm-hashtag');
	if (tag) return aliasForTag(tag.textContent?.trim() ?? '');
	const snippet = target.closest<HTMLElement>('[data-snippet-name]');
	if (snippet) return aliasForSnippetFile(snippet.dataset.snippetName ?? '');
	const plugin = target.closest<HTMLElement>('[data-plugin-id]');
	if (plugin) return aliasForPluginId(plugin.dataset.pluginId ?? '');
	return '';
}

function asElement(target: EventTarget | null): HTMLElement | null {
	return target instanceof HTMLElement ? target : null;
}

function warnRouteError(kind: string, error: unknown): void {
	console.warn(`[vaultman] native-binding ${kind} route failed: ${errorMessage(error)}`);
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
