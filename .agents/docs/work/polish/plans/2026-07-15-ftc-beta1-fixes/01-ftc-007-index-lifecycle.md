---
title: FTC-007 — Floating index lifecycle and soft scroll
type: plan
status: completed
created: 2026-07-15
updated: 2026-07-15
---

# FTC-007 — Floating index lifecycle and soft scroll

**Goal:** make the floating index closeable, make scoped navigation follow explorer collapse state, and replace the inert Instant Jump option with real opt-in smooth scrolling.

**Architecture:** keep hierarchy decisions pure in `logicIndexGroups.ts`; carry explicit collapse events through each panel's existing index callback; keep reveal behavior in the existing router port instead of coupling the Svelte component to view classes.

## Task 1 — Lock the scope transition contract

**Files**

- Modify `test/unit/logicIndexGroups.test.ts`
- Modify `src/logic/logicIndexGroups.ts`

1. Add failing unit cases for `scopeAfterExpansionChange`:
   - `collapse-all` returns `null` from any scope;
   - collapsing the current scoped node returns its parent;
   - collapsing any ancestor of the current scope returns the collapsed node's parent;
   - collapsing an unrelated branch preserves the current scope;
   - a current top-level scope returns `null` when that node collapses.
2. Run:

   ```powershell
   pnpm exec vitest run --config vitest.unit.config.mts test/unit/logicIndexGroups.test.ts
   ```

   Confirm RED because the export does not exist.
3. Add these public contracts:

   ```ts
   export type FloatingTocExpansionChange =
     | { type: 'collapse-node'; id: string }
     | { type: 'collapse-all' };

   export function scopeAfterExpansionChange(
     currentRootId: string | null,
     change: FloatingTocExpansionChange,
     parentForNode: (id: string) => string | null,
   ): string | null;
   ```

   For `collapse-node`, walk from `currentRootId` upward. When the walk reaches `change.id`, return `parentForNode(change.id)`; return the unchanged current root if the collapsed id is absent from that chain. Guard cyclic/broken parent functions with a visited set.
4. Re-run the focused test and confirm GREEN.

## Task 2 — Propagate explicit explorer collapse events

**Files**

- Modify `test/unit/floatingTocSource.test.ts`
- Modify `src/services/routerFloatingToc.ts`
- Modify `src/components/containers/explorerFiles.ts`
- Modify `src/components/containers/explorerProps.ts`
- Modify `src/components/containers/explorerTags.ts`

1. Add failing source/contract assertions that all three panels expose `onIndexChanged?: (change?: FloatingTocExpansionChange) => void`, emit `{ type: 'collapse-node', id }` only on expanded-to-collapsed transitions, and emit `{ type: 'collapse-all' }` from `collapseAll()`.
2. Run the focused test and verify RED on the new callback/event assertions.
3. Re-export `FloatingTocExpansionChange` from `routerFloatingToc.ts` (its single definition remains in `logicIndexGroups.ts`) and use it in the `FloatingTocPanel` callback contract.
4. In each panel:
   - type `onIndexChanged` with the optional event;
   - change `_notifyExpansionChanged` to accept an optional event and forward it to both the existing expansion handler and `onIndexChanged`;
   - preserve generic `_setIndexRoots(...); onIndexChanged?.()` notifications;
   - capture `wasExpanded` before each UI toggle and pass `collapse-node` only when it changes from true to false;
   - pass `collapse-all` from `collapseAll()`.
5. Re-run the focused test and the existing panel/router tests.

## Task 3 — Make reveal behavior an end-to-end option

**Files**

- Modify `test/unit/routerFloatingToc.test.ts`
- Modify `test/unit/viewTreeBehavior.test.ts`
- Modify `test/unit/floatingTocSource.test.ts`
- Modify `src/services/routerFloatingToc.ts`
- Modify `src/components/layout/viewTree.ts`
- Modify `src/components/layout/viewGrid.ts`
- Modify `src/components/layout/viewFilesGrid.ts`
- Modify `src/components/containers/explorerFiles.ts`
- Modify `src/components/containers/explorerProps.ts`
- Modify `src/components/containers/explorerTags.ts`

1. Add failing tests for the wished-for API:

   ```ts
   export interface RevealNodeOptions {
     behavior?: ScrollBehavior;
   }
   router.invoke('reveal-node', 'file.md', { behavior: 'smooth' });
   ```

   Assert the router forwards the exact options object. Extend `TinyElement` with spies for `scrollIntoView` and `scrollTo`; assert `UnifiedTreeView.scrollToId` passes `behavior: 'smooth'` for rendered and virtualized rows.
2. Run the focused router/tree tests and confirm RED.
3. Add optional `RevealNodeOptions` to `RevealNodePort.revealNode` and `FloatingTocRouter.invoke`.
4. Add optional `behavior: ScrollBehavior = 'auto'` to the three view scroll methods:
   - rendered tree rows call `scrollIntoView({ block, behavior })`;
   - virtualized tree/grid/files-grid branches call `container.scrollTo({ top, behavior })`;
   - existing fallback lookup and return semantics remain unchanged.
5. Forward options through each panel's `revealNode` implementation.
6. Re-run focused tests and confirm GREEN.

## Task 4 — Wire close, back, collapse reconciliation, and Soft Scroll

**Files**

- Modify `test/unit/floatingTocSource.test.ts`
- Modify `test/unit/settingsDefaults.test.ts`
- Modify `src/components/layout/floatingToc.svelte`
- Modify `src/VaultmanFrame.svelte`
- Modify `src/types/typeSettings.ts`
- Modify `src/VaultmanSettings.ts`
- Modify `src/i18n/en.ts`
- Modify `src/i18n/es.ts`

1. Add failing assertions for:
   - a `vaultman-floating-toc-close` action before the kind toggle;
   - a scoped back action instead of an unconditional top reset;
   - `tocSoftScroll` defaulting to `false`;
   - the old `tocHardJump` setting and “Instant Jump” copy being absent from the beta UI;
   - frame invocation with `{ behavior: tocSoftScroll ? 'smooth' : 'auto' }`;
   - panel-aware expansion callbacks.
2. Run focused tests and confirm RED.
3. Replace `hardJump` with `softScroll` in the component option interface. Do not read or invert persisted `tocHardJump`; the new `tocSoftScroll` default is `false`.
4. Add `onClose` and `onBack` component props. Render close literally first; render back only when scoped. Keep toggle-kind and drill ordering after close.
5. In `VaultmanFrame.svelte`:
   - `onClose` calls the existing floating-TOC disable toggle;
   - `onBack` assigns `panel.scopeRootForNode(tocRootId)`;
   - each panel callback captures its panel id and ignores collapse state changes from inactive panels;
   - explicit changes call `scopeAfterExpansionChange`; generic notifications only bump the render revision;
   - collapse-all drives `tocRootId` to `null`;
   - reveal passes `smooth` only when the setting is on;
   - only assign navigation state when the target/group differs from the active one.
6. Replace the Settings row/copy with “Soft scroll” and explanatory text in English and Spanish.
7. Run the Svelte autofixer on both edited components and apply only semantics-preserving fixes.
8. Run:

   ```powershell
   pnpm exec vitest run --config vitest.unit.config.mts test/unit/logicIndexGroups.test.ts test/unit/routerFloatingToc.test.ts test/unit/viewTreeBehavior.test.ts test/unit/floatingTocSource.test.ts test/unit/settingsDefaults.test.ts
   pnpm run check
   git diff --check
   ```

9. Commit code only:

   ```powershell
   git add src test
   git commit -m "fix(explorer): synchronize floating index lifecycle"
   ```

## FTC-007 acceptance

- Close is the first action and disables the floating index.
- Back moves exactly one scope level.
- Collapsing the scoped node or an ancestor reconciles scope; unrelated collapse does not.
- Collapse All returns to the top level.
- Soft Scroll changes the actual explorer scroll API for tree, grid, and files-grid.
- All existing instant scroll behavior remains the default.
