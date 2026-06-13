// src/types/tree.ts
import type { TFile } from 'obsidian';

// App-free node primitives live in typeTreeNode.ts so pure logic modules can use
// them without pulling `obsidian` into their dependency graph (Q4 AC#1).
export type { NodeBadge, NodeRelationKind, TreeNode } from './typeTreeNode';

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
	isFolder: boolean;
	folderPath: string;
}

export interface ContentMeta {
	kind: 'file' | 'match';
	filePath: string;
	file: TFile | null;
	line?: number;
	before?: string;
	match?: string;
	after?: string;
}

export interface SnippetMeta {
	name: string;
	enabled: boolean;
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
	isVaultman?: boolean;
}
