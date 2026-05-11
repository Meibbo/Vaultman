export type FiltersSearchTab = 'props' | 'files' | 'tags' | 'content' | 'outline';

export type FiltersSearchHistoryState = Record<FiltersSearchTab, string[]>;

export type FiltersSearchState = Record<FiltersSearchTab, string> & {
	history: FiltersSearchHistoryState;
};

export function createFiltersSearchState(): FiltersSearchState {
	return {
		props: '',
		files: '',
		tags: '',
		content: '',
		outline: '',
		history: {
			props: [],
			files: [],
			tags: [],
			content: [],
			outline: [],
		},
	};
}

export function getFiltersSearch(
	state: Partial<Record<FiltersSearchTab, string>>,
	tab: FiltersSearchTab,
): string {
	return state[tab] ?? '';
}

export function setFiltersSearch(
	state: Partial<FiltersSearchState>,
	tab: FiltersSearchTab,
	term: string,
): FiltersSearchState {
	const normalized = normalizeFiltersSearchState(state);
	return {
		...normalized,
		[tab]: term,
	};
}

export function getFiltersSearchHistory(
	state: Partial<FiltersSearchState>,
	tab: FiltersSearchTab,
): string[] {
	return normalizeFiltersSearchState(state).history[tab];
}

export function addFiltersSearchHistory(
	state: Partial<FiltersSearchState>,
	tab: FiltersSearchTab,
	term: string,
): FiltersSearchState {
	const normalized = normalizeFiltersSearchState(state);
	const trimmed = term.trim();
	if (!trimmed) return normalized;

	const previous = normalized.history[tab].filter((entry) => entry !== trimmed);
	return {
		...normalized,
		history: {
			...normalized.history,
			[tab]: [trimmed, ...previous].slice(0, 3),
		},
	};
}

function normalizeFiltersSearchState(state: Partial<FiltersSearchState>): FiltersSearchState {
	const defaults = createFiltersSearchState();
	return {
		...defaults,
		...state,
		history: {
			...defaults.history,
			...state.history,
		},
	};
}
