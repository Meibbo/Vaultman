export type VaultmanUiMode = 'thin' | 'balanced' | 'thick';
export type VaultmanUiIdentity = 'native' | 'bases' | 'outline' | 'bookmarks';

export interface ElasticUiSettings {
	mode: VaultmanUiMode;
	identity: VaultmanUiIdentity;
	faintModeEnabled: boolean;
	reducedMotion: boolean;
	foulDetection: boolean;
}

export const DEFAULT_ELASTIC_UI_SETTINGS: ElasticUiSettings = {
	mode: 'thin',
	identity: 'native',
	faintModeEnabled: false,
	reducedMotion: false,
	foulDetection: false,
};

function normalizeMode(value: unknown): VaultmanUiMode {
	return value === 'balanced' || value === 'thick' || value === 'thin' ? value : 'thin';
}

function normalizeIdentity(value: unknown): VaultmanUiIdentity {
	return value === 'bases' || value === 'outline' || value === 'bookmarks' || value === 'native'
		? value
		: 'native';
}

export function normalizeElasticUiSettings(raw: unknown): ElasticUiSettings {
	const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
	return {
		mode: normalizeMode(source.mode),
		identity: normalizeIdentity(source.identity),
		faintModeEnabled: source.faintModeEnabled === true,
		reducedMotion: source.reducedMotion === true,
		foulDetection: source.foulDetection === true,
	};
}
