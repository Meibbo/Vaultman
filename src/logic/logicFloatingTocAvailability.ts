export type FloatingTocToggleRejection = 'incompatible-sort' | null;

export interface FloatingTocToggleDecision {
	nextEnabled: boolean;
	rejection: FloatingTocToggleRejection;
}

export function isFloatingTocSortIndexable(
	tab: 'files' | 'props' | 'tags' | 'snippets' | 'plugins',
	sortBy: string,
): boolean {
	if (tab === 'snippets' || tab === 'plugins') return sortBy === 'name';
	return sortBy === 'name' || sortBy === 'path' || sortBy === 'ext';
}

export function resolveFloatingTocToggle(
	currentEnabled: boolean,
	indexableSort: boolean,
): FloatingTocToggleDecision {
	if (currentEnabled) {
		return { nextEnabled: false, rejection: null };
	}
	if (!indexableSort) {
		return { nextEnabled: false, rejection: 'incompatible-sort' };
	}
	return { nextEnabled: true, rejection: null };
}
