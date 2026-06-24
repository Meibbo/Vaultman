---
title: CMenu provider integration
type: implementation-plan-shard
status: completed
parent: "[[docs/work/hardening/plans/2026-05-06-cmenu-queue-repair/index|cmenu-queue-repair]]"
created: 2026-05-06T03:00:09
updated: 2026-05-06T03:18:00
tags:
  - agent/plan
  - initiative/hardening
  - explorer/views
  - logic/queue
---

# CMenu Provider Integration

## Red Tests

1. Registered CMenu actions are tested by their public action ids, not by
   private provider methods:
   - `tag.rename`;
   - `tag.delete`;
   - `file.rename` builder path;
   - `file.move` builder path;
   - `file.delete`.
2. Multi-selection stays covered for tag delete and should be added for tag
   rename if the implemented handoff can support multiple selected tag nodes in
   A0. If not, the label/behavior must remain single-node and A2 will expand it.

## Production Steps

1. Keep `ContextMenuService` unchanged. The bug is in registered action
   behavior, not in the menu service contract.
2. Make provider actions thin:
   - gather context nodes and scoped files;
   - ask for missing user input only when required;
   - call a queue builder;
   - send the resulting change to `plugin.queueService.add`.
3. Do not introduce new Svelte state unless tag inline rename is selected as
   the implementation route. If Svelte wiring is required, pass the existing
   optional `onRename` and `onCancelRename` props from `panelExplorer.svelte` to
   `ViewTree` and run `svelte-autofixer` on the changed component.
4. Avoid changing labels, icons, menu ordering, or unrelated search/sort
   behavior.

## Expected Result

The context-menu surface becomes a reliable test entry point for tags and
files. Follow-up FnR/navbar slices can reuse these builders instead of reverse
engineering modal internals.
