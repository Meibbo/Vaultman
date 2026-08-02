---
title: U121-003 next-agent prompt after the cell_format amendment
type: handoff-prompt
status: ready
parent: "[[index|U121-003 corrective implementation plan]]"
created_by: claude-opus-5-root
updated_by: claude-opus-5-root
dateCreated: 2026-08-02
updated: 2026-08-02
---

# Prompt for the next agent

## Update — 2026-08-02 afternoon (claude-opus-5-root)

The FIRST TASK below is **closed**, and plan shards 08, 08-part-2 and 09 now
exist. Read this section before the original prompt; everything it does not
contradict still holds.

**Landed since the prompt was written**

| Commit | What |
| --- | --- |
| inside `4e9dd0db` | the property type-flip fix — see the warning below |
| `cb98e2ac` | the ESLint debt owed from `853d8900`, 7 errors, no rule weakened |
| `e3806e62` | `Include as filter` / `Incluir como filtro` (plan 8.1) |
| `3722c7b6` | `Add to files` as an operation with its destination count (plan 8.2) |
| `c6c98a25` | derived property types shown as the current type, inert (plan 8.3) |
| `3b0402c9` | scalar comparison that does not stringify a map |

**The type-flip fix.** `coercePropertyValueForWidget(raw, propType)` in
`propertyValueCoercion.ts` coerces a committed widget string back to the
property's runtime type; the widget vocabulary (`CorePropertyWidget`,
`resolveCorePropertyWidget`, `LIST_WIDGETS`) moved there from
`renderPropertyValue.ts`, which re-exports it. Both Props call sites route
through it — the inline edit and the modal `_renameValue`. It was **not** routed
to the registered `value.checkbox-checked` action as the prompt suggested: that
action's `when` requires `minimalStyle === true`, so invoking it from the inline
widget would be a no-op in the default configuration.

**Warning about the shared worktree.** Another worker commits here with a
catch-all stage. Commit `4e9dd0db` ("move FiltersTab state declaration") carries
that worker's Svelte change *and* the whole type-flip fix, which it swept up
mid-edit. Nothing was reverted. **Stage explicit paths, never `-a`.** At the time
of writing there is also an uncommitted change of theirs in
`propertyValueCoercion.ts` — the `date` branch of `convertPropertyValueType`
dropping the time component, which is the divergence spec shard 06 recorded —
left untouched.

**What remains**

- plan shard 08 part 2: tasks 8.4–8.6, the `Move to prop...` mode. Not started.
- plan shard 09: tasks 9.1–9.4, `reveal this file`. Not started.
- plan shard 06: integrated gates, exact build, live matrix. Not started.
- Task 5.2's interaction port still has no caller: `PropertyValueInteractionPort`
  exists as a type and the inline rename still calls `_replaceValueInVault`.

**Gates for the commits above:** focused suites green per commit, `tsc` clean,
ESLint clean, plus `27ee0170` for the one regression the focused suites could
not see (see below). The exact-build smoke belongs to shard 06 and has not run.

**Three red guards that are not mine.** The full unit suite is at 1433/1441 with
eight failures: five were mine and are fixed in `27ee0170`; three are guards over
the other worker's `VaultmanFrame` refactor and were left alone, because
re-pointing a guard at a contract someone else is still shaping would enshrine an
invariant I did not design:

| Suite | Failing guard |
| --- | --- |
| `statisticsPageSource` | publishes Statistics into the Scene-owned panelWidget host |
| `responsiveDensitySource` | feeds measured frame width into the Filters provider projection |
| `statisticsToolbarAndOpenedToday` | publishes the requested provider before Filters reclaims the toolbar |

The last one slices the source at `async function navigateToDataTab`, which is no
longer `async`: the handoff now publishes through `sceneController.begin(tab)`
instead of awaiting a tick. Re-point it at the generation contract, do not delete
it.

**A lesson worth keeping.** `cb98e2ac` replaced the date debounce's bare
`setTimeout` with the global `window` to satisfy the popout lint rule, and the
focused suites stayed green while five tests in another file went red — the unit
environment is `node` and has no `window`. Run the full suite before believing a
cross-cutting change; `el.win` was the right accessor all along.

---


Supersedes [[next-agent-prompt]] for everything after the amendment. That file
still describes the authorization boundary correctly, but its "not authorized
yet" section is stale: **implementation was authorized by the dev on 2026-08-02**
for the full plan.

Copy the text below into a fresh Vaultman agent task.

---

You are continuing Vaultman U121-003. Execute the root `AGENTS.md` bootloader in
order before touching anything: identify agent/model and stream, join the current
agent room, heartbeat, retrieval-first, read the latest `session-log` entries and
your room mailbox, claim scope before editing shared docs.

## Authorization

The developer approved the specification and, separately, **authorized product
implementation on 2026-08-02** for plan shards 01 through 06 plus the amendment
shards. No second approval is pending. The remaining boundaries still hold: no
push, merge, tag, release or GitHub closure; code and `.agents/` stay separate
local commits; `.agents/` is never pushed.

## Workspace

- Product worktree: `C:\Users\vic_A\Desktop\vaultman\.claude\worktrees\u121-029-union`
- Branch: `claude/u121-029-panel-widget`
- Smoke vault in use: `C:\Users\vic_A\Desktop\plugin-dev` (the dev moved smoke here;
  `Start of The Road` still holds the older `cac504a9` build and was deliberately
  left alone)
- Agent-doc workspace: `C:\Users\vic_A\Desktop\vaultman` (sandbox)

**Another worker is active on this same branch.** Commit `9fd34ea2` (authored
2026-08-02 11:24 by Meibbo) landed plan shard 01 tasks 1.2/1.3 and rewrote
`logicScenePanelWidgetController.ts` and its suite. An untracked
`test/unit/searchControlSource.test.ts` is plan shard 02 task 2.1 in progress.
Do not revert, reformat or "clean up" either. Inspect `git log` and
`git status --short` before you start and assume anything you did not write
belongs to someone still working.

## Read before acting

1. Spec: `spec-2026-08-02-corrective-primitives/index.md` plus shards 01–08.
   Shards 06–08 are the 2026-08-02 amendment and are approved.
2. Plan: `plan-2026-08-02-corrective-primitives/index.md` plus shards 01–07.
3. The `session-log` entries dated 2026-08-02 by `claude-opus-5-root`. They carry
   the evidence behind several decisions and two live findings you should not
   re-derive.
4. Web Lab evidence source: `C:\Users\vic_A\Desktop\obsidian-web-lab\obsidian\app.css`
   and `app.js`. Read them before changing any Core-parity markup. Do not
   reconstruct Core behavior from memory.

## FIRST TASK — an open defect, reported and diagnosed but not fixed

Toggling a `cell_format` checkbox queues a rename that **changes the property's
type without being asked to**. Reported by the dev on 2026-08-02.

Cause, already traced:

`explorerProps._replaceValueInVault` writes `String(newValue)` into the
frontmatter. The inline checkbox toggle added in commit `8f5bcbed` routes
through it with `'true'` / `'false'`, so a boolean property receives the *string*
`"true"` and Obsidian re-infers its type from the data.

This is wider than the checkbox. Every inline rename goes through the same
`String()` coercion, so the same flip is available on `number` (writes `"42"`)
and on `date`. Only `text`/`multitext` are safe by accident.

The correct path already exists and was not used:
`_setCheckboxValue(propName, oldValue, boolean)` backs the registered
`value.checkbox-checked` / `value.checkbox-unchecked` actions. This is the second
time in this work that inventing a path instead of reusing a registered one
caused a defect — the first was pill removal, fixed by routing through
`ContextMenuService.invokeAction('value.delete', …)`. Prefer the registered
action.

Suggested shape, not binding:

- route the inline checkbox toggle to `_setCheckboxValue`;
- make `_replaceValueInVault` coerce by the property's resolved type with the
  existing `parsePropertyValue(raw, type)` instead of `String()`, so a number
  stays a number;
- add a red test per type proving the queued operation carries the right
  runtime type, before fixing.

## Other work the dev asked for and did not get

- ESLint was skipped at the dev's request for commit `853d8900`. **Run
  `pnpm run lint` and fix what it finds before the next code commit.**
- The dev asked for a build without the full unit suite immediately before
  closing the session; it was not produced. The installed `plugin-dev` build is
  `853d8900` (`main.js` SHA-256 `A5BA801E…`, `styles.css` `E692EC10…`).

## Remaining plan work

| Shard | State |
| --- | --- |
| 07 `cell_format` Core parity | done, minus the type-coercion defect above |
| 01 controller and provider liveness | 1.1 done (`856408f9`), 1.2/1.3 landed by the parallel worker in `9fd34ea2`; confirm 1.4 and its gates |
| 02 SearchControl, MenuSession, mobile | in progress by the parallel worker — coordinate through the room before touching |
| 03 selection axon, engine Cells, operation targets | not started |
| 04 Cell capabilities, file-count, By badges | not started |
| 05 properties, placement settings, touch | not started; note that 5.2's interaction port is still unextracted — the inline rename currently calls `_replaceValueInVault` directly |
| 06 integrated gates, exact build, live matrix | not started |
| 08 value operations | spec only; write the plan shard immediately before executing it |
| 09 reveal this-file properties | spec only; same |

Codex's open items, unchanged: **U121-003 / #43** stays open until the dev accepts
a smoke, and **U121-012 / #63** still limits the differential filter tracer to
Files flat-tree — nested, table, grid, folder, path and empty fall back to a full
repaint.

## Two findings to not re-derive

**Third-party property plugins cannot decorate our explorer.**
`pretty-properties` and `typify` do not sweep the document. They monkey-patch
Obsidian's own view classes — proxies over Bases' `updateVirtualDisplay` for rows
and cells, the tag pane view, the metadata property widgets — and decorate
elements found inside those view objects, keyed by `prop`/`propertyId`
(`note.tags`, `file.tags`, `formula.*`). `document.querySelectorAll("a.tag")`
appears zero times in `pretty-properties/main.js`; the only document-wide
selector is `.bases-rendered-value[data-property-type='text']`. No anatomy we
emit will reach them. Emitting Core's Bases anatomy was still correct and stays,
but do not promise the dev that it restores those decorations.

**Our tag colour is already the native one.** Core sets
`--tag-color: var(--text-accent)` (`app.css:2759`). A tag rendering in the vault
accent is Core's own behaviour; the orange the dev sees in Bases is
`pretty-properties` overriding it per tag. If the dev wants per-tag colour in
Vaultman it has to be a Vaultman feature with its own `Select color` action —
that is unspecified new scope, so specify it before building it.

## Known divergence left in place

`convertPropertyValueType`'s `date` branch preserves a time component when one is
present (`propertyValueCoercion.ts`). That reads like a defect for a
day-precision type, but it predates this work and has its own callers, so it was
recorded rather than silently corrected. Spec shard 06 documents it.

## Method

Follow the plan checkbox by checkbox in shard order. For each behavior: write the
red test, run it, confirm it fails for the stated reason, implement the smallest
contract-compliant change, confirm green, then run `pnpm run check`. Run the
Svelte autofixer before and after on every changed `.svelte`. Do not compress
several behaviors into one large patch, and do not treat a source guard as proof
of geometry or liveness.

When a guard fails because a contract moved, **re-point it and say so in the
commit** — the repo convention is that guards are re-aimed, never deleted or
weakened. Three separate guards caught real defects during the amendment work
(a redundant Core declaration copy, an action bypassing the error boundary, and a
silent change to the default visible cells); each one was worth the friction.

Before any completion claim run the full gate `pnpm run verify`, sync the exact
build, verify the three SHA-256 hashes against the installed plugin, and record
the evidence. Do not declare U121-003 complete until the dev accepts a live smoke
of that exact build.
