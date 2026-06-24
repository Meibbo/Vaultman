---
title: Binding notes and explorer-wide set
type: implementation-plan-shard
status: draft
parent: "[[docs/work/hardening/plans/2026-05-07-multifacet-2/index|multifacet wave 2 plan]]"
created: 2026-05-07T02:30:00
updated: 2026-05-07T02:30:00
tags:
  - agent/plan
  - explorer/note-binding
  - explorer/cmenu
created_by: claude
updated_by: claude
---

# Phase 7 — Binding Notes And Explorer-Wide `set`

> Spec: [[docs/work/hardening/specs/2026-05-07-multifacet-2/05-note-binding-and-set|Binding notes and set]]

## Tasks (Binding Notes)

- [x] Create `src/services/serviceNodeBinding.ts` with
      `bindOrCreate(node)` implementing the 0/1/N alias-match
      algorithm.
- [x] Add cmenu entry **create / open binding note** for non-file
      nodes via the explorer providers (`explorerTags.ts`,
      `explorerProps.ts` for both `prop` and `value`).
      Snippet/template/folder providers do not yet exist.
- [x] Settings entry `bindingNoteFolder` (string, default `""`).
      Type defined; UI exposure deferred (no UI exists for the
      sibling phase 4-6 settings either).
- [x] When N>1, route to filter pane with synthetic
      `aliases has <token>` filter and a notice.

## 2026-05-09 Follow-Up Scope (Not Implemented In Phase 7)

- [ ] Extend `BindingNodeKind` with `plugin`.
- [ ] Change the future snippet alias rule from raw label to
      `$snippetname`.
- [ ] Add plugin alias rule `%pluginname`; prefer manifest id as the stable
      canonical plugin name unless a future UX decision chooses display
      names.
- [ ] Add `pageTools` `tabSnippets` with an explorer over CSS files in
      `.obsidian/snippets/`. Render an enable/disable toggle in the slot
      normally used by counts.
- [ ] Add `pageTools` `tabPlugins` with an explorer over community plugin
      manifests. Binding-note creation/opening is normal; plugin enable/
      disable controls must be explicit guarded actions.
- [ ] Use the research record before implementation:
      [[docs/work/hardening/research/2026-05-09-node-note-ui-assimilation/index|node note UI assimilation research]].
- [ ] Follow the promoted next-priority order:
      [[docs/work/hardening/backlog/2026-05-09-node-notes-next-priority/index|node notes next-priority implementation order]].

## Tasks (`set` Action)

- [x] Add `set` cmenu entry in every explorer provider
      (`tag.set`, `prop.set`, `value.set`, `file.set`).
- [x] Tag → queue `add_tag` ops over filtered files via
      `buildTagAddChange`.
- [x] Prop → open `FnRIslandService` with mode `add-prop`, query
      pre-filled `<propName>: `. Submit parsed by
      `parsePropSetSubmission` and queued through
      `buildPropSetChange` (overwrite policy).
- [x] Value → queue `set_prop { key: parentProp, value: label }`
      ops over filtered files.
- [x] File → queue `append_links` ops via `buildAppendLinksChange`;
      idempotent (skip if link already in body).
- [x] Added new op kind `append_links` and `APPEND_LINKS` sentinel
      in `typeOps.ts` + `OperationQueueService.translateUpdate`.

## Tests

- [x] `test/unit/services/serviceNodeBinding.test.ts` — 0/1/N
      alias matches (12 tests).
- [x] `test/unit/services/serviceFnRPropSet.test.ts` — prop set
      template prefill and submit (5 tests).
- [x] `test/component/cmenuSetAction.test.ts` — `set` entry exists
      in every explorer cmenu and dispatches correct op kind (4).
- [x] `test/component/cmenuCreateBindingNote.test.ts` — entry
      visibility on non-file nodes only, dispatch through
      `nodeBindingService` (4 tests).

## Verification

- [x] Focused unit + component runs (17 unit, 8 component).
- [x] `pnpm exec vp build` and `pnpm exec vp lint` green
      (0/0 warnings).

## Stop Conditions

- Stop if creating a binding note can overwrite existing frontmatter
  outside the `aliases` key. Use a frontmatter-merge helper.
- Stop if `NATIVE_APPEND_LINK` could append duplicate wikilinks on
  re-runs. Add idempotence: skip if link already present in body.
- Stop if prop `set` is invoked without a selected prop node;
  refuse with a notice rather than crashing.
