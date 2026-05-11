import type { TFile } from 'obsidian';
import type { AdoptedNode, AdoptedNodeKind } from '../types/typeAdoptedNode';

interface BuildInput {
	path: string;
	content: string;
	file: TFile;
}

const HEADER_RE = /^(#{1,6})\s+(.*)$/;
const TASK_RE = /^[\t ]*-\s+\[([ xX/\-])\]\s+(.*)$/;
const BLOCK_RE = /\^([A-Za-z0-9_-]+)\s*$/;

export function buildOutlineForFile(input: BuildInput): AdoptedNode[] {
	const lines = input.content.split('\n');
	const roots: AdoptedNode[] = [];
	const stack: AdoptedNode[] = [];

	function pushHeader(node: AdoptedNode) {
		if (stack.length === 0) {
			roots.push(node);
		} else {
			stack[stack.length - 1].children.push(node);
		}
	}

	function attachLeaf(
		kind: AdoptedNodeKind,
		label: string,
		line: number,
		extras: Partial<AdoptedNode>,
	): void {
		const parent = stack[stack.length - 1];
		if (!parent) return;
		parent.children.push({
			id: `${input.path}::L${line}::${kind}`,
			parentPath: input.path,
			file: input.file,
			kind,
			label,
			depth: parent.depth + 1,
			line,
			children: [],
			...extras,
		});
	}

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const header = line.match(HEADER_RE);
		if (header) {
			const depth = header[1].length;
			while (stack.length && stack[stack.length - 1].depth >= depth) stack.pop();
			const node: AdoptedNode = {
				id: `${input.path}::L${i}::header`,
				parentPath: input.path,
				file: input.file,
				kind: 'header',
				label: header[2].trim(),
				depth,
				line: i,
				children: [],
			};
			pushHeader(node);
			stack.push(node);
			continue;
		}
		const task = line.match(TASK_RE);
		if (task) {
			const state = task[1].toLowerCase() as ' ' | 'x' | '/' | '-';
			attachLeaf('task', task[2].trim(), i, { taskState: state });
			continue;
		}
		const block = line.match(BLOCK_RE);
		if (block) {
			attachLeaf('block', `^${block[1]}`, i, { blockId: block[1] });
			continue;
		}
	}

	return roots;
}
