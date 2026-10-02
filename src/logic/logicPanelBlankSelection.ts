export function isBlankPanelSelectionTarget(target: Element): boolean {
	if (!target.closest('.vaultman-panel-widget-host, .vaultman-sasi-apiscene, .vaultman-page[data-page="filters"]')) return false;
	return target.closest(
		'[data-id], [data-panel-widget-node-id], .vaultman-tree-row, .vaultman-grid-card, button, input, textarea, select, a, [role="button"], [contenteditable="true"]',
	) === null;
}
