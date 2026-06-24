---
title: T1 Styling & Identity
type: implementation-plan-shard
status: draft
parent: "[[docs/work/polish/plans/2026-05-11-ui-modernization-vertical-threads/index|ui-modernization-vertical-threads]]"
created: 2026-05-11T23:55:00
updated: 2026-05-11T08:40:05
tags:
  - agent/plan
  - thread/styling-identity
  - unocss
  - daisyui
  - faint-mode
  - serviceTheme
created_by: opus
updated_by: codex
---

# T1 Styling & Identity

> **For agentic workers:** Implement tasks 1.0 → 1.8 in order. Each task is
> a TDD micro-loop: failing test → run → minimal implementation → run →
> commit (only when the user explicitly authorizes a commit).

## Scope

T1 owns the visual foundation. It installs and configures UnoCSS, lands
DaisyUI semantic shortcuts safely (no Tailwind preflight), converts the
current `serviceTheme.ts` to a runes-backed `serviceTheme.svelte.ts`,
introduces Multi-Identity (`native` / `bases` / `outline` / `bookmarks`)
and Faint Mode, surfaces the controls in Settings, and arbitrates the
`.vm-root` class set. All other threads consume T1's `serviceTheme` runes
and `typeElasticUi.ts` types.

## Files

- Modify: `package.json`
- Modify: `vite.config.ts`
- Modify: `src/pluginEntry.ts`
- Modify: `src/main.ts`
- Modify: `src/types/typeSettings.ts`
- Modify: `src/components/frame/frameVaultman.svelte`
- Modify: `src/components/settings/SettingsUI.svelte`
- Modify: `src/styles/_tokens.scss`
- Modify: `src/main.scss`
- Modify: `src/services/serviceTheme.ts` (delete after migration; superseded by `serviceTheme.svelte.ts`)
- Create: `uno.config.ts`
- Create: `src/services/serviceTheme.svelte.ts`
- Create: `src/styles/_elastic.scss`
- Create: `test/unit/services/serviceTheme.test.ts`
- Create: `test/unit/styles/elasticThemeStyles.test.ts`
- Create: `test/unit/build/unoPreflightGate.test.ts`
- Create: `test/component/settingsElasticUi.test.ts`
- Create: `test/component/snippetMimicry.test.ts`

Read-only (must not edit from T1): all files under `src/services/serviceDiff*`,
`src/services/serviceQueue*`, `src/services/serviceDnd*`, the `View*` and
`view*` Svelte components, `src/providers/*`.

## Source Specs Consumed

- 01 ALPHA Core Bridge (UnoCSS + shortcuts).
- 05 Elastic UI Architecture (mode contract).
- 06 Multi-Identity Theme Logic (identity + Faint Mode + CSS variables).
- 10 Visual Polish (Faint Mode synchronization, reduced motion).
- Chameleon plan `00-contracts-and-gates` (consumed: `typeElasticUi.ts`,
  `normalizeElasticUiSettings`, gates).

## Dependencies

- **Before T1 starts:** Run chameleon plan `00-contracts-and-gates` to
  materialize `src/types/typeElasticUi.ts` and the `elasticUi` settings
  slot. T1 task 1.0 verifies this.
- **After T1 ships task 1.5 (root arbitration):** T2, T3, T4 may consume
  `serviceTheme` runes.

---

## Task 1.0 — Verify Chameleon contracts gate

**Files:**

- Read: `src/types/typeElasticUi.ts`
- Read: `src/types/typeSettings.ts`

- [ ] **Step 1 — Run the contracts presence check**

```bash
node -e "const {existsSync}=require('node:fs'); process.exit(existsSync('src/types/typeElasticUi.ts')?0:1)"
```

Expected: exit code `0`. If exit is `1`, halt T1 and run the chameleon
plan's `00-contracts-and-gates` first.

- [ ] **Step 2 — Re-run the existing Chameleon contract tests**

```bash
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceLayoutElastic.test.ts --fileParallelism=false
```

Expected: all tests pass.

- [ ] **Step 3 — Snapshot the relevant exports**

Read `src/types/typeElasticUi.ts` and confirm these names exist:
`VaultmanUiMode`, `VaultmanUiIdentity`, `ElasticUiSettings`,
`DEFAULT_ELASTIC_UI_SETTINGS`, `normalizeElasticUiSettings`. Add any
missing field to T1's handoff blockers section before proceeding.

---

## Task 1.1 — Install UnoCSS and forbid preflight at build time

**Files:**

- Modify: `package.json` (add `unocss` and `@unocss/vite`)
- Modify: `vite.config.ts`
- Create: `uno.config.ts`
- Create: `test/unit/build/unoPreflightGate.test.ts`

- [ ] **Step 1 — Write the failing preflight-gate test**

`test/unit/build/unoPreflightGate.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('uno.config.ts preflight gate', () => {
    const text = readFileSync(resolve('uno.config.ts'), 'utf8');

    it('does not enable preflight', () => {
        expect(text).not.toMatch(/preflights\s*:/);
        expect(text).not.toMatch(/preset\s*Wind\s*\(/);
    });

    it('declares an explicit safelist scoped to vm- and obsidian-mimic-', () => {
        expect(text).toMatch(/safelist/);
        expect(text).toMatch(/vm-/);
        expect(text).toMatch(/obsidian-mimic-/);
    });

    it('uses presetWind3 + presetIcons + presetAttributify', () => {
        expect(text).toMatch(/presetWind3\(/);
        expect(text).toMatch(/presetIcons\(/);
        expect(text).toMatch(/presetAttributify\(/);
    });
});
```

- [ ] **Step 2 — Run the test to verify it fails**

```bash
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/build/unoPreflightGate.test.ts --fileParallelism=false
```

Expected: FAIL with `ENOENT` on `uno.config.ts`.

- [ ] **Step 3 — Add UnoCSS dependencies**

In `package.json` `devDependencies`, add (preserve alphabetical order):

```json
"unocss": "^66.0.0",
"@unocss/vite": "^66.0.0"
```

Run `pnpm install`. If the workspace pnpm lockfile churns on unrelated
entries, do **not** revert those changes; the worktree intentionally
isolates installs.

- [ ] **Step 4 — Create `uno.config.ts`**

```ts
import { defineConfig, presetAttributify, presetIcons, presetWind3 } from 'unocss';

export default defineConfig({
    presets: [
        presetWind3({ preflight: false }),
        presetAttributify(),
        presetIcons({ scale: 1.0, warn: false }),
    ],
    safelist: [
        'vm-root',
        'vm-mode-thin',
        'vm-mode-balanced',
        'vm-mode-thick',
        'vm-id-native',
        'vm-id-bases',
        'vm-id-outline',
        'vm-id-bookmarks',
        'vm-faint',
        'vm-reduced-motion',
        'obsidian-mimic-file',
        'obsidian-mimic-folder',
        'obsidian-mimic-tree-item',
        'obsidian-mimic-property',
    ],
    shortcuts: [
        ['obsidian-mimic-file', 'nav-file flex items-center px-2'],
        ['obsidian-mimic-folder', 'nav-folder flex items-center'],
        ['obsidian-mimic-tree-item', 'tree-item'],
        ['obsidian-mimic-property', 'metadata-property'],
        ['vm-btn-squircle', 'inline-flex items-center justify-center rounded-md p-1'],
        ['vm-card', 'rounded-md border border-[var(--background-modifier-border)] bg-[var(--background-secondary)]'],
    ],
    rules: [],
});
```

The Daisy semantic surface arrives as **shortcuts** (`vm-btn-squircle`,
`vm-card`, etc.) rather than via `presetDaisy` because DaisyUI 5 requires
Tailwind 4 preflight, which is disqualified by the global preflight gate.

- [ ] **Step 5 — Wire `unocss` into `vite.config.ts`**

Add (top-of-file imports):

```ts
import UnoCSS from '@unocss/vite';
```

In the plugin array, **before** the existing Svelte plugin:

```ts
UnoCSS({ configFile: './uno.config.ts' }),
```

- [ ] **Step 6 — Import Uno CSS bundle in plugin entry**

In `src/pluginEntry.ts`, add `import 'uno.css';` as the **first** import,
above the existing `import './main.scss';`. Order matters: SCSS must win
on specificity overlaps.

- [ ] **Step 7 — Run the preflight gate test**

```bash
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/build/unoPreflightGate.test.ts --fileParallelism=false
```

Expected: PASS, 3/3.

- [ ] **Step 8 — Verify build still succeeds**

```bash
pnpm run check
pnpm run build:plugin
```

Expected: `svelte-check found 0 errors and 0 warnings`, build exits 0.

---

## Task 1.2 — Author the mimicry shortcut set + smoke

**Files:**

- Modify: `uno.config.ts`
- Create: `test/component/snippetMimicry.test.ts`
- Create: `test/fixtures/snippets/vm-snippet-smoke.css`

- [ ] **Step 1 — Author the fixture snippet**

`test/fixtures/snippets/vm-snippet-smoke.css`:

```css
.nav-file-title {
    background-color: rgb(255, 0, 128);
}

.tree-item-self {
    outline: 2px solid rgb(0, 200, 255);
}

.metadata-property {
    border-left: 4px solid rgb(120, 200, 0);
}
```

- [ ] **Step 2 — Write the failing snippet-mimicry test**

`test/component/snippetMimicry.test.ts`:

```ts
import { mount, unmount } from 'svelte';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import frameVaultman from '../../src/components/frame/frameVaultman.svelte';
import fixture from '../fixtures/snippets/vm-snippet-smoke.css?raw';

let host: HTMLDivElement;
let app: ReturnType<typeof mount> | null = null;
let styleTag: HTMLStyleElement | null = null;

beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    styleTag = document.createElement('style');
    styleTag.textContent = fixture;
    document.head.appendChild(styleTag);
});

afterEach(() => {
    if (app) unmount(app);
    host.remove();
    styleTag?.remove();
});

describe('snippet mimicry — Thin + native identity', () => {
    it('emits nav-file-title where the file label renders', () => {
        app = mount(frameVaultman, {
            target: host,
            props: { mode: 'thin', identity: 'native', testFixture: 'snippet-smoke' },
        });
        const titles = host.querySelectorAll('.nav-file-title');
        expect(titles.length).toBeGreaterThan(0);
        const computed = getComputedStyle(titles[0]);
        expect(computed.backgroundColor).toBe('rgb(255, 0, 128)');
    });

    it('emits tree-item-self on adopted tree rows', () => {
        app = mount(frameVaultman, {
            target: host,
            props: { mode: 'thin', identity: 'outline', testFixture: 'snippet-smoke' },
        });
        const rows = host.querySelectorAll('.tree-item-self');
        expect(rows.length).toBeGreaterThan(0);
    });

    it('emits metadata-property on property cells', () => {
        app = mount(frameVaultman, {
            target: host,
            props: { mode: 'thin', identity: 'native', testFixture: 'snippet-smoke' },
        });
        const props = host.querySelectorAll('.metadata-property');
        expect(props.length).toBeGreaterThan(0);
    });
});
```

The `testFixture` prop is a development-only escape hatch that pre-seeds
the frame with deterministic sample data; T1 step 1.5 implements it.

- [ ] **Step 3 — Run the test to verify it fails**

```bash
pnpm exec vp test run --project component --config vitest.config.ts test/component/snippetMimicry.test.ts --fileParallelism=false
```

Expected: FAIL (frame does not yet emit mirror classes).

- [ ] **Step 4 — Confirm shortcuts cover the needed mirrors**

Re-read `uno.config.ts` shortcuts and confirm coverage for each mirror
class. If any of `nav-file`, `nav-file-title`, `nav-folder`, `tree-item`,
`tree-item-self`, `tree-item-inner`, `metadata-container`,
`metadata-property`, `metadata-property-key` is missing, add a shortcut
that re-emits the native class. Native classes are pass-through (Obsidian
itself defines them); shortcuts exist so we can map them to other utility
combos as Thick mode grows.

(The test still fails after this step — implementation lands in 1.5.)

---

## Task 1.3 — Create `serviceTheme.svelte.ts`

**Files:**

- Create: `src/services/serviceTheme.svelte.ts`
- Create: `test/unit/services/serviceTheme.test.ts`
- Read-only: `src/services/serviceTheme.ts` (kept until 1.5)

- [ ] **Step 1 — Write the failing service test**

`test/unit/services/serviceTheme.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { ThemeService } from '../../../src/services/serviceTheme.svelte';

describe('ThemeService', () => {
    it('defaults to thin mode + native identity, faint off', () => {
        const svc = new ThemeService();
        expect(svc.mode).toBe('thin');
        expect(svc.identity).toBe('native');
        expect(svc.faintActive).toBe(false);
        expect(svc.reducedMotion).toBe(false);
    });

    it('reports the canonical root class set', () => {
        const svc = new ThemeService();
        svc.mode = 'balanced';
        svc.identity = 'outline';
        svc.windowFocused = false;
        svc.faintModeEnabled = true;
        svc.reducedMotion = true;
        const classes = svc.rootClasses;
        expect(classes).toContain('vm-root');
        expect(classes).toContain('vm-mode-balanced');
        expect(classes).toContain('vm-id-outline');
        expect(classes).toContain('vm-faint');
        expect(classes).toContain('vm-reduced-motion');
    });

    it('faintActive flips only when windowFocused is false AND faintModeEnabled is true', () => {
        const svc = new ThemeService();
        svc.faintModeEnabled = true;
        svc.windowFocused = true;
        expect(svc.faintActive).toBe(false);
        svc.windowFocused = false;
        expect(svc.faintActive).toBe(true);
        svc.faintModeEnabled = false;
        expect(svc.faintActive).toBe(false);
    });

    it('useUtilities is true when mode is balanced or thick', () => {
        const svc = new ThemeService();
        svc.mode = 'thin';
        expect(svc.useUtilities).toBe(false);
        svc.mode = 'balanced';
        expect(svc.useUtilities).toBe(true);
        svc.mode = 'thick';
        expect(svc.useUtilities).toBe(true);
    });

    it('useNativeDom is true when mode is thin OR identity is native', () => {
        const svc = new ThemeService();
        svc.mode = 'thin';
        svc.identity = 'bases';
        expect(svc.useNativeDom).toBe(true);
        svc.mode = 'thick';
        svc.identity = 'native';
        expect(svc.useNativeDom).toBe(true);
        svc.mode = 'thick';
        svc.identity = 'bases';
        expect(svc.useNativeDom).toBe(false);
    });
});
```

- [ ] **Step 2 — Run test to confirm failure**

```bash
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceTheme.test.ts --fileParallelism=false
```

Expected: FAIL — module not found.

- [ ] **Step 3 — Implement `serviceTheme.svelte.ts`**

```ts
import type {
    ElasticUiSettings,
    VaultmanUiIdentity,
    VaultmanUiMode,
} from '../types/typeElasticUi';

export class ThemeService {
    mode = $state<VaultmanUiMode>('thin');
    identity = $state<VaultmanUiIdentity>('native');
    faintModeEnabled = $state(false);
    reducedMotion = $state(false);
    windowFocused = $state(true);
    foulDetection = $state(false);

    get faintActive(): boolean {
        return this.faintModeEnabled && !this.windowFocused;
    }

    get useUtilities(): boolean {
        return this.mode !== 'thin';
    }

    get useNativeDom(): boolean {
        return this.mode === 'thin' || this.identity === 'native';
    }

    get rootClasses(): string[] {
        const out = ['vm-root', `vm-mode-${this.mode}`, `vm-id-${this.identity}`];
        if (this.faintActive) out.push('vm-faint');
        if (this.reducedMotion) out.push('vm-reduced-motion');
        if (this.foulDetection) out.push('vm-foul-detect');
        return out;
    }

    hydrate(settings: ElasticUiSettings): void {
        this.mode = settings.mode;
        this.identity = settings.identity;
        this.faintModeEnabled = settings.faintModeEnabled;
        this.reducedMotion = settings.reducedMotion;
    }
}
```

- [ ] **Step 4 — Re-run the test**

```bash
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceTheme.test.ts --fileParallelism=false
```

Expected: PASS, 5/5.

---

## Task 1.4 — Settings UI for mode, identity, faint, reduced-motion, foul-detection

**Files:**

- Modify: `src/components/settings/SettingsUI.svelte`
- Modify: `src/types/typeSettings.ts` (only to extend `ElasticUiSettings` if a field is missing — do not re-define existing types)
- Create: `test/component/settingsElasticUi.test.ts`

- [ ] **Step 1 — Confirm `ElasticUiSettings` shape**

Read `src/types/typeElasticUi.ts`. Confirm the field set:
`mode`, `identity`, `faintModeEnabled`, `reducedMotion`. If
`foulDetection` is missing, extend it:

```ts
export interface ElasticUiSettings {
    mode: VaultmanUiMode;
    identity: VaultmanUiIdentity;
    faintModeEnabled: boolean;
    reducedMotion: boolean;
    foulDetection: boolean;
}

export const DEFAULT_ELASTIC_UI_SETTINGS: ElasticUiSettings = {
    mode: 'thin',
    identity: 'native',
    faintModeEnabled: false,
    reducedMotion: false,
    foulDetection: false,
};
```

Also extend `normalizeElasticUiSettings` to coerce `foulDetection`:

```ts
foulDetection: source.foulDetection === true,
```

- [ ] **Step 2 — Write the failing settings-component test**

`test/component/settingsElasticUi.test.ts`:

```ts
import { mount, unmount } from 'svelte';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import SettingsUI from '../../src/components/settings/SettingsUI.svelte';
import { ThemeService } from '../../src/services/serviceTheme.svelte';

let host: HTMLDivElement;
let app: ReturnType<typeof mount> | null = null;

beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
});

afterEach(() => {
    if (app) unmount(app);
    host.remove();
});

describe('SettingsUI — Elastic UI section', () => {
    it('renders mode + identity + faint + reduced-motion + foul-detection controls', () => {
        const theme = new ThemeService();
        app = mount(SettingsUI, { target: host, props: { themeService: theme } });

        expect(host.querySelector('[data-vm-setting="mode"]')).toBeTruthy();
        expect(host.querySelector('[data-vm-setting="identity"]')).toBeTruthy();
        expect(host.querySelector('[data-vm-setting="faint"]')).toBeTruthy();
        expect(host.querySelector('[data-vm-setting="reduced-motion"]')).toBeTruthy();
        expect(host.querySelector('[data-vm-setting="foul-detection"]')).toBeTruthy();
    });

    it('updates theme service when the mode select changes', () => {
        const theme = new ThemeService();
        app = mount(SettingsUI, { target: host, props: { themeService: theme } });
        const select = host.querySelector(
            '[data-vm-setting="mode"] select',
        ) as HTMLSelectElement;
        select.value = 'thick';
        select.dispatchEvent(new Event('change', { bubbles: true }));
        expect(theme.mode).toBe('thick');
    });
});
```

- [ ] **Step 3 — Run test to confirm failure**

```bash
pnpm exec vp test run --project component --config vitest.config.ts test/component/settingsElasticUi.test.ts --fileParallelism=false
```

Expected: FAIL — missing data attributes.

- [ ] **Step 4 — Add the Elastic UI section to `SettingsUI.svelte`**

In the existing settings layout, insert a new section. Use polymorphic
snippets so the controls render natively in Thin mode and styled in
Thick:

```svelte
<script lang="ts">
    import { translate } from '../../index/i18n/lang';
    import type { ThemeService } from '../../services/serviceTheme.svelte';

    interface Props {
        themeService: ThemeService;
    }
    let { themeService }: Props = $props();

    const MODES = ['thin', 'balanced', 'thick'] as const;
    const IDENTITIES = ['native', 'bases', 'outline', 'bookmarks'] as const;

    function setMode(event: Event) {
        const value = (event.target as HTMLSelectElement).value;
        if (MODES.includes(value as (typeof MODES)[number])) {
            themeService.mode = value as (typeof MODES)[number];
        }
    }

    function setIdentity(event: Event) {
        const value = (event.target as HTMLSelectElement).value;
        if (IDENTITIES.includes(value as (typeof IDENTITIES)[number])) {
            themeService.identity = value as (typeof IDENTITIES)[number];
        }
    }
</script>

<section class="vm-settings-elastic">
    <h3>{translate('settings.elastic_ui.title')}</h3>

    <label data-vm-setting="mode">
        <span>{translate('settings.elastic_ui.mode')}</span>
        <select value={themeService.mode} onchange={setMode}>
            {#each MODES as m}
                <option value={m}>{translate(`settings.elastic_ui.mode_${m}`)}</option>
            {/each}
        </select>
    </label>

    <label data-vm-setting="identity">
        <span>{translate('settings.elastic_ui.identity')}</span>
        <select value={themeService.identity} onchange={setIdentity}>
            {#each IDENTITIES as id}
                <option value={id}>{translate(`settings.elastic_ui.identity_${id}`)}</option>
            {/each}
        </select>
    </label>

    <label data-vm-setting="faint">
        <input type="checkbox" bind:checked={themeService.faintModeEnabled} />
        <span>{translate('settings.elastic_ui.faint_mode')}</span>
    </label>

    <label data-vm-setting="reduced-motion">
        <input type="checkbox" bind:checked={themeService.reducedMotion} />
        <span>{translate('settings.elastic_ui.reduced_motion')}</span>
    </label>

    <label data-vm-setting="foul-detection">
        <input type="checkbox" bind:checked={themeService.foulDetection} />
        <span>{translate('settings.elastic_ui.foul_detection')}</span>
    </label>
</section>
```

Append the 7 missing i18n keys (`settings.elastic_ui.*`) to the locale
files under `src/index/i18n/locales/`. Use English for the canonical
locale; copy English to all locales as a placeholder so the keys resolve
during smoke tests (translators can revise later).

- [ ] **Step 5 — Re-run the test**

```bash
pnpm exec vp test run --project component --config vitest.config.ts test/component/settingsElasticUi.test.ts --fileParallelism=false
```

Expected: PASS, 2/2.

---

## Task 1.5 — Wire `.vm-root` arbitration in `frameVaultman.svelte`

**Files:**

- Modify: `src/components/frame/frameVaultman.svelte`
- Modify: `src/main.ts` (instantiate `ThemeService` once per plugin instance and pass to frame)

- [ ] **Step 1 — Write the failing root-arbitration component test**

Append to `test/component/settingsElasticUi.test.ts` or create
`test/component/frameRootClasses.test.ts`:

```ts
import { mount, unmount } from 'svelte';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import frameVaultman from '../../src/components/frame/frameVaultman.svelte';
import { ThemeService } from '../../src/services/serviceTheme.svelte';

let host: HTMLDivElement;
let app: ReturnType<typeof mount> | null = null;

beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
});
afterEach(() => {
    if (app) unmount(app);
    host.remove();
});

describe('frameVaultman — root class arbitration', () => {
    it('applies vm-mode-{mode} and vm-id-{identity} on the root', () => {
        const theme = new ThemeService();
        theme.mode = 'balanced';
        theme.identity = 'bases';
        app = mount(frameVaultman, { target: host, props: { themeService: theme } });
        const root = host.querySelector('.vm-root');
        expect(root?.classList.contains('vm-mode-balanced')).toBe(true);
        expect(root?.classList.contains('vm-id-bases')).toBe(true);
    });

    it('toggles vm-faint when window focus is lost and faintModeEnabled is true', () => {
        const theme = new ThemeService();
        theme.faintModeEnabled = true;
        app = mount(frameVaultman, { target: host, props: { themeService: theme } });
        const root = host.querySelector('.vm-root') as HTMLElement;
        expect(root.classList.contains('vm-faint')).toBe(false);
        theme.windowFocused = false;
        // svelte $effect microtask flush
        return Promise.resolve().then(() => {
            expect(root.classList.contains('vm-faint')).toBe(true);
        });
    });
});
```

- [ ] **Step 2 — Run the test to confirm failure**

```bash
pnpm exec vp test run --project component --config vitest.config.ts test/component/frameRootClasses.test.ts --fileParallelism=false
```

Expected: FAIL.

- [ ] **Step 3 — Implement root arbitration**

In `frameVaultman.svelte`, replace the existing body class management
with a `class:` directive that consumes `themeService.rootClasses`:

```svelte
<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import type { ThemeService } from '../../services/serviceTheme.svelte';

    interface Props {
        themeService: ThemeService;
        // ...existing props remain unchanged
    }
    let { themeService, ...rest }: Props = $props();

    function onWindowFocus() { themeService.windowFocused = true; }
    function onWindowBlur() { themeService.windowFocused = false; }

    onMount(() => {
        const win = rest.activeWindow ?? window;
        win.addEventListener('focus', onWindowFocus);
        win.addEventListener('blur', onWindowBlur);
        themeService.windowFocused = win.document.hasFocus();
    });
    onDestroy(() => {
        const win = rest.activeWindow ?? window;
        win.removeEventListener('focus', onWindowFocus);
        win.removeEventListener('blur', onWindowBlur);
    });

    const classes = $derived(themeService.rootClasses.join(' '));
</script>

<div class={classes}>
    <!-- existing frame body -->
</div>
```

- [ ] **Step 4 — Delete the legacy body-level theme toggle**

In `src/main.ts` (or wherever `applyVaultmanTheme(activeDocument.body, ...)`
is invoked), remove the call. Theme classes now live on `.vm-root`.
Delete `src/services/serviceTheme.ts` (legacy file) and update imports
to `serviceTheme.svelte` where applicable. `svelte-check` will report
all sites that need updating.

- [ ] **Step 5 — Re-run the suite**

```bash
pnpm exec vp test run --project component --config vitest.config.ts test/component/frameRootClasses.test.ts test/component/settingsElasticUi.test.ts test/component/snippetMimicry.test.ts --fileParallelism=false
pnpm run check
```

Expected: PASS, 7/7. `svelte-check` exits 0.

---

## Task 1.6 — SCSS bridge with CSS variable downgrade

**Files:**

- Modify: `src/styles/_tokens.scss`
- Modify: `src/main.scss`
- Create: `src/styles/_elastic.scss`
- Create: `test/unit/styles/elasticThemeStyles.test.ts`

- [ ] **Step 1 — Failing style assertion**

`test/unit/styles/elasticThemeStyles.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const scss = readFileSync(resolve('src/styles/_elastic.scss'), 'utf8');

describe('_elastic.scss variable downgrade', () => {
    it('declares --vm-accent that maps to var(--text-accent)', () => {
        expect(scss).toMatch(/--vm-accent\s*:\s*var\(--text-accent\)/);
    });

    it('downgrades --vm-accent to var(--text-faint) when .vm-faint is set', () => {
        expect(scss).toMatch(/\.vm-faint[\s\S]*--vm-accent\s*:\s*var\(--text-faint\)/);
    });

    it('sets --vm-transition to 0ms when .vm-reduced-motion is set', () => {
        expect(scss).toMatch(/\.vm-reduced-motion[\s\S]*--vm-transition\s*:\s*0ms/);
    });

    it('declares the identity-scoped accent table', () => {
        expect(scss).toMatch(/\.vm-id-native/);
        expect(scss).toMatch(/\.vm-id-bases/);
        expect(scss).toMatch(/\.vm-id-outline/);
        expect(scss).toMatch(/\.vm-id-bookmarks/);
    });
});
```

- [ ] **Step 2 — Run to verify failure**

```bash
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/styles/elasticThemeStyles.test.ts --fileParallelism=false
```

Expected: FAIL — file missing.

- [ ] **Step 3 — Author `_elastic.scss`**

```scss
.vm-root {
    --vm-accent: var(--text-accent);
    --vm-fg: var(--text-normal);
    --vm-bg: var(--background-primary);
    --vm-bg-alt: var(--background-secondary);
    --vm-border: var(--background-modifier-border);
    --vm-transition: 160ms;

    transition: filter var(--vm-transition) ease,
                opacity var(--vm-transition) ease;
}

.vm-root.vm-faint {
    --vm-accent: var(--text-faint);
    --vm-fg: var(--text-muted);
    filter: grayscale(0.4);
    opacity: 0.85;
}

.vm-root.vm-reduced-motion {
    --vm-transition: 0ms;
}

.vm-root.vm-id-native {
    --vm-explorer-density: 0;
}
.vm-root.vm-id-bases {
    --vm-explorer-density: 2;
    --vm-bases-row-height: 28px;
}
.vm-root.vm-id-outline {
    --vm-explorer-density: 1;
    --vm-outline-guide: var(--background-modifier-border);
}
.vm-root.vm-id-bookmarks {
    --vm-explorer-density: 1;
}

.vm-root.vm-foul-detect [data-vm-foul] {
    outline: 2px dashed rgb(255, 80, 80);
}
```

- [ ] **Step 4 — Hook into the SCSS root entry**

In `src/main.scss`, after the existing `@use './styles/tokens';` line,
add:

```scss
@use './styles/elastic';
```

- [ ] **Step 5 — Sweep components**

Run a grep over `src/styles/` and `src/components/` for direct
`var(--text-accent)` usage. Replace with `var(--vm-accent)` so Faint
Mode reaches all surfaces. Use `Edit` with `replace_all` on each file
that has it; do not bulk-replace across `src/` blindly — review each
file before changing.

- [ ] **Step 6 — Re-run tests + build**

```bash
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/styles/elasticThemeStyles.test.ts --fileParallelism=false
pnpm run check
pnpm run build:plugin
```

Expected: PASS, 4/4. Build exits 0.

---

## Task 1.7 — Snippet mimicry smoke (close the test loop from 1.2)

**Files:**

- Verify (no edits expected): `test/component/snippetMimicry.test.ts`

- [x] **Step 1 — Run the snippet mimicry test**

```bash
pnpm exec vp test run --project component --config vitest.config.ts test/component/snippetMimicry.test.ts --fileParallelism=false
```

Expected: PASS, 3/3. If any case fails, the failing class is missing
from the frame in Thin + that identity. Fix by ensuring the relevant
view emits `nav-file-title` / `tree-item-self` / `metadata-property`
when `themeService.useNativeDom === true` — those emissions live in
T2-owned views, so coordinate by leaving a checklist line in
`docs/work/polish/plans/2026-05-11-ui-modernization-vertical-threads/02-thread-engine-views.md`
Task 2.3 if the gap is in a view file. T1 only adds the class on
container-level surfaces (`frameVaultman.svelte`).

Execution note, 2026-05-11T03:53:32:

- Created `test/component/snippetMimicry.test.ts` because the planned smoke
  file was absent.
- RED:
  `pnpm exec vp test run --project component --config vitest.config.ts test/component/snippetMimicry.test.ts --fileParallelism=false`
  failed 3/3 because `PanelExplorer` did not pass `plugin.themeService` into
  the view components and `ViewNodeTable` did not emit metadata mirror classes.
- GREEN: the same command passed 3/3 after wiring `themeService` through
  `PanelExplorer` to tree/grid/cards/table and adding table metadata mirror
  classes.
- The smoke validates actual fixture CSS for `nav-file-title` and
  `metadata-property`; for `tree-item-self`, JSDOM does not expand the
  `outline` shorthand reliably, so the smoke verifies selector coverage plus
  emitted DOM class.
- Focused regression gate:
  `pnpm exec vp test run --project component --config vitest.config.ts test/component/snippetMimicry.test.ts test/component/viewNodeMirrorClasses.test.ts test/component/panelExplorerSelection.test.ts test/component/viewTableSelection.test.ts test/component/viewTableStress.test.ts --fileParallelism=false`
  passed 5 files / 50 tests.
- Svelte autofixer returned `issues: []` for `panelExplorer.svelte` and
  `ViewNodeTable.svelte`.

---

## Task 1.8 — Faint Mode auto-bind on the active window

**Files:**

- Modify: `src/components/frame/frameVaultman.svelte` (only if 1.5 left
  the focus listeners scoped to the main window)
- Verify: `src/components/frame/DetachedTabHost.svelte` mounts the same
  `ThemeService` instance and registers its own focus listeners on its
  own `activeWindow`

- [x] **Step 1 — Write a multi-window failing test**

`test/component/frameFaintMultiWindow.test.ts`:

```ts
import { mount, unmount } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';
import frameVaultman from '../../src/components/frame/frameVaultman.svelte';
import { ThemeService } from '../../src/services/serviceTheme.svelte';

const apps: ReturnType<typeof mount>[] = [];
afterEach(() => {
    while (apps.length) unmount(apps.pop()!);
});

describe('Faint Mode in pop-out windows', () => {
    it('faint state derives from the frame-local window focus, not document.body', () => {
        const theme = new ThemeService();
        theme.faintModeEnabled = true;

        const fakeWin = Object.assign({}, window, {
            document: Object.assign({}, document, { hasFocus: () => false }),
            addEventListener: window.addEventListener.bind(window),
            removeEventListener: window.removeEventListener.bind(window),
        }) as Window;

        const host = document.createElement('div');
        document.body.appendChild(host);
        apps.push(mount(frameVaultman, {
            target: host,
            props: { themeService: theme, activeWindow: fakeWin },
        }));
        return Promise.resolve().then(() => {
            const root = host.querySelector('.vm-root') as HTMLElement;
            expect(root.classList.contains('vm-faint')).toBe(true);
        });
    });
});
```

- [x] **Step 2 — Run + implement**

If the test fails because the frame defaults `activeWindow` to the global
`window`, route the prop through to the focus listeners and initial
`hasFocus()` call. Confirm `DetachedTabHost.svelte` passes its own
`activeWindow` prop (it should already, per the detachable plan recently
merged — see status snapshot — but verify).

Expected on rerun: PASS.

Execution note, 2026-05-11T04:31:26:

- Subagent attempted T1.8 but stopped with an invalid RED caused by first
  writing the test outside the requested worktree. Controller completed the
  test loop in the Claude worktree.
- Created `test/component/frameFaintMultiWindow.test.ts`.
- Initial run exposed a fixture issue (`overlayState.stack` missing); after
  fixing the test mock, RED was valid:
  `pnpm exec vp test run --project component --config vitest.config.ts test/component/frameFaintMultiWindow.test.ts --fileParallelism=false`
  failed 1/1 because `.vm-faint` stayed false when the supplied
  frame-local `activeWindow.document.hasFocus()` returned false.
- GREEN: the same command passed 1/1 after `frameVaultman.svelte` accepted an
  optional `activeWindow` prop and used it for focus/blur listeners plus the
  initial `hasFocus()` read.
- Focused component gate:
  `pnpm exec vp test run --project component --config vitest.config.ts test/component/frameFaintMultiWindow.test.ts test/component/snippetMimicry.test.ts test/component/viewNodeMirrorClasses.test.ts --fileParallelism=false`
  passed 3 files / 7 tests.
- Svelte validation: the targeted changed `frameVaultman` script snippet
  returned `issues: []` from the Svelte autofixer tool. The full-file CLI
  autofixer still reports an unrelated parser diagnostic on this legacy
  component (`',' expected` with no line/column), so `pnpm run check` remains
  the authoritative full-file compiler gate.
- `DetachedTabHost.svelte` currently does not route an `activeWindow` prop into
  a nested frame; it mounts detached tab contents directly. No production edit
  was made there.

---

## Thread Verification Envelope (run at handoff)

```bash
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceTheme.test.ts test/unit/styles/elasticThemeStyles.test.ts test/unit/build/unoPreflightGate.test.ts --fileParallelism=false
pnpm exec vp test run --project component --config vitest.config.ts test/component/settingsElasticUi.test.ts test/component/snippetMimicry.test.ts test/component/frameRootClasses.test.ts test/component/frameFaintMultiWindow.test.ts --fileParallelism=false
pnpm run check
pnpm run build:plugin
obsidian vault=plugin-dev plugin:reload id=vaultman
obsidian vault=plugin-dev command id=vaultman:open
obsidian vault=plugin-dev eval code="(() => !!activeDocument.querySelector('.vm-root.vm-mode-thin.vm-id-native'))()"
obsidian vault=plugin-dev dev:errors
```

Expected: all tests pass, `svelte-check` exits 0, `build:plugin` exits 0,
plugin reload succeeds, eval returns `true`, no Vaultman stack in dev
errors. Fallback if `vault=plugin-dev` is rejected by the local CLI:
re-run without the vault prefix and record the fallback in the handoff.

## Handoff Notes

- Record any class-mirror gap found in 1.7 as a checklist line in
  `02-thread-engine-views.md` Task 2.3 so T2 picks it up.
- If `_elastic.scss` variable sweep in 1.6 step 5 found a third-party
  Vaultman view still hardcoding `var(--text-accent)`, list the file in
  the handoff so other threads do not regress it.
- Confirm `git status --short` shows only files this thread owns before
  finishing.
