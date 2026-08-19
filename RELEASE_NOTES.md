## Added

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

## Changed

- Reorganized the stylesheets into modules that are now generated automatically, with no visible change for the user.

## Fixed

- Fixed side-leaf search field placement and restored drawer gradient rendering on mobile devices.
- Fixed property value rendering to preserve empty and unknown property values accurately in formatted views.
- Fixed deep-level headers that used to disappear behind upper-level ones, leaving a blank gap where they should have been.
- Fixed a folder row that was visually rendered underneath its own pinned header while it was still on screen.
- Removed the thin line that appeared between two pinned headers on desktop and let the scrolling content show through it.
- Fixed the small jump headers made when becoming pinned, so they now appear already in place and a folder hands its spot to the next one at the same level seamlessly.
- Fixed pinned folder headers so they no longer stutter or jerk while scrolling through long lists, or when jumping directly to the end of a list.
- Fixed pause and resume lifecycle loops in Content search, eliminated full-vault scans on typing, and preserved search expansion state across polling cycles.
