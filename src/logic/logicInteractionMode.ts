export type InteractionTab = 'files' | 'props' | 'tags';
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
	};

const INTERACTION_MODES: Record<InteractionTab, readonly InteractionMode[]> = {
	files: ['open', 'add', 'select'],
	props: ['open', 'filter', 'add'],
	tags: ['open', 'filter', 'add'],
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
	if (tab === 'files') return normalized as 'open' | 'add' | 'select';
	if (normalized === 'open') return modified ? 'content-search' : 'expand';
	return normalized as 'filter' | 'add';
}
