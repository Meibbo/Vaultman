---
title: DELTA Native Alias
type: implementation-plan-shard
status: draft
parent: "[[docs/work/polish/plans/2026-05-11-elastic-ui-chameleon/04-delta-interaction|delta-interaction]]"
created: 2026-05-10T20:20:23
updated: 2026-05-10T20:20:23
tags:
  - agent/plan
  - elastic-ui
  - delta
created_by: codex
updated_by: codex
---

# DELTA Native Alias

## Task D3: Native Surface Interception Expansion

Modify `src/services/serviceNativeSurfaceBinding.ts`:

- Keep existing tag/folder selectors.
- Add snippet selectors:

```ts
const SNIPPET_SELECTORS = [
	'.setting-item[data-snippet-id]',
	'.setting-item-name[data-snippet-id]',
	'.css-snippet-row',
	'[data-vm-native-snippet]',
] as const;
```

- Add plugin selectors:

```ts
const PLUGIN_SELECTORS = [
	'.community-plugin',
	'.installed-plugins-container .setting-item',
	'[data-plugin-id]',
	'[data-vm-native-plugin]',
] as const;
```

- Resolve snippet node as `{ kind: 'snippet', label: filenameWithoutCss }`.
- Resolve plugin node as `{ kind: 'plugin', label: displayName, pluginId }`.
- Preserve `Ctrl`, `Meta`, `Alt`, and middle-click as binding gestures unless the user explicitly narrows the grammar later.

Verification:

```bash
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceNativeSurfaceBinding.test.ts --fileParallelism=false
```

Expected: tag, folder, snippet, and plugin native elements resolve to binding inputs; Ctrl+Click calls `bindOrCreate`; hover-link fires only for exactly one matching alias note.

## Task D4: Alias Association Logic

Extend tests around `computeAliasToken`:

```ts
expect(computeAliasToken({ kind: 'tag', label: 'project' })).toBe('#project');
expect(computeAliasToken({ kind: 'snippet', label: 'wide-table.css' })).toBe('$wide-table.css');
expect(computeAliasToken({ kind: 'plugin', label: 'Calendar', pluginId: 'calendar' })).toBe('%calendar');
```

If product decision prefers snippet aliases without `.css`, normalize in both provider and native interception, then tests must assert `$wide-table`. Do not allow one path to use `$wide-table.css` and another to use `$wide-table`.

Verification:

```bash
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceNodeBinding.test.ts --fileParallelism=false
```

Expected: alias tokens are deterministic across context menu, hover badge, and native Ctrl+Click routes.

## Task D6: Notes For Nodes Ctrl+Click Smoke

```bash
pnpm run build:plugin
obsidian vault=plugin-dev plugin:reload id=vaultman
obsidian vault=plugin-dev eval code="(() => { const svc=app.plugins.plugins.vaultman?.nodeBindingService; return !!svc; })()"
obsidian vault=plugin-dev eval code="(() => { const el=activeDocument.createElement('span'); el.className='cm-hashtag'; el.textContent='#project'; activeDocument.body.appendChild(el); el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,ctrlKey:true})); el.remove(); return true; })()"
obsidian vault=plugin-dev dev:errors
```

Expected: commands do not throw. If no matching alias note exists, `NodeBindingService` creates or routes according to current service rules.
