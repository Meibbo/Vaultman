# Changelog

All notable changes to Vaultman will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **Version history note**: Versions 0.7–0.9 were previously labeled 1.2.2–1.3.0 during private
> internal development. Renumbered to 0.x to reserve 1.0.0 for the first public stable release.

## [Unreleased]

---

## [1.3.0-beta.3] - 2026-08-22

### Added

- Added live-refreshing relative timestamp cells for items modified within 24 hours, singular time labels, and tooltip formatting options.
- Added live glyph palette projection to geometry views with tinted hover states for colored notes.
- Added sticky parent folder rows with an independent floating layer for deep hierarchical navigation.
- Added a Folders type filter with a self-consistent folders-only explorer projection.
- The active glyph of the floating index is ringed while scrubbing, so the accent colour has something to contrast against.
- Long-pressing the checkbox of a parent node selects all of its descendants, and clears them when any of them is already selected.
- Added a Move-to-prop mode state machine with configurable conflict policies in settings, allowing property values to be moved and coerced across properties.
- Added an exclusive toolbar slot for Properties with an active-file property reveal toggle and persistent property ordering.
- Added generational panel widget lifecycle ownership to prevent state teardown desyncs during view and navbar tab transitions.
- Added a mobile rounded rows appearance option and a dedicated settings data transfer modal.
- Added Custom sort mode for Properties and Tags, reveal anchor modes, and a Filtered switch under By level sorting.
- Added a new setting to choose how much of the tree the pinned headers can occupy, between 20 and 60 percent of the panel height, to see more levels at once on tall panels.
- Added native match highlighting, lazy snippet loading, search bookmarks that return to the explorer, and single-line match rows with Core-parity navigation headers for Text results.

### Changed

- Starting a move now turns on the folders sort, and restores the previous sort when the move ends. Tags are excluded, because any tag can become a parent node.
- Reorganized the stylesheets into modules that are now generated automatically, with no visible change for the user.

### Fixed

- The elements cell in the properties and tags scenes now renders. It could be switched on in the view menu and did nothing.
- Changing the selection checkbox position now repaints immediately instead of waiting for the next render.
- Folder counters keep their numbers when the by type folders view is on. It only changes which rows are shown, but it was emptying the set the counters were computed from.
- Selected folders now reach queued operations. Deleting a mixed selection queued only the files, three selected folders queued only the one from the context menu, and moving a folder inline did nothing at all.
- The floating index option for fixed widgets now holds the widgets in place while the nodes scroll under them. It could be switched on and had no effect.
- A panel now comes back with its own configuration after a reload. Obsidian delivers the leaf anchor after the view opens, so the panel used to mint a fresh identity, strand its settings and leave an extra instance behind on every reload.
- Fixed side-leaf search field placement and restored drawer gradient rendering on mobile devices.
- Fixed property value rendering to preserve empty and unknown property values accurately in formatted views.
- A view option that goes back to its default value is no longer remembered as an override. Switching a scene's engine tree to table and back to tree, then leaving and returning, showed Table.
- Selection checkboxes now line up in one column whatever the depth of the node, instead of stepping right with the indent. The tree keeps its own indentation unchanged.
- Fixed deep-level headers that used to disappear behind upper-level ones, leaving a blank gap where they should have been.
- Fixed a folder row that was visually rendered underneath its own pinned header while it was still on screen.
- Removed the thin line that appeared between two pinned headers on desktop and let the scrolling content show through it.
- Fixed the small jump headers made when becoming pinned, so they now appear already in place and a folder hands its spot to the next one at the same level seamlessly.
- Fixed pinned folder headers so they no longer stutter or jerk while scrolling through long lists, or when jumping directly to the end of a list.
- Fixed pause and resume lifecycle loops in Content search, eliminated full-vault scans on typing, and preserved search expansion state across polling cycles.

## [1.3.0-beta.2] - 2026-08-19

### Added

- Added live-refreshing relative timestamp cells for items modified within 24 hours, singular time labels, and tooltip formatting options.
- Added live glyph palette projection to geometry views with tinted hover states for colored notes.
- Added sticky parent folder rows with an independent floating layer for deep hierarchical navigation.
- Added a Folders type filter with a self-consistent folders-only explorer projection.
- Added a Move-to-prop mode state machine with configurable conflict policies in settings, allowing property values to be moved and coerced across properties.
- Added an exclusive toolbar slot for Properties with an active-file property reveal toggle and persistent property ordering.
- Added generational panel widget lifecycle ownership to prevent state teardown desyncs during view and navbar tab transitions.
- Added a mobile rounded rows appearance option and a dedicated settings data transfer modal.
- Added Custom sort mode for Properties and Tags, reveal anchor modes, and a Filtered switch under By level sorting.
- Added a new setting to choose how much of the tree the pinned headers can occupy, between 20 and 60 percent of the panel height, to see more levels at once on tall panels.
- Added native match highlighting, lazy snippet loading, search bookmarks that return to the explorer, and single-line match rows with Core-parity navigation headers for Text results.

### Changed

- Reorganized the stylesheets into modules that are now generated automatically, with no visible change for the user.

### Fixed

- Fixed side-leaf search field placement and restored drawer gradient rendering on mobile devices.
- Fixed property value rendering to preserve empty and unknown property values accurately in formatted views.
- Fixed deep-level headers that used to disappear behind upper-level ones, leaving a blank gap where they should have been.
- Fixed a folder row that was visually rendered underneath its own pinned header while it was still on screen.
- Removed the thin line that appeared between two pinned headers on desktop and let the scrolling content show through it.
- Fixed the small jump headers made when becoming pinned, so they now appear already in place and a folder hands its spot to the next one at the same level seamlessly.
- Fixed pinned folder headers so they no longer stutter or jerk while scrolling through long lists, or when jumping directly to the end of a list.
- Fixed pause and resume lifecycle loops in Content search, eliminated full-vault scans on typing, and preserved search expansion state across polling cycles.

## [1.3.0-beta.1] - 2026-08-18

### Added

- Added live-refreshing relative timestamp cells for items modified within 24 hours, singular time labels, and tooltip formatting options.
- Added live glyph palette projection to geometry views with tinted hover states for colored notes.
- Added sticky parent folder rows with an independent floating layer for deep hierarchical navigation.
- Added a Folders type filter with a self-consistent folders-only explorer projection.
- Added a Move-to-prop mode state machine with configurable conflict policies in settings, allowing property values to be moved and coerced across properties.
- Added an exclusive toolbar slot for Properties with an active-file property reveal toggle and persistent property ordering.
- Added generational panel widget lifecycle ownership to prevent state teardown desyncs during view and navbar tab transitions.
- Added a mobile rounded rows appearance option and a dedicated settings data transfer modal.
- Added Custom sort mode for Properties and Tags, reveal anchor modes, and a Filtered switch under By level sorting.
- Added native match highlighting, lazy snippet loading, search bookmarks that return to the explorer, and single-line match rows with Core-parity navigation headers for Text results.

### Fixed

- Fixed side-leaf search field placement and restored drawer gradient rendering on mobile devices.
- Fixed property value rendering to preserve empty and unknown property values accurately in formatted views.
- Fixed pause and resume lifecycle loops in Content search, eliminated full-vault scans on typing, and preserved search expansion state across polling cycles.

## [1.2.0] - 2026-07-24

### Added

- Added Plugins and Snippets explorers with enable/disable actions and folders that open in the native file manager.
- Added plugin-emitted ribbon icons and working Iconic change-icon actions for Properties, Tags, and Plugins, with user overrides taking precedence.
- Added pause and resume controls for Content searches so partial matches can filter the explorer and be replaced before a full scan finishes.
- Added an Exclude file action and editable excluded-files setting for the Files explorer.
- Added floating-index state and scope persistence to saved view configs, plus configurable static or always-visible glyph colors.
- Added opt-in rainbow folder colors for the Files tree.
- Added remaining-inline-task statistics as an optional file cell, hover field, and sort option.
- Added a configurable context menu for every explorer node kind (Files, Properties, Tags, Content, Snippets, Plugins), each with its own show/hide, order, dividers and submenus under Layout Configuration.
- Added a Path cell that shows the full file path in the flat Files list, with independent Name and Path sorts.
- Added a shared glyph-color palette (default, faint, accent, custom, rainbow) for the Floating Index and the Explorer, and two seeded, deletable default View Compositions.
- Added an option to draw a node's icon in the caret column so labels stay aligned, and an option to bind Create File to a chosen Obsidian command.
- Added a persistent Last opened time for every file as an optional cell, hover field, and most-recent-first sort, plus Remaining tasks and Opened today statistics cards.
- Added a toolbar overflow strategy (condensed menu or horizontal scroll), optional placement of Create File/Folder on the toolbar, and Obsidian commands as toolbar action nodes.
- Added configurable Files hover information, word-count sorting, character statistics, and persistent statistics caching for large vaults.
- Added an optional floating index for Files, Props, and Tags with close, mode, scope, back, and collapse-aware lifecycle actions.
- Added Add-ons settings for Iconic integration and configurable file/folder icon visibility while preserving existing manual icon behavior.
- Added Niagara rail scrubbing with reversible drag behavior, prototype-shaped node displacement, joined action/index tracks, and optional soft scrolling.
- Added hold-click recursive folder expansion and an Updates message that explains renamed or newly introduced behavior after upgrading.
- Added named view layouts, Style Config controls, toolbar auto-hide with edge peek, and a condensed Files Tools menu.

### Changed

- Redesigned By level sorting with inline or submenu presentation, nested and fixed-folder controls, click-to-pick scopes, six-character scope labels, contextual options, and optional floating-index scope synchronization.
- Reorganized Layout Settings into clearer Explorer and Context menus sub-pages and moved dock visibility below the style preset controls.
- Renamed View config to View Compositions and Layout Settings to Layout Configuration; made file exclusion a composable filter node; and made the sort menu hide folder options in flat views and with nesting off.
- Aligned file opening, modifier-click handling, drag payloads, native menus, Make a copy, and third-party menu actions more closely with Obsidian Core Files.
- Renamed Action Presets to Operations Presets, moved View Config beneath it, and placed Floating index settings inside Style Config.
- Made explorer rows, floating-index nodes, tool condensation, and the optional index gutter respond to frame size and display density.
- Moved the performance HUD into Developer Tools and renamed Clean Selection to Clean Filters.
- Moved node-type sort controls into a second-level menu, enabled multi-selection, and renamed property/value sorting for clarity.
- Made applying a filter evaluate the vault once and derive the filtered order in linear time instead of re-sorting the subset on every change.
- Changed the default open mode for new vaults to open Vaultman in its own tab instead of the sidebar; existing vaults keep their saved choice.
- Made Layout Configuration the first settings section, and set new vaults to default to the compact preset without tab labels and to single-click badge cancel; existing vaults keep their saved values.
- Reorganized and relabeled the settings: the Layout Configuration entries use a Widget: naming scheme, the open-mode and Explorer controls were retitled with clearer descriptions, and the bulk-operation warning now defaults to 200 files.

### Fixed

- Fixed add-on index reveals, external plugin enable-state refresh, and plugin cell ordering so configuration precedes the right-aligned toggle.
- Fixed Content search scanning binary files, blocking input while typing, double-counting local matches, and retaining stale previews after replacements.
- Fixed explorer panels appearing empty after leaving and returning to a tab.
- Fixed Iconic runtime lookups hanging explorer renders and made external data.json icon changes refresh without restarting Vaultman.
- Fixed Niagara rail taps triggering deformation, restored free directional displacement within the frame, and added an optional stretch interaction mode.
- Restored narrow-toolbar tool-case collapse, reserved-lane rail positioning, and root-level sorting behavior that regressed in beta.3.
- Fixed the Files explorer not repainting when an icon changed, two tooltips competing for a row, and a collapsed parent inheriting the active-filter decoration instead of showing a small dot.
- Fixed a redundant re-render that swallowed the first click on an inactive explorer, a tooltip that needed a second hover, and the Last opened order not refreshing when a file was opened.
- Fixed active-filter highlighting so a collapsed parent bubbles the state of matching descendants.
- Fixed floating-index availability warnings, scoped collapse recovery, Collapse all recovery, bottom placement, plain rail styling, and switching between indexed explorers.
- Fixed Iconic overrides and plugin-provided file menu actions not propagating consistently to Vaultman file nodes.
- Fixed Niagara upward movement and reverse-direction dragging so the gesture scrubs through the opposite node range before moving the rail again.
- Fixed explorer and floating-index controls appearing disproportionately small on high-density mobile displays.
- Fixed the Content preview reading "with active filters" in accent; it now reports "with N excluded" in primary text, and a staged content replace is labeled "Replace" in the queue.
- Fixed the Properties Convert submenu disappearing on a value that was already a wikilink; it now keeps the case conversions and offers a Plain text inverse, and Titlecase no longer duplicates lowercase for linked values.
- Fixed a deleted file's node lingering in the Files explorer after the file was already gone, and newly created files not appearing until another refresh, by recomputing the filtered set whenever the vault gains or loses a file.
- Fixed the focus commands closing Vaultman when it was already open in sidebar or main mode; only the explicit Open command toggles now.
- Fixed the inline rename editor spilling out of its row and covering the neighbouring cells; it now takes the row height.
- Fixed the Last opened sort ordering folders alphabetically instead of by the newest note opened beneath them, and made recency ties fall back to modification time so a folder no longer drifts to the top for no reason.
- Fixed switching tabs stuttering while the Last opened sort was active by reordering only the opened note instead of rebuilding the whole tree.
- Fixed renaming a tag to a name with spaces or other invalid characters writing the broken name into every file's frontmatter, which left the tag unreachable until reload; invalid names are now rejected with the inline editor kept open.

## [1.2.0-beta.7] - 2026-07-23

### Added

- Added Plugins and Snippets explorers with enable/disable actions and folders that open in the native file manager.
- Added plugin-emitted ribbon icons and working Iconic change-icon actions for Properties, Tags, and Plugins, with user overrides taking precedence.
- Added pause and resume controls for Content searches so partial matches can filter the explorer and be replaced before a full scan finishes.
- Added an Exclude file action and editable excluded-files setting for the Files explorer.
- Added floating-index state and scope persistence to saved view configs, plus configurable static or always-visible glyph colors.
- Added opt-in rainbow folder colors for the Files tree.
- Added remaining-inline-task statistics as an optional file cell, hover field, and sort option.
- Added a configurable context menu for every explorer node kind (Files, Properties, Tags, Content, Snippets, Plugins), each with its own show/hide, order, dividers and submenus under Layout Configuration.
- Added a Path cell that shows the full file path in the flat Files list, with independent Name and Path sorts.
- Added a shared glyph-color palette (default, faint, accent, custom, rainbow) for the Floating Index and the Explorer, and two seeded, deletable default View Compositions.
- Added an option to draw a node's icon in the caret column so labels stay aligned, and an option to bind Create File to a chosen Obsidian command.
- Added a persistent Last opened time for every file as an optional cell, hover field, and most-recent-first sort, plus Remaining tasks and Opened today statistics cards.
- Added a toolbar overflow strategy (condensed menu or horizontal scroll), optional placement of Create File/Folder on the toolbar, and Obsidian commands as toolbar action nodes.
- Added configurable Files hover information, word-count sorting, character statistics, and persistent statistics caching for large vaults.
- Added an optional floating index for Files, Props, and Tags with close, mode, scope, back, and collapse-aware lifecycle actions.
- Added Add-ons settings for Iconic integration and configurable file/folder icon visibility while preserving existing manual icon behavior.
- Added Niagara rail scrubbing with reversible drag behavior, prototype-shaped node displacement, joined action/index tracks, and optional soft scrolling.
- Added hold-click recursive folder expansion and an Updates message that explains renamed or newly introduced behavior after upgrading.
- Added named view layouts, Style Config controls, toolbar auto-hide with edge peek, and a condensed Files Tools menu.

### Changed

- Redesigned By level sorting with inline or submenu presentation, nested and fixed-folder controls, click-to-pick scopes, six-character scope labels, contextual options, and optional floating-index scope synchronization.
- Reorganized Layout Settings into clearer Explorer and Context menus sub-pages and moved dock visibility below the style preset controls.
- Renamed View config to View Compositions and Layout Settings to Layout Configuration; made file exclusion a composable filter node; and made the sort menu hide folder options in flat views and with nesting off.
- Aligned file opening, modifier-click handling, drag payloads, native menus, Make a copy, and third-party menu actions more closely with Obsidian Core Files.
- Renamed Action Presets to Operations Presets, moved View Config beneath it, and placed Floating index settings inside Style Config.
- Made explorer rows, floating-index nodes, tool condensation, and the optional index gutter respond to frame size and display density.
- Moved the performance HUD into Developer Tools and renamed Clean Selection to Clean Filters.
- Moved node-type sort controls into a second-level menu, enabled multi-selection, and renamed property/value sorting for clarity.
- Made applying a filter evaluate the vault once and derive the filtered order in linear time instead of re-sorting the subset on every change.
- Changed the default open mode for new vaults to open Vaultman in its own tab instead of the sidebar; existing vaults keep their saved choice.
- Made Layout Configuration the first settings section, and set new vaults to default to the compact preset without tab labels and to single-click badge cancel; existing vaults keep their saved values.

### Fixed

- Fixed add-on index reveals, external plugin enable-state refresh, and plugin cell ordering so configuration precedes the right-aligned toggle.
- Fixed Content search scanning binary files, blocking input while typing, double-counting local matches, and retaining stale previews after replacements.
- Fixed explorer panels appearing empty after leaving and returning to a tab.
- Fixed Iconic runtime lookups hanging explorer renders and made external data.json icon changes refresh without restarting Vaultman.
- Fixed Niagara rail taps triggering deformation, restored free directional displacement within the frame, and added an optional stretch interaction mode.
- Restored narrow-toolbar tool-case collapse, reserved-lane rail positioning, and root-level sorting behavior that regressed in beta.3.
- Fixed the Files explorer not repainting when an icon changed, two tooltips competing for a row, and a collapsed parent inheriting the active-filter decoration instead of showing a small dot.
- Fixed a redundant re-render that swallowed the first click on an inactive explorer, a tooltip that needed a second hover, and the Last opened order not refreshing when a file was opened.
- Fixed active-filter highlighting so a collapsed parent bubbles the state of matching descendants.
- Fixed floating-index availability warnings, scoped collapse recovery, Collapse all recovery, bottom placement, plain rail styling, and switching between indexed explorers.
- Fixed Iconic overrides and plugin-provided file menu actions not propagating consistently to Vaultman file nodes.
- Fixed Niagara upward movement and reverse-direction dragging so the gesture scrubs through the opposite node range before moving the rail again.
- Fixed explorer and floating-index controls appearing disproportionately small on high-density mobile displays.
- Fixed the Content preview reading "with active filters" in accent; it now reports "with N excluded" in primary text, and a staged content replace is labeled "Replace" in the queue.
- Fixed the Properties Convert submenu disappearing on a value that was already a wikilink; it now keeps the case conversions and offers a Plain text inverse, and Titlecase no longer duplicates lowercase for linked values.
- Fixed the focus commands closing Vaultman when it was already open in sidebar or main mode; only the explicit Open command toggles now.
- Fixed the inline rename editor spilling out of its row and covering the neighbouring cells; it now takes the row height.
- Fixed the Last opened sort ordering folders alphabetically instead of by the newest note opened beneath them, and made recency ties fall back to modification time so a folder no longer drifts to the top for no reason.
- Fixed switching tabs stuttering while the Last opened sort was active by reordering only the opened note instead of rebuilding the whole tree.
- Fixed renaming a tag to a name with spaces or other invalid characters writing the broken name into every file's frontmatter, which left the tag unreachable until reload; invalid names are now rejected with the inline editor kept open.

## [1.2.0-beta.6] - 2026-07-21

### Added

- Added Plugins and Snippets explorers with enable/disable actions and folders that open in the native file manager.
- Added plugin-emitted ribbon icons and working Iconic change-icon actions for Properties, Tags, and Plugins, with user overrides taking precedence.
- Added pause and resume controls for Content searches so partial matches can filter the explorer and be replaced before a full scan finishes.
- Added an Exclude file action and editable excluded-files setting for the Files explorer.
- Added floating-index state and scope persistence to saved view configs, plus configurable static or always-visible glyph colors.
- Added opt-in rainbow folder colors for the Files tree.
- Added remaining-inline-task statistics as an optional file cell, hover field, and sort option.
- Added a configurable context menu for every explorer node kind (Files, Properties, Tags, Content, Snippets, Plugins), each with its own show/hide, order, dividers and submenus under Layout Configuration.
- Added a Path cell that shows the full file path in the flat Files list, with independent Name and Path sorts.
- Added a shared glyph-color palette (default, faint, accent, custom, rainbow) for the Floating Index and the Explorer, and two seeded, deletable default View Compositions.
- Added an option to draw a node's icon in the caret column so labels stay aligned, and an option to bind Create File to a chosen Obsidian command.
- Added a persistent Last opened time for every file as an optional cell, hover field, and most-recent-first sort, plus Remaining tasks and Opened today statistics cards.
- Added a toolbar overflow strategy (condensed menu or horizontal scroll), optional placement of Create File/Folder on the toolbar, and Obsidian commands as toolbar action nodes.
- Added configurable Files hover information, word-count sorting, character statistics, and persistent statistics caching for large vaults.
- Added an optional floating index for Files, Props, and Tags with close, mode, scope, back, and collapse-aware lifecycle actions.
- Added Add-ons settings for Iconic integration and configurable file/folder icon visibility while preserving existing manual icon behavior.
- Added Niagara rail scrubbing with reversible drag behavior, prototype-shaped node displacement, joined action/index tracks, and optional soft scrolling.
- Added hold-click recursive folder expansion and an Updates message that explains renamed or newly introduced behavior after upgrading.
- Added named view layouts, Style Config controls, toolbar auto-hide with edge peek, and a condensed Files Tools menu.

### Changed

- Redesigned By level sorting with inline or submenu presentation, nested and fixed-folder controls, click-to-pick scopes, six-character scope labels, contextual options, and optional floating-index scope synchronization.
- Reorganized Layout Settings into clearer Explorer and Context menus sub-pages and moved dock visibility below the style preset controls.
- Renamed View config to View Compositions and Layout Settings to Layout Configuration; made file exclusion a composable filter node; and made the sort menu hide folder options in flat views and with nesting off.
- Aligned file opening, modifier-click handling, drag payloads, native menus, Make a copy, and third-party menu actions more closely with Obsidian Core Files.
- Renamed Action Presets to Operations Presets, moved View Config beneath it, and placed Floating index settings inside Style Config.
- Made explorer rows, floating-index nodes, tool condensation, and the optional index gutter respond to frame size and display density.
- Moved the performance HUD into Developer Tools and renamed Clean Selection to Clean Filters.
- Moved node-type sort controls into a second-level menu, enabled multi-selection, and renamed property/value sorting for clarity.

### Fixed

- Fixed add-on index reveals, external plugin enable-state refresh, and plugin cell ordering so configuration precedes the right-aligned toggle.
- Fixed Content search scanning binary files, blocking input while typing, double-counting local matches, and retaining stale previews after replacements.
- Fixed explorer panels appearing empty after leaving and returning to a tab.
- Fixed Iconic runtime lookups hanging explorer renders and made external data.json icon changes refresh without restarting Vaultman.
- Fixed Niagara rail taps triggering deformation, restored free directional displacement within the frame, and added an optional stretch interaction mode.
- Restored narrow-toolbar tool-case collapse, reserved-lane rail positioning, and root-level sorting behavior that regressed in beta.3.
- Fixed the Files explorer not repainting when an icon changed, two tooltips competing for a row, and a collapsed parent inheriting the active-filter decoration instead of showing a small dot.
- Fixed a redundant re-render that swallowed the first click on an inactive explorer, a tooltip that needed a second hover, and the Last opened order not refreshing when a file was opened.
- Fixed active-filter highlighting so a collapsed parent bubbles the state of matching descendants.
- Fixed floating-index availability warnings, scoped collapse recovery, Collapse all recovery, bottom placement, plain rail styling, and switching between indexed explorers.
- Fixed Iconic overrides and plugin-provided file menu actions not propagating consistently to Vaultman file nodes.
- Fixed Niagara upward movement and reverse-direction dragging so the gesture scrubs through the opposite node range before moving the rail again.
- Fixed explorer and floating-index controls appearing disproportionately small on high-density mobile displays.

## [1.2.0-beta.5] - 2026-07-20

### Added

- Added Plugins and Snippets explorers with enable/disable actions and folders that open in the native file manager.
- Added plugin-emitted ribbon icons and working Iconic change-icon actions for Properties, Tags, and Plugins, with user overrides taking precedence.
- Added pause and resume controls for Content searches so partial matches can filter the explorer and be replaced before a full scan finishes.
- Added an Exclude file action and editable excluded-files setting for the Files explorer.
- Added floating-index state and scope persistence to saved view configs, plus configurable static or always-visible glyph colors.
- Added opt-in rainbow folder colors for the Files tree.
- Added remaining-inline-task statistics as an optional file cell, hover field, and sort option.
- Added configurable Files hover information, word-count sorting, character statistics, and persistent statistics caching for large vaults.
- Added an optional floating index for Files, Props, and Tags with close, mode, scope, back, and collapse-aware lifecycle actions.
- Added Add-ons settings for Iconic integration and configurable file/folder icon visibility while preserving existing manual icon behavior.
- Added Niagara rail scrubbing with reversible drag behavior, prototype-shaped node displacement, joined action/index tracks, and optional soft scrolling.
- Added hold-click recursive folder expansion and an Updates message that explains renamed or newly introduced behavior after upgrading.
- Added named view layouts, Style Config controls, toolbar auto-hide with edge peek, and a condensed Files Tools menu.

### Changed

- Redesigned By level sorting with inline or submenu presentation, nested and fixed-folder controls, click-to-pick scopes, six-character scope labels, contextual options, and optional floating-index scope synchronization.
- Reorganized Layout Settings into clearer Explorer and Context menus sub-pages and moved dock visibility below the style preset controls.
- Aligned file opening, modifier-click handling, drag payloads, native menus, Make a copy, and third-party menu actions more closely with Obsidian Core Files.
- Renamed Action Presets to Operations Presets, moved View Config beneath it, and placed Floating index settings inside Style Config.
- Made explorer rows, floating-index nodes, tool condensation, and the optional index gutter respond to frame size and display density.
- Moved the performance HUD into Developer Tools and renamed Clean Selection to Clean Filters.
- Moved node-type sort controls into a second-level menu, enabled multi-selection, and renamed property/value sorting for clarity.

### Fixed

- Fixed add-on index reveals, external plugin enable-state refresh, and plugin cell ordering so configuration precedes the right-aligned toggle.
- Fixed Content search scanning binary files, blocking input while typing, double-counting local matches, and retaining stale previews after replacements.
- Fixed explorer panels appearing empty after leaving and returning to a tab.
- Fixed Iconic runtime lookups hanging explorer renders and made external data.json icon changes refresh without restarting Vaultman.
- Fixed Niagara rail taps triggering deformation, restored free directional displacement within the frame, and added an optional stretch interaction mode.
- Restored narrow-toolbar tool-case collapse, reserved-lane rail positioning, and root-level sorting behavior that regressed in beta.3.
- Fixed active-filter highlighting so a collapsed parent bubbles the state of matching descendants.
- Fixed floating-index availability warnings, scoped collapse recovery, Collapse all recovery, bottom placement, plain rail styling, and switching between indexed explorers.
- Fixed Iconic overrides and plugin-provided file menu actions not propagating consistently to Vaultman file nodes.
- Fixed Niagara upward movement and reverse-direction dragging so the gesture scrubs through the opposite node range before moving the rail again.
- Fixed explorer and floating-index controls appearing disproportionately small on high-density mobile displays.

## [1.2.0-beta.4] - 2026-07-19

### Added

- Added Plugins and Snippets explorers with enable/disable actions and folders that open in the native file manager.
- Added plugin-emitted ribbon icons and working Iconic change-icon actions for Properties, Tags, and Plugins, with user overrides taking precedence.
- Added pause and resume controls for Content searches so partial matches can filter the explorer and be replaced before a full scan finishes.
- Added an Exclude file action and editable excluded-files setting for the Files explorer.
- Added floating-index state and scope persistence to saved view configs, plus configurable static or always-visible glyph colors.
- Added opt-in rainbow folder colors for the Files tree.
- Added remaining-inline-task statistics as an optional file cell, hover field, and sort option.
- Added configurable Files hover information, word-count sorting, character statistics, and persistent statistics caching for large vaults.
- Added an optional floating index for Files, Props, and Tags with close, mode, scope, back, and collapse-aware lifecycle actions.
- Added Add-ons settings for Iconic integration and configurable file/folder icon visibility while preserving existing manual icon behavior.
- Added Niagara rail scrubbing with reversible drag behavior, prototype-shaped node displacement, joined action/index tracks, and optional soft scrolling.
- Added hold-click recursive folder expansion and an Updates message that explains renamed or newly introduced behavior after upgrading.
- Added named view layouts, Style Config controls, toolbar auto-hide with edge peek, and a condensed Files Tools menu.

### Changed

- Redesigned By level sorting with inline or submenu presentation, nested and fixed-folder controls, click-to-pick scopes, six-character scope labels, contextual options, and optional floating-index scope synchronization.
- Reorganized Layout Settings into clearer Explorer and Context menus sub-pages and moved dock visibility below the style preset controls.
- Aligned file opening, modifier-click handling, drag payloads, native menus, Make a copy, and third-party menu actions more closely with Obsidian Core Files.
- Renamed Action Presets to Operations Presets, moved View Config beneath it, and placed Floating index settings inside Style Config.
- Made explorer rows, floating-index nodes, tool condensation, and the optional index gutter respond to frame size and display density.
- Moved the performance HUD into Developer Tools and renamed Clean Selection to Clean Filters.
- Moved node-type sort controls into a second-level menu, enabled multi-selection, and renamed property/value sorting for clarity.

### Fixed

- Fixed add-on index reveals, external plugin enable-state refresh, and plugin cell ordering so configuration precedes the right-aligned toggle.
- Fixed Content search scanning binary files, blocking input while typing, double-counting local matches, and retaining stale previews after replacements.
- Fixed explorer panels appearing empty after leaving and returning to a tab.
- Fixed Iconic runtime lookups hanging explorer renders and made external data.json icon changes refresh without restarting Vaultman.
- Fixed Niagara rail taps triggering deformation, restored free directional displacement within the frame, and added an optional stretch interaction mode.
- Restored narrow-toolbar tool-case collapse, reserved-lane rail positioning, and root-level sorting behavior that regressed in beta.3.
- Fixed active-filter highlighting so a collapsed parent bubbles the state of matching descendants.
- Fixed floating-index availability warnings, scoped collapse recovery, Collapse all recovery, bottom placement, plain rail styling, and switching between indexed explorers.
- Fixed Iconic overrides and plugin-provided file menu actions not propagating consistently to Vaultman file nodes.
- Fixed Niagara upward movement and reverse-direction dragging so the gesture scrubs through the opposite node range before moving the rail again.
- Fixed explorer and floating-index controls appearing disproportionately small on high-density mobile displays.

## [1.2.0-beta.3] - 2026-07-18

### Added

- Added Plugins and Snippets explorers with enable/disable actions and folders that open in the native file manager.
- Added configurable Files hover information, word-count sorting, character statistics, and persistent statistics caching for large vaults.
- Added an optional floating index for Files, Props, and Tags with close, mode, scope, back, and collapse-aware lifecycle actions.
- Added Add-ons settings for Iconic integration and configurable file/folder icon visibility while preserving existing manual icon behavior.
- Added Niagara rail scrubbing with reversible drag behavior, prototype-shaped node displacement, joined action/index tracks, and optional soft scrolling.
- Added hold-click recursive folder expansion and an Updates message that explains renamed or newly introduced behavior after upgrading.
- Added named view layouts, Style Config controls, toolbar auto-hide with edge peek, and a condensed Files Tools menu.

### Changed

- Aligned file opening, modifier-click handling, drag payloads, native menus, Make a copy, and third-party menu actions more closely with Obsidian Core Files.
- Renamed Action Presets to Operations Presets, moved View Config beneath it, and placed Floating index settings inside Style Config.
- Made explorer rows, floating-index nodes, tool condensation, and the optional index gutter respond to frame size and display density.
- Moved the performance HUD into Developer Tools and renamed Clean Selection to Clean Filters.
- Moved node-type sort controls into a second-level menu, enabled multi-selection, and renamed property/value sorting for clarity.

### Fixed

- Fixed active-filter highlighting so a collapsed parent bubbles the state of matching descendants.
- Fixed floating-index availability warnings, scoped collapse recovery, Collapse all recovery, bottom placement, plain rail styling, and switching between indexed explorers.
- Fixed Iconic overrides and plugin-provided file menu actions not propagating consistently to Vaultman file nodes.
- Fixed Niagara upward movement and reverse-direction dragging so the gesture scrubs through the opposite node range before moving the rail again.
- Fixed explorer and floating-index controls appearing disproportionately small on high-density mobile displays.

## [1.2.0-beta.2] - 2026-07-17

### Added

- Added Plugins and Snippets explorers with enable/disable actions and folders that open in the native file manager.
- Added configurable Files hover information, word-count sorting, character statistics, and persistent statistics caching for large vaults.
- Added an optional floating index for Files, Props, and Tags with close, mode, scope, back, and collapse-aware lifecycle actions.
- Added Add-ons settings for Iconic integration and configurable file/folder icon visibility while preserving existing manual icon behavior.
- Added Niagara rail scrubbing with reversible drag behavior, prototype-shaped node displacement, joined action/index tracks, and optional soft scrolling.
- Added hold-click recursive folder expansion and an Updates message that explains renamed or newly introduced behavior after upgrading.
- Added named view layouts, Style Config controls, toolbar auto-hide with edge peek, and a condensed Files Tools menu.

### Changed

- Aligned file opening, modifier-click handling, drag payloads, native menus, Make a copy, and third-party menu actions more closely with Obsidian Core Files.
- Renamed Action Presets to Operations Presets, moved View Config beneath it, and placed Floating index settings inside Style Config.
- Made explorer rows, floating-index nodes, tool condensation, and the optional index gutter respond to frame size and display density.
- Moved the performance HUD into Developer Tools and renamed Clean Selection to Clean Filters.
- Moved node-type sort controls into a second-level menu, enabled multi-selection, and renamed property/value sorting for clarity.

### Fixed

- Fixed active-filter highlighting so a collapsed parent bubbles the state of matching descendants.
- Fixed floating-index availability warnings, scoped collapse recovery, Collapse all recovery, bottom placement, plain rail styling, and switching between indexed explorers.
- Fixed Iconic overrides and plugin-provided file menu actions not propagating consistently to Vaultman file nodes.
- Fixed Niagara upward movement and reverse-direction dragging so the gesture scrubs through the opposite node range before moving the rail again.
- Fixed explorer and floating-index controls appearing disproportionately small on high-density mobile displays.

## [1.2.0-beta.1] — 2026-07-15

### Added

- Added an optional floating index for Files, Props, and Tags, with literal glyphs that follow the visible explorer order and route jumps through the active explorer panel.
- Added index lifecycle actions for close, files/folders mode, scope drill, back, and collapse-aware return to a valid level.
- Added optional Niagara scrubbing with the prototype curve, reversible movement, soft scrolling, joined action/index tracks, configurable rail placement, and a plain rail style.
- Added named view layouts, Style Config controls, toolbar auto-hide with edge peek, and an optional Files Tools menu that keeps the primary toolbar to at most five nodes.

### Changed

- Renamed Action Presets to Operations Presets and moved View Config directly below it in Settings.
- Replaced the inactive instant-jump setting with Soft scroll and kept the deferred name/glow sub-effects out of the beta UI.

### Fixed

- Fixed the floating index lifecycle when switching Content, collapsing a scoped node, or using Collapse all.
- Fixed Niagara upward scrubbing, action activation during scrub, bottom rail positioning, plain styling across indexed nodes, and duplicate group navigation.

### Known beta gaps

- Props and Tags table/grid modes do not yet expose scroll-to routing, so their floating-index jumps are limited to tree mode; Files supports its available views.
- Name Pill, Scrub Glow, Name Cell, Name Reveal, and Name Letters remain deferred for later 1.2.x work.
- Real-device mobile, clean-install, and stable-upgrade validation remain required before promotion to `1.2.0` stable.

---

## [1.1.6] — 2026-06-23

### Fixed

- Active-filters counter now shows visible/total-vault file counts instead of repeating the filtered count.
- Content search header counts the matched files while a search is running, updating as results arrive, instead of showing the full scope total.
- Content find and replace inputs now have a bottom border that starts at the placeholder text rather than under the leading icon.
- Word count no longer reports a count for binary files (PNG and other non-Markdown files).
- Word count now matches Obsidian's own counter, including accented text, instead of counting Markdown punctuation as words.
- The Files Words cell refreshes in near-real time as files are saved, without needing to open Statistics or toggle the column.

---

## [1.1.1] — 2026-06-09

### Added

- Added the Data surface as the stable explorer workspace for Files, Props, Tags, Content, active filters, Queue, and Statistics.
- Added Core-like explorer controls, including dock-off tab navigation, view/sort/search controls, resizable table surfaces, Files grid view, and nested/path view behavior.
- Added Content search and replace with queued operations, native-search fallback support, sorting, expand/collapse controls, and result landings.
- Added queue templates, filter templates, risk warnings for bulk operations, and safer duplicate/contradictory operation handling.
- Added cache-backed Statistics projections, live update support, and a local performance HUD for large-vault diagnostics.

### Changed

- Promoted the validated `1.1.0-beta.4` code line to stable as `1.1.1`; `1.1.0` remains skipped for stable because that tag already exists from earlier prerelease work.
- Replaced the npm-based release gate with the pnpm/Node 24 toolchain used by the beta stream.
- Aligned the minimal mobile navbar with Obsidian Core Files geometry instead of a custom floating visual layer.
- Changed Files path display so `Nested` on/off is the single tree/path presentation toggle.

### Fixed

- Fixed severe explorer virtualization regressions, including stale rows, duplicated Files rows, scroll lifecycle leaks, tab-switch offsets, and row rebuild churn.
- Fixed Files explorer filtering so folder and file-type filters hide unrelated empty folders and present matched folder contents as the active root surface.
- Fixed Files, Tags, and Props drag payloads, folder queue handling, root-level drops, and Obsidian editor/frontmatter drop behavior.
- Fixed mobile phone navigation regressions in minimal mode, including navbar placement, search toggle behavior, and transparent Core-like controls.
- Fixed nested explorer indentation guides so `nested=on` exposes hierarchy lines without changing virtual row heights.
- Fixed multiple stable UX placeholders, silent setting reactivity issues, active-filter zero-result warnings, and queue warning indicators.
- Fixed Obsidian Scorecard CSS regressions by guarding against `!important`, `display: contents`, and unsupported stable styling patterns.

---

## [1.1.0-beta.4] — 2026-06-09

### Changed

- Hardened beta release publishing so prerelease tags are created as GitHub prereleases and are not marked latest.
- Improved mobile minimal navbar behavior so the search toggle can close the searchbox directly.
- Rebased active folder filters so filtered folder contents appear as a temporary root surface while filters are active.

### Fixed

- Fixed mobile minimal navbar styling that introduced black side bars, borders, and extra visual layers over Obsidian's phone navigation.
- Fixed Files explorer drag-and-drop so nested files and folders can be moved back to the vault root by dropping onto a level-1 row.
- Fixed folder delete queue handling so empty folders can be queued and deleted as folder targets instead of reporting zero affected files.
- Fixed duplicate native file move menu entries by keeping Vaultman's autosuggest move action as the visible move command.
- Fixed Statistics page navigation parity by restoring a minimal header tab menu surface.

### Known beta gaps

- Clean-install validation on a real phone is still required before any stable promotion.
- Stable promotion should use a normal-version release from the same code lineage, not a mutation of this prerelease tag.

---

## [1.1.0-beta.3] — 2026-06-09

### Added

- Added a performance probe and scroll smoke scripts for explorer regression checks.
- Added Core-like DnD action guides for Vaultman file, tag, and property drags.

### Changed

- Improved mobile/minimal navigation behavior, searchbox layout, explorer row styling, and Content input controls.
- Updated file/property/tag explorer DnD payloads so Vaultman nodes participate more closely in Obsidian-native drag flows.

### Fixed

- Fixed property drops into Markdown editors so frontmatter entries can be applied without the invalid-drop target path.
- Fixed file/folder drag payloads so file nodes expose native Obsidian file payloads for workspace tab drops.
- Fixed root-level drops for files and nested tags.
- Fixed queue/filter islands retaining dock spacing when the dock is disabled.
- Fixed release metadata registration so new versions are added to `versions.json` even when they share `minAppVersion`.

### Known beta gaps

- Full Core Files DnD parity still needs manual validation for destructive move operations and workspace tabbar drops.
- Explorer virtualization remains release-critical to watch under large-vault scroll and tab-switch stress.

---

## [1.1.0-beta.2] — 2026-06-08

### Added

- Added a minimal-style Data surface with dock-off navigation, Core-like header controls, and Data tab
  routing for Files, Props, Tags, Content, Active filters, Queue, and Statistics.
- Added table and grid view parity work for Files, plus table view support for Props and Tags with
  resizable Bases-style columns.
- Added Content search result hierarchy with Core Search-like rows, result sorting, expand/collapse all,
  idle/no-result landings, and queue-compatible replace behavior.
- Added queue risk warnings for bulk operations and folder operations, plus duplicate/contradictory
  operation guards.
- Added explorer drag payload support for files, tags, and properties, including frontmatter-aware
  property drops and wikilink file drops.

### Changed

- Moved Files into the Data header tab menu and made Data the primary explorer surface for beta testing.
- Split explorer search state by surface so Props/Tags search terms do not leak into Files filters.
- Improved Files, Props, Tags, and Content sorting, including modified-time and created-time fields.
- Reworked Statistics routing, scoped projections, and cache-backed file time data for the beta gate.
- Added `dev` branch coverage to CI, CodeQL, and OpenSSF Scorecard workflows.

### Fixed

- Fixed multiple stable UX placeholders and non-reactive settings, including tab-label visibility and
  minimal-style FAB/dock updates.
- Fixed Files explorer extension display, folder filtering, folder queue operations, active-file styling,
  file-grid selection/context menu behavior, and empty-folder affordances.
- Fixed Props explorer property-name search semantics, property type display, value filtering, and grid
  node interactions.
- Fixed Tags nested/simple grouping semantics and view-grid interaction behavior.
- Fixed severe explorer virtualization regressions: stale Files table roots, duplicated file rows, scroll
  lifecycle leaks, row rebuild churn, and tab-switch vertical offset jumps.
- Fixed Content search fallback so hidden matches missed by the native Search DOM can still appear in
  Vaultman results.

### Known beta gaps

- Full Core Search parity for 1000+ result virtualization, snippet context controls, copy results, and
  bookmark actions remains deferred.
- Full Content table renderer parity remains deferred while the Core Search-compatible result-list
  surface stabilizes.
- Further indexed or batched filter-performance work may still be needed if rapid active-filter clicks
  produce user-visible FPS drops in plugin-dev.

---

## [1.0.2] — 2026-06-04

### Fixed

- Removed the redundant queue-details value guard reported by CodeQL.
- Kept stable CSS compatible with Obsidian Scorecard expectations by blocking
  `!important` and `display: contents` release regressions.
- Removed stable-channel placeholder tabs and no-op controls while keeping
  functional settings visible.

### Changed

- Normalized the stable release gate on pnpm and Node 24 while keeping the
  esbuild production build.
- Added release-blocking `svelte-check`, format, stylelint, Scorecard, and
  security audit gates.
- Added a public security reporting policy.
- Reordered the sidebar dock to start on Filters, moved Content operations into
  Filters, moved Files into Operations, and placed the Statistics scope selector
  below the metrics.
- Added live settings refresh for Svelte views so tab-label visibility changes
  no longer require reloading the plugin.

---

## [1.0.1] — 2026-05-26

### Fixed
- Published a stable `1.0.x` patch from the `1.0.0` product line.
- Added release workflow provenance for `main.js`, `manifest.json`, and `styles.css` assets.
- Resolved Obsidian Scorecard findings for manifest punctuation, source directive comments, popout-compatible globals, language detection, and unnecessary assertions.

---

## [1.0.0-beta.5] — 2026-04-07

> Property browser, queue snippet diffs, and content replace UX polish.

### Added
- **Filters → Property Browser**: the Rules tab now shows a live, scrollable list of all vault properties directly in the Filters page. Click a property name to immediately add a `has_property` filter; expand any property with ▶ to see its known values and click one to add a `specific_value` filter — no modal required. The filter tree (active rules) moved exclusively to the Active Filters popup (FAB).
- **Queue Details → Content Snippet Diff**: when a Find & Replace Content operation is queued, opening Queue Details now shows a dedicated "Content changes" section below the property diffs. Each affected file renders async snippets: `…before context [MATCH → replacement] after context…` with the original match highlighted in red and the replacement in green.

### Fixed
- `simulateChanges()` no longer stores `MOVE_FILE` and `FIND_REPLACE_CONTENT` signal keys as fake property entries in the diff — this was causing `[object Object]` to appear in the Queue Details property diff table for content-replace and move operations.

### Internal
- `src/services/OperationQueueService.ts`: `simulateChanges()` now skips `MOVE_FILE` and `FIND_REPLACE_CONTENT` alongside the existing `RENAME_FILE` skip
- `src/modals/QueueDetailsModal.ts`: new async `renderContentOps()` method reads files via `vault.read()` and renders snippet-style diffs for `find_replace_content` ops
- `src/views/VaultmanView.svelte`: `propBrowserItems` reactive state + `refreshPropBrowser()` reads from `PropertyIndexService`; refreshes on mount and `metadataCache.resolved`
- `styles.css`: new `.vaultman-prop-browser*` and `.vaultman-diff-content-*` CSS utility classes

---

## [1.0.0-beta.4] — 2026-04-07

> Find & Replace in file content, Move to folder, batch queue performance, UI navigation overhaul.

### Added
- **Find & Replace Content tab**: search and replace raw file content (including frontmatter) using plain text or regex. Features case-sensitive toggle (`Aa`), regex toggle (`.*`), inline Preview (shows match count + collapsible per-file snippet list), and Queue Replace to stage the operation. Scope adapts to selected files or filtered files automatically.
- **Move to folder**: in-frame slide-up popup (following wireframe UX) to move selected/filtered files to a target folder with folder autocomplete
- **Scope tab inside Filters page**: sub-tab bar (Rules | Scope) in the Filters page — scope selection (All vault / Filtered files / Selected files) is now inline in the Filters page instead of a popup
- **Long-press nav icon reorder** (2s hold → drag to swap): pages can be reordered without leaving the sidebar; visual `.is-reorder-target` highlight during drag; order saved to settings
- **Bottom nav float + blur**: nav bar now floats over page content (`position: absolute; bottom: 0`) with a gradient fade and `padding-bottom: 80px` so content scrolls clear of the nav
- **Active filter badge** on Filters nav icon showing rule count; queue badge on Ops nav icon
- `addBatch()` on `OperationQueueService` — batches multiple queue additions into a single UI re-render event (prevents UI freeze when queuing 1000+ files)
- Chunked execution in `OperationQueueService.execute()` (20 files/tick, `setTimeout(0)` yield) + live progress Notice

### Fixed
- Ribbon icon now opens the sidebar (was incorrectly calling the bases picker)
- Navbar click navigation (was broken after pointer-capture refactor in Iter.3)
- Blank pages 2 & 3 — root cause: `overflow: hidden` was on the same element as `translateX`, clipping pages in local space. Fixed by adding `.vaultman-pages-viewport` wrapper
- `addClass('class1 class2')` → `addClasses(['class1', 'class2'])` in all 4 modals

### Internal
- `FIND_REPLACE_CONTENT` and `MOVE_FILE` signal constants in `src/types/operation.ts`
- `FolderSuggest` added to `src/utils/autocomplete.ts`
- Svelte 5 `$state` + `$derived` for all reactive UI — no framework bindings
- `.vaultman-pages-viewport` overflow wrapper pattern for horizontal slide navigation

---

## [1.0.0-beta.3] — 2026-04-06

> Full Svelte 5 migration, redesigned navigation, major layout fixes.

### Added
- **Svelte 5 sidebar**: `VaultmanView.svelte` replaces the old imperative TypeScript view — 3-page horizontal slide navigation (Ops | Files | Filters) with CSS `translateX` and `transitionend` guard
- **Frosted glass pill nav**: Lucide icons per page, active glow via `color-mix`, `backdrop-filter: blur`, per-page FABs on outer edges following the wireframe spec
- **Per-page FABs**: Files page always gets both FABs (View mode popup, Search popup); Ops page gets left FAB (Queue Details modal); Filters page gets right FAB (Active Filters popup)
- **View mode popup, Search popup, Active Filters popup, Scope popup**: all as in-frame overlays (slide-up spring animation)
- **Queue Details modal** (`QueueDetailsModal`): collapsible file sections, color-coded property diffs (green/red), "Show unchanged" toggle, live progress during execution
- **Linter batch modal** (`LinterModal`): runs Obsidian Linter on all filtered/selected files
- **File Move modal** (`FileMoveModal`): folder autocomplete via `FolderSuggest`

### Fixed
- Empty Files/Filters pages — `refreshFilterTree()` now called in `onMount`; `metadataCache.on('resolved')` triggers file re-render after vault indexes
- Page order default corrected to `['ops', 'files', 'filters']` (matches wireframe)
- HTML5 drag-and-drop replaced with pointer events (Obsidian intercepted native drag events and created tab groups)

### Internal
- `esbuild.config.mjs` updated with `esbuild-svelte@0.9.4` plugin (`css: "injected"`)
- `src/svelte.d.ts` created for TypeScript `.svelte` module declarations

---

## [1.0.0-beta.2] — 2026-03-28

> Bug-fix release addressing four known regressions from v0.9.0.

### Fixed
- **Inline rename**: double-clicking a name cell in the property grid now correctly opens the inline edit input
- **Header checkbox CSS**: "select all" checkbox in the grid header restored to accent/indeterminate styling
- **Grid re-render flash**: `MarkdownRenderer` cell updates no longer produce a visible rebuild flash on each click
- **Tags in grid**: `#hashtag` property values now render as styled tag chips matching Obsidian's live preview

---

## [1.0.0-beta.1] — 2026-03-27

> First public beta. Core features are functional but several known regressions exist. Not recommended for production vaults.

### Added
- Nothing new since 0.9.0 — this release packages the current state for BRAT beta testing

### Known issues in this release
- Inline rename (double-click on name cell) is broken
- Header checkbox lost its CSS styling
- Grid re-render flash on click (chunked render mode)
- Tags don't render exactly like Obsidian reading view

### Placeholder / not yet implemented
- File diff view for pending changes
- File move operation
- Linter tab
- Templates tab (Templater support)

---

## [0.9.0] — 2026-03-27

### Added
- **Inline file rename**: double-click a name cell in the grid (configurable via `gridEditableColumns` setting) — *note: currently has a bug, see Known Issues*
- **Live preview rendering**: property values render with Obsidian formatting (tags, wikilinks, dates) via `MarkdownRenderer` — supports plain, chunked, and full render modes — *note: tags still don't render exactly like reading view; chunked mode shows a visible re-render flash*
- **.base file integration**: bidirectional sync between the plugin grid and Obsidian Bases `.base` YAML files — columns, sort, column widths, and filters
- **Base filter parser**: full expression parser for Obsidian Bases query syntax (comparisons, `.contains()`, `.containsAny()`, `file.hasTag()`, `link()`, `date()`, nested AND/OR)
- New settings: `gridRenderMode`, `gridRenderChunkSize`, `gridLivePreviewColumns`, `gridEditableColumns`, `baseFilePath`
- New grid callbacks: `onSortChange` and `onColumnResize` for external sync
- i18n keys for all new settings (English and Spanish)

### Fixed
- **Checkbox toggle**: clicking a checkbox now correctly toggles selection (was always clearing and re-adding, making uncheck impossible)
- **Show only checked**: now correctly shows all selected files (was showing only the last due to checkbox bug)
- **Select all**: header checkbox now immediately updates all row checkboxes without requiring a column sort
- **Column widths**: table now has explicit pixel width matching colgroup sum, preventing columns from shifting with text content
- **Header checkbox accent**: indeterminate/accent styling now only appears when more than one file is selected
- **Ctrl/Shift selection**: separated checkbox click logic from row click logic so modifier keys work correctly on both paths

### Known regressions in this version
- Inline rename (double-click on name cell) is broken
- Header checkbox lost its CSS styling

---

## [0.8.0] — 2026-03-26

### Added
- Custom SVG plugin icon registered via `addIcon()` — replaces generic `settings-2` icon on ribbon, view tabs, and sidebar
- **Operations panel**: split layout with a pinned queue section always visible at the bottom, independent of active tab
- **Operations panel**: "Clear selected" button to deselect all files from the grid
- Column resize handles on the property grid — drag column header borders to adjust widths
- Native Obsidian status bar integration — file counts, property/value stats, and queue status
- Minimal session row replacing the colored header bar — session picker and show-selected toggle in a compact row

### Changed
- **Property explorer**: triangle toggle icons (▶/▼) replaced with Lucide chevron icons
- **Navbar**: hidden when the explorer panel is open, shown again when collapsed
- **Operations panel**: opens by default alongside the grid
- **Property grid**: uses a single `<table>` with `table-layout: fixed` and `<colgroup>` for precise column alignment
- **Property grid**: virtual scroll now uses spacer `<tr>` elements inside `<tbody>` instead of separate spacer divs
- Removed custom `.vaultman-statusbar` HTML in favor of Obsidian's native `addStatusBarItem()` API
- Removed `HeaderBarComponent` from the main view

### Fixed
- **Critical**: files and properties not appearing in views due to metadata cache timing — `PropertyIndexService` now rebuilds on `metadataCache.on('resolved')` event
- **Critical**: `FilterService.applyFilters()` re-triggered on `metadataCache.on('resolved')` to ensure filters run after cache is ready
- **Compatibility**: replaced `structuredClone()` with `JSON.parse(JSON.stringify())` for older Electron versions

---

## [0.7.0] — 2026-03-26

### Added
- `onExternalSettingsChange()` lifecycle hook — settings now sync when modified externally (e.g. via cloud sync)
- `onunload()` cleanup in SessionFileService and PropertyIndexService
- `destroy()` method on PropertyExplorerComponent for timer cleanup
- Vault `create` event listener in PropertyIndexService for accurate file count tracking
- README.md with full feature documentation, installation, and usage guide
- CHANGELOG.md following Keep a Changelog format
- CONTRIBUTING.md with architecture overview and development guidelines

### Changed
- **IconicService** and **PropertyTypeService** now extend `Component` with proper lifecycle management
- **PropertyIndexService**: incremental per-file removal on delete (was full vault rebuild)
- **PropertyIndexService**: metadata change handler debounced (50ms) to batch rapid updates
- **FileListComponent** and **PropertyGridComponent**: O(1) `getFileByPath()` lookups instead of O(n) vault scan
- **SessionFileService**: `detectConflicts()` scoped to parent folder instead of full vault scan
- Settings loading uses `structuredClone()` for deep merge

### Fixed
- Potential stale callback execution from pending `setTimeout` in SessionFileService on unload
- Global `document.querySelector` in PropertyExplorerComponent scoped to `ownerDocument`
- `.className = '...'` pattern wiping Obsidian-injected classes

---

## [0.1.0] — 2026-03-25

### Added
- Initial release of Vaultman as an Obsidian TypeScript plugin
- Property explorer with hierarchical tree view, search, sort, and Iconic integration
- Virtual-scrolled property grid with inline editing
- Advanced filter system with boolean logic (AND/OR/NOT) and 8 filter types
- Operations queue for batch property management (set, rename, delete, clean, change type)
- Session management with persistent `.md` files in `+/` folder
- Bidirectional session sync with Google Drive conflict detection
- File list component with search and checkbox selection
- Batch file renaming modal
- Obsidian Linter integration modal
- Filter template save/load system
- Settings tab with language, property type, layout, and behavior options
- Internationalization support (English, Spanish) with auto-detection
- Sidebar view with collapsible sections
- Full-screen main view with responsive layout
- Ribbon icon and command palette commands

> Versions 0.2–0.6 correspond to the Python script predecessor (PKM Manager).
> See `docs/pkm_manager_python_architecture.md` for that history.

[Unreleased]: https://github.com/Meibbo/Vaultman/compare/1.3.0-beta.3...HEAD
[1.2.0-beta.1]: https://github.com/Meibbo/Vaultman/compare/1.1.6...1.2.0-beta.1
[1.1.6]: https://github.com/Meibbo/Vaultman/compare/1.1.1...1.1.6
[1.1.1]: https://github.com/Meibbo/Vaultman/compare/1.0.1...1.1.1
[1.1.0-beta.4]: https://github.com/Meibbo/Vaultman/compare/1.1.0-beta.3...1.1.0-beta.4
[1.1.0-beta.3]: https://github.com/Meibbo/Vaultman/compare/1.1.0-beta.2...1.1.0-beta.3
[1.1.0-beta.2]: https://github.com/Meibbo/Vaultman/compare/1.0.1...1.1.0-beta.2
[1.0.2]: https://github.com/Meibbo/Vaultman/compare/1.0.1...1.0.2
[1.0.1]: https://github.com/Meibbo/Vaultman/compare/1.0.0...1.0.1
[1.0.0-beta.5]: https://github.com/Meibbo/Vaultman-Plugin/compare/1.0.0-beta.4...1.0.0-beta.5
[1.0.0-beta.4]: https://github.com/Meibbo/Vaultman-Plugin/compare/1.0.0-beta.3...1.0.0-beta.4
[1.0.0-beta.3]: https://github.com/Meibbo/Vaultman-Plugin/compare/1.0.0-beta.2...1.0.0-beta.3
[1.0.0-beta.2]: https://github.com/Meibbo/Vaultman-Plugin/compare/1.0.0-beta.1...1.0.0-beta.2
[1.0.0-beta.1]: https://github.com/Meibbo/Vaultman-Plugin/compare/0.9.0...1.0.0-beta.1
[0.9.0]: https://github.com/Meibbo/Vaultman-Plugin/compare/0.8.0...0.9.0
[0.8.0]: https://github.com/Meibbo/Vaultman-Plugin/compare/0.7.0...0.8.0
[0.7.0]: https://github.com/Meibbo/Vaultman-Plugin/compare/0.1.0...0.7.0
[0.1.0]: https://github.com/Meibbo/Vaultman-Plugin/releases/tag/0.1.0
[1.2.0-beta.2]: https://github.com/Meibbo/Vaultman/compare/1.2.0-beta.1...1.2.0-beta.2
[1.2.0-beta.3]: https://github.com/Meibbo/Vaultman/compare/1.2.0-beta.2...1.2.0-beta.3
[1.2.0-beta.4]: https://github.com/Meibbo/Vaultman/compare/1.2.0-beta.3...1.2.0-beta.4
[1.2.0-beta.5]: https://github.com/Meibbo/Vaultman/compare/1.2.0-beta.4...1.2.0-beta.5
[1.2.0-beta.6]: https://github.com/Meibbo/Vaultman/compare/1.2.0-beta.5...1.2.0-beta.6
[1.2.0-beta.7]: https://github.com/Meibbo/Vaultman/compare/1.2.0-beta.6...1.2.0-beta.7
[1.2.0]: https://github.com/Meibbo/Vaultman/compare/1.2.0-beta.7...1.2.0
[1.3.0-beta.1]: https://github.com/Meibbo/Vaultman/compare/1.2.0...1.3.0-beta.1
[1.3.0-beta.2]: https://github.com/Meibbo/Vaultman/compare/1.3.0-beta.1...1.3.0-beta.2
[1.3.0-beta.3]: https://github.com/Meibbo/Vaultman/compare/1.3.0-beta.2...1.3.0-beta.3
