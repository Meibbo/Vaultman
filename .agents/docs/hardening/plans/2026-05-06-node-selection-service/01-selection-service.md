---
title: Selection service
type: implementation-plan-shard
status: draft
parent: "[[docs/work/hardening/plans/2026-05-06-node-selection-service/index|node-selection-service-plan]]"
created: 2026-05-06T07:05:00
updated: 2026-05-06T07:05:00
tags:
  - agent/plan
  - explorer/selection
---

# Phase 1: Selection Service

## Ownership

Recommended subagent: selection-service worker.

Write scope:

- create `src/types/typeSelection.ts`;
- create `src/services/serviceSelection.svelte.ts`;
- create `test/unit/services/serviceSelection.test.ts`;
- optionally update `src/logic/logicKeyboard.ts` only if the service reuses or
  needs a small pure helper.

Do not edit Svelte components in this phase.

## TDD Steps

1. Write tests for plain pointer selection.
   - Input ordered ids: `['a', 'b', 'c']`.
   - Existing selected ids: `['a']`.
   - Command: select pointer target `b` without modifiers.
   - Expected: selected `['b']`, anchor `b`, focused `b`, active `b`.

2. Run the test and confirm it fails because the service does not exist.

3. Implement the minimal service constructor, per-explorer state creation, and
   `selectPointer`.

4. Run the focused unit test and confirm it passes.

5. Add tests for Control/Command toggle.
   - Existing selected ids: `['a', 'b']`.
   - Target `b`, additive true.
   - Expected selected `['a']`, anchor `b`, focused `b`.

6. Implement additive toggle.

7. Add tests for Shift range and Control/Command plus Shift additive range.
   - Shift from anchor `b` to target `d` selects `['b', 'c', 'd']`.
   - Additive range from focused `b` to target `e` with existing
     `['a', 'b']` produces `['a', 'b', 'c', 'd', 'e']`.

8. Implement range handling by reusing or moving the existing
   `logicKeyboard.ts` behavior.

9. Add tests for box selection replacement and additive box selection.
   - Replacement orders target ids by `orderedIds`, not by DOM order.
   - Additive preserves pre-existing ids.

10. Implement `selectBox`.

11. Add tests for keyboard movement.
   - Plain arrow movement changes focused/active only and preserves selection.
   - Shift arrow extends selection from anchor.
   - Control/Command arrow changes focus without changing selection.

12. Implement `moveFocus`.

13. Add tests for Space, Shift Space, and Control/Command plus Shift Space.

14. Implement `toggleFocused`.

15. Add tests for `setHovered`, `setFocused`, active derivation, `clear`, and
   `prune`.

16. Implement the remaining service commands.

17. Run:

```powershell
pnpm exec vp test run --project unit --config vitest.config.ts test/unit/services/serviceSelection.test.ts
```

Expected: all tests pass.

## Interface Notes

Keep snapshots immutable to callers:

```ts
const snapshot = service.snapshot('props');
expect(snapshot.ids).toEqual(new Set(['prop:status']));
```

Do not expose the internal `SvelteSet` for arbitrary mutation.
