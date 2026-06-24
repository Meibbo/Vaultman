---
title: Provider and navbar integration
type: implementation-plan-shard
status: active
parent: "[[docs/work/hardening/plans/2026-05-06-prop-value-rename-handoff/index|prop-value-rename-handoff]]"
created: 2026-05-06T03:30:00
updated: 2026-05-06T03:30:00
tags:
  - agent/plan
  - explorer/props
  - svelte
---

# Provider And Navbar Integration

## Red Tests

- `prop.rename` registered action calls the handoff callback and does not call
  `showInputModal` when the callback is provided.
- `value.rename` registered action does the same with value metadata.
- The handoff callback receives files resolved through current operation scope.

## Production Steps

- Add optional constructor options to `explorerProps`:
  `startRenameHandoff?: (handoff: FnRRenameHandoff) => void`.
- In `tabProps.svelte`, bind shared `fnrState` and construct `explorerProps`
  with a callback that updates `filtersFnRState`.
- In `pageFilters.svelte`, pass `bind:filtersFnRState` to `FiltersPropsTab` and
  pass `filtersFnRState` plus confirm/cancel/update callbacks to
  `NavbarExplorer`.
- In `NavbarExplorer.svelte`, render a compact rename handoff row when
  `fnrState.rename.status` is `editing` or `ready`.
- Focus the replacement input when the handoff appears; use icon buttons for
  confirm/cancel with accessible labels and titles.

## Expected Result

Selecting prop/value rename from CMenu opens an inline navbar handoff instead
of the old isolated prompt, and confirming it stages the same queue operation.
