---
title: Virtualizer And Scroll Orchestration
type: spec-shard
status: active
parent: "[[docs/work/hardening/specs/2026-05-16-notebook-navigator-scroll-forensics/01-notebook-navigator-scroll-mechanisms|Notebook Navigator Scroll Mechanisms]]"
created: 2026-05-16T00:00:00
updated: 2026-05-16T00:00:00
tags:
  - agent/spec
  - explorer/performance
  - notebook-navigator
---

# Virtualizer And Scroll Orchestration

## 1. Virtualizer Contract

Notebook Navigator uses `@tanstack/react-virtual` `^3.13.24`. Vaultman uses
`@tanstack/svelte-virtual` `3.13.24`, so the engine family is aligned. The
difference is the surrounding contract.

Notebook Navigator list pane:

- `useListPaneScroll.ts` constructs one `useVirtualizer`.
- `count` is `listItems.length`.
- `getItemKey` is stable through `getListItemKey`.
- `getScrollElement` returns `scrollContainerRef.current`.
- `overscan` is the shared `OVERSCAN` constant, currently `10`.
- `useScrollendEvent: true` is enabled.
- `scrollMargin`, `scrollPaddingStart`, and `scrollPaddingEnd` are explicitly
  wired so scroll math accounts for overlay chrome.

Notebook Navigator navigation pane:

- `useNavigationPaneScroll.ts` constructs one `useVirtualizer`.
- `count` is `items.length`.
- `getItemKey` is stable from item keys.
- `estimateSize` is fixed for nav row types and spacer types.
- `overscan` is also `OVERSCAN`, currently `10`.

The rendered DOM shape is stable:

- The virtual container gets `height: rowVirtualizer.getTotalSize()`.
- Rows are absolutely positioned.
- List rows set `top: virtualItem.start` and `--item-height`.
- Navigation rows use `transform: translateY(...)`.
- Rendering iterates `rowVirtualizer.getVirtualItems()`.

Critical point: `ListPaneVirtualContent.tsx` does not contain a fallback that
renders all `listItems` if `getVirtualItems()` is empty. If virtual items are
empty, only empty virtual content renders. The recovery strategy is to keep the
virtualizer ready and measured, not to devirtualize.

## 2. Scroll Readiness Gate

Notebook Navigator refuses to execute scroll commands until the scroll container
is visible and has non-zero dimensions.

List pane:

- `scrollContainerRefCallback` stores the scroller element.
- A `ResizeObserver` checks `getBoundingClientRect()`.
- `containerVisible` is true only when width and height are both positive.
- `isScrollContainerReady` combines `isVisible` and `containerVisible`.
- Pending scroll processing returns early unless the container is ready.

Navigation pane:

- The same readiness concept exists in `useNavigationPaneScroll.ts`.
- This prevents TanStack calls while the pane is hidden or has a zero-sized
  parent.

This matters for blank-list failures: a scroll call issued against a zero-sized
or stale virtualizer can produce no virtual rows for a visible frame. Notebook
Navigator treats readiness as a precondition for executing the scroll.

## 3. Path-To-Index Maps And Version Gates

Notebook Navigator stores an intent to reveal a path, then resolves the path to
an index at execution time.

List pane:

- `filePathToIndex` maps file paths to current row indices.
- `areFilePathIndexMapsEqual` prevents version churn when a new `Map` object has
  the same contents.
- `indexVersionRef` increments only when effective mapping changes.
- `pendingScrollRef` can carry `minIndexVersion`.
- Pending scrolls wait until `indexVersionRef.current >= minIndexVersion`.

Navigation pane:

- `pathToIndex` maps normalized folder/tag/property paths to indices.
- `areNavigationPathIndexMapsEqual` keeps `indexVersion` tied to content changes,
  not object identity.
- `measurementSignature` detects row layout changes that require `measure()`
  without necessarily incrementing the path map version.

The core trick is late binding: "selected path X" is resolved into "current
index Y" only after the list/tree rebuild that makes Y meaningful.

## 4. Intent Queue Instead Of Raw Effects

Notebook Navigator has a central pending-scroll executor.

List pane pending request types:

- `file`
- `top`

List pane reasons:

- `folder-navigation`
- `visibility-change`
- `reveal`
- `list-structure-change`

`rankListPending()` prioritizes requests:

- top: 0
- list-structure-change: 1
- visibility-change: 2
- folder-navigation: 3
- reveal: 4

Higher-priority pending requests replace lower-priority ones. This coalesces
rapid scroll causes instead of executing every intermediate request.

Navigation pane intents:

- `selection`
- `startup`
- `reveal`
- `visibilityToggle`
- `external`
- `mobile-visibility`

During hidden-item visibility toggles, Notebook Navigator explicitly gates stale
selection scrolls and allows only the visibility-toggle intent to execute with
the next tree version. That prevents "right path, wrong old index" jumps.

## 5. Alignment And Smooth Scroll Policy

Notebook Navigator mostly uses `behavior: auto` through TanStack. It does not
animate large Explorer jumps.

List alignment:

- `folder-navigation`: `center` on mobile, `auto` on desktop.
- `visibility-change`: `auto`.
- `list-structure-change`: `auto`.
- `reveal`: `auto`.

Navigation alignment:

- `selection`: `center` on mobile, `auto` on desktop.
- visibility/mobile/reveal/external: `auto`.
- default: `center`.

The only smooth path found is a mobile header "scroll to top" tap. That path is
not used for large list/tree jumps.

## 6. Safe Post-Adjustment

After `scrollToIndex`, Notebook Navigator performs a tiny safety adjustment:

- call `rowVirtualizer.scrollToIndex(index, { align })`;
- schedule `ensureIndexNotCovered(index)` for up to three animation frames;
- adjust `scrollTop` only if sticky headers or bottom padding cover the row.

This is not stepping through intermediate rows. It is a bounded overlay
correction for the final target.

