---
title: pageTools snippets and plugins explorers
type: agent-research-shard
status: active
parent: "[[index|node note UI assimilation research]]"
created: 2026-05-09T01:25:51
updated: 2026-05-09T01:25:51
tags:
  - agent/research
  - obsidian/snippets
  - obsidian/plugins
  - vaultman/page-tools
created_by: codex
updated_by: codex
---

# pageTools Snippets And Plugins Explorers

## MySnippets Reference

Sources:

- <https://github.com/chetachiezikeuzor/MySnippets-Plugin>
- <https://github.com/chetachiezikeuzor/MySnippets-Plugin/blob/main/src/plugin/main.ts>
- <https://github.com/chetachiezikeuzor/MySnippets-Plugin/blob/main/src/ui/snippetsMenu.ts>
- <https://github.com/chetachiezikeuzor/MySnippets-Plugin/blob/main/src/modal/createSnippetModal.ts>
- <https://github.com/chetachiezikeuzor/MySnippets-Plugin/blob/main/src/settings/type.ts>

MySnippets adds a status-bar button and an `open-snippets-menu` command. Its menu uses Obsidian internal `app.customCss`:

- `customCss.snippets`: snippet names without `.css`
- `customCss.enabledSnippets.has(snippet)`: current enabled state
- `customCss.setCssEnabledStatus(snippet, enabled)`: toggle active state
- `customCss.getSnippetsFolder()`: path to `.obsidian/snippets`
- `customCss.getSnippetPath(snippet)`: full snippet file path
- `customCss.requestLoadSnippets()`: reload snippets after file changes

Each menu row sets the snippet title, creates a `ToggleComponent`, and wires `onChange` to invert `enabledSnippets.has(snippet)`. It also adds an "open" button that calls `app.openWithDefaultApp(snippetPath)`.

Snippet creation uses:

```ts
await app.vault.create(`${customCss.getSnippetsFolder()}/${fileName}.css`, fileContents);
customCss.setCssEnabledStatus(fileName, true);
customCss.requestLoadSnippets();
```

Vaultman does not need to copy MySnippets' menu UI. The useful part is the internal control surface and lifecycle: list, toggle, create, reload.

Licensing note: the repo has a full MPL-2.0 `LICENSE` file while `package.json` declares `MIT`. Treat it as reference material, not copy-paste source, unless the license mismatch is resolved.

## Snippets Tab Implications

Existing Vaultman context:

- `src/index/indexSnippets.ts` is a stub that already says future work will read from `app.customCss?.snippets`.
- `src/types/typeContracts.ts` already has `SnippetNode { name, enabled }`.
- `src/services/serviceNodeBinding.ts` already includes `snippet` in `BindingNodeKind`, but the current generic rule maps it to the raw label.

Required plan correction:

- Old generic future rule: `snippet -> label==filename`.
- New rule from this request: `snippet -> $snippetname`.

Recommended shape:

1. Add internal `customCss` typing to `src/types/typeObsidian.ts`.
2. Implement `createCSSSnippetsIndex(app)` from `app.customCss.snippets` when available, with filesystem fallback over `${vault.configDir}/snippets/*.css`.
3. Add `explorerSnippets` provider over `SnippetNode`.
4. Add `tabSnippets.svelte` mounted inside `pageTools`.
5. Add `snippets` to `TTabs` with an icon such as `lucide-paintbrush`.
6. Render a toggle in the count slot for each snippet row.
7. On toggle, call `customCss.setCssEnabledStatus(name, enabled)` and then refresh the snippet index.
8. Add binding-note action that calls `NodeBindingService` with `kind: "snippet"` and token `$${name}`.

The count-slot toggle should not overload `TreeNode.count` with fake numbers.
Either extend the view model with an explicit right-side control, or use a `NodeBadge` quick action styled to occupy the same visual area as `.vm-tree-count`. The model state should remain `meta.enabled` / `SnippetNode.enabled`.

## Lazy Plugin Loader Reference

Sources:

- <https://github.com/alangrainger/obsidian-lazy-plugins>
- <https://github.com/alangrainger/obsidian-lazy-plugins/blob/main/src/main.ts>
- <https://github.com/alangrainger/obsidian-lazy-plugins/blob/main/src/settings.ts>

Lazy Plugin Loader lists installed community plugins from:

```ts
Object.values(this.app.plugins.manifests)
```

It filters out itself and desktop-only plugins on mobile, then sorts by `manifest.name`. It derives state from:

- `app.plugins.enabledPlugins.has(pluginId)`
- `app.plugins.plugins?.[pluginId]?._loaded`

It controls plugins through private/internal methods:

- `disablePluginAndSave(pluginId)` for disabled-at-startup state
- `enablePluginAndSave(pluginId)` for enabled-at-startup state
- `enablePlugin(pluginId)` for temporary current-session load after delayed startup

The settings UI presents one row per plugin and a dropdown for startup mode:
disabled, instant, short delay, long delay. Changing a row updates saved config and then calls the startup-control function for that plugin.

Licensing note: Lazy Plugin Loader declares MIT in both `LICENSE` and `package.json`, but Vaultman should still reimplement the small internal-API wrapper rather than copy UI code.

## Plugins Tab Implications

Add a new `tabPlugins` in `pageTools` that shows all community plugins as nodes.

Recommended model:

- Source: `app.plugins.manifests`.
- Label: `manifest.name`.
- Stable id: `manifest.id`.
- State: enabled, loaded, desktop-only, version, author, description.
- Binding token: `plugin -> %pluginname`.

Because Obsidian has both `manifest.id` and `manifest.name`, define "pluginname" carefully before implementation. Recommended canonical token:
`%${manifest.id}` because ids are stable and unique. Show `manifest.name` in the explorer label. If human-readable aliases are required, create notes with both aliases later: `%plugin-id` and `%Plugin Display Name`.

Plugin enable/disable is higher risk than snippet toggling. Recommended guard:

- Read/list all plugins by default.
- Binding-note creation/opening is normal.
- Enable/disable should be an explicit action or toggle only after a confirm affordance, never an accidental row click.
- Never offer disable for Vaultman itself.
- Avoid save-on-toggle unless the user explicitly wants persistent state;
  `enablePlugin(pluginId)` is session-only, while `enablePluginAndSave` and `disablePluginAndSave` mutate Obsidian's saved community-plugin state.

Implementation needs a typed internal wrapper in `typeObsidian.ts` similar to the existing `commands`, `internalPlugins`, and `plugins` wrappers. Do not spread raw `(app as any).plugins` usage across providers/components.
