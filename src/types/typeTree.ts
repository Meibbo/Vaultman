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
	  }
	| {
			id: string;
			kind: 'action';
			icon: string;
			label: string;
			disabled?: boolean;
			appearance?: 'button' | 'badge';
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
	propType: string;
	isValueNode: boolean;
	rawValue?: string;
	/** Prefix projected only by the non-nested property scene. */
	flatLabelPrefix?: string;
	isTypeIncompatible?: boolean;
}

export interface FileMeta {
	file: TFile | null; // null = folder node
	folder?: TFolder | null;
	isFolder: boolean;
	folderPath: string;
}

export interface SnippetMeta {
	name: string;
	enabled: boolean;
	installedTime?: number;
	updatedTime?: number;
}

export interface PluginMeta {
	pluginId: string;
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
