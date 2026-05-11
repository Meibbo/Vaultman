---
title: DELTA Interaction
type: implementation-plan-shard
status: draft
parent: "[[docs/work/polish/plans/2026-05-11-elastic-ui-chameleon/index|elastic-ui-chameleon]]"
created: 2026-05-10T20:20:23
updated: 2026-05-10T20:20:23
tags:
  - agent/plan
  - elastic-ui
  - delta
created_by: codex
updated_by: codex
---

# DELTA Interaction

## Ownership

- Modify: `src/services/serviceMouse.ts`
- Modify: `src/services/serviceDnd.ts`
- Modify: `src/services/serviceDndSvelteAdapter.ts`
- Modify: `src/services/serviceNativeSurfaceBinding.ts`
- Modify: `src/services/serviceNodeBinding.ts`
- Modify: `src/index/i18n/en.ts`
- Modify: `src/index/i18n/es.ts`
- Create: `src/services/serviceI18nAttrs.ts`
- Create: `test/unit/services/serviceI18nAttrs.test.ts`
- Modify or create tests:
  `test/unit/services/serviceMouse.test.ts`,
  `test/unit/services/serviceDnd.test.ts`,
  `test/unit/services/serviceDndSvelteAdapter.test.ts`,
  `test/unit/services/serviceNativeSurfaceBinding.test.ts`,
  `test/unit/services/serviceNodeBinding.test.ts`,
  `test/component/cmenuCreateBindingNote.test.ts`

## Task D1: Update Mouse Ignore Selectors

Modify `NODE_MOUSE_IGNORE_SELECTOR` in `src/services/serviceMouse.ts`:

```ts
export const NODE_MOUSE_IGNORE_SELECTOR = [
	'input',
	'textarea',
	'select',
	'button',
	'a',
	'.vm-tree-toggle',
	'.vm-node-grid-toggle',
	'.vm-badge',
	'.vm-tree-child-badge-indicator',
	'[role="button"]',
	'[data-bits-button-root]',
	'[data-bits-menu-item]',
	'[data-bits-dropdown-menu-item]',
	'[data-bits-popover-trigger]',
	'[data-vm-interactive]',
].join(', ');
```

Verification:

```bash
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceMouse.test.ts --fileParallelism=false
```

Expected: clicking inside a Bits menu item returns `ignored`; normal node row
click still resolves primary/secondary/tertiary gestures.

## Task D2: i18n Attribute Bridge

Create `src/services/serviceI18nAttrs.ts`:

```ts
import { translate } from '../index/i18n/lang';

export interface I18nAttrsInput {
	labelKey?: string;
	titleKey?: string;
	placeholderKey?: string;
	fallback?: string;
}

export interface I18nAttrs {
	'aria-label'?: string;
	title?: string;
	placeholder?: string;
}

export function i18nAttrs(input: I18nAttrsInput): I18nAttrs {
	return {
		'aria-label': text(input.labelKey, input.fallback),
		title: text(input.titleKey),
		placeholder: text(input.placeholderKey),
	};
}

function text(key: string | undefined, fallback = ''): string | undefined {
	if (!key) return fallback || undefined;
	const value = translate(key);
	return value || fallback || undefined;
}
```

Usage in Svelte:

```svelte
<button
	type="button"
	class="vm-node-action obsidian-mimic-btn"
	{...i18nAttrs({ labelKey: 'cmenu.binding_note.create_or_open' })}
	onclick={(event) => mouse.handleClick({ key: node.id }, event, handlers)}
>
	<span class="i-lucide-notebook vm-icon-sm" aria-hidden="true"></span>
</button>
```

Verification:

```bash
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceI18nAttrs.test.ts --fileParallelism=false
pnpm run check
```

Expected: bridge returns translated `aria-label`, `title`, and `placeholder`
without forcing components to import translation keys repeatedly.

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
- Preserve `Ctrl`, `Meta`, `Alt`, and middle-click as binding gestures unless
  the user explicitly narrows the grammar later.

Verification:

```bash
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceNativeSurfaceBinding.test.ts --fileParallelism=false
```

Expected: tag, folder, snippet, and plugin native elements resolve to binding
inputs; Ctrl+Click calls `bindOrCreate`; hover-link fires only for exactly one
matching alias note.

## Task D4: Alias Association Logic

Extend tests around `computeAliasToken`:

```ts
expect(computeAliasToken({ kind: 'tag', label: 'project' })).toBe('#project');
expect(computeAliasToken({ kind: 'snippet', label: 'wide-table.css' })).toBe('$wide-table.css');
expect(computeAliasToken({ kind: 'plugin', label: 'Calendar', pluginId: 'calendar' })).toBe('%calendar');
```

If product decision prefers snippet aliases without `.css`, normalize in both
provider and native interception, then tests must assert `$wide-table`. Do not
allow one path to use `$wide-table.css` and another to use `$wide-table`.

Verification:

```bash
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceNodeBinding.test.ts --fileParallelism=false
```

Expected: alias tokens are deterministic across context menu, hover badge, and
native Ctrl+Click routes.

## Task D5: DnD Adapter Gate Execution

If dependency gate keeps `@dnd-kit/svelte`:

- Preserve `createDndKitDraggableInput`, `createDndKitDroppableInput`, and
  `createDndKitProviderHandlers`.
- Add drag subject kinds for outline blocks if not already present:

```ts
export type DndSubjectKind =
	| 'node'
	| 'row'
	| 'group'
	| 'column'
	| 'tab'
	| 'filter'
	| 'card'
	| 'outline-block';
```

- Add operation:

```ts
export type DndOperation = 'reorder' | 'move' | 'apply-template' | 'embed-block';
```

If dependency gate approves `@thisux/sveltednd`, DELTA must:

- Replace `@dnd-kit/svelte` imports in `serviceDndSvelteAdapter.ts`.
- Preserve the exported semantic functions under compatibility names or update
  all call sites in the same shard.
- Update tests to assert the semantic `DndDropResult`, not library event shapes.

Verification:

```bash
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceDnd.test.ts test/unit/services/serviceDndSvelteAdapter.test.ts --fileParallelism=false
```

Expected: drag start, drag over, drag end, cancel, selected multi-drag, and
outline block target tests pass.

## Task D6: Notes For Nodes Ctrl+Click Smoke

After build and reload:

```bash
pnpm run build:plugin
obsidian vault=plugin-dev plugin:reload id=vaultman
obsidian vault=plugin-dev eval code="(() => { const svc=app.plugins.plugins.vaultman?.nodeBindingService; return !!svc; })()"
obsidian vault=plugin-dev dev:errors
```

Expected: eval returns `true`; errors contain no Vaultman stack.

Manual DOM smoke for a synthetic tag:

```bash
obsidian vault=plugin-dev eval code="(() => { const el=activeDocument.createElement('span'); el.className='cm-hashtag'; el.textContent='#project'; activeDocument.body.appendChild(el); el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,ctrlKey:true})); el.remove(); return true; })()"
```

Expected: command returns true and does not throw. If no matching alias note
exists, `NodeBindingService` creates or routes according to current service
rules.

## Task D7: Main View Snippet Orchestration Contract

DELTA does not own layout implementation, but must preserve interaction events
when Main View uses Svelte snippets:

```svelte
{#snippet col1()}
	<ExplorerActiveFiltersComp onRuleClick={handleRuleClick} />
{/snippet}

{#snippet col2()}
	<FiltersPage
		{plugin}
		bind:filtersActiveTab
		onOperationScopeChange={setFiltersOperationScope}
	/>
{/snippet}

{#snippet col3()}
	{#if statsPreviewFile}
		<StatisticsPage {plugin} previewFile={statsPreviewFile} onShowStats={showStatsPage} />
	{:else}
		<OperationsPage {plugin} {icon} />
	{/if}
{/snippet}
```

All event handlers passed into these snippets must continue through
`serviceMouse` and current keyboard handlers. Do not attach global listeners in
snippet bodies.

Verification:

```bash
pnpm exec vp test run --project component --config vitest.config.ts test/component/framePages.test.ts test/component/frameOverlaysCommandHooks.test.ts test/component/navbarTabs.test.ts --fileParallelism=false
```

Expected: page navigation, overlay hooks, and keyboard/mouse actions continue
to pass after dashboard snippets are introduced by the owning layout shard.
