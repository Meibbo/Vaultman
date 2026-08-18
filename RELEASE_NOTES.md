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
- Added native match highlighting, lazy snippet loading, search bookmarks that return to the explorer, and single-line match rows with Core-parity navigation headers for Text results.

## Fixed

- Fixed side-leaf search field placement and restored drawer gradient rendering on mobile devices.
- Fixed property value rendering to preserve empty and unknown property values accurately in formatted views.
- Fixed pause and resume lifecycle loops in Content search, eliminated full-vault scans on typing, and preserved search expansion state across polling cycles.
