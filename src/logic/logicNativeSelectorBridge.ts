import type { NativeCompatBoundary, NativeSceneId } from './logicNativeTreeCompat';

export interface NativeBridgeAlias {
	readonly hostSelector: string;
	readonly aliasSelector: string;
}

export const NATIVE_BRIDGE_HOSTS: Readonly<Record<NativeSceneId, readonly string[]>> = {
	files: ['file-explorer'], tags: ['tag'], props: ['all-properties'],
	snippets: ['settings'], plugins: ['settings'],
};

/** Split only at selector-list commas, not functional/attribute arguments. */
export function selectorList(text: string): string[] {
	const result: string[] = [];
	let start = 0;
	let depth = 0;
	let quote = '';
	let escaped = false;
	for (let index = 0; index < text.length; index += 1) {
		const char = text[index];
		if (escaped) { escaped = false; continue; }
		if (char === '\\') { escaped = true; continue; }
		if (quote) { if (char === quote) quote = ''; continue; }
		if (char === '"' || char === "'") { quote = char; continue; }
		if (char === '(' || char === '[') depth += 1;
		if (char === ')' || char === ']') depth -= 1;
		if (char === ',' && depth === 0) { result.push(text.slice(start, index).trim()); start = index + 1; }
	}
	result.push(text.slice(start).trim());
	return result.filter(Boolean);
}

function boundaryFor(selector: string): NativeCompatBoundary {
	if (/\.(?:menu|menu-item)(?:[^\w-]|$)/.test(selector)) return 'menu';
	if (/\.(?:nav-header|nav-buttons-container|nav-action-button)(?:[^\w-]|$)/.test(selector)) return 'toolbar';
	if (/\.(?:tree-item|nav-file|nav-folder|tag-pane-tag|setting-item)(?:[-\w]*)(?:[^\w-]|$)/.test(selector)) return 'tree';
	return 'container';
}

/** :where adds a participation gate without changing native specificity. */
export function gateSubject(selector: string, scene: NativeSceneId): string {
	const boundary = boundaryFor(selector);
	const root = `[data-vaultman-native-scene="${scene}"].vaultman-native-${boundary}-compat`;
	const gate = `:where(${root}, ${root} *)`;
	const pseudo = selector.search(/::[\w-]+(?:\([^)]*\))?\s*$/);
	return pseudo < 0 ? selector + gate : selector.slice(0, pseudo) + gate + selector.slice(pseudo);
}

export function bridgeAliasForSelector(
	selector: string,
	nativeScene: NativeSceneId,
	hostType = NATIVE_BRIDGE_HOSTS[nativeScene][0],
): NativeBridgeAlias | null {
	if (!hostType) return null;
	let matched = false;
	let alias = selector.trim().replace(
		/\[data-type\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\]\s]+))\s*\]/g,
		(original: string, double: string | undefined, single: string | undefined, plain: string | undefined) => {
			if ((double ?? single ?? plain) !== hostType) return original;
			matched = true;
			return `[data-vaultman-native-type="${hostType}"]`;
		},
	);
	if (hostType === 'settings') {
		alias = alias.replace(/\.modal-container\s+(?=\.modal\.mod-settings)/g, '.workspace-leaf ');
		alias = alias.replace(/\.modal\.mod-settings\b/g, () => {
			matched = true;
			return '.workspace-leaf-content[data-vaultman-native-type="settings"]';
		});
		alias = alias.replace(/\.mod-settings\b/g, () => {
			matched = true;
			return '[data-vaultman-native-type="settings"]';
		});
	}
	if (matched && boundaryFor(alias) === 'menu') {
		// Native menus are portals too: the invoking scene supplies the host
		// metadata on the menu root rather than borrowing the active leaf.
		alias = alias.replace(/\.workspace-leaf-content(?=\[data-vaultman-native-type)/g, '.vaultman-native-menu-host');
		alias = alias.replace(/(\[data-vaultman-native-type="[^"]+"\])\s+(?=\.menu(?:[^\w-]|$))/g, '$1');
	}
	return matched ? { hostSelector: selector, aliasSelector: gateSubject(alias, nativeScene) } : null;
}

export function bridgeAliasesForRule(selectorText: string, nativeScene: NativeSceneId): string | null {
	const aliases: string[] = [];
	for (const selector of selectorList(selectorText)) {
		const alias = bridgeAliasForSelector(selector, nativeScene);
		if (alias) aliases.push(alias.aliasSelector);
	}
	return aliases.length ? aliases.join(', ') : null;
}
