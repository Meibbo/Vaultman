---
title: U121-010 plan — Verification
type: plan
status: active
parent: "[[docs/work/polish/plans/2026-07-30-u121-010-glyph-color-projection/index|U121-010 plan]]"
created: 2026-07-30T00:00:00
updated: 2026-07-30T00:00:00
created_by: codex-gpt5-root
updated_by: codex-gpt5-root
tags:
  - agent/plan
  - initiative/polish
  - release/1.2.1
  - explorer/files
  - glyph-color
---

# Verification

### Task 7: Verify the complete patch before completion

**Files:** Inspect all product/test files listed in the plan; do not add AI docs
to the product branch.

- [ ] **Step 1: Run the focused regression set**

```powershell
pnpm exec vitest run --config vitest.unit.config.mts test/unit/glyphColor.test.ts test/unit/explorerGlyphProjection.test.ts test/unit/viewTreeBehavior.test.ts test/unit/viewTreeSource.test.ts test/unit/gridViewSource.test.ts test/unit/filesGridAnchorBehavior.test.ts test/unit/filesGridViewSource.test.ts test/unit/badgeBubbling.test.ts test/unit/floatingTocSource.test.ts
```

Expected: every named file and test passes with zero failures.

- [ ] **Step 2: Run each verify constituent and read its own exit code**

```powershell
pnpm run lint
pnpm run check
pnpm run format:check
pnpm run stylelint
pnpm run build:plugin
pnpm run test:unit
pnpm run test:scorecard
git diff --check
```

Record each exit independently. Do not infer aggregate success from a
supervisor timeout.

- [ ] **Step 3: Adversarial diff audit**

Inspect:

```powershell
git diff e6d12598...HEAD -- src test
git status --short --branch
git log --oneline e6d12598..HEAD
```

Confirm:

- shared Floating Index palette unchanged;
- no setting/persistence/CSS/Svelte/virtualization utility changes;
- no DOM-window-relative index;
- no active class removal;
- no full render on expansion;
- explicit Iconic color still wins icons;
- glyph color wins applicable names;
- Tree root distribution counts both files and folders;
- no `.agents/` path exists in a product commit.

- [ ] **Step 4: Leave the issue open for HITL**

Post a GitHub comment beginning with the AI disclaimer that records commits and
automated evidence. Set the state to `ready-for-human` only if that label exists
or is created, because light/dark, snippet on/off, and live Obsidian mode
switching remain the developer's acceptance matrix. Do not close #46 before
that runtime validation.
