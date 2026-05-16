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

## 5. Settings UI refresh

**The idea.** Replace the deleted legacy theme controls in `SettingsUI.svelte`
(`layoutTheme` dropdown, glass blur slider, island backdrop toggle — removed in
0-B) with a new preset selector listing `themeService.availablePresets`.
Built-in presets render with read-only badges. Custom presets get edit and
delete affordances (basic — full editor lives in item 10).

**Why it surfaced.** During the 0-B brainstorm. 0-B is a clean break that
removes the three legacy controls without shipping a replacement. Users
switch presets by editing `data.json` until this lands.

**Why a separate spec.** UI is decoupled from the service. The service
contract is stable in 0-B; the selector is a thin Settings consumer.

**Prior art and pointers.**

- `themeService.availablePresets` and `themeService.setPreset(id)` are the
  consumer-facing API (see 0-B spec shard 03).
- `src/components/settings/SettingsUI.svelte` is where the UI lives today.
- Bits-ui `Select.Root` / `Tabs.Root` primitives may be relevant.

**Build-order suggestion.** Soon after 0-B. Restores user-facing preset
switching without requiring data.json editing.

## 6. Layout extension — modal-as-tab + status-bar-island

**The idea.** Extend `serviceLayout.ts` to wire `preset.dock.*` and
`preset.tabs.*` against `frameVaultman.svelte`, hiding/showing surfaces per
preset. Add two new tab surfaces: `'modal'` (floating modal that hosts a
tab's content) and `'status-bar-island'` (a tab that lives in the Obsidian
status bar as an island).

**Why it surfaced.** 0-B declares `preset.dock.visible`, `preset.dock.presentation`,
`preset.tabs.visible`, `preset.tabs.presentation`, `preset.tabs.kind` but
does not wire consumers. The native preset needs dock/tabs hidden for true
chameleon disguise. The user also envisions tabs losing their explicit
semantic and becoming generic component groupings with multiple display modes.

**Why a separate spec.** Cross-cutting layout work. Best done after
Sub-system O (frameVaultman decomposition) so consumption hooks into focused
shell components rather than the god component.

**Prior art and pointers.**

- `src/services/serviceLayout.ts` already defines `LayoutTabSurface =
  'dock' | 'top-tabs' | 'workspace'`. Extend the union with `'modal'` and
  `'status-bar-island'`.
- `NavbarDock.svelte`, `NavbarTabs.svelte` consume layout settings today.
- `LayoutDropAction` already routes drops between surfaces — extend.

**Build-order suggestion.** After Sub-system O + 0-A. Cleanest if the
frame is decomposed first so the new visibility logic lives in focused
shell components.

## 7. Toolbar contract

**The idea.** Define what `preset.toolbar.buttons: 'core' | 'full' | string[]`
means concretely. Build a toolbar-button registry mapping button ids to
icon, label, command, surface (which tabs/contexts show it). The preset
filters via its `toolbar.buttons` value.

**Why it surfaced.** 0-B declares the field but leaves "what is core?" /
"what is full?" undefined.

**Why a separate spec.** Touches several toolbar consumer components and
needs an explicit registry source-of-truth.

**Prior art and pointers.**

- `frameVaultman.svelte` and `pageTools.svelte` render toolbar buttons
  today, mostly inline.
- Existing button shortcuts: `vm-btn-primary`, `vm-btn-squircle` (UnoCSS).

**Build-order suggestion.** After Sub-system O. Independent of 0-A.

## 8. Color governance — zebra rows, rainbow nodes, accent overrides

**The idea.** A registry of opt-in color knobs (`zebraRows`,
`rainbowNodes`, `accentOverride`, plus free-form custom var overrides).
UI provides toggles + HSV/RGB color picker. Output is a generated
snippet `.css` file written to `.obsidian/snippets/`. The user can also
export the snippet to share with the community.

**Why it surfaced.** 0-B explicitly excludes color from the theme preset
shape — colors stay Obsidian-delegated. But the user wants knobs for
specific color effects that the theme system itself cannot govern.

**Why a separate spec.** The knob set, UI flow, snippet generation, and
storage model are all parallel to the theme preset machinery.

**Prior art and pointers.**

- 0-B's `preset.colors?` field on `ThemePreset` is the declare-only seam.
- `bits-ui` has no native color picker; needs external lib
  (`svelte-awesome-color-picker` or roll own with HSV canvas + sliders).
- Obsidian's `.obsidian/snippets/` directory is the output target.

**Build-order suggestion.** Independent of Phase 0. Can run in parallel.

## 9. Snippet provider UX

**The idea.** Enrich the `explorerSnippets` provider so each snippet
row becomes an expandable node. Child nodes represent the CSS classes
the snippet touches, with per-class on/off toggle and a per-CSS-var
color picker widget. The result exports as a derived snippet.

**Why it surfaced.** 0-B brainstorm noted that `viewTree` over the
snippets provider currently shows flat nodes. The provider can do more.

**Why a separate spec.** Provider-side enrichment (parse CSS, extract
classes/vars, expose hierarchy) is independent of the theme system.

**Prior art and pointers.**

- `src/services/serviceExplorerSnippets.svelte.ts` (existing).
- `viewTree.svelte` already renders this provider.

**Build-order suggestion.** Independent of Phase 0.

## 10. Theme Builder UI (editor for custom presets)

**The idea.** Full visual editor for creating and editing custom
presets:

- duplicate from a built-in template;
- field-by-field edit (toggle each `nodeElements`, pick `dock.presentation`
  variant, etc.);
- DnD layout placement (`preset.layout?` with modes `'fixed' | 'squared-grid'
  | 'free-drag'`);
- optional binding to a workspace via `preset.workspaceId?`;
- preview pane;
- export/import.

**Why it surfaced.** 0-B brainstorm.

**Why a separate spec.** Large UI work. Touches many primitives.

**Prior art and pointers.**

- 0-B's `preset.layout?` field on `ThemePreset` is the declare-only seam.
- Sub-system 5 (Settings UI refresh) provides the entry point.
- DnD library is `@dnd-kit/svelte`.

**Build-order suggestion.** After Sub-system 5 + Sub-system 6 (Layout
extension) so the editor edits values that the runtime actually consumes.

## 11. Workspaces provider — `explorerWorkspaces`

**The idea.** Build `explorerWorkspaces` as a Vaultman `ExplorerProvider`
exposing Obsidian's core Workspaces internal plugin. Nodes are saved
workspace layouts; user can rename, tag, attach node-notes + media, search,
bulk-edit. 2:1 ambition over core Workspaces, which is read/load-only.

**Why it surfaced.** 0-B brainstorm — user asked if Obsidian Workspaces
could be a provider.

**Why a separate spec.** Provider build follows the standard pattern
(`explorerTags`, `explorerSnippets`, etc.).

**Prior art and pointers.**

- `internalPlugins.plugins['workspaces']` exposes
  `instance.saveLayout(name)` / `loadLayout(name)` / `layouts`.
- `typeObsidian.ts` `getInternalPlugin<T>()` wrapper is in place.
- 0-B's `preset.workspaceId?` is the declare-only seam for
  preset-triggers-workspace-load behavior (lives in this sub-system or
  the Theme Builder).

**Build-order suggestion.** Independent of Phase 0. Aligns naturally
with Sub-system 10 (Theme Builder).

## 12. Bits-ui adoption preset

**The idea.** Ship a built-in custom preset (or a separate preset
registry track) that swaps VM-internal components for bits-ui
equivalents — `Popover.Root`, `Dialog.Root`, `Combobox.Root`,
`Tooltip.Root`, etc. Coexists with the existing `vaultman` preset.

**Why it surfaced.** 0-B brainstorm — user wants to use more bits-ui
components without deleting current implementations.

**Why a separate spec.** Component-by-component adoption with parity
testing.

**Prior art and pointers.**

- `bits-ui` v2.18.1 already in deps; `vmPopover` and `vmDialog` are
  partial adoptions.
- `frontend-design` skill principles apply for visual parity.

**Build-order suggestion.** Independent. Can run in parallel.

## ~~M — SCSS hygiene pass~~ (DROPPED)

Dropped mid-brainstorm during the UnoCSS pivot. With Sub-system N
migrating ~90% of SCSS to UnoCSS, the hygiene work is achieved
naturally — what migrates leaves SCSS, what stays gets cleaned as
part of N's residual audit at completion. No standalone spec.

## N — SCSS-to-UnoCSS migration (HIGH PRIORITY)

**The idea.** Invert the styling-source center of mass. Migrate the
~7934 LOC across 40 SCSS files to UnoCSS shortcuts and utility
classes. Target ~90% UnoCSS, ~10% SCSS reserved for complex functions
(color-mix patterns, deep cascades with multiple selectors, mixins
that don't translate cleanly to utilities).

**Why it surfaced.** User decided mid-brainstorm during the 0-B spec
authoring that UnoCSS should expand, not contract. Original "Sub-system N
— UnoCSS removal" entry inverted to "SCSS-to-UnoCSS migration."

**Why a separate spec.** Cross-cutting, large initiative. Audit +
categorize + translate + delete patterns must be staged carefully to
keep visual equivalence and avoid breaking community theme/snippet
expectations.

**Scope.**

- Audit all 40 SCSS files. Categorize each rule:
  - (a) translatable to existing UnoCSS utilities (preset-wind3
    coverage),
  - (b) translatable to a new UnoCSS shortcut,
  - (c) must stay SCSS (complex function),
  - (d) dead — delete.
- For (a) + (b): rewrite consumers in `.svelte` files to apply
  UnoCSS classes inline; delete corresponding SCSS rules.
- For (c): keep in SCSS, document in code comments why translation
  is not viable.
- For (d): delete; verify no consumer remains.
- Output: `src/styles/` shrinks to ~10% of original size. New
  shortcuts emerge in `uno.config.ts`. Consumers apply utilities +
  shortcuts via `class="..."` in `.svelte` files.

**Why high priority.**

- 0-B already adopts `unocss-preset-theme` for theme tokens. N
  completes the alignment for the rest of the styling surface.
- Bits-ui adoption preset (item 12) benefits from UnoCSS-first
  composition. N is the recommended prerequisite for item 12.
- Sub-system O (frameVaultman decomposition) is recommended before
  N because N will touch many of the same files; sequencing avoids
  double-touch churn. Recommended order:
  `0-B → O → 0-A → N → 12`.

**Prior art and pointers.**

- 0-B's `uno.config.ts` already gains a `presetTheme()` config — N
  preserves that, adds many more shortcuts.
- Existing UnoCSS shortcuts (`vm-btn-primary`, `vm-btn-squircle`,
  `vm-card`, `obsidian-mimic-*`) are the seed pattern; N expands
  this set substantially.
- Icon utility spans (`i-lucide-*`) already work via UnoCSS
  `presetIcons` — N may convert remaining inline `setIcon()` calls
  to declarative `class="i-..."` where appropriate (or keep
  `setIcon()` for cases where dynamic icon-name binding is needed).
- `_tokens.scss` SCSS variables that map to Obsidian CSS vars
  (`$vm-bg-primary: var(--background-primary)` etc.) should likely
  be removed; consumers reference `var(--background-primary)`
  directly via UnoCSS bracket syntax (`bg-[var(--background-primary)]`).

**Build-order suggestion.** HIGH PRIORITY after `0-B → O → 0-A`. Run
before Sub-system 12 (Bits-ui adoption). Multi-day initiative — do
not execute ad-hoc; brainstorm + spec + plan in its own cycle.

## O — frameVaultman decomposition

**The idea.** Split `src/components/frame/frameVaultman.svelte` (867
LOC, ~13 mixed responsibilities — theme focus tracking, page
navigation, dashboard viewport, FAB resolution, stats counters, action
handlers, bases import mode, filter state, FnR state, render
orchestration for 8+ components) into focused modules:

- `serviceFrameNavigation.svelte.ts` — page order, active page, reorder.
- `serviceFrameStats.svelte.ts` — selected/queued/filter counts.
- `frame/FrameNavbarShell.svelte` — wraps `NavbarDock` + `NavbarTabs` and
  reads `preset.dock` / `preset.tabs` (Sub-system 6).
- `frame/FrameDashboardShell.svelte` — `Dashboard3Column` wrap + viewport
  measurement.
- `frame/FrameActionsBar.svelte` — FAB + stats actions.
- `frameVaultman.svelte` reduced to top-level orchestration + slot wiring.

**Why it surfaced.** User asked during 0-B brainstorm whether frameVaultman
should be the consumer of `preset.dock` / `preset.tabs`. Audit showed
the file is already a god component; adding more preset consumption
would worsen the problem.

**Why a separate spec.** Substantial refactor. Visual-equivalent
verification required.

**Build-order suggestion.** **After 0-B, before Sub-system 6 + 7.** Order
matters: decompose first, then have the layout extension and toolbar
contract consume from focused shells instead of from the god component.

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
