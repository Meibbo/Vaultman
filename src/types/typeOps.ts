import { TFile } from 'obsidian';

/** Special return keys for logicFunc — signal non-standard operations */
export const DELETE_PROP = '_DELETE_PROP';
export const RENAME_FILE = '_RENAME_FILE';
export const REORDER_ALL = '_REORDER_ALL';
export const MOVE_FILE = '_MOVE_FILE';
export const FIND_REPLACE_CONTENT = '_FIND_REPLACE_CONTENT';
export const NATIVE_RENAME_PROP = '_NATIVE_RENAME_PROP';
export const NATIVE_SET_PROP_TYPE = '_NATIVE_SET_PROP_TYPE';
export const APPLY_TEMPLATE = '_APPLY_TEMPLATE';
export const DELETE_FILE = '_DELETE_FILE';

export type PropertyAction =
	| 'set'
	| 'rename'
	| 'delete'
	| 'clean_empty'
	| 'change_type'
	| 'add';

export type PropertyType =
	| 'text'
	| 'number'
	| 'checkbox'
	| 'list'
	| 'date'
	| 'datetime'
	| 'wikilink';

/** Common fields for all queued operations */
export interface BaseChange {
	files: TFile[];
	action: string;
	details: string;
	logicFunc: (
		file: TFile,
		metadata: Record<string, unknown>
	) => Record<string, unknown> | null;
	customLogic?: boolean;
}

/** Operation on frontmatter properties */
export interface PropertyChange extends BaseChange {
	type: 'property';
	property: string;
	value?: string;
	oldValue?: string;
	customLogic: boolean;
}

/** Operation on file content (find & replace) */
export interface ContentChange extends BaseChange {
	type: 'content_replace';
	find: string;
	replace: string;
	isRegex: boolean;
	caseSensitive: boolean;
}

/** File system operation (rename/move) */
export interface FileChange extends BaseChange {
	type: 'file_rename' | 'file_move' | 'file_delete';
	newName?: string;
	targetFolder?: string;
	/**
	 * U121-073: nodes released from a queued folder deletion. Releasing does not
	 * undo the operation -- the rest of the folder still goes -- so the released
	 * subtree has to be promoted out before the folder is trashed.
	 */
	excludedPaths?: string[];
}

/** Rename of a CSS snippet stored in the config directory, outside the vault. */
export interface SnippetRenameChange extends BaseChange {
	type: 'snippet_rename';
	action: 'rename';
	sourcePath: string;
	targetPath: string;
}

/**
 * U121-075: deletion of a CSS snippet. Snippets live in the config directory,
 * outside the vault index, so this carries its own path instead of a TFile and
 * runs without one -- the same shape `snippet_rename` already established.
 */
export interface SnippetDeleteChange extends BaseChange {
	type: 'snippet_delete';
	action: 'delete';
	/** Snippet name as Obsidian lists it, without the .css extension. */
	name: string;
	/** Adapter path, resolved when the operation is staged. */
	path: string;
}

/** U121-076: uninstall of a community plugin. Also fileless. */
export interface PluginUninstallChange extends BaseChange {
	type: 'plugin_uninstall';
	action: 'uninstall';
	pluginId: string;
	name: string;
}

/** Template application operation */
export interface TemplateChange extends BaseChange {
	type: 'template';
	templateFileStr: string;
}

/** Operation on tags (bulk rename/delete) */
export interface TagChange extends BaseChange {
	type: 'tag';
	tag: string;
	action: 'rename' | 'delete' | 'add';
}

export type PendingChange = PropertyChange | ContentChange | FileChange | SnippetRenameChange | SnippetDeleteChange | PluginUninstallChange | TemplateChange | TagChange;

export type QueueTemplateChange =
	| {
			type: 'property';
			action: PropertyAction;
			property: string;
			value?: string;
			oldValue?: string;
			details: string;
	  }
	| {
			type: 'content_replace';
			find: string;
			replace: string;
			isRegex: boolean;
			caseSensitive: boolean;
			details: string;
	  }
	| {
			type: 'template';
			templateFileStr: string;
			details: string;
	  }
	| {
			type: 'tag';
			action: 'add' | 'delete';
			tag: string;
			details: string;
	  };

export interface QueueTemplate {
	name: string;
	changes: QueueTemplateChange[];
}

export interface OperationResult {
	success: number;
	errors: number;
	messages: string[];
}
