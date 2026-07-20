import { describe, expect, it } from 'vitest';

import enSource from '../../src/i18n/en.ts?raw';
import esSource from '../../src/i18n/es.ts?raw';
import {
	cellLabelKey,
	cellsForExplorer,
	defaultVisibleCells,
} from '../../src/logic/logicCellRegistry';

describe('Files prop count label source guards', () => {
	it('labels Files count cells as prop counts without renaming generic count labels', () => {
		expect(enSource).toContain("'viewmode.pill.prop_count': 'Props'");
		expect(esSource).toContain("'viewmode.pill.prop_count': 'Props'");
		expect(enSource).toContain("'files.col.props': 'Props'");
		expect(esSource).toContain("'files.col.props': 'Props'");

		// BT5-010: per-surface cell maps moved into the shared registry, so
		// the labels now come from there, not from popup/navbar literals.
		expect(
			cellLabelKey(
				cellsForExplorer('files', 'tree').find((cell) => cell.id === 'count')!,
				'files',
				'tree',
			),
		).toBe('viewmode.pill.prop_count');
		expect(defaultVisibleCells('files', 'tree')).not.toContain('count');
		for (const surface of ['props', 'tags'] as const) {
			expect(
				cellLabelKey(
					cellsForExplorer(surface, 'tree').find(
						(cell) => cell.id === 'count',
					)!,
					surface,
					'tree',
				),
			).toBe('viewmode.pill.count');
		}
		expect(enSource).toContain("'viewmode.pill.count': 'Count'");
	});
});
