// src/types/context-menu.ts
import type { TreeNode } from './typeTree';
import type { TFile } from 'obsidian';

export interface MenuCtx {
	nodeType:
		| 'file'
		| 'tag'
		| 'prop'
		| 'value'
		| 'folder'
		| 'snippet'
		| 'plugin'
		| 'content';
	node: TreeNode<unknown>;
	/**
	 * U121-062: the ids selected in the panel that opened this menu. An action
	 * invoked on a node inside it acts on the whole selection; outside it, on
	 * that node alone. Absent means the surface has no selection to speak of.
	 */
	selectedIds?: ReadonlySet<string>;
	/** Visible order of the panel's rows, so a batch reads like the tree does. */
	orderedIds?: readonly string[];
	surface: 'panel' | 'file-menu' | 'editor-menu' | 'more-options';
	/** Originating pointer event (panel menus); lets actions position follow-up UI. */
	event?: MouseEvent;
	file?: TFile;
	hasViewFilters?: () => boolean;
	clearViewFilters?: () => void;
	invokeRename?: (id: string) => void;
}

export interface ActionDef {
	id: string;
	nodeTypes: MenuCtx['nodeType'][];
	surfaces: MenuCtx['surface'][];
	label: string | ((ctx: MenuCtx) => string);
	icon?: string;
	checked?: boolean | ((ctx: MenuCtx) => boolean);
	submenu?: string;
	submenuIcon?: string;
	section?: string;
	separatorBefore?: boolean;
	when?: (ctx: MenuCtx) => boolean;
	run: (ctx: MenuCtx) => Promise<void> | void;
}

export interface MenuHideRule {
	surface: 'file-menu' | 'editor-menu' | 'more-options';
	titleMatch: string;   // case-insensitive substring match
	enabled: boolean;
}
