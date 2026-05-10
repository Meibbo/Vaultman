import type { TFile } from 'obsidian';
import type { TreeNode } from './typeNode';
import type { MenuCtx } from './typeCtxMenu';
import type { ExplorerViewMode, ViewEmptyState } from './typeViews';
export type { ExplorerViewMode } from './typeViews';

export type ExplorerExpansionAction = 'expand-all' | 'collapse-all';
export type ExplorerSortTarget = 'top' | 'children';

export interface ExplorerExpansionCommand {
	serial: number;
	action: ExplorerExpansionAction;
}

export interface ExplorerExpansionSummary {
	canToggle: boolean;
	hasExpandedParents: boolean;
}

/**
 * Imperative API exposed by `panelExplorer.svelte` for commands and other
 * outside agents that need to bypass the normal reactive flow. Kept
 * narrow: only verbs the `vaultman:open*` commands need.
 */
export interface PanelExplorerImperativeApi {
	focusFirstNode(): boolean;
}

export interface ExplorerProvider<TMeta = unknown> {
	id: string;
	empty?: ViewEmptyState;
	getTree(): TreeNode<TMeta>[];
	getFiles?(): TFile[];
	getEmptyState?(context: {
		mode: ExplorerViewMode;
		searchTerm: string;
	}): ViewEmptyState | undefined;
	handleNodeClick(node: TreeNode<TMeta>): void;
	handleNodeSelection?(nodes: TreeNode<TMeta>[]): void;
	handleNodeSecondaryAction?(node: TreeNode<TMeta>, selectedNodes?: TreeNode<TMeta>[]): void;
	handleNodeTertiaryAction?(node: TreeNode<TMeta>, selectedNodes?: TreeNode<TMeta>[]): void;
	handleContextMenu(node: TreeNode<TMeta>, e: MouseEvent, selectedNodes?: TreeNode<TMeta>[]): void;
	getNodeType?(node: TreeNode<TMeta>): MenuCtx['nodeType'];
	subscribe?(cb: () => void): () => void;
	handleBadgeDoubleClick?(queueIndex: number): void;
	/**
	 * Optional hook invoked when a hover badge is clicked. The kind is one
	 * of the canonical `BadgeKind`s. Providers that opt in can dispatch
	 * the corresponding action (queue a delete, open filter editor, etc.).
	 */
	handleHoverBadge?(node: TreeNode<TMeta>, kind: string, selectedNodes?: TreeNode<TMeta>[]): void;
	onRename?(id: string, newLabel: string): void;
	onCancelRename?(): void;
	destroy?(): void;

	// Sort and Search hooks
	setSearchTerm?(term: string, mode?: 'all' | 'leaf'): void;
	setViewMode?(mode: ExplorerViewMode): void;
	setSortBy?(sortBy: string, direction: 'asc' | 'desc'): void;
	setSortTarget?(target: ExplorerSortTarget): void;
	setAddMode?(active: boolean): void;
	setShowSelectedOnly?(active: boolean): void;
	setShowHiddenFiles?(active: boolean): void;
}
