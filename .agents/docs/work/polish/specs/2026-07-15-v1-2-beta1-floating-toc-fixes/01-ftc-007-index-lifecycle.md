---
title: FTC-007 Spec — index lifecycle, scoped collapse, and soft scroll
type: spec-shard
status: approved
parent: "[[docs/work/polish/specs/2026-07-15-v1-2-beta1-floating-toc-fixes/index|beta.1 corrective batch]]"
created: 2026-07-15T00:00:00
created_by: codex-gpt-5
tags: [agent/spec, floating-toc, release/1.2.0-beta.1]
---

# FTC-007 — Index lifecycle, scoped collapse, and soft scroll

## User-visible contract

1. `Close index` is the literal first action node, before the files/folders toggle,
   drill action, scoped-back action, and indexed groups.
2. Close immediately hides the rail and quietly persists
   `floatingTocEnabled=false`.
3. The scoped-back action goes back exactly one hierarchy level. At the first scoped
   level, one level back is the top level (`null`).
4. Collapsing the node that owns the current scope performs the same one-level-back
   transition.
5. Collapsing an ancestor of a deeper current scope returns to the level above the
   collapsed ancestor, because the deeper scope is no longer visible.
6. Collapsing an unrelated branch leaves the scope unchanged.
7. Toolbar `Collapse All` always resets the index directly to top level.
8. The nonfunctional `Instant jump` option is replaced by `Soft scroll`. It defaults
   off. When on, both taps and Niagara scrub navigation animate from the current
   explorer scroll position to the requested group; when off, navigation remains
   immediate.

## Root causes in `3d86f57c`

- `tocRootId` lives in `VaultmanFrame.svelte`; expanded ids live privately inside
  `FilesExplorerPanel`, `PropsExplorerPanel`, and `TagsExplorerPanel`. Their current
  callback reports only "something changed", so the frame cannot distinguish a row
  collapse from `Collapse All` or an expansion.
- `resetTocScope()` always assigns `null`, so the existing scoped node is a top-level
  reset rather than a back-one-level action.
- `tocHardJump` only adds `.is-instant` to the rail, which removes glyph transition
  CSS. It never reaches `FloatingTocRouter`, `revealNode`, `scrollToId`, or
  `scrollToPath`.
- Virtualized offscreen paths assign `scrollTop` directly, while rendered tree rows
  call `scrollIntoView` without a behavior option.

## Typed lifecycle seam

Introduce a shared expansion event owned by the Floating TOC port:

```ts
export type FloatingTocExpansionChange =
	| { type: 'collapse-node'; id: string }
	| { type: 'collapse-all' };
```

`onIndexChanged` accepts an optional event. Generic re-renders continue to call it
without an event and only bump group derivation. Explicit row collapse and
`collapseAll()` additionally report the typed event. Expansions do not invalidate a
scope.

The frame binds a panel-aware callback so a change in an inactive panel cannot mutate
the active tab's `tocRootId`. Callback cleanup retains the current replacement guard.

## Pure scope reconciliation

Given `currentRootId`, `collapsedId`, and the panel's existing
`scopeRootForNode(id)`, walk upward from `currentRootId`:

- If the walk never reaches `collapsedId`, return `currentRootId` unchanged.
- If it reaches `collapsedId`, return `scopeRootForNode(collapsedId)`.
- `collapse-all` bypasses the walk and returns `null`.
- A manual scoped-back action returns `scopeRootForNode(currentRootId)`.

The resolver is pure and belongs in `logicIndexGroups.ts`; unit tests cover current
root, deeper ancestor, unrelated branch, top-level root, and absent current scope.

## Reveal behavior seam

Replace the misleading setting with:

```ts
tocSoftScroll: boolean;
```

Do not invert or migrate `tocHardJump`: it never had runtime scroll behavior and the
new option is explicitly off by default. An old key may remain in a beta tester's JSON
but is ignored.

Extend the existing port without changing the action id:

```ts
export interface RevealNodeOptions {
	behavior?: ScrollBehavior;
}

revealNode(id: string, options?: RevealNodeOptions): boolean;
```

`FloatingTocRouter.invoke('reveal-node', targetId, options)` forwards the options.
The frame selects `behavior: 'smooth'` only when `tocSoftScroll` is true.

`UnifiedTreeView.scrollToId`, `FilesGridView.scrollToPath`, and
`GridView.scrollToPath` accept an optional behavior. Rendered rows use
`scrollIntoView({ block, inline: 'nearest', behavior })`; virtualized targets use
`element.scrollTo({ top, behavior })` and retain the existing render scheduling.
Props/Tags table-grid continue their existing clean rejection; this issue does not
expand the old FTC-002 port limitation.

During Niagara scrub, navigation fires only when the active group changes, preventing
dozens of identical smooth-scroll retargets per pointer move.

## Acceptance tests

- Pure resolver returns the correct scope for all five cases above.
- Each panel reports `collapse-node` and `collapse-all` through the Floating TOC seam.
- Router unit tests prove `behavior` forwarding and retain missing/rejected reasons.
- Tree/Grid/FilesGrid behavior tests prove `auto` versus `smooth` reaches the DOM
  scrolling primitive.
- Source/component tests prove close is first, back is one level, and the obsolete
  Settings row/key is not user-facing.

