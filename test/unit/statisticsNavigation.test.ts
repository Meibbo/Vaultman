import { describe, expect, it } from 'vitest';

import {
	dataTabForStatisticsCard,
	type StatisticsNavigationCard,
} from '../../src/logic/logicStatisticsNavigation';

describe('statistics navigation mapping', () => {
	it.each<[StatisticsNavigationCard, string]>([
		['folders', 'files'],
		['files', 'files'],
		['props', 'props'],
		['values', 'props'],
		['tags', 'tags'],
		['words', 'content'],
	])('routes %s statistics card to Data/%s', (card, expectedTab) => {
		expect(dataTabForStatisticsCard(card)).toBe(expectedTab);
	});
});
