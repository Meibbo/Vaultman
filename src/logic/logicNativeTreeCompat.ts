/**
 * U130 native polish: homologous native anatomy per scene plus the
 * compatible/locked policy per boundary.
 *
 * Native classes are emitted only on homologous elements — never by forging a
 * Files view or changing the workspace `data-type`. `locked` disables the
 * compatibility bridge for that boundary; it is NOT CSS isolation and cannot
 * block arbitrary selectors that target Vaultman explicitly. `isolated` is
 * deferred and must not appear as an implemented option.
 */

import type { ExplorerTabId } from '../types/typeUI';
export { bridgeAliasForSelector, bridgeAliasesForRule, NATIVE_BRIDGE_HOSTS } from './logicNativeSelectorBridge';
export type { NativeBridgeAlias } from './logicNativeSelectorBridge';

/** Scenes with a native counterpart. `content` has none and stays unbridged. */
export type NativeSceneId = 'files' | 'tags' | 'props' | 'snippets' | 'plugins';

const NATIVE_SCENE_IDS: readonly NativeSceneId[] = [
	'files',
	'tags',
	'props',
	'snippets',
	'plugins',
];

export function toNativeSceneId(tab: ExplorerTabId | 'content'): NativeSceneId | null {
	// Both unions name the same five scenes; the runtime check guards
	// foreign callers, the return needs no assertion.
	if (tab === 'content' || !NATIVE_SCENE_IDS.includes(tab)) return null;
	return tab;
}

/** One boundary of the compatibility bridge. */
export type NativeCompatBoundary = 'tree' | 'toolbar' | 'container' | 'menu';

/** Per-boundary policy: `compatible` (default) or `locked`. */
export type NativeCompatMode = 'compatible' | 'locked';

export type NativeCompatPolicy = Readonly<
	Partial<Record<NativeCompatBoundary, NativeCompatMode>>
>;

export const NATIVE_COMPAT_BOUNDARIES: readonly NativeCompatBoundary[] = [
	'tree',
	'toolbar',
	'container',
	'menu',
];

export function isNativeCompatMode(value: unknown): value is NativeCompatMode {
	return value === 'compatible' || value === 'locked';
}

/** Sparse normalize: unknown modes/keys are dropped, sparseness preserved. */
export function normalizeNativeCompatPolicy(
	value: unknown,
): Record<string, NativeCompatMode> {
	if (typeof value !== 'object' || value === null) return {};
	const out: Record<string, NativeCompatMode> = {};
	for (const [key, mode] of Object.entries(value as Record<string, unknown>)) {
		if (!NATIVE_COMPAT_BOUNDARIES.includes(key as NativeCompatBoundary)) continue;
		if (!isNativeCompatMode(mode)) continue;
		out[key] = mode;
	}
	return out;
}

/** Effective mode for one boundary: scene override, else global, else compatible. */
export function resolveNativeCompatMode(
	boundary: NativeCompatBoundary,
	globalPolicy?: NativeCompatPolicy | null,
	scenePolicy?: NativeCompatPolicy | null,
): NativeCompatMode {
	const scene = scenePolicy?.[boundary];
	if (isNativeCompatMode(scene)) return scene;
	const global = globalPolicy?.[boundary];
	if (isNativeCompatMode(global)) return global;
	return 'compatible';
}

/**
 * Resolve the effective 4-boundary policy: scene wins per boundary, then
 * global, then `compatible`. Providers merge once per projection and hand
 * the same object to the tree, toolbar, container and menu hosts.
 */
export function resolveNativeCompatPolicy(
	globalPolicy?: NativeCompatPolicy | null,
	scenePolicy?: NativeCompatPolicy | null,
): Record<NativeCompatBoundary, NativeCompatMode> {
	return {
		tree: resolveNativeCompatMode('tree', globalPolicy, scenePolicy),
		toolbar: resolveNativeCompatMode('toolbar', globalPolicy, scenePolicy),
		container: resolveNativeCompatMode('container', globalPolicy, scenePolicy),
		menu: resolveNativeCompatMode('menu', globalPolicy, scenePolicy),
	};
}

/**
 * Apply one boundary of an effective policy to a host element as classes.
 * `compatible` exposes `vaultman-native-<boundary>-compat` (native selectors
 * match); `locked` exposes `vaultman-native-<boundary>-locked` (bridge off,
 * Vaultman styling retained). Pure DOM, no settings access.
 */
export function applyNativeCompatClasses(
	el: HTMLElement,
	boundary: NativeCompatBoundary,
	mode: NativeCompatMode,
): void {
	el.classList.remove(`vaultman-native-${boundary}-compat`);
	el.classList.remove(`vaultman-native-${boundary}-locked`);
	el.classList.add(`vaultman-native-${boundary}-${mode === 'compatible' ? 'compat' : 'locked'}`);
}

export function sameNativeCompatPolicy(
	a: NativeCompatPolicy | undefined,
	b: NativeCompatPolicy | undefined,
): boolean {
	for (const boundary of NATIVE_COMPAT_BOUNDARIES) {
		if (a?.[boundary] !== b?.[boundary]) {
			return false;
		}
	}
	return true;
}

/** Homologous native classes per scene. Verified against the live counterpart. */
export interface NativeTreeProfile {
	/** Container class on the scrollport (e.g. `nav-files-container`). */
	container: string;
	/** Native virtual lists place a leading spacer before their first root row. */
	rootLeadingSlots?: number;
	/** Row classes for parent/p-node rows. */
	parentRow: readonly string[];
	/** Row classes for leaf rows. */
	leafRow: readonly string[];
	/** Self classes for parent rows. */
	parentSelf: readonly string[];
	/** Self classes for leaf rows. */
	leafSelf: readonly string[];
	/** Inner label classes shared by both kinds. */
	labelInner: readonly string[];
	parentLabelInner?: readonly string[];
}

export const NATIVE_TREE_PROFILES: Readonly<Record<NativeSceneId, NativeTreeProfile>> = {
	files: {
		container: 'nav-files-container',
		rootLeadingSlots: 1,
		parentRow: ['tree-item', 'nav-folder'],
		leafRow: ['tree-item', 'nav-file'],
		parentSelf: ['tree-item-self', 'nav-folder-title', 'is-clickable'],
		leafSelf: ['tree-item-self', 'nav-file-title', 'tappable', 'is-clickable'],
		labelInner: ['tree-item-inner', 'nav-file-title-content'],
		parentLabelInner: ['tree-item-inner', 'nav-folder-title-content'],
	},
	tags: {
		container: 'tag-container',
		parentRow: ['tree-item'],
		leafRow: ['tree-item'],
		parentSelf: ['tree-item-self', 'tag-pane-tag'],
		leafSelf: ['tree-item-self', 'tag-pane-tag'],
		labelInner: ['tree-item-inner-text'],
	},
	props: {
		container: 'view-content',
		parentRow: ['tree-item'],
		leafRow: ['tree-item'],
		parentSelf: ['tree-item-self'],
		leafSelf: ['tree-item-self'],
		labelInner: ['tree-item-inner-text'],
	},
	snippets: {
		container: 'vertical-tab-content',
		parentRow: ['setting-item', 'setting-item-heading'],
		leafRow: ['setting-item'],
		parentSelf: ['setting-item-info'],
		leafSelf: ['setting-item-info'],
		labelInner: ['setting-item-name'],
	},
	plugins: {
		container: 'vertical-tab-content',
		parentRow: ['setting-item', 'setting-item-heading'],
		leafRow: ['setting-item'],
		parentSelf: ['setting-item-info'],
		leafSelf: ['setting-item-info'],
		labelInner: ['setting-item-name'],
	},
};
