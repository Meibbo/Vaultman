export type ThemePresetId = string;
export type ThemePresetSource = 'built-in' | 'custom';
export type ExplorerViewMode = 'tree' | 'table' | 'grid' | 'cards' | 'list';

export interface ChromeTokens {
	popupBgOpacity: number;
	popupBackdropBlur: string;
	popupBgTint: number;
}

export interface DensityTokens {
	rowHeight: string;
	rowPaddingY: string;
	iconSize: string;
}

export interface NodeElementVisibility {
	icon: boolean;
	label: boolean;
	detail: boolean;
	media: boolean;
	badges: {
		ops: boolean;
		filters: boolean;
		warnings: boolean;
		inherited: boolean;
		counts: boolean;
	};
	actions: boolean;
}

export type DockPresentation = 'bar' | 'drawer' | 'pill-fab' | 'accordion' | 'hidden';
export type TabsPresentation = 'top-tabs' | 'drawer' | 'overlay' | 'island' | 'hidden';
export type TabsKind = 'workspace' | 'modal' | 'status-bar-island' | 'embedded';
export type ToolbarButtonSet = 'core' | 'full' | readonly string[];

export interface DockSettings {
	visible: boolean;
	presentation: DockPresentation;
}

export interface TabsSettings {
	visible: boolean;
	presentation: TabsPresentation;
	kind: TabsKind;
}

export interface ToolbarSettings {
	buttons: ToolbarButtonSet;
}

export interface ColorKnobMap {
	zebraRows?: boolean;
	rainbowNodes?: 'off' | 'manual' | 'auto-hsv';
	accentOverride?: string;
	custom?: Record<string, string>;
}

export interface LayoutPlacementMap {
	mode?: 'fixed' | 'squared-grid' | 'free-drag';
	placements?: Record<
		string,
		{
			region: string;
			width?: number;
			height?: number;
			order?: number;
		}
	>;
}

export interface ThemePreset {
	source: ThemePresetSource;
	id: ThemePresetId;
	displayName: string;
	extends?: ThemePresetId;

	useNativeDom: boolean;
	chrome: ChromeTokens;
	density: DensityTokens;

	dock: DockSettings;
	tabs: TabsSettings;
	toolbar: ToolbarSettings;
	viewModes: readonly ExplorerViewMode[];
	nodeElements: NodeElementVisibility;
	lockNodeElementVisibility: boolean;

	unload?: readonly string[];
	colors?: ColorKnobMap;
	layout?: LayoutPlacementMap;
	workspaceId?: string;
}

export function isBuiltInPreset(preset: ThemePreset): boolean {
	return preset.source === 'built-in';
}

const BUILT_IN_IDS: ReadonlySet<ThemePresetId> = new Set(['native', 'vaultman']);
const CSS_LENGTH_RE = /^-?\d+(\.\d+)?(px|em|rem|%|vh|vw)$|^0$/;
const VALID_DOCK_PRESENTATIONS: ReadonlySet<DockPresentation> = new Set([
	'bar',
	'drawer',
	'pill-fab',
	'accordion',
	'hidden',
]);
const VALID_TABS_PRESENTATIONS: ReadonlySet<TabsPresentation> = new Set([
	'top-tabs',
	'drawer',
	'overlay',
	'island',
	'hidden',
]);
const VALID_TABS_KINDS: ReadonlySet<TabsKind> = new Set([
	'workspace',
	'modal',
	'status-bar-island',
	'embedded',
]);
const VALID_VIEW_MODES: ReadonlySet<ExplorerViewMode> = new Set([
	'tree',
	'table',
	'grid',
	'cards',
	'list',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNumber01(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

function isCssLength(value: unknown): value is string {
	return typeof value === 'string' && CSS_LENGTH_RE.test(value);
}

function normalizeChrome(raw: unknown): ChromeTokens | null {
	if (!isRecord(raw)) return null;
	if (!isNumber01(raw.popupBgOpacity)) return null;
	if (!isCssLength(raw.popupBackdropBlur)) return null;
	const popupBgTint = raw.popupBgTint === undefined ? 0 : raw.popupBgTint;
	if (!isNumber01(popupBgTint)) return null;
	return {
		popupBgOpacity: raw.popupBgOpacity,
		popupBackdropBlur: raw.popupBackdropBlur,
		popupBgTint,
	};
}

function normalizeDensity(raw: unknown): DensityTokens | null {
	if (!isRecord(raw)) return null;
	if (!isCssLength(raw.rowHeight)) return null;
	if (!isCssLength(raw.rowPaddingY)) return null;
	if (!isCssLength(raw.iconSize)) return null;
	return {
		rowHeight: raw.rowHeight,
		rowPaddingY: raw.rowPaddingY,
		iconSize: raw.iconSize,
	};
}

function normalizeDock(raw: unknown): DockSettings {
	if (!isRecord(raw)) return { visible: true, presentation: 'bar' };
	return {
		visible: raw.visible === true,
		presentation:
			typeof raw.presentation === 'string' &&
			VALID_DOCK_PRESENTATIONS.has(raw.presentation as DockPresentation)
				? (raw.presentation as DockPresentation)
				: 'bar',
	};
}

function normalizeTabs(raw: unknown): TabsSettings {
	if (!isRecord(raw)) return { visible: true, presentation: 'top-tabs', kind: 'embedded' };
	return {
		visible: raw.visible === true,
		presentation:
			typeof raw.presentation === 'string' &&
			VALID_TABS_PRESENTATIONS.has(raw.presentation as TabsPresentation)
				? (raw.presentation as TabsPresentation)
				: 'top-tabs',
		kind:
			typeof raw.kind === 'string' && VALID_TABS_KINDS.has(raw.kind as TabsKind)
				? (raw.kind as TabsKind)
				: 'embedded',
	};
}

function normalizeToolbar(raw: unknown): ToolbarSettings {
	if (!isRecord(raw)) return { buttons: 'full' };
	const buttons = raw.buttons;
	if (buttons === 'core' || buttons === 'full') return { buttons };
	if (Array.isArray(buttons)) {
		return { buttons: buttons.filter((button): button is string => typeof button === 'string') };
	}
	return { buttons: 'full' };
}

function normalizeViewModes(raw: unknown): readonly ExplorerViewMode[] {
	if (!Array.isArray(raw)) return ['tree'];
	const viewModes = raw.filter(
		(value): value is ExplorerViewMode =>
			typeof value === 'string' && VALID_VIEW_MODES.has(value as ExplorerViewMode),
	);
	return viewModes.length === 0 ? ['tree'] : viewModes;
}

function normalizeNodeElements(raw: unknown): NodeElementVisibility {
	const fallback: NodeElementVisibility = {
		icon: true,
		label: true,
		detail: true,
		media: false,
		badges: { ops: false, filters: false, warnings: false, inherited: false, counts: false },
		actions: true,
	};
	if (!isRecord(raw)) return fallback;
	const badges = isRecord(raw.badges) ? raw.badges : {};
	return {
		icon: raw.icon === true,
		label: raw.label === true,
		detail: raw.detail === true,
		media: false,
		badges: {
			ops: badges.ops === true,
			filters: badges.filters === true,
			warnings: badges.warnings === true,
			inherited: badges.inherited === true,
			counts: badges.counts === true,
		},
		actions: raw.actions === true,
	};
}

function normalizeColors(raw: unknown): ColorKnobMap | undefined {
	if (!isRecord(raw)) return undefined;
	const colors: ColorKnobMap = {};
	if (typeof raw.zebraRows === 'boolean') colors.zebraRows = raw.zebraRows;
	if (
		raw.rainbowNodes === 'off' ||
		raw.rainbowNodes === 'manual' ||
		raw.rainbowNodes === 'auto-hsv'
	) {
		colors.rainbowNodes = raw.rainbowNodes;
	}
	if (typeof raw.accentOverride === 'string') colors.accentOverride = raw.accentOverride;
	if (isRecord(raw.custom)) {
		colors.custom = {};
		for (const [key, value] of Object.entries(raw.custom)) {
			if (typeof value === 'string') colors.custom[key] = value;
		}
	}
	return Object.keys(colors).length === 0 ? undefined : colors;
}

function normalizeLayout(raw: unknown): LayoutPlacementMap | undefined {
	if (!isRecord(raw)) return undefined;
	const layout: LayoutPlacementMap = {};
	if (raw.mode === 'fixed' || raw.mode === 'squared-grid' || raw.mode === 'free-drag') {
		layout.mode = raw.mode;
	}
	if (isRecord(raw.placements)) {
		const placements: NonNullable<LayoutPlacementMap['placements']> = {};
		for (const [key, value] of Object.entries(raw.placements)) {
			if (!isRecord(value) || typeof value.region !== 'string') continue;
			placements[key] = {
				region: value.region,
				width: typeof value.width === 'number' ? value.width : undefined,
				height: typeof value.height === 'number' ? value.height : undefined,
				order: typeof value.order === 'number' ? value.order : undefined,
			};
		}
		if (Object.keys(placements).length > 0) layout.placements = placements;
	}
	return Object.keys(layout).length === 0 ? undefined : layout;
}

export function normalizeCustomPreset(raw: unknown): ThemePreset | null {
	if (!isRecord(raw)) return null;
	if (raw.source !== 'custom') return null;
	if (typeof raw.id !== 'string' || raw.id.length === 0) return null;
	if (BUILT_IN_IDS.has(raw.id)) return null;
	if (typeof raw.displayName !== 'string') return null;
	if (typeof raw.useNativeDom !== 'boolean') return null;

	const chrome = normalizeChrome(raw.chrome);
	if (!chrome) return null;
	const density = normalizeDensity(raw.density);
	if (!density) return null;

	return {
		source: 'custom',
		id: raw.id,
		displayName: raw.displayName,
		extends: typeof raw.extends === 'string' ? raw.extends : undefined,
		useNativeDom: raw.useNativeDom,
		chrome,
		density,
		dock: normalizeDock(raw.dock),
		tabs: normalizeTabs(raw.tabs),
		toolbar: normalizeToolbar(raw.toolbar),
		viewModes: normalizeViewModes(raw.viewModes),
		nodeElements: normalizeNodeElements(raw.nodeElements),
		lockNodeElementVisibility: raw.lockNodeElementVisibility === true,
		unload: Array.isArray(raw.unload)
			? raw.unload.filter((value): value is string => typeof value === 'string')
			: undefined,
		colors: normalizeColors(raw.colors),
		layout: normalizeLayout(raw.layout),
		workspaceId: typeof raw.workspaceId === 'string' ? raw.workspaceId : undefined,
	};
}
