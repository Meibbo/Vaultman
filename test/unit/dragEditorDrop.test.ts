import { describe, expect, it } from 'vitest';

import {
	shouldAppendTagDrop,
	shouldAppendTagDropFromLineText,
	tagDragNodes,
	tagTextForDrop,
} from '../../src/utils/dragEditorDrop';

describe('drag editor drop helpers', () => {
	it('extracts tag selections and formats their markdown fallback', () => {
		const nodes = tagDragNodes({
			kind: 'tag',
			tagPath: 'project',
			selection: [
				{ kind: 'tag', tagPath: 'project' },
				{ kind: 'tag', tagPath: 'journal' },
			],
		});

		expect(tagTextForDrop(nodes)).toBe('#project #journal');
	});

	it('lets native editor drop handle non-empty CodeMirror lines', () => {
		expect(shouldAppendTagDropFromLineText('existing text')).toBe(false);
	});

	it('uses append fallback for empty editor surfaces', () => {
		expect(shouldAppendTagDropFromLineText('   ')).toBe(true);
		expect(shouldAppendTagDrop(null)).toBe(true);
	});
});
