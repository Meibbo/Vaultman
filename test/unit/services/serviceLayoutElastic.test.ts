import { describe, expect, it } from 'vitest';
import { resolveDashboardEnabled } from '../../../src/services/serviceLayout';
import {
	DEFAULT_ELASTIC_UI_SETTINGS,
	normalizeElasticUiSettings,
} from '../../../src/types/typeElasticUi';

describe('normalizeElasticUiSettings', () => {
	it('falls back to defaults for empty input', () => {
		expect(normalizeElasticUiSettings(undefined)).toEqual(DEFAULT_ELASTIC_UI_SETTINGS);
		expect(normalizeElasticUiSettings({})).toEqual(DEFAULT_ELASTIC_UI_SETTINGS);
	});

	it('coerces invalid mode to thin', () => {
		expect(normalizeElasticUiSettings({ mode: 'bogus' }).mode).toBe('thin');
	});

	it('coerces invalid identity to native', () => {
		expect(normalizeElasticUiSettings({ identity: 'bogus' }).identity).toBe('native');
	});

	it('keeps valid mode + identity', () => {
		const out = normalizeElasticUiSettings({ mode: 'thick', identity: 'bases' });
		expect(out.mode).toBe('thick');
		expect(out.identity).toBe('bases');
	});

	it('only marks booleans true when explicitly true', () => {
		expect(normalizeElasticUiSettings({ faintModeEnabled: 1 }).faintModeEnabled).toBe(false);
		expect(normalizeElasticUiSettings({ faintModeEnabled: true }).faintModeEnabled).toBe(true);
		expect(normalizeElasticUiSettings({ reducedMotion: true }).reducedMotion).toBe(true);
		expect(normalizeElasticUiSettings({ foulDetection: true }).foulDetection).toBe(true);
	});
});

describe('resolveDashboardEnabled', () => {
	it('returns false for sidebar viewport', () => {
		expect(resolveDashboardEnabled({ width: 1200, kind: 'sidebar', mode: 'thick' })).toBe(false);
	});

	it('returns false in thin mode', () => {
		expect(resolveDashboardEnabled({ width: 1200, kind: 'main-leaf', mode: 'thin' })).toBe(false);
	});

	it('returns false below 800px in main-leaf', () => {
		expect(resolveDashboardEnabled({ width: 799, kind: 'main-leaf', mode: 'balanced' })).toBe(false);
	});

	it('returns true at 800px main-leaf + balanced', () => {
		expect(resolveDashboardEnabled({ width: 800, kind: 'main-leaf', mode: 'balanced' })).toBe(true);
	});

	it('returns true at high width main-leaf + thick', () => {
		expect(resolveDashboardEnabled({ width: 1600, kind: 'main-leaf', mode: 'thick' })).toBe(true);
	});
});
