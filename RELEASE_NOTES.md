## Added

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

## Changed

- Starting a move now turns on the folders sort, and restores the previous sort when the move ends. Tags are excluded, because any tag can become a parent node.
- Reorganized the stylesheets into modules that are now generated automatically, with no visible change for the user.

## Fixed

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
