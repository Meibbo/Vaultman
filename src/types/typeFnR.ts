import type { TFile } from 'obsidian';

export type FnRSyntax =
	| 'plain'
	| 'regex'
	| 'obsidian-search'
	| 'obsidian-bases'
	| 'dataview-dql'
	| 'ant-renamer';

export type FnRScope = 'filtered' | 'selected';

export type FnRRenameSourceKind = 'prop' | 'value' | 'tag' | 'file';
export type FnRRenameStatus = 'inactive' | 'editing' | 'ready' | 'queued' | 'cancelled';

export interface InactiveFnRRenameHandoff {
	status: 'inactive' | 'queued' | 'cancelled';
}

export interface ActiveFnRRenameHandoff {
	status: 'editing' | 'ready';
	sourceKind: FnRRenameSourceKind;
	original: string;
	replacement: string;
	propName?: string;
	oldValue?: string;
	files: TFile[];
	scope: FnRScope;
}

export type FnRRenameHandoff = InactiveFnRRenameHandoff | ActiveFnRRenameHandoff;

export interface FnRState {
	expanded: boolean;
	replace: string;
	syntax: FnRSyntax;
	caseSensitive: boolean;
	wholeWord: boolean;
	scope: FnRScope;
	rename: FnRRenameHandoff;
}

export interface FnRPattern {
	pattern: string;
	isRegex: boolean;
}

export interface FnRSyntaxOption {
	id: FnRSyntax;
	label: string;
	description: string;
	canReplaceContent: boolean;
}

export interface BuildContentReplaceChangeInput {
	find: string;
	files: readonly TFile[];
	state: FnRState;
}

export interface StartPropRenameHandoffInput {
	propName: string;
	files: readonly TFile[];
	scope: FnRScope;
}

export interface StartValueRenameHandoffInput {
	propName: string;
	oldValue: string;
	files: readonly TFile[];
	scope: FnRScope;
}

export interface StartTagRenameHandoffInput {
	tagPath: string;
	files: readonly TFile[];
	scope: FnRScope;
}

export interface StartFileRenameHandoffInput {
	files: readonly TFile[];
	scope: FnRScope;
}
