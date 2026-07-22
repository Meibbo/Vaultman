---
title: BT5 final stable audit plan — self-disable and Snippet Reveal
type: implementation-plan-shard
status: active
lifecycle: active
parent: "[[index|Operation regressions]]"
created: 2026-07-22T15:45:00
updated: 2026-07-22T15:45:00
created_by: codex-gpt5-root
updated_by: codex-gpt5-root
tags: [agent/plan, initiative/polish, release/1.2.0, addons]
---

# BT5-049 self-disable and BT5-050 canonical Snippet Reveal

## Task 2 — Vaultman self-disable from state cell and action

**Modify:** `src/components/containers/explorerPlugins.ts`, `src/logic/logicPluginContextMenu.ts`, locale files, `test/unit/addonExplorerSource.test.ts`, `test/unit/addonIcons.test.ts`.

### Red

Replace the stale source contract:

```ts
expect(pluginsPanelSource).not.toContain('addons.plugins.self_protected');
expect(pluginsPanelSource).toContain('setCommunityPluginEnabled');
```

Add one executable policy used by cell and menu:

```ts
export function canToggleCommunityPlugin(meta: PluginMeta): boolean {
	return Boolean(meta.pluginId);
}
export function canUninstallCommunityPlugin(meta: PluginMeta): boolean {
	return Boolean(meta.pluginId) && !meta.isVaultman;
}
```

Test `isVaultman:true` gives `true` / `false`. Run red:

```powershell
pnpm exec vitest run --config vitest.unit.config.mts test/unit/addonExplorerSource.test.ts test/unit/addonIcons.test.ts
```

### Green

- Remove only the self-protected branch from the state toggle.
- Route cell and menu through the same enable/disable helper/pending guard.
- Keep uninstall absent/disabled for Vaultman.
- Once self-disable starts, tolerate component teardown; do not schedule UI work assuming the plugin stays loaded.
- Retire the warning locale key only when unused and locale parity remains green.

```powershell
pnpm exec vitest run --config vitest.unit.config.mts test/unit/addonExplorerSource.test.ts test/unit/addonIcons.test.ts test/unit/addonExplorerLogic.test.ts
pnpm run check
git diff --check
```

**HITL:** disable via cell/action; enable a disabled third-party plugin; Vaultman uninstall absent. Restart/re-enable between self-disable cases. Commit: `fix(plugins): allow Vaultman self-disable`.

## Task 3 — canonical Snippet Reveal

**Modify:** `src/logic/logicSnippetContextMenu.ts`, canonical Files action metadata location, locale files, `test/unit/addonIcons.test.ts`, `test/unit/addonExplorerSource.test.ts`.

### Red

Assert exactly one system-explorer action, translated label and canonical Files reveal icon; keep it distinct from `snippet.open-default-app`:

```ts
expect(snippetActionIds.filter((id) => id === 'snippet.reveal')).toHaveLength(1);
expect(reveal.icon).toBe(FILE_REVEAL_ACTION_ICON);
expect(reveal.label(ctx)).toBe(messages['snippet.reveal']);
```

Current `snippet.see-details`, literal English and icon mismatch must make this red.

### Green

- Reuse/export the canonical Files reveal icon/descriptor.
- Rename/migrate to `snippet.reveal`; normalize saved layout IDs without losing order/visibility.
- Add English/Spanish translations.
- Preserve `showInFolder(getSnippetPath(name))`; keep Open default app distinct.

```powershell
pnpm exec vitest run --config vitest.unit.config.mts test/unit/addonIcons.test.ts test/unit/addonExplorerSource.test.ts
pnpm run check
git diff --check
```

- [ ] Runtime: one localized menu row, Files glyph, correct CSS file selected.
- [ ] Commit: `fix(snippets): canonicalize reveal action`.
