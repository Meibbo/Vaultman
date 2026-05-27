export const en: Record<string, string> = {
	// General
	'plugin.name': 'Vaultman',
	'plugin.sidebar_name': 'Vaultman Sidebar',
	'plugin.frame_name': 'Vaultman Explorer',
	'plugin.name_explorer': 'Vaultman Explorer',
	'plugin.description': 'Bulk property editor and vault management tool',
	'plugin.open': 'Open Vaultman',

	// Sections
	'section.filters': 'Filters',
	'section.files': 'Files',
	'section.operations': 'Operations',

	// Filter types
	'filter.has_property': 'Has property',
	'filter.missing_property': 'Missing property',
	'filter.specific_value': 'Specific value',
	'filter.multiple_values': 'Multiple values',
	'filter.folder': 'In folder',
	'filter.folder_exclude': 'Exclude folder',
	'filter.file_name': 'File name contains',
	'filter.file_name_exclude': 'File name excludes',

	// Filter logic
	'filter.logic.all': 'ALL (AND)',
	'filter.logic.any': 'ANY (OR)',
	'filter.logic.none': 'NONE (NOT)',

	// Filter actions
	'filter.add_rule': 'Add filter',
	'filter.add_group': 'Add group',
	'filter.clear': 'Clear filters',
	'filter.template': 'Template',
	'filter.template.save': 'Save template',
	'filter.template.delete': 'Delete template',
	'filter.template.none': 'No template',
	'filter.template.load': 'Load',
	'filter.refresh': 'Refresh',

	// File list
	'files.search': 'Search files...',
	'files.select_all': 'Select all',
	'files.select_none': 'Deselect all',
	'files.show_checked_only': 'Show only checked files',
	'files.count': '{filtered} / {total} files',
	'files.col.name': 'Name',
	'files.col.props': '# Props',
	'files.col.path': 'Path',

	// Operations
	'ops.properties': 'Properties',
	'ops.tools': 'Tools',
	'ops.queue': 'Queue ({count} pending)',
	'ops.queue.empty': 'Queue (empty)',
	'ops.apply': 'Apply',
	'ops.clear': 'Clear queue',
	'ops.details': 'View details',

	// Property manager
	'prop.title': 'Property Manager',
	'prop.scope': 'Scope',
	'prop.scope.filtered': 'All filtered files',
	'prop.scope.selected': 'Selected files only',
	'prop.property': 'Property',
	'prop.value': 'Value',
	'prop.action': 'Action',
	'prop.action.set': 'Set / Create',
	'prop.action.rename': 'Rename',
	'prop.action.delete': 'Delete',
	'prop.action.clean': 'Clean empty',
	'prop.action.change_type': 'Change type',
	'prop.action.add': 'Add',
	'prop.type': 'Type',
	'prop.type.text': 'Text',
	'prop.type.number': 'Number',
	'prop.type.checkbox': 'Checkbox',
	'prop.type.list': 'List',
	'prop.type.date': 'Date',
	'prop.type.wikilink': 'Wikilink [[]]',
	'prop.option.wikilink': 'Format as [[wikilink]]',
	'prop.option.append': 'Append to list',
	'prop.option.replace': 'Replace value',
	'prop.add_to_queue': 'Add to queue',
	'prop.new_name': 'New name',
	'prop.option.native_rename': 'Global Vault Rename (Native)',
	'prop.option.native_rename_desc': 'Use Obsidian\'s internal core engine to rename this property across the whole vault. This is faster for large datasets.',

	// Queue island
	'queue.island.pending': 'pending changes',
	'queue.island.empty': 'Queue is empty',

	// Queue details
	'queue.title': 'Queue Details',
	'queue.file': 'File',
	'queue.action': 'Action',
	'queue.before': 'Before',
	'queue.after': 'After',
	'queue.confirm': 'Apply all changes?',
	'queue.show_unchanged': 'Show unchanged properties',

	// Results
	'result.applying': 'Applying changes…',
	'result.success': '{count} files updated successfully',
	'result.errors': '{count} errors occurred',
	'result.no_changes': 'No changes to apply',

	// Settings
	'settings.language': 'Language',
	'settings.language.desc': 'Interface language',
	'settings.default_type': 'Default property type',
	'settings.default_type.desc': 'Default type for new properties',
	'settings.templates': 'Filter templates',
	'settings.templates.desc': 'Manage saved filter templates',

	// Main view
	'view.main.title': 'Vaultman',
	'command.open_main': 'Open Vaultman (full view)',
	'command.open_sidebar': 'Open Vaultman sidebar',
	'command.apply_queue': 'Apply pending operations',

	// Toolbar
	'toolbar.filters': 'Filters',
	'toolbar.queue': 'Queue',
	'toolbar.navigation': 'Bottom navigation',
	'toolbar.no_session': 'No session',
	'toolbar.new_session': '+ New session...',

	// Session
	'session.create': 'Create session',
	'session.name': 'Session name',
	'session.synced': 'Synced',
	'session.outdated': 'File changed externally',
	'session.conflict': 'Google Drive conflict detected',

	// Status bar
	'statusbar.files': '{count} files',
	'statusbar.filtered_label': '{count} filtered',
	'statusbar.selected': '{count} selected',
	'statusbar.pending': '{count} pending',

	// Linter
	'linter.title': 'Property Linter',
	'linter.description': 'Reorder YAML properties using obsidian-linter.',
	'linter.not_installed': 'obsidian-linter plugin is not installed. Please install it to use this feature.',
	'linter.scope': 'Scope',
	'linter.add_property': 'Add property to order...',
	'linter.save_order': 'Save order',
	'linter.apply': 'Apply linting',
	'linter.order_saved': 'Priority order saved to linter config',
	'linter.save_error': 'Failed to save linter config',
	'linter.applying': 'Linting files',
	'linter.done': 'Linting complete',
	'linter.button': 'Linter',

	// File Rename
	'rename.title': 'Rename Files',
	'rename.pattern': 'Pattern',
	'rename.pattern_desc': 'Use placeholders: {basename}, {date}, {counter}, {property}',

	// Status bar (extended)
	'statusbar.props_label': '{count} props',
	'statusbar.values_label': '{count} values',

	// Property Explorer
	'explorer.title': 'Properties',
	'explorer.search': 'Search properties...',
	'explorer.empty': 'No properties found',
	'explorer.toggle': 'Explorer',

	// Explorer nav buttons
	'explorer.btn.search': 'Search',
	'explorer.btn.filter': 'Filter',
	'explorer.btn.sort': 'Sort',
	'explorer.btn.create': 'Create property',

	// Explorer filter scopes
	'explorer.filter.all_vault': 'All vault',
	'explorer.filter.filtered': 'Filtered files',
	'explorer.filter.selected': 'Selected files',
	'explorer.filter.by_type': 'By type',

	// Explorer sort
	'explorer.sort.alpha': 'Alphabetical',
	'explorer.sort.count': 'By occurrence',
	'explorer.sort.type': 'By type',
	'explorer.sort.values': 'By number of values',

	// Explorer context menu — properties
	'explorer.ctx.rename': 'Rename',
	'explorer.ctx.type': 'Property type',
	'explorer.ctx.delete_prop': 'Delete property',
	'explorer.ctx.add_value': 'Add value',

	// Explorer context menu — values
	'explorer.ctx.move_value': 'Move to property...',
	'explorer.ctx.convert': 'Convert',
	'explorer.ctx.delete_value': 'Delete value',

	// Explorer convert submenu
	'explorer.ctx.wikilink': 'To [[wikilink]]',
	'explorer.ctx.wikilink_alias': 'To [[note|alias]]',
	'explorer.ctx.md_link': 'To [alias](note)',
	'explorer.ctx.uppercase': 'UPPERCASE',
	'explorer.ctx.lowercase': 'lowercase',
	'explorer.ctx.capitalize': 'First Letter Case',
	'explorer.ctx.tag.filter': 'Add as filter',
	'explorer.ctx.tag.coming_soon': 'More options coming soon',
	'explorer.cards.back': 'All files',

	// Explorer add value form
	'explorer.add_value.append': 'Append value',
	'explorer.add_value.replace': 'Replace current values',
	'explorer.add_value.as_wikilink': 'Format as [[wikilink]]',
	'explorer.add_value.as_md_link': 'Format as [alias](note)',

	// Explorer rename conflict
	'explorer.rename.append': 'Append values',
	'explorer.rename.replace': 'Replace values',
	'explorer.rename.target_exists': 'Target property already exists',

	// Explorer warnings
	'explorer.warn.no_files_selected': 'Select files in the file tree first',

	// Settings (new)
	'settings.ctrl_click_search': 'Ctrl+click opens search',
	'settings.ctrl_click_search.desc': 'Ctrl+click on a property or value opens Obsidian search with the query',
	'settings.queue_preview': 'Queue preview in explorer',
	'settings.queue_preview.desc': 'Show pending queue changes in the property explorer',
	'settings.content_search': 'Content search in file tree',
	'settings.content_search.desc': 'Enable searching file content in the file tree',
	'settings.operation_scope': 'Operation scope',
	'settings.operation_scope.desc': 'Default scope for explorer operations',
	'settings.scope.auto': 'Auto (selected > filtered > all)',
	'settings.scope.selected': 'Selected files only',
	'settings.scope.filtered': 'Filtered files',
	'settings.scope.all': 'All vault files',

	// File list (extended)
	'files.content_search': 'Search content...',

	// Property type datetime
	'prop.type.datetime': 'Date & Time',

	// Header bar
	'header.show_selected': 'Show only selected',
	'header.queue_badge': '{count} pending',

	// Operations panel
	'ops.panel.title': 'Operations',
	'ops.tab.queue': 'Queue',
	'ops.tab.rename': 'Rename',
	'ops.tab.linter': 'Linter',
	'ops.tab.templates': 'Templates',
	'ops.tab.move': 'Move',
	'ops.move.coming_soon': 'Coming soon',
	'ops.move': 'Move to folder',
	'move.title': 'Move Files',
	'move.target_folder': 'Destination folder',
	'move.target_folder_placeholder': 'Type to search folders…',
	'move.root_hint': 'Leave empty to move to vault root',

	// Layout settings
	'settings.ops_position': 'Operations panel position',
	'settings.ops_position.desc': 'Where the operations panel appears',
	'settings.ops_position.right': 'Right panel',
	'settings.ops_position.bottom': 'Bottom panel',
	'settings.ops_position.replace': 'Replace explorer',

	// Explorer sort sections
	'explorer.sort.section_props': 'Properties',
	'explorer.sort.section_values': 'Values',
	'explorer.sort.value_name': 'By name',
	'explorer.sort.value_count': 'By occurrences',

	// View mode settings
	'settings.view_section': 'View',
	'settings.open_mode': 'Default view',
	'settings.open_mode.desc': 'What to open when clicking the Vaultman ribbon icon',
	'settings.open_mode.sidebar': 'Sidebar',
	'settings.open_mode.main': 'Main view (full-width)',
	'settings.open_mode.both': 'Both',
	'settings.page_order': 'Sidebar page order',
	'settings.page_order.desc': 'Choose the order of the three sidebar pages',
	'settings.page_order.pos': 'Position {n}',
	'settings.page.files': 'Files',
	'settings.page.filters': 'Filters',
	'settings.page.ops': 'Operations',
	'nav.expand': 'Open main view',
	'nav.files': 'Files',
	'nav.filters': 'Filters',
	'nav.ops': 'Operations',
	'nav.statistics': 'Statistics',
	'filter.tab.tags': 'Tags',
	'filter.tab.props': 'Props',
	'filter.tab.files': 'Files',
	'nav.view_mode': 'View mode',
	'nav.search_files': 'Search files',
	'view.mode.list': 'All files',
	'view.mode.selected': 'Selected only',
	'view.mode.prop_columns': 'Prop columns',
	'search.name_placeholder': 'File name…',
	'search.folder_placeholder': 'Folder…',
	'ops.tab.fileops': 'File Ops',
	'ops.tab.linter_short': 'Linter',
	'ops.tab.template_short': 'Template',
	'ops.tab.content_short': 'Content',
	'ops.tabs.fileops': 'File Ops',
	'ops.tabs.linter': 'Linter',
	'ops.tabs.content': 'Content',
	'ops.tabs.template': 'Template',
	'ops.tabs.layout': 'Layout',
	'ops.coming_soon': 'Coming soon',
	'ops.rename': 'Rename',
	'ops.delete': 'Delete',
	'ops.add_property': 'Add property',
	'ops.linter.desc': 'Reorder and clean YAML frontmatter using the Obsidian Linter plugin.',
	'ops.linter.run': 'Run Linter',
	'filters.active': 'Active filters',
	'scope.title': 'Operation scope',
	'scope.desc': 'Determines which files\' properties appear in the filter list.',
	'scope.all': 'All vault files',
	'scope.filtered': 'Filtered files',
	'scope.selected': 'Selected files',
	'scope.by_type': 'By property type',
	'filter.tab.rules': 'Rules',
	'filter.tab.scope': 'Scope',
	'filter.search_placeholder': 'Search…',
	'filter.category': 'All',
	'filter.category.props': 'Property names',
	'filter.category.values': 'Property values',
	'filter.category.all_tags': 'All tags',
	'filter.category.leaf_tags': 'Leaf tags',
	'filter.category.files': 'File names',
	'filter.category.folders': 'Folders',

	// Grid settings
	'settings.grid_render_mode': 'Grid rendering mode',
	'settings.grid_render_mode.desc': 'How property values are rendered in the grid',
	'settings.grid_render_mode.plain': 'Plain text',
	'settings.grid_render_mode.chunk': 'Live preview (chunked)',
	'settings.grid_render_mode.all': 'Live preview (all at once)',
	'settings.grid_editable_columns': 'Editable columns',
	'settings.grid_editable_columns.desc': 'Columns that allow inline editing (comma-separated, include "name" for rename)',
	'settings.base_file': 'Base file path',
	'settings.base_file.desc': 'Path to a .base file for bidirectional sync with Obsidian Bases',

	// Content tab — Find & Replace
	'content.find_placeholder': 'Find in content…',
	'content.replace_placeholder': 'Replace with…',
	'content.toggle_case': 'Case sensitive',
	'content.toggle_regex': 'Regular expression',
	'content.scope_hint_selected': 'Scope: {count} selected file(s)',
	'content.scope_hint_filtered': 'Scope: {count} filtered file(s)',
	'content.preview': 'Preview',
	'content.queue_replace': 'Queue replace',
	'content.preview_count': '{matches} matches in {files} file(s)',
	'content.preview_more': '…and {count} more files',
	'content.no_matches': 'No matches found',
	'content.invalid_regex': 'Invalid regular expression',
	'filter.prop_browser.empty': 'No properties in vault',
	'filter.prop_browser.title': 'Properties',
	'queue.content_changes': 'Content changes',
	'queue.content_no_matches': 'No matches in this file',

	// Filters page — tab bar
	'filters.tab.search': 'Search',
	'filters.tab.scope': 'Scope',
	'filters.tab.sort': 'Sort',
	'filters.tab.view': 'View',

	// Filters page — search bar
	'filters.search.placeholder': 'Search properties…',
	'filters.search.clear': 'Clear search',
	'filters.search.mode.props': 'Search property names',
	'filters.search.mode.values': 'Search values',

	// Filters page — Active Filters popup
	'filters.popup.title': 'Active filters',
	'filters.popup.clear_all': 'Clear all filters',
	'filters.popup.templates': 'Filter templates',
	'filters.popup.empty': 'No active filters',
	'filters.popup.rule.enable': 'Enable filter',
	'filters.popup.rule.disable': 'Disable filter',
	'filters.popup.rule.delete': 'Remove filter',

	// View tab options
	'filters.view.format': 'Display format',
	'filters.view.format.tree': 'Tree',
	'filters.view.format.grid': 'Grid',
	'filters.view.format.cards': 'Cards',
	'filters.view.show': 'Show',
	'filters.view.show.prop_icon': 'Property icon',
	'filters.view.show.prop_name': 'Property name',
	'filters.view.show.count': 'Occurrence count',
	'filters.view.show.values': 'Values',
	'filters.view.show.type': 'Property type icon',
	'filters.view.tags_only': 'Tags only mode',
	'filters.view.tags_only.desc': 'Show only tags including inline tags, grouped by path',

	// Settings — Layout
	'settings.layout.title': 'Layout',
	'settings.layout.separate_panes': 'Separate sidebar panes',
	'settings.layout.separate_panes.desc': 'Open Ops, Files, and Filters as individual Obsidian sidebar views instead of a combined panel.',

	// Filters header buttons (Iter 17)
	'filter.viewmode_btn': 'View mode',
	'filter.sort_btn':     'Sort',
	'filter.search_clear': 'Clear search',
	'filter.search_mode':  'Search mode',

	// Sort popup (Iter 17)
	'sort.by.name':    'Name',
	'sort.by.count':   'Count',
	'sort.by.date':    'Date',
	'sort.by.sub':     'Sub-elements',
	'sort.by.subtags': 'Sub-tags',
	'sort.by.columns': 'Columns',
	'sort.scope.label':    'Sort scope',
	'sort.scope.all':      'All vault',
	'sort.scope.filtered': 'Filtered files',
	'sort.scope.selected': 'Selected files',
	'sort.template':              'Sort templates',
	'sort.close':                 'Close sort',
	'sort.vertcol.props_values':  'Toggle Props / Values',
	'sort.vertcol.node_level':    'Toggle node level',
	'sort.vertcol.direct_toggle': 'Toggle direct',
	'sort.vertcol.scope_drawer':  'Open scope drawer',

	// View mode popup (Iter 17)
	'viewmode.close':       'Close view mode',
	'viewmode.template':    'View templates',
	'viewmode.search_cols': 'Search property columns',
	'viewmode.mode.tree':   'Tree',
	'viewmode.mode.dnd':    'Drag & Drop list',
	'viewmode.mode.grid':   'Grid',
	'viewmode.mode.cards':  'Cards',
	'viewmode.pill.icon':   'Icon',
	'viewmode.pill.text':   'Text',
	'viewmode.pill.count':  'Count',
	'viewmode.pill.files':  'Files',
	'viewmode.pill.nested': 'Nested',
	'viewmode.pill.date':   'Date',
	'viewmode.pill.type':   'Type',
	'viewmode.pill.values': 'Values',
	'viewmode.pill.name':   'Name',
	'viewmode.pill.ext':    'Ext',
	'viewmode.pill.tags':   'Tags',
	'viewmode.pill.path':   'Path',
	'viewmode.pill.size':   'Size',
	'viewmode.add_mode':    'ADD mode',

	// Statistics
	'stats.folders': 'Folders',
	'stats.files': 'Files',
	'stats.props': 'Properties',
	'stats.values': 'Values',
	'stats.tags': 'Tags',
	'stats.total_links': 'Total Links',
	'stats.word_count': 'Word Count',
};
