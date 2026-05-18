import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import FrameVaultman from '../../src/components/frame/frameVaultman.svelte';
import { installObsidianDomPolyfill } from '../helpers/dom-obsidian-polyfill';
import { makeMockPlugin } from './_helpers/makeMockPlugin';

describe('frameVaultman baseline DOM (pre-O snapshot)', () => {
	let target: HTMLElement;
	let instance: ReturnType<typeof mount> | null = null;
	let rectSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		installObsidianDomPolyfill();
		target = document.createElement('div');
		document.body.appendChild(target);
		rectSpy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
			x: 0,
			y: 0,
			width: 640,
			height: 720,
			top: 0,
			right: 640,
			bottom: 720,
			left: 0,
			toJSON: () => ({}),
		} as DOMRect);
		vi.stubGlobal(
			'ResizeObserver',
			class {
				private readonly cb: ResizeObserverCallback;

				constructor(cb: ResizeObserverCallback) {
					this.cb = cb;
				}

				observe(): void {
					this.cb([], this as unknown as ResizeObserver);
				}

				disconnect(): void {}
			},
		);
		vi.stubGlobal('activeWindow', window);
		vi.stubGlobal('activeDocument', document);
		vi.spyOn(document, 'hasFocus').mockReturnValue(true);
	});

	afterEach(() => {
		if (instance) {
			void unmount(instance);
			instance = null;
		}
		target.remove();
		rectSpy.mockRestore();
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('renders ops page (default state)', () => {
		const plugin = makeMockPlugin({ pageOrder: ['ops', 'statistics', 'filters'] });
		instance = mount(FrameVaultman as unknown as Component<Record<string, unknown>>, {
			target,
			props: { plugin, viewportKind: 'main-leaf' },
		});
		flushSync();
		expect(target.innerHTML).toMatchSnapshot();
	});

	it('renders filters page', () => {
		const plugin = makeMockPlugin({ pageOrder: ['filters', 'ops', 'statistics'] });
		instance = mount(FrameVaultman as unknown as Component<Record<string, unknown>>, {
			target,
			props: { plugin, viewportKind: 'main-leaf' },
		});
		flushSync();
		expect(target.innerHTML).toMatchSnapshot();
	});

	it('renders statistics page', () => {
		const plugin = makeMockPlugin({ pageOrder: ['statistics', 'ops', 'filters'] });
		instance = mount(FrameVaultman as unknown as Component<Record<string, unknown>>, {
			target,
			props: { plugin, viewportKind: 'main-leaf' },
		});
		flushSync();
		expect(target.innerHTML).toMatchSnapshot();
	});
});
