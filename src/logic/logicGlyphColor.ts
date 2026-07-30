/**
 * BT5-025: one shared glyph-color palette for the Floating Index and the
 * Explorer. The selector exposes only these five choices; the individual
 * Obsidian color vars are gone from the UI and fold into `custom`.
 */
export type GlyphColorChoice =
	| 'default'
	| 'faint'
	| 'accent'
	| 'custom'
	| 'rainbow';

export const GLYPH_COLOR_CHOICES: readonly GlyphColorChoice[] = [
	'default',
	'faint',
	'accent',
	'custom',
	'rainbow',
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

/**
 * Pastel rainbow tones from the reference folders-rainbow snippet, so rainbow
 * does not depend on the snippet being installed. Prefers the snippet's CSS
 * vars with a built-in hex fallback.
 */
const RAINBOW_PASTEL_FALLBACK = [
	'#f7a4a4',
	'#f7c8a4',
	'#f7e6a4',
	'#b8e6b8',
	'#a4dede',
	'#a4c4f7',
	'#c4a4f7',
	'#f7a4e6',
];

const EXPLORER_RAINBOW_FALLBACK = [
	'#ef4444',
	'#f97316',
	'#eab308',
	'#22c55e',
	'#14b8a6',
	'#06b6d4',
	'#3b82f6',
	'#8b5cf6',
	'#d946ef',
	'#ec4899',
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

export function rainbowGlyphColor(index: number, total: number): string {
	const count = RAINBOW_PASTEL_FALLBACK.length;
	const slot = ((index % count) + count) % count;
	const varIndex = (((index % total) + total) % total) % count;
	return `var(--color-rainbow-${varIndex + 1}, ${RAINBOW_PASTEL_FALLBACK[slot]})`;
}

export function explorerRainbowGlyphColor(position: number): string {
	const count = EXPLORER_RAINBOW_FALLBACK.length;
	const slot = (((position + count - 1) % count) + count) % count;
	return `var(--color-rainbow-${slot + 1}, ${EXPLORER_RAINBOW_FALLBACK[slot]})`;
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
		case 'default':
		default:
			return '';
	}
}
export function normalizeGlyphColorScope(value: unknown): GlyphColorScope {
	return value === 'files' || value === 'both' ? value : 'folders';
}
