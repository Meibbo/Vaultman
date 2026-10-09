// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
	canMoveOrCopyPath,
	filterDescendantPaths,
	OBSIDIAN_FILES_MIME,
	parseObsidianFilesClipboard,
	serializeObsidianFilesClipboard,
} from '../../src/logic/logicTreeClipboard';

describe('Tree Clipboard (obsidian/files contract parity)', () => {
	it('serializes and parses obsidian/files clipboard JSON payloads', () => {
		const payload = {
			operation: 'copy' as const,
			paths: ['folder/a.md', 'folder/b.md'],
		};
		const serialized = serializeObsidianFilesClipboard(payload);
		expect(OBSIDIAN_FILES_MIME).toBe('obsidian/files');
		expect(parseObsidianFilesClipboard(serialized)).toEqual(payload);
	});

	it('parses cut operation correctly', () => {
		const payload = {
			operation: 'cut' as const,
			paths: ['docs/note.md'],
		};
		const serialized = serializeObsidianFilesClipboard(payload);
		expect(parseObsidianFilesClipboard(serialized)).toEqual(payload);
	});

	it('returns null on invalid or malformed clipboard payload', () => {
		expect(parseObsidianFilesClipboard(null)).toBeNull();
		expect(parseObsidianFilesClipboard('')).toBeNull();
		expect(parseObsidianFilesClipboard('{invalid-json')).toBeNull();
		expect(parseObsidianFilesClipboard(JSON.stringify({ operation: 'unknown', paths: [] }))).toBeNull();
		expect(parseObsidianFilesClipboard(JSON.stringify({ operation: 'copy', paths: 'not-an-array' }))).toBeNull();
	});

	it('deduplicates descendant paths when parent folder is included (native RI parity)', () => {
		const paths = [
			'parent/child/grandchild.md',
			'parent',
			'other/file.md',
			'parent/sibling.md',
		];
		const deduped = filterDescendantPaths(paths);
		expect(deduped).toEqual(['parent', 'other/file.md']);
	});

	it('prevents copying or moving a folder into itself or its own descendant (native FI parity)', () => {
		expect(canMoveOrCopyPath('folder', 'folder')).toBe(false);
		expect(canMoveOrCopyPath('folder', 'folder/subfolder')).toBe(false);
		expect(canMoveOrCopyPath('folder', 'folder/sub/sub2')).toBe(false);
		expect(canMoveOrCopyPath('folder', 'other-folder')).toBe(true);
		expect(canMoveOrCopyPath('folder/file.md', 'other-folder')).toBe(true);
	});
});
