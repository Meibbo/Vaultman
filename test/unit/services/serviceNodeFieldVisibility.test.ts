import { describe, expect, it, vi } from 'vitest';
import {
	defaultVisibleFields,
	fieldDefinitionsFor,
	fieldVisibilityKey,
	normalizeVisibleFields,
	setVisibleFieldsForSettings,
	toggleVisibleField,
	visibleFieldsFromSettings,
} from '../../../src/services/serviceNodeFieldVisibility';
import { DEFAULT_SETTINGS, type VaultmanSettings } from '../../../src/types/typeSettings';

function settings(): VaultmanSettings {
	return structuredClone(DEFAULT_SETTINGS);
}

describe('serviceNodeFieldVisibility', () => {
	it('builds stable provider/view keys', () => {
		expect(fieldVisibilityKey('files', 'cards')).toBe('files:cards');
		expect(fieldVisibilityKey('tags', 'grid')).toBe('tags:grid');
	});

	it('returns provider-specific cards definitions', () => {
		expect(fieldDefinitionsFor('files', 'cards').map((field) => field.id)).toEqual([
			'icon',
			'name',
			'date',
			'tags',
			'path',
			'size',
			'media',
		]);
		expect(fieldDefinitionsFor('props', 'cards').map((field) => field.id)).toEqual([
			'icon',
			'text',
			'count',
			'type',
			'values',
			'date',
			'media',
		]);
	});

	it('registers media as a legal node field that defaults off for every view', () => {
		for (const providerId of ['files', 'props', 'tags', 'content']) {
			for (const viewMode of ['tree', 'list', 'table', 'grid', 'cards'] as const) {
				const media = fieldDefinitionsFor(providerId, viewMode).find(
					(field) => field.id === 'media',
				);

				expect(media).toMatchObject({
					id: 'media',
					labelKey: 'viewmode.pill.media',
					defaultOn: false,
				});
				expect(media?.identity).toBeUndefined();
				expect(defaultVisibleFields(providerId, viewMode)).not.toContain('media');
			}
		}
	});

	it('falls back to defaults when settings are missing', () => {
		expect(visibleFieldsFromSettings(settings(), 'files', 'cards')).toEqual([
			'icon',
			'name',
			'date',
		]);
	});

	it('drops unknown fields and keeps stable ordering', () => {
		expect(normalizeVisibleFields('files', 'cards', ['size', 'bogus', 'name', 'icon'])).toEqual(
			['icon', 'name', 'size'],
		);
	});

	it('repairs invalid identity state by restoring the first default identity field', () => {
		expect(normalizeVisibleFields('files', 'cards', ['date', 'tags'])).toEqual([
			'icon',
			'date',
			'tags',
		]);
		expect(normalizeVisibleFields('tags', 'cards', ['count'])).toEqual(['icon', 'count']);
	});

	it('toggles fields while preserving identity rules', () => {
		const current = ['icon', 'name', 'date'];
		expect(toggleVisibleField('files', 'cards', current, 'path')).toEqual([
			'icon',
			'name',
			'date',
			'path',
		]);
		expect(toggleVisibleField('files', 'cards', ['icon'], 'icon')).toEqual(['icon']);
		expect(toggleVisibleField('files', 'cards', ['icon', 'name'], 'icon')).toEqual(['name']);
	});

	it('persists normalized fields only when explicitly called', async () => {
		const s = settings();
		const saveSettings = vi.fn(async () => undefined);
		await setVisibleFieldsForSettings(
			{ settings: s, saveSettings },
			'files',
			'cards',
			['path', 'name', 'bogus'],
		);
		expect(s.viewFieldVisibility?.['files:cards']).toEqual(['name', 'path']);
		expect(saveSettings).toHaveBeenCalledOnce();
	});
});
