import { describe, expect, it } from 'vitest';
import { configToViewMode, viewModeToConfig } from '../../../src/logic/logicViewAddressing';

describe('logicViewAddressing', () => {
	it('maps the five wired flat explorer modes to the canonical engine/mode pairs', () => {
		expect(viewModeToConfig('tree')).toEqual({ engine: 'Linear', mode: 'indent' });
		expect(viewModeToConfig('list')).toEqual({ engine: 'Linear', mode: 'flat' });
		expect(viewModeToConfig('table')).toEqual({ engine: 'Geometry', mode: 'table' });
		expect(viewModeToConfig('grid')).toEqual({ engine: 'Geometry', mode: 'grid' });
		expect(viewModeToConfig('cards')).toEqual({ engine: 'Geometry', mode: 'cards' });
	});

	it('maps wired canonical engine/mode pairs back to the flat explorer mode', () => {
		expect(configToViewMode({ engine: 'Linear', mode: 'indent' })).toBe('tree');
		expect(configToViewMode({ engine: 'Linear', mode: 'flat' })).toBe('list');
		expect(configToViewMode({ engine: 'Geometry', mode: 'table' })).toBe('table');
		expect(configToViewMode({ engine: 'Geometry', mode: 'grid' })).toBe('grid');
		expect(configToViewMode({ engine: 'Geometry', mode: 'cards' })).toBe('cards');
	});

	it('returns null for canonical pairs without a flat explorer equivalent yet', () => {
		expect(configToViewMode({ engine: 'Linear', mode: 'cascade' })).toBeNull();
		expect(configToViewMode({ engine: 'Linear', mode: 'detail' })).toBeNull();
		expect(configToViewMode({ engine: 'Geometry', mode: 'masonry' })).toBeNull();
		expect(configToViewMode({ engine: 'Canvas', mode: 'mindmap' })).toBeNull();
		expect(configToViewMode({ engine: 'Charts', mode: 'chart' })).toBeNull();
	});
});
