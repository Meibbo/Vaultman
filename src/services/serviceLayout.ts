import type { TabId } from '../registry/tabRegistry';

export type LayoutSurfaceContent = 'frame-pages' | 'filter-tabs' | 'tool-tabs' | 'none';
export type LayoutLabelPosition = 'bottom' | 'side';
export type LayoutDockPresentationMode = 'bar' | 'drawer';
export type LayoutDockDrawerDirection = 'up' | 'down' | 'left' | 'right';
export type LayoutTabSurface = 'dock' | 'top-tabs' | 'workspace';
export type LayoutDropOperation = 'detach-tab' | 'attach-tab' | 'move-tab-surface' | 'reorder';
export type LayoutDropRejectReason = 'unsupported-source' | 'unsupported-target' | 'no-op';

export interface LayoutLabelSettings {
	visible: boolean;
	position: LayoutLabelPosition;
}

export interface LayoutSurfaceSettings {
	content: LayoutSurfaceContent;
	labels: LayoutLabelSettings;
	presentation: LayoutDockPresentationSettings;
}

export interface LayoutDockPresentationSettings {
	mode: LayoutDockPresentationMode;
	drawerDirection: LayoutDockDrawerDirection;
}

export interface LayoutSettings {
	dock: LayoutSurfaceSettings;
	tabs: LayoutSurfaceSettings;
}

export type LayoutDropSource =
	| {
			kind: 'vaultman-tab';
			tabId: TabId;
			surface: LayoutTabSurface;
	  }
	| {
			kind: 'workspace-tab';
			viewType: string;
			surface: 'workspace';
	  };

export type LayoutDropTarget =
	| {
			kind: 'dock' | 'top-tabs' | 'workspace';
	  }
	| {
			kind: 'unsupported';
	  };

export type LayoutDropAction =
	| {
			ok: true;
			operation: LayoutDropOperation;
			tabId: TabId;
			from: LayoutTabSurface;
			to: LayoutTabSurface;
	  }
	| {
			ok: false;
			reason: LayoutDropRejectReason;
	  };

const VALID_CONTENT: ReadonlySet<LayoutSurfaceContent> = new Set([
	'frame-pages',
	'filter-tabs',
	'tool-tabs',
	'none',
]);
const VALID_LABEL_POSITIONS: ReadonlySet<LayoutLabelPosition> = new Set(['bottom', 'side']);
const VALID_PRESENTATION_MODES: ReadonlySet<LayoutDockPresentationMode> = new Set([
	'bar',
	'drawer',
]);
const VALID_DRAWER_DIRECTIONS: ReadonlySet<LayoutDockDrawerDirection> = new Set([
	'up',
	'down',
	'left',
	'right',
]);

export const DEFAULT_LAYOUT_SETTINGS: LayoutSettings = {
	dock: {
		content: 'filter-tabs',
		labels: { visible: false, position: 'bottom' },
		presentation: { mode: 'bar', drawerDirection: 'up' },
	},
	tabs: {
		content: 'frame-pages',
		labels: { visible: false, position: 'side' },
		presentation: { mode: 'bar', drawerDirection: 'up' },
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

function normalizePresentation(
	raw: unknown,
	fallback: LayoutDockPresentationSettings,
): LayoutDockPresentationSettings {
	if (!isRecord(raw)) return { ...fallback };
	return {
		mode:
			typeof raw.mode === 'string' && VALID_PRESENTATION_MODES.has(raw.mode as LayoutDockPresentationMode)
				? (raw.mode as LayoutDockPresentationMode)
				: fallback.mode,
		drawerDirection:
			typeof raw.drawerDirection === 'string' &&
			VALID_DRAWER_DIRECTIONS.has(raw.drawerDirection as LayoutDockDrawerDirection)
				? (raw.drawerDirection as LayoutDockDrawerDirection)
				: fallback.drawerDirection,
	};
}

function normalizeSurface(raw: unknown, fallback: LayoutSurfaceSettings): LayoutSurfaceSettings {
	if (!isRecord(raw)) {
		return {
			content: fallback.content,
			labels: { ...fallback.labels },
			presentation: { ...fallback.presentation },
		};
	}

	return {
		content: normalizeContent(raw.content, fallback.content),
		labels: normalizeLabels(raw.labels, fallback.labels),
		presentation: normalizePresentation(raw.presentation, fallback.presentation),
	};
}

export function resolveLayoutSettings(raw: unknown): LayoutSettings {
	const source = isRecord(raw) ? raw : {};

	return {
		dock: normalizeSurface(source.dock, DEFAULT_LAYOUT_SETTINGS.dock),
		tabs: normalizeSurface(source.tabs, DEFAULT_LAYOUT_SETTINGS.tabs),
	};
}

export function resolveLayoutDropAction(input: {
	source: LayoutDropSource;
	target: LayoutDropTarget;
}): LayoutDropAction {
	const { source, target } = input;
	if (source.kind !== 'vaultman-tab') return { ok: false, reason: 'unsupported-source' };
	if (target.kind === 'unsupported') return { ok: false, reason: 'unsupported-target' };

	const to = surfaceFromTarget(target.kind);
	if (!to) return { ok: false, reason: 'unsupported-target' };

	if (source.surface === to) {
		return {
			ok: true,
			operation: 'reorder',
			tabId: source.tabId,
			from: source.surface,
			to,
		};
	}

	if (to === 'workspace') {
		return {
			ok: true,
			operation: 'detach-tab',
			tabId: source.tabId,
			from: source.surface,
			to,
		};
	}

	if (source.surface === 'workspace') {
		return {
			ok: true,
			operation: 'attach-tab',
			tabId: source.tabId,
			from: source.surface,
			to,
		};
	}

	return {
		ok: true,
		operation: 'move-tab-surface',
		tabId: source.tabId,
		from: source.surface,
		to,
	};
}

function surfaceFromTarget(kind: LayoutDropTarget['kind']): LayoutTabSurface | null {
	switch (kind) {
		case 'dock':
			return 'dock';
		case 'top-tabs':
			return 'top-tabs';
		case 'workspace':
			return 'workspace';
		default:
			return null;
	}
}
