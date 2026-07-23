## Added

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

## Changed

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

## Fixed

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
