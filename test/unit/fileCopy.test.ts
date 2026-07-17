import { TFile } from 'obsidian';
import { describe, expect, it, vi } from 'vitest';

import {
	buildFolderCopyPlan,
	copyFileBinary,
	fileCopyPath,
	nextAvailableVaultPath,
	type FileCopyVault,
} from '../../src/logic/logicFileCopy';

function stubFile(path: string): TFile {
	const file = new TFile();
	file.path = path;
	return file;
}

describe('file copy helpers', () => {
	it('places copy suffixes before the final extension', () => {
		expect(fileCopyPath('Notes/report.md')).toBe('Notes/report copy.md');
		expect(fileCopyPath('Assets/archive.tar.gz')).toBe(
			'Assets/archive.tar copy.gz',
		);
		expect(fileCopyPath('README')).toBe('README copy');
	});

	it('increments collision suffixes without moving the extension', () => {
		const occupied = new Set([
			'Notes/report copy.md',
			'Notes/report copy 1.md',
		]);

		expect(
			nextAvailableVaultPath('Notes/report copy.md', (path) =>
				occupied.has(path),
			),
		).toBe('Notes/report copy 2.md');
	});

	it('forwards the exact ArrayBuffer to createBinary and propagates failures', async () => {
		const source = stubFile('Assets/image.png');
		const created = stubFile('Assets/image copy.png');
		const bytes = new Uint8Array([0, 255, 17, 42]).buffer;
		const createBinary = vi.fn(async () => created);
		const vault = {
			getAbstractFileByPath: () => null,
			readBinary: vi.fn(async () => bytes),
			createBinary,
		} satisfies FileCopyVault;

		await expect(
			copyFileBinary(vault, source, 'Assets/image copy.png'),
		).resolves.toBe(created);
		expect(vault.readBinary).toHaveBeenCalledWith(source);
		expect(createBinary).toHaveBeenCalledWith('Assets/image copy.png', bytes);

		const failure = new Error('disk full');
		const failingVault = {
			...vault,
			readBinary: vi.fn(async () => {
				throw failure;
			}),
			createBinary: vi.fn(async () => created),
		} satisfies FileCopyVault;
		await expect(
			copyFileBinary(failingVault, source, 'Assets/image copy.png'),
		).rejects.toBe(failure);
		expect(failingVault.createBinary).not.toHaveBeenCalled();
	});

	it('keeps nested empty folders and file targets in a folder copy plan', () => {
		const file = stubFile('Source/Nested/note.md');
		const plan = buildFolderCopyPlan(
			'Source',
			'Source copy',
			['Source/Nested', 'Source/Empty'],
			[file],
		);

		expect(plan.folderPaths).toEqual([
			'Source copy/Empty',
			'Source copy/Nested',
		]);
		expect(plan.files).toEqual([
			{ file, targetPath: 'Source copy/Nested/note.md' },
		]);
	});
});
