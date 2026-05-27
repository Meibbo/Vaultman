import { TFile } from 'obsidian';

/** Special return keys for logicFunc — signal non-standard operations */
export const DELETE_PROP = '_DELETE_PROP';
export const RENAME_FILE = '_RENAME_FILE';
export const REORDER_ALL = '_REORDER_ALL';
export const MOVE_FILE = '_MOVE_FILE';
export const FIND_REPLACE_CONTENT = '_FIND_REPLACE_CONTENT';
export const NATIVE_RENAME_PROP = '_NATIVE_RENAME_PROP';
export const APPLY_TEMPLATE = '_APPLY_TEMPLATE';

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
	type: 'file_rename' | 'file_move';
	newName?: string;
	targetFolder?: string;
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

export type PendingChange = PropertyChange | ContentChange | FileChange | TemplateChange | TagChange;

export interface OperationResult {
	success: number;
	errors: number;
	messages: string[];
}
