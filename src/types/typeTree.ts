// src/types/tree.ts
import type { TFile, TFolder } from 'obsidian';
import type { TagSource } from '../logic/logicTagSource';
import type { AddonCellStyle } from './typeSettings';

export interface NodeBadge {
	text?: string;
	icon?: string;
	color?:
		| 'accent'
		| 'warning'
		| 'error'
		| 'success'
		| 'info'
		| 'faint'
		| 'red'
		| 'blue'
		| 'purple'
		| 'orange'
		| 'green';
	solid?: boolean;
	isInherited?: boolean;
	/**
	 * U121-071: `text` doubles as the tooltip when this is absent, which is why
	 * Files used to stuff a whole sentence into the pill. Set both to show a
	 * short label and keep the operation's own wording on hover.
	 */
	tooltip?: string;
	/**
	 * U121-073: present when the badge releases THIS node from an ancestor's
	 * queued deletion instead of cancelling the operation outright.
	 */
	releasePath?: string;
	/** Queue index for undo on double-click. Undefined = inherited/unremovable badge. */
	queueIndex?: number;
}

export type TreeNodeCell =
	| {
		id: string;
		kind: 'toggle';
		enabled: boolean;
		style: AddonCellStyle;
		label: string;
		disabled?: boolean;
		/**
		 * Spec 07 §2: la cabecera de un `node_group` pinta el agregado de sus
		 * miembros. Mixto (algunos si, algunos no) se PINTA como mixto, pero
		 * la accion no es ambigua: 1ª pulsacion apaga todo, 2ª enciende todo.
		 */
		mixed?: boolean;
	  }
	| {
			id: string;
			kind: 'action';
			icon: string;
			label: string;
			disabled?: boolean;
			appearance?: 'button' | 'badge';
		}
	| {
			id: string;
			kind: 'cell_hover';
			actions: Array<{
				id: string;
				icon: string;
				label: string;
			}>;
			disabled?: boolean;
		};

/** BT5-017: activity projected from descendants hidden by a collapsed node. */
export interface NodeBubbleDot {
	color: NonNullable<NodeBadge['color']>;
	sourceCount: number;
}

export interface TreeNode<TMeta = unknown> {
	id: string;
	label: string;
	icon?: string;
	iconColor?: string;
	labelColor?: string;
	showCaret?: boolean;
	/** Present only while the node is collapsed and hides active descendants. */
	bubbleDot?: NodeBubbleDot;
	typeText?: string;
	mtimeText?: string;
	ctimeText?: string;
	/** BT5-013: formatted last-opened instant; absent when never opened. */
	openedText?: string;
	wordCountText?: string;
	tagsText?: string;
	fileCountText?: string;
	subCountText?: string;
	tasksText?: string;
	/** BT4-014: rainbow bucket color value for folder rows. */
	folderColor?: string;
	count?: number;
	/**
	 * U121-003: set only by the flat projections. Flattening rewrites `label` to
	 * carry the ancestry (`lugar: cocina`, `parent/child`), which made every
	 * label comparison an ancestry comparison — a Name sort that silently
	 * grouped by parent. These keep both halves addressable so Name and Parent
	 * can be separate sorts, and give the Parent tooltip its text.
	 */
	flatOwnLabel?: string;
	flatParentLabel?: string;
	badges?: NodeBadge[];
	cells?: TreeNodeCell[];
	children?: TreeNode<TMeta>[];
	depth: number;
	meta: TMeta;
	cls?: string;
	coreCls?: string;
}

export interface TagMeta {
	tagPath: string;
	hasNodeNote?: boolean;
	/**
	 * Where the tag is written — frontmatter, the body, or both. Set by the
	 * reveal projection, which knows the one note it is showing; the vault-wide
	 * tree leaves it out and the explorer resolves it from its source index,
	 * because the answer there is an aggregate over every note.
	 */
	tagSources?: ReadonlySet<TagSource>;
}

export interface PropMeta {
	propName: string;
	hasNodeNote?: boolean;
	propType: string;
	isValueNode: boolean;
	rawValue?: string;
	/** Prefix projected only by the non-nested property scene. */
	flatLabelPrefix?: string;
	isTypeIncompatible?: boolean;
	/**
	 * Synthetic "+ Add property" row injected inside the reveal list (never a
	 * real property: excluded from filters, menus, drag and counts).
	 */
	isAddPropertyRow?: boolean;
}

export interface FileMeta {
	file: TFile | null; // null = folder node
	folder?: TFolder | null;
	isFolder: boolean;
	folderPath: string;
	hasNodeNote?: boolean;
	/**
	 * Spec 08 §2, "Compact folders": set only on a folder row that merged a
	 * run of single-child folders (VS Code's compact folders). Each entry is
	 * one merged folder's own name, in order; `node.label` is already their
	 * `join('/')`. `folderPath`/`folder` point at the DEEPEST folder in the
	 * chain -- rename, context menu, drag-drop and click all act on it.
	 * Per-segment interaction (VS Code lets you target any single segment) is
	 * not implemented.
	 */
	compactedSegments?: string[];
}

export interface SnippetMeta {
	name: string;
	hasNodeNote?: boolean;
	enabled: boolean;
	installedTime?: number;
	updatedTime?: number;
}

export interface PluginMeta {
	pluginId: string;
	hasNodeNote?: boolean;
	name: string;
	enabled: boolean;
	loaded: boolean;
	version?: string;
	author?: string;
	description?: string;
	isDesktopOnly?: boolean;
	isVaultman: boolean;
	installedTime?: number;
	updatedTime?: number;
}
