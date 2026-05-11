---
title: GAMMA Overlays
type: implementation-plan-shard
status: draft
parent: "[[docs/work/polish/plans/2026-05-11-elastic-ui-chameleon/index|elastic-ui-chameleon]]"
created: 2026-05-10T20:20:23
updated: 2026-05-10T20:20:23
tags:
  - agent/plan
  - elastic-ui
  - gamma
created_by: codex
updated_by: codex
---

# GAMMA Overlays

## Ownership

- Modify: `package.json`
- Modify: `src/components/layout/overlays/layoutOverlay.svelte`
- Modify: `src/components/layout/overlays/overlayIsland.svelte`
- Modify: `src/components/layout/overlays/overlayViewMenu.svelte`
- Modify: `src/components/layout/overlays/overlaySortMenu.svelte`
- Modify: `src/components/layout/overlays/tabViewMenuDetach.svelte`
- Modify: `src/services/serviceOverlayState.svelte.ts`
- Create: `src/components/overlays/BitsPortalTarget.svelte`
- Create: `src/components/overlays/VmDialog.svelte`
- Create: `src/components/overlays/VmPopover.svelte`
- Create: `test/component/overlayPortalTarget.test.ts`
- Create: `test/component/overlayEscapeFocus.test.ts`
- Create: `test/unit/services/serviceOverlayStateBits.test.ts`

## Task G1: Add Bits UI Dependency

- [ ] Add dependency:

```json
"bits-ui": "latest"
```

- [ ] Do not add copied shadcn-svelte components in this shard. Use Bits UI
  primitives directly so Vaultman controls DOM and classes.

Verification:

```bash
pnpm install --lockfile-only
node -e "const p=require('./package.json'); console.log(Boolean(p.dependencies['bits-ui']))"
pnpm run check
```

Expected: node prints `true`; check exits 0.

## Task G2: Portal Target Wrapper

Create `src/components/overlays/BitsPortalTarget.svelte`:

```svelte
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { ThemeService } from '../../services/serviceTheme.svelte';

	let {
		theme,
		children,
	}: {
		theme: ThemeService;
		children: Snippet<[]>;
	} = $props();

	const target = $derived(theme.portalTarget);
</script>

{#if target}
	{@render children()}
{/if}
```

Bits UI portal components must receive the root element from
`theme.portalTarget` using the current Bits UI prop name. If the installed Bits
UI version uses `to`, pass `to={target}`. If it uses `target`, pass
`target={target}`. Record the exact prop in the test name and wrapper comments.

Verification:

```bash
pnpm exec vp test run --project component --config vitest.config.ts test/component/overlayPortalTarget.test.ts --fileParallelism=false
```

Expected: rendering a popover from a fake pop-out document appends content under
that fake `.vm-root`, not under the primary `document.body`.

## Task G3: Dialog Wrapper

Create `src/components/overlays/VmDialog.svelte`:

```svelte
<script lang="ts">
	import { Dialog } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import type { ThemeService } from '../../services/serviceTheme.svelte';

	let {
		theme,
		open = $bindable(false),
		label,
		children,
	}: {
		theme: ThemeService;
		open: boolean;
		label: string;
		children: Snippet<[]>;
	} = $props();

	const target = $derived(theme.portalTarget);
</script>

<Dialog.Root bind:open>
	{#if target}
		<Dialog.Portal to={target}>
			<Dialog.Overlay class="vm-dialog-overlay" />
			<Dialog.Content class="vm-dialog-content vm-daisy-card" aria-label={label}>
				{@render children()}
			</Dialog.Content>
		</Dialog.Portal>
	{/if}
</Dialog.Root>
```

If installed Bits UI uses a different portal prop, adapt only the prop and keep
the wrapper API stable.

Verification:

```bash
pnpm exec vp test run --project component --config vitest.config.ts test/component/overlayEscapeFocus.test.ts --fileParallelism=false
```

Expected: Escape closes the dialog, focus returns to the trigger, and the dialog
is inside `.vm-root`.

## Task G4: Popover Wrapper

Create `src/components/overlays/VmPopover.svelte`:

```svelte
<script lang="ts">
	import { Popover } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import type { ThemeService } from '../../services/serviceTheme.svelte';

	let {
		theme,
		open = $bindable(false),
		trigger,
		content,
	}: {
		theme: ThemeService;
		open: boolean;
		trigger: Snippet<[]>;
		content: Snippet<[]>;
	} = $props();

	const target = $derived(theme.portalTarget);
</script>

<Popover.Root bind:open>
	<Popover.Trigger class="vm-popover-trigger">
		{@render trigger()}
	</Popover.Trigger>
	{#if target}
		<Popover.Portal to={target}>
			<Popover.Content class="vm-popover-content vm-daisy-card">
				{@render content()}
			</Popover.Content>
		</Popover.Portal>
	{/if}
</Popover.Root>
```

Verification:

```bash
pnpm exec vp test run --project component --config vitest.config.ts test/component/overlayViewMenu.test.ts test/component/overlaySortMenu.test.ts test/component/overlayPortalTarget.test.ts --fileParallelism=false
```

Expected: view and sort menus open with keyboard and mouse, render inside
`.vm-root`, and keep existing menu item labels/actions.

## Task G5: Migrate layoutOverlay

Modify `src/components/layout/overlays/layoutOverlay.svelte`:

- Replace manual `role="dialog"` root with `VmDialog`.
- Use `plugin.themeService` for portal target.
- Keep existing child popup components and close callbacks.
- Preserve current overlay CSS classes on content roots so SCSS remains valid:
  `.vm-popup-overlay`, `.vm-popup-content`, `.vm-popup-island`.

Verification:

```bash
pnpm exec vp test run --project component --config vitest.config.ts test/component/overlaySortMenu.test.ts test/component/overlayViewMenu.test.ts test/component/popupIsland.test.ts --fileParallelism=false
obsidian vault=plugin-dev eval code="(() => Array.from(activeDocument.querySelectorAll('.vm-popup-content,.vm-dialog-content')).every(el => el.closest('.vm-root')))()"
```

Expected: tests pass and eval returns `true` after opening an overlay.

## Task G6: Multi-Window Safety Test

Add a component test that creates two documents:

- main jsdom document
- synthetic pop-out document with its own `.vm-root`

Bind `ThemeService` to the pop-out root, open a dialog, and assert:

```ts
expect(popoutRoot.querySelector('.vm-dialog-content')).toBeTruthy();
expect(document.body.querySelector('.vm-dialog-content')).toBeFalsy();
```

Verification:

```bash
pnpm exec vp test run --project component --config vitest.config.ts test/component/overlayPortalTarget.test.ts --fileParallelism=false
```

Expected: pop-out isolation passes.

## Task G7: Obsidian Smoke

```bash
pnpm run build:plugin
obsidian vault=plugin-dev plugin:reload id=vaultman
obsidian vault=plugin-dev command id=vaultman:open
obsidian vault=plugin-dev eval code="(() => { const root=activeDocument.querySelector('.vm-root'); return !!root && !activeDocument.body.matches('.vm-dialog-content,.vm-popover-content'); })()"
obsidian vault=plugin-dev dev:errors
```

Expected: eval returns `true`; no Vaultman stack appears in dev errors.
