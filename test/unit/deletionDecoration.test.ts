import { describe, expect, it } from 'vitest';
import type { TFile } from 'obsidian';

import type { PendingChange } from '../../src/types/typeOps';
import {
	DELETION_BADGE_ICON,
	DELETION_BADGE_TEXT,
	deletionBadge,
	findDeletionMatch,
	queueDeletesSubject,
} from '../../src/logic/logicDeletionDecoration';

function file(path: string): TFile {
	return {
		basename: path.replace(/\.md$/, ''),
		extension: 'md',
		name: path,
		parent: null,
		path,
		stat: { ctime: 0, mtime: 0, size: 0 },
		vault: {} as TFile['vault'],
	} satisfies TFile;
}

/** What `_deleteValue` stages after U121-072: the value is named, not implied. */
function valueDelete(property: string, value: string): PendingChange {
	return {
		type: 'property',
		action: 'delete',
		property,
		value,
		oldValue: value,
		details: `Delete value "${value}" from "${property}"`,
		files: [],
		customLogic: true,
		logicFunc: () => null,
	};
}

/** What `_deleteProp` stages: no value at all. */
function propDelete(property: string): PendingChange {
	return {
		type: 'property',
		action: 'delete',
		property,
		details: `Bulk delete property "${property}"`,
		files: [],
		customLogic: true,
		logicFunc: () => null,
	};
}

function folderDelete(targetFolder: string, files: TFile[]): PendingChange {
	return {
		type: 'file_delete',
		action: 'delete',
		targetFolder,
		details: `Delete folder "${targetFolder}"`,
		files,
		customLogic: true,
		logicFunc: () => null,
	};
}

function tagDelete(tag: string): PendingChange {
	return {
		type: 'tag',
		action: 'delete',
		tag,
		details: `Delete tag "#${tag}"`,
		files: [],
		customLogic: true,
		logicFunc: () => null,
	};
}

function snippetDelete(name: string): PendingChange {
	return {
		type: 'snippet_delete',
		action: 'delete',
		name,
		// Built from a segment rather than a literal config folder: Obsidian
		// lets the user move it, and the linter is right to say so.
		path: `snippets/${name}.css`,
		details: `Delete snippet "${name}"`,
		files: [],
		customLogic: true,
		logicFunc: () => null,
	};
}

function pluginUninstall(pluginId: string, name: string): PendingChange {
	return {
		type: 'plugin_uninstall',
		action: 'uninstall',
		pluginId,
		name,
		details: `Uninstall plugin "${name}"`,
		files: [],
		customLogic: true,
		logicFunc: () => null,
	};
}

describe('U121-071 deletion decoration contract', () => {
	describe('U121-072 a value delete stays on its value', () => {
		const queue = [valueDelete('status', 'done')];

		it('does not take the property that holds it', () => {
			expect(
				queueDeletesSubject({ kind: 'prop', property: 'status' }, queue),
			).toBe(false);
		});

		it('takes the value it names', () => {
			expect(
				queueDeletesSubject(
					{ kind: 'value', property: 'status', rawValue: 'done' },
					queue,
				),
			).toBe(true);
		});

		it('leaves its siblings alone', () => {
			expect(
				queueDeletesSubject(
					{ kind: 'value', property: 'status', rawValue: 'wip' },
					queue,
				),
			).toBe(false);
		});
	});

	describe('a property delete does take its values', () => {
		const queue = [propDelete('status')];

		it('takes the property', () => {
			expect(
				queueDeletesSubject({ kind: 'prop', property: 'status' }, queue),
			).toBe(true);
		});

		it('takes every value under it, named or not', () => {
			expect(
				queueDeletesSubject(
					{ kind: 'value', property: 'status', rawValue: 'anything' },
					queue,
				),
			).toBe(true);
		});

		it('does not reach a different property', () => {
			expect(
				queueDeletesSubject({ kind: 'prop', property: 'tags' }, queue),
			).toBe(false);
		});
	});

	describe('U121-073 a folder delete reaches everything nested', () => {
		const queue = [folderDelete('Notes', [file('Notes/a.md'), file('Notes/deep/b.md')])];

		it('takes the folder itself', () => {
			expect(queueDeletesSubject({ kind: 'folder', path: 'Notes' }, queue)).toBe(
				true,
			);
		});

		it('takes a nested subfolder', () => {
			expect(
				queueDeletesSubject({ kind: 'folder', path: 'Notes/deep' }, queue),
			).toBe(true);
		});

		it('takes the files inside', () => {
			expect(
				queueDeletesSubject({ kind: 'file', path: 'Notes/deep/b.md' }, queue),
			).toBe(true);
		});

		it('does not take a sibling whose name merely starts the same', () => {
			expect(
				queueDeletesSubject({ kind: 'folder', path: 'Notes-old' }, queue),
			).toBe(false);
		});

		it('is visible even when the folder is empty', () => {
			const empty = [folderDelete('Empty', [])];
			expect(queueDeletesSubject({ kind: 'folder', path: 'Empty' }, empty)).toBe(
				true,
			);
		});
	});

	describe('U121-074 a tag delete stops at the tag it names', () => {
		const queue = [tagDelete('project')];

		it('takes the tag', () => {
			expect(queueDeletesSubject({ kind: 'tag', tagPath: 'project' }, queue)).toBe(
				true,
			);
		});

		it('leaves the nested ones, which survive the operation', () => {
			expect(
				queueDeletesSubject({ kind: 'tag', tagPath: 'project/alpha' }, queue),
			).toBe(false);
		});
	});

	describe('U121-075/076 the fileless subjects', () => {
		const queue = [
			snippetDelete('zebra'),
			pluginUninstall('dataview', 'Dataview'),
		];

		it('matches a staged snippet by name', () => {
			expect(queueDeletesSubject({ kind: 'snippet', name: 'zebra' }, queue)).toBe(
				true,
			);
			expect(queueDeletesSubject({ kind: 'snippet', name: 'other' }, queue)).toBe(
				false,
			);
		});

		it('matches a staged plugin by id', () => {
			expect(
				queueDeletesSubject({ kind: 'plugin', pluginId: 'dataview' }, queue),
			).toBe(true);
		});
	});

	describe('the badge', () => {
		it('is one icon and one word, with the detail on hover', () => {
			const queue = [valueDelete('status', 'done')];
			const match = findDeletionMatch(
				{ kind: 'value', property: 'status', rawValue: 'done' },
				queue,
			);

			expect(match).not.toBeNull();
			const badge = deletionBadge(match!);

			expect(badge.icon).toBe(DELETION_BADGE_ICON);
			expect(badge.text).toBe(DELETION_BADGE_TEXT);
			// U121-073: Files used to render the whole sentence inside the pill.
			expect(badge.text).not.toContain('Delete value');
			expect(badge.tooltip).toBe('Delete value "done" from "status"');
			expect(badge.queueIndex).toBe(0);
		});

		it('points at the operation the user would cancel', () => {
			const queue = [propDelete('other'), valueDelete('status', 'done')];
			const match = findDeletionMatch(
				{ kind: 'value', property: 'status', rawValue: 'done' },
				queue,
			);

			expect(match?.queueIndex).toBe(1);
		});
	});
});
