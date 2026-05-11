---
title: T4 Ecosystem & Interception
type: implementation-plan-shard
status: draft
parent: "[[docs/work/polish/plans/2026-05-11-ui-modernization-vertical-threads/index|ui-modernization-vertical-threads]]"
created: 2026-05-11T23:55:00
updated: 2026-05-11T23:55:00
tags:
  - agent/plan
  - thread/ecosystem-interception
  - bits-ui
  - portals
  - dom-mimicry
  - foul-detection
  - dnd-kit
  - dashboard
created_by: opus
updated_by: opus
---

# T4 Ecosystem & Interception

> **For agentic workers:** Implement tasks 4.0 → 4.9 in order. T4 is
> the broadest thread; if any single task balloons past 200 lines of
> code, shard it into a sibling `04-thread-…-part-2.md` and continue.

## Scope

T4 owns the surfaces where Vaultman meets the rest of Obsidian. It
installs Bits UI v1, ships the **portal-resolver helper** that keeps
Dialogs/Popovers safe in pop-out windows, migrates islands and modals
to Bits UI, intercepts native DOM clicks (Ctrl+Click on `.cm-hashtag`,
snippet rows, plugin rows) to route into the alias system, extends
`serviceDnD` with alias-aware drops, adds Adopted-Node DnD (block
extraction), implements **Foul Detection**, lays down the 3-Column
Dashboard, and finishes the Add-ons island with Quick Switcher +
MarkdownRenderer integration. Note that the FAB orbiting-ink visual
polish is included here as task 4.9 step 3.

## Files

- Modify: `package.json` (add `bits-ui`)
- Modify: `src/services/serviceNodeBinding.ts` (extend for outline + folder kinds)
- Modify: `src/services/serviceDnd.ts`
- Modify: `src/services/serviceDndSvelteAdapter.ts`
- Modify: `src/services/serviceNativeSurfaceBinding.ts`
- Modify: `src/services/serviceMessage.ts`
- Modify: `src/services/serviceOverlayState.svelte.ts`
- Modify: `src/services/serviceLayout.ts`
- Modify: `src/components/frame/frameVaultman.svelte` (3-column layout)
- Modify: `src/components/layout/overlays/layoutOverlay.svelte`
- Modify: `src/components/layout/overlays/overlayIsland.svelte`
- Modify: `src/services/serviceFnRIsland.svelte.ts`
- Create: `src/services/servicePortalResolver.ts`
- Create: `src/services/serviceFoulDetection.svelte.ts`
- Create: `src/services/serviceAddonsIsland.svelte.ts`
- Create: `src/components/overlays/vmDialog.svelte`
- Create: `src/components/overlays/vmPopover.svelte`
- Create: `src/components/dashboard/Dashboard3Column.svelte`
- Create: `src/components/addons/AddonsMarkdownPane.svelte`
- Create: `test/unit/services/servicePortalResolver.test.ts`
- Create: `test/unit/services/serviceFoulDetection.test.ts`
- Create: `test/unit/services/serviceDndAliasAware.test.ts`
- Create: `test/component/vmDialogPortal.test.ts`
- Create: `test/component/vmPopoverIsland.test.ts`
- Create: `test/component/nativeClickInterceptor.test.ts`
- Create: `test/component/dashboard3Column.test.ts`
- Create: `test/component/addonsMarkdownPane.test.ts`

Read-only (T4 must not edit): all `View*` / `view*` node surface
components except `frameVaultman.svelte`, all VFS-related code (T3),
theme service core file (T1).

## Source Specs Consumed

- 03 GAMMA Overlays & Portals (Bits UI portal target, Dialog migration).
- 04 DELTA Interaction & A11y (event hijacking, focus traps, i18n).
- 07 DOM Interception (alias intercept on `.cm-hashtag` etc.).
- 09 Services & DnD (alias-aware drops, group service mimicry).
- 10 Visual Polish (FAB orbiting ink, Faint Mode synchronization, gadget property editors).
- 11 Bits UI Bridge & Multi-Column Main View (3-column dashboard, adopted-node cross-pollination from the consumer side).

## Dependencies

- **Before T4 starts:** T1 task 1.5 (`.vm-root` arbitration), T1 task
  1.0 confirms `@dnd-kit/svelte` version. The user prompt mentions
  `@thisux/sveltednd` — **do not** install it; the canonical adapter
  per current handoff is `@dnd-kit/svelte@^0.4.0`.
- **T4 may start after T1 ships task 1.5.** T4 can run in parallel
  with T2.
- **T4 task 4.6 (Adopted-Node DnD block extraction)** depends on
  T3 task 3.8 (cutover) since the extraction stages an op into the
  VFS chain.
- **T4 task 4.8 (3-Column Dashboard)** consumes `serviceLayout.resolveDashboardEnabled`
  which already exists per the chameleon plan.

---

## Task 4.0 — Gates: DnD decision, Bits UI install

**Files:**

- Modify: `package.json`

- [ ] **Step 1 — Confirm DnD package**

```bash
node -e "const p=require('./package.json'); console.log('dnd-kit:', p.dependencies['@dnd-kit/svelte']); console.log('thisux:', p.dependencies['@thisux/sveltednd']);"
```

Expected: `dnd-kit: ^0.4.0`, `thisux: undefined`. If `thisux` is
present, the package mistakenly returned to dependencies; remove it
with `pnpm remove @thisux/sveltednd` and re-run.

- [ ] **Step 2 — Install Bits UI v1**

```bash
pnpm add bits-ui@^1.0.0
```

Confirm install:

```bash
node -e "console.log(require('./package.json').dependencies['bits-ui'])"
```

Expected: `^1.0.0` or a `1.x` resolved version.

- [ ] **Step 3 — Update i18n keys for the new surfaces**

Append the following keys to `src/index/i18n/locales/en.ts` (or the
canonical English locale):

```ts
'dashboard.col_filters': 'Filters',
'dashboard.col_explorer': 'Explorer',
'dashboard.col_addons': 'Add-ons',
'addons.open_note': 'Open note…',
'addons.show_stats': 'Show stats',
'foul.snippet_drift': 'Snippet did not apply to expected node — Vaultman may be missing a mirror class.',
'foul.portal_misplaced': 'A Vaultman overlay rendered outside the active window. Falling back to the frame root.',
'foul.dom_mimicry': 'A Thin-mode surface is missing a native Obsidian class.',
'native.ctrl_click_hint': 'Ctrl+Click to open the linked note.',
```

Copy these to every non-English locale as the English fallback so
smoke tests do not fail on missing keys.

---

## Task 4.1 — Portal-resolver helper

**Files:**

- Create: `src/services/servicePortalResolver.ts`
- Create: `test/unit/services/servicePortalResolver.test.ts`

- [ ] **Step 1 — Failing test**

`test/unit/services/servicePortalResolver.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { resolvePortalTarget, PortalFoulError } from '../../../src/services/servicePortalResolver';

describe('resolvePortalTarget', () => {
    it('returns the .vm-root inside the active document', () => {
        const doc = document.implementation.createHTMLDocument('w');
        const root = doc.createElement('div');
        root.classList.add('vm-root');
        doc.body.appendChild(root);
        const target = resolvePortalTarget({ activeDocument: doc });
        expect(target).toBe(root);
    });

    it('returns the body if no .vm-root present, and reports a portal foul', () => {
        const doc = document.implementation.createHTMLDocument('w');
        const fouls: string[] = [];
        const target = resolvePortalTarget({
            activeDocument: doc,
            onFoul: (kind) => fouls.push(kind),
        });
        expect(target).toBe(doc.body);
        expect(fouls).toContain('portal-misplaced');
    });

    it('throws PortalFoulError when strict=true and target document is the wrong window', () => {
        const docA = document.implementation.createHTMLDocument('a');
        const docB = document.implementation.createHTMLDocument('b');
        const rootA = docA.createElement('div'); rootA.classList.add('vm-root'); docA.body.appendChild(rootA);
        expect(() =>
            resolvePortalTarget({
                activeDocument: docB,
                expectedDocument: docA,
                strict: true,
            }),
        ).toThrow(PortalFoulError);
    });
});
```

- [ ] **Step 2 — Run to confirm failure**

```bash
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/servicePortalResolver.test.ts --fileParallelism=false
```

Expected: FAIL.

- [ ] **Step 3 — Implement**

```ts
export type PortalFoulKind = 'portal-misplaced' | 'portal-cross-window';

export class PortalFoulError extends Error {
    constructor(public kind: PortalFoulKind) {
        super(`portal foul: ${kind}`);
    }
}

interface ResolveInput {
    activeDocument: Document;
    expectedDocument?: Document;
    strict?: boolean;
    onFoul?: (kind: PortalFoulKind) => void;
}

export function resolvePortalTarget(input: ResolveInput): HTMLElement {
    const { activeDocument, expectedDocument, strict = false, onFoul } = input;

    if (expectedDocument && expectedDocument !== activeDocument) {
        if (strict) throw new PortalFoulError('portal-cross-window');
        onFoul?.('portal-cross-window');
    }

    const root = activeDocument.querySelector<HTMLElement>('.vm-root');
    if (root) return root;

    onFoul?.('portal-misplaced');
    return activeDocument.body;
}
```

- [ ] **Step 4 — Re-run**

```bash
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/servicePortalResolver.test.ts --fileParallelism=false
```

Expected: PASS, 3/3.

---

## Task 4.2 — `vmDialog.svelte` wrapper over Bits UI Dialog

**Files:**

- Create: `src/components/overlays/vmDialog.svelte`
- Create: `test/component/vmDialogPortal.test.ts`

- [ ] **Step 1 — Failing test**

`test/component/vmDialogPortal.test.ts`:

```ts
import { mount, unmount } from 'svelte';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import vmDialog from '../../src/components/overlays/vmDialog.svelte';

let host: HTMLDivElement;
let app: ReturnType<typeof mount> | null = null;

beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    const root = document.createElement('div');
    root.classList.add('vm-root');
    host.appendChild(root);
});

afterEach(() => {
    if (app) unmount(app);
    host.remove();
});

describe('vmDialog', () => {
    it('renders the content inside the local .vm-root, not document.body directly', () => {
        app = mount(vmDialog, {
            target: host,
            props: { open: true, title: 'Hi', body: 'Hello' },
        });
        const vmRoot = host.querySelector('.vm-root') as HTMLElement;
        const dialog = vmRoot.querySelector('[role="dialog"]');
        expect(dialog).toBeTruthy();
    });

    it('closes on Escape', async () => {
        let open = $state(true);
        app = mount(vmDialog, {
            target: host,
            props: { get open() { return open; }, set open(v) { open = v; }, title: 'Hi', body: 'Hello' },
        });
        const dialog = host.querySelector('[role="dialog"]') as HTMLElement;
        dialog.focus();
        dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        await Promise.resolve();
        expect(open).toBe(false);
    });
});
```

- [ ] **Step 2 — Implement using Bits UI**

```svelte
<script lang="ts">
    import { Dialog } from 'bits-ui';
    import { resolvePortalTarget } from '../../services/servicePortalResolver';

    interface Props {
        open: boolean;
        title: string;
        body: string;
        activeDocument?: Document;
        children?: import('svelte').Snippet;
    }
    let { open = $bindable(), title, body, activeDocument, children }: Props = $props();

    const target = $derived(resolvePortalTarget({
        activeDocument: activeDocument ?? document,
    }));
</script>

<Dialog.Root bind:open>
    <Dialog.Portal {target}>
        <Dialog.Overlay class="vm-dialog-overlay" />
        <Dialog.Content class="vm-dialog-content vm-card" role="dialog">
            <Dialog.Title class="vm-dialog-title">{title}</Dialog.Title>
            <Dialog.Description class="vm-dialog-desc">{body}</Dialog.Description>
            {#if children}{@render children()}{/if}
            <Dialog.Close class="vm-btn-squircle vm-dialog-close" aria-label="Close">
                <span class="i-lucide-x"></span>
            </Dialog.Close>
        </Dialog.Content>
    </Dialog.Portal>
</Dialog.Root>
```

- [ ] **Step 3 — Run + iterate**

```bash
pnpm exec vp test run --project component --config vitest.config.ts test/component/vmDialogPortal.test.ts --fileParallelism=false
```

Expected: PASS, 2/2. If the second test fails because Bits UI bubbles
Escape via a window listener, route the close through `bind:open` and
trigger it from the test by setting `open = false` after dispatch.

---

## Task 4.3 — `vmPopover.svelte` + Find/Replace island migration

**Files:**

- Create: `src/components/overlays/vmPopover.svelte`
- Modify: `src/services/serviceFnRIsland.svelte.ts`
- Modify: `src/components/layout/overlays/overlayIsland.svelte`
- Create: `test/component/vmPopoverIsland.test.ts`

- [ ] **Step 1 — Failing test (Find/Replace island)**

`test/component/vmPopoverIsland.test.ts`:

```ts
import { mount, unmount } from 'svelte';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import overlayIsland from '../../src/components/layout/overlays/overlayIsland.svelte';
import { FnRIslandService } from '../../src/services/serviceFnRIsland.svelte';

let host: HTMLDivElement;
let app: ReturnType<typeof mount> | null = null;

beforeEach(() => {
    host = document.createElement('div');
    document.body.appendChild(host);
    const root = document.createElement('div');
    root.classList.add('vm-root');
    host.appendChild(root);
});
afterEach(() => { if (app) unmount(app); host.remove(); });

describe('overlayIsland Find/Replace popover', () => {
    it('expands the popover when service.expanded flips to true', async () => {
        const svc = new FnRIslandService();
        app = mount(overlayIsland, { target: host, props: { fnrService: svc } });
        expect(host.querySelector('[data-state="open"]')).toBeFalsy();
        svc.expanded = true;
        await Promise.resolve();
        expect(host.querySelector('[data-state="open"]')).toBeTruthy();
    });
});
```

- [ ] **Step 2 — Implement vmPopover.svelte**

```svelte
<script lang="ts">
    import { Popover } from 'bits-ui';
    import { resolvePortalTarget } from '../../services/servicePortalResolver';
    interface Props {
        open: boolean;
        triggerLabel: string;
        activeDocument?: Document;
        children?: import('svelte').Snippet;
    }
    let { open = $bindable(), triggerLabel, activeDocument, children }: Props = $props();
    const target = $derived(resolvePortalTarget({ activeDocument: activeDocument ?? document }));
</script>

<Popover.Root bind:open>
    <Popover.Trigger class="vm-btn-find">{triggerLabel}</Popover.Trigger>
    <Popover.Portal {target}>
        <Popover.Content class="vm-popover-content vm-card">
            {#if children}{@render children()}{/if}
        </Popover.Content>
    </Popover.Portal>
</Popover.Root>
```

- [ ] **Step 3 — Refactor `overlayIsland.svelte`**

Replace the existing manual show/hide DOM with `<vmPopover>` bound to
`fnrService.expanded`. Preserve the existing trigger label and content
slots. Confirm the keyboard shortcut still toggles `expanded`.

- [ ] **Step 4 — Run**

```bash
pnpm exec vp test run --project component --config vitest.config.ts test/component/vmPopoverIsland.test.ts --fileParallelism=false
```

Expected: PASS, 1/1.

---

## Task 4.4 — Native DOM event hijacking

**Files:**

- Modify: `src/services/serviceNativeSurfaceBinding.ts`
- Modify: `src/services/serviceNodeBinding.ts` (extend alias resolvers for outline)
- Create: `test/component/nativeClickInterceptor.test.ts`

- [ ] **Step 1 — Failing test**

`test/component/nativeClickInterceptor.test.ts`:

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

describe('native surface interception', () => {
    it('Ctrl+Click on .cm-hashtag dispatches a vm:open-node-note event with #tag alias', () => {
        const theme = new ThemeService();
        app = mount(frameVaultman, { target: host, props: { themeService: theme, interceptNativeClicks: true } });
        const tag = document.createElement('span');
        tag.classList.add('cm-hashtag');
        tag.textContent = '#projects';
        document.body.appendChild(tag);
        let captured: string | null = null;
        document.addEventListener('vm:open-node-note', (e: Event) => {
            captured = (e as CustomEvent<{ alias: string }>).detail.alias;
        }, { once: true });
        tag.dispatchEvent(new MouseEvent('click', { ctrlKey: true, bubbles: true }));
        expect(captured).toBe('#projects');
        tag.remove();
    });

    it('Ctrl+Click on snippet row in Obsidian settings dispatches with $snippet alias', () => {
        const theme = new ThemeService();
        app = mount(frameVaultman, { target: host, props: { themeService: theme, interceptNativeClicks: true } });
        const row = document.createElement('div');
        row.setAttribute('data-snippet-name', 'mytheme.css');
        document.body.appendChild(row);
        let captured: string | null = null;
        document.addEventListener('vm:open-node-note', (e: Event) => {
            captured = (e as CustomEvent<{ alias: string }>).detail.alias;
        }, { once: true });
        row.dispatchEvent(new MouseEvent('click', { ctrlKey: true, bubbles: true }));
        expect(captured).toBe('$mytheme');
        row.remove();
    });

    it('Ctrl+Click on plugin row dispatches with %plugin alias', () => {
        const theme = new ThemeService();
        app = mount(frameVaultman, { target: host, props: { themeService: theme, interceptNativeClicks: true } });
        const row = document.createElement('div');
        row.setAttribute('data-plugin-id', 'vaultman');
        document.body.appendChild(row);
        let captured: string | null = null;
        document.addEventListener('vm:open-node-note', (e: Event) => {
            captured = (e as CustomEvent<{ alias: string }>).detail.alias;
        }, { once: true });
        row.dispatchEvent(new MouseEvent('click', { ctrlKey: true, bubbles: true }));
        expect(captured).toBe('%vaultman');
        row.remove();
    });
});
```

- [ ] **Step 2 — Implement in `serviceNativeSurfaceBinding.ts`**

```ts
import type { Plugin } from 'obsidian';

interface InterceptInput {
    plugin: Plugin;
    activeDocument: Document;
    enabled: () => boolean;
}

export function attachNativeClickInterceptor(input: InterceptInput): () => void {
    const handler = (event: MouseEvent) => {
        if (!input.enabled()) return;
        if (!event.ctrlKey && !event.metaKey) return;
        const target = event.target as HTMLElement | null;
        if (!target) return;

        const tag = target.closest('.cm-hashtag') as HTMLElement | null;
        if (tag) {
            const alias = aliasForTagElement(tag);
            if (alias) dispatchOpen(input.activeDocument, alias);
            return;
        }
        const snippet = target.closest('[data-snippet-name]') as HTMLElement | null;
        if (snippet) {
            const alias = aliasForSnippet(snippet.dataset.snippetName ?? '');
            if (alias) dispatchOpen(input.activeDocument, alias);
            return;
        }
        const plugin = target.closest('[data-plugin-id]') as HTMLElement | null;
        if (plugin) {
            const alias = aliasForPlugin(plugin.dataset.pluginId ?? '');
            if (alias) dispatchOpen(input.activeDocument, alias);
            return;
        }
    };

    input.activeDocument.addEventListener('click', handler, true);
    return () => input.activeDocument.removeEventListener('click', handler, true);
}

function aliasForTagElement(el: HTMLElement): string | null {
    const raw = el.textContent?.trim() ?? '';
    if (!raw) return null;
    return raw.startsWith('#') ? raw : `#${raw}`;
}

function aliasForSnippet(filename: string): string | null {
    if (!filename) return null;
    const base = filename.replace(/\.css$/i, '');
    return `$${base}`;
}

function aliasForPlugin(id: string): string | null {
    if (!id) return null;
    return `%${id}`;
}

function dispatchOpen(doc: Document, alias: string): void {
    doc.dispatchEvent(new CustomEvent('vm:open-node-note', { detail: { alias }, bubbles: true }));
}
```

In `frameVaultman.svelte`, on mount: if `interceptNativeClicks` is
true (settings flag), call `attachNativeClickInterceptor`. Tear down
on destroy.

- [ ] **Step 3 — Extend `serviceNodeBinding.ts`**

Add convenience resolvers if absent:

```ts
export function aliasForSnippetFile(filename: string): string {
    return `$${filename.replace(/\.css$/i, '')}`;
}
export function aliasForPluginId(id: string): string {
    return `%${id}`;
}
export function aliasForTag(tag: string): string {
    return tag.startsWith('#') ? tag : `#${tag}`;
}
export function aliasForOutlineHeader(file: { basename: string }, header: string): string {
    return `[[${file.basename}#${header}]]`;
}
```

Keep the existing alias logic unchanged.

- [ ] **Step 4 — Run + pass**

```bash
pnpm exec vp test run --project component --config vitest.config.ts test/component/nativeClickInterceptor.test.ts --fileParallelism=false
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceNodeBinding.test.ts --fileParallelism=false
```

Expected: PASS.

---

## Task 4.5 — Alias-aware DnD (Notes for Nodes propagation)

**Files:**

- Modify: `src/services/serviceDnd.ts`
- Create: `test/unit/services/serviceDndAliasAware.test.ts`

- [ ] **Step 1 — Failing test**

`test/unit/services/serviceDndAliasAware.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { resolveDropEffect, formatDropPayload } from '../../../src/services/serviceDnd';

describe('serviceDnD alias-aware drop', () => {
    it('plain drag of a file node into a workspace editor inserts [[link]]', () => {
        const out = formatDropPayload({
            source: { kind: 'file', label: 'Note A' },
            modifiers: { alt: false, shift: false, ctrl: false, meta: false },
        });
        expect(out).toBe('[[Note A]]');
    });

    it('Shift+drag of a file inserts ![[embed]]', () => {
        const out = formatDropPayload({
            source: { kind: 'file', label: 'Note A' },
            modifiers: { alt: false, shift: true, ctrl: false, meta: false },
        });
        expect(out).toBe('![[Note A]]');
    });

    it('drag of a property node injects the property into target frontmatter via op', () => {
        const effect = resolveDropEffect({
            source: { kind: 'property', label: '[priority]' },
            target: { kind: 'note', path: 'X.md' },
        });
        expect(effect.kind).toBe('inject-frontmatter');
        expect(effect.property).toBe('priority');
        expect(effect.targetPath).toBe('X.md');
    });

    it('drag of an adopted block node into a note moves the block', () => {
        const effect = resolveDropEffect({
            source: { kind: 'adopted-block', label: '^ref', parentPath: 'A.md', blockId: 'ref' },
            target: { kind: 'note', path: 'B.md' },
        });
        expect(effect.kind).toBe('move-block');
        expect(effect.fromPath).toBe('A.md');
        expect(effect.toPath).toBe('B.md');
        expect(effect.blockId).toBe('ref');
    });

    it('drag of a tag node inserts #tag at cursor', () => {
        const out = formatDropPayload({
            source: { kind: 'tag', label: '#projects' },
            modifiers: { alt: false, shift: false, ctrl: false, meta: false },
        });
        expect(out).toBe('#projects');
    });
});
```

- [ ] **Step 2 — Implement helpers in `serviceDnd.ts`**

```ts
export interface DragSource {
    kind: 'file' | 'folder' | 'tag' | 'property' | 'snippet' | 'plugin' | 'adopted-header' | 'adopted-task' | 'adopted-block';
    label: string;
    parentPath?: string;
    blockId?: string;
}

export interface DropTarget {
    kind: 'editor' | 'note' | 'frontmatter' | 'tab';
    path?: string;
}

export interface DropEffect {
    kind: 'insert-text' | 'inject-frontmatter' | 'move-block' | 'open';
    text?: string;
    property?: string;
    targetPath?: string;
    fromPath?: string;
    toPath?: string;
    blockId?: string;
}

export interface Modifiers { alt: boolean; shift: boolean; ctrl: boolean; meta: boolean; }

export function formatDropPayload(input: { source: DragSource; modifiers: Modifiers }): string {
    const { source, modifiers } = input;
    if (source.kind === 'file' || source.kind === 'folder') {
        const label = source.label;
        return modifiers.shift ? `![[${label}]]` : `[[${label}]]`;
    }
    if (source.kind === 'tag') return source.label.startsWith('#') ? source.label : `#${source.label}`;
    if (source.kind === 'snippet') return `$${source.label.replace(/\.css$/i, '')}`;
    if (source.kind === 'plugin') return `%${source.label}`;
    return source.label;
}

export function resolveDropEffect(input: { source: DragSource; target: DropTarget }): DropEffect {
    const { source, target } = input;
    if (source.kind === 'property' && target.kind === 'note') {
        const property = source.label.replace(/^\[|\]$/g, '');
        return { kind: 'inject-frontmatter', property, targetPath: target.path };
    }
    if (source.kind === 'adopted-block' && target.kind === 'note' && source.parentPath && source.blockId) {
        return { kind: 'move-block', fromPath: source.parentPath, toPath: target.path!, blockId: source.blockId };
    }
    if (target.kind === 'editor' || target.kind === 'note') {
        return { kind: 'insert-text', text: formatDropPayload({ source, modifiers: { alt: false, shift: false, ctrl: false, meta: false } }) };
    }
    return { kind: 'open' };
}
```

- [ ] **Step 3 — Run + pass**

```bash
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceDndAliasAware.test.ts --fileParallelism=false
```

Expected: PASS, 5/5.

---

## Task 4.6 — Adopted-Node DnD block extraction (depends on T3 cutover)

**Files:**

- Modify: `src/services/serviceDnd.ts` (wire `move-block` to a VFS op)
- Modify: `src/services/serviceDndSvelteAdapter.ts`

- [ ] **Step 1 — Gate check**

```bash
pnpm run lint:full 2>&1 | grep 'no-mutable-vfs' || echo 'CUTOVER OK'
```

Expected: `CUTOVER OK`. If violations remain, halt 4.6 and notify T3.

- [ ] **Step 2 — Implement the op**

Create a `MoveBlockOp` that captures `(fromPath, toPath, blockId)` and
implements `apply(vfs)` to return a new state with the block line
spliced out of the `from` body and spliced into the `to` body. Stage
the op into the two relevant chains via `queueService.stageImmutableOp`.

Concrete shape (in `serviceDnd.ts` or a new `src/logic/logicBlocks.ts`):

```ts
export function buildMoveBlockOps(input: {
    fromVfs: ImmutableVirtualFileState;
    toVfs: ImmutableVirtualFileState;
    blockId: string;
    blockLine: number;
}): { fromOp: ImmutableStagedOp; toOp: ImmutableStagedOp } {
    const fromLines = input.fromVfs.body.split('\n');
    const extracted = fromLines.splice(input.blockLine, 1);
    const newFromBody = fromLines.join('\n');
    const newToBody = `${input.toVfs.body}\n${extracted[0]}`;

    const fromOp: ImmutableStagedOp = {
        id: `move-block-from-${input.blockId}`,
        kind: 'block-extract',
        action: 'extract-block',
        details: `→ ${input.toVfs.originalPath}`,
        apply: (vfs) => ({ ...vfs, body: newFromBody }),
    };
    const toOp: ImmutableStagedOp = {
        id: `move-block-to-${input.blockId}`,
        kind: 'block-insert',
        action: 'insert-block',
        details: `← ${input.fromVfs.originalPath}`,
        apply: (vfs) => ({ ...vfs, body: newToBody }),
    };
    return { fromOp, toOp };
}
```

- [ ] **Step 3 — Failing unit test**

`test/unit/services/serviceDndMoveBlock.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildMoveBlockOps } from '../../../src/services/serviceDnd';
import type { ImmutableVirtualFileState } from '../../../src/types/typeVfsImmutable';

function mkVfs(path: string, body: string): ImmutableVirtualFileState {
    return { file: { path } as any, originalPath: path, fm: {}, body, ops: [], fmInitial: {}, bodyInitial: body, bodyLoaded: true };
}

describe('buildMoveBlockOps', () => {
    it('removes block line from source and appends to target', () => {
        const from = mkVfs('a.md', 'line0\n^myblock\nline2');
        const to = mkVfs('b.md', 'target');
        const { fromOp, toOp } = buildMoveBlockOps({ fromVfs: from, toVfs: to, blockId: 'myblock', blockLine: 1 });
        const nextFrom = fromOp.apply(from);
        const nextTo = toOp.apply(to);
        expect(nextFrom.body).toBe('line0\nline2');
        expect(nextTo.body).toBe('target\n^myblock');
    });
});
```

- [ ] **Step 4 — Run**

```bash
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceDndMoveBlock.test.ts --fileParallelism=false
```

Expected: PASS, 1/1.

---

## Task 4.7 — Foul Detection

**Files:**

- Create: `src/services/serviceFoulDetection.svelte.ts`
- Create: `test/unit/services/serviceFoulDetection.test.ts`
- Modify: `src/components/frame/frameVaultman.svelte` (mount the detector when settings.foulDetection is on)

- [ ] **Step 1 — Failing test**

`test/unit/services/serviceFoulDetection.test.ts`:

```ts
import { describe, expect, it, beforeEach } from 'vitest';
import { FoulDetectionService } from '../../../src/services/serviceFoulDetection.svelte';

describe('FoulDetectionService', () => {
    let svc: FoulDetectionService;

    beforeEach(() => {
        svc = new FoulDetectionService();
        svc.enabled = true;
    });

    it('records portal-misplaced fouls', () => {
        svc.recordPortalFoul('portal-misplaced');
        expect(svc.fouls.length).toBe(1);
        expect(svc.fouls[0].kind).toBe('portal-misplaced');
    });

    it('records snippet-drift foul when computed style is the unstyled baseline', () => {
        const el = document.createElement('div');
        el.classList.add('nav-file');
        document.body.appendChild(el);
        // No snippet applied; treat as drift.
        svc.checkSnippetDrift({ root: document.body, mirrorClass: 'nav-file', expectedProperty: 'background-color' });
        const drift = svc.fouls.find((f) => f.kind === 'snippet-drift');
        expect(drift).toBeDefined();
        el.remove();
    });

    it('records dom-mimicry foul when Thin + native lacks .nav-file children', () => {
        const root = document.createElement('div');
        root.classList.add('vm-root', 'vm-mode-thin', 'vm-id-native');
        document.body.appendChild(root);
        svc.checkDomMimicry(root);
        const m = svc.fouls.find((f) => f.kind === 'dom-mimicry');
        expect(m).toBeDefined();
        root.remove();
    });

    it('reset clears the fouls list', () => {
        svc.recordPortalFoul('portal-misplaced');
        svc.reset();
        expect(svc.fouls.length).toBe(0);
    });
});
```

- [ ] **Step 2 — Implement**

```ts
import type { PortalFoulKind } from './servicePortalResolver';

export type FoulKind = PortalFoulKind | 'snippet-drift' | 'dom-mimicry';

export interface FoulEntry {
    kind: FoulKind;
    detail: string;
    timestamp: number;
}

export class FoulDetectionService {
    enabled = $state(false);
    fouls = $state<FoulEntry[]>([]);

    recordPortalFoul(kind: PortalFoulKind, detail = '') {
        if (!this.enabled) return;
        this.fouls = [...this.fouls, { kind, detail, timestamp: Date.now() }];
        console.warn(`[vaultman:foul:${kind}] ${detail}`);
    }

    checkSnippetDrift(input: { root: HTMLElement; mirrorClass: string; expectedProperty: string }) {
        if (!this.enabled) return;
        const el = input.root.querySelector(`.${input.mirrorClass}`);
        if (!el) return;
        const value = getComputedStyle(el as HTMLElement).getPropertyValue(input.expectedProperty);
        const looksUnstyled = value === '' || value === 'rgba(0, 0, 0, 0)' || value === 'transparent';
        if (looksUnstyled) {
            (el as HTMLElement).dataset.vmFoul = 'snippet-drift';
            this.fouls = [...this.fouls, {
                kind: 'snippet-drift',
                detail: `.${input.mirrorClass} on ${input.expectedProperty}`,
                timestamp: Date.now(),
            }];
        }
    }

    checkDomMimicry(root: HTMLElement) {
        if (!this.enabled) return;
        if (!root.classList.contains('vm-mode-thin')) return;
        if (!root.classList.contains('vm-id-native')) return;
        const explorers = root.querySelectorAll('[data-vm-explorer="files"]');
        for (const explorer of explorers) {
            if (!explorer.querySelector('.nav-file')) {
                this.fouls = [...this.fouls, {
                    kind: 'dom-mimicry',
                    detail: 'files explorer missing .nav-file',
                    timestamp: Date.now(),
                }];
            }
        }
    }

    reset() {
        this.fouls = [];
    }
}
```

- [ ] **Step 3 — Wire into the frame**

In `frameVaultman.svelte`, on mount when `themeService.foulDetection` is
true, instantiate `FoulDetectionService` and run `checkDomMimicry(root)`
inside an `$effect` whenever `themeService.mode` or
`themeService.identity` changes. Pass the service into `vmDialog` /
`vmPopover` via context so they can call `recordPortalFoul` when the
portal resolver reports one.

- [ ] **Step 4 — Run + pass**

```bash
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceFoulDetection.test.ts --fileParallelism=false
```

Expected: PASS, 4/4.

---

## Task 4.8 — 3-Column Dashboard

**Files:**

- Create: `src/components/dashboard/Dashboard3Column.svelte`
- Modify: `src/components/frame/frameVaultman.svelte`
- Create: `test/component/dashboard3Column.test.ts`

- [ ] **Step 1 — Failing test**

`test/component/dashboard3Column.test.ts`:

```ts
import { mount, unmount } from 'svelte';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Dashboard3Column from '../../src/components/dashboard/Dashboard3Column.svelte';
import { ThemeService } from '../../src/services/serviceTheme.svelte';

let host: HTMLDivElement;
let app: ReturnType<typeof mount> | null = null;
beforeEach(() => { host = document.createElement('div'); document.body.appendChild(host); });
afterEach(() => { if (app) unmount(app); host.remove(); });

describe('Dashboard3Column', () => {
    it('renders three columns with data-vm-col attributes when enabled', () => {
        const theme = new ThemeService(); theme.mode = 'balanced';
        app = mount(Dashboard3Column, {
            target: host,
            props: {
                themeService: theme,
                enabled: true,
                filters: () => 'F',
                explorer: () => 'E',
                addons: () => 'A',
            },
        });
        expect(host.querySelector('[data-vm-col="filters"]')).toBeTruthy();
        expect(host.querySelector('[data-vm-col="explorer"]')).toBeTruthy();
        expect(host.querySelector('[data-vm-col="addons"]')).toBeTruthy();
    });

    it('falls back to a single column when enabled=false', () => {
        const theme = new ThemeService();
        app = mount(Dashboard3Column, {
            target: host,
            props: {
                themeService: theme,
                enabled: false,
                filters: () => 'F',
                explorer: () => 'E',
                addons: () => 'A',
            },
        });
        expect(host.querySelectorAll('[data-vm-col]').length).toBe(1);
    });
});
```

- [ ] **Step 2 — Implement**

```svelte
<script lang="ts">
    import type { ThemeService } from '../../services/serviceTheme.svelte';
    interface Props {
        themeService: ThemeService;
        enabled: boolean;
        filters: import('svelte').Snippet;
        explorer: import('svelte').Snippet;
        addons: import('svelte').Snippet;
    }
    let { themeService, enabled, filters, explorer, addons }: Props = $props();
</script>

{#if enabled}
    <div class="vm-dashboard vm-dashboard-3col" data-vm-dashboard>
        <section data-vm-col="filters" class="vm-dashboard-col vm-dashboard-col-filters">
            {@render filters()}
        </section>
        <section data-vm-col="explorer" class="vm-dashboard-col vm-dashboard-col-explorer">
            {@render explorer()}
        </section>
        <section data-vm-col="addons" class="vm-dashboard-col vm-dashboard-col-addons">
            {@render addons()}
        </section>
    </div>
{:else}
    <div class="vm-dashboard vm-dashboard-1col">
        <section data-vm-col="single" class="vm-dashboard-col">
            {@render explorer()}
        </section>
    </div>
{/if}
```

- [ ] **Step 3 — Wire from `frameVaultman.svelte`**

Compute `enabled` from `serviceLayout.resolveDashboardEnabled({ width, kind, mode })`
via a `ResizeObserver` measuring the frame container. Pass three
snippets corresponding to: filters bar, explorer (whichever tab is
active), and add-ons. The exact snippet wiring depends on the existing
frame layout; preserve current single-column behavior for sidebar/Thin.

- [ ] **Step 4 — Run + pass**

```bash
pnpm exec vp test run --project component --config vitest.config.ts test/component/dashboard3Column.test.ts --fileParallelism=false
```

Expected: PASS, 2/2.

---

## Task 4.9 — Add-ons island: Quick Switcher + Markdown pane + FAB ink

**Files:**

- Create: `src/components/addons/AddonsMarkdownPane.svelte`
- Create: `src/services/serviceAddonsIsland.svelte.ts`
- Create: `test/component/addonsMarkdownPane.test.ts`
- Modify: `src/components/layout/overlays/layoutOverlay.svelte` (FAB animation hook)

- [ ] **Step 1 — Failing test**

`test/component/addonsMarkdownPane.test.ts`:

```ts
import { mount, unmount } from 'svelte';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import AddonsMarkdownPane from '../../src/components/addons/AddonsMarkdownPane.svelte';
import { AddonsIslandService } from '../../src/services/serviceAddonsIsland.svelte';

let host: HTMLDivElement;
let app: ReturnType<typeof mount> | null = null;
beforeEach(() => { host = document.createElement('div'); document.body.appendChild(host); });
afterEach(() => { if (app) unmount(app); host.remove(); });

describe('AddonsMarkdownPane', () => {
    it('renders stats pane by default', () => {
        const svc = new AddonsIslandService();
        app = mount(AddonsMarkdownPane, { target: host, props: { service: svc, statsRenderer: () => 'STATS' } });
        expect(host.textContent).toContain('STATS');
    });

    it('switches to markdown pane when a note path is set', async () => {
        const svc = new AddonsIslandService();
        let renderedFor: string | null = null;
        app = mount(AddonsMarkdownPane, {
            target: host,
            props: {
                service: svc,
                statsRenderer: () => 'STATS',
                markdownRenderer: (path: string, mount: HTMLElement) => {
                    renderedFor = path;
                    mount.textContent = `MD:${path}`;
                },
            },
        });
        svc.openNote('Reference.md');
        await Promise.resolve();
        expect(renderedFor).toBe('Reference.md');
        expect(host.textContent).toContain('MD:Reference.md');
    });
});
```

- [ ] **Step 2 — Service**

`src/services/serviceAddonsIsland.svelte.ts`:

```ts
export class AddonsIslandService {
    activePane = $state<'stats' | 'markdown'>('stats');
    notePath = $state<string | null>(null);

    openNote(path: string): void {
        this.notePath = path;
        this.activePane = 'markdown';
    }
    showStats(): void {
        this.activePane = 'stats';
        this.notePath = null;
    }
}
```

- [ ] **Step 3 — Pane component**

```svelte
<script lang="ts">
    import { onMount } from 'svelte';
    import type { AddonsIslandService } from '../../services/serviceAddonsIsland.svelte';

    interface Props {
        service: AddonsIslandService;
        statsRenderer: () => string;
        markdownRenderer?: (path: string, mountPoint: HTMLElement) => void;
    }
    let { service, statsRenderer, markdownRenderer }: Props = $props();

    let mdMount: HTMLDivElement;

    $effect(() => {
        if (service.activePane === 'markdown' && service.notePath && markdownRenderer && mdMount) {
            mdMount.replaceChildren();
            markdownRenderer(service.notePath, mdMount);
        }
    });
</script>

{#if service.activePane === 'stats'}
    <div class="vm-addons-stats">{statsRenderer()}</div>
{:else}
    <div bind:this={mdMount} class="vm-addons-markdown"></div>
{/if}
```

In production wiring, `markdownRenderer` invokes Obsidian's
`MarkdownRenderer.renderMarkdown(content, mountPoint, sourcePath, component)`.

- [ ] **Step 4 — Quick Switcher hook**

In the add-ons island toolbar, add a button that calls
`(this.app as any).commands.executeCommandById('switcher:open')` and
then registers a one-shot interception for the user's selection (read
`app.workspace.getActiveFile()` after the switcher closes). The exact
hook depends on Obsidian internals; keep the call boxed inside the
add-ons island service so future API changes only touch one place.

- [ ] **Step 5 — FAB orbiting-ink animation**

In `layoutOverlay.svelte`, observe `queueService.length` (or
`chains.size`) and toggle a `.vm-fab-processing` class on the Ops FAB.
SCSS in `src/styles/panel/_ops.scss` adds:

```scss
.vm-fab-processing {
    animation: vm-orbiting-ink 1.6s linear infinite;
}

@keyframes vm-orbiting-ink {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
}
```

Respect `themeService.reducedMotion`: when true, suppress the
animation by gating with `[data-vm-reduced-motion="false"]` or the
existing `.vm-reduced-motion` root class.

- [ ] **Step 6 — Run**

```bash
pnpm exec vp test run --project component --config vitest.config.ts test/component/addonsMarkdownPane.test.ts --fileParallelism=false
```

Expected: PASS, 2/2.

---

## Thread Verification Envelope (run at handoff)

```bash
pnpm run lint:full
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/servicePortalResolver.test.ts test/unit/services/serviceFoulDetection.test.ts test/unit/services/serviceDndAliasAware.test.ts test/unit/services/serviceDndMoveBlock.test.ts --fileParallelism=false
pnpm exec vp test run --project component --config vitest.config.ts test/component/vmDialogPortal.test.ts test/component/vmPopoverIsland.test.ts test/component/nativeClickInterceptor.test.ts test/component/dashboard3Column.test.ts test/component/addonsMarkdownPane.test.ts --fileParallelism=false
pnpm run check
pnpm run build:plugin
obsidian vault=plugin-dev plugin:reload id=vaultman
obsidian vault=plugin-dev command id=vaultman:open
obsidian vault=plugin-dev eval code="(() => !!activeDocument.querySelector('.vm-root [role=\"dialog\"]'))()"
obsidian vault=plugin-dev eval code="(() => !!activeDocument.querySelector('[data-vm-col=\"explorer\"]'))()"
obsidian vault=plugin-dev dev:errors
```

Expected: lint clean, all targeted tests pass, `svelte-check` exits 0,
build exits 0, plugin reloads, both evals return appropriate booleans
once the diff modal is opened and the dashboard mode is active in a
main-leaf wider than 800px, no Vaultman stack in dev errors.

Additional pop-out window smoke (manual): open Vaultman in a pop-out
window, trigger the diff dialog, confirm the modal renders inside the
pop-out's `.vm-root`. With `themeService.foulDetection = true`, no
`portal-misplaced` foul should be logged.

## Handoff Notes

- If T4 task 4.6 was skipped because T3 cutover had not landed, list
  the skip in the handoff and reopen once T3 task 3.8 reports green.
- Quick Switcher integration in 4.9 step 4 depends on Obsidian command
  IDs. If `switcher:open` is unavailable in the target Obsidian
  version, fall back to `app.commands.executeCommandById('quick-switcher:open')`
  or surface a settings field for the user to pin the command ID.
- Adopted-Header DnD (separate from block extraction) is **not** in
  T4 scope; if needed, plan a follow-up under `tabOutlines` polish.
- All Bits UI components used by T4 (`Dialog`, `Popover`,
  `DropdownMenu`, `Accordion` for properties mimicry per spec 11) must
  resolve their portal via `resolvePortalTarget`. If a new Bits UI
  surface is introduced, add a portal-correctness test next to it.
