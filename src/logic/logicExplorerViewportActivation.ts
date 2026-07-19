export type ExplorerViewportTab =
	| 'files'
	| 'props'
	| 'tags'
	| 'content'
	| 'snippets'
	| 'plugins';

export interface ExplorerViewportPanel {
	refreshViewport(): void;
}

export interface ExplorerViewportPanels {
	files?: ExplorerViewportPanel | null;
	props?: ExplorerViewportPanel | null;
	tags?: ExplorerViewportPanel | null;
	snippets?: ExplorerViewportPanel | null;
	plugins?: ExplorerViewportPanel | null;
}

export function refreshExplorerViewport(
	tab: ExplorerViewportTab,
	panels: ExplorerViewportPanels,
): boolean {
	if (tab === 'content') return false;

	const panel = panels[tab];
	if (!panel) return false;

	panel.refreshViewport();
	return true;
}

export function isSameWorkspaceLeaf<T>(
	activeLeaf: T | null,
	ownLeaf: T,
): boolean {
	return activeLeaf === ownLeaf;
}
