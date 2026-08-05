export type InteractionTab = 'files' | 'props' | 'tags' | 'snippets' | 'plugins';
export type InteractionMode = 'open' | 'filter' | 'add' | 'select';
export type InteractionAction =
	| 'open'
	| 'expand'
	| 'filter'
	| 'add'
	| 'select'
	| 'content-search';

export const DEFAULT_INTERACTION_MODE: Record<InteractionTab, InteractionMode> =
	{
		files: 'open',
		props: 'filter',
		tags: 'filter',
		snippets: 'open',
		plugins: 'open',
	};

const INTERACTION_MODES: Record<InteractionTab, readonly InteractionMode[]> = {
	files: ['open', 'filter', 'add', 'select'],
	props: ['open', 'filter', 'add', 'select'],
	tags: ['open', 'filter', 'add', 'select'],
	snippets: ['open', 'select'],
	plugins: ['open', 'select'],
};

export function interactionModesForTab(
	tab: InteractionTab,
): readonly InteractionMode[] {
	return INTERACTION_MODES[tab];
}

export function normalizeInteractionMode(
	tab: InteractionTab,
	mode: string | null | undefined,
): InteractionMode {
	return INTERACTION_MODES[tab].includes(mode as InteractionMode)
		? (mode as InteractionMode)
		: DEFAULT_INTERACTION_MODE[tab];
}

export function resolveInteractionAction(
	tab: InteractionTab,
	mode: string | null | undefined,
	modified: boolean,
): InteractionAction {
	const normalized = normalizeInteractionMode(tab, mode);
	if (tab === 'files' || tab === 'snippets' || tab === 'plugins') {
		return normalized;
	}
	if (normalized === 'open') return modified ? 'content-search' : 'expand';
	return normalized;
}
