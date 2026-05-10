import type {
	IActiveFiltersIndex,
	ActiveFilterEntry,
	IFilterService,
} from '../types/typeContracts';
import type { FilterGroup, FilterRule } from '../types/typeFilter';
import { createNodeIndex } from './indexNodeCreate';

function flatten(group: FilterGroup): ActiveFilterEntry[] {
	const out: ActiveFilterEntry[] = [];
	let generatedId = 0;
	const walk = (g: FilterGroup, depth = 0): void => {
		for (const child of g.children) {
			if (child.type === 'rule') {
				out.push({
					id: child.id ?? `rule-${generatedId++}`,
					kind: 'rule',
					rule: child,
					parent: g,
					depth,
					source: 'tree',
				});
			} else if (isVisibleGroup(child)) {
				out.push({
					id: child.id ?? `group-${generatedId++}`,
					kind: 'group',
					group: child,
					parent: g,
					depth,
					source: 'tree',
				});
				walk(child, depth + 1);
			} else {
				walk(child, depth);
			}
		}
	};
	walk(group);
	return out;
}

export function createActiveFiltersIndex(filter: IFilterService): IActiveFiltersIndex {
	const base = createNodeIndex<ActiveFilterEntry>({
		debugName: 'activeFilters',
		build: () => {
			const treeRules = flatten(filter.activeFilter);
			const searchRules = getSearchRules(filter).map((rule, i) => ({
				id: rule.id ?? `search-rule-${i}`,
				kind: 'rule' as const,
				rule,
				source: 'search' as const,
				depth: 0,
			}));
			return [...treeRules, ...searchRules];
		},
	});
	filter.subscribe(() => {
		void base.refresh();
	});
	return base;
}

function getSearchRules(filter: IFilterService): FilterRule[] {
	return filter.getSearchFilterRules?.() ?? [];
}

function isVisibleGroup(group: FilterGroup): boolean {
	return group.id !== 'root';
}
