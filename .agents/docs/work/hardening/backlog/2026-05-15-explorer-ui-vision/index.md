---
title: Explorer UI vision — captured future directions
type: backlog-index
status: draft
parent: "[[docs/work/hardening/index|hardening]]"
created: 2026-05-15T00:00:00
updated: 2026-05-15T00:00:00
tags:
  - agent/backlog
  - initiative/hardening
  - explorer/views
  - explorer/ux
---

# Explorer UI Vision — Captured Future Directions

This doc captures four UX-architecture directions surfaced during the
0-H brainstorm (`docs/work/hardening/specs/2026-05-15-explorer-0-h-virtualizer-list-mode/index`)
that are out of 0-H's scope but worth keeping alive as separate spec
candidates. Each was raised after the 0-H design was largely settled;
this doc's purpose is to prevent the ideas from vanishing now that
they are not 0-H's problem.

Each item below is a candidate for its own spec → plan → impl cycle.
None blocks 0-H or its successor specs (0-B, 0-A). All four are
ordered roughly by independence and cross-cutting reach — the unified
input system is the most cross-cutting; the others are more localized.

## 1. Unified input-configuration system

**The idea.** Every interactive surface in Vaultman — panels,
overlays, in-editor surfaces, eventually mobile touch surfaces —
should share a single input-command vocabulary. Each command
(activate row, toggle selection, open context menu, open quick search,
etc.) binds to one or more input gestures across keyboard / mouse /
touch with modifier variations (ctrl, alt, shift, middle-mouse-button,
double-press, two-finger and three-finger tap, press-and-hold). The
bindings are configurable from a dedicated page-tools tab — a
video-game-style "Controls" panel where the user remaps any command
to any input.

**Why it surfaced.** During the 0-H API design, the `SelectModifiers`
interface (`ctrl` / `shift` / `alt`) emerged as a tiny slice of a
much broader concern. Every keyboard event in Explorer eventually
needs modifier handling; same for clicks; same for touch when mobile
support matures. Today the handling is scattered, hardcoded, and
inconsistent across surfaces.

**Why a separate spec.** Affects every interactive surface, not just
Explorer. Needs its own input-event abstraction, command registry,
settings UI, persistence layer. Cross-cutting and large.

**Prior art and pointers.**

- `SelectModifiers` in 0-H's `ViewNodeList` API
  (`docs/work/hardening/specs/2026-05-15-explorer-0-h-virtualizer-list-mode/03-api-contract`)
  is the first small step toward a unified input model.
- `serviceMouse`, `serviceNativeClickIntercept`,
  `serviceNativeSurfaceBinding` are current input-handling services
  that would need to be unified under the new abstraction.
- Likely structure: a `serviceInputBindings` defining commands,
  defaults, and user overrides; per-surface adapters reading from
  it; a settings panel for user customization; persistence in
  plugin settings.

**Build-order suggestion.** After Phase 0 (0-H / 0-B / 0-A) lands.
The view-host abstraction from 0-A is a natural integration point
because it formalizes the seam between surface and orchestration —
where input commands would naturally plug in.

## 2. Queue data-model restructure

**The idea.** Today's queue ops UI renders as a flat list of
operation rows. The vision is a structured node hierarchy:

- **Kind-group nodes** at the top, grouping operations by kind
  (Edit, Remove, Move, etc.). Enter on a group node executes only
  that group, not the whole queue.
- **Action-parent nodes** under each kind, one per operation. Each
  shows a file counter, label, and summary. Enter executes only
  that action.
- **Affected-file leaf nodes** under each action, one per file the
  action will touch. Each shows the file's title, the line range
  affected, and 1–2 lines of green / red diff preview around the
  change. Enter opens the file diff — and this is where the
  in-editor diff-preview "accept-changes" mode (item 3) shines.

**Why it surfaced.** During 0-H, the queue-specific row handling
inside `viewList.svelte` (the `is-queue-child` class, the
`is-counter-slot` action region, the `'remove'` inline-cancel
special-case) was identified as a leaky abstraction; the deeper
question the user raised is whether the queue's data model itself
is right. The "beta.15 node elements" referenced by the user is a
prior implementation to compare against during this redesign.

**Why a separate spec.** Touches `serviceQueue.svelte.ts`,
`serviceQueuePresentation.ts`, `serviceOpsLog`, the queue row
builder, and the queue surface (`explorerQueue.svelte`). It is a
queue redesign, not a list-renderer redesign.

**Prior art and pointers.**

- The follow-up task "Decouple queue knowledge from ViewNodeList"
  spawned during 0-H is a small piece of this — it removes
  `ViewNodeList`'s queue-specific knowledge but does not restructure
  the queue itself. It is a prerequisite cleanup but not the
  redesign.
- "Beta.15 node elements" — locate in git history (likely around a
  `beta.15` tag or in archived design docs under
  `.agents/docs/archive/`). Used as a reference comparison point
  for the proposed restructure.
- `serviceQueuePresentation.ts` and `serviceQueue.svelte.ts` are
  the current data-model surfaces.
- The "accept-changes" UX (item 3) is the in-editor counterpart to
  the affected-file leaf-node interaction.

**Build-order suggestion.** Any time after 0-H. Independent of 0-B
and 0-A. May want to land after the in-editor renderer fast-follow
sub-phase if the diff-preview UX (item 3) is tightly coupled.

## 3. In-editor diff-preview "accept-changes" mode

**The idea.** When an operation in the queue affects a file, the user
can open an in-editor view that previews the diff chunk-by-chunk with
explicit per-chunk approve / reject controls — analogous to
VS Code's agentic-edit acceptance flow. The user approves changes
in context with full editor highlighting, file navigation, undo, and
keyboard-driven flow.

**Why it surfaced.** The queue data-model restructure (item 2)
proposes that the leaf-level "affected file" node, when activated,
opens a diff preview. The natural place to render that diff is
in-editor, not in a separate panel — which positions this idea
squarely within the **in-editor renderer fast-follow sub-phase**
that the 1-foundation brainstorm decision already deferred.

**Why a separate spec.** In-editor rendering is its own initiative.
The 1-foundation brainstorm decision was: sub-system 0-A makes the
native-DOM contract in-editor-complete and the view components
context-agnostic; the actual in-editor renderers come in a
fast-follow sub-phase. This idea is one of the headline UX
scenarios for that initiative.

**Prior art and pointers.**

- `viewDiff.svelte` and `serviceDiff.ts` — current diff rendering
  surfaces on `claude/explorer`.
- `serviceDiffSnapshot.ts` — diff snapshot machinery.
- VS Code's "agentic edit" acceptance flow as a UX reference (no
  shared code, just interaction patterns).
- The in-editor renderer fast-follow sub-phase (to-be-named) is the
  parent initiative; this idea belongs in its spec as a primary
  scenario.

**Build-order suggestion.** Part of the in-editor renderer
fast-follow sub-phase, after Phase 0 lands and after 0-A's
context-agnostic view-host extraction.

## 4. Bases-parity filter logical switching

**The idea.** Every filter row in `explorerActiveFilters` should
expose its logical operators directly as switchable controls inside
the row (AND / OR / NOT groupings, comparison operator selection,
value negation, value editor, etc.). This brings Vaultman's filter
UI to parity with Bases's filter-expression UI.

**Why it surfaced.** During 0-H, the active-filter row uses
`viewList.svelte` to render. The current row shows the filter
description as static text. The vision is to make the filter
operators themselves interactive switches inside the row, so the
user can refine filters without leaving the active-filters surface.

**Why a separate spec.** Belongs to sub-system I (Bases interop
depth) from the worldview research. Touches the filter expression
IR, the filter row builder, and the filter row interaction model.
Not a list-renderer change — the renderer is fine; what changes
is what the row contains.

**Prior art and pointers.**

- Sub-system I per the worldview research
  (`docs/work/hardening/research/2026-05-14-explorer-libraries-and-parity-research/index`).
- `serviceFilter.svelte.ts`, `serviceActiveFilterPresentation.ts`,
  `serviceBasesInterop.ts` — current filter / Bases services.
- `explorerActiveFilters.svelte` — current filter row surface (one
  of `ViewNodeList`'s two widget consumers post-0-H).
- Bases's own filter expression IR — referenced in the worldview
  research §3 (parity matrix entry for `explorerBasesImport`).

**Build-order suggestion.** Part of sub-system I's eventual spec.
Independent of Phase 0 timing.

## Related touchpoints

These directions intersect existing in-flight work:

- The follow-up task "Decouple queue knowledge from ViewNodeList"
  (spawned during 0-H) is a prerequisite cleanup for item 2.
- The Phase 0 native-DOM parity contract (0-A) is a prerequisite for
  the in-editor renderer fast-follow sub-phase that item 3 lives
  inside.
- The unified input-configuration system (item 1) is the natural
  successor to 0-H's `SelectModifiers` slice; `SelectModifiers`
  should evolve cleanly into a command from item 1's command
  registry.

## How this doc gets used

- When any of these four becomes a real initiative, it gets its own
  spec folder under `.agents/docs/work/hardening/specs/`. This doc
  links there from the new spec's background / context, and is
  superseded for that scope.
- Until then, this doc is the canonical record that these directions
  are intentional, not forgotten, and have their place in the build
  order.
- Add to this doc as new out-of-scope ideas surface during Phase 0
  brainstorms or follow-on work. The four items above are not
  exhaustive — they are what surfaced through 0-H specifically.
