---
title: Paint Tests And Takeaways
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

# Paint Tests And Takeaways

## 1. Scroll-State UI Suppression

Notebook Navigator listens to TanStack's `instance.isScrolling` through
`onChange` and `useScrollendEvent: true`.

`ListPane` uses this to:

- set `isListScrolling`;
- clear hovered file path while scrolling;
- skip hover-path resync while scrolling;
- pass `suppressRowHover` to virtual content.

`ListPaneVirtualContent` uses `suppressRowHover` only to suppress the quick
actions panel:

- `showQuickActionsPanel={!suppressRowHover && hoveredFilePath === path}`.

It does not remove file title, date, preview, tags, thumbnails, or selection
state from the row while scrolling.

## 2. Paint And Layout Isolation

Notebook Navigator CSS contains several scroll-relevant details:

- `.nn-list-pane-scroller` has an opaque background. The comment says this is
  for GPU scroll layer optimization.
- `.nn-navigation-pane` and `.nn-list-pane` use `contain: layout style`.
- `.nn-navitem` uses fixed height and `contain: layout style`.
- `.nn-virtual-file-item` has `height: var(--item-height)` and `contain: layout
  style`.
- `.nn-file` also has `contain: layout style`.
- On iOS, `.notebook-navigator-ios .nn-list-pane .nn-virtual-item` gets
  `transform: translateZ(0)` as a WebKit repaint workaround for blank rows after
  preview/image updates.

No `content-visibility` mechanism was found in the read paths. NN's strategy is
absolute-positioned bounded DOM, containment, and stable height math.

## 3. What NN Tests And What It Does Not Test

Notebook Navigator has tests for:

- height-affecting content-change detection;
- list measurement helpers;
- CSS/measurement synchronization;
- feature-image blob/cache behavior;
- content provider behavior.

The local Notebook Navigator tests inspected do not appear to include a direct
"50k repeated scroll jump in real Obsidian" test. The original tests are useful
for transplanting invariants, but Vaultman still needs its own live plugin-dev
scroll repro because the current bug is a real scroll/render starvation symptom,
not just a pure builder timing problem.

## 4. Takeaways For Vaultman

Transplant the invariants, not just constants:

- `OVERSCAN = 10` is not the trick by itself.
- `behavior: auto` is necessary but not sufficient.
- bounded rendering is mandatory in every mode.
- media can exist in rows only if row sizing does not wait for media decode.
- scroll commands need an intent queue and revision gate.
- live blank-frame detection is required because CPU-only bridge tests can pass
  while the viewport still goes blank.

