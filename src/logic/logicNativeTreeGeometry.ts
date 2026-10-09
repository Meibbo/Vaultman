/** Native full-width file rows and their ancestor guide metrics. */
export function syncNativeTreeIndentation(container: HTMLElement, compatible: boolean): void {
	const properties = ['--vaultman-tree-indent-unit', '--vaultman-tree-guide-start', '--vaultman-native-self-padding-start', '--vaultman-native-self-min-height', '--vaultman-native-flat-file-color'] as const;
	if (!compatible) {
		for (const property of properties) container.style.removeProperty(property);
		return;
	}
	const doc = container.ownerDocument;
	const root = doc?.querySelector('.nav-files-container:not(.vaultman-tree-virtual-viewport) > div > .nav-folder');
	const title = root?.querySelector(':scope > .nav-folder-title');
	const children = root?.querySelector(':scope > .tree-item-children');
	const win = doc?.defaultView;
	if (!title || !win) return;
	// Read once per render/theme invalidation, never per row or scroll.
	const titleStyle = win.getComputedStyle(title);
	const containerStyle = win.getComputedStyle(container);
	container.style.setProperty(properties[4], containerStyle.getPropertyValue('--nav-item-color') || containerStyle.color);
	const childStyle = children ? win.getComputedStyle(children) : null;
	// Collapsed native folders may detach their children element. The native
	// ancestry tokens still describe the missing structural box accurately.
	const margin = Number.parseFloat(childStyle?.marginInlineStart ?? titleStyle.getPropertyValue('--nav-item-children-margin-start')) || 0;
	const padding = Number.parseFloat(childStyle?.paddingInlineStart ?? titleStyle.getPropertyValue('--nav-item-children-padding-start')) || 0;
	const border = Number.parseFloat(childStyle?.borderInlineStartWidth || childStyle?.borderInlineStart || titleStyle.getPropertyValue('--nav-indentation-guide-width')) || 0;
	container.style.setProperty(properties[0], `${margin + padding + border}px`);
	container.style.setProperty(properties[1], `${margin}px`);
	container.style.setProperty(properties[2], titleStyle.paddingInlineStart);
	let contentHeight = Number.parseFloat(titleStyle.lineHeight) || 0;
	for (const element of title.querySelectorAll(':scope > :not(.tree-item-inner):not(.collapse-icon)')) {
		const style = win.getComputedStyle(element);
		const height = (Number.parseFloat(style.height) || 0) + (style.boxSizing === 'border-box' ? 0 :
			(Number.parseFloat(style.paddingBlockStart) || 0) + (Number.parseFloat(style.paddingBlockEnd) || 0) +
			(Number.parseFloat(style.borderBlockStartWidth) || 0) + (Number.parseFloat(style.borderBlockEndWidth) || 0));
		contentHeight = Math.max(contentHeight, height);
	}
	const baseline = contentHeight + (Number.parseFloat(titleStyle.paddingBlockStart) || 0) + (Number.parseFloat(titleStyle.paddingBlockEnd) || 0);
	container.style.setProperty(properties[3], `${baseline}px`);
}

/** Folder identity is semantic, not the presence of a caret/expanded children. */
export function hasNativeFolderIdentity(meta: unknown): boolean {
	return meta !== null && typeof meta === 'object' && 'isFolder' in meta && meta.isFolder === true;
}
