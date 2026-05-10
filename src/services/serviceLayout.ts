export type LayoutSurfaceContent = 'frame-pages' | 'filter-tabs' | 'tool-tabs' | 'none';
export type LayoutLabelPosition = 'bottom' | 'side';

export interface LayoutLabelSettings {
	visible: boolean;
	position: LayoutLabelPosition;
}

export interface LayoutSurfaceSettings {
	content: LayoutSurfaceContent;
	labels: LayoutLabelSettings;
}

export interface LayoutSettings {
	dock: LayoutSurfaceSettings;
	tabs: LayoutSurfaceSettings;
}

const VALID_CONTENT: ReadonlySet<LayoutSurfaceContent> = new Set([
	'frame-pages',
	'filter-tabs',
	'tool-tabs',
	'none',
]);
const VALID_LABEL_POSITIONS: ReadonlySet<LayoutLabelPosition> = new Set(['bottom', 'side']);

export const DEFAULT_LAYOUT_SETTINGS: LayoutSettings = {
	dock: {
		content: 'filter-tabs',
		labels: { visible: false, position: 'bottom' },
	},
	tabs: {
		content: 'frame-pages',
		labels: { visible: false, position: 'side' },
	},
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function normalizeContent(value: unknown, fallback: LayoutSurfaceContent): LayoutSurfaceContent {
	return typeof value === 'string' && VALID_CONTENT.has(value as LayoutSurfaceContent)
		? (value as LayoutSurfaceContent)
		: fallback;
}

function normalizeLabelPosition(value: unknown, fallback: LayoutLabelPosition): LayoutLabelPosition {
	return typeof value === 'string' && VALID_LABEL_POSITIONS.has(value as LayoutLabelPosition)
		? (value as LayoutLabelPosition)
		: fallback;
}

function normalizeLabels(raw: unknown, fallback: LayoutLabelSettings): LayoutLabelSettings {
	if (!isRecord(raw)) return { ...fallback };

	return {
		visible: typeof raw.visible === 'boolean' ? raw.visible : fallback.visible,
		position: normalizeLabelPosition(raw.position, fallback.position),
	};
}

function normalizeSurface(raw: unknown, fallback: LayoutSurfaceSettings): LayoutSurfaceSettings {
	if (!isRecord(raw)) {
		return {
			content: fallback.content,
			labels: { ...fallback.labels },
		};
	}

	return {
		content: normalizeContent(raw.content, fallback.content),
		labels: normalizeLabels(raw.labels, fallback.labels),
	};
}

export function resolveLayoutSettings(raw: unknown): LayoutSettings {
	const source = isRecord(raw) ? raw : {};

	return {
		dock: normalizeSurface(source.dock, DEFAULT_LAYOUT_SETTINGS.dock),
		tabs: normalizeSurface(source.tabs, DEFAULT_LAYOUT_SETTINGS.tabs),
	};
}
