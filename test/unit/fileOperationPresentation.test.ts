import { readFileSync } from 'node:fs';
import type { TFile } from 'obsidian';
import { describe, expect, it } from 'vitest';

import explorerFilesSource from '../../src/components/containers/explorerFiles.ts?raw';
import filesGridSource from '../../src/components/layout/viewFilesGrid.ts?raw';
import {
	formatFileRenameTarget,
	formatFileRenameTargetName,
	initialFileRenamePattern,
	type RenameTargetFile,
} from '../../src/modals/modalFileRename';
import {
	formatFileMoveDetails,
} from '../../src/modals/modalFileMove';
import fileMoveSource from '../../src/modals/modalFileMove.ts?raw';

const stylesSource = readFileSync(
	new URL('../../styles.css', import.meta.url),
	'utf8',
);

function targetFile(
	name: string,
	basename: string,
	extension: string,
): RenameTargetFile {
	return { name, basename, extension } as TFile & RenameTargetFile;
}

describe('file operation presentation', () => {
	it('starts a single-file rename with its literal basename and bulk rename with a placeholder', () => {
		expect(
			initialFileRenamePattern([targetFile('pepito.md', 'pepito', 'md')]),
		).toBe('pepito');
		expect(
			initialFileRenamePattern([
				targetFile('one.md', 'one', 'md'),
				targetFile('two.md', 'two', 'md'),
			]),
		).toBe('{basename}');
	});

	it('preserves file extensions when rename patterns omit an explicit extension', () => {
		expect(
			formatFileRenameTargetName(
				targetFile('Daily.md', 'Daily', 'md'),
				'Archive {date}',
				{},
				0,
				'2026-06-14',
			),
		).toBe('Archive 2026-06-14.md');

		expect(
			formatFileRenameTargetName(
				targetFile('Board.canvas', 'Board', 'canvas'),
				'Roadmap',
				{},
				0,
				'2026-06-14',
			),
		).toBe('Roadmap.canvas');

		expect(
			formatFileRenameTargetName(
				targetFile('Photo.PNG', 'Photo', 'PNG'),
				'Image {counter}',
				{},
				4,
				'2026-06-14',
			),
		).toBe('Image 005.PNG');
	});

	it('respects explicit extension changes in rename patterns', () => {
		expect(
			formatFileRenameTargetName(
				targetFile('Daily.md', 'Daily', 'md'),
				'Daily backup.canvas',
				{},
				0,
				'2026-06-14',
			),
		).toBe('Daily backup.canvas');
	});

	it('formats property rename targets only from text frontmatter values', () => {
		const result = formatFileRenameTarget(
			targetFile('Draft.md', 'Draft', 'md'),
			'{title}',
			{ title: 'attempt 1' },
			0,
			'2026-06-14',
		);

		expect(result.newName).toBe('attempt 1.md');
		expect(result.issues).toEqual([]);
	});

	it('reports missing, non-text, and malformed property rename patterns', () => {
		expect(
			formatFileRenameTarget(
				targetFile('Draft.md', 'Draft', 'md'),
				'{missing}',
				{},
				0,
				'2026-06-14',
			).issues,
		).toContainEqual({
			code: 'missing_property',
			property: 'missing',
		});

		expect(
			formatFileRenameTarget(
				targetFile('Draft.md', 'Draft', 'md'),
				'{rating}',
				{ rating: 5 },
				0,
				'2026-06-14',
			).issues,
		).toContainEqual({
			code: 'non_text_property',
			property: 'rating',
		});

		expect(
			formatFileRenameTarget(
				targetFile('Draft.md', 'Draft', 'md'),
				'{title',
				{ title: 'attempt 1' },
				0,
				'2026-06-14',
			).issues,
		).toContainEqual({
			code: 'invalid_pattern',
			token: '{title',
		});
	});

	it('does not treat dots already present in the basename as explicit extension changes', () => {
		expect(
			formatFileRenameTargetName(
				targetFile('Quarter.final.md', 'Quarter.final', 'md'),
				'{basename}',
				{},
				0,
				'2026-06-14',
			),
		).toBe('Quarter.final.md');
	});

	it('labels queued file move operations with an operation prefix', () => {
		expect(
			formatFileMoveDetails('Inbox/Report.pdf', 'Archive/Report.pdf'),
		).toBe('Move file "Inbox/Report.pdf" to "Archive/Report.pdf"');
		expect(fileMoveSource).toContain(
			'details: formatFileMoveDetails(file.path, newPath)',
		);
		expect(fileMoveSource).toContain(
			'logicFunc: () => ({ [MOVE_FILE]: targetFolder })',
		);
	});

	it('keeps queued folder move and rename labels prefixed', () => {
		expect(explorerFilesSource).toContain(
			'`Move folder "${folder.path}" to "${newPath}"`',
		);
		expect(explorerFilesSource).toContain(
			'`Rename folder "${folder.path}" to "${newPath}"`',
		);
	});

	it('keeps Files grid operation badges on the side instead of below the label', () => {
		const cardBlock =
			stylesSource.match(
				/\.vaultman-files-grid-card\s*\{[\s\S]*?\n\}/,
			)?.[0] ?? '';
		const badgeBlock =
			stylesSource.match(
				/\.vaultman-files-grid-card \.vaultman-card-badge-zone\s*\{[\s\S]*?\n\}/,
			)?.[0] ?? '';

		expect(filesGridSource).toContain(
			"cls: 'vaultman-tree-badge-zone vaultman-card-badge-zone'",
		);
		expect(cardBlock).toContain('padding: 8px 22px 6px 6px');
		expect(badgeBlock).toContain('position: absolute');
		expect(badgeBlock).toContain('inset-inline-end: 4px');
		expect(badgeBlock).toContain('top: 6px');
		expect(badgeBlock).toContain('flex-direction: column');
		expect(badgeBlock).toContain('justify-content: flex-start');
	});
});
