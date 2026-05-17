import { afterEach, describe, expect, it } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';

import { ThemeService } from '../../src/services/serviceTheme.svelte';
import FrameRootHarness from './fixtures/FrameRootHarness.svelte';

const CUSTOM_STYLE_SELECTOR = 'style[data-vm-theme-presets="custom"]';

let app: ReturnType<typeof mount> | null = null;
let target: HTMLDivElement | null = null;

afterEach(() => {
	if (app) {
		void unmount(app);
		app = null;
	}
	target?.remove();
	target = null;
	document.querySelectorAll(CUSTOM_STYLE_SELECTOR).forEach((element) => element.remove());
});

function render(themeService: ThemeService): HTMLElement {
	target = document.createElement('div');
	document.body.appendChild(target);
	app = mount(FrameRootHarness as unknown as Component<{ themeService: ThemeService }>, {
		target,
		props: { themeService },
	});
	flushSync();
	const root = target.querySelector<HTMLElement>('[data-testid="vm-root-harness"]');
	expect(root).not.toBeNull();
	return root!;
}

describe('frameVaultman root class composition (via harness)', () => {
	it('renders vm-theme-vaultman on the root element by default', () => {
		const themeService = new ThemeService();
		const root = render(themeService);

		expect(root.classList.contains('vm-root')).toBe(true);
		expect(root.classList.contains('vm-theme-vaultman')).toBe(true);
		expect(root.classList.contains('vm-theme-native')).toBe(false);
	});

	it('switches to vm-theme-native when setPreset("native") is called', () => {
		const themeService = new ThemeService();
		const root = render(themeService);

		themeService.setPreset('native');
		flushSync();

		expect(root.classList.contains('vm-theme-native')).toBe(true);
		expect(root.classList.contains('vm-theme-vaultman')).toBe(false);
	});

	it('renders mode and identity classes alongside theme class', () => {
		const themeService = new ThemeService();
		themeService.mode = 'balanced';
		themeService.identity = 'outline';
		const root = render(themeService);

		expect(root.classList.contains('vm-mode-balanced')).toBe(true);
		expect(root.classList.contains('vm-id-outline')).toBe(true);
		expect(root.classList.contains('vm-theme-vaultman')).toBe(true);
	});
});
