export type InteractionTab = 'files' | 'props' | 'tags' | 'snippets' | 'plugins';
export type InteractionMode = 'open' | 'filter' | 'add' | 'select';
export type InteractionAction =
	| 'open'
	| 'expand'
	| 'filter'
	| 'add'
	| 'select'
	| 'content-search';

/**
 * U130-06: las cinco pestanas arrancan en `open` (decision de producto del dev,
 * 2026-09-03). Es el SUELO de la cascada: solo se ve cuando el usuario no tiene
 * defecto persistido ni layout aplicado. La preferencia por pestana vive en
 * `defaultInteractionModeByTab` y gana a esta constante.
 */
export const DEFAULT_INTERACTION_MODE: Record<InteractionTab, InteractionMode> =
	{
		files: 'open',
		props: 'open',
		tags: 'open',
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

/**
 * U130-06: nivel intermedio de la cascada del modo de interaccion.
 *
 *   layout aplicado  ->  ESTE defecto persistido  ->  DEFAULT_INTERACTION_MODE
 *
 * `normalizeInteractionMode` hace de red: un modo guardado que la pestana no
 * admite —por corrupcion o porque una version futura cambio los modos validos—
 * cae al defecto de fabrica en vez de dejar la pestana en un estado imposible.
 */
export function resolveDefaultInteractionMode(
	tab: InteractionTab,
	persisted: Partial<Record<InteractionTab, InteractionMode>> | undefined,
	persistEnabled: boolean,
): InteractionMode {
	if (!persistEnabled) return DEFAULT_INTERACTION_MODE[tab];
	const stored = persisted?.[tab];
	if (!stored) return DEFAULT_INTERACTION_MODE[tab];
	return normalizeInteractionMode(tab, stored);
}

