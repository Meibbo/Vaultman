---
title: 00 — Pre-step baseline (DOM snapshot + live smoke)
type: plan-shard
status: draft
parent: "[[docs/work/hardening/plans/2026-05-17-explorer-sub-system-o-framevaultman-decomposition/index|O plan]]"
created: 2026-05-17T00:00:00
updated: 2026-05-17T00:00:00
tags:
  - agent/plan
  - explorer/frame
  - explorer/refactor
---

# Pre-Step 0 — Baseline Capture

**Goal:** Capture three pre-extraction artifacts that subsequent commits gate against: (1) DOM snapshot of the frame in `ops` / `filters` / `statistics` states, (2) live `plugin-dev` smoke log, (3) LOC count. No production code changes.

**Why this is its own commit (resolution of O7):** The baseline lives in `test/component/frameVaultmanBaseline.test.ts` as a regression guard. C1's diff is large enough on its own; tangling baseline capture into C1 makes both harder to review. Pre-step 0 is read-only relative to production code.

## Files

- **Create:** `test/component/frameVaultmanBaseline.test.ts`
- **Create:** `test/component/_helpers/makeMockPlugin.ts`
- **Create:** `test/component/_helpers/withContext.ts` (used by C3+C4; declared here so its location is fixed before extraction begins)
- **Create:** `.agents/docs/work/hardening/plans/2026-05-17-explorer-sub-system-o-framevaultman-decomposition/baseline-log.md` (records pre-extraction LOC + live smoke output)

**Estimated LOC delta:** +0 production, +~250 test helpers/snapshot file.

---

## Task 0.1: Create test helper `makeMockPlugin`

- [ ] **Step 1: Create `test/component/_helpers/makeMockPlugin.ts`**

This helper produces a minimal `VaultmanPlugin` mock with the surface frame reads. Used by every C1-C4 test plus the baseline.

```typescript
// test/component/_helpers/makeMockPlugin.ts
import { vi } from 'vitest';
import type { VaultmanPlugin } from '../../../src/main';
import type { FilterGroup } from '../../../src/types/typeFilter';
import { DEFAULT_ELASTIC_UI_SETTINGS } from '../../../src/types/typeElasticUi';

export interface MockPluginOverrides {
  pageOrder?: string[];
  explorerOperationScope?: 'auto' | 'filtered' | 'selected';
  islandDismissOnOutsideClick?: boolean;
  layout?: unknown;
  themeMode?: 'thin' | 'rich';
  isFilesIndexed?: boolean;
  queueOpCount?: number;
}

export function makeMockPlugin(overrides: MockPluginOverrides = {}): VaultmanPlugin {
  const filterRoot: FilterGroup = { type: 'group', op: 'and', children: [] };
  const overlayState = {
    isOpen: vi.fn().mockReturnValue(false),
    push: vi.fn(),
    popById: vi.fn(),
  };
  const themeService = {
    rootClasses: ['vm-root', 'vm-mode-thin', 'vm-id-native', 'vm-theme-vaultman'],
    mode: overrides.themeMode ?? 'thin',
    windowFocused: true,
  };
  return {
    app: {
      vault: {
        getName: () => 'plugin-dev',
        getMarkdownFiles: () => [],
      },
      metadataCache: { on: vi.fn(), off: vi.fn() },
      workspace: { containerEl: document.createElement('div') },
    },
    settings: {
      pageOrder: overrides.pageOrder ?? ['ops', 'statistics', 'filters'],
      explorerOperationScope: overrides.explorerOperationScope ?? 'auto',
      islandDismissOnOutsideClick: overrides.islandDismissOnOutsideClick ?? true,
      layout: overrides.layout ?? null,
      mouseGestures: { fab: {} },
      elasticUi: { ...DEFAULT_ELASTIC_UI_SETTINGS },
    },
    filterService: {
      activeFilter: filterRoot,
      subscribe: vi.fn().mockReturnValue(() => {}),
      toggleFilterRule: vi.fn(),
      removeNode: vi.fn(),
      setSearchFilter: vi.fn(),
      getSearchFilterRules: vi.fn().mockReturnValue([]),
      clearAll: vi.fn(),
    },
    queueService: {
      logicalOpCount: overrides.queueOpCount ?? 0,
      isEmpty: (overrides.queueOpCount ?? 0) === 0,
      listTransactions: vi.fn().mockReturnValue([]),
      addBatch: vi.fn(),
      processAll: vi.fn(),
      clearAll: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    },
    themeService,
    leafDetachService: {
      subscribe: vi.fn().mockReturnValue(() => {}),
      getState: vi.fn().mockReturnValue({}),
    },
    overlayState,
    openDiffViewHook: null as (() => void) | null,
    openQueuePopupHook: null,
    openFiltersPopupHook: null,
    saveSettings: vi.fn().mockResolvedValue(undefined),
    spawnTabLeaf: vi.fn().mockResolvedValue(undefined),
    contentIndex: { setQuery: vi.fn() },
  } as unknown as VaultmanPlugin;
}
```

The helper deliberately stubs `as unknown as VaultmanPlugin` to bypass the full type — tests do not exercise every plugin field, and re-stating the whole `VaultmanPlugin` shape is brittle. Real-type discipline lives at the consumption site (frame); the mock guards the test surface.

## Task 0.2: Create test helper `withContext`

- [ ] **Step 1: Create `test/component/_helpers/withContext.ts`**

Used by C3 (`FrameNavbarShell.test.ts`) and C4 (`FrameDashboardShell.test.ts`) to inject `nav` / `popups` without mounting the full frame. Declared here so the location is final from day one.

```typescript
// test/component/_helpers/withContext.ts
import { mount, unmount, type Component } from 'svelte';
import { setContext } from 'svelte';

/**
 * Render a child component inside a parent that calls setContext(key, value)
 * before instantiating the child. Returns the child instance for assertions
 * and a teardown function.
 *
 * The parent is a transient wrapper — its only purpose is to host setContext
 * so the child's getContext(key) call resolves. We mount a small Svelte
 * snippet via `mount(...)` and return the inner container.
 */
export function withContext<TProps extends Record<string, unknown>>(
  target: HTMLElement,
  child: Component<TProps>,
  props: TProps,
  contextEntries: ReadonlyArray<readonly [symbol, unknown]>,
): { destroy(): void } {
  // The wrapper is built inline using Svelte's setContext within a parent
  // mount. We use a sentinel component that takes a snippet via `children`
  // and calls setContext before rendering it.
  //
  // Implementation note: Svelte 5 does not expose setContext outside a
  // component initializer, so the wrapper MUST be a real .svelte file.
  // See test/component/_helpers/ContextWrapper.svelte (created alongside
  // this helper).
  throw new Error(
    'withContext requires test/component/_helpers/ContextWrapper.svelte; see step 2.',
  );
}
```

- [ ] **Step 2: Create the Svelte wrapper**

```svelte
<!-- test/component/_helpers/ContextWrapper.svelte -->
<script lang="ts" generics="TProps extends Record<string, unknown>">
  import { setContext, type Component } from 'svelte';

  let {
    child,
    childProps,
    contextEntries,
  }: {
    child: Component<TProps>;
    childProps: TProps;
    contextEntries: ReadonlyArray<readonly [symbol, unknown]>;
  } = $props();

  for (const [key, value] of contextEntries) {
    setContext(key, value);
  }

  const ChildComponent = child;
</script>

<ChildComponent {...childProps} />
```

- [ ] **Step 3: Replace `withContext.ts` body to mount `ContextWrapper`**

```typescript
// test/component/_helpers/withContext.ts (final form)
import { mount, unmount, type Component } from 'svelte';
import ContextWrapper from './ContextWrapper.svelte';

export function withContext<TProps extends Record<string, unknown>>(
  target: HTMLElement,
  child: Component<TProps>,
  props: TProps,
  contextEntries: ReadonlyArray<readonly [symbol, unknown]>,
): { destroy(): void } {
  const instance = mount(ContextWrapper, {
    target,
    props: { child, childProps: props, contextEntries },
  });
  return {
    destroy() {
      unmount(instance);
    },
  };
}
```

## Task 0.3: Create `frameVaultmanBaseline.test.ts`

- [ ] **Step 1: Create the test file**

```typescript
// test/component/frameVaultmanBaseline.test.ts
import { afterEach, describe, expect, it } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import FrameVaultman from '../../src/components/frame/frameVaultman.svelte';
import { makeMockPlugin } from './_helpers/makeMockPlugin';

describe('frameVaultman baseline DOM (pre-O snapshot)', () => {
  let target: HTMLElement;
  let instance: ReturnType<typeof mount> | null = null;

  beforeEach(() => {
    target = document.createElement('div');
    document.body.appendChild(target);
  });

  afterEach(() => {
    if (instance) unmount(instance);
    instance = null;
    if (target.parentNode) target.parentNode.removeChild(target);
  });

  it('renders ops page (default state)', () => {
    const plugin = makeMockPlugin({ pageOrder: ['ops', 'statistics', 'filters'] });
    instance = mount(FrameVaultman, {
      target,
      props: { plugin, viewportKind: 'main-leaf' },
    });
    flushSync();
    expect(target.innerHTML).toMatchSnapshot();
  });

  it('renders filters page', () => {
    const plugin = makeMockPlugin({ pageOrder: ['filters', 'ops', 'statistics'] });
    instance = mount(FrameVaultman, {
      target,
      props: { plugin, viewportKind: 'main-leaf' },
    });
    flushSync();
    expect(target.innerHTML).toMatchSnapshot();
  });

  it('renders statistics page', () => {
    const plugin = makeMockPlugin({ pageOrder: ['statistics', 'ops', 'filters'] });
    instance = mount(FrameVaultman, {
      target,
      props: { plugin, viewportKind: 'main-leaf' },
    });
    flushSync();
    expect(target.innerHTML).toMatchSnapshot();
  });
});
```

Note on `import { beforeEach }`: vitest auto-imports `beforeEach` if `globals: true` is in the Vitest config. If the existing project disables globals, add `import { beforeEach } from 'vitest'` to the imports. Verify by reading `vitest.config.ts` at the start of this task; precedent: existing `test/component/frameVaultmanRootClasses.test.ts` uses `beforeEach` and works — copy whatever import style that file uses.

- [ ] **Step 2: Run the test to generate snapshots**

```bash
pnpm exec vitest run --project component test/component/frameVaultmanBaseline.test.ts --update
```

Expected: PASS — three snapshots written to `test/component/__snapshots__/frameVaultmanBaseline.test.ts.snap`.

- [ ] **Step 3: Verify snapshot file landed and has content**

Verify `test/component/__snapshots__/frameVaultmanBaseline.test.ts.snap` exists and contains three snapshot blocks (`ops`, `filters`, `statistics`). Each block should be substantial (~hundreds of lines of HTML) — if any is empty or trivial, the mock plugin is missing fields the frame reads. Fix the mock and re-run with `--update`.

- [ ] **Step 4: Run the test without `--update` to confirm stability**

```bash
pnpm exec vitest run --project component test/component/frameVaultmanBaseline.test.ts
```

Expected: PASS — snapshots match deterministically. If a snapshot mismatches between runs (non-determinism: timestamps, random ids), the test is unreliable. Investigate the source of randomness in the frame's render path (likely a `Math.random()` or `Date.now()` in a derivation) and either mock it or filter it from the snapshot using vitest's `expect(...).toMatchSnapshot({ ... })` property matchers.

## Task 0.4: Live `plugin-dev` smoke + LOC capture

- [ ] **Step 1: Capture LOC baseline**

```bash
wc -l src/components/frame/frameVaultman.svelte
```

Expected: ~866 lines (verified at commit `71b8dae`). Record exact number for the `baseline-log.md`.

- [ ] **Step 2: Run a `plugin-dev` smoke**

```bash
obsidian plugin:reload id=vaultman vault=plugin-dev
obsidian command id=vaultman:open-view-menu vault=plugin-dev
obsidian command id=vaultman:open-diff vault=plugin-dev
obsidian dev:errors vault=plugin-dev
```

Expected: `dev:errors` returns `No errors captured.`

Capture the full output of each command for the `baseline-log.md` (the captured baseline that C1-C5 must remain compatible with).

If `obsidian dev:errors vault=plugin-dev` reports any errors at this baseline step, **STOP** — the baseline is already failing on the unmodified frame. Investigate before proceeding; do not start extraction with a red baseline.

- [ ] **Step 3: Create `baseline-log.md`**

```markdown
# Sub-system O baseline log

Captured: <ISO date>
Branch tip: sandbox @ <commit sha>

## LOC

- src/components/frame/frameVaultman.svelte: <N> lines

## Live plugin-dev smoke

### plugin:reload
<output>

### vaultman:open-view-menu
<output>

### vaultman:open-diff
<output>

### dev:errors
No errors captured.

## DOM snapshot file

Path: test/component/__snapshots__/frameVaultmanBaseline.test.ts.snap
Generated: <ISO date>
Sections: ops, filters, statistics
```

## Task 0.5: Commit

- [ ] **Step 1: Stage**

```bash
git add test/component/frameVaultmanBaseline.test.ts \
        test/component/__snapshots__/frameVaultmanBaseline.test.ts.snap \
        test/component/_helpers/makeMockPlugin.ts \
        test/component/_helpers/withContext.ts \
        test/component/_helpers/ContextWrapper.svelte \
        .agents/docs/work/hardening/plans/2026-05-17-explorer-sub-system-o-framevaultman-decomposition/baseline-log.md
```

- [ ] **Step 2: Commit (HEREDOC body)**

```bash
git commit -m "$(cat <<'EOF'
test(O): baseline DOM snapshots for frameVaultman

Captures pre-extraction DOM of frameVaultman in three representative
states (ops, filters, statistics) plus a live plugin-dev smoke log
and the 866 LOC starting point. C1-C5 of Sub-system O gate against
these snapshots; intentional diffs require commit-message
documentation.

Adds reusable test helpers (makeMockPlugin, withContext +
ContextWrapper) co-located under test/component/_helpers/ so C1-C4
import from a single canonical location.

Refs: .agents/docs/work/hardening/specs/2026-05-17-explorer-sub-system-o-framevaultman-decomposition

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 3: Verify**

```bash
git status
```

Expected: clean tree (only the new files committed).

```bash
git log -1 --stat
```

Expected: commit visible, file list as staged in Step 1.

---

## Rollback

If the snapshot tests turn out to be too brittle (e.g., timestamps in DOM, non-deterministic class ordering), the recovery path is:

1. `git revert <pre-step-0 sha>` to unwind the test files.
2. Tighten the snapshot scope: instead of `target.innerHTML`, snapshot a specific region (e.g., `target.querySelector('.vm-view')?.outerHTML`).
3. Re-run with `--update`, re-commit.

C1-C5 cannot land without the baseline in place, so an unstable baseline must be fixed here before progressing.

## Verification gate

- `pnpm exec vitest run --project component test/component/frameVaultmanBaseline.test.ts` → PASS (3 tests).
- `obsidian dev:errors vault=plugin-dev` → `No errors captured.`
- Worktree clean post-commit.
- LOC recorded matches the file's current length.
