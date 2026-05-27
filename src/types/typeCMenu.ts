// src/types/context-menu.ts
import type { TreeNode } from './typeTree';
import type { TFile } from 'obsidian';

export interface MenuCtx {
	nodeType: 'file' | 'tag' | 'prop' | 'value' | 'folder';
	node: TreeNode<unknown>;
	surface: 'panel' | 'file-menu' | 'editor-menu' | 'more-options';
	file?: TFile;
}

export interface ActionDef {
	id: string;
	nodeTypes: MenuCtx['nodeType'][];
	surfaces: MenuCtx['surface'][];
	label: string | ((ctx: MenuCtx) => string);
	icon?: string;
	submenu?: string;
	section?: string;
	when?: (ctx: MenuCtx) => boolean;
	run: (ctx: MenuCtx) => Promise<void> | void;
}

export interface MenuHideRule {
	surface: 'file-menu' | 'editor-menu' | 'more-options';
	titleMatch: string;   // case-insensitive substring match
	enabled: boolean;
}
