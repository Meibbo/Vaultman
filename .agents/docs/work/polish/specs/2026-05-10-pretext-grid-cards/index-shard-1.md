---
title: "Pretext grid cards hybrid layout - continuation 1"
type: continuation-shard
status: active
parent: "[[docs/work/polish/specs/2026-05-10-pretext-grid-cards/index|Pretext grid cards hybrid layout]]"
shard_source: ".agents/docs/work/polish/specs/2026-05-10-pretext-grid-cards/index.md"
shard_of: "[[docs/work/polish/specs/2026-05-10-pretext-grid-cards/index|Pretext grid cards hybrid layout]]"
shard_part: 1
created: 2026-05-10T15:35:56
updated: 2026-05-10T15:35:56
tags:
  - agent/shard
created_by: codex
updated_by: codex
---

# Pretext grid cards hybrid layout - continuation 1

Continua desde [[docs/work/polish/specs/2026-05-10-pretext-grid-cards/index|Pretext grid cards hybrid layout]].

- write normalized arrays back through `plugin.saveSettings()` only on explicit user pill changes, not during mount;
- keep array ordering stable so settings diffs remain readable.

This persistence contract deliberately belongs to field visibility, not Pretext.
Pretext consumes the normalized visible-field set and measured style snapshot;
it should not know about `VaultmanSettings`.

## Height Strategy

Use bucketed variable card heights.

Pretext produces measured line data, but the UI should not directly use every pixel as a distinct virtual row size. Instead, `serviceNodeCardLayout.ts` should map measured content into stable buckets:

- `compact`: identity plus one short metadata line;
- `standard`: identity plus common metadata;
- `tall`: multiple visible metadata fields or wrapped text;
- `expanded`: long content/search snippets that need extra room.

The exact pixel values can live beside `serviceViewSize.ts` so they can align with existing grid presets. Bucketed heights reduce scroll offset churn, make visual comparisons easier, and still let Pretext decide which bucket a node belongs to.

## Measurement Timing

Measure lazily around the virtualizer window plus overscan.

The card view should not premeasure every node in a large provider model. The first slice should:

- compute cheap fallback bucket heights for all nodes;
- ask the virtualizer for visible plus overscan rows;
- measure cards in or near that window;
- cache measured results by node content key, visible-field key, style key, width bucket, and card preset;
- update virtualizer options when cached measurements change;
- keep scrolling usable while measurements warm up.

## Font And Theme Contract

Pretext measurement must be invalidated when the rendered text style changes.

The first slice should define a style snapshot for node cards:

- font family resolved from Obsidian/Vaultman CSS variables;
- font size in pixels;
- font weight;
- line height in pixels;
- letter spacing in pixels;
- text transform if used;
- available content width after icon, padding, badges, and gaps.

If the style snapshot cannot be resolved reliably, fallback to the existing fixed preset height rather than showing unstable scroll geometry.

Implementation status: `src/services/serviceNodeCardStyle.ts` now owns the resolved style snapshot. `ViewNodeCards.svelte` starts with `DEFAULT_NODE_CARD_MEASURE_STYLE`, then updates card measurement from rendered `.vm-node-card-field.is-title` and `.vm-node-card-field.is-meta` CSS through `activeWindow.getComputedStyle`. The style key includes font, line height, letter spacing, whitespace, and word-break so card rows remeasure only when the rendered measurement contract changes.

## SVAR Reference Use

Use the SVAR filemanager as a comparison source, not a dependency target:

- inspect which filemanager affordances are already solved there;
- compare density, row/card affordances, icon sizing, drag/drop affordances, and resize behavior;
- record useful patterns before deciding whether Vaultman should absorb, imitate, or discard the SVAR module later;
- avoid routing core explorer state through SVAR in this slice.

## Deferred Work

These are important but not part of the first Pretext slice:

- multiline `ViewNodeTable` rows;
- `dnd-kit` integration for node reordering or drag-to-filter behavior;
- resize handles for nodes/cards;
- persisted card sizing preferences beyond existing view-size settings;
- absorbing or deleting the SVAR filemanager module;
- table column resizing or table measured cells;
- broad visual redesign of explorer chrome.

## Testing And Verification Targets

- Unit tests for `serviceTextMeasure` cache keys, fallback behavior, and deterministic height calculation around mocked Pretext output.
- Unit tests for `serviceNodeCardLayout` mapping node data to card layout budgets.
- Unit tests for card height bucket selection from measured text results.
- Unit tests for `serviceNodeFieldVisibility` defaulting, provider/view keys, invalid-field pruning, persistence payloads, and identity repair.
- Component tests proving card mode keeps selected, focused, active, hover badge, context menu, and keyboard contracts from grid mode.
- Component tests proving view-menu pill toggles persist by provider/view and drive the fields passed to measured cards.
- Virtualizer tests proving measured row heights and durable keys are passed to TanStack virtualizer options.
- Obsidian smoke test comparing current grid mode and measured cards mode in the same vault.
- Performance probe around first render, resize, and rapid scroll in a large node set.

## Open Design Questions

1. Answered: the first visible measured mode is named `cards`.
2. Answered: cards should measure label/detail plus provider-specific visible metadata selected through the view-menu field pills.
3. Answered: card heights are bucketed variable heights.
4. Answered: Pretext measurement happens lazily around the virtualizer window plus overscan.
5. What SVAR behaviors are reference-only, and which are candidates for eventual Vaultman-native behavior?

## Implementation Status

Status: done on 2026-05-10T02:37:32.

Files changed:

- settings and services: `src/types/typeSettings.ts`, `src/services/serviceNodeFieldVisibility.ts`, `src/services/serviceTextMeasure.ts`, `src/services/serviceNodeCardLayout.ts`, `src/services/serviceNodeCardStyle.ts`;
- Svelte UI route: `overlayViewMenu.svelte`, `navbarExplorer.svelte`, `pageFilters.svelte`, tab wrappers, `panelExplorer.svelte`, `ViewNodeCards.svelte`;
- styles: `src/styles/data/_cards.scss`, `src/main.scss`, generated `styles.css`;
- tests: focused unit tests for field visibility, text measurement, card layout, card style snapshots, plus component tests for view menu, cards, panel routing, selection, rendered CSS measurement, and virtualizer keys;
- package files: `package.json`, `pnpm-lock.yaml` for `@chenglou/pretext`.

Verification:

- Focused unit tests passed: 3 files / 16 tests.
- Focused component tests passed: 5 files / 54 tests.
- CSS font snapshot follow-up focused unit tests passed: 4 files / 18 tests.
- CSS font snapshot follow-up focused component tests passed: 5 files / 55 tests.
- `pnpm run check` passed with 0 errors / 0 warnings.
- `pnpm run lint` passed with 0 warnings / 0 errors.
- `pnpm run build` passed and regenerated/synced build artifacts.
- Scoped `git diff --check` exited 0 with only LF-to-CRLF working-copy normalization warnings.

Superseded deviations:

- The first-slice `ViewNodeCards.svelte` local style snapshot note is superseded by [[docs/work/polish/plans/2026-05-10-pretext-grid-cards/07-css-font-snapshot|CSS font snapshot follow-up result]].
  Cards now use the deterministic fallback only until a rendered CSS snapshot is available, and jsdom tests stub `activeWindow.getComputedStyle`.
- The cards SCSS partial is imported as `data-cards` because an existing explorer cards partial already owns the default Sass `cards` namespace.

Deferred follow-up:

- `dnd-kit` drag/drop;
- node/card resize handles and persisted card sizing preferences;
- multiline table rows and measured table cells;
- SVAR filemanager absorption/deletion decision.

## Sources

- PretextJS: https://github.com/chenglou/pretext
- Current table spec:
  [[docs/work/polish/specs/2026-05-07-tanstack-node-table/index|TanStack node table]]
- Current node table component: `src/components/views/ViewNodeTable.svelte`
- Current node grid component: `src/components/views/ViewNodeGrid.svelte`

Continua en [[docs/work/polish/specs/2026-05-10-pretext-grid-cards/index-shard-2|continuacion 2]].