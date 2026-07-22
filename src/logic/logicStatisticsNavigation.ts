export type StatisticsDataTab =
	| 'files'
	| 'props'
	| 'tags'
	| 'content'
	| 'snippets'
	| 'plugins';
export type StatisticsNavigationCard =
	| 'folders'
	| 'files'
	| 'props'
	| 'values'
	| 'tags'
	| 'words'
	| 'tasks'
	| 'opened-today';

const STATISTICS_CARD_TAB: Record<StatisticsNavigationCard, StatisticsDataTab> =
	{
		folders: 'files',
		files: 'files',
		props: 'props',
		values: 'props',
		tags: 'tags',
		words: 'content',
		tasks: 'content',
		'opened-today': 'files',
	};

export function dataTabForStatisticsCard(
	card: StatisticsNavigationCard,
): StatisticsDataTab {
	return STATISTICS_CARD_TAB[card];
}
