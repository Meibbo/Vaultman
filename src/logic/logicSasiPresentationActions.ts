import type { SasiRegistry } from './logicSasiRegistry';
import type { SceneConfig, SceneDefinitionId } from '../types/typeInstance';
import type { ExplorerViewMode } from '../types/typeUI';
import { EXPLORER_CELL_DEFS } from './logicCellRegistry';
import {
	NATIVE_COMPAT_BOUNDARIES,
	type NativeCompatBoundary,
	type NativeCompatMode,
} from './logicNativeTreeCompat';
import type { TextCaseOption } from './logicTextCaseProjection';

export const PRESENTATION_ACTION_SCOPE = 'this.instance → file.scene';
export const PRESENTATION_SCENE_IDS = [
	'files', 'props', 'tags', 'snippets', 'plugins',
] as const satisfies readonly SceneDefinitionId[];

export type ScenePresentationAction =
	| { kind: 'text-case'; mode: TextCaseOption }
	| { kind: 'native-compat'; boundary: NativeCompatBoundary; mode: NativeCompatMode };

export function isPresentationSceneId(value: string): value is SceneDefinitionId {
	return (PRESENTATION_SCENE_IDS as readonly string[]).includes(value);
}

const TEXT_CASE_MODES: readonly TextCaseOption[] = [
	'provided', 'lowercase', 'titlecase', 'uppercase',
];
const NATIVE_COMPAT_MODES: readonly NativeCompatMode[] = ['compatible', 'locked'];

export function parseScenePresentationAction(
	actionId: string,
): ScenePresentationAction | null {
	const textCasePrefix = 'vaultman.scene.text-case.';
	if (actionId.startsWith(textCasePrefix)) {
		const mode = actionId.slice(textCasePrefix.length);
		return TEXT_CASE_MODES.includes(mode as TextCaseOption)
			? { kind: 'text-case', mode: mode as TextCaseOption }
			: null;
	}

	const compatPrefix = 'vaultman.scene.native-compat.';
	if (actionId.startsWith(compatPrefix)) {
		const [boundary, mode, ...extra] = actionId.slice(compatPrefix.length).split('.');
		if (
			extra.length === 0 &&
			NATIVE_COMPAT_BOUNDARIES.includes(boundary as NativeCompatBoundary) &&
			NATIVE_COMPAT_MODES.includes(mode as NativeCompatMode)
		) {
			return {
				kind: 'native-compat',
				boundary: boundary as NativeCompatBoundary,
				mode: mode as NativeCompatMode,
			};
		}
	}
	return null;
}

/** Apply an action to the sparse layer for this instance's active scene. */
export function applyScenePresentationAction(
	layer: SceneConfig,
	scene: SceneDefinitionId,
	action: ScenePresentationAction,
	viewMode?: ExplorerViewMode,
): SceneConfig {
	if (action.kind === 'native-compat') {
		return {
			...layer,
			nativeCompat: { ...layer.nativeCompat, [action.boundary]: action.mode },
		};
	}

	const textCells = EXPLORER_CELL_DEFS
		.filter(
			(definition) =>
				(definition.role === 'identity' || definition.role === 'label-projection') &&
				definition.supports.some(
					(support) =>
						support.explorer === scene &&
						(!viewMode || !support.viewModes || support.viewModes.includes(viewMode)),
				),
		)
		.map((definition) => definition.id);
	const textCase = { ...layer.textCase };
	for (const cellId of textCells) textCase[cellId] = action.mode;
	return { ...layer, textCase };
}

/** Register scoped actions only; they are not Obsidian palette commands. */
export function registerPresentationActions(registry: SasiRegistry): void {
	for (const mode of ['provided', 'lowercase', 'titlecase', 'uppercase'] as const) {
		registry.register({
			id: `vaultman.scene.text-case.${mode}`,
			axis: 'function', kind: 'action',
			labelKey: `settings.text_case.${mode}`,
			icon: 'lucide-case-sensitive',
			supports: [{ surface: 'panelWidget' }],
			scope: PRESENTATION_ACTION_SCOPE,
		});
	}
	for (const boundary of NATIVE_COMPAT_BOUNDARIES) {
		for (const mode of ['compatible', 'locked'] as const) {
			registry.register({
				id: `vaultman.scene.native-compat.${boundary}.${mode}`,
				axis: 'function', kind: 'action',
				labelKey: `sasi.presentation.${boundary}.${mode}`,
				icon: 'lucide-paintbrush',
				supports: [{ surface: 'panelWidget' }],
				scope: PRESENTATION_ACTION_SCOPE,
			});
		}
	}
}
