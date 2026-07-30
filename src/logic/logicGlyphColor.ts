/**
 * BT5-025: one shared glyph-color palette for the Floating Index and the
 * Explorer. The shared selector exposes these six choices; the individual
 * Obsidian color vars are gone from the UI and fold into `custom`.
 */
export type GlyphColorChoice =
	| 'default'
	| 'faint'
	| 'accent'
	| 'custom'
	| 'rainbow'
	| 'rainbow-pastel';

export const GLYPH_COLOR_CHOICES: readonly GlyphColorChoice[] = [
	'default',
	'faint',
	'accent',
	'custom',
	'rainbow',
	'rainbow-pastel',
];

/** Obsidian's documented default hex for each retired color var (migration). */
const LEGACY_COLOR_HEX: Readonly<Record<string, string>> = {
	red: '#e93147',
	orange: '#ec7500',
	yellow: '#e0ac00',
	green: '#08b94e',
	cyan: '#00bfbc',
	blue: '#086ddd',
	purple: '#7852ee',
	pink: '#d53984',
};

/** Exact dark/strong tones from the reference rainbow snippet. */
const RAINBOW_STRONG = [
	'hsl(18, 60%, 40%)',
	'hsl(54, 60%, 40%)',
	'hsl(90, 60%, 40%)',
	'hsl(126, 60%, 40%)',
	'hsl(162, 60%, 40%)',
	'hsl(198, 60%, 40%)',
	'hsl(234, 60%, 40%)',
	'hsl(270, 60%, 40%)',
	'hsl(306, 60%, 40%)',
	'hsl(342, 60%, 40%)',
] as const;

/** Exact light/pastel tones from the reference rainbow snippet. */
const RAINBOW_PASTEL = [
	'hsl(0, 100%, 84%)',
	'hsl(33, 100%, 82%)',
	'hsl(62, 100%, 86%)',
	'hsl(110, 100%, 87%)',
	'hsl(193, 100%, 79%)',
	'hsl(217, 100%, 81%)',
	'hsl(249, 100%, 85%)',
	'hsl(270, 100%, 87%)',
	'hsl(300, 100%, 89%)',
	'hsl(324, 100%, 83%)',
] as const;

const DEFAULT_CUSTOM_COLOR = '#7c3aed';
const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export type GlyphColorScope = 'folders' | 'files' | 'both';
export type ExplorerGlyphNodeKind = 'folder' | 'file';

export interface ExplorerGlyphColorInput {
	choice: GlyphColorChoice;
	customColor: string;
	scope: GlyphColorScope;
	kind: ExplorerGlyphNodeKind;
	position: number;
	inheritedRainbowColor?: string | null;
}

export interface ExplorerGlyphDecoration {
	iconColor: string | undefined;
	labelColor: string | undefined;
}

export function isValidGlyphColor(value: unknown): value is string {
	return typeof value === 'string' && HEX_RE.test(value.trim());
}

export function normalizeGlyphCustomColor(value: unknown): string {
	return isValidGlyphColor(value) ? value.trim() : DEFAULT_CUSTOM_COLOR;
}

/**
 * Migrate a persisted glyph-color value onto the new union. A retired color
 * name resolves to `custom` and its documented hex is returned so the caller
 * can persist it; unknown/corrupt values fall back to `default`.
 */
export function normalizeGlyphColorChoice(value: unknown): {
	choice: GlyphColorChoice;
	migratedCustom?: string;
} {
	if (GLYPH_COLOR_CHOICES.includes(value as GlyphColorChoice)) {
		return { choice: value as GlyphColorChoice };
	}
	if (typeof value === 'string' && value in LEGACY_COLOR_HEX) {
		return { choice: 'custom', migratedCustom: LEGACY_COLOR_HEX[value] };
	}
	return { choice: 'default' };
}

function paletteColor(
	palette: readonly string[],
	index: number,
): string {
	const slot = ((index % palette.length) + palette.length) % palette.length;
	return palette[slot] ?? palette[0] ?? '';
}

export function rainbowGlyphColor(index: number, _total: number): string {
	return paletteColor(RAINBOW_STRONG, index);
}

export function pastelRainbowGlyphColor(index: number, _total: number): string {
	return paletteColor(RAINBOW_PASTEL, index);
}

export function explorerRainbowGlyphColor(position: number): string {
	const count = RAINBOW_STRONG.length;
	const slot = (((position + count - 1) % count) + count) % count;
	return paletteColor(RAINBOW_STRONG, slot);
}

export function explorerPastelRainbowGlyphColor(position: number): string {
	const count = RAINBOW_PASTEL.length;
	const slot = (((position + count - 1) % count) + count) % count;
	return paletteColor(RAINBOW_PASTEL, slot);
}

export function resolveExplorerGlyphColor({
	choice,
	customColor,
	scope,
	kind,
	position,
	inheritedRainbowColor,
}: ExplorerGlyphColorInput): string | null {
	const inScope =
		scope === 'both' ||
		(scope === 'folders' && kind === 'folder') ||
		(scope === 'files' && kind === 'file');
	if (!inScope || choice === 'default') return null;
	if (choice === 'rainbow') {
		return inheritedRainbowColor ?? explorerRainbowGlyphColor(position);
	}
	if (choice === 'rainbow-pastel') {
		return inheritedRainbowColor ?? explorerPastelRainbowGlyphColor(position);
	}
	return resolveGlyphColorCss(choice, customColor) || null;
}

export function resolveExplorerGlyphDecoration(
	glyphColor: string | null,
	explicitIconColor: string | null | undefined,
): ExplorerGlyphDecoration {
	return {
		iconColor: explicitIconColor ?? glyphColor ?? undefined,
		labelColor: glyphColor ?? undefined,
	};
}

/**
 * The CSS color for a non-rainbow choice, or '' for `default` (no override).
 * Rainbow is index-based, so callers use rainbowGlyphColor per glyph instead.
 */
export function resolveGlyphColorCss(
	choice: GlyphColorChoice,
	customColor: string,
): string {
	switch (choice) {
		case 'faint':
			return 'var(--text-faint)';
		case 'accent':
			return 'var(--interactive-accent)';
		case 'custom':
			return normalizeGlyphCustomColor(customColor);
		case 'rainbow':
		case 'rainbow-pastel':
		case 'default':
		default:
			return '';
	}
}
export function normalizeGlyphColorScope(value: unknown): GlyphColorScope {
	return value === 'files' || value === 'both' ? value : 'folders';
}
