---
title: Tag Wrangler tag-page interception
type: agent-research-shard
status: active
parent: "[[01-plugin-patterns|plugin interception patterns]]"
created: 2026-05-09T01:25:51
updated: 2026-05-09T01:25:51
tags:
  - agent/research
  - obsidian/tags
  - vaultman/node-binding
created_by: codex
updated_by: codex
---

# Tag Wrangler

Source: <https://github.com/pjeby/tag-wrangler/blob/master/src/plugin.js>

Tag Wrangler treats a tag page as a note whose `aliases` frontmatter includes
the tag token. It builds two maps:

- `pageAliases: Map<TFile, string[]>`
- `tagPages: Map<string, TFile[]>`

The plugin scans `metadataCache.getCachedFiles()` after layout is ready, reads
frontmatter aliases with `parseFrontMatterAliases`, keeps only aliases that pass
`Tag.isTag`, canonicalizes them through `Tag.canonical`, and updates the maps.
It also listens to:

- `metadataCache.on("changed", (file, data, cache) => updatePage(file, cache?.frontmatter))`
- `vault.on("delete", file => updatePage(file))`

It monkey-patches `metadataCache.getTags()` via `monkey-around` so tag pages can
appear in the Tags view even when no note currently uses the tag. Vaultman
should avoid this unless it later has a concrete need to mutate Obsidian's
global tag count surface.

Tag page creation writes a minimal alias block:

```yaml
---
Aliases: [ "#tag" ]
---
```

The exact casing differs from Vaultman's current `aliases` key, but Obsidian
normalizes both. Vaultman should keep lowercase `aliases` for consistency with
`serviceNodeBinding.ts`.

## Native Tag Surfaces

Tag Wrangler registers a `TagPageUIHandler` for these native surfaces:

| Surface | Selector | Container / scope |
| --- | --- | --- |
| Tags pane | `.tag-pane-tag` | `.tag-container` |
| Reading mode tags | `a.tag[href^="#"]` | `.markdown-preview-view`, `.markdown-embed`, `.workspace-leaf-content` |
| Properties tags | `.metadata-property[data-property-key="tags"] .multi-select-pill` | `.metadata-properties` |
| Live editor tags | `span.cm-hashtag` | `.markdown-source-view` |

The editor case is special: a tag can be split across adjacent CodeMirror
tokens, so the handler joins adjacent `.cm-hashtag` spans before extracting the
full tag text.

## Click and Hover Behaviour

Open handling uses a capture listener on `document`. For editor tags it listens
to `mousedown`; for other tag surfaces it listens to `click`.

The important branch:

- If neither Alt nor `Keymap.isModEvent(event)` is present, native behaviour is
  allowed.
- If the tag has a tag page, it opens that file.
- If no tag page exists, it asks whether to create one.
- Only after handling does it call `event.preventDefault()` and
  `event.stopImmediatePropagation()`.

Alt opens in the current pane. Ctrl/Cmd-click and middle click use
`Keymap.isModEvent(event)` and pass its return value to `workspace.getLeaf(...)`.
In Obsidian this may represent a tab, split, or window target, not just a
boolean.

Hover preview uses:

```ts
workspace.trigger("hover-link", {
  event,
  source,
  targetEl,
  linktext: tagPage.path,
  hoverParent,
});
```

## Vaultman Assimilation

Vaultman already has the alias algorithm in `src/services/serviceNodeBinding.ts`:

- `tag -> #name`
- `prop -> [name]`
- `folder`, `value`, `snippet`, `template -> label`
- 0 matches: create binding note.
- 1 match: open note.
- N matches: route to filter pane with `aliases has <token>`.

The missing layer is a native DOM adapter:

1. Register capture handlers for the same tag/property surfaces.
2. Resolve a `BindingNodeInput`.
3. Call `NodeBindingService.bindOrCreate(input, openTarget?)`.
4. Prevent native behaviour only after Vaultman has handled the click.
5. Register hover handlers that resolve the binding file and trigger
   `hover-link`.

