---
title: Provider actions
type: implementation-plan-shard
status: draft
parent: "[[docs/work/hardening/plans/2026-05-06-node-selection-service/index|node-selection-service-plan]]"
created: 2026-05-06T07:05:00
updated: 2026-05-06T07:05:00
tags:
  - agent/plan
  - explorer/actions
  - ui/context-menu
---

# Phase 3: Provider Actions

## Ownership

Recommended subagent: provider-actions worker.

Write scope:

- modify `src/components/containers/explorerFiles.ts`;
- modify `src/components/containers/explorerTags.ts`;
- modify `src/components/containers/explorerProps.ts`;
- modify context menu action tests in:
  - `test/unit/components/explorerFiles.test.ts`;
  - `test/unit/components/explorerTags.test.ts`;
  - `test/unit/components/explorerProps.test.ts`.

Avoid editing `panelExplorer.svelte` unless Phase 2 left a provider contract
hole that blocks selection-aware context menus.

## TDD Steps

1. Add tests for context menu selected set behavior in provider unit tests.
   - Files: selected file nodes passed into rename/delete use all selected
     files.
   - Tags: selected tag nodes passed into delete queue all selected tags.
   - Props: selected prop nodes passed into delete/type change queue all
     selected props.
   - Values: selected value nodes passed into delete queue all selected values.

2. Run the tests and confirm failures for missing selected-set behavior.

3. Implement provider action fixes using existing `contextFiles`,
   `contextTagNodes`, `contextPropNodes`, and `contextValueNodes` helpers.

4. Add tests that primary direct actions still work with no context menu.
   - File direct action uses the intended file workflow.
   - Tag direct action toggles tag filter.
   - Prop direct action toggles prop filter.
   - Value direct action toggles value filter.

5. Add or adjust tests for add mode quick-action badges.
   - Quick-action badge queues add operation.
   - It does not call row activation.
   - It does not mutate node selection.

6. Add context menu actions only where missing and valid.
   - Do not add invalid menu entries for mixed incompatible selected nodes.
   - Use `when` predicates where possible.

7. Run:

```powershell
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/components/explorerFiles.test.ts test/unit/components/explorerTags.test.ts test/unit/components/explorerProps.test.ts
```

Expected: provider tests pass.

## Product Semantics To Preserve

Providers own domain meaning. The selection service only knows node ids.

If a future action sends selected nodes to filters, implement it as provider or
context-menu action code, not as generic selection-service behavior.
