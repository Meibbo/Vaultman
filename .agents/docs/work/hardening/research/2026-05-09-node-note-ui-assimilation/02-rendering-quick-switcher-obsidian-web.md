---
title: Markdown rendering, quick switcher, and obsidian-web
type: agent-research-shard
status: active
parent: "[[index|node note UI assimilation research]]"
created: 2026-05-09T01:25:51
updated: 2026-05-09T01:25:51
tags:
  - agent/research
  - obsidian/markdown
  - obsidian/testing
  - vaultman/page-stats
created_by: codex
updated_by: codex
---

# Rendering, Quick Switcher, And Test Harness Research

This shard is a compact manifest for rendering and testing research. The technical detail is split into continuation shards:

- [[02a-markdown-quick-switcher|Markdown rendering and quick switcher choices]]
- [[02b-obsidian-web|obsidian-web safety and test-harness assessment]]

## Pattern Summary

Task Notes uses the current Obsidian public markdown renderer:

```ts
MarkdownRenderer.render(app, markdown, container, sourcePath, component);
```

That is the right primitive for rendering a selected note inside a Vaultman-owned frame. The key requirement is lifecycle hygiene: create/load a child `Component` per rendered note preview, and unload it when switching notes, returning to PageStats, or destroying the Svelte component.

The Quick Switcher part needs a product decision. Opening the native command is easy, but hijacking its selected file without changing the workspace is not a confirmed public API. The safe near-term implementation is a `FuzzySuggestModal<TFile>` that behaves like a native picker and returns the file to Vaultman's frame callback.

`obsidian-web` is interesting for future DOM tests, but it is not ready to trust or vendor. Treat it as isolated research only.

## Vaultman Target Shape

Statistics page state should become:

- `statsViewMode: "stats" | "note"`
- `statsPreviewFile: TFile | null`
- a render host for selected-note markdown
- an add-ons island action to open the picker
- an add-ons island action to return to PageStats

Current integration points:

- `src/components/frame/framePages.ts`: Statistics left FAB is still a stub.
- `src/components/frame/frameVaultman.svelte`: owns page/FAB state and can hold the selected statistics view mode.
- `src/components/pages/pageStats.svelte`: currently renders only PageStats; it can either gain a note-preview branch or be wrapped by a statistics shell.
- `src/components/layout/navbarPillFab.svelte`: already routes gestures through `serviceMouse`; no special FAB event code should be added here.

