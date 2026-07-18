# 1.2.0-beta.3

## Added

- Added Plugins and Snippets explorers with enable/disable actions and folders that open in the native file manager.
- Added configurable Files hover information, word-count sorting, character statistics, and persistent statistics caching for large vaults.
- Added an optional floating index for Files, Props, and Tags with close, mode, scope, back, and collapse-aware lifecycle actions.
- Added Add-ons settings for Iconic integration and configurable file/folder icon visibility while preserving existing manual icon behavior.
- Added Niagara rail scrubbing with reversible drag behavior, prototype-shaped node displacement, joined action/index tracks, and optional soft scrolling.
- Added hold-click recursive folder expansion and an Updates message that explains renamed or newly introduced behavior after upgrading.
- Added named view layouts, Style Config controls, toolbar auto-hide with edge peek, and a condensed Files Tools menu.

## Changed

- Aligned file opening, modifier-click handling, drag payloads, native menus, Make a copy, and third-party menu actions more closely with Obsidian Core Files.
- Renamed Action Presets to Operations Presets, moved View Config beneath it, and placed Floating index settings inside Style Config.
- Made explorer rows, floating-index nodes, tool condensation, and the optional index gutter respond to frame size and display density.
- Moved the performance HUD into Developer Tools and renamed Clean Selection to Clean Filters.
- Moved node-type sort controls into a second-level menu, enabled multi-selection, and renamed property/value sorting for clarity.

## Fixed

- Fixed active-filter highlighting so a collapsed parent bubbles the state of matching descendants.
- Fixed floating-index availability warnings, scoped collapse recovery, Collapse all recovery, bottom placement, plain rail styling, and switching between indexed explorers.
- Fixed Iconic overrides and plugin-provided file menu actions not propagating consistently to Vaultman file nodes.
- Fixed Niagara upward movement and reverse-direction dragging so the gesture scrubs through the opposite node range before moving the rail again.
- Fixed explorer and floating-index controls appearing disproportionately small on high-density mobile displays.
