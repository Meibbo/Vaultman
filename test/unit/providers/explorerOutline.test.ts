import { describe, expect, it } from 'vitest';
import { buildOutlineForFile } from '../../../src/providers/explorerOutline';
import type { TFile } from 'obsidian';

const SAMPLE = `# Top
Some text

## Sub one
- [ ] Task A
- [x] Task B

## Sub two
^block-id-here

# Top two
`;

const FAKE_FILE = { path: 'note.md', basename: 'note' } as TFile;

describe('explorerOutline buildOutlineForFile', () => {
	it('flattens H1/H2 into a nested tree', () => {
		const tree = buildOutlineForFile({ path: 'note.md', content: SAMPLE, file: FAKE_FILE });
		expect(tree.length).toBe(2);
		expect(tree[0].kind).toBe('header');
		expect(tree[0].label).toBe('Top');
		expect(tree[0].children.length).toBe(2);
		expect(tree[0].children[0].label).toBe('Sub one');
	});

	it('captures tasks as children of nearest header', () => {
		const tree = buildOutlineForFile({ path: 'note.md', content: SAMPLE, file: FAKE_FILE });
		const subOne = tree[0].children[0];
		const tasks = subOne.children.filter((c) => c.kind === 'task');
		expect(tasks.length).toBe(2);
		expect(tasks[0].taskState).toBe(' ');
		expect(tasks[1].taskState).toBe('x');
	});

	it('captures block references', () => {
		const tree = buildOutlineForFile({ path: 'note.md', content: SAMPLE, file: FAKE_FILE });
		const subTwo = tree[0].children[1];
		const block = subTwo.children.find((c) => c.kind === 'block');
		expect(block).toBeTruthy();
		expect(block?.blockId).toBe('block-id-here');
	});

	it('handles empty content', () => {
		expect(
			buildOutlineForFile({ path: 'empty.md', content: '', file: FAKE_FILE }),
		).toEqual([]);
	});

	it('handles content with no headers', () => {
		expect(
			buildOutlineForFile({
				path: 'flat.md',
				content: 'just\nplain\ntext',
				file: FAKE_FILE,
			}),
		).toEqual([]);
	});
});
