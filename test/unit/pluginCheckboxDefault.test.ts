import { describe, expect, it } from 'vitest';
import {
	cellsForExplorer,
	defaultVisibleCells,
} from '../../src/logic/logicCellRegistry';

/**
 * Fresh installs ship the plugins selection checkbox OFF, while the
 * view-menu option stays available (opt-in, never removed).
 */
describe('plugins checkbox ships off by default', () => {
	it('excludes checkbox from fresh plugins defaults', () => {
		expect(defaultVisibleCells('plugins', 'tree')).not.toContain('checkbox');
	});

	it('keeps the remaining plugins defaults intact (order-insensitive)', () => {
		expect(defaultVisibleCells('plugins', 'tree')).toHaveLength(7);
		expect(defaultVisibleCells('plugins', 'tree')).toEqual(
			expect.arrayContaining([
				'caret',
				'icon',
				'format',
				'text',
				'state',
				'config',
				'nested',
			]),
		);
	});

	it('still offers the checkbox cell for plugins (opt-in view option)', () => {
		expect(
			cellsForExplorer('plugins', 'tree').map((definition) => definition.id),
		).toContain('checkbox');
	});
});
