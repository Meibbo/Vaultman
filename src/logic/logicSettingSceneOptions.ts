/**
 * U130 spec-02: sección "Options" opt-in de settingScene (plugins).
 *
 * Dos capas, como el resto de la cascada:
 * - global: `settings.settingScene.showOptionsByDefault` (fallback; solo lo
 *   escribe la UI de Settings, nunca el toolbar ni la scene).
 * - per-instance per-scene: `SceneConfig.showOptionsOverride`
 *   (`inherit | show | plugins-only`, patrón U130-09). El menú del toolbar
 *   solo escribe ESTA capa y re-proyecta sin tocar otras instancias.
 *
 * La sección se proyecta como `node_group` "Options" tras los plugins con
 * término vacío y effective show. Su contenido viene de una fuente
 * declarativa (`OptionsSource`); sin fuente completa la sección se proyecta
 * vacía con estado explicativo, nunca con datos inventados. Con término de
 * búsqueda no vacío no se proyecta nada (spec-01 intacto).
 */

/** Override per-instance per-scene de la sección Options. */
export const SHOW_OPTIONS_OVERRIDES = [
	'inherit',
	'show',
	'plugins-only',
] as const;
export type ShowOptionsOverride = (typeof SHOW_OPTIONS_OVERRIDES)[number];

/** Normaliza el override; lo desconocido/ausente hereda del global. */
export function normalizeShowOptionsOverride(
	value: unknown,
): ShowOptionsOverride {
	return value === 'show' || value === 'plugins-only' || value === 'inherit'
		? value
		: 'inherit';
}

/**
 * Effective show: `show` fuerza visible, `plugins-only` fuerza solo-plugins,
 * `inherit` (o ausente) cae al global `showOptionsByDefault`.
 */
export function resolveShowOptionsSection(input: {
	showOptionsByDefault?: boolean;
	override?: ShowOptionsOverride | null;
}): boolean {
	const override = normalizeShowOptionsOverride(input.override ?? 'inherit');
	if (override === 'show') return true;
	if (override === 'plugins-only') return false;
	return input.showOptionsByDefault === true;
}

/** Id estable de la sección Options (top-level, tras los plugins). */
export const OPTIONS_SECTION_ID = 'options';

/** Prefijo de las filas hijas de la sección (entradas o estado). */
export const OPTIONS_ROW_PREFIX = 'options:';

/** Id de la fila de estado explicativo (fuente ausente: vacía, no inventada). */
export const OPTIONS_EMPTY_STATE_ROW_ID = 'options:empty-state';

/** Una entrada de la fuente declarativa de Options. */
export interface OptionsSourceEntry {
	id: string;
	label: string;
}

/**
 * Fuente declarativa de la sección. `null`/ausente = sin fuente completa en
 * este runtime: la sección se proyecta vacía con estado explicativo.
 */
export type OptionsSource = readonly OptionsSourceEntry[] | null | undefined;

export type OptionsSectionStatus =
	| 'hidden'
	| 'search-active'
	| 'ready'
	| 'source-missing';

export interface OptionsSectionRow {
	id: string;
	label: string | null;
	/** `true` solo en la fila de estado explicativo (no es un dato). */
	stateRow: boolean;
}

export interface OptionsSection {
	visible: boolean;
	status: OptionsSectionStatus;
	/** Siempre `OPTIONS_SECTION_ID`; solo presente cuando visible. */
	id: string | null;
	/** Hijos: entradas de la fuente o la fila de estado explicativo. */
	rows: readonly OptionsSectionRow[];
}

/**
 * Proyecta la sección Options. Pura y testeable: el container la mapea a
 * `TreeNode` y la añade tras los plugins.
 *
 * - `searchActive` (término no vacío) → invisible (spec-01 intacto).
 * - sin effective show → invisible.
 * - con effective show y fuente → hijos = entradas (copia, nunca referencia).
 * - con effective show y sin fuente → un hijo de estado explicativo
 *   (`label: null`; el container pone el texto), nunca datos inventados.
 */
export function projectOptionsSection(input: {
	searchActive: boolean;
	effectiveShow: boolean;
	source: OptionsSource;
}): OptionsSection {
	if (input.searchActive) {
		return { visible: false, status: 'search-active', id: null, rows: [] };
	}
	if (!input.effectiveShow) {
		return { visible: false, status: 'hidden', id: null, rows: [] };
	}
	const entries = input.source ?? null;
	if (!entries || entries.length === 0) {
		return {
			visible: true,
			status: 'source-missing',
			id: OPTIONS_SECTION_ID,
			rows: [
				{ id: OPTIONS_EMPTY_STATE_ROW_ID, label: null, stateRow: true },
			],
		};
	}
	return {
		visible: true,
		status: 'ready',
		id: OPTIONS_SECTION_ID,
		rows: entries.map((entry) => ({
			id: `${OPTIONS_ROW_PREFIX}${entry.id}`,
			label: entry.label,
			stateRow: false,
		})),
	};
}

export interface ShowOptionsMenuItem {
	value: ShowOptionsOverride;
	/** `true` en el override activo; `inherit` además sigue al global. */
	checked: boolean;
	/** Solo `inherit`: su efecto visible lo decide el global. */
	followsGlobal: boolean;
}

/**
 * Modelo del menú del toolbar (3 estados). El menú solo propone el override;
 * quien lo ejecuta escribe SOLO `SceneConfig.showOptionsOverride` de esta
 * scene de esta instancia (commit por el port + re-proyección local).
 */
export function describeShowOptionsMenu(input: {
	override?: ShowOptionsOverride | null;
}): readonly ShowOptionsMenuItem[] {
	const active = normalizeShowOptionsOverride(input.override ?? 'inherit');
	return SHOW_OPTIONS_OVERRIDES.map((value) => ({
		value,
		checked: value === active,
		followsGlobal: value === 'inherit',
	}));
}

/** Id de acción del catálogo para cada estado (`view_menu.options.<estado>`). */
export function showOptionsMenuActionId(value: ShowOptionsOverride): string {
	return `view_menu.options.${value}`;
}

/** Acción del catálogo → override; `null` si no es del menú Options. */
export function showOptionsOverrideForMenuAction(
	actionId: string,
): ShowOptionsOverride | null {
	for (const value of SHOW_OPTIONS_OVERRIDES) {
		if (actionId === showOptionsMenuActionId(value)) return value;
	}
	return null;
}
