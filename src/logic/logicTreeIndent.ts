export interface TreeIndentSettings {
	treeIndentUnit?: number;
}

export interface TreeIndentStyleTarget {
	setProperty(name: string, value: string): void;
}

/** Default tree indent step in px (matches the stylesheet default). */
export const DEFAULT_TREE_INDENT_UNIT = 16;

/** Apply the tree indent step without mutating the stored value. */
export function applyTreeIndentUnit(
	style: TreeIndentStyleTarget,
	settings: TreeIndentSettings,
): void {
	const px =
		typeof settings.treeIndentUnit === 'number' &&
		Number.isFinite(settings.treeIndentUnit)
			? settings.treeIndentUnit
			: DEFAULT_TREE_INDENT_UNIT;
	style.setProperty('--vaultman-tree-indent-unit', `${px}px`);
}
