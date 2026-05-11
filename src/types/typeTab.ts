/**
 * Centralized UI shell config: tab definitions for the Filters page.
 * `navbarPages.svelte` consumes this via props (kept agnostic, see A.4.2).
 */
export interface TabConfig {
	id: string;
	icon: string;
	labelKey?: string;
	label?: string;
}

export const FTabs: TabConfig[] = [
	{
		id: 'props',
		icon: 'lucide-book-plus',
		labelKey: 'filter.tab.props',
	},
	{
		id: 'files',
		icon: 'lucide-files',
		labelKey: 'filter.tab.files',
	},
	{
		id: 'tags',
		icon: 'lucide-tags',
		labelKey: 'filter.tab.tags',
	},
	{
		id: 'content',
		icon: 'lucide-text-cursor-input',
		labelKey: 'filter.tab.content',
	},
	{
		id: 'outline',
		icon: 'lucide-list-tree',
		labelKey: 'filter.tab.outline',
	},
] as const;

export type FilTab = (typeof FTabs)[number]['id'];

export const TTabs: TabConfig[] = [
	{
		id: 'linter',
		labelKey: 'ops.tabs.linter',
		icon: 'lucide-sparkles',
	},
	{
		id: 'template',
		labelKey: 'ops.tabs.template',
		icon: 'lucide-layout-template',
	},
	{
		id: 'importer',
		labelKey: 'ops.tabs.importer',
		icon: 'lucide-import',
	},
	{
		id: 'file_diff',
		labelKey: 'ops.tabs.file_diff',
		icon: 'lucide-diff',
	},
	{
		id: 'layout',
		labelKey: 'ops.tabs.layout',
		icon: 'lucide-layout',
	},
	{
		id: 'snippets',
		labelKey: 'ops.tabs.snippets',
		icon: 'lucide-paintbrush',
	},
	{
		id: 'plugins',
		labelKey: 'ops.tabs.plugins',
		icon: 'lucide-plug',
	},
	{
		id: 'ops_log',
		labelKey: 'tools.ops_log.title',
		icon: 'lucide-activity',
	},
];

export type OpsTab = (typeof TTabs)[number]['id'];
