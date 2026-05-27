---
title: Release 1.0.1 Plan - Scorecard Source Fixes
type: implementation-plan-shard
status: active
parent: "[[docs/work/publish/plans/2026-05-26-release-1-0-1-from-1-0-0/index|Release 1.0.1 From 1.0.0 Implementation Plan]]"
created: 2026-05-26T22:07:55
updated: 2026-05-26T22:07:55
tags:
  - agent/plan
  - initiative/publish
created_by: codex-gpt-5
updated_by: codex-gpt-5
---

# Scorecard Source Fixes

## Task 5: Fix Manifest And Obsidian API Usage

**Files:** `manifest.json`, `src/i18n/index.ts`, `src/svelte.d.ts`, `src/VaultmanSettings.ts`, `src/main.ts`

- [ ] **Step 1: Add punctuation to manifest description**

Change the `manifest.json` description value to end with a period:

```json
"description": "Files, content and frontmatter explorer like Bases with scoped queued changes list.",
```

- [ ] **Step 2: Replace localStorage language detection**

In `src/i18n/index.ts`, add:

```typescript
import { getLanguage as getObsidianLanguage } from 'obsidian';
```

Replace the localStorage block in `resolveLanguage` with:

```typescript
	const obsidianLanguage = getObsidianLanguage();
	if (obsidianLanguage.startsWith('es')) return 'es';
	if (obsidianLanguage) return 'en';
```

- [ ] **Step 3: Replace Svelte declaration any**

Replace `src/svelte.d.ts` with:

```typescript
// Type declaration for .svelte file imports.
// esbuild-svelte compiles them; tsc only needs to know the component constructor shape.
declare module '*.svelte' {
	import type { ComponentType, SvelteComponent } from 'svelte';

	const component: ComponentType<SvelteComponent<Record<string, unknown>>>;
	export default component;
}
```

- [ ] **Step 4: Use activeDocument in settings and main**

In `src/VaultmanSettings.ts`, import `activeDocument` from `obsidian` and replace:

```typescript
document.body.toggleClass('vaultman-bases-column-separators', v);
```

with:

```typescript
activeDocument.body.toggleClass('vaultman-bases-column-separators', v);
```

In `src/main.ts`, import `activeDocument` from `obsidian` and replace:

```typescript
document.body.style.setProperty('--vaultman-glass-blur', `${px}px`);
```

with:

```typescript
activeDocument.body.style.setProperty('--vaultman-glass-blur', `${px}px`);
```

## Task 6: Fix Timer And Animation Globals

**Files:** `src/components/layout/islandActiveFilters.ts`, `src/components/layout/islandQueue.ts`, `src/components/layout/viewTree.ts`, `src/utils/inputModal.ts`, `src/modals/modalLinter.ts`, `src/services/serviceOperationQueue.ts`, `src/services/servicePropertyIndex.ts`

- [ ] **Step 1: Replace requestAnimationFrame globals**

Replace `requestAnimationFrame(` with `window.requestAnimationFrame(` in:

- `src/components/layout/islandActiveFilters.ts`
- `src/components/layout/islandQueue.ts`
- `src/utils/inputModal.ts`

Replace this line in `src/components/layout/viewTree.ts`:

```typescript
this._pendingRaf = requestAnimationFrame(() => {
```

with:

```typescript
this._pendingRaf = window.requestAnimationFrame(() => {
```

- [ ] **Step 2: Replace setTimeout globals**

In `src/modals/modalLinter.ts`, replace:

```typescript
await new Promise((r) => setTimeout(r, 50));
```

with:

```typescript
await new Promise((r) => window.setTimeout(r, 50));
```

In `src/services/serviceOperationQueue.ts`, replace:

```typescript
await new Promise<void>((r) => setTimeout(r, 0));
```

with:

```typescript
await new Promise<void>((r) => window.setTimeout(r, 0));
```

- [ ] **Step 3: Replace property index timer globals**

In `src/services/servicePropertyIndex.ts`, use:

```typescript
private metadataTimer: ReturnType<typeof window.setTimeout> | null = null;
window.clearTimeout(this.metadataTimer);
this.metadataTimer = window.setTimeout(() => {
```

## Task 7: Fix Type Assertion Warnings

**Files:** `src/components/containers/explorerFiles.ts`, `src/components/containers/explorerProps.ts`

- [ ] **Step 1: Remove unnecessary file node assertion**

Replace:

```typescript
{ nodeType: 'file', node: node as TreeNode<unknown>, surface: 'panel', file: meta.file },
```

with:

```typescript
{ nodeType: 'file', node, surface: 'panel', file: meta.file },
```

- [ ] **Step 2: Type frontmatter reads without unsafe assignment**

In `_getFilesWithValue`, replace the frontmatter block with:

```typescript
const fm: Record<string, unknown> = this.plugin.app.metadataCache.getFileCache(f)?.frontmatter ?? {};
if (!(propName in fm)) return false;
const v: unknown = fm[propName];
if (Array.isArray(v)) return v.some(x => String(x) === value);
return String(v) === value;
```

- [ ] **Step 3: Remove unnecessary PropMeta assertions**

Use `n.meta.isValueNode`, `node.meta.propType`, and a type predicate for value-deletion queue checks:

```typescript
const topProps = tree.filter(n => !n.meta.isValueNode);
setIcon(iconEl, TYPE_ICON_MAP[node.meta.propType ?? ''] ?? 'lucide-tag');
const isValueDeleted = queue.some((op): op is PropertyChange =>
	op.type === 'property' &&
	op.property === meta.propName &&
	op.action === 'delete' &&
	op.oldValue === meta.rawValue
);
```

- [ ] **Step 4: Run scan and type gates**

Run:

```powershell
npm run test:scorecard
npm run check
npm run lint
```

Expected: `test:scorecard` prints `Scorecard regression scan passed (13 checks).`; `check` and `lint` exit 0.

- [ ] **Step 5: Commit Scorecard fixes**

Run:

```powershell
git add manifest.json src/i18n/index.ts src/svelte.d.ts src/VaultmanSettings.ts src/main.ts src/components/layout/islandActiveFilters.ts src/components/layout/islandQueue.ts src/components/layout/viewTree.ts src/utils/inputModal.ts src/modals/modalLinter.ts src/services/serviceOperationQueue.ts src/services/servicePropertyIndex.ts src/components/containers/explorerFiles.ts src/components/containers/explorerProps.ts
git commit -m "fix(scorecard): resolve Obsidian source warnings"
```
