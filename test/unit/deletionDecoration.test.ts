import { describe, expect, it } from 'vitest';
import type { TFile } from 'obsidian';

import type { PendingChange } from '../../src/types/typeOps';
import {
	DELETION_BADGE_ICON,
	DELETION_BADGE_TEXT,
	deletionBadge,
	findDeletionMatch,
	promotionPlan,
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

describe('U121-073 releasing a node from a folder deletion', () => {
	const released = (targetFolder: string, files: TFile[], excludedPaths: string[]): PendingChange =>
		({
			...folderDelete(targetFolder, files),
			excludedPaths,
		}) as PendingChange;

	it('stops targeting the released node and its subtree', () => {
		const queue = [
			released(
				'folder1',
				[file('folder1/folder1.1/folder1.1.1/perro.jpg')],
				['folder1/folder1.1/folder1.1.1'],
			),
		];

		expect(
			queueDeletesSubject({ kind: 'folder', path: 'folder1/folder1.1/folder1.1.1' }, queue),
		).toBe(false);
		expect(
			queueDeletesSubject(
				{ kind: 'file', path: 'folder1/folder1.1/folder1.1.1/perro.jpg' },
				queue,
			),
		).toBe(false);
	});

	it('still deletes everything that was not released', () => {
		const queue = [
			released('folder1', [file('folder1/otro.md')], ['folder1/folder1.1/folder1.1.1']),
		];

		expect(queueDeletesSubject({ kind: 'folder', path: 'folder1' }, queue)).toBe(true);
		expect(queueDeletesSubject({ kind: 'folder', path: 'folder1/folder1.1' }, queue)).toBe(
			true,
		);
		expect(queueDeletesSubject({ kind: 'file', path: 'folder1/otro.md' }, queue)).toBe(true);
	});

	describe('promotionPlan', () => {
		it('lifts the released node to the level of the deleted folder', () => {
			// The dev's case: delete folder1, exempt folder1.1.1 -> it and the
			// jpg inside it rise until an ancestor survives, which is folder1's
			// own parent.
			expect(
				promotionPlan('Notas/folder1', ['Notas/folder1/folder1.1/folder1.1.1']),
			).toEqual([{ from: 'Notas/folder1/folder1.1/folder1.1.1', to: 'Notas/folder1.1.1' }]);
		});

		it('lands at the vault root when the deleted folder is top level', () => {
			expect(promotionPlan('folder1', ['folder1/folder1.1'])).toEqual([
				{ from: 'folder1/folder1.1', to: 'folder1.1' },
			]);
		});

		it('promotes only the top-level release, so nested ones stay inside it', () => {
			// Releasing both a/b and a/b/c means a/b survives, so c belongs
			// inside it and must not be promoted past its own parent.
			expect(
				promotionPlan('a', ['a/b', 'a/b/c']),
			).toEqual([{ from: 'a/b', to: 'b' }]);
		});

		it('moves nothing when nothing was released', () => {
			expect(promotionPlan('a', [])).toEqual([]);
		});
	});

	describe('the badge', () => {
		const queue = [
			folderDelete('folder1', [file('folder1/perro.jpg')]),
		];

		it('offers release on a node doomed by its ancestor', () => {
			const match = findDeletionMatch({ kind: 'file', path: 'folder1/perro.jpg' }, queue);
			expect(match?.releasePath).toBe('folder1/perro.jpg');
			expect(deletionBadge(match!).releasePath).toBe('folder1/perro.jpg');
		});

		it('does not offer release on the folder the operation names', () => {
			// Releasing it would leave the operation with nothing to do, so
			// that node keeps plain cancellation.
			const match = findDeletionMatch({ kind: 'folder', path: 'folder1' }, queue);
			expect(match).not.toBeNull();
			expect(match?.releasePath).toBeUndefined();
		});
	});
});
