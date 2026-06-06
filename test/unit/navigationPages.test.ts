import { describe, expect, it } from 'vitest';

import { resolveDockPageOrder } from '../../src/logic/logicNavigation';

describe('resolveDockPageOrder', () => {
	it('migrates legacy Files dock page settings into the two-page dock', () => {
		expect(resolveDockPageOrder(['ops', 'statistics', 'filters'])).toEqual([
			'filters',
			'statistics',
		]);
		expect(resolveDockPageOrder(['filters', 'ops', 'statistics'])).toEqual([
			'filters',
			'statistics',
		]);
	});
});
