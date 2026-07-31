export const en: Record<string, string> = {
	// General
	'plugin.name': 'Vaultman',
	'plugin.sidebar_name': 'Vaultman Sidebar',
	'plugin.frame_name': 'VM Scene',
	'plugin.name_explorer': 'Vaultman Explorer',
	'plugin.description': 'Bulk property editor and vault management tool',
	'plugin.open': 'Open Vaultman',
	'common.cancel': 'Cancel',
	'iconic.change_icon': 'Change icon',

	// Sections
	'section.filters': 'Filters',
	'section.files': 'Files',
	'section.operations': 'Operations',

	// Filter types
	'filter.has_property': 'Has prop',
	'filter.missing_property': 'Not prop',
	'filter.specific_value': 'Has value',
	'filter.multiple_values': 'Not value',
	'filter.folder': 'In folder',
	'filter.folder_exclude': 'Not folder',
	'filter.file_name': 'Has name',
	'filter.file_name_exclude': 'Not name',
	'filter.text_contains': 'Has text',
	'filter.text_not_contains': 'Not text',

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
	'filter.create': 'Create',
	'filter.tabs_btn': 'Tabs',
	'filter.auto_reveal': 'Auto-reveal current file',
	'filter.tools': 'Tools',
	'filter.expand_all': 'Expand all',
	'filter.collapse_all': 'Collapse all',

	// File list
	'files.search': 'Search files...',
	'files.select_all': 'Select all',
	'files.select_none': 'Deselect all',
	'files.show_checked_only': 'Show only checked files',
	'files.count': '{filtered} / {total} files',
	'files.bubble_dot': '{count} hidden items with activity',
	'payload_preview.view': 'View',
	'payload_preview.view_aria': 'View payload: {name}',
	'payload_preview.title': 'Payload preview — {name}',
	'payload_preview.read_only':
		'Review what will be loaded. This preview does not change your workspace.',
	'payload_preview.warning_count': '{count} values need attention.',
	'payload_preview.close': 'Close',
	'payload_preview.section.overview': 'Overview',
	'payload_preview.section.floating_toc': 'Floating index',
	'payload_preview.section.root_filter': 'Root filter',
	'payload_preview.section.filter': 'Filter {index}',
	'payload_preview.section.operation': 'Operation {index}',
	'payload_preview.note.default_applied': 'Default shown.',
	'payload_preview.note.generated_on_load': 'Generated when loaded.',
	'payload_preview.note.ignored_field': 'Ignored when loaded.',
	'payload_preview.note.invalid_shape':
		'This value prevents the payload from loading.',
	'payload_preview.note.migration_applied': 'Legacy value migrated on load.',
	'payload_preview.note.missing_field': 'Required value is missing.',
	'payload_preview.note.resolved_on_load':
		'Resolved from the current context when loaded.',
	'payload_preview.note.unchanged': 'The current value stays unchanged.',
	'payload_preview.note.unknown_field': 'Unknown field; shown here for review.',
	'payload_preview.note.unknown_value':
		'Unknown or future value; fallback shown when applicable.',
	'files.col.name': 'Name',
	'files.col.file_name': 'file name',
	'files.col.props': 'Props',
	'files.col.words': 'Words',
	'files.col.ext': 'Ext',
	'files.col.file_ext': 'file extension',
	'files.col.path': 'Path',
	'files.col.file_folder': 'folder',
	'files.col.date': 'Date',
	'files.col.modified': 'Modified',
	'files.col.created': 'Created',
	'files.empty_filtered_title': 'No matching files',
	'files.empty_filtered_desc': 'Try changing or clearing active filters.',

	// Operations
	'ops.properties': 'Properties',
	'ops.tools': 'Tools',
	'ops.queue': 'Queue ({count} pending)',
	'ops.queue.empty': 'Queue (empty)',
	'ops.queue.warning': '{count} pending, {warnings} warning(s)',
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
	'prop.option.native_rename_desc':
		"Use Obsidian's internal core engine to rename this property across the whole vault. This is faster for large datasets.",

	// Queue island
	'queue.island.pending': 'pending changes',
	'queue.island.empty': 'Queue is empty',
	'queue.template.templates': 'Operation Sets',
	'queue.template.save': 'Save operation set',
	'queue.template.no_serializable':
		'No queue operations can be saved as an operation set',
	'queue.template.bulk_title': 'Large operation target',
	'queue.template.bulk_desc':
		'This action preset will stage {count} of {total} files from {source}. Review the queue before applying.',
	'queue.template.bulk_suppress': 'Do not show this warning again',
	'queue.template.bulk_confirm': 'Stage operations',
	'queue.template.source.selected': 'the current selection',
	'queue.template.source.filtered': 'active filters',
	'queue.template.source.vault': 'the whole vault',
	'queue.mode.stage': 'Stage',
	'queue.mode.bypass': 'Bypass',
	'queue.guard.duplicate': 'Skipped duplicate operation',
	'queue.guard.merged': 'Merged duplicate operation targets',
	'queue.guard.conflict': 'Blocked conflicting operation',
	'queue.guard.batch':
		'Queue guard: {merged} merged, {duplicates} duplicate(s) skipped, {conflicts} conflict(s) blocked',
	'queue.warning.empty_target': 'This operation targets 0 files.',
	'queue.warning.large_target':
		'This operation targets {count} files, above the {threshold} file warning limit.',

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
	'settings.background_blur': 'Background blur intensity',
	'settings.background_blur.desc':
		'Controls the glass blur on the bottom bar and popups.',
	'settings.style_config': 'Layout Configuration',
	'settings.rainbow_folders': 'Rainbow folders',
	'settings.rainbow_folders.desc':
		'Color each top-level folder subtree in the files tree; picks up the fancyfile-explorer-rainbow snippet palette when installed.',
	'settings.glyph_color.default':
		'Default',
	'settings.glyph_color.faint':
		'Faint',
	'settings.glyph_color.accent':
		'Accent',
	'settings.glyph_color.custom':
		'Custom',
	'settings.glyph_color.rainbow':
		'Rainbow',
	'settings.glyph_color.custom_pick':
		'Custom color',
	'settings.explorer_glyph_color':
		'Explorer glyph color',
	'settings.explorer_glyph_color.desc':
		'Color the explorer node glyphs from the shared palette. Default leaves them uncolored.',
	'settings.explorer_glyph_scope':
		'Glyph color scope',
	'settings.explorer_glyph_scope.desc':
		'Which nodes the glyph color applies to.',
	'settings.explorer_glyph_scope.folders':
		'Folders',
	'settings.explorer_glyph_scope.files':
		'Files',
	'settings.explorer_glyph_scope.both':
		'Both',
	'settings.toc_glyph_color': 'Glyph color',
	'settings.toc_glyph_color.desc': 'Color for the floating index glyphs.',
	'settings.toc_glyph_color.default': 'Default',
	'settings.toc_glyph_color.accent': 'Accent',
	'settings.toc_glyph_color.rainbow': 'Rainbow',
	'settings.toc_glyph_color_mode': 'Glyph color mode',
	'settings.toc_glyph_color_mode.desc':
		'Apply the color only while the rail is static, or at all times.',
	'settings.toc_glyph_color_mode.static': 'Only while static',
	'settings.toc_glyph_color_mode.always': 'Always',
	'settings.files_hover_info.tasks': 'Remaining tasks',
	'sort.by.tasks': 'Remaining tasks',
	'viewmode.pill.tasks': 'Tasks',
	'file.ctx.exclude': 'Exclude file',
	'settings.explorer_page': 'Panel Explorer',
	'settings.explorer_page.desc':
		'Customize globally your explorers. Tweak cells, badges and highlight behavior.',
	'settings.context_menu.page_desc':
		'Where Vaultman items appear in workspace context menus.',
	'settings.style_preset': 'Style preset',
	'settings.style_preset.desc':
		'Minimal uses compact Obsidian-native controls; Experimental uses the decorated Vaultman controls.',
	'settings.style_preset.minimal': 'Minimal',
	'settings.style_preset.experimental': 'Experimental',
	'settings.minimal_style': 'Minimal style',
	'settings.minimal_style.desc':
		'Use compact Obsidian-native icon buttons in headers and the bottom dock.',
	'settings.search_highlights': 'Explorer search highlights',
	'settings.search_highlights.desc':
		'Highlight explorer rows that match the current search.',
	'settings.icon_in_caret_slot': 'Icon in the caret slot',
	'settings.icon_in_caret_slot.desc':
		'Nodes that show an icon and reserve no caret draw it in the caret column instead of before the label, so every label lines up with the nodes that have no icon.',
	'settings.order_cells_by_activation': 'Order cells by activation',
	'settings.order_cells_by_activation.desc':
		'Render cells in the order you switch them on instead of a fixed order.',
	'settings.collapsed_folder_badges':
		'Collapsed folder activity',
	'settings.collapsed_folder_badges.desc':
		"How a collapsed folder shows the state hidden inside it: one dot that its children have activity (a pending operation or an active filter), or the descendants' own badges alongside the filter dot.",
	'settings.collapsed_folder_badges.dot':
		'One indicator dot',
	'settings.collapsed_folder_badges.badges':
		'Descendant badges',
	'settings.badge_colors': 'Colored cell badges',
	'settings.badge_colors.desc':
		'Use colored badge icons across Files, Tags, and Properties. Disabled keeps badges monotone.',
	'settings.addon_cell_style': 'Add-on state cell',
	'settings.addon_cell_style.desc':
		'Choose the enabled-state control shown in Snippets and Plugins.',
	'settings.addon_cell_style.native': 'Native toggle',
	'settings.addon_cell_style.badge': 'Badge',
	'settings.badge_cancel_click': 'Cancel badge interaction',
	'settings.badge_cancel_click.desc':
		'Choose whether operation badges are canceled with a double-click or single-click.',
	'settings.badge_cancel_click.double': 'Double-click',
	'settings.badge_cancel_click.single': 'Single-click',
	'settings.show_toolbar': 'Show toolbar',
	'settings.show_toolbar.desc':
		'Show the explorer header toolbar (tabs, view, sort, search). Toggle it from the view menu; restore it here when hidden.',
	'command.picker.search':
		'Search commands…',
	'command.picker.empty':
		'No matching command.',
	'command.picker.default':
		'Vaultman default',
	'command.missing':
		'Command "{id}" is not available; used the Vaultman default instead.',
	'command.unavailable':
		'Command "{id}" is not available (retired or disabled plugin).',
	'settings.create_actions_placement':
		'Create actions placement',
	'settings.create_actions_placement.desc':
		'Whether Create File and Create Folder live on the search box or as toolbar action nodes.',
	'settings.create_actions_placement.searchbox':
		'Search box',
	'settings.create_actions_placement.toolbar':
		'Toolbar',
	'settings.toolbar_commands':
		'Toolbar commands',
	'settings.toolbar_commands.desc':
		'Obsidian commands shown as Files toolbar action nodes. The toolbar runs a command immediately when you activate it.',
	'settings.toolbar_commands.add':
		'Add a command',
	'settings.toolbar_commands.remove':
		'Remove',
	'settings.create_file_command':
		'Create File action',
	'settings.create_file_command.desc':
		'What the Create File action runs: the Vaultman built-in note creation, or a chosen Obsidian command.',
	'settings.toolbar_overflow':
		'Toolbar overflow',
	'settings.toolbar_overflow.desc':
		'How the Files toolbar handles more actions than fit: condense the extras into the Tools menu, or keep every action on one horizontally scrollable line.',
	'settings.toolbar_overflow.condensed':
		'Condensed menu',
	'settings.toolbar_overflow.scroll':
		'Horizontal scroll',
	'settings.toolbar_overflow.wrap': 'Wrap to multiple rows',
	'settings.toolbar_tools_menu': 'Condense Files tools',
	'settings.toolbar_tools_menu.desc':
		'Replace Auto-reveal and Expand/Collapse with one native Tools menu so the Files toolbar stays at five nodes.',
	'settings.toolbar': 'Widget: Toolbar',
	'settings.toolbar.desc': 'Configure how this navbar and its buttons behaves. Or add custom commands here.',
	'settings.context_menu_kind.files': 'Files node menu',
	'settings.context_menu_kind.props': 'Properties node menu',
	'settings.context_menu_kind.tags': 'Tags node menu',
	'settings.context_menu_kind.content': 'Text node menu',
	'settings.context_menu_kind.snippets': 'Snippets node menu',
	'settings.context_menu_kind.plugins': 'Plugins node menu',
	'settings.files_context_menu':
		'Files context menu',
	'settings.files_context_menu.desc':
		'Choose which actions the Files node context menu shows, in which order, and group them with dividers and submenus.',
	'settings.files_context_menu.add_divider':
		'Add a divider',
	'settings.files_context_menu.add_submenu':
		'Add a submenu',
	'settings.files_context_menu.submenu_name':
		'Submenu',
	'settings.files_context_menu.intercepted': 'Intercepted item — can be shown or hidden',
	'settings.files_context_menu.divider':
		'Divider',
	'settings.files_context_menu.submenu':
		'Submenu — drop actions into it with the selector',
	'settings.files_context_menu.no_submenu':
		'Top level',
	'settings.files_context_menu.remove':
		'Remove',
	'settings.files_context_menu.reset':
		'Restore the default order',
	'settings.files_hover_info': 'Files tooltip',
	'settings.files_hover_info.desc':
		'Choose which cached metadata and reading statistics appear when hovering a Files node.',
	'settings.files_hover_info.path': 'Path',
	'settings.files_hover_info.label': 'Label',
	'settings.files_hover_info.modified': 'Modified',
	'settings.files_hover_info.created': 'Created',
	'settings.files_hover_info.opened': 'Last opened',
	'settings.files_hover_info.words': 'Words',
	'settings.files_hover_info.characters': 'Characters',
	'settings.show_dock': 'Widget: Node Dock',
	'settings.show_dock.desc':
		'When enabled, Statistics, Filters and Queue will separate from the Tab menu.',
	'settings.bypass_operations': 'Bypass operations',
	'settings.bypass_operations.desc':
		'Run operations immediately instead of staging them in the queue.',
	'settings.bulk_operation_warning': 'Bulk operation warning',
	'settings.bulk_operation_warning.desc':
		'Warn before action presets stage very large file sets.',
	'settings.bulk_operation_warning_threshold': 'Queue warning threshold',
	'settings.bulk_operation_warning_threshold.desc':
		'Show queue warnings when an operation targets more than this many files.',
	'settings.addons': 'Add-ons',
	'settings.addons.iconic': 'Iconic',
	'settings.addons.iconic.desc':
		'Use icons configured by the Iconic community plugin in Vaultman explorers.',
	'settings.addons.iconic.files_scope': 'Files icon scope',
	'settings.addons.iconic.files_scope.desc':
		'Choose which Files nodes may show the icon cell. Custom only shows nodes explicitly styled by Iconic.',
	'settings.folder_aggregate_cells': 'Folder cell totals',
	'settings.folder_aggregate_cells.desc':
		'Folders in the Files tree show the recursive sum of their files countable cells (properties, words, tasks), including the totals of their subfolders.',
	'settings.node_icon_scope': 'Node icon scope',
	'settings.node_icon_scope.desc':
		'Which explorer nodes may show an icon: files and folders, files only, folders only, or only nodes with a custom icon.',
	'settings.icon_scope.all': 'Files and folders',
	'settings.icon_scope.files': 'Files only',
	'settings.icon_scope.folders': 'Folders only',
	'settings.icon_scope.custom': 'Custom icons only',
	'settings.developer_tools': 'Developer Tools',
	'settings.performance_monitor': 'Performance monitor',
	'settings.performance_monitor.desc':
		'Show the floating live FPS, long-task, memory, and action monitor.',
	'settings.default_type': 'Default property type',
	'settings.default_type.desc': 'Default type for new properties',
	'settings.templates': 'Filter templates',
	'settings.templates.desc': 'Manage saved filter templates',
	'settings.saved_view_config': 'Saved compositions',
	'settings.saved_view_config.desc': 'Saved layout compositions',
	'settings.saved_view_config.empty':
		'No saved view composition. Use "Save layout" in the view menu to remember view options and sorts per tab.',
	'settings.saved_view_config.clear': 'Clear',
	'settings.floating_toc': 'Widget: Floating Index',
	'settings.floating_toc.desc':
		'Customize the explorer index and Niagara behavior.',
	'settings.configure': 'Configure',
	'settings.back_to_layout_settings': 'Back to Layout Configuration',
	'settings.floating_toc_enable': 'Enable floating TOC',
	'settings.floating_toc_enable.desc':
		'Show a floating first-letter index over the Files, Props, and Tags explorers.',
	'settings.floating_toc_niagara': 'Niagara slide',
	'settings.floating_toc_niagara.desc':
		'Drag along the index to magnify glyphs and scrub between groups. Off keeps the index static.',
	'settings.toc_plain_style': 'Plain rail style',
	'settings.toc_plain_style.desc':
		'Bare glyphs with transparent control nodes (no boxes)',
	'settings.toc_position': 'Rail position',
	'settings.toc_position.right': 'Right',
	'settings.toc_position.left': 'Left',
	'settings.toc_position.top': 'Top',
	'settings.toc_position.bottom': 'Bottom',
	'settings.toc_reserved_lane': 'Reserve index lane',
	'settings.toc_reserved_lane.desc':
		'Keep a vertical index between explorer cells and the scrollbar instead of overlaying either one. Top and bottom rails remain overlays.',
	'settings.toc_hide_explorer_scrollbar': 'Hide explorer scrollbar',
	'settings.toc_hide_explorer_scrollbar.desc':
		'Hide the active explorer scrollbar while its floating index is visible.',
	'settings.toc_glyph_mode': 'Glyph mode',
	'settings.toc_glyph_mode.letter': 'First letter',
	'settings.toc_glyph_mode.name': 'Full name',
	'settings.toc_label_mode': 'Name cell',
	'settings.toc_label_mode.desc':
		'When to show the node name beside the glyph while scrubbing.',
	'settings.toc_label_mode.off': 'Off',
	'settings.toc_label_mode.selected': 'Selected',
	'settings.toc_label_mode.scrub': 'Scrub falloff',
	'settings.toc_label_mode.always': 'Always',
	'settings.toc_reveal': 'Name reveal range',
	'settings.toc_reveal.selected': 'Selected',
	'settings.toc_reveal.near': 'Near',
	'settings.toc_reveal.wide': 'Wide',
	'settings.toc_reveal.all': 'All',
	'settings.toc_name_order': 'Name letters',
	'settings.toc_name_order.down': 'Top-down',
	'settings.toc_name_order.up': 'Bottom-up',
	'settings.toc_name_order.flat': 'Horizontal',
	'settings.toc_glow': 'Scrub glow',
	'settings.toc_name_pill': 'Name pill',
	'settings.toc_soft_scroll': 'Soft scroll',
	'settings.toc_soft_scroll.desc':
		'Smoothly slide the explorer between index groups while scrubbing.',
	'settings.toc_stretch': 'Stretch instead of slide',
	'settings.toc_stretch.desc':
		'Anchor the rail in place: pulling stretches the bell like putty instead of dragging the rail across the frame.',
	'settings.toc_niagara_nodes': 'Join action nodes to slide',
	'settings.toc_niagara_nodes.desc':
		'Place action controls and indexed nodes on the same Niagara scrub track.',
	'floating_toc.aria': 'Explorer index',
	'floating_toc.menu': 'Index',
	'viewmenu.toolbar': 'Toolbar',
	'viewmenu.layouts': 'Layout',
	'viewmenu.save_layout': 'Save layout',
	'viewmenu.saved_config_notice': 'View composition saved',
	'viewmenu.in_mode': 'In mode',
	'viewmenu.in_mode.open': 'Open',
	'viewmenu.in_mode.add': 'Add',
	'viewmenu.in_mode.select': 'Select',
	'viewmenu.in_mode.filter': 'Filter',
	'floating_toc.files': 'Index folders',
	'floating_toc.folders': 'Index files',
	'floating_toc.pick': 'Pick a node to index its level',
	'floating_toc.drill': "Index a node's level",
	'floating_toc.close': 'Close index',
	'floating_toc.back': 'Back one level',
	'floating_toc.incompatible_sort':
		'The index requires a text-based sort (name, path, or extension) in the active explorer.',
	'settings.queue_templates.desc': 'Manage saved staged operation sets',

	// Main view
	'view.main.title': 'Vaultman',
	'command.open_main': 'Open Vaultman (full view)',
	'command.open_sidebar': 'Open Vaultman sidebar',
	'command.apply_queue': 'Apply pending operations',
	'command.focus_content_search': 'Focus Text search',
	'command.focus_active_explorer_search': 'Focus active explorer search',
	'command.focus_search_unavailable': 'No Vaultman search field is available.',
	'command.open_updates': 'Open Vaultman updates',
	'updates.title': 'Vaultman Updates · {version}',
	'updates.notice': 'Vaultman {version} is ready. See the highlights.',
	'updates.intro':
		'Read a short, visual overview of this release. The full technical changelog is linked from the bulletin.',
	'updates.view_bulletin': "What's new",
	'updates.copy_url': 'Copy bulletin link',
	'updates.url_copied': 'Bulletin link copied.',
	'updates.open_failed':
		'Could not open the bulletin. Use the Vaultman updates command to retry or copy its link.',
	'updates.copy_failed': 'Could not copy the bulletin link.',
	'updates.dismiss': 'Not now',
	'updates.close': 'Got it',

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
	'linter.not_installed':
		'obsidian-linter plugin is not installed. Please install it to use this feature.',
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
	'rename.pattern_desc':
		'Use placeholders: {basename}, {date}, {counter}, {property}',
	'rename.help': '* or {basename} | {date} | {counter} | {property}',
	'rename.pattern_warning':
		'Rename pattern blocked for {count} file(s): {reason}',
	'rename.issue.missing_property': 'Missing text property "{property}"',
	'rename.issue.non_text_property': 'Property "{property}" is not text',
	'rename.issue.invalid_pattern': 'Invalid rename pattern "{token}"',

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
	'explorer.ctx.change_type': 'Change type',
	'explorer.ctx.delete_prop': 'Delete property',
	'explorer.ctx.add_value': 'Add value',

	// Explorer context menu — values
	'explorer.ctx.move_value': 'Move to property...',
	'explorer.ctx.convert': 'Convert',
	'explorer.ctx.delete_value': 'Delete value',

	// Explorer convert submenu
	'explorer.ctx.wikilink': 'Wikilink',
	'explorer.ctx.wikilink_alias': 'To [[note|alias]]',
	'explorer.ctx.md_link': 'To [alias](note)',
	'explorer.ctx.uppercase': 'UPPERCASE',
	'explorer.ctx.lowercase': 'lowercase',
	'explorer.ctx.titlecase': 'Titlecase',
	'explorer.ctx.plain_text': 'Plain text',
	'explorer.ctx.capitalize': 'First Letter Case',
	'explorer.ctx.filter_include': 'Add as filter',
	'explorer.ctx.filter_exclude': 'Exclude as filter',
	'explorer.ctx.tag.coming_soon': 'More options coming soon',
	'tags.invalid_name': 'That is not a valid tag name',
	'tags.invalid_name.spaces':
		'Tag names cannot contain spaces. Use "-", "_" or "/" instead.',
	'explorer.cards.back': 'All files',
	'file.ctx.open_tab': 'Open in new tab',
	'file.ctx.open_right': 'Open to the right',
	'file.ctx.open_window': 'Open in new window',
	'snippet.open_default_app': 'Open in default app',
	'snippet.reveal_system_explorer': 'Show in system explorer',
	'snippet.reveal_finder': 'Reveal in Finder',
	'file.ctx.make_copy': 'Make a copy',
	'folder.ctx.new_note': 'New note',
	'folder.ctx.new_folder': 'New folder',
	'folder.ctx.new_canvas': 'New canvas',
	'folder.ctx.new_base': 'New base',
	'folder.ctx.make_copy': 'Make a copy',
	'folder.ctx.filter_include': 'Filter to this folder',
	'folder.ctx.filter_exclude': 'Exclude this folder',
	'folder.ctx.rename': 'Rename folder',
	'folder.ctx.move': 'Move folder',
	'folder.ctx.delete': 'Delete folder',
	'folder.prompt.rename': 'New folder name',
	'folder.prompt.move': 'Destination folder path',

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
	'settings.ctrl_click_search.desc':
		'Ctrl+click on a property or value opens Obsidian search with the query',
	'settings.queue_preview': 'Queue preview in explorer',
	'settings.queue_preview.desc':
		'Show pending queue changes in the property explorer',
	'settings.content_search': 'Text search in file tree',
	'settings.content_search.desc':
		'Enable searching text inside files in the file tree',
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
	'settings.open_mode': 'Where to Open Vaultman',
	'settings.open_mode.desc':
		'Select what the "Open Vaultman" command and ribbon icon does, selecting "Sidebar|Main leaf" will create one instance and close it if you invoke the command again',
	'settings.open_mode.sidebar': 'Sidebar',
	'settings.open_mode.main': 'Main leaf (full-width)',
	'settings.open_mode.new_instance': 'New instance',
	'settings.open_mode.both': 'New instance',
	'settings.context_menu': 'Context menus',
	'settings.context_menu.file_menu': 'Show in file menu',
	'settings.context_menu.file_menu.desc':
		'Add Vaultman actions to Obsidian file context menus.',
	'settings.context_menu.editor_menu': 'Show in editor menu',
	'settings.context_menu.editor_menu.desc':
		'Add Vaultman actions to Obsidian editor context menus.',
	'settings.context_menu.more_options': 'Show in more-options menu',
	'settings.context_menu.more_options.desc':
		'Add Vaultman actions to Obsidian more-options file menus.',
	'context_menu.clean_filters': 'Clean filters',
	'settings.page_order': 'Sidebar page order',
	'settings.page_order.desc': 'Choose the order of the three sidebar pages',
	'settings.page_order.pos': 'Position {n}',
	'settings.page.files': 'Files',
	'settings.page.filters': 'Filters',
	'settings.page.ops': 'Operations',
	'nav.expand': 'Open main view',
	'nav.files': 'Files',
	'nav.filters': 'Data',
	'nav.ops': 'Files',
	'nav.statistics': 'Statistics',
	'filter.tab.tags': 'Tags',
	'filter.tab.props': 'Props',
	'filter.active_descendant': 'Hidden active filter',
	'filter.tab.files': 'Files',
	'filter.tab.content': 'Text',
	'filter.tab.snippets': 'Snippets',
	'filter.tab.plugins': 'Plugins',
	'addon.icon.title': 'Change icon — {name}',
	'addon.icon.change': 'Change icon',
	'addon.icon.reset': 'Reset to default',
	'addon.icon.search': 'Search icons…',
	'addon.icon.empty': 'No icons match',
	'addon.icon.current': 'Current icon',
	'addons.enabled': 'Enabled',
	'addons.disabled': 'Disabled',
	'addons.enable': 'Enable',
	'addons.disable': 'Disable',
	'addons.snippets.empty': 'No CSS snippets found',
	'addons.snippets.unavailable':
		'CSS snippet controls are unavailable in this Obsidian version',
	'addons.snippets.failed': 'Could not update the CSS snippet',
	'addons.plugins.empty': 'No community plugins found',
	'addons.plugins.unavailable':
		'Community plugin controls are unavailable in this Obsidian version',
	'addons.plugins.failed': 'Could not update the community plugin',
	'addons.open_settings': 'Open plugin settings',
	'addons.installed': 'Installed',
	'addons.updated': 'Updated',
	'addons.version': 'Version',
	'addons.author': 'Author',
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
	'ops.tab.content_short': 'Text',
	'ops.tabs.props': 'Properties',
	'ops.tabs.tags': 'Tags',
	'ops.tabs.content': 'Text',
	'ops.tabs.template': 'Template',
	'ops.tabs.layout': 'Layout',
	'ops.coming_soon': 'Coming soon',
	'ops.rename': 'Rename',
	'ops.delete': 'Delete',
	'ops.add_property': 'Add property',
	'ops.linter.desc':
		'Reorder and clean YAML frontmatter using the Obsidian Linter plugin.',
	'ops.linter.run': 'Run Linter',
	'filters.active': 'Filters',
	'filters.active_zero': 'Active filters return no files',
	'scope.title': 'Operation scope',
	'scope.desc': "Determines which files' properties appear in the filter list.",
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
	'filter.category.all_props': 'All property text',
	'filter.category.prop_names': 'Property names',
	'filter.category.all_tags': 'All tags',
	'filter.category.leaf_tags': 'Leaf tags',
	'filter.category.files': 'File names',
	'filter.category.folders': 'Folders',

	// Grid settings
	'settings.grid_render_mode': 'Grid rendering mode',
	'settings.grid_render_mode.desc':
		'How property values are rendered in the grid',
	'settings.grid_render_mode.plain': 'Plain text',
	'settings.grid_render_mode.chunk': 'Live preview (chunked)',
	'settings.grid_render_mode.all': 'Live preview (all at once)',
	'settings.grid_editable_columns': 'Editable columns',
	'settings.grid_editable_columns.desc':
		'Columns that allow inline editing (comma-separated, include "name" for rename)',
	'settings.base_file': 'Base file path',
	'settings.base_file.desc':
		'Path to a .base file for bidirectional sync with Obsidian Bases',

	// Content tab — Find & Replace
	'content.find_placeholder': 'Find in content…',
	'content.replace_placeholder': 'Replace with…',
	'content.toggle_case': 'Case sensitive',
	'content.toggle_regex': 'Regular expression',
	'content.toggle_replace': 'Show replace field',
	'content.scope_hint_selected': 'Scope: {count} selected file(s)',
	'content.scope_hint_filtered':
		'Scope: {count}/{total} files - {filters} filter(s)',
	'content.scope_hint_searching':
		'Searching {count}/{total} files - {filters} filter(s)',
	'content.with_active_filters': 'with active filters',
	'content.with_excluded': 'with {count} excluded',
	'queue.details.replace': 'Replace',
	'content.preview': 'Preview',
	'content.queue_replace': 'Queue replace',
	'content.queue_no_matches': 'No content matches to queue',
	'content.preview_count': '{matches} matches in {files} file(s)',
	'content.preview_more': '…and {count} more files',
	'content.no_matches': 'No matches found',
	'content.landing_title': 'Text search',
	'content.landing_desc': 'Type a term to scan the current scope.',
	'content.empty_desc': 'Try another term or adjust the current filters.',
	'content.invalid_regex': 'Invalid regular expression',
	'content.reveal_no_active_file': 'No active Markdown file',
	'content.reveal_not_in_results':
		'Active file is outside current Content results',
	'filter.prop_browser.empty': 'No properties in vault',
	'filter.prop_browser.title': 'Properties',
	'explorer.props.empty_title': 'No matching properties',
	'explorer.props.empty_search_desc':
		'Try another term or switch the property category.',
	'explorer.tags.empty_title': 'No matching tags',
	'explorer.tags.empty_desc': 'No tags in vault',
	'explorer.tags.empty_search_desc':
		'Try another term or switch the tag category.',
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
	'filters.popup.active': 'active rules',
	'filters.popup.filtered_files': '{filtered} / {total} files',
	'filters.popup.rule.enable': 'Enable filter',
	'filters.popup.rule.disable': 'Disable filter',
	'filters.popup.rule.delete': 'Remove filter',
	'filters.view_state.files_type': 'Files view type',
	'filters.view_state.files_type_desc':
		'Files view is limited to {type} files.',
	'filters.bases.menu': 'Import/export Bases filters',
	'filters.bases.import': 'Import',
	'filters.bases.export': 'Export active filters to Base',
	'filters.bases.exported': 'Exported filters to {path}',
	'filters.bases.imported': 'Imported Bases filters',
	'filters.bases.no_files': 'No .base files found',
	'filters.bases.no_active_filters': 'No active filters to export',
	'filters.bases.no_supported_filters': 'No supported Bases filters found',
	'filters.bases.invalid_yaml': 'Could not parse this .base file',
	'filters.bases.global_filters': 'Global filters',
	'filters.bases.view': 'View',

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
	'filters.view.tags_only.desc':
		'Show only tags including inline tags, grouped by path',

	// Settings — Layout
	'settings.layout.title': 'Layout',
	'settings.layout.separate_panes': 'Separate sidebar panes',
	'settings.layout.separate_panes.desc':
		'Open Ops, Files, and Filters as individual Obsidian sidebar views instead of a combined panel.',
	'settings.filters_show_tab_labels': 'Show tab labels',
	'settings.filters_show_tab_labels.desc':
		'Show or hide text labels next to page tab icons.',

	// Filters header buttons (Iter 17)
	'filter.viewmode_btn': 'View mode',
	'filter.sort_btn': 'Sort',
	'filter.search_clear': 'Clear search',
	'filter.search_mode': 'Search mode',

	// Sort popup (Iter 17)
	'sort.by.name': 'Name',
	'sort.by.state': 'State',
	'sort.by.type': 'Type',
	'sort.by.count': 'Count',
	'sort.by.props': 'Props',
	'sort.by.words': 'Words',
	'sort.by.date': 'Date',
	'sort.by.modified': 'Modified time',
	'sort.by.created': 'Created time',
	'sort.by.installed': 'Installed',
	'sort.by.updated': 'Updated',
	'sort.by.ext': 'Extension',
	'sort.by.opened': 'Last opened',
	'sort.by.path': 'Path',
	'sort.by.sub': 'Sub-elements',
	'sort.by.subtags': 'Sub-tags',
	'sort.by.columns': 'Columns',
	'sort.parents_first': 'Folders first',
	'sort.scope.label': 'Sort scope',
	'sort.scope.all': 'All vault',
	'sort.scope.filtered': 'Filtered files',
	'sort.scope.selected': 'Selected files',
	'sort.template': 'Sort templates',
	'sort.close': 'Close sort',
	'sort.vertcol.by_values': 'Sorting by Values — click to sort by Props',
	'sort.vertcol.by_props': 'Sorting by Props — click to sort by Values',
	'sort.vertcol.by_nested': 'Showing nested tags — click to show root only',
	'sort.vertcol.by_root': 'Showing root tags — click to show nested',
	'sort.vertcol.props_values': 'Toggle Props / Values',
	'sort.level.title': 'By level',
	'content.pause_search': 'Pause search',
	'content.resume_search': 'Resume search',
	'content.restart_search': 'Restart search',
	'content.copy_results': 'Copy search results',
	'content.bookmark_search': 'Bookmark search',
	'content.bookmarked': 'Bookmarked search: {query}',
	'content.bookmarks_unavailable': 'The Bookmarks core plugin is disabled.',
	'content.copy_unavailable': 'Core search is unavailable in this vault.',
	'sort.level.nested': 'Nested',
	'sort.level.fixed_folders': 'Fixed folders',
	'settings.sort_level_inline': 'Inline By level options',
	'settings.sort_level_inline.desc':
		'Show the By level options directly in the sort menu instead of a submenu.',
	'settings.toc_drill_sync': 'Index drill drives sort scope',
	'settings.toc_drill_sync.desc':
		'The floating index scope drill also selects the sort scope; closing the index restores the default sort scope.',
	'sort.level.properties': 'Properties',
	'sort.level.values': 'Values',
	'sort.level.all': 'All levels',
	'sort.level.drill': 'Scope: drill',
	'sort.level.pick_hint': 'Click a row to choose its level as the sort scope',
	'sort.vertcol.node_level': 'Toggle node level',
	'sort.vertcol.direct_toggle': 'Toggle direct',
	'sort.vertcol.scope_drawer': 'Open scope drawer',
	'sort.type.all': 'All types',
	'sort.type.tags': 'Tags',
	'sort.type.list': 'List',
	'sort.type.text': 'Text',
	'sort.type.number': 'Number',
	'sort.type.date': 'Date',
	'sort.type.datetime': 'Date & time',
	'sort.type.checkbox': 'Checkbox',
	'sort.type.aliases': 'Aliases',
	'sort.type.cssclasses': 'CSS classes',
	'sort.type.unknown': 'Unknown',
	'sort.type.nested': 'Nested tags',
	'sort.type.simple': 'Simple tags',

	// View mode popup (Iter 17)
	'viewmode.close': 'Close view mode',
	'viewmode.template': 'View templates',
	'viewmode.search_cols': 'Search property columns',
	'viewmode.mode.tree': 'Tree',
	'viewmode.mode.dnd': 'Drag & Drop list',
	'viewmode.mode.table': 'Table',
	'viewmode.mode.cards': 'Cards',
	'viewmode.pill.icon': 'Icon',
	'viewmode.pill.text': 'Text',
	'viewmode.pill.count': 'Count',
	'viewmode.pill.prop_count': 'Props',
	'viewmode.pill.files': 'Files',
	'viewmode.pill.nested': 'Nested',
	'viewmode.pill.date': 'Date',
	'viewmode.pill.mtime': 'Modified',
	'viewmode.pill.ctime': 'Created',
	'viewmode.pill.type': 'Type',
	'viewmode.pill.values': 'Values',
	'viewmode.pill.name': 'Name',
	'viewmode.pill.ext': 'Ext',
	'viewmode.pill.tags': 'Tags',
	'viewmode.pill.opened': 'Last opened',
	'viewmode.pill.path': 'Path',
	'viewmode.pill.size': 'Size',
	'viewmode.pill.words': 'Words',
	'viewmode.pill.state': 'State',
	'viewmode.pill.config': 'Config',
	'viewmode.pill.installed': 'Installed',
	'viewmode.pill.updated': 'Updated',
	'viewmode.add_mode': 'ADD mode',

	// Statistics
	'stats.folders': 'Folders',
	'stats.files': 'Files',
	'stats.props': 'Properties',
	'stats.values': 'Values',
	'stats.tags': 'Tags',
	'stats.addons': 'Add-ons',
	'stats.total_links': 'Total Links',
	'stats.opened_today': 'Opened today',
	'stats.remaining_tasks': 'Remaining tasks',
	'stats.word_count': 'Word Count',
	'stats.reconciling': 'Reconciling',
};
