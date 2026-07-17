// src/types/tree.ts
import type { TFile, TFolder } from 'obsidian';
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

export interface TreeNode<TMeta = unknown> {
	id: string;
	label: string;
	icon?: string;
	iconColor?: string;
	showCaret?: boolean;
	typeText?: string;
	mtimeText?: string;
	ctimeText?: string;
	wordCountText?: string;
	count?: number;
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
}

export interface PropMeta {
	propName: string;
	propType: string;
	isValueNode: boolean;
	rawValue?: string;
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
