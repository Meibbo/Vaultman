import { afterEach, describe, expect, it } from 'vitest';
import { ThemeService } from '../../src/services/serviceTheme.svelte';
import { makeCustomPreset } from './fixtures/themePresetFixtures';

const SELECTOR = 'style[data-vm-theme-presets="custom"]';

describe('ThemeService runtime <style> injection', () => {
	afterEach(() => {
		document.querySelectorAll(SELECTOR).forEach((element) => element.remove());
	});

	it('does not inject when customPresets is empty', () => {
		new ThemeService();
		expect(document.querySelector(SELECTOR)).toBeNull();
	});

	it('injects <style> when first custom registered', () => {
		const svc = new ThemeService();
		svc.registerCustomPreset(makeCustomPreset('c1'));
		const element = document.querySelector(SELECTOR);
		expect(element).not.toBeNull();
		expect(element?.textContent).toContain('.vm-theme-c1');
	});

	it('renders one block per custom preset', () => {
		const svc = new ThemeService();
		svc.registerCustomPreset(makeCustomPreset('c1'));
		svc.registerCustomPreset(makeCustomPreset('c2'));
		const element = document.querySelector(SELECTOR);
		expect(element?.textContent).toContain('.vm-theme-c1');
		expect(element?.textContent).toContain('.vm-theme-c2');
	});

	it('removes <style> when last custom unregistered', () => {
		const svc = new ThemeService();
		svc.registerCustomPreset(makeCustomPreset('c1'));
		svc.unregisterCustomPreset('c1');
		expect(document.querySelector(SELECTOR)).toBeNull();
	});

	it('updates <style> content on updateCustomPreset', () => {
		const svc = new ThemeService();
		svc.registerCustomPreset(
			makeCustomPreset('c1', {
				chrome: { popupBgOpacity: 0.5, popupBackdropBlur: '2px', popupBgTint: 0 },
			}),
		);
		svc.updateCustomPreset('c1', {
			chrome: { popupBgOpacity: 0.9, popupBackdropBlur: '6px', popupBgTint: 0 },
		});
		const element = document.querySelector(SELECTOR);
		expect(element?.textContent).toContain('--vm-popup-bg-opacity: 0.9');
		expect(element?.textContent).toContain('--vm-popup-backdrop-blur: 6px');
		expect(element?.textContent).not.toContain('--vm-popup-bg-opacity: 0.5');
	});

	it('css-escapes special characters in preset id', () => {
		const svc = new ThemeService();
		svc.registerCustomPreset(makeCustomPreset('has spaces/and:colons'));
		const element = document.querySelector(SELECTOR);
		expect(element?.textContent).toContain('.vm-theme-has-spaces-and-colons');
		expect(element?.textContent).not.toContain('has spaces/and:colons');
	});

	it('sanitizes malicious CSS length values', () => {
		const svc = new ThemeService();
		svc.registerCustomPreset(
			makeCustomPreset('evil', {
				chrome: {
					popupBgOpacity: 0.5,
					popupBackdropBlur: '}; body { display:none } /*',
					popupBgTint: 0,
				},
			}),
		);
		const element = document.querySelector(SELECTOR);
		expect(element?.textContent).not.toContain('display:none');
		expect(element?.textContent).toContain('--vm-popup-backdrop-blur: 0');
	});

	it('sanitizes out-of-range opacity', () => {
		const svc = new ThemeService();
		svc.registerCustomPreset(
			makeCustomPreset('o', {
				chrome: { popupBgOpacity: 999, popupBackdropBlur: '0px', popupBgTint: -5 },
			}),
		);
		const element = document.querySelector(SELECTOR);
		expect(element?.textContent).toContain('--vm-popup-bg-opacity: 1');
		expect(element?.textContent).toContain('--vm-popup-bg-tint: 0');
	});

	it('dispose() removes the injected element', () => {
		const svc = new ThemeService();
		svc.registerCustomPreset(makeCustomPreset('c1'));
		svc.dispose();
		expect(document.querySelector(SELECTOR)).toBeNull();
	});

	it('hydrate triggers custom style sync', () => {
		const svc = new ThemeService();
		svc.hydrate({
			mode: 'thin',
			identity: 'native',
			faintModeEnabled: false,
			reducedMotion: false,
			foulDetection: false,
			themePresetId: 'vaultman',
			customPresets: [makeCustomPreset('c1')],
		});
		const element = document.querySelector(SELECTOR);
		expect(element).not.toBeNull();
		expect(element?.textContent).toContain('.vm-theme-c1');
	});
});
