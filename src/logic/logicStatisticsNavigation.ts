export type StatisticsDataTab = 'files' | 'props' | 'tags' | 'content';
export type StatisticsNavigationCard =
	| 'folders'
	| 'files'
	| 'props'
	| 'values'
	| 'tags'
	| 'words';

const STATISTICS_CARD_TAB: Record<StatisticsNavigationCard, StatisticsDataTab> =
	{
		folders: 'files',
		files: 'files',
		props: 'props',
		values: 'props',
		tags: 'tags',
		words: 'content',
	};

export function dataTabForStatisticsCard(
	card: StatisticsNavigationCard,
): StatisticsDataTab {
	return STATISTICS_CARD_TAB[card];
}
