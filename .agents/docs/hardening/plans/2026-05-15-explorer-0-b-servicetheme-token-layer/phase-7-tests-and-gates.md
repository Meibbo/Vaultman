---
title: Phase 7 — Component tests and final gates
type: plan-shard
status: draft
parent: "[[docs/work/hardening/plans/2026-05-15-explorer-0-b-servicetheme-token-layer/index|0-B plan]]"
created: 2026-05-16T00:00:00
updated: 2026-05-16T00:00:00
tags:
  - agent/plan
  - explorer/theme
---

# Phase 7 — Component Tests And Final Gates

Two tasks. T16 adds a component test for `rootClasses` flowing into a
mounted frame; T17 runs the final verification gate.

## Task 16 — Component test for frameVaultman root classes

**Files:**
- Create: `test/component/fixtures/FrameRootHarness.svelte`
- Create: `test/component/frameVaultmanRootClasses.test.ts`

- [ ] **Step 1: Create the harness fixture**

Create `test/component/fixtures/FrameRootHarness.svelte`:

```svelte
<script lang="ts">
  import type { ThemeService } from '../../../src/services/serviceTheme.svelte';
  let { themeService }: { themeService: ThemeService } = $props();
  const rootClasses = $derived(themeService.rootClasses.join(' '));
</script>

<div data-testid="vm-root-harness" class={rootClasses}></div>
```

- [ ] **Step 2: Write failing tests**

Create `test/component/frameVaultmanRootClasses.test.ts`:

```typescript
import { describe, expect, it, afterEach } from 'vitest';
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';
import { ThemeService } from '../../src/services/serviceTheme.svelte';
import FrameRootHarness from './fixtures/FrameRootHarness.svelte';

afterEach(() => {
  document.querySelectorAll('style[data-vm-theme-presets="custom"]')
    .forEach(el => el.remove());
});

describe('frameVaultman root class composition (via harness)', () => {
  it('renders vm-theme-vaultman on the root element by default', () => {
    const themeService = new ThemeService();
    const { container } = render(FrameRootHarness, { props: { themeService } });
    const root = container.querySelector('[data-testid="vm-root-harness"]');
    expect(root?.classList.contains('vm-root')).toBe(true);
    expect(root?.classList.contains('vm-theme-vaultman')).toBe(true);
    expect(root?.classList.contains('vm-theme-native')).toBe(false);
  });

  it('switches to vm-theme-native when setPreset("native") is called', async () => {
    const themeService = new ThemeService();
    const { container } = render(FrameRootHarness, { props: { themeService } });
    themeService.setPreset('native');
    await tick();
    const root = container.querySelector('[data-testid="vm-root-harness"]');
    expect(root?.classList.contains('vm-theme-native')).toBe(true);
    expect(root?.classList.contains('vm-theme-vaultman')).toBe(false);
  });

  it('renders mode and identity classes alongside theme class', () => {
    const themeService = new ThemeService();
    themeService.mode = 'balanced';
    themeService.identity = 'outline';
    const { container } = render(FrameRootHarness, { props: { themeService } });
    const root = container.querySelector('[data-testid="vm-root-harness"]');
    expect(root?.classList.contains('vm-mode-balanced')).toBe(true);
    expect(root?.classList.contains('vm-id-outline')).toBe(true);
    expect(root?.classList.contains('vm-theme-vaultman')).toBe(true);
  });
});
```

- [ ] **Step 3: Run tests — expect PASS or FAIL**

Run: `pnpm exec vitest run --project component --config vitest.config.ts test/component/frameVaultmanRootClasses.test.ts --fileParallelism=false`

If FAIL: likely cause is a Svelte 5 prop or testing-library mismatch.
Check that `render(Component, { props: { ... } })` is the correct API
for the project's `@testing-library/svelte` version. Adjust the call
shape if needed (newer versions accept just `{ themeService }` while
older ones require `{ props: { themeService } }` or `{ ... }`
directly). Match the pattern used elsewhere in `test/component/`.

Expected: PASS after API alignment.

- [ ] **Step 4: `pnpm check`**

Run: `pnpm check`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add test/component/fixtures/FrameRootHarness.svelte \
        test/component/frameVaultmanRootClasses.test.ts
git commit -m "$(cat <<'EOF'
test(0-b): component test for ThemeService.rootClasses through mount

Mounts a minimal Svelte harness that consumes themeService.rootClasses
the same way frameVaultman.svelte does. Asserts that the rendered
.vm-root element carries vm-theme-vaultman by default, swaps to
vm-theme-native on setPreset, and continues to include vm-mode-* and
vm-id-* classes alongside the theme class.

Harness avoids mounting frameVaultman directly because of its
unrelated dependencies (plugin instance, services, FabDef, etc.). The
contract under test is the rootClasses-to-DOM flow only.
EOF
)"
```

## Task 17 — Final verification gate

**Files:** none modified.

This task is the end-to-end check. Run every gate from the spec's Sec 8
and Sec 9. If anything fails, fix inline; do not commit a half-broken
state.

- [ ] **Step 1: Run `pnpm verify`**

Run: `pnpm verify`
Expected: PASS — lint + check + build + unit + component all green.

- [ ] **Step 2: Run all spec verification queries (Sec 9 V2)**

Run each:

```bash
grep -rn "applyVaultmanTheme" src/ test/
```
Expected: empty.

```bash
grep -rn "vm-glass-blur" src/
```
Expected: empty.

```bash
grep -rn "body\.vm-theme\|body \.vm-theme" src/styles/
```
Expected: empty.

```bash
grep -rn "normalizeLayoutTheme\|LAYOUT_THEME_OPTIONS\|LayoutTheme" src/
```
Expected: empty.

```bash
grep -rn "updateGlassBlur" src/ test/
```
Expected: empty.

If any non-empty: investigate, fix, run the gate again.

- [ ] **Step 3: Run targeted theme tests**

Run:

```bash
pnpm exec vitest run --project unit --config vitest.config.ts test/unit/services/serviceThemeRunes.test.ts test/unit/types/typeThemePreset.test.ts test/unit/types/typeElasticUi.test.ts test/unit/config/themePresetsBuiltin.test.ts
pnpm exec vitest run --project component --config vitest.config.ts test/component/themeServiceCustomStyleInjection.test.ts test/component/frameVaultmanRootClasses.test.ts test/component/settingsUI.test.ts --fileParallelism=false
```

Expected: all green.

- [ ] **Step 4: Live `plugin-dev` smoke (recommended)**

If `plugin-dev` exists and Obsidian CLI is available:

1. Build: `pnpm run build` (syncs to plugin-dev directory).
2. Reload Obsidian.
3. Open the Obsidian developer console.
4. Confirm default state:
   ```javascript
   document.querySelector('.vm-root.vm-theme-vaultman')
   // expected: HTMLElement, not null
   ```
5. Switch preset:
   ```javascript
   const root = document.querySelector('.vm-root');
   plugin.themeService.setPreset('native');
   // wait one frame
   root.classList.contains('vm-theme-native')   // true
   root.classList.contains('vm-theme-vaultman') // false
   ```
6. Visually inspect: popup chrome opaque/clear, row density compact.
7. Switch back:
   ```javascript
   plugin.themeService.setPreset('vaultman');
   ```
8. Visually inspect: popup chrome semi-translucent with blur, rows
   comfortable.

If chrome/density does not visually change between presets, the SCSS
migration in Phase 5 likely missed a consumer — investigate and patch.

- [ ] **Step 5: Update current status and handoff**

After all gates pass, update the navigational docs:

- `.agents/docs/current/status.md` — replace the "Next Action" pointer
  with a brief mention that 0-B implementation is complete and
  reference the spec + plan.
- `.agents/docs/current/handoff.md` — record this completion in the
  Resume Point + Fresh Verification sections.

Keep edits compact (status.md and handoff.md are navigational indexes
per AGENTS.md). Link to the spec, plan, and any new initiative
follow-ups.

Example diff in `current/handoff.md` Resume Point:

> - Latest request handled: implemented Explorer Phase 0 sub-system B
>   (serviceTheme unification + theme preset registry) per the
>   2026-05-15 spec. All 17 implementation tasks landed across phases
>   0-7. Final `pnpm verify` passed; live `plugin-dev` smoke confirmed
>   preset switching between `native` and `vaultman`.

- [ ] **Step 6: Final commit — docs only**

```bash
git add .agents/docs/current/status.md .agents/docs/current/handoff.md
git commit -m "$(cat <<'EOF'
docs(0-b): record completion in current status + handoff

0-B implementation complete across Phases 0-7. Final pnpm verify
passed; live plugin-dev smoke confirmed preset switching.

See .agents/docs/work/hardening/plans/2026-05-15-explorer-0-b-
servicetheme-token-layer/index.md for the executed plan.
EOF
)"
```

## Plan complete

When T17 step 6 commits successfully, the 0-B implementation is done.
The next spec is **0-A — View Feature Contract + native DOM contract**
which consumes `preset.nodeElements`, `preset.lockNodeElementVisibility`,
and `preset.viewModes` from 0-B's shape.

Optional follow-ups (separate sub-systems, registered in
[[docs/work/hardening/backlog/2026-05-15-explorer-ui-vision/index|explorer-ui-vision]]):

- Sub-system O — frameVaultman decomposition (recommended before
  Layout extension).
- Sub-system N — UnoCSS removal (independent of 0-A).
- Sub-system M — SCSS hygiene pass (parallel).
- Sub-system "Settings UI refresh" — adds preset selector to Settings.
