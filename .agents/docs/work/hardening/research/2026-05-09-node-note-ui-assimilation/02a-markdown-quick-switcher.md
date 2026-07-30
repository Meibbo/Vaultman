---
title: Markdown rendering and quick switcher choices
type: agent-research-shard
status: active
parent: "[[02-rendering-quick-switcher-obsidian-web|rendering quick switcher obsidian-web]]"
created: 2026-05-09T01:25:51
updated: 2026-05-09T01:25:51
tags:
  - agent/research
  - obsidian/markdown
  - vaultman/page-stats
created_by: codex
updated_by: codex
---

# Markdown Rendering And Quick Switcher

## Task Notes Markdown Rendering

Sources:

- <https://github.com/callumalpass/tasknotes/blob/main/src/views/ReleaseNotesView.ts>
- <https://github.com/callumalpass/tasknotes/blob/main/src/editor/RelationshipsDecorations.ts>
- <https://github.com/callumalpass/tasknotes/blob/main/src/ui/renderers/linkRenderer.ts>

Task Notes uses Obsidian's current public renderer:

```ts
await MarkdownRenderer.render(app, markdown, container, sourcePath, component);
```

The local `node_modules/obsidian/obsidian.d.ts` confirms that:

- `MarkdownRenderer.renderMarkdown(markdown, el, sourcePath, component)` is deprecated.
- `MarkdownRenderer.render(app, markdown, el, sourcePath, component)` is the current API.
- `sourcePath` resolves relative internal links.
- `component` owns the lifecycle of rendered children.

Task Notes examples:

- `ReleaseNotesView` is an `ItemView`, so it passes `this` as the render component and renders release markdown into a view-owned container.
- `RelationshipsDecorations` creates a child `Component`, calls `load()`, renders markdown embeds into injected containers, and calls `component.unload()` before removing the DOM.
- For small inline strings, `linkRenderer.ts` does not call the full renderer; it creates `.internal-link` and `a.tag` elements manually and wires `workspace.openLinkText` plus `hover-link`.

## Vaultman Frame Rendering Pattern

Vaultman owns the frame DOM, so it should not inject into `.cm-sizer` or reading mode like Task Notes does. The safe pattern is a contained render host:

```ts
import { Component, MarkdownRenderer, TFile } from "obsidian";

let noteRenderComponent: Component | null = null;

async function renderFileIntoFrame(file: TFile, host: HTMLElement): Promise<void> {
  noteRenderComponent?.unload();
  noteRenderComponent = new Component();
  noteRenderComponent.load();

  host.empty();
  const markdown = await plugin.app.vault.cachedRead(file);
  await MarkdownRenderer.render(plugin.app, markdown, host, file.path, noteRenderComponent);
}

function showStats(host: HTMLElement): void {
  noteRenderComponent?.unload();
  noteRenderComponent = null;
  host.empty();
}
```

The Svelte side should model this as display state, not as a mutation of PageStats internals:

- `statsViewMode: "stats" | "note"`
- `statsPreviewFile: TFile | null`
- note preview host/action that renders after the host is mounted
- cleanup on mode switch, component destroy, and file switch

## Quick Switcher Choice

Vaultman already has a typed wrapper for internal commands:

- `src/types/typeObsidian.ts`
- `runCommand(app, id)`

Public GitHub usage and Obsidian command conventions indicate the native Quick Switcher command id is:

```ts
runCommand(app, "switcher:open");
```

However, opening the native switcher is not the same as using it as a picker for Vaultman's frame. No confirmed public API was found to:

1. Open the core Quick Switcher.
2. Receive the selected `TFile`.
3. Prevent the selected file from opening in the workspace.
4. Render that file in Vaultman's frame instead.

The public, safe alternative is `FuzzySuggestModal<TFile>`. The local Obsidian API exposes:

- `getItems(): T[]`
- `getItemText(item: T): string`
- `onChooseItem(item: TFile, evt: MouseEvent | KeyboardEvent): void`

Recommended implementation:

1. Build a `VaultmanFileSuggestModal extends FuzzySuggestModal<TFile>`.
2. Return `app.vault.getMarkdownFiles()` from `getItems`.
3. In `onChooseItem`, call a frame callback with the chosen file instead of opening the workspace leaf.
4. Style/render suggestions enough to feel native, but keep it on public API.

Riskier alternatives:

- Open `switcher:open`, listen for the next `workspace.on("file-open")`, then mirror that file into Vaultman. This changes the user's active leaf.
- Inspect and patch the core switcher modal internals. This is private API and should require a dedicated runtime spike.

