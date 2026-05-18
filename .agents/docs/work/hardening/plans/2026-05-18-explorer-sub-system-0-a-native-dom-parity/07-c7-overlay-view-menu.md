---
title: 07 — C7 overlayViewMenu wiring + rename
type: plan-task
parent: "[[2026-05-18-explorer-sub-system-0-a-native-dom-parity/index]]"
---

# 07 — C7: Wire `overlayViewMenu` + rename `btnMultiSelection`

`overlayViewMenu` reads viewHost from context, filters view modes by
`preset.viewModes`, renders `btnNodeElementsVisibility` submenu when
`multiSelectionAvailable`. Also: systemwide rename
`btnMultiSelection` → `btnNodeElementsVisibility`.

**Files:**
- Modify: `src/components/overlays/overlayViewMenu.svelte`
- Create: `src/components/overlays/ViewMenuNodeElementsToggle.svelte`
- Modify: any docs / source / tests referring to `btnMultiSelection`
- Test: `test/component/overlays/overlayViewMenu.test.ts` (extend existing)

## Steps

- [ ] **Step 1: Capture `btnMultiSelection` callsites (rename baseline)**

Run:

```powershell
Select-String -Path src,test,.agents/docs -Pattern "btnMultiSelection" -SimpleMatch -Recurse | Out-File btn-rename-baseline.txt
```

Verify the list matches what `baseline-log.md` captured in 00. Update if
new callsites appeared since.

- [ ] **Step 2: Write failing test for viewModes filter + submenu visibility**

Extend `test/component/overlays/overlayViewMenu.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/svelte';
import { afterEach } from 'vitest';
import OverlayViewMenu from '../../../src/components/overlays/overlayViewMenu.svelte';
import { VIEW_HOST_KEY } from '../../../src/components/explorer/viewHostContext';
import { ViewHostService } from '../../../src/services/serviceViewHost.svelte';
import type { ThemePreset } from '../../../src/types/typeThemePreset';

afterEach(cleanup);

function makePreset(args: { viewModes: readonly string[]; lock: boolean }): ThemePreset {
  return {
    source: 'built-in', id: 'test', displayName: 'test',
    useNativeDom: false,
    chrome: { popupBgOpacity: 1, popupBackdropBlur: '0px', popupBgTint: 0 },
    density: { rowHeight: '26px', rowPaddingY: '2px', iconSize: '16px' },
    dock: { visible: true, presentation: 'bar' },
    tabs: { visible: true, presentation: 'top-tabs', kind: 'workspace' },
    toolbar: { buttons: 'core' },
    viewModes: args.viewModes as never,
    nodeElements: {
      icon: true, label: true, detail: true, media: false,
      badges: { ops: true, filters: true, warnings: true, inherited: true, counts: true },
      actions: true,
    },
    lockNodeElementVisibility: args.lock,
  } as ThemePreset;
}

describe('overlayViewMenu — C7 wiring', () => {
  it('renders only selectableModes mode buttons (vaultman preset)', () => {
    const svc = new ViewHostService({
      preset: makePreset({ viewModes: ['tree', 'list', 'table', 'grid', 'cards'], lock: false }),
      mountContext: 'panel',
    });
    const { container } = render(OverlayViewMenu, {
      context: new Map([[VIEW_HOST_KEY, svc]]),
      props: {} as never,
    });
    const buttons = container.querySelectorAll('.vm-view-menu-mode');
    expect(buttons.length).toBe(5);
  });

  it('renders only Tree button under native preset', () => {
    const svc = new ViewHostService({
      preset: makePreset({ viewModes: ['tree'], lock: true }),
      mountContext: 'panel',
    });
    const { container } = render(OverlayViewMenu, {
      context: new Map([[VIEW_HOST_KEY, svc]]),
      props: {} as never,
    });
    const buttons = container.querySelectorAll('.vm-view-menu-mode');
    expect(buttons.length).toBe(1);
    expect(buttons[0].textContent).toMatch(/tree/i);
  });

  it('hides btnNodeElementsVisibility submenu when preset.lockNodeElementVisibility=true', () => {
    const svc = new ViewHostService({
      preset: makePreset({ viewModes: ['tree'], lock: true }),
      mountContext: 'panel',
    });
    const { container } = render(OverlayViewMenu, {
      context: new Map([[VIEW_HOST_KEY, svc]]),
      props: {} as never,
    });
    expect(container.querySelector('.vm-node-elements-toggle')).toBeNull();
  });

  it('renders btnNodeElementsVisibility submenu when preset.lockNodeElementVisibility=false', () => {
    const svc = new ViewHostService({
      preset: makePreset({ viewModes: ['tree', 'cards'], lock: false }),
      mountContext: 'panel',
    });
    const { container } = render(OverlayViewMenu, {
      context: new Map([[VIEW_HOST_KEY, svc]]),
      props: {} as never,
    });
    expect(container.querySelector('.vm-node-elements-toggle')).not.toBeNull();
  });

  it('submenu has 6 top-level checkboxes (5 simple kinds + parent badges) + 5 indented badge sub-kind checkboxes', () => {
    const svc = new ViewHostService({
      preset: makePreset({ viewModes: ['tree'], lock: false }),
      mountContext: 'panel',
    });
    const { container } = render(OverlayViewMenu, {
      context: new Map([[VIEW_HOST_KEY, svc]]),
      props: {} as never,
    });
    const allCheckboxes = container.querySelectorAll('.vm-node-elements-toggle input[type="checkbox"]');
    expect(allCheckboxes.length).toBe(11);
    const indented = container.querySelectorAll('.vm-node-elements-toggle .vm-indent-1 input[type="checkbox"]');
    expect(indented.length).toBe(5);
  });

  it('clicking simple-kind checkbox toggles the mask', async () => {
    const svc = new ViewHostService({
      preset: makePreset({ viewModes: ['tree'], lock: false }),
      mountContext: 'panel',
    });
    expect(svc.nodeElementMask.media).toBe(false);
    const { container } = render(OverlayViewMenu, {
      context: new Map([[VIEW_HOST_KEY, svc]]),
      props: {} as never,
    });
    const labels = Array.from(container.querySelectorAll('.vm-node-elements-toggle-row'));
    const mediaLabel = labels.find((l) => l.textContent?.toLowerCase().includes('media'))!;
    const cb = mediaLabel.querySelector('input[type="checkbox"]')! as HTMLInputElement;
    await fireEvent.click(cb);
    expect(svc.nodeElementMask.media).toBe(true);
  });

  it('clicking Reset clears overrides', async () => {
    const svc = new ViewHostService({
      preset: makePreset({ viewModes: ['tree'], lock: false }),
      mountContext: 'panel',
    });
    svc.toggleElement('media');
    expect(svc.nodeElementMask.media).toBe(true);
    const { container } = render(OverlayViewMenu, {
      context: new Map([[VIEW_HOST_KEY, svc]]),
      props: {} as never,
    });
    const resetBtn = container.querySelector('.vm-node-elements-toggle-reset')! as HTMLButtonElement;
    await fireEvent.click(resetBtn);
    expect(svc.nodeElementMask.media).toBe(false);
    expect(svc.btnNodeElementsVisibility).toEqual({});
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run:

```powershell
pnpm vitest run test/component/overlays/overlayViewMenu.test.ts
```

Expected: FAIL — overlay does not consume context or render the submenu yet.

- [ ] **Step 4: Create `ViewMenuNodeElementsToggle.svelte`**

Create `src/components/overlays/ViewMenuNodeElementsToggle.svelte`:

```svelte
<script lang="ts">
  import type { ViewHostService } from '../../services/serviceViewHost.svelte';
  import type { NodeElementKind, BadgeKindMask } from '../../types/typeViewHost';

  let { service }: { service: ViewHostService } = $props();

  const SIMPLE_KINDS: readonly NodeElementKind[] = ['icon', 'label', 'detail', 'media', 'actions'];
  const BADGE_KINDS: readonly (keyof BadgeKindMask)[] = ['ops', 'filters', 'warnings', 'inherited', 'counts'];

  const badgesAllOn = $derived(
    service.nodeElementMask.badges.ops
    && service.nodeElementMask.badges.filters
    && service.nodeElementMask.badges.warnings
    && service.nodeElementMask.badges.inherited
    && service.nodeElementMask.badges.counts,
  );
</script>

<div class="vm-node-elements-toggle">
  {#each SIMPLE_KINDS as kind (kind)}
    <label class="vm-node-elements-toggle-row">
      <input
        type="checkbox"
        checked={service.nodeElementMask[kind]}
        onchange={() => service.toggleElement(kind)}
      />
      <span>{kind}</span>
    </label>
  {/each}

  <label class="vm-node-elements-toggle-row">
    <input
      type="checkbox"
      checked={badgesAllOn}
      onchange={() => service.toggleElement('badges')}
    />
    <span>badges</span>
  </label>

  <div class="vm-node-elements-toggle-badges-group">
    {#each BADGE_KINDS as badgeKind (badgeKind)}
      <label class="vm-node-elements-toggle-row vm-indent-1">
        <input
          type="checkbox"
          checked={service.nodeElementMask.badges[badgeKind]}
          onchange={() => service.toggleBadgeKind(badgeKind)}
        />
        <span>{badgeKind}</span>
      </label>
    {/each}
  </div>

  <button
    type="button"
    class="vm-node-elements-toggle-reset"
    onclick={() => service.resetOverrides()}
  >
    Reset
  </button>
</div>
```

- [ ] **Step 5: Update `overlayViewMenu.svelte` to consume viewHost context**

Replace the existing view-mode list with the context-driven version:

```svelte
<script lang="ts">
  import { getContext } from 'svelte';
  import { VIEW_HOST_KEY } from '../explorer/viewHostContext';
  import ViewMenuNodeElementsToggle from './ViewMenuNodeElementsToggle.svelte';

  const viewHost = getContext(VIEW_HOST_KEY)!;

  function labelFor(mode: string): string {
    switch (mode) {
      case 'tree': return 'Tree';
      case 'list': return 'List';
      case 'table': return 'Table';
      case 'grid': return 'Grid';
      case 'cards': return 'Cards';
      default: return mode;
    }
  }
</script>

<div class="vm-view-menu vm-overlay-view-menu">
  <section class="vm-view-menu-modes">
    {#each viewHost.selectableModes as mode (mode)}
      <button
        type="button"
        class="vm-view-menu-mode"
        class:is-active={mode === viewHost.viewMode}
        onclick={() => viewHost.setViewMode(mode)}
      >
        {labelFor(mode)}
      </button>
    {/each}
  </section>

  {#if viewHost.multiSelectionAvailable}
    <hr class="vm-view-menu-divider" />
    <section class="vm-view-menu-node-elements">
      <ViewMenuNodeElementsToggle service={viewHost} />
    </section>
  {/if}
</div>
```

If the prior overlayViewMenu had additional UI elements (close button,
header), preserve them around this block.

- [ ] **Step 6: Run focused test**

```powershell
pnpm vitest run test/component/overlays/overlayViewMenu.test.ts
```

Expected: PASS — 7 cases green.

- [ ] **Step 7: Execute btnMultiSelection → btnNodeElementsVisibility rename across `src/`, `test/`, `.agents/docs/`**

Audit every callsite from `btn-rename-baseline.txt` (Step 1). For each:

- **In `src/` and `test/`**: rename identifier in place. If the symbol
  was a TypeScript field, ensure all references update. Run typecheck
  after each file to catch missed callers.
- **In `.agents/docs/`**: rename in place. If a doc explicitly references
  the old name as historical context, preserve it with a `(renamed from
  btnMultiSelection in 0-A)` annotation.

Run:

```powershell
Select-String -Path src,test,.agents/docs -Pattern "btnMultiSelection" -SimpleMatch -Recurse
```

Expected post-rename: zero hits in `src/` and `test/`. Any remaining hits
in `.agents/docs/` should be only as historical annotations.

- [ ] **Step 8: Run `pnpm verify` + full lint**

```powershell
pnpm verify
```

Expected: PASS. Lint clean.

- [ ] **Step 9: Live `plugin-dev` smoke**

```powershell
pnpm run build
obsidian plugin:reload id=vaultman vault=plugin-dev
obsidian command id=vaultman:open vault=plugin-dev
obsidian command id=vaultman:open-view-menu vault=plugin-dev
# Visually confirm:
# - Under vaultman preset: 5 view buttons + submenu visible
# - Under native preset (via plugin.themeService.setPreset): only Tree button + no submenu
obsidian dev:errors vault=plugin-dev
```

Expected: `No errors captured.`

- [ ] **Step 10: Commit**

```powershell
git add src/components/overlays/overlayViewMenu.svelte src/components/overlays/ViewMenuNodeElementsToggle.svelte test/component/overlays/overlayViewMenu.test.ts
git add (Select-String -Path src,test -Pattern "btnNodeElementsVisibility" -SimpleMatch -Recurse | Select-Object -ExpandProperty Path -Unique)
git commit -m "feat(0-A): wire overlayViewMenu — viewModes filter + btnNodeElementsVisibility submenu

overlayViewMenu reads viewHost from context, renders only selectableModes
(preset.viewModes ∩ EXPLORER_PLATFORM_VIEW_MODES) as mode buttons, shows
ViewMenuNodeElementsToggle submenu when viewHost.multiSelectionAvailable.

Submenu: 5 simple kind checkboxes (icon/label/detail/media/actions) + parent
badges checkbox + 5 indented badge sub-kind checkboxes + Reset button.
Click handlers route to viewHost.toggleElement / toggleBadgeKind /
resetOverrides.

Rename btnMultiSelection → btnNodeElementsVisibility across src/, test/,
.agents/docs/ to reflect actual semantic (multi-element visibility, not
multi-row selection)."
```

## Verification gates

- 7 component tests pass.
- Zero `btnMultiSelection` references in `src/` and `test/` (only
  archeological annotations may remain in `.agents/docs/`).
- `pnpm verify` baseline preserved.
- Live plugin-dev smoke shows expected menu visibility per preset.

## Rollback

`git revert <commit>` reverts overlayViewMenu changes and rename. Service
side + view consumers remain.
