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
	surface: 'panel' | 'file-menu' | 'editor-menu' | 'more-options';
	/** Originating pointer event (panel menus); lets actions position follow-up UI. */
	event?: MouseEvent;
	file?: TFile;
	hasViewFilters?: () => boolean;
	clearViewFilters?: () => void;
}

export interface ActionDef {
	id: string;
	nodeTypes: MenuCtx['nodeType'][];
	surfaces: MenuCtx['surface'][];
	label: string | ((ctx: MenuCtx) => string);
	icon?: string;
	checked?: boolean | ((ctx: MenuCtx) => boolean);
	submenu?: string;
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
