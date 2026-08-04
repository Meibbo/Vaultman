---
title: U121-003 plan 09 - reveal this-file properties mode
type: implementation-plan-shard
status: approved
parent: "[[index|U121-003 corrective implementation plan]]"
spec: "[[../spec-2026-08-02-corrective-primitives/08-reveal-this-file-properties|Spec shard 08]]"
created_by: claude-opus-5-root
updated_by: claude-opus-5-root
dateCreated: 2026-08-02
updated: 2026-08-02
---

# 09 — `reveal this file` properties mode

Implements
[[../spec-2026-08-02-corrective-primitives/08-reveal-this-file-properties|spec shard 08]].
Runs last: it consumes the panelWidget slot contract of plan shard 02, the
capability resolver of shard 04, the interaction port of shard 05 and the slot
precedence rule of [[08-value-operations-part-2|plan shard 08 part 2]].

## The governing constraint

Reveal is a **variation of the same explorer**, not a second explorer. Everything
below follows from that: the projected rows stay node_props and node_values with
their own IDs, menus, badges and selection, and the three engines keep rendering
them. The only thing reveal changes is which nodes the projection contains and,
in Tree, the anatomy they are drawn with.

The second constraint is the cost contract. The developer requires that reverting
the toggle costs nothing, which is a statement about ownership: the vault-wide
property index is never torn down or rebuilt by the toggle. Reveal is a filter
over an index that keeps its own lifecycle.

## Task 9.1 — Reveal as a projection revision over the existing index

**Files:**

- Create: `src/logic/logicRevealActiveFileProps.ts`
- Create: `test/unit/revealActiveFileProps.test.ts`
- Modify: `src/logic/logicProps.ts`
- Modify: `src/logic/logicCellCapabilities.ts`, `test/unit/cellCapabilities.test.ts`

- [x] Add pure tests for a projection that takes the already-built vault-wide
  property snapshot plus one file's frontmatter and returns the node set for that
  file, in **frontmatter key order**.
- [x] Add tests proving node identity: a property present in both projections
  keeps the same node ID, so selection and expansion survive the toggle.
- [x] Add tests for the empty states — no active file, and an active file with no
  frontmatter — returning the canonical empty state rather than falling back to
  the vault-wide set.
- [x] Add capability tests: `reveal` enters `CellCapabilityContext`, and Cells
  with no single-file meaning (the vault-wide `count`) resolve **unavailable**
  rather than rendering a misleading zero.
- [x] Add a source guard proving the toggle path calls no vault-wide rebuild
  entry point (`servicePropertyIndex` rebuild, `PropsLogic` invalidation, vault
  scans, metadata sweeps). Name the forbidden symbols explicitly so the guard
  fails loudly if a rebuild is added later.
- [x] Run the suites and confirm RED.
- [x] Implement the projection as a pure filter plus an order, taking the
  snapshot in and returning nodes out. It never reads the vault.
- [x] Re-run focused tests, confirm GREEN, run `pnpm run check`.

## Task 9.2 — The toolbar toggle and its exclusive slot

**Files:**

- Modify: `src/types/typePanelWidget.ts`, `src/logic/logicPanelWidgetProjection.ts`
- Modify: `src/components/containers/explorerProps.ts`
- Modify: `src/i18n/en.ts`, `src/i18n/es.ts`
- Modify: `test/unit/valueMoveModeProjection.test.ts`
- Modify: `test/unit/panelWidgetProjection.test.ts`

- [x] Add projection tests placing the toggle **between `search` and
  `collapse/expand`** in the Props panelWidget, participating in overflow
  condensation and the ToolCase like any other node.
- [x] Add a test requiring the open state to use Core's focused/primary
  variables, not the Vaultman active accent — the same rule the Search
  ActionNode already follows.
- [x] Re-point the mutual-exclusion test written in plan shard 08 part 2: the
  slot holds the reveal toggle, or `Proceed with selected`, never both, and the
  reveal state is restored when the move mode exits.
- [x] Add liveness tests: changing the workspace's active file reprojects within
  one reactive flush with no user action, and two instances with different active
  files project independently.
- [x] Add a test proving that toggling off restores the previous vault-wide
  projection including expansion, scroll position, sort and selection for IDs
  that still exist.
- [x] Run the suites and confirm RED.
- [x] Implement the toggle as PanelExplorer state under the panelWidget
  generation of shard 01, subscribing to the active-leaf change that already
  exists rather than adding a new watcher.
- [x] Re-run focused tests, confirm GREEN; run the Svelte autofixer on every
  changed `.svelte`.

## Task 9.3 — Tree renders Core's file-properties anatomy ✅

**Files:**

- Modify: `src/components/layout/viewTree.ts`
- Modify: `src/utils/renderPropertyValue.ts`
- Modify: `styles.css`
- Create: `src/components/layout/viewCoreMetadataTree.ts`
- Create: `test/unit/revealTreeAnatomy.test.ts`

- [x] Read `C:\Users\vic_A\Desktop\obsidian-web-lab\obsidian\app.css` and `app.js`
  for the anatomy before writing markup. Do not reconstruct Core from memory.
- [x] Add DOM tests for the recorded structure:

```text
div.metadata-container
  div.metadata-properties-heading > div.metadata-properties-title
  div.metadata-properties
    div.metadata-property[data-property-key][data-property-type]
      div.metadata-property-key > span.metadata-property-icon + input.metadata-property-key-input
      div.metadata-property-value
  div.metadata-add-button
```

- [x] Add a test proving the value renderer is **shared** with the `cell_format`
  work of shard 07, not duplicated: `.metadata-property-value` is the ancestor
  that shard 06 of the spec already requires for the `data-property-type`
  variable mapping, so the two agree on one anatomy.
- [x] Add tests proving Table and Cards render the same dataset through their own
  columns/Cells and expose **no** `metadata-property` recreation. Core has one
  file-properties layout; inventing it for engines Core does not have would break
  the "do not recreate Core" rule.
- [x] Add tests proving drag reorder exists in Tree only, and that in Table and
  Cards the order is NAVCO's sort with reorder unavailable rather than silently
  ignored.
- [x] Run the suites and confirm RED.
- [x] Implement the Tree anatomy and the engine split; confirm VIECO and NAVCO
  options still apply in all three.
- [x] Re-run focused tests plus Stylelint, confirm GREEN.

## Task 9.4 — Mutation policy: queued semantics, live order

**Files:**

- Modify: `src/components/containers/explorerProps.ts`
- Modify: `src/types/typePropertyValueInteraction.ts`
- Create: `test/unit/revealMutationPolicy.test.ts`

- [ ] Add tests for the hybrid the developer chose:

| Interaction | Required path |
| --- | --- |
| editing a value | `PropertyValueInteractionPort` → rename OperationNode → queue |
| adding a value through the input | `add` OperationNode → queue |
| renaming a property key | existing `prop.rename` OperationNode → queue |
| reordering by drag | written live through the existing `REORDER_ALL` sentinel |

- [ ] Add a test proving each queued interaction produces **exactly one**
  operation with its pending badge, and that the renderer performs no vault write
  in either mode.
- [ ] Add tests for the value-entry input: it is its own affordance, always
  present in reveal mode and **not gated by `nested`**; it reuses Core's
  `.metadata-add-button` and key-input anatomy; committing queues exactly one
  `add`; an empty or cancelled entry queues nothing; it is excluded from the
  touch swipe recognizer of shard 02.
- [ ] Add adversarial tests: switching the active file keeps a staged operation
  and its badge with the node; switching mid-drag cancels the drag instead of
  writing an order to the wrong file; malformed frontmatter shows the existing
  validation path; reveal plus select plus a batch menu targets only the
  projected nodes; deleting the active file returns the empty state without
  throwing.
- [ ] Add a test proving the inline value edit still coerces through
  `coercePropertyValueForWidget`, so reveal cannot reintroduce the property-type
  flip fixed on 2026-08-02.
- [ ] Run the suites and confirm RED.
- [ ] Implement, keeping `REORDER_ALL` as the only live path.
- [ ] Re-run focused tests, confirm GREEN, run `pnpm run check`, `pnpm run lint`
  and Stylelint.

## Definition of done for this shard

- Reveal projects the active file's properties as normal node_props and
  node_values, live, with the canonical empty state where there is nothing to
  show.
- The toggle performs no vault scan, no index rebuild and no full explorer
  rebuild in either direction, proven by the source guard and by the live
  reversibility scenario.
- Tree matches Core's recorded anatomy; Table and Cards use their own Cells.
- Only frontmatter key order is written live; every semantic mutation is queued.
- The toolbar slot holds reveal or `Proceed with selected`, never both.

## Open, non-blocking

The taxonomy question from the spec — what kind of control the value-entry input
is in the VIECO/NAVCO vocabulary — stays open. It does not block implementation
and must not be resolved by wiring the input to `nested`; the developer's
comparison to `nested` was a classification remark, not a wiring instruction.

## Execution record — 2026-08-02 evening, claude-opus-5

Tasks 9.1 and 9.2 landed in `274f0a80` and `298b9d9c`. Tasks 9.3 and 9.4 are
untouched.

### 9.1 — the projection

`logicRevealActiveFileProps.ts` narrows an already-built snapshot. It never
reads the vault, never sweeps the metadata cache and never rebuilds anything,
and it exports `REVEAL_FORBIDDEN_REBUILD_SYMBOLS` so a guard fails loudly if a
rebuild entry point is ever added to the toggle path.

Decisions worth carrying:

- **Node identity is preserved by reusing the vault-wide node**, not by
  rebuilding one with the same ID. Badges, metadata and pending operations
  therefore come from one place and survive the toggle in both directions.
- **A value the index has not seen still projects.** The metadata cache can lag
  a just-typed value; dropping it would make the file look like it does not
  have what the user just wrote.
- **Both empty states return empty**, never the vault-wide set. Showing
  properties the file does not have, while claiming to show the file, is worse
  than showing nothing.
- A nested map serializes rather than stringifying, because `[object Object]`
  is not the value the user wrote and would never match a projected ID.

`CellCapabilityContext` gained `reveal`. The vault-wide `count` withdraws inside
it and a saved `count` sort falls back to Name.

### 9.2 — the toggle

State on the explorer; the tree is narrowed once, before search, filters, sort
or any engine reads it, so nothing downstream decides for itself what reveal
means.

It follows the active file through `observeActiveContentFile` — the watcher that
already resolves open, rename and delete — rather than adding a second idea of
which file is active. Deleting the active file therefore returns the empty state
instead of throwing. The watch exists only while the toggle is on, and the panel
drops it on unload.

The toggle holds the exclusive slot between `search` and `collapse/expand`. The
move mode of shard 08 part 2 replaces it and its state survives, because the
toggle lives on the explorer rather than in the projection. The mutual-exclusion
test written in that shard already named `props.reveal-this-file`, so it needed
no re-pointing.

### Gap recorded rather than faked

`resolveCellCapabilities` **has no caller anywhere in `src`**. Shard 04 landed
it as a module without one, exactly like the `PropertyValueInteractionPort` of
shard 05 that task 5.2 never finished extracting. So although `reveal` is part
of the context and the resolver withdraws the vault-wide `count`, **no live Cell
list is narrowed by reveal yet**. A guard in `revealActiveFileProps.test.ts`
fails the moment `explorerProps` starts calling the resolver, which is the point
at which to wire it properly.

### Not done

- **9.3** — Tree's Core file-properties anatomy, the Table/Cards split and the
  `styles.css` work. Needs `obsidian-web-lab` read first; Core must not be
  reconstructed from memory.
- **9.4** — the mutation policy: queued value/key/type changes, live
  `REORDER_ALL` drag order, and the value-entry input.

Suite at `298b9d9c`: **1533/1533** in 204 files, `tsc` and `svelte-check` 0/0.
