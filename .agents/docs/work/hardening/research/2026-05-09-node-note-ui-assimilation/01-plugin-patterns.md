---
title: Plugin interception patterns and Obsidian properties DOM
type: agent-research-shard
status: active
parent: "[[index|node note UI assimilation research]]"
created: 2026-05-09T01:25:51
updated: 2026-05-09T01:25:51
tags:
  - agent/research
  - obsidian/dom
  - vaultman/node-binding
created_by: codex
updated_by: codex
---

# Plugin Interception Patterns

This shard is a compact manifest for the native Obsidian UI interception research. The technical detail is split into continuation shards:

- [[01a-tag-wrangler|Tag Wrangler tag-page interception]]
- [[01b-folder-notes-properties|Folder Notes interception and properties DOM]]

## Pattern Summary

Tag Wrangler and Folder Notes use the same broad strategy:

1. Keep semantic lookup state outside the DOM.
2. Install document-level capture listeners for native Obsidian UI surfaces.
3. Use native DOM attributes/classes only to identify the clicked thing.
4. Delegate actual behavior to plugin services.
5. Prevent native Obsidian behaviour only after the plugin has definitely handled the event.
6. Register hover previews through `workspace.trigger("hover-link", ...)`.

This maps directly to Vaultman's existing binding-note model. The alias logic is already in `src/services/serviceNodeBinding.ts`; the missing work is a native DOM adapter for tags, properties, folders, and breadcrumbs.

## Vaultman Target Shape

Add a registrar, probably plugin-owned rather than Svelte-owned:

```ts
registerNativeNodeBindingDom(plugin: VaultmanPlugin): void;
```

Responsibilities:

- Register capture `click`, `mousedown`, and `auxclick` handlers for known native surfaces.
- Register `mouseover` handlers for hover preview.
- Use `Keymap.isModEvent(event)` to preserve Obsidian's open-target semantics.
- Convert native targets to `BindingNodeInput`.
- Delegate to `plugin.nodeBindingService`.
- Clean up listeners on plugin unload.

Do not monkey-patch `metadataCache.getTags()` unless Vaultman later needs native Tags view counts to show binding-note-only tags. That Tag Wrangler behaviour is useful for Tag Wrangler but not necessary for opening node notes.

