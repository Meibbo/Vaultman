import type { SasiRegistry } from './logicSasiRegistry';
import type { SasiCommandDescriptor } from './logicSasiCommands';

export const WORKSPACE_FOCUS_LEFT_SIDEBAR_ID = 'vaultman.workspace.focusLeftSidebar';
export const WORKSPACE_FOCUS_RIGHT_SIDEBAR_ID = 'vaultman.workspace.focusRightSidebar';
export const WORKSPACE_FOCUS_MAIN_AREA_ID = 'vaultman.workspace.focusMainArea';

export type WorkspaceFocusTarget = 'leftSidebar' | 'rightSidebar' | 'mainArea';

export const WORKSPACE_FOCUS_DEFS = [
	{
		id: WORKSPACE_FOCUS_LEFT_SIDEBAR_ID,
		target: 'leftSidebar' as const,
		labelKey: 'sasi.workspace.focus_left_sidebar',
		icon: 'lucide-panel-left',
	},
	{
		id: WORKSPACE_FOCUS_RIGHT_SIDEBAR_ID,
		target: 'rightSidebar' as const,
		labelKey: 'sasi.workspace.focus_right_sidebar',
		icon: 'lucide-panel-right',
	},
	{
		id: WORKSPACE_FOCUS_MAIN_AREA_ID,
		target: 'mainArea' as const,
		labelKey: 'sasi.workspace.focus_main_area',
		icon: 'lucide-layout-grid',
	},
] as const;

export function registerWorkspaceFocusActions(registry: SasiRegistry): void {
	for (const def of WORKSPACE_FOCUS_DEFS) {
		registry.register({
			id: def.id,
			axis: 'function',
			kind: 'action',
			labelKey: def.labelKey,
			icon: def.icon,
			supports: [{ surface: 'panelWidget' }],
		});
	}
}

export interface WorkspaceSplitLike {
	children?: any[];
	currentTab?: number;
	collapsed?: boolean;
	expand?: () => void;
	view?: any;
	getViewState?: () => any;
}

/**
 * Traverses an Obsidian workspace split or parent container recursively
 * looking for the active tab (WorkspaceTabs children[currentTab]) or the first
 * leaf found.
 */
export function findActiveLeafInSplit<T = any>(
	split: WorkspaceSplitLike | null | undefined,
): T | null {
	if (!split) return null;
	if (typeof split.getViewState === 'function' || split.view) {
		return split as unknown as T;
	}
	if (Array.isArray(split.children) && split.children.length > 0) {
		if (
			typeof split.currentTab === 'number' &&
			split.currentTab >= 0 &&
			split.currentTab < split.children.length
		) {
			const candidate = findActiveLeafInSplit<T>(
				split.children[split.currentTab],
			);
			if (candidate) return candidate;
		}
		for (const child of split.children) {
			const candidate = findActiveLeafInSplit<T>(child);
			if (candidate) return candidate;
		}
	}
	return null;
}

export interface WorkspaceFocusCommandRunner {
	runFocusWorkspaceSurface(target: WorkspaceFocusTarget): boolean;
}

export function createWorkspaceFocusCommandDescriptors(
	t: (key: string) => string,
	runner: WorkspaceFocusCommandRunner,
): SasiCommandDescriptor[] {
	return WORKSPACE_FOCUS_DEFS.map((def) => ({
		id: def.id,
		name: t(def.labelKey),
		handler: () => runner.runFocusWorkspaceSurface(def.target),
	}));
}
