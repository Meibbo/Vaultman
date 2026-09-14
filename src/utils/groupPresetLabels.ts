import { translate } from '../i18n/index';
import type { RangeLabels } from '../logic/logicGroupPresets';

/** The translated range labels the explorers hand to `projectGroupedTree`. */
export function translatedRangeLabels(): RangeLabels {
	return {
		span: (lo, hi) =>
			lo === hi
				? String(lo)
				: translate('explorer.group.range.span', { lo, hi }),
		recent: (days) =>
			days === 1
				? translate('explorer.group.range.today')
				: translate('explorer.group.range.last_days', { n: days }),
		daysAgo: (lo, hi) =>
			lo === hi
				? translate('explorer.group.range.day_ago', { n: lo })
				: translate('explorer.group.range.days_ago', { lo, hi }),
	};
}
