import type { TFile } from 'obsidian';
import { describe, expect, it } from 'vitest';

import { warningsForQueuedChange } from '../../src/logic/logicQueueWarnings';
import type { PendingChange } from '../../src/types/typeOps';

function makeFile(path: string): TFile {
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

function makeChange(files: TFile[]): PendingChange {
	return {
		type: 'property',
		action: 'add',
		property: 'status',
		details: 'Add status',
		files,
		customLogic: true,
		logicFunc: () => ({ status: '' }),
	};
}

describe('queue warnings', () => {
	it('marks operations that affect zero files as errors', () => {
		expect(warningsForQueuedChange(makeChange([]), 400)).toEqual([
			{ kind: 'empty-target', severity: 'error', targetCount: 0 },
		]);
	});

	it('counts empty folder deletes as a folder target, not as zero affected files', () => {
		expect(
			warningsForQueuedChange(
				{
					type: 'file_delete',
					files: [],
					targetFolder: 'empty',
				},
				400,
			),
		).toEqual([]);
	});

	it('marks operations over the configured threshold as bulk warnings', () => {
		const files = Array.from({ length: 401 }, (_, index) =>
			makeFile(`${index}.md`),
		);

		expect(warningsForQueuedChange(makeChange(files), 400)).toEqual([
			{
				kind: 'large-target',
				severity: 'warning',
				targetCount: 401,
				threshold: 400,
			},
		]);
	});
});
