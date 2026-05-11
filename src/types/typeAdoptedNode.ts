import type { TFile } from 'obsidian';

export type AdoptedNodeKind = 'header' | 'task' | 'block';

export interface AdoptedNode {
	id: string;
	parentPath: string;
	file: TFile;
	kind: AdoptedNodeKind;
	label: string;
	depth: number;
	line: number;
	blockId?: string;
	taskState?: ' ' | 'x' | '/' | '-';
	children: AdoptedNode[];
}
