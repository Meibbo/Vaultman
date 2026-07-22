import type { TFile } from 'obsidian';
import { describe, expect, it } from 'vitest';

import { buildFileRenameChange } from '../../src/modals/modalFileRename';
import { queuedRenameBadgeForPath } from '../../src/logic/logicRenameBadges';
import { buildSnippetRenameChange } from '../../src/logic/logicSnippetOperations';

function file(path: string): TFile {
	const name = path.split('/').pop() ?? path;
	const dot = name.lastIndexOf('.');
	const extension = dot >= 0 ? name.slice(dot + 1) : '';
	const basename = dot >= 0 ? name.slice(0, dot) : name;
	return {
		basename,
		extension,
		name,
		parent: null,
		path,
		stat: { ctime: 0, mtime: 0, size: 0 },
		vault: {} as TFile['vault'],
	} satisfies TFile;
}

describe('queued rename badge projection', () => {
	it('projects a cancellable pencil badge for a queued vault-file rename', () => {
		const change = buildFileRenameChange(file('Notes/pepito.md'), 'renamed.md');
		expect(queuedRenameBadgeForPath([change], 'Notes/pepito.md')).toEqual({
			text: 'Rename to renamed.md',
			icon: 'lucide-pencil',
			color: 'blue',
			queueIndex: 0,
		});
	});

	it('projects the same badge contract for a config-directory snippet rename', () => {
		const unrelated = buildFileRenameChange(file('Notes/a.md'), 'b.md');
		const change = buildSnippetRenameChange(
			file('vault-config/snippets/pepito.css'),
			'renamed.css',
		);
		expect(
			queuedRenameBadgeForPath(
				[unrelated, change],
				'vault-config/snippets/pepito.css',
			),
		).toEqual({
			text: 'Rename to renamed.css',
			icon: 'lucide-pencil',
			color: 'blue',
			queueIndex: 1,
		});
	});

	it('returns no badge for an unrelated path', () => {
		expect(
			queuedRenameBadgeForPath(
				[buildFileRenameChange(file('Notes/a.md'), 'b.md')],
				'Notes/c.md',
			),
		).toBeUndefined();
	});
});
