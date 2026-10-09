import { describe, expect, it, vi } from 'vitest';

import {
	NATIVE_EXPLORER_HOVER_CLASS,
	NATIVE_EXPLORER_HOVER_EXPAND_MS,
	NATIVE_EXPLORER_SOURCE,
	classifyExplorerDropOrigin,
	createExplorerCommitLedger,
	createHoverExpandTracker,
	decideExplorerHover,
	isValidExplorerMove,
	negotiateExplorerDropEffect,
	planExplorerMoves,
	pruneNestedExplorerSources,
	resolveExplorerDropTarget,
	resolveExplorerMovePath,
	selectNativeSourceDragCall,
} from '../../src/logic/logicNativeExplorerDnd';

function parentPathOf(path: string): string | null {
	const slash = path.lastIndexOf('/');
	return slash < 0 ? '' : path.slice(0, slash);
}

describe('native explorer DnD source initialization', () => {
	it('starts a single file with dragFile', () => {
		expect(
			selectNativeSourceDragCall([{ kind: 'file', path: 'Notes/a.md' }]),
		).toBe('dragFile');
	});

	it('starts a single folder with dragFolder, not dragFile', () => {
		expect(
			selectNativeSourceDragCall([{ kind: 'folder', path: 'Notes' }]),
		).toBe('dragFolder');
	});

	it('starts mixed multi-selection with dragFiles', () => {
		expect(
			selectNativeSourceDragCall([
				{ kind: 'file', path: 'a.md' },
				{ kind: 'folder', path: 'Notes' },
			]),
		).toBe('dragFiles');
	});

	it('starts nothing while renaming or without sources', () => {
		expect(
			selectNativeSourceDragCall([{ kind: 'file', path: 'a.md' }], {
				isRenaming: true,
			}),
		).toBeNull();
		expect(selectNativeSourceDragCall([])).toBeNull();
	});

	it('advertises the native file-explorer source, never a Vaultman-only value', () => {
		expect(NATIVE_EXPLORER_SOURCE).toBe('file-explorer');
	});
});

describe('native explorer DnD drop targets', () => {
	it('accepts folder rows and the root container', () => {
		expect(
			resolveExplorerDropTarget({
				isFolderRow: true,
				folderPath: 'Notes',
				isRootContainer: false,
			}),
		).toBe('Notes');
		expect(
			resolveExplorerDropTarget({
				isFolderRow: false,
				folderPath: '',
				isRootContainer: true,
			}),
		).toBe('');
	});

	it('rejects file rows, including the depth-0 file-row-as-root alias', () => {
		expect(
			resolveExplorerDropTarget({
				isFolderRow: false,
				folderPath: '',
				isRootContainer: false,
			}),
		).toBeNull();
	});
});

describe('native explorer DnD move validation', () => {
	it('rejects self and folder-into-own-descendant moves', () => {
		expect(
			isValidExplorerMove({ kind: 'folder', path: 'Notes' }, 'Notes'),
		).toBe(false);
		expect(
			isValidExplorerMove({ kind: 'folder', path: 'Notes' }, 'Notes/sub'),
		).toBe(false);
		expect(
			isValidExplorerMove({ kind: 'file', path: 'a.md' }, 'Notes'),
		).toBe(true);
	});

	it('prunes children of dragged folders before commit', () => {
		expect(
			pruneNestedExplorerSources([
				{ kind: 'folder', path: 'Notes' },
				{ kind: 'file', path: 'Notes/a.md' },
				{ kind: 'file', path: 'top.md' },
			]),
		).toEqual([
			{ kind: 'folder', path: 'Notes' },
			{ kind: 'file', path: 'top.md' },
		]);
	});

	it('treats same-parent drops as no-ops, not moves', () => {
		const plan = planExplorerMoves(
			[{ kind: 'file', path: 'Notes/a.md' }],
			'Notes',
			parentPathOf,
		);
		expect(plan.moves).toEqual([]);
		expect(plan.skippedSameParent).toEqual(['Notes/a.md']);
	});

	it('emits each valid move exactly once and reports invalid sources', () => {
		const plan = planExplorerMoves(
			[
				{ kind: 'folder', path: 'Notes' },
				{ kind: 'file', path: 'Notes/a.md' },
				{ kind: 'file', path: 'top.md' },
			],
			'Archive',
			parentPathOf,
		);
		expect(plan.moves).toEqual([
			{ from: 'Notes', kind: 'folder' },
			{ from: 'top.md', kind: 'file' },
		]);
		expect(plan.skippedSameParent).toEqual([]);
		const invalid = planExplorerMoves(
			[{ kind: 'folder', path: 'Notes' }],
			'Notes/sub',
			parentPathOf,
		);
		expect(invalid.moves).toEqual([]);
		expect(invalid.skippedInvalid).toEqual(['Notes']);
	});
});

describe('native explorer DnD origin acceptance', () => {
	it('accepts native file, folder and multi draggables at folder targets', () => {
		for (const draggableType of ['file', 'folder', 'files']) {
			const origin = classifyExplorerDropOrigin({ draggableType });
			const decision = decideExplorerHover(origin, 'Archive');
			expect(decision.accept).toBe(true);
			expect(decision.dropEffect).toBe('move');
			expect(decision.hoverClass).toBe(NATIVE_EXPLORER_HOVER_CLASS);
		}
	});

	it('accepts native link draggables only when they resolve to a file', () => {
		const withFile = decideExplorerHover(
			classifyExplorerDropOrigin({
				draggableType: 'link',
				draggableHasFile: true,
			}),
			'Archive',
		);
		expect(withFile.accept).toBe(true);
		const withoutFile = decideExplorerHover(
			classifyExplorerDropOrigin({
				draggableType: 'link',
				draggableHasFile: false,
			}),
			'Archive',
		);
		expect(withoutFile.accept).toBe(false);
	});

	it('accepts external OS files as copy imports at folder and root targets', () => {
		for (const target of ['Archive', '']) {
			const decision = decideExplorerHover(
				classifyExplorerDropOrigin({
					draggableType: null,
					hasOsFileItems: true,
				}),
				target,
			);
			expect(decision.accept).toBe(true);
			expect(decision.dropEffect).toBe('copy');
		}
	});

	it('keeps tag and property drags outside this Files adapter', () => {
		for (const draggableType of ['tag', 'property', 'unknown']) {
			const decision = decideExplorerHover(
				classifyExplorerDropOrigin({ draggableType }),
				'Archive',
			);
			expect(decision.accept).toBe(false);
			expect(decision.dropEffect).toBe('none');
		}
	});

	it('negotiates dropEffect against effectAllowed like the native DR gate', () => {
		expect(negotiateExplorerDropEffect('all', 'move')).toBe('move');
		expect(negotiateExplorerDropEffect('all', 'link')).toBe('link');
		expect(negotiateExplorerDropEffect('copyMove', 'move')).toBe('move');
		expect(negotiateExplorerDropEffect('copyMove', 'link')).toBe('none');
		expect(negotiateExplorerDropEffect('uninitialized', 'move')).toBe('none');
	});
});

describe('native explorer DnD collision paths', () => {
	it('splits file extensions and keeps folder paths whole', () => {
		expect(
			resolveExplorerMovePath('Notes/a.md', false, (p) => p === 'Notes/a.md'),
		).toBe('Notes/a 1.md');
		expect(
			resolveExplorerMovePath('Notes/Sub', true, (p) => p === 'Notes/Sub'),
		).toBe('Notes/Sub 1');
		expect(
			resolveExplorerMovePath('Notes/free.md', false, () => false),
		).toBe('Notes/free.md');
	});
});

describe('native explorer DnD hover expansion', () => {
	it('exposes the native 750ms collapsed-folder delay', () => {
		expect(NATIVE_EXPLORER_HOVER_EXPAND_MS).toBe(750);
	});

	it('expands through the owner callback after a steady hover', () => {
		vi.useFakeTimers();
		try {
			const onExpand = vi.fn();
			const tracker = createHoverExpandTracker(onExpand);
			tracker.noteHover('Notes', true);
			vi.advanceTimersByTime(749);
			expect(onExpand).not.toHaveBeenCalled();
			vi.advanceTimersByTime(1);
			expect(onExpand).toHaveBeenCalledTimes(1);
			expect(onExpand).toHaveBeenCalledWith('Notes');
		} finally {
			vi.useRealTimers();
		}
	});

	it('resets when the hover target changes and never fires for non-folders', () => {
		vi.useFakeTimers();
		try {
			const onExpand = vi.fn();
			const tracker = createHoverExpandTracker(onExpand);
			tracker.noteHover('A', true);
			vi.advanceTimersByTime(400);
			tracker.noteHover('B', true);
			vi.advanceTimersByTime(400);
			expect(onExpand).not.toHaveBeenCalled();
			vi.advanceTimersByTime(350);
			expect(onExpand).toHaveBeenCalledWith('B');
			const plain = createHoverExpandTracker(vi.fn());
			plain.noteHover('C', false);
			vi.advanceTimersByTime(2000);
			expect(plain.cancel).toBeDefined();
		} finally {
			vi.useRealTimers();
		}
	});
});

describe('native explorer DnD exactly-once commits', () => {
	it('commits a drop key only on its first attempt', () => {
		const ledger = createExplorerCommitLedger();
		expect(ledger.tryCommit('Archive|Notes|top.md')).toBe(true);
		expect(ledger.tryCommit('Archive|Notes|top.md')).toBe(false);
		expect(ledger.tryCommit('|top.md')).toBe(true);
	});
});
