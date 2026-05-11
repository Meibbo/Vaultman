---
title: GAMMA Dialog And Popover
type: implementation-plan-shard
status: draft
parent: "[[docs/work/polish/plans/2026-05-11-elastic-ui-chameleon/03-gamma-overlays|gamma-overlays]]"
created: 2026-05-10T20:20:23
updated: 2026-05-10T20:20:23
tags:
  - agent/plan
  - elastic-ui
  - gamma
created_by: codex
updated_by: codex
---

# GAMMA Dialog And Popover

## Task G3: Dialog Wrapper

Create `src/components/overlays/VmDialog.svelte`:

```svelte
<script lang="ts">
	import { Dialog } from 'bits-ui';
	import type { Snippet } from 'svelte';
	import type { ThemeService } from '../../services/serviceTheme.svelte';

	let { theme, open = $bindable(false), label, children }: {
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

	let { theme, open = $bindable(false), trigger, content }: {
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
