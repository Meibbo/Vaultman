# Research B — serviceTheme + service-unload (core-plugin disguise)

Status: COMPLETE (agent a1e90361c6cd7f880)

## musiweb3/obsidian-web

NOT found under that name. Real repo is **`MusiCode1/obsidian-web`** ("Run Obsidian's desktop app in a standard browser — no Electron"). Useful indirectly: documents Obsidian internals by shimming Electron/Node, not by manipulating core plugins. Lesson for Vaultman = the **system-plugin overlay pattern** (inject a plugin + merge `community-plugins.json` on read). Does not show core-plugin override techniques.

## What exists today (worktree jovial-wilson-f81c67)

- `src/services/serviceTheme.svelte.ts` — `ThemeService` runes class. `mode`/`identity` state, `useUtilities` (`mode !== 'thin'`), `useNativeDom` (`mode === 'thin' || identity === 'native'`), `rootClasses`, `hydrate()`. NO DOM binding, NO theme-set switching. Diverges from plan doc's `bindRoot`/`syncRootClasses` design (never built).
- `src/services/serviceTheme.ts` — separate OLDER `applyVaultmanTheme(body, settings)`. Toggles `vm-theme-default|native|polish|glass|custom` on `<body>`. `LAYOUT_THEME_OPTIONS` = those 5, `custom` disabled. Closest thing to a theme-set selector, but class-list only, decoupled from the runes service.
- `src/main.ts:144` constructs `ThemeService`; `:393` calls `applyVaultmanTheme`. TWO parallel theme systems, not unified.
- `uno.config.ts` — `presetWind3({preflight:false})` + `presetAttributify` + `presetIcons`. Safelists `vm-root`, `vm-mode-*`, `vm-id-*`, `obsidian-mimic-*`. Shortcuts: `vm-card`, `vm-btn-primary`, `obsidian-mimic-file-layout`. NO theme-token / preset-theme layer.
- `src/styles/_elastic.scss` — `.vm-root` CSS-var contract (`--vm-accent`, `--vm-bg`...), `.vm-faint`, `.vm-reduced-motion`, per-`vm-id-*` density vars. Live token surface.
- `src/styles/explorer/_tree.scss` — `.vm-tree-*` styling; also restyles native `.tree-item-icon`, `.tree-item-flair`.
- Mirror classes (`nav-file`, `tree-item`, `metadata-property`) emitted directly in Svelte via `class:` arbitration keyed off `themeService.useNativeDom` (task 2.3 confirmed done).
- `src/types/typeObsidian.ts` — typed wrapper for internals: `internalPlugins.plugins[id]`, `plugins.enablePluginAndSave/disablePluginAndSave`, `getInternalPlugin()`, `setCommunityPluginEnabled()`, `setCssSnippetEnabled()`. ADR-004 mandates all `(app as any)` go through here. Foundation for `service-unload`.
- `src/services/serviceNativeSurfaceBinding.ts` — capture-phase click/mouseover listeners on native selectors (`.nav-folder-title`, `.tag-pane-tag`), `registerHoverLinkSource`. Proof Vaultman already does DOM-level interception of core surfaces.
- Bits UI: only `vmPopover.svelte` + `vmDialog.svelte` (`Popover.Root`, portal). Minimal; no styling-hook strategy yet.
- NO code disables/unloads a core plugin. `service-unload` / function-selector does NOT exist.

## Core-plugin disguise: how

Supported API (from `obsidian-api/obsidian.d.ts`, all @public): `registerView` (0.9.7), `registerBasesView` (1.10.0, returns false if bases disabled), `registerExtensions`, `registerHoverLinkSource` (1.1.0), `registerEditorExtension`. Let Vaultman ADD leaf/view types and own file extensions — solid, version-stable.

`internalPlugins` is NOT in the typed public API. `app.internalPlugins.plugins['file-explorer'].disable()` works at runtime but is undocumented/private. HAZARD: Obsidian loads community plugins BEFORE enabling core plugins, so calling `.disable()/.enable()` at the wrong time persists config and can disable ALL core plugins (forum-reported). `typeObsidian.ts` wraps `disablePluginAndSave` but NOT internal-plugin disable — deliberate-looking gap.

Legitimate disguise path: do NOT disable `file-explorer`. Register Vaultman's own view, let the user place it, optionally collapse the core one. Mirror classes already let community theme snippets target it identically.

DOM-manipulation paths (fragile): hide core explorer leaf via CSS/`display:none`, or capture-phase event interception. The toolbar-takeover plan chose `opacity` + `pointer-events:none` over `display:none` to avoid virtualizer invalidation. Risk: selectors (`.nav-files-container`, `.workspace-leaf-content[data-type=...]`) can change between Obsidian versions; capture listeners can break other plugins.

## Multi-theme architecture (serviceTheme recommendation)

Unify the two services into one. Stack (May 2026, Svelte 5 + UnoCSS + Bits UI):
1. Theme tokens via **`unocss-preset-theme`** — each style set (`vaultman`, `native`, `polish`, `glass`) as a theme object → emitted as CSS custom properties under a theme class.
2. `serviceTheme` owns ONE root class (`vm-theme-<name>`) on `.vm-root`, driven by the runes service (not the detached `applyVaultmanTheme`). The `.vm-root` CSS-var contract in `_elastic.scss` is the indirection layer; the "native" theme re-points `--vm-accent` etc. to Obsidian's `--text-accent`, `--nav-item-*`, `--background-*`.
3. `useNativeDom` stays the structural switch (gates whether components emit `nav-file`/`tree-item`). "Native theme" = `useNativeDom` true + `vm-theme-native` re-mapping tokens. Purely additive — existing `vm-mode-*`/`vm-id-*` styling untouched.
4. Bits UI is headless — style via `class={...}` props + `data-*` attributes (`[data-state=open]`). Pass theme-aware UnoCSS shortcuts. Avoid hardcoded colors in component `<style>` blocks.

## service-unload / function selector

Preset-driven, building on `typeObsidian.ts`: a runes `serviceUnload` holds a registry `{ coreId, displayName, vmReplacement, mode: 'off'|'collapsed'|'replace' }`. Presets ("Control Panel") = named toggle sets, persisted in plugin settings (mirror obsidian-web's merge-on-read pattern, or better: don't touch `app.json` at all — just collapse leaves visually). Safe ops: register Vaultman views, collapse core leaves via workspace API, emit mirror classes. Add a `setInternalPluginEnabled()` wrapper to `typeObsidian.ts` ONLY if true disable is required — gate behind `workspace.onLayoutReady` to dodge the load-order corruption bug. Always reversible: store original enabled-state, restore on `onunload`.

## Verdict + risks + unknowns

Theme-switching: highly feasible, low risk — both halves exist, work is unifying them + adding a token layer. Additive by construction.

Core-plugin disguise: feasible for "look + add", risky for "truly replace". Safe = registered views, mirror classes, hover sources, visual leaf-collapse (all public API). Fragile = `internalPlugins.*.disable()`, CSS hiding by version-specific selectors, capture-phase interception.

Biggest risks: (1) toggling core plugins persisting bad config → disables all core plugins; (2) DOM selectors breaking on Obsidian updates; (3) capture listeners interfering with other plugins; (4) `registerBasesView` silently returns false if bases disabled.

Unknowns: (a) whether Obsidian's new "Community" platform/safety-scorecard (~2026-05-13) flags internal-plugin manipulation in review; (b) exact runtime shape of `internalPlugins.plugins['file-explorer']`; (c) whether collapsing the core explorer leaf survives workspace save/restore; (d) `registerBasesView`/`BasesViewRegistration` API details.

Sources: MusiCode1/obsidian-web, obsidianmd/obsidian-api (obsidian.d.ts), Obsidian Plugin docs, forum thread on accessing other plugins' settings, unocss-preset-theme, UnoCSS Svelte Scoped, dsebastien.net "The Future of Obsidian Plugins" (2026-05-13).
