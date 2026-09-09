import { describe, expect, it, vi } from 'vitest';
import { MarkdownView, TFile } from 'obsidian';

import { openFileAtOffset } from '../../src/utils/openFileAtOffset';

function file(path: string): TFile {
	const value = new TFile();
	value.path = path;
	return value;
}

describe('openFileAtOffset', () => {
	it('reuses an already open pinned note and applies the match state', async () => {
		const target = file('notes/casa.md');
		const editor = {
			offsetToPos: vi.fn(() => ({ line: 4, ch: 2 })),
			setCursor: vi.fn(),
			scrollIntoView: vi.fn(),
		};
		const view = Object.assign(new MarkdownView(undefined as never), {
			file: target,
			editor,
			getMode: vi.fn(() => 'source' as const),
		});
		const leaf = {
			view,
			getViewState: () => ({ pinned: true, state: { file: target.path } }),
			openFile: vi.fn().mockResolvedValue(undefined),
		};
		const getLeaf = vi.fn();
		const setActiveLeaf = vi.fn();
		const app = {
			workspace: {
				activeLeaf: null,
				getLeavesOfType: vi.fn(() => [leaf]),
				getLeaf,
				setActiveLeaf,
				getActiveViewOfType: vi.fn(() => view),
			},
			vault: {},
		} as never;

		await openFileAtOffset(app, target, 42, {
			match: { content: 'tag here', range: [42, 45] },
		});

		expect(getLeaf).not.toHaveBeenCalled();
		expect(leaf.openFile).toHaveBeenCalledWith(target, {
			active: true,
			eState: {
				match: { content: 'tag here', matches: [[42, 45]] },
			},
		});
		expect(setActiveLeaf).toHaveBeenCalledWith(leaf, { focus: true });
		expect(editor.setCursor).toHaveBeenCalledWith({ line: 4, ch: 2 });
		expect(editor.scrollIntoView).toHaveBeenCalled();
	});

	it.each([
		['Reading view', 'preview', false],
		['Live Preview', 'source', false],
	] as const)(
		'%s does not jump to frontmatter',
		async (_label, mode, source) => {
			const target = file('notes/casa.md');
			const editor = {
				offsetToPos: vi.fn(() => ({ line: 1, ch: 0 })),
				setCursor: vi.fn(),
				scrollIntoView: vi.fn(),
			};
			const view = Object.assign(new MarkdownView(undefined as never), {
				file: target,
				editor,
				getMode: vi.fn(() => mode),
			});
			const leaf = {
				view,
				getViewState: () => ({
					pinned: false,
					state: { file: target.path, mode, source },
				}),
				openFile: vi.fn().mockResolvedValue(undefined),
			};
			const app = {
				workspace: {
					activeLeaf: null,
					getLeavesOfType: vi.fn(() => [leaf]),
					getLeaf: vi.fn(() => leaf),
					setActiveLeaf: vi.fn(),
					getActiveViewOfType: vi.fn(() => view),
				},
				vault: {},
			} as never;

			const opened = await openFileAtOffset(app, target, 0, {
				source: 'frontmatter',
			});

			expect(opened).toBe(false);
			expect(leaf.openFile).not.toHaveBeenCalled();
			expect(editor.setCursor).not.toHaveBeenCalled();
		},
	);

	it('jumps to frontmatter from explicit Source view', async () => {
		const target = file('notes/casa.md');
		const editor = {
			offsetToPos: vi.fn(() => ({ line: 1, ch: 0 })),
			setCursor: vi.fn(),
			scrollIntoView: vi.fn(),
		};
		const view = Object.assign(new MarkdownView(undefined as never), {
			file: target,
			editor,
			getMode: vi.fn(() => 'source' as const),
		});
		const leaf = {
			view,
			getViewState: () => ({
				state: { file: target.path, mode: 'source', source: true },
			}),
			openFile: vi.fn().mockResolvedValue(undefined),
		};
		const app = {
			workspace: {
				activeLeaf: null,
				getLeavesOfType: vi.fn(() => [leaf]),
				getLeaf: vi.fn(() => leaf),
				setActiveLeaf: vi.fn(),
				getActiveViewOfType: vi.fn(() => view),
			},
			vault: {},
		} as never;

		const opened = await openFileAtOffset(app, target, 0, {
			source: 'frontmatter',
		});

		expect(opened).toBe(true);
		expect(leaf.openFile).toHaveBeenCalled();
		expect(editor.setCursor).toHaveBeenCalled();
	});
});
