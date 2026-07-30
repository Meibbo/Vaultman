---
title: Node note UI assimilation research
type: agent-research
status: active
parent: "[[docs/work/hardening/specs/2026-05-07-multifacet-2/05-note-binding-and-set|binding notes and set]]"
created: 2026-05-09T01:25:51
updated: 2026-05-09T01:25:51
tags:
  - agent/research
  - obsidian/dom
  - vaultman/node-binding
  - vaultman/page-stats
  - vaultman/page-tools
created_by: codex
updated_by: codex
---

# Node Note UI Assimilation Research

## Scope

The user asked for GitHub research on four Obsidian-plugin behaviours and one new testing candidate:

1. How Tag Wrangler lets Ctrl/Cmd-click on a tag open the note assigned to that tag.
2. How Folder Notes intercepts breadcrumbs and folders in the file explorer.
3. How Obsidian names the DOM for visible document properties and the File Properties tab.
4. How Task Notes renders markdown so Vaultman can render a selected note inside the frame.
5. Whether `MusiCode1/obsidian-web` is safe or useful as a future test harness.
6. How MySnippets controls CSS snippets for a future `pageTools` snippets tab.
7. How Lazy Plugin Loader lists and controls community plugins for a future `pageTools` plugins tab.

Detailed notes are split into:

- [[01-plugin-patterns|Plugin interception patterns and Obsidian properties DOM]]
- [[02-rendering-quick-switcher-obsidian-web|Markdown rendering, quick switcher, and obsidian-web]]
- [[03-tools-snippets-plugins|pageTools snippets and plugins explorers]]

## Executive Findings

Tag Wrangler is the closest precedent for "a note for a node". It maintains an alias-backed index of note pages for tags, then registers capture-phase document handlers for native tag surfaces. On Alt-click it opens in the current pane; on Ctrl/Cmd-click or middle click it opens with the value returned by `Keymap.isModEvent(event)`.

Folder Notes is the closest precedent for Obsidian-native folder and breadcrumb interception. It combines a `MutationObserver`, idempotent DOM setup flags, and capture-phase document `click`/`auxclick` handlers. It reads folder identity from native `data-path` attributes on `.nav-folder-title` and generated `.view-header-breadcrumb` elements.

Obsidian properties use the shared classes `.metadata-container`, `.metadata-properties`, `.metadata-property`, `.metadata-property-key`, and `.metadata-property-value`. The File Properties tab is rooted under `.workspace-leaf-content[data-type=file-properties]`. The visible document properties block is the same `.metadata-container`, gated by `.markdown-source-view.is-live-preview.show-properties` or `.markdown-preview-view.show-properties`.

Task Notes uses the current public renderer:
`MarkdownRenderer.render(app, markdown, el, sourcePath, component)`. For a Vaultman-owned frame, this is the right pattern: create a child `Component`, load it, render the selected file body into a host element, and unload that component whenever the frame returns to PageStats or selects another note.

The native Quick Switcher command can be opened through `commands.executeCommandById("switcher:open")`, but there is no confirmed public API to intercept the chosen file and prevent the normal workspace open. The safe implementation is a Vaultman `FuzzySuggestModal<TFile>` that feels native but returns the selected file to the frame. If the requirement is strictly "use the core Quick Switcher modal and hijack selection", that needs a live Obsidian runtime inspection before implementation.

`MusiCode1/obsidian-web` is promising as architecture research, not as a dependency. It is brand new on 2026-05-09, has no discovered license, exposes a localhost-only but unauthenticated file server, and runs Obsidian through partial Node/Electron shims. Use only as an isolated spike, pinned to an exact commit, with no real vault data and no vendored code.

MySnippets confirms Obsidian's internal custom-CSS surface:
`app.customCss.snippets`, `enabledSnippets`, `setCssEnabledStatus`, `getSnippetsFolder`, `getSnippetPath`, and `requestLoadSnippets`. This matches Vaultman's existing `indexSnippets.ts` comment, but the alias rule needs to be updated from the earlier generic `snippet -> label` rule to `snippet -> $snippetname`.

Lazy Plugin Loader confirms the community-plugin surface:
`app.plugins.manifests`, `app.plugins.enabledPlugins`, `app.plugins.plugins[id]?._loaded`, `enablePlugin`, `enablePluginAndSave`, and `disablePluginAndSave`. This is private/internal API, so Vaultman should wrap it in `typeObsidian.ts` and treat plugin toggling as an explicit high-impact action. The binding-note alias should be `plugin -> %pluginname`; for stability, prefer manifest `id` as the canonical "pluginname" token and show manifest `name` as the UI label.

## Vaultman Implications

The existing Vaultman model already matches the important part of Tag Wrangler:
`src/services/serviceNodeBinding.ts` resolves node aliases through a 0/1/N algorithm. The next step is not a new binding model; it is a native-DOM adapter that calls the existing service from Obsidian tag, property, folder, and breadcrumb surfaces.

Recommended implementation order:

1. Add a small `serviceNativeNodeBindingDom` or plugin-level registrar that installs capture handlers for native surfaces and delegates to `NodeBindingService`.
2. Extend `NodeBindingService.bindOrCreate` with an optional open target from `Keymap.isModEvent(event)` so native Ctrl/Cmd/middle click can open in a new tab/split/window like Obsidian does.
3. Add hover preview support by resolving the binding note first, then triggering `workspace.trigger("hover-link", ...)` with `linktext: file.path`.
4. Turn the Statistics left FAB in `src/components/frame/framePages.ts` into an add-ons island action. It is currently a stub: icon `lucide-blocks`, label `Add-ons`, empty action.
5. Let the add-ons island expose two actions: `Open note` and `Show PageStats`.
   `Open note` should open a Vaultman-controlled file picker first; switch to a native Quick Switcher hijack only after live runtime proof.
6. Add a PageStats display mode in `src/components/frame/frameVaultman.svelte` and `src/components/pages/pageStats.svelte`, or split the note preview into a dedicated child component mounted in the statistics page.
7. Add `pageTools` tabs for snippets and plugins. Snippet nodes come from CSS files in `${vault.configDir}/snippets`, use binding alias `$snippetname`, and render an enable/disable toggle where normal count text appears. Plugin nodes come from `app.plugins.manifests`, use binding alias `%pluginname`, and should expose plugin enable/disable only through an explicit guarded action.
8. Extend `BindingNodeKind` with `plugin`, and change the existing future `snippet` rule before implementation. Current spec text still says `snippet/template -> label==filename`; this research supersedes that for snippets and adds plugins.

## Known Constraints

- The local Obsidian CLI was not available. `obsidian` resolved to `Obsidian.com`, the Windows app launcher, not the plugin-dev CLI. No running Obsidian process was available for DOM live inspection.
- Obsidian DOM selectors are internal, not stable public API. They need smoke tests or runtime feature detection.
- The current worktree already had unrelated modified and untracked files before this research record was written. This record does not depend on those changes.

## Source Index

- Tag Wrangler: <https://github.com/pjeby/tag-wrangler/blob/master/src/plugin.js>
- Tag Wrangler tag helpers: <https://github.com/pjeby/tag-wrangler/blob/master/src/Tag.js>
- Folder Notes MutationObserver: <https://github.com/LostPaul/obsidian-folder-notes/blob/main/src/events/MutationObserver.ts>
- Folder Notes click handling: <https://github.com/LostPaul/obsidian-folder-notes/blob/main/src/events/handleClick.ts>
- Folder Notes folder helpers: <https://github.com/LostPaul/obsidian-folder-notes/blob/main/src/functions/folderNoteFunctions.ts>
- Task Notes release notes renderer: <https://github.com/callumalpass/tasknotes/blob/main/src/views/ReleaseNotesView.ts>
- Task Notes relationship markdown injection: <https://github.com/callumalpass/tasknotes/blob/main/src/editor/RelationshipsDecorations.ts>
- Task Notes inline link renderer: <https://github.com/callumalpass/tasknotes/blob/main/src/ui/renderers/linkRenderer.ts>
- MySnippets plugin: <https://github.com/chetachiezikeuzor/MySnippets-Plugin>
- MySnippets menu implementation: <https://github.com/chetachiezikeuzor/MySnippets-Plugin/blob/main/src/ui/snippetsMenu.ts>
- MySnippets create modal: <https://github.com/chetachiezikeuzor/MySnippets-Plugin/blob/main/src/modal/createSnippetModal.ts>
- Lazy Plugin Loader: <https://github.com/alangrainger/obsidian-lazy-plugins>
- Lazy Plugin Loader main implementation: <https://github.com/alangrainger/obsidian-lazy-plugins/blob/main/src/main.ts>
- Lazy Plugin Loader settings UI: <https://github.com/alangrainger/obsidian-lazy-plugins/blob/main/src/settings.ts>
- Obsidian API package: local `node_modules/obsidian/obsidian.d.ts`
- Obsidian renderer CSS: local Obsidian `resources/obsidian.asar`, inspected as a primary installed artifact.
- obsidian-web: <https://github.com/MusiCode1/obsidian-web>
