## Added

- Added native cross-group tab reparenting with zero view recreation, keeping active leaf states, DOM focus, and event listeners intact.
- Added DOM tab header anchoring to relocate tab headers directly into destination tab bars during moves.
- Added structural column and row movement actions that preserve workspace resize handles and gutters.
- Added dedicated workspace surface focus actions for left sidebar, right sidebar, and main area (`sasi.workspace.focus_left_sidebar`, `focus_right_sidebar`, `focus_main_area`).
- Added multi-range keyboard selection chords with Shift and Ctrl+Shift supporting Space, Home, End, Page Up, and Page Down across explorer trees.
- Added wired clipboard and selection commands for Select all nodes, Copy node, and Paste node (`select-all-nodes`, `copy-node`, `paste-node`).
- Added prefix/letter jump navigation with declared name-fallback sort order in addon explorers.
- Added live 3-state group toggle and a dedicated keyboard/inputs section to the API Scene (SASI Registry).
- Added sort presets for settings tabs and pages with provided sort order support.
- Added a `showMovementNotices` setting (default: disabled) to suppress toast notices during rapid hotkey panel navigation.

## Changed

- Updated `settingScene` icon to the native Lucide settings gear.
- Normalized directional navigation in 3x3 asymmetrical workspace grids, eliminating false edge detection and unwanted orthogonal swaps.
- Muted movement toast notices by default to provide fluid, silent keyboard-driven window management.

## Fixed

- Fixed duplicate toolbars appearing in Vaultman Frame when opening the API Scene.
- Fixed double indentation guide lines on nested API Scene nodes by correcting base node depth resolution.
- Fixed Enter key activation in addon explorers to directly toggle checkboxes and switch buttons on focused rows.
- Fixed HTMLCollection duck-typing in tab reordering to prevent silent rollback when moving tabs within the same container.
- Fixed container split cleanup to prune empty parent splits immediately after evacuating their last leaf.
- Added an in-flight execution mutex to prevent layout corruption during rapid sequential panel movement keystrokes.
