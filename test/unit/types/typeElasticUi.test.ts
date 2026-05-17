import { describe, expect, it } from 'vitest';
import {
	DEFAULT_ELASTIC_UI_SETTINGS,
	normalizeElasticUiSettings,
} from '../../../src/types/typeElasticUi';

describe('ElasticUiSettings themePresetId + customPresets', () => {
	it('DEFAULT_ELASTIC_UI_SETTINGS.themePresetId is "vaultman"', () => {
		expect(DEFAULT_ELASTIC_UI_SETTINGS.themePresetId).toBe('vaultman');
	});

	it('DEFAULT_ELASTIC_UI_SETTINGS.customPresets is []', () => {
		expect(DEFAULT_ELASTIC_UI_SETTINGS.customPresets).toEqual([]);
	});

	it('normalizeElasticUiSettings fills default themePresetId for missing input', () => {
		const result = normalizeElasticUiSettings({});
		expect(result.themePresetId).toBe('vaultman');
	});

	it('normalizeElasticUiSettings preserves valid themePresetId string', () => {
		const result = normalizeElasticUiSettings({ themePresetId: 'native' });
		expect(result.themePresetId).toBe('native');
	});

	it('normalizeElasticUiSettings falls back when themePresetId is not a string', () => {
		const result = normalizeElasticUiSettings({ themePresetId: 42 });
		expect(result.themePresetId).toBe('vaultman');
	});

	it('normalizeElasticUiSettings returns [] for missing customPresets', () => {
		const result = normalizeElasticUiSettings({});
		expect(result.customPresets).toEqual([]);
	});

	it('normalizeElasticUiSettings filters invalid customPresets entries', () => {
		const result = normalizeElasticUiSettings({
			customPresets: [
				{
					source: 'custom',
					id: 'good',
					displayName: 'Good',
					useNativeDom: false,
					chrome: { popupBgOpacity: 1, popupBackdropBlur: '0px', popupBgTint: 0 },
					density: { rowHeight: '30px', rowPaddingY: '3px', iconSize: '15px' },
					dock: { visible: true, presentation: 'bar' },
					tabs: { visible: true, presentation: 'top-tabs', kind: 'embedded' },
					toolbar: { buttons: 'full' },
					viewModes: ['tree'],
					nodeElements: {
						icon: true,
						label: true,
						detail: true,
						media: false,
						badges: {
							ops: false,
							filters: false,
							warnings: false,
							inherited: false,
							counts: false,
						},
						actions: true,
					},
					lockNodeElementVisibility: false,
				},
				{ source: 'built-in', id: 'fake-builtin' },
				null,
				{ id: 'incomplete' },
			],
		});
		expect(result.customPresets).toHaveLength(1);
		expect(result.customPresets[0].id).toBe('good');
	});

	it('normalizeElasticUiSettings returns [] for non-array customPresets', () => {
		const result = normalizeElasticUiSettings({ customPresets: 'not-array' });
		expect(result.customPresets).toEqual([]);
	});
});
