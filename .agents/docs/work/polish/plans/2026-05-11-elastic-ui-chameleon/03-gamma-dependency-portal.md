---
title: GAMMA Dependency And Portal
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

# GAMMA Dependency And Portal

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
