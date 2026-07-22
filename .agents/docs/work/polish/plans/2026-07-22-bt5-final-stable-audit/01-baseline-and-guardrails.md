---
title: BT5 final stable audit plan — baseline and guardrails
type: implementation-plan-shard
status: active
lifecycle: active
parent: "[[index|Vaultman v1.2.0 final stable audit implementation plan]]"
created: 2026-07-22T15:45:00
updated: 2026-07-22T15:45:00
created_by: codex-gpt5-root
updated_by: codex-gpt5-root
tags: [agent/plan, initiative/polish, release/1.2.0]
---

# Baseline, ownership and test guardrails

## Task 0.1 — Capture the product baseline without normalizing it

**Inspect:**

- `C:\tmp\vaultman-release-beta2-final2\src\logic\logicResponsiveLayout.ts`
- `C:\tmp\vaultman-release-beta2-final2\test\unit\toolbarOverflowStrategy.test.ts`
- `C:\tmp\vaultman-release-beta2-final2\package.json`

- [ ] Run `git status --short`, `git diff --check`, `git diff -- src/logic/logicResponsiveLayout.ts`, `git branch --show-current`, and `git rev-parse HEAD`.
- [ ] Record the pre-existing deletion of `'scroll'` and commented `toolbarUsesHorizontalScroll` as an expected baseline failure, not as agent-authored work.
- [ ] List any additional dirty path before editing; stop only if it overlaps the immediate slice and authorship cannot be preserved.

**Focused baseline command:**

```powershell
pnpm exec vitest run --config vitest.unit.config.mts test/unit/toolbarOverflowStrategy.test.ts
```

Expected at this baseline: TypeScript/module failure because the test imports `toolbarUsesHorizontalScroll` while the dirty source comments it out. Preserve the exact diagnostic in the session shard.

## Task 0.2 — Establish a fresh automated baseline ledger

**Do not edit production code in this task.** Run each command separately so one failure does not hide later evidence.

```powershell
pnpm run check
pnpm run lint
pnpm run format:check
pnpm run stylelint
pnpm run test:unit
pnpm run test:scorecard
```

- [ ] Classify every failure as baseline/known-dirty, environment/harness, or behavior regression.
- [ ] Never call a later gate green by excluding a failing baseline test; BT5-045 must make the overflow contract coherent again.
- [ ] Keep timing and exact command in the session shard, but do not paste entire logs into route indexes.

## Task 0.3 — Make the issue-to-test traceability ledger executable

For every issue, use these fixed evidence columns in the session shard:

```text
Issue | red test observed | production paths | focused green | check | runtime/HITL | commit
```

- [ ] Link each row to the local issue file.
- [ ] Add newly discovered variants to the existing issue rather than creating invisible acceptance in chat.
- [ ] If implementation changes dependency order, update `index.md` and the affected issue before coding across that boundary.

## Task 0.4 — Guard product and knowledge commit boundaries

- Product commits run from `C:\tmp\vaultman-release-beta2-final2` and contain no `.agents/` paths.
- Knowledge commits run only from `C:\Users\vic_A\Desktop\vaultman`, remain local, and never enter the code push range.
- Before any product commit:

```powershell
git diff --check
git status --short
git diff --name-only --cached
```

- [ ] Stage explicit product paths only.
- [ ] Verify `src/logic/logicResponsiveLayout.ts` authorship before staging until BT5-045 intentionally owns its final replacement.
- [ ] Do not commit a red or partially migrated shared seam.

## Task 0.5 — Required per-slice regression pattern

Every task in later shards follows this exact sequence:

1. Add or edit a unit/integration test expressing externally visible behavior.
2. Run only that test and verify it fails for the intended reason (not syntax or bad mocks).
3. Add the smallest implementation.
4. Run the same test green.
5. Run its related test group and `pnpm run check`.
6. Refactor only while green.
7. Run `git diff --check` and review the complete diff.
8. For HITL, install/build to the isolated test vault and capture the named matrix before marking acceptance.

Source-string tests may guard required Svelte/CSS wiring but may not be the sole proof of state transitions, measurement math, queue replacement, or adapter selection. Those require executable logic tests.

## Task 0.6 — Stable-release risk stop conditions

Stop the current slice and diagnose before proceeding if any of these occurs:

- queue operations mutate files immediately rather than on Apply;
- a provider loses its context-menu action when Iconic is absent;
- the Navbar gains a second mounted host;
- overflow order changes relative to declared action order;
- a date-only value crosses a calendar day through UTC conversion;
- hidden scrollbar plus reserve lane produces two content gutters;
- a single-click and a double-click both commit filter writes;
- a Svelte change introduces an ownership warning or stale derived state;
- the full test count drops without an intentional deletion recorded in the issue.

## Task 0.7 — Adversarial review cadence

After BT5-048, BT5-046 and BT5-057, run a fresh adversarial pass against the accumulated code:

- unknown icon-picker add-on and disabled Iconic;
- zero actions, one action, min-width and rapid resize for Navbar;
- empty/null/array/invalid frontmatter values;
- repeated checkbox/date edits before Apply;
- locale/time-zone/DST boundaries;
- mobile coarse-pointer double-tap behavior;
- plain/rail Floating Index variants;
- reopening a saved beta.6 layout without new cell IDs.

Record what remains unsupported and what quality, if any, regressed versus beta.6.
