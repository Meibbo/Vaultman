import settingsSource from '../../src/VaultmanSettings.ts?raw';

/**
 * U121-029: the settings tab is declarative — `getSettingDefinitions()` returns
 * the tree and Obsidian 1.13 renders and indexes it. The source guards used to
 * anchor on the imperative `display*(containerEl)` methods; they anchor on the
 * private builders now. Keep these in sync with VaultmanSettings.ts.
 */
export const ROOT = 'private getRootItems(): SettingDefinitionItem[]';
export const FILTER_TEMPLATES =
	'private getFilterTemplateItems(): SettingDefinitionItem[]';
export const TOOLBAR_PAGE =
	'private getToolbarPageItems(): SettingDefinitionItem[]';
export const TOOLBAR_COMMANDS =
	'private getToolbarCommandActionsItems(): SettingDefinitionItem[]';
export const EXPLORER_PAGE =
	'private getExplorerPageItems(): SettingDefinitionItem[]';
export const CONTEXT_MENUS_PAGE =
	'private getContextMenusPageItems(): SettingDefinitionItem[]';
export const FILES_HOVER_PAGE =
	'private getFilesHoverPageItems(): SettingDefinitionItem[]';
export const FLOATING_TOC_PAGE =
	'private getFloatingTocPageItems(): SettingDefinitionItem[]';

/**
 * The slice of the settings source between two anchors. Throws when an anchor
 * is missing or out of order, so a renamed builder fails loudly here instead of
 * silently emptying the slice and passing every `not.toContain` in the guard.
 */
export function sliceBetween(start: string, end?: string): string {
	const from = settingsSource.indexOf(start);
	if (from === -1)
		throw new Error(`settings source anchor not found: ${start}`);
	if (end === undefined) return settingsSource.slice(from);
	const to = settingsSource.indexOf(end);
	if (to === -1) throw new Error(`settings source anchor not found: ${end}`);
	if (to <= from) {
		throw new Error(`settings source anchors out of order: ${start} -> ${end}`);
	}
	return settingsSource.slice(from, to);
}
