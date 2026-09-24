// src/types/context-menu.ts
import type { TreeNode } from './typeTree';
import type { TFile } from 'obsidian';

export type GroupMenuOwner = 'preset' | 'custom' | 'note';

/** Scene-owned mutations exposed by group-header context menus. */
export type GroupHideHandler = (groupId: string, hidden: boolean) => void;
export type GroupDeleteHandler = (groupId: string) => void;

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
	 * U130 transacción: presente cuando hay selección válida y alguien
	 * escucha. Crea un custom group con el snapshot y devuelve el resultado.
	 * El menú/invoker espera el resultado (async); solo `committed` limpia.
	 */
	createGroupWithSelected?: () => Promise<import('../logic/logicGroupSelectionTransaction').GroupMutationResult> | import('../logic/logicGroupSelectionTransaction').GroupMutationResult | void;
	/**
	 * U130 Degroup selected: presente en ocurrencias miembro de custom/note.
	 * Elimina solo la intersección con el owner invocado. Preset sin handler.
	 */
	degroupSelected?: () => Promise<import('../logic/logicGroupSelectionTransaction').GroupMutationResult> | import('../logic/logicGroupSelectionTransaction').GroupMutationResult | void;
	/**
	 * U130 spec-02 §5: owner de la ocurrencia miembro invocada. Viaja en el
	 * ctx desde la metadata (`membershipOwner`), nunca por `split('@')`.
	 */
	membershipOwner?: string;
	/** Entidad de la ocurrencia invocada (para Degroup sin parseo). */
	occurrenceEntityId?: string;
	/**
	 * U130 Slice B (spec-03 §24-40): group-header menu metadata. Only set
	 * when `nodeType` is `'group'`. `groupOwner` decides availability:
	 * preset/note headers are owned by the engine, custom ones by the scene.
	 */
	groupId?: string;
	groupOwner?: GroupMenuOwner;
	groupHidden?: boolean;
	groupExpanded?: boolean;
	/** Materializes the visible preset snapshot atomically. */
	materializePreset?: () => Promise<import('../logic/logicGroupSelectionTransaction').GroupMutationResult> | import('../logic/logicGroupSelectionTransaction').GroupMutationResult | void;
	/** Scene-owned visibility mutation for preset and custom headers. */
	hideGroup?: GroupHideHandler;
	/** Scene-owned deletion mutation for custom headers only. */
	deleteGroup?: GroupDeleteHandler;
	/** Scene-owned affordances the explorer cannot resolve itself. */
	toggleGroupExpand?: (groupId: string) => void;
	/** Scene-projected group icon mutation. */
	changeGroupIcon?: () => Promise<unknown> | unknown;
	/** Opens the bounded min/max editor for a counter/date preset header. */
	adjustGroupRange?: () => boolean | void;
	/** Adds or triggers a counter slice for a counter/date preset header. */
	sliceGroupRange?: () => boolean | void;
	/** Scene-owned rename mutation for custom/note group headers. */
	renameGroup?: (groupId: string) => Promise<void> | void;
	/** Note group: opens the backing note file. */
	openNodeNote?: () => Promise<void> | void;
	/** Scope update for group header. */
	updateGroupScope?: () => Promise<void> | void;
	/** Creates a copy of the group with enumerated name/ID and snapshot of members. */
	makeACopy?: () => Promise<import('../logic/logicGroupSelectionTransaction').GroupMutationResult> | import('../logic/logicGroupSelectionTransaction').GroupMutationResult | void;
	/** FilesScene only: preview and commit one physical folder conversion. */
	convertGroupToFolder?: () => Promise<void> | void;
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
	run: (ctx: MenuCtx) => Promise<unknown> | void;
}

export interface MenuHideRule {
	surface: 'file-menu' | 'editor-menu' | 'more-options';
	titleMatch: string;   // case-insensitive substring match
	enabled: boolean;
}
