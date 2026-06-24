---
title: State and builders
type: implementation-plan-shard
status: active
parent: "[[docs/work/hardening/plans/2026-05-06-prop-value-rename-handoff/index|prop-value-rename-handoff]]"
created: 2026-05-06T03:30:00
updated: 2026-05-06T03:30:00
tags:
  - agent/plan
  - fnr
  - logic/queue
---

# State And Builders

## Red Tests

- `createFnRState()` includes inactive rename handoff state.
- Starting a prop rename creates `status: 'editing'`, `sourceKind: 'prop'`,
  original text, replacement text, file scope, and property metadata.
- Updating replacement switches status to `ready` only when the replacement is
  non-empty and different from the original.
- Confirming a prop handoff builds a property `rename` change using
  `NATIVE_RENAME_PROP`.
- Confirming a value handoff builds the same property `set` change shape as the
  old `_renameValue` path.
- Cancelling or queued handoffs are not queueable.

## Production Steps

- Extend `typeFnR.ts` with `FnRRenameHandoff`, `FnRRenameSourceKind`, and
  `FnRRenameStatus`.
- Add service functions in `serviceFnR.svelte.ts`:
  - `createInactiveRenameHandoff`;
  - `startPropRenameHandoff`;
  - `startValueRenameHandoff`;
  - `updateRenameHandoffReplacement`;
  - `cancelRenameHandoff`;
  - `markRenameHandoffQueued`;
  - `buildRenameHandoffChange`.
- Move or duplicate the minimal prop/value helpers currently private in
  `explorerProps.ts`: case-insensitive `frontmatterKey`, value coercion, value
  replacement update, and delete-empty-list behavior.

## Expected Result

The queue payloads can be tested without rendering Svelte or opening modals.
