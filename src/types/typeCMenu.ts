// src/types/context-menu.ts
import type { TreeNode } from './typeTree';
import type { TFile } from 'obsidian';

export type GroupMenuOwner = 'preset' | 'custom' | 'note';

export interface MenuCtx {
	nodeType:
		| 'file'
		| 'tag'
		| 'prop'
		| 'value'
		| 'folder'
		| 'snippet'
		| 'plugin'
		| 'content'
		| 'group';
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
	/**
	 * Spec 08 §3.3: present only while the panel is in select mode with one
	 * or more nodes selected. Creates a custom group holding the selection.
	 */
	createGroupWithSelected?: () => void;
	/**
	 * U130 Slice B (spec-03 §24-40): group-header menu metadata. Only set
	 * when `nodeType` is `'group'`. `groupOwner` decides availability:
	 * preset/note headers are owned by the engine, custom ones by the scene.
	 */
	groupId?: string;
	groupOwner?: GroupMenuOwner;
	groupHidden?: boolean;
	groupExpanded?: boolean;
	/** Scene-owned affordances the explorer cannot resolve itself. */
	toggleGroupExpand?: (groupId: string) => void;
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
	/**
	 * U130 Slice B (spec-03 §24-40): unavailable means disabled with a
	 * reason, never hidden. Return `null` when available.
	 */
	disabledReason?: (ctx: MenuCtx) => string | null;
	run: (ctx: MenuCtx) => Promise<void> | void;
}

export interface MenuHideRule {
	surface: 'file-menu' | 'editor-menu' | 'more-options';
	titleMatch: string;   // case-insensitive substring match
	enabled: boolean;
}
