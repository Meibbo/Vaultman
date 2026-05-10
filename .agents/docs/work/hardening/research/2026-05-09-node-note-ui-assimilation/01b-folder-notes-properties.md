---
title: Folder Notes interception and properties DOM
type: agent-research-shard
status: active
parent: "[[01-plugin-patterns|plugin interception patterns]]"
created: 2026-05-09T01:25:51
updated: 2026-05-09T01:25:51
tags:
  - agent/research
  - obsidian/folders
  - obsidian/properties
created_by: codex
updated_by: codex
---

# Folder Notes And Properties DOM

## Folder Notes

Sources:

- <https://github.com/LostPaul/obsidian-folder-notes/blob/main/src/events/MutationObserver.ts>
- <https://github.com/LostPaul/obsidian-folder-notes/blob/main/src/events/handleClick.ts>
- <https://github.com/LostPaul/obsidian-folder-notes/blob/main/src/functions/folderNoteFunctions.ts>
- <https://github.com/LostPaul/obsidian-folder-notes/blob/main/src/functions/styleFunctions.ts>

Folder Notes uses two layers:

1. A `MutationObserver` to initialize dynamic folder and breadcrumb elements.
2. Capture-phase `click` and `auxclick` listeners to catch real interactions.

### File Explorer Folders

The observer queries `.nav-folder-title-content`, then climbs to
`.nav-folder-title` and reads `data-path`. It marks initialized elements through
`folderTitle.dataset.initialized = "true"` and retries briefly when Obsidian has
inserted the title text before the full folder node or `data-path`.

Pointer hover on folder titles stores the active element and, if
`Keymap.isModEvent(event)` is present and a folder note exists, triggers
`hover-link`.

Main click handling checks:

- right click ignored
- shift ignored
- target is inside `.nav-folder-title`
- target is not whitespace/collapse-only when settings say so
- folder path comes from `data-path`
- excluded folders are allowed to fall through

It opens the folder note through:

```ts
workspace.getLeaf(Keymap.isModEvent(evt) || setting).openFile(file);
```

### Breadcrumbs

Breadcrumb setup queries `.view-header-title-container`, then finds
`.view-header-title-parent`. It iterates child nodes, skips
`.view-header-breadcrumb-separator`, reconstructs the folder path, adds
`has-folder-note` and `data-path`, and attaches a capture click handler to the
breadcrumb element.

The handler prevents native behaviour only when it will open or create a folder
note. If the folder is excluded or no folder-note action applies, it falls back
to native click behaviour.

### Vaultman Assimilation

For folder nodes and breadcrumbs, reuse the same pattern:

- Observe `.nav-folder-title-content` and `.view-header-title-parent` children.
- Read folder identity from native `data-path`.
- Add Vaultman-only classes/data flags, never replace Obsidian structure.
- Capture `click` and `auxclick` on `document`.
- Preserve collapse icon and whitespace semantics.
- Delegate to `NodeBindingService` with `kind: "folder"` and label/path-derived
  token rules.

## Obsidian Properties DOM

The local installed Obsidian renderer was inspected through
`resources/obsidian.asar`. The relevant CSS selectors were in `app.css`.

Shared properties block:

- `.metadata-container`
- `.metadata-properties`
- `.metadata-properties-heading`
- `.metadata-property`
- `.metadata-property-key`
- `input.metadata-property-key-input`
- `.metadata-property-value`

Tag pills inside properties:

- `.metadata-property[data-property-key="tags"] .multi-select-pill`
- `.metadata-property-value[data-property-type="tags"] .multi-select-pill`
- `.multi-select-container`
- `.multi-select-pill`
- `.multi-select-pill-content`
- `.multi-select-input`
- `.multi-select-pill-remove-button`

Internal links inside property values use:

- `.metadata-property-value .internal-link`

File Properties tab:

- `.workspace-leaf-content[data-type=file-properties]`
- `.workspace-leaf-content[data-type=file-properties] .metadata-properties-heading`

All Properties tab:

- `.workspace-leaf-content[data-type=all-properties] .view-content`

Visible document properties are the same `.metadata-container`, hidden by
default and displayed when the editor/preview has `show-properties`:

- `.markdown-source-view.is-live-preview.show-properties .metadata-container:not(.mod-error)`
- `.markdown-preview-view.show-properties .metadata-container`

These are internal selectors. Treat them as runtime-probed selectors with smoke
tests, not as a public API.

