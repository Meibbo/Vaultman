export type FabBadgeType = 'queue' | 'filters' | undefined;

export type FabIndicator =
	| { kind: 'none' }
	| { kind: 'count'; count: number }
	| { kind: 'warning' };

export interface FabIndicatorInput {
	badge: FabBadgeType;
	queuedCount: number;
	filterRuleCount: number;
	filterResultCount: number;
}

export function resolveFabIndicator({
	badge,
	queuedCount,
	filterRuleCount,
	filterResultCount,
}: FabIndicatorInput): FabIndicator {
	if (badge === 'queue') {
		return queuedCount > 0 ? { kind: 'count', count: queuedCount } : { kind: 'none' };
	}
	if (badge === 'filters') {
		if (filterRuleCount <= 0) return { kind: 'none' };
		return filterResultCount === 0
			? { kind: 'warning' }
			: { kind: 'count', count: filterRuleCount };
	}
	return { kind: 'none' };
}
