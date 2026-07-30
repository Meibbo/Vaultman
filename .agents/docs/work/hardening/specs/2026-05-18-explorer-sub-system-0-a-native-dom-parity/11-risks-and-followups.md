---
title: 11 — Risks and follow-ups
type: spec-shard
parent: "[[2026-05-18-explorer-sub-system-0-a-native-dom-parity/index]]"
---

# 11 — Risks and follow-ups

## Risks (could derail 0-A if unwatched)

### R1 — C5 panelExplorer extraction regression

ViewHost mounting changes bindable `viewMode` flow; existing reactive reads in panelExplorer (empty-state detection, `gridHierarchyMode`, scroll-target tracking, snapshot revision subscriptions) could break if any of them was implicitly dependent on the inline switch's mount timing.

**Mitigation**: DOM snapshot baseline diff'd against post-C5 output (test added in C5 commit). Live `plugin-dev` cycle test through all view modes. Audit the bindable two-way sync in particular — if panelExplorer mutates `viewMode` from an internal `$effect`, document and confirm it does not collide with ViewHost's prune effect.

### R2 — C8 native-class adoption visual regression on table/cards

Today table/cards emit `.nav-file` + `.nav-file-title` on row roots and primary labels. C8 changes these to `.bases-tr` / `.bases-cards-item` etc. Obsidian theme CSS that previously styled `.nav-file` on table/grid/cards rows will no longer apply.

**Mitigation**: Visual smoke on `plugin-dev` per preset. Audit existing `vm-*` SCSS rules to ensure they provide the baseline styling; if a previously-relied-on Obsidian theme rule was filling a gap (e.g., padding, hover state), add equivalent `vm-*` rule. CSS guards anchored in `.vm-*` selectors so they take precedence when needed.

### R3 — C9 DnD class swap visual regression

`vm-drag-source` → `is-being-dragged` and `vm-drop-target` → `is-being-dragged-over` may show different drag styling (Obsidian's accent background vs Vaultman's current vm style).
Aesthetic difference, not behavior.

**Mitigation**: Manual DnD test in cards/grid/tree views per preset. Snapshot per preset captures the class strings.

### R4 — C12 flicker root cause is non-trivial

User confirmed during brainstorm that the prior "vm > Notebook Navigator > native file-explorer" scroll parity mission did not fully succeed. The flicker symptom could touch the scroll-idle defer pass (R-protected, was a major repair documented in [[docs/work/hardening/plans/2026-05-16-explorer-variable-scroll-repair/index|Explorer variable scroll repair]]).

**Mitigation**: C12 begins with systematic-debugging:
reproduce → locate → diagnose, before any patch is proposed.
Candidate root-cause modules to inspect first:

- `src/services/serviceExplorerScrollGeometry.ts` (coordinator of scroll-idle defer)
- `src/services/serviceNodeRowMeasure.ts` (measurement deferral)
- `src/services/serviceNodeRowStyle.ts` (style application gate)
- ViewNodeTable / Grid scroll-idle guardrails added during the 2026-05-16 repair

If the defer pass IS the cause, escalate to user before patching — the defer pass is a recent stability investment that should not be regressed casually. Possible alternatives:
keep deferral but ensure children render at row mount even mid-scroll (i.e., the row CONTAINER appears WITH children, not without).

### R5 — Bases vocab drift

Obsidian could rename `.bases-cards-item` / `.bases-tr` / `.bases-cards-cover` in future minor versions. Bases is a relatively new core plugin; vocab stability is less proven than `.nav-file` / `.tree-item-self`.

**Mitigation**: Vocab data lives in single contract literals file (`serviceExplorerViewContract.ts`). One file edit per drift. Live smoke catches breakage on minor-version bumps.
Future Sub-system "Provider Extensibility" can replace literal strings with API consumption against Obsidian's view registry if/when such an API exists.

### R6 — Context API timing

Typed Symbol keys + `getContext` require `setContext` to run BEFORE descendant component mount. If ViewHost's top-level `<script>` ordering is wrong, view components may getContext `undefined` and crash.

**Mitigation**: `setContext` calls live at top of ViewHost `<script>` block, before any imports or initializations that could yield. Tests assert `getContext(VIEW_HOST_KEY)` and the other two keys return defined values from child mount.

### R7 — Rename misses callsite in 0-B downstream docs

The rename `btnMultiSelection` → `btnNodeElementsVisibility` is a systematic find-and-replace, but stray references in `.agents/docs/` (especially in 0-B's spec folder) might survive if the grep does not cover every nested shard.

**Mitigation**: C7 commit includes a grep audit:

```
grep -rn 'btnMultiSelection' src/ test/ .agents/docs/
```

For each hit, rename in place. If a historical doc references the old name as archeological context (e.g., in a "renamed in 0-A" annotation), preserve the annotation but flag the doc as post-rename.

### R8 — In-editor seam vocab spec rots before fast-follow renderer is built

Shard 08 is locked vocab today. If the fast-follow renderer takes months to ship and Obsidian's class strings drift, the shard's vocab may be stale by the time it is consumed.

**Mitigation**: Mark shard 08 with `assumes-renderer-build-by:`
date or sub-system reference. Re-validate against `obsidian-web-lab` before renderer impl starts. If renderer shifts the architecture (e.g., chooses a different mount strategy), update shard 08 in that sub-system's commits.

## Follow-ups (parking lot for carved-out work)

### Tag: `per-preset-viewmode-memory`

Remember the last `viewMode` per preset id across panel lifetime. Today, switching preset from vaultman (cards) → native (tree) → vaultman loses the cards selection — viewMode falls to `selectableModes[0]`.

- Owner: Theme Builder sub-system (preferred) or a settings layer.
- Effort: ~50 LOC delta on the viewHost service or a parallel preference store.
- Trigger: when Theme Builder lands, or sooner if user feedback requests it.

### Tag: `action-routing-contract`

A future contract that distributes `ExplorerRowInput.actions` across the six input methods: cmenu, hover-badge, toolbar, keyboard, modifier. Theme Builder consumes both `NodeElementMask` (visibility) and Action Routing (interaction location) to construct presets.

- Owner: New sub-system, name TBD.
- Pre-reads: EDP-009 `ExplorerRowInput.actions` shape, current hover badge implementation, current cmenu wiring, current toolbar primitive ordering map.
- Note: `NodeElementMask.actions=false` already hides ALL action appearances. The future contract gates routing per-action when `mask.actions=true`.

### Tag: `provider-extensibility`

Decision matrix for Bases parity:

1. **Hack DOMs**: inject into core-rendered Bases DOM — rejected (fragile, breaks on Obsidian patches).
2. **Copy code**: duplicate Bases source — rejected (loses upstream updates).
3. **Consume public API**: Vaultman registers views via `app.viewRegistry`, consumes Bases data plane API — recommended if Obsidian exposes the right API.
4. **Two-mode coexistence**: replacement mode (user disables core Bases) + overlay mode (both active) — evaluate in own sub-system; requires hyper-strict contract.

The contract this spec defines already supports view registration extensibility — `CONTRACTS` in `serviceExplorerViewContract.ts` is a registry that can grow.
Third-party plugin views register their own `ExplorerViewFeatureContract` entry.

- Owner: New sub-system, brainstorm post-0-A.
- Pre-reads: Obsidian `app.viewRegistry` API surface, Bases data plane public exports, existing third-party view plugins for prior art.

### Tag: `polished-rewrite-pending`

User has a near-complete rewrite of the Polished preset (React + CSS source files) covering FAB drawer dock variants, FnR with its own filters island, toolbar rework, multiple function add/remove/replace decisions. Touches Sub-systems 6 (Layout extension), 7 (Toolbar contract), 12 (bits-ui adoption), Theme Builder, J (service-unload), serviceGroups.

- Owner: Dedicated brainstorm session post-0-A merge.
- Pre-reads: user uploads source files to `.agents/docs/work/draft/polished-preset-rewrite-source/`, agent analyzes and distributes pieces into roadmap entries.
- Note: requires Obsidian-grill-with-docs consultation per user; some sketched features may need cross-check against existing Vaultman behavior.

### Tag: `outline-view-future`

Adopting an outline view in `EXPLORER_PLATFORM_VIEW_MODES` (could be inspired by Bases' future outline view or by core Obsidian Outline tab pattern documented in shard 08). 0-A's contract literal accepts a sixth viewMode without disruption once that view component exists.

- Owner: New sub-system when prioritized.
- Note: the in-editor seam (shard 08) already captures the Outline tab DnD pattern as inspiration; this follow-up is about a panel-rendered outline view, not the Outline tab itself.

### Tag: `0-A.S-adversarial-scroll`

Sub-system 0-A.S — Adversarial Scroll Harness + 3-Plugin Sequential Perf Comparison.

Scope outline:

- Replace jump-based probe with real-scroll synthetic events (synthetic wheel + drag, via CDP / Playwright / Puppeteer or equivalent).
- Patterns: P1 single-pace ramp (1-by-1 to 1000-by-1000), P2 forward-with-backstep (2-1, 3-2, …, 10-9), P3 squared forward (back N, forward N²), P4 drag-overshoot (drag mouse rapidly, measure scroll lag), P5 cursor-drag-stutter (held mouseDown + erratic motion).
- 3-plugin matrix: Vaultman (5 views) × Notebook Navigator × core file-explorer = 7 surfaces × 5 patterns.
- Metrics: frameDrops, longTask>100ms, longTask>250ms, render-after-scroll latency (target <16ms = NN parity), maxBlank, jank score.
- Dashboard output: comparable timeseries per surface per pattern.

- Owner: Own brainstorm + spec + plan post-0-A.
- Pre-reads:
  - [[docs/work/hardening/plans/2026-05-15-explorer-view-platform-pass/perf-baseline|Explorer View Platform perf baseline]]
  - [[docs/work/hardening/plans/2026-05-15-explorer-view-platform-pass/07-performance-comparison-repair|Explorer platform performance comparison repair]]
  - [[docs/work/hardening/specs/2026-05-16-notebook-navigator-scroll-forensics/index|Notebook Navigator scroll forensics]]
  - [[docs/work/hardening/research/2026-05-16-multiview-virtualization-research/index|Multiview virtualization research]]
  - `test/unit/performance/explorerNotebookNavigatorComparison.test.ts`
  - `src/dev/perfProbe.ts`
  - `scripts/run-explorer-scroll-smoke.mjs`

### Tag: `nn-parity-mission`

Achieve "Vaultman > Notebook Navigator > native file-explorer" for scroll smoothness and render latency. Failed in prior iterations per user.

- Owner: Track propio; likely blocked on 0-A.S harness rebuild
  + scroll-idle deferral root-cause analysis from R4.
- Pre-reads: same as 0-A.S.

### Tag: `ghost-element-native`

`serviceManualDnd` / `serviceDnd` (or dnd-kit) emit `.drag-ghost` / `.drag-ghost-self` / `.drag-ghost-icon` / `.drag-ghost-action` for the drag preview element when `preset.useNativeDom=true`. Today these services emit `vm-*`-prefixed ghost classes (per inventory).

- Owner: Small enhancement, can run post-0-A independently.
- Not blocked.

### Tag: `badge-sub-toggle-nested-ui`

Reconsider badges flat-group layout if user feedback indicates a nested sub-popover would be cleaner. 0-A locks flat-group.

- Owner: UI/UX decision post-Theme-Builder.

## Known unknowns (need answer during impl, not blocking spec)

- Exact `InjectionKey<T>`-equivalent helper name in Vaultman codebase (O established the typed Symbol pattern; if O exports a generic helper, reuse it; else use the cast pattern from `04-view-host-shell.md`).
- Whether `viewHost.btnNodeElementsVisibility` overrides persist across viewMode change within the same panel — design says yes (intent preservation); C7 tests assert it.
- Whether `overlayViewMenu` is the only consumer of `EXPLORER_PLATFORM_VIEW_MODES` post-C7 — if other UIs read it directly, audit them during C7 and refactor through `viewHost.selectableModes` for consistency.
- Whether existing per-view tests use mock `themeService` — they need to use mock viewHost service now too. Audit during C6 and update mocks accordingly.
- Whether the existing scroll-idle deferral mechanism is the flicker root cause (R4) — only known after C12 reproduce phase.
