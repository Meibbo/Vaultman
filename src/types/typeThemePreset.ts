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
