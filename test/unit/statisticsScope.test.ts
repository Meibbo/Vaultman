import type { TFile, TFolder, Vault } from 'obsidian';
import { describe, expect, it } from 'vitest';

import {
	filesForStatisticsScope,
	folderCountForStatisticsFiles,
} from '../../src/logic/logicStatisticsScope';

const vault = {} as Vault;

function makeFolder(path: string): TFolder {
	return {
		children: [],
		isRoot: () => path === '/',
		name: path.split('/').pop() ?? path,
		parent: null,
		path,
		vault,
	} satisfies TFolder;
}

function makeFile(path: string): TFile {
	const name = path.split('/').pop() ?? path;
	const dot = name.lastIndexOf('.');
	return {
		basename: dot === -1 ? name : name.slice(0, dot),
		extension: dot === -1 ? '' : name.slice(dot + 1),
		name,
		parent: makeFolder(path.includes('/') ? path.split('/').slice(0, -1).join('/') : '/'),
		path,
		stat: { ctime: 0, mtime: 0, size: 0 },
		vault,
	} satisfies TFile;
}

describe('statistics scope logic', () => {
	it('uses the focused editor file for selected-file scope', () => {
		const active = makeFile('Journal/today.md');
		const explorerSelected = makeFile('Archive/old.md');

		expect(
			filesForStatisticsScope('selected', {
				markdownFiles: [active, explorerSelected],
				filteredFiles: [explorerSelected],
				activeFile: active,
			}),
		).toEqual([active]);
	});

	it('projects all and unfiltered filtered scopes over the same file-level set', () => {
		const files = [makeFile('A/one.md'), makeFile('B/two.md')];
		const context = {
			markdownFiles: files,
			filteredFiles: files,
			activeFile: null,
		};

		expect(filesForStatisticsScope('vault', context)).toEqual(files);
		expect(filesForStatisticsScope('filtered', context)).toEqual(files);
		expect(folderCountForStatisticsFiles(files)).toBe(2);
	});
});
