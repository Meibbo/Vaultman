import { describe, expect, it } from 'vitest';

import {
	buildFileHoverInfo,
	filesHoverNeedsStatistics,
} from '../../src/logic/logicFileHoverInfo';
import type { FileHoverInfoId } from '../../src/logic/logicCellRegistry';

const labels: Record<FileHoverInfoId, string> = {
	label: 'Label',
	path: 'Path',
	mtime: 'Modified',
	ctime: 'Created',
	ext: 'Extension',
	words: 'Words',
	characters: 'Characters',
	tasks: 'Tasks',
	count: 'Properties',
};

describe('Files hover info', () => {
	it('renders configured fields in their configured order', () => {
		expect(
			buildFileHoverInfo(
				['label', 'path', 'characters', 'words'],
				{
					label: 'a',
					path: 'Notes/a.md',
					mtime: 'Today',
					ctime: 'Yesterday',
					ext: 'md',
					words: 12,
					characters: 48,
					tasks: 3,
					count: 2,
				},
				labels,
			),
		).toBe('Label: a\nPath: Notes/a.md\nCharacters: 48\nWords: 12');
	});

	it('omits unavailable lazy stats and detects when they are required', () => {
		expect(
			buildFileHoverInfo(
				['modified', 'characters'],
				{
					label: 'a',
					path: 'Notes/a.md',
					mtime: 'Today',
					ctime: 'Yesterday',
					ext: 'md',
					words: null,
					characters: null,
					tasks: null,
					count: 0,
				},
				labels,
			),
		).toBe('Modified: Today');
		expect(filesHoverNeedsStatistics(['path'])).toBe(false);
		expect(filesHoverNeedsStatistics(['characters'])).toBe(true);
	});

	it('renders extension and property count without an undefined label', () => {
		expect(
			buildFileHoverInfo(
				['ext', 'count'],
				{
					label: 'a',
					path: 'Notes/a.md',
					mtime: null,
					ctime: null,
					ext: 'md',
					words: null,
					characters: null,
					tasks: null,
					count: 2,
				},
				{ ...labels, count: undefined as unknown as string },
			),
		).toBe('Extension: md\ncount: 2');
	});
});
