// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { App, Plugin } from 'obsidian';
import { PlatformAdapterRegistry } from '../../../src/platform/fragilityRegistry';
import {
	NativeBindingAdapter,
	type NativeBindingAdapterRoutes,
} from '../../../src/platform/adapters/nativeBindingAdapter';
import type { PlatformAdapterContext } from '../../../src/platform/platformAdapter';

function makePlugin() {
	return {
		registerHoverLinkSource: vi.fn(),
	} as unknown as Plugin & {
		registerHoverLinkSource: ReturnType<typeof vi.fn>;
	};
}

function makeCtx(plugin = makePlugin()): PlatformAdapterContext {
	return {
		app: {
			workspace: { trigger: vi.fn() },
			vault: { getMarkdownFiles: () => [] },
			metadataCache: { getFileCache: () => null },
		} as unknown as App,
		plugin,
		doc: document,
	};
}

function makeRoutes(): NativeBindingAdapterRoutes {
	return {
		bindNativeTarget: vi.fn(),
		openNodeAlias: vi.fn(),
	};
}

function click(el: HTMLElement, init: MouseEventInit = {}): void {
	el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ...init }));
}

function fakeMouseEvent(target: HTMLElement, init: Partial<MouseEvent> = {}) {
	return {
		target,
		ctrlKey: false,
		metaKey: false,
		altKey: false,
		button: 0,
		preventDefault: vi.fn(),
		stopImmediatePropagation: vi.fn(),
		...init,
	} as unknown as MouseEvent;
}

function listenerFor(
	spy: ReturnType<typeof vi.spyOn>,
	type: string,
): EventListenerOrEventListenerObject {
	const listener = spy.mock.calls.find((call) => call[0] === type)?.[1];
	if (!listener) throw new Error(`missing ${type} listener`);
	return listener;
}

async function callListener(
	listener: EventListenerOrEventListenerObject,
	event: MouseEvent,
): Promise<void> {
	if (typeof listener === 'function') {
		listener(event);
	} else {
		listener.handleEvent(event);
	}
	await Promise.resolve();
}

beforeEach(() => {
	vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
	document.body.innerHTML = '';
	vi.restoreAllMocks();
});

describe('NativeBindingAdapter — probe + registry isolation', () => {
	it('probe-fail disables the adapter through the registry and leaves the DOM clean', async () => {
		const badPlugin = {} as Plugin;
		const adapter = new NativeBindingAdapter({ routes: makeRoutes() });
		const registry = new PlatformAdapterRegistry().add(adapter);

		const status = await registry.activate(makeCtx(badPlugin));
		await registry.deactivate();

		expect(status).toEqual([
			{
				id: 'native-binding',
				enabled: false,
				reason: 'plugin.registerHoverLinkSource is not available',
			},
		]);

		const tag = document.createElement('span');
		tag.className = 'cm-hashtag';
		tag.textContent = '#projects';
		document.body.appendChild(tag);
		expect(() => click(tag, { ctrlKey: true })).not.toThrow();
	});

	it('registry isolates another adapter that throws while native-binding still loads', async () => {
		const nativeBinding = new NativeBindingAdapter({ routes: makeRoutes() });
		const throwing = {
			id: 'throwing-adapter',
			fragility: {
				id: 'throwing-adapter',
				title: 'throwing-adapter',
				summary: 'throwing-adapter',
				privateSymbols: [],
				selectorSources: [],
				obsidianAssumptions: [],
				fallback: 'none',
				mobile: { supported: 'unknown' as const, notes: '' },
			},
			probe: () => ({ ok: true as const }),
			apply: () => {
				throw new Error('apply-boom');
			},
			revert: vi.fn(),
		};
		const ok = {
			id: 'ok',
			fragility: {
				id: 'ok',
				title: 'ok',
				summary: 'ok',
				privateSymbols: [],
				selectorSources: [],
				obsidianAssumptions: [],
				fallback: 'none',
				mobile: { supported: 'unknown' as const, notes: '' },
			},
			probe: () => ({ ok: true as const }),
			apply: vi.fn(),
			revert: vi.fn(),
		};
		const registry = new PlatformAdapterRegistry().add(nativeBinding).add(throwing).add(ok);

		const status = await registry.activate(makeCtx());

		expect(status[0]).toMatchObject({ id: 'native-binding', enabled: true });
		expect(status[1]).toMatchObject({
			id: 'throwing-adapter',
			enabled: false,
			reason: expect.stringContaining('apply threw'),
		});
		expect(status[2]).toMatchObject({
			id: 'ok',
			enabled: true,
		});
		expect(ok.apply).toHaveBeenCalledOnce();
	});
});

describe('NativeBindingAdapter — apply/revert lifecycle', () => {
	it('routes native tag/folder surfaces and legacy alias selectors through injected dependencies', async () => {
		const routes = makeRoutes();
		const plugin = makePlugin();
		const adapter = new NativeBindingAdapter({ routes });
		const addEventListener = vi.spyOn(document, 'addEventListener');
		adapter.apply(makeCtx(plugin));
		const clickListener = listenerFor(addEventListener, 'click');
		const auxClickListener = listenerFor(addEventListener, 'auxclick');

		const tag = document.createElement('span');
		tag.className = 'tag-pane-tag';
		tag.textContent = 'project/active';
		document.body.appendChild(tag);

		const folder = document.createElement('div');
		folder.className = 'nav-folder-title';
		folder.dataset.path = 'Projects/Alpha';
		document.body.appendChild(folder);

		const legacySnippet = document.createElement('div');
		legacySnippet.dataset.snippetName = 'theme.css';
		document.body.appendChild(legacySnippet);

		await callListener(clickListener, fakeMouseEvent(tag, { ctrlKey: true }));
		await callListener(auxClickListener, fakeMouseEvent(folder, { button: 1 }));
		await callListener(clickListener, fakeMouseEvent(legacySnippet, { metaKey: true }));

		expect(plugin.registerHoverLinkSource).toHaveBeenCalledOnce();
		expect(routes.bindNativeTarget).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({ node: { kind: 'tag', label: 'project/active', tagPath: 'project/active' } }),
			expect.any(Object),
		);
		expect(routes.bindNativeTarget).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({ node: { kind: 'folder', label: 'Projects/Alpha' } }),
			expect.any(Object),
		);
		expect(routes.openNodeAlias).toHaveBeenCalledWith('$theme', expect.any(Object));
	});

	it('revert removes listeners so apply leaves zero event-routing residue', async () => {
		const routes = makeRoutes();
		const adapter = new NativeBindingAdapter({ routes });
		const addEventListener = vi.spyOn(document, 'addEventListener');
		const removeEventListener = vi.spyOn(document, 'removeEventListener');
		adapter.apply(makeCtx());
		const clickListener = listenerFor(addEventListener, 'click');
		const auxClickListener = listenerFor(addEventListener, 'auxclick');
		const mouseoverListener = listenerFor(addEventListener, 'mouseover');

		const tag = document.createElement('span');
		tag.className = 'tag-pane-tag';
		tag.textContent = 'project/active';
		document.body.appendChild(tag);

		await callListener(clickListener, fakeMouseEvent(tag, { ctrlKey: true }));
		expect(routes.bindNativeTarget).toHaveBeenCalledOnce();

		adapter.revert();
		adapter.revert();
		expect(removeEventListener).toHaveBeenCalledWith('click', clickListener, true);
		expect(removeEventListener).toHaveBeenCalledWith('auxclick', auxClickListener, true);
		expect(removeEventListener).toHaveBeenCalledWith('mouseover', mouseoverListener, false);
		expect(routes.bindNativeTarget).toHaveBeenCalledOnce();
	});
});

describe('NativeBindingAdapter — fragility record', () => {
	it('declares both native-binding selector sets and mobile behavior', () => {
		const adapter = new NativeBindingAdapter({ routes: makeRoutes() });

		expect(adapter.id).toBe('native-binding');
		expect(adapter.fragility.selectorSources).toEqual(
			expect.arrayContaining([
				'.tag-pane-tag',
				'a.tag[href^="#"]',
				'.metadata-property[data-property-key="tags"] .multi-select-pill',
				'span.cm-hashtag',
				'.nav-folder-title',
				'[data-path][data-type="folder"]',
				'.view-header-breadcrumb[data-path]',
				'.view-header-breadcrumb-separator + .view-header-breadcrumb[data-path]',
				'[data-snippet-name]',
				'[data-plugin-id]',
			]),
		);
		expect(adapter.fragility.privateSymbols).toContain('plugin.registerHoverLinkSource');
		expect(adapter.fragility.mobile.supported).toBe('degraded');
		expect(adapter.fragility.mobile.notes).toContain('hover');
	});
});
