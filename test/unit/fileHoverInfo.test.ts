import { describe, expect, it } from 'vitest';

import {
	buildFileHoverInfo,
	filesHoverNeedsStatistics,
} from '../../src/logic/logicFileHoverInfo';
import type { FilesHoverInfoField } from '../../src/types/typeSettings';

const labels: Record<FilesHoverInfoField, string> = {
	path: 'Path',
	modified: 'Modified',
	created: 'Created',
	words: 'Words',
	characters: 'Characters',
};

describe('Files hover info', () => {
	it('renders configured fields in their configured order', () => {
		expect(
			buildFileHoverInfo(
				['path', 'characters', 'words'],
				{
					path: 'Notes/a.md',
					modified: 'Today',
					created: 'Yesterday',
					words: 12,
					characters: 48,
				},
				labels,
			),
		).toBe('Path: Notes/a.md\nCharacters: 48\nWords: 12');
	});

	it('omits unavailable lazy stats and detects when they are required', () => {
		expect(
			buildFileHoverInfo(
				['modified', 'characters'],
				{
					path: 'Notes/a.md',
					modified: 'Today',
					created: 'Yesterday',
					words: null,
					characters: null,
				},
				labels,
			),
		).toBe('Modified: Today');
		expect(filesHoverNeedsStatistics(['path'])).toBe(false);
		expect(filesHoverNeedsStatistics(['characters'])).toBe(true);
	});
});
