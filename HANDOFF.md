# HANDOFF: Vaultman node-notes Feature Session
**Date:** 2026-09-04  
**Agent:** opencode-node-notes-worker-0903 (m2, feat/node-notes @ 15b2676d)  
**Room:** `room_20260621_025201_8756df` (agent: `opencode-node-notes-worker-0903`, role `worker`)  
**Worktree:** `~/wt/integ` (branch `feat/node-notes`, base `1613c97b`)  
**Deploy target:** m2 `~/storage/shared/Documents/plugin-dev/.obsidian/plugins/vaultman/` (hash `2e872ea3`)

---

## 🎯 What Was Delivered (All Complete)

### 1. Surface Guard — task_108 (P1 click bug)
- **Deny-by-default allowlist** in `serviceNativeSurfaceBinding.ts:resolveNativeBindingTarget`
- Explicit exclusion: `.modal-container`, `.menu`, `.prompt` (returns `null`)
- `[data-plugin-id]` / `[data-snippet-name]` **removed** from allowlist (P1 vector)
- Primary click (button 0, no modifiers) → `"none"` **before** any `preventDefault` (B1 fix)
- Only modifiers (ctrl/meta/alt/middle) trigger actions

### 2. Three Supervisor Issues (All Fixed)

| Issue | Fix | Commit |
|-------|-----|--------|
| **ISSUE 1**: link-type discrimination | `detectLinkType()` returns `hyperlink`/`url_link`/`wikilink`/`plain`; only wikilink gets NN link; `parseWikilinkDisplay()` for core visual | `474a8e2b`, `7882189e` |
| **ISSUE 2**: Breadcrumb nn-link | `hasBoundFolderNote()` + `decorateBoundBreadcrumbs()` toggle simétrico, leaf-aware, sin colisión de alias | `ac23cf74`, `4ca1e501`, `fac83fa4`, `dfaa2f7b`, `e02a292b` |
| **ISSUE 3**: Hover preview gate | `defaultMod: true` en core `page-preview`; `hover-link` incondicional en `mouseover` habilita keydown diferido | `8f25eb0c`, `4ff7531f`, `96254478` |

### 3. Rename Preview Spec (`rename-preview-decorated-cell-format`)
- `preview` flag in `PropertyValueRenderContext` → anchors neutralized (`preventDefault`+`stopPropagation`, no `openLinkText`)
- `renderPropertyValue` dispatch in 3 preview branches (checkbox/date/text all via `RENDER_MAP`)
- `findStagedRenameIndex` helper + `_wirePreviewDateReplace` (date picker replaces staged op via `remove` + `_replaceValueInVault`)
- Empty state decorated, `data-preview="rename"` marker, `is-unresolved` for wikilinks

### 4. Configurable Prefixes (4 Patterns with `name` Placeholder)
| Kind | Setting Key | Default Pattern | Placeholder |
|------|-------------|-----------------|-------------|
| Tags | `nodeNoteTagPattern` | `#name` | `name` |
| Snippets | `nodeNoteSnippetPattern` | `$name` | `name` |
| Plugins | `nodeNotePluginPattern` | `%name` | `name` |
| Props | `nodeNotePropPattern` | `[name]` | `name` |

- Single pattern per kind (prefix + suffix split at `"name"`)
- Settings UI: 4 text inputs with placeholders `#name`/`$name`/`%name`/`[name]`
- onChange: captures old prefixes → `planAliasPrefixMigration` → stages `property` rename ops via `queueService.addOrRun` → Notice with count

### 5. Staged Alias Migration
- `planAliasPrefixMigration` (pure) + `mapAlias` rewrites only aliases with old affixes
- onChange: scans vault → `planAliasPrefixMigration(oldP, newP)` → stages `property`/`rename` ops via `queueService.addOrRun` → Notice with count
- Legacy pelado aliases untouched; only current config rules

---

## 🧪 Verification & State

| Check | Result |
|-------|--------|
| Test suite | **1894 pass** / 3 skipped |
| TypeScript | Clean |
| Stylelint | Clean |
| Deploy hash | `2e872ea3` (verified in plugin-dev m2) |
| Commits (local, no push) | `15b2676d`, `2722d30e`, `5d113a63`, `55c93b29`, `ad921401`, `11889acc`, `9954bfec`, `4ff7531f`, `af4d77e3`, `edce8b58`, `7882189e`, `4ca1e501`, `ac23cf74`, `f4bbadc0`, `ed2fd545`, `1613c97b` |

**Web-lab caveat:** Tab caches bundle at page-load. `disable/enable` **does not** refetch. Dev must **hard-refresh (Ctrl+Shift+R)** or reload plugin in native app to see new build.

---

## 🗂️ Key Files & Where Things Live

| Area | Files |
|------|-------|
| Surface guard / click handling | `src/services/serviceNativeSurfaceBinding.ts` |
| Prefix config & alias logic | `src/services/serviceNodeBinding.ts` |
| Breadcrumb interception | `src/services/serviceBreadcrumbFileScene.ts` |
| Rename preview | `src/utils/renderPropertyValue.ts`, `src/components/containers/explorerProps.ts` |
| Prefix types/settings | `src/types/typeSettings.ts`, `src/VaultmanSettings.ts` |
| i18n keys | `src/i18n/en.ts`, `src/i18n/es.ts` |
| Tests | `test/unit/propertyValueRenderMap.test.ts`, `test/unit/nativeSurfaceBinding.test.ts`, `test/unit/nodeBinding.test.ts`, `test/unit/nodeNotePrefixMigration.test.ts`, `test/unit/renameBadge.test.ts`, `test/unit/breadcrumbFileScene.test.ts`, `test/unit/explorerNodeNoteLabel.test.ts` |

---

## 🪤 Traps & Gotchas (Hard-Won)

### 1. Web-lab Bundle Caching
- **Symptom:** `disable/enable` plugin → no code change visible
- **Cause:** Web-lab loads bundle at page-load; `disable/enable` only toggles plugin instance, doesn't refetch bundle
- **Fix:** Hard-refresh tab (Ctrl+Shift+R) or reload plugin in native Obsidian app

### 2. `applyFilters` Doesn't Trigger Live UI Update
- **Symptom:** `plugin.filterService.applyFilters()` called but NN link doesn't appear until tab switch
- **Cause:** `applyFilters` recomputes filter tree but doesn't re-render explorer panels
- **Fix:** Use targeted DOM patch (words/tasks pattern): `_bindAndRefreshLive` with `onBound` callback that adds class directly to rendered label. Context menu uses vault events (works). Click handler was the gap.

### 3. `prefixesFromSettings` Type Narrowing
- **Symptom:** TS errors when passing `VaultmanSettings` to function expecting partial shape
- **Fix:** Accept `unknown`, cast internally: `const s = (settings ?? {}) as { nodeNoteTagPattern?: unknown; ... }`

### 4. `bindOrCreate` Normalizes Wikilink Labels
- **Bug:** Creating note from `[[Nueva]]` stored filename/alias as `[[Nueva]]` (brackets)
- **Fix:** In `bindOrCreate`, before folder handling: `if (wikilinkTarget) node = { ...node, label: wikilinkTarget }` — strips brackets, uses target as label/alias

### 5. `valueMatchesBoundAlias` Uses Target, Not Raw
- **Bug:** Wikilink `[[Nueva]]` with alias `Nueva` never matched (checked raw `[[Nueva]]`)
- **Fix:** `valueMatchesBoundAlias` calls `parseWikilink(raw)?.target` then checks alias set

### 6. Preview Anchors Navigate (Bug)
- **Symptom:** Clicking hyperlink/url_link in rename preview navigates instead of trapping click
- **Fix:** `preview` flag in `PropertyValueRenderContext` → anchors get `if (!preview) openLinkText` + `preventDefault` always

### 7. `findStagedRenameIndex` Needs `details` Guard
- **Bug:** Property rename ops may lack `details` field → `.match()` throws
- **Fix:** `change.details?.match(/→ "(.*?)"/)` optional chaining

### 8. Preview Date Picker Replaces Staged Op
- **Mechanism:** `_wirePreviewDateReplace` attaches `change` listener to date input → `queueService.remove(stagedIndex)` + `_replaceValueInVault(propName, rawValue, next)` — replaces staged op, no direct vault write

### 9. Breadcrumb Click Dead Zone (Task_113)
- **Bug:** `revealFolderInFileScene` returned `false` → `handleBreadcrumbFileSceneClick` returned `true` (suppressed click) **without flash**
- **Fix:** Always flash when leaf found; ignore reveal return value; `file-open` + `active-leaf-change` + `MutationObserver` for proactive decoration

### 10. Preview Date Picker Disabled by Default
- **Bug:** Date preview showed disabled input
- **Fix:** In `_wirePreviewDateReplace`: `input.removeAttribute('disabled')` before attaching listener

### 11. Web-lab Bundle Caching (The Big One)
- **Symptom:** Deploy verified, CLI `reload-plugin` works, but UI unchanged
- **Cause:** Web-lab serves bundle from service worker / browser cache; `main.js` hash updated on disk but tab runs old module
- **Fix:** **Hard-refresh browser tab (Ctrl+Shift+R)** or reload plugin in native Obsidian app. CLI `reload-plugin` does not bust cache.

### 12. Context Menu for Breadcrumbs (TFolder)
- **Bug:** Native file-menu ignores `TFolder` (passes to file handler which returns early)
- **Fix:** In `serviceContextMenu.ts:file-menu` handler: if `!(file instanceof TFile)` → call `_injectFolderNodeNote` (resolves `resolveFolderMenuTarget` → `bindOrCreate`)

### 12. Tag Primary Click → Search (Exception to B1)
- **Rule:** Primary click on tag → `search-selection` (only tag kind; others keep deny-by-default)
- **Location:** `resolveActionForEvent` — check `target.node.kind === "tag"` before B1 gate

---

## 🔧 Commands Cheatsheet

```bash
# Run tests
cd ~/wt/integ && npx vitest run --config vitest.unit.config.mts

# Type check
cd ~/wt/integ && npx tsc -noEmit -skipLibCheck

# Build & deploy to plugin-dev
cd ~/wt/integ && pnpm run build:plugin && cp main.js manifest.json styles.css ~/storage/shared/Documents/plugin-dev/.obsidian/plugins/vaultman/

# Reload in web-lab (requires hard-refresh in browser)
~/bin/obsidian-cli reload-plugin vaultman

# Room heartbeat
node ~/vaultman/.agents/tools/pkm-ai/agent-room.ts agent heartbeat --run current --agent opencode-node-notes-worker-0903 --message "msg" --room-url http://127.0.0.1:8787 --room-passphrase 6a8a0372

# Verify deploy hash
sha256sum ~/wt/integ/main.js ~/storage/shared/Documents/plugin-dev/.obsidian/plugins/vaultman/main.js
```

---

## 📦 Deploy Checklist (For Next Agent)

- [ ] Hard-refresh web-lab tab (Ctrl+Shift+R) or reload plugin in native app
- [ ] Run smoke test: toggle Community plugins, breadcrumb click, tag click, hover ctrl+preview, rename preview
- [ ] Verify prefix inputs in settings → change one → check queue for staged alias renames
- [ ] Verify breadcrumb cmenu shows "Open Node-Note" for folders

---

## 🏁 Final State

**All done.** Commits local, worktree clean, suite 1894 pass, deploy `2e872ea3` verified in plugin-dev m2. Web-lab needs hard-refresh. Next agent: pick up from here if any follow-up needed.

---

*End of handoff. Good luck.*