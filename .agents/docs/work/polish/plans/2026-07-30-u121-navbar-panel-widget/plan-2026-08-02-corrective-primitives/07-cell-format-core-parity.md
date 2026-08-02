---
title: U121-003 plan 07 - cell_format Core parity
type: implementation-plan-shard
status: approved
parent: "[[index|U121-003 corrective implementation plan]]"
spec: "[[../spec-2026-08-02-corrective-primitives/06-cell-format-core-parity|Spec shard 06]]"
created_by: claude-opus-5-root
updated_by: claude-opus-5-root
dateCreated: 2026-08-02
updated: 2026-08-02
---

# 07 — `cell_format` Core parity for the remaining node_values

Implements [[../spec-2026-08-02-corrective-primitives/06-cell-format-core-parity|spec shard 06]].

## Sequencing decision

This shard runs **before** shards 01–06 of the original plan, and task 5.2 of
shard 05 is amended to build on its output.

Rationale: the work is a pure render-map refactor of `renderPropertyValue`, with
no dependency on the controller, selection, capability or menu contracts. Task
5.2 rewrites the same function to add the `PropertyValueInteractionPort` and
remove the read-only guards. Landing the type map first gives 5.2 a table to wire
the port into instead of a chain of `if` branches, so the two compose rather than
overwrite each other. Doing it in the reverse order would throw the first
implementation away.

Task 5.2 keeps its own red tests; this shard must not pre-implement its
interactivity. Every widget added here stays read-only until 5.2 makes it
interactive, exactly like the date/datetime/checkbox widgets that already exist.

## Task 7.1 — Add `datetime` to the operation type vocabulary

**Files:**

- Modify: `src/types/typeOps.ts`
- Modify: `src/logic/propertyValueCoercion.ts`
- Modify: `test/unit/propertyValueCoercion.test.ts`

- [ ] From the product worktree, record `git rev-parse HEAD` and
  `git status --short`; confirm `cac504a9` is HEAD or an ancestor and preserve
  every unrelated dirty change.
- [ ] Add tests proving `parsePropertyValue(raw, 'datetime')` preserves the
  stored local datetime form, that `convertPropertyValueType(value, 'datetime')`
  round-trips a datetime, that converting a datetime to `date` truncates to the
  day, and that converting to `text` keeps the stored form verbatim.
- [ ] Run the focused suite and confirm RED because `'datetime'` is not a member
  of `PropertyType`.
- [ ] Add `'datetime'` to the `PropertyType` union in `typeOps.ts:22`. Keep
  `'wikilink'`: it is a Vaultman conversion target with existing callers in
  `convertPropertyValueType` and the Convert submenu, and removing it is out of
  scope.
- [ ] Add the `datetime` branches to `parsePropertyValue` and
  `convertPropertyValueType`.
- [ ] Confirm no `switch` over `PropertyType` became non-exhaustive; fix any
  `pnpm run check` error by handling the case, never by widening to `string`.
- [ ] Re-run focused tests and confirm GREEN.

## Task 7.2 — Replace the branch chain with a declarative render map

**Files:**

- Modify: `src/utils/renderPropertyValue.ts`
- Create: `test/unit/propertyValueRenderMap.test.ts`
- Modify: `test/unit/propertyValueWidgetsSource.test.ts`

- [ ] Add a table-driven test asserting, for each of the eight Core widget types,
  the root element, its class set and the presence of `data-property-type` on the
  value cell. Assert meaningful class/structure contracts, not a full DOM
  snapshot.
- [ ] Add tests proving the wikilink branch still wins for a wikilink value in a
  `text` property, and that inside a pill type the link renders **inside**
  `.multi-select-pill-content`.
- [ ] Add a test proving one value node produces exactly one pill — the renderer
  never re-splits a raw value on commas.
- [ ] Run the focused suite and confirm RED on `tags`, `aliases`, `multitext`,
  `number` and `text`, which currently fall through to
  `span.vaultman-property-value-text`.
- [ ] Refactor `renderPropertyValue` into a resolved-type lookup:

```ts
type CorePropertyWidget =
  | 'text' | 'multitext' | 'number' | 'checkbox'
  | 'date' | 'datetime' | 'tags' | 'aliases';

type PropertyValueRenderer = (
  container: HTMLElement,
  raw: string,
  app: App,
) => void;

const RENDER_MAP: Readonly<Record<CorePropertyWidget, PropertyValueRenderer>>;
```

- [ ] Normalize the incoming `propType` to a `CorePropertyWidget` once, at the
  entry point, reusing `normalizePropType` where it already resolves the derived
  names. An unknown type resolves to `text`.
- [ ] Keep the existing checkbox, date and datetime renderers byte-for-byte in
  behavior; move them into the map without changing their DOM, classes or
  read-only guards.
- [ ] Implement the pill renderer shared by `tags`, `aliases` and `multitext`:
  `.multi-select-container > .multi-select-pill[tabindex=0] >
  .multi-select-pill-content`. No `.multi-select-input`.
- [ ] Implement `number` as `input.metadata-input.metadata-input-number` and
  `text` as `div.metadata-input-longtext`, both read-only at this stage.
- [ ] Re-run focused tests and confirm GREEN.

## Task 7.3 — Publish the Core ancestor contract and map its variables

**Files:**

- Modify: `src/components/containers/explorerProps.ts`
- Modify: `styles.css`
- Modify: `test/unit/propertyValueRenderMap.test.ts`

- [ ] Add a test requiring `_renderPropertyValueLabel` to set
  `data-property-type` on `.vaultman-property-value-cell`, equal to the resolved
  Core type.
- [ ] Add a Stylelint-checked CSS guard requiring the tag pill rule to be scoped
  by that attribute and forbidding any literal copy of a Core declaration —
  the rule may only assign `--pill-*` from `--tag-*`.
- [ ] Run focused tests and Stylelint; confirm RED.
- [ ] In `_renderPropertyValueLabel` (`explorerProps.ts:1044`), set the attribute
  on the label span before calling `renderPropertyValue`.
- [ ] In `styles.css`, map the variables exactly as Core does at
  `app.css:11535`: under `[data-property-type='tags']`, assign `--pill-color`,
  `--pill-color-hover`, `--pill-color-remove`, `--pill-color-remove-hover`,
  `--pill-decoration`, `--pill-decoration-hover`, `--pill-background`,
  `--pill-background-hover`, `--pill-border-color`, `--pill-border-color-hover`,
  `--pill-border-width`, `--pill-padding-x`, `--pill-padding-y`,
  `--pill-radius`, `--pill-corner-shape` and `--pill-weight` from their
  `--tag-*` counterparts.
- [ ] For `aliases` and `multitext`, reproduce Core's in-value neutralization
  from `app.css:11457`: `--pill-border-width: 0`, `--pill-padding-x: 0`,
  `--pill-padding-y: 0`, `--pill-color: var(--metadata-input-text-color)`, so
  they read as inline text rather than as chips.
- [ ] Scope every new selector under `.vaultman-`. Do not restyle Core's own
  `.metadata-property-value`, which belongs to the app's property panels.
- [ ] Re-run Stylelint and focused tests; confirm GREEN.

## Task 7.4 — Route the pill remove button to `value.delete`

**Files:**

- Modify: `src/utils/renderPropertyValue.ts`
- Modify: `src/components/containers/explorerProps.ts`
- Modify: `test/unit/propertyValueRenderMap.test.ts`
- Modify: `styles.css`

- [ ] Add a test proving the remove button exists only for pill types and only
  while Format is on, and that activating it invokes the injected delete callback
  exactly once with the node's property name and raw value.
- [ ] Add a source test proving `renderPropertyValue.ts` imports no vault,
  metadata or queue module — the callback is injected, not resolved.
- [ ] Add a test proving the button carries the existing interactive-Cell marker
  so the shard 02 swipe recognizer excludes it.
- [ ] Run focused tests and confirm RED.
- [ ] Extend the renderer's parameter object with an optional
  `onRemoveValue?: () => void`. When absent, the button is not rendered; the
  renderer never decides policy.
- [ ] Render `.multi-select-pill-remove-button` with `setIcon(el, 'lucide-x')`,
  matching Core's own `tv(s,"lucide-x")`.
- [ ] In `explorerProps.ts`, pass a callback that dispatches the **existing**
  `value.delete` action registered at `explorerProps.ts:348`. Do not duplicate
  `_deleteValue`; go through the registered action so the target set, queue mode
  and badges behave identically to the context-menu route.
- [ ] Stop the button's pointer events from reaching the row so removing a pill
  does not also activate the node.
- [ ] Add only the CSS needed for hit area and alignment; the button's own
  appearance comes from Core's `.multi-select-pill-remove-button` rule.
- [ ] Re-run focused tests, Stylelint and `pnpm run check`; confirm GREEN.

## Task 7.5 — Gates and commit

- [ ] Run the Svelte autofixer on every changed `.svelte` file. This shard is
  expected to change none; if `git diff --name-only -- '*.svelte'` is empty, record
  that instead of skipping the step silently.
- [ ] Run `pnpm run lint`, `pnpm run check`, `pnpm run stylelint` and
  `pnpm run format:check`; require exit code 0 from each.
- [ ] Run the focused suites named in tasks 7.1–7.4 plus
  `test/unit/propsLogic.test.ts` and `test/unit/propertyFlatProjection.test.ts`,
  which share the projection this shard renders.
- [ ] Inspect `git diff -- src test styles.css` and confirm the slice contains no
  panelWidget, selection, menu or settings change.
- [ ] Stage only this slice's files. Commit code-only as
  `feat: render every core property type in the format cell`.
- [ ] Record the hash in the execution log. Do not stage `.agents/`.

## Definition of done

- All eight Core widget types render their native anatomy with Format on, and
  plain text with Format off.
- Tag pills inherit the active theme's tag colors through Core's own variables,
  with no Core declaration copied into `styles.css`.
- The remove button routes to the existing `value.delete` action and the renderer
  performs no write.
- `PropertyType` includes `datetime` and no `switch` over it is non-exhaustive.
- Live smoke of this shard is folded into the shard 06 acceptance matrix; it is
  not claimed complete on unit tests alone.
