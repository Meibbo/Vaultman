import { describe, expect, it } from 'vitest';

import { resolveFabIndicator } from '../../src/logic/logicFabIndicator';

describe('resolveFabIndicator', () => {
	it('keeps normal filter counts when active filters still return files', () => {
		expect(
			resolveFabIndicator({
				badge: 'filters',
				filterRuleCount: 2,
				filterResultCount: 8,
				queuedCount: 0,
			}),
		).toEqual({ kind: 'count', count: 2 });
	});

	it('switches active filters to warning when they return zero files', () => {
		expect(
			resolveFabIndicator({
				badge: 'filters',
				filterRuleCount: 2,
				filterResultCount: 0,
				queuedCount: 0,
			}),
		).toEqual({ kind: 'warning' });
	});

	it('clears the filters indicator when active filters are removed', () => {
		expect(
			resolveFabIndicator({
				badge: 'filters',
				filterRuleCount: 0,
				filterResultCount: 0,
				queuedCount: 0,
			}),
		).toEqual({ kind: 'none' });
	});

	it('keeps queue badges independent from filter results', () => {
		expect(
			resolveFabIndicator({
				badge: 'queue',
				filterRuleCount: 3,
				filterResultCount: 0,
				queuedCount: 4,
				queueWarningCount: 0,
			}),
		).toEqual({ kind: 'count', count: 4 });
	});

	it('switches queue badges to warning when queued operations exceed risk thresholds', () => {
		expect(
			resolveFabIndicator({
				badge: 'queue',
				filterRuleCount: 0,
				filterResultCount: 0,
				queuedCount: 4,
				queueWarningCount: 2,
			}),
		).toEqual({ kind: 'warning' });
	});
});
