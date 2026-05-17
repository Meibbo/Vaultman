import type { ThemePreset, ThemePresetId } from './typeThemePreset';
import { normalizeCustomPreset } from './typeThemePreset';

export type VaultmanUiMode = 'thin' | 'balanced' | 'thick';
export type VaultmanUiIdentity = 'native' | 'bases' | 'outline' | 'bookmarks';

export interface ElasticUiSettings {
	mode: VaultmanUiMode;
	identity: VaultmanUiIdentity;
	faintModeEnabled: boolean;
	reducedMotion: boolean;
	foulDetection: boolean;
	themePresetId: ThemePresetId;
	customPresets: ThemePreset[];
}

export const DEFAULT_ELASTIC_UI_SETTINGS: ElasticUiSettings = {
	mode: 'thin',
	identity: 'native',
	faintModeEnabled: false,
	reducedMotion: false,
	foulDetection: false,
	themePresetId: 'vaultman',
	customPresets: [],
};

function normalizeMode(value: unknown): VaultmanUiMode {
	return value === 'balanced' || value === 'thick' || value === 'thin' ? value : 'thin';
}

function normalizeIdentity(value: unknown): VaultmanUiIdentity {
	return value === 'bases' || value === 'outline' || value === 'bookmarks' || value === 'native'
		? value
		: 'native';
}

function normalizeThemePresetId(value: unknown): ThemePresetId {
	return typeof value === 'string' && value.length > 0 ? value : 'vaultman';
}

function normalizeCustomPresetsArray(value: unknown): ThemePreset[] {
	if (!Array.isArray(value)) return [];
	return value
		.map(normalizeCustomPreset)
		.filter((preset): preset is ThemePreset => preset !== null);
}

export function normalizeElasticUiSettings(raw: unknown): ElasticUiSettings {
	const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
	return {
		mode: normalizeMode(source.mode),
		identity: normalizeIdentity(source.identity),
		faintModeEnabled: source.faintModeEnabled === true,
		reducedMotion: source.reducedMotion === true,
		foulDetection: source.foulDetection === true,
		themePresetId: normalizeThemePresetId(source.themePresetId),
		customPresets: normalizeCustomPresetsArray(source.customPresets),
	};
}
