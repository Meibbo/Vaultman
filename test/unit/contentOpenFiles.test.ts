import type { TFile } from 'obsidian';
import { describe, expect, it } from 'vitest';

import { orderedOpenFilePaths } from '../../src/logic/logicContentOpenFiles';

function file(path: string): TFile {
	return { path } as TFile;
}

describe('orderedOpenFilePaths', () => {
	it('returns scoped markdown leaves with the active file first', () => {
		const workspace = {
			getLeavesOfType: () => [
				{ view: { file: { path: 'other.md' } } },
				{ view: { file: { path: 'active.md' } } },
				{ view: { file: { path: 'outside.md' } } },
				{ view: { file: { path: 'other.md' } } },
			],
		};

		expect(
			orderedOpenFilePaths(
				workspace,
				[file('active.md'), file('other.md')],
				'active.md',
			),
		).toEqual(['active.md', 'other.md']);
	});
});
