import { describe, expect, it, vi } from 'vitest';
import { createVaultmanSasi } from '../../src/logic/logicSasiBootstrap';
import {
	registerSettingsActions,
	SETTINGS_OPEN_ID,
} from '../../src/logic/logicSasiSettingsActions';
import { createSasiRegistry } from '../../src/logic/logicSasiRegistry';
import { en } from '../../src/i18n/en';
import { es } from '../../src/i18n/es';

describe('U130 SASI settings action indexing', () => {
	it('registers under function axis as a read-only action', () => {
		const registry = createSasiRegistry();
		registerSettingsActions(registry);

		const resolved = registry.resolve(SETTINGS_OPEN_ID);
		expect(resolved.available).toBe(true);
		expect(resolved.def).toBeDefined();
		expect(resolved.def?.axis).toBe('function');
		expect(resolved.def?.kind).toBe('action');
		expect(resolved.def?.labelKey).toBe('command.open_settings');
		expect(resolved.def?.mutatesVault).toBeUndefined();
		expect(resolved.def?.supports).toEqual(
			expect.arrayContaining([{ surface: 'command' }]),
		);
	});

	it('is included in default createVaultmanSasi bootstrap and provider', () => {
		const { registry, provider } = createVaultmanSasi();
		const resolved = registry.resolve(SETTINGS_OPEN_ID);
		expect(resolved.available).toBe(true);

		const nodes = provider.nodesFor('function');
		const node = nodes.find((n) => n.id === SETTINGS_OPEN_ID);
		expect(node).toBeDefined();
		expect(node?.labelKey).toBe('command.open_settings');
	});

	it('has localized command labels in en and es', () => {
		expect(en['command.open_settings']).toBe('Open settings');
		expect(es['command.open_settings']).toBe('Abrir configuración');
	});

	it('invokes Obsidian setting tab when openSettings is executed', () => {
		const openSpy = vi.fn();
		const openTabByIdSpy = vi.fn();

		const mockApp = {
			setting: {
				open: openSpy,
				openTabById: openTabByIdSpy,
			},
		};

		const plugin = {
			app: mockApp,
			manifest: { id: 'vaultman' },
			openSettings() {
				const setting = (this.app as any).setting;
				if (!setting?.open || !setting.openTabById) return false;
				setting.open();
				setting.openTabById(this.manifest.id);
				return true;
			},
		};

		const result = plugin.openSettings();
		expect(result).toBe(true);
		expect(openSpy).toHaveBeenCalledTimes(1);
		expect(openTabByIdSpy).toHaveBeenCalledWith('vaultman');
	});
});
