---
title: BT5-095 — The lint gate is red and the scorecard guard is dormant
type: issue
status: needs-triage
lifecycle: active
priority: P1
execution: HITL
parent: "[[docs/work/polish/issues/v1-2-1-polish/index|v1.2.1 polish backlog]]"
dateCreated: 2026-07-29T18:52:04
dateUpdated: 2026-07-29T18:52:04
created_by: claude-opus-5
updated_by: claude-opus-5
tags: [agent/issue, triage/needs-triage, initiative/polish, release/1.2.1, tooling, ci, lint]
---

# BT5-095 — The lint gate is red and the scorecard guard is dormant

## Symptom

Root cause for why the other scorecard warnings shipped. The dev's read was that
the harness should have caught them; the mechanism is not a missing rule but a
gate that no longer gates.

Three independent failures, each verified:

### 1. The lint gate exits 1 with 263 errors

`npx eslint src` → `exit=1`, 263 problems, all severity error:

| Count | Rule |
| --- | --- |
| 90 | `@typescript-eslint/no-unsafe-call` |
| 74 | `@typescript-eslint/no-unsafe-member-access` |
| 60 | `@typescript-eslint/no-unsafe-assignment` |
| 31 | `@typescript-eslint/no-unsafe-argument` |
| 2 | `@typescript-eslint/no-unsafe-return` |
| 2 | `obsidianmd/prefer-window-timers` |
| 2 | `@typescript-eslint/no-unnecessary-type-assertion` |
| 1 | `@typescript-eslint/no-redundant-type-constituents` |
| 1 | `@typescript-eslint/no-deprecated` |

`no-unnecessary-type-assertion` — the rule behind the scorecard warnings in
[[094-unnecessary-assertions-and-create-el|BT5-094]] — **is already enabled and
already reporting**. It is simply invisible against a 263-error background.
CI runs `vp run lint` unguarded at [ci.yml:29](.github/workflows/ci.yml:29), so
either CI is red and tolerated, or it is not running on the branches that ship.
**That question needs a dev answer before this can be planned.**

### 2. The scorecard regression guard never runs, and crashes if it does

`scripts/scorecard-regression-check.mjs` was created in `6b49f8c3`
("fix(scorecard): remove CSS lint warnings", 2026-05-27) precisely to stop
scorecard findings from returning. Today:

- It is referenced from **no** `package.json` script and **no** CI workflow.
- Running it directly crashes: `ENOENT ... src/i18n/index.ts` at
  [scorecard-regression-check.mjs:107](scripts/scorecard-regression-check.mjs:107)
  — a path that no longer exists.
- Its CSS assertions cover only `!important` and `display: contents`
  ([:74-82](scripts/scorecard-regression-check.mjs:74)) — never
  `text-decoration`, so the W5 warning below was never guarded at all.
- Its own check named *"verify includes format and stylelint gates"*
  ([:90](scripts/scorecard-regression-check.mjs:90)) would fail today, see 3.
- Its compat target is written as "Obsidian 1.11.4" while `manifest.json` on
  stable already declares `minAppVersion: 1.12.0` — stale target version.

### 3. stylelint is configured but not installed

`stylelint.config.mjs` exists with a real ruleset, but `stylelint` and its two
plugins are **absent from `package.json` and from `node_modules`**, and no
`lint:css` script or CI step invokes it. CSS linting has never run.

## The W5 finding this explains

Scan warning: *"Unexpected browser feature `text-decoration` is only partially
supported by Obsidian 1.11.4"* at `styles.css:6895`, which on `main` is:

```css
.vaultman-property-value-link {
	color: var(--link-color);
	text-decoration-line: var(--link-decoration);
}
```

The dev recalled fixing this class of warning for 1.1.6 after it appeared in
1.1.1, and was surprised it returned. It returned because the 1.1.x fix was a
manual `styles.css` edit and none of the three mechanisms above was in place to
hold it. **Note the target-version question:** the warning names 1.11.4, which is
below `minAppVersion: 1.12.0`, so no installable user is affected — but the scan
keeps reporting against it, so either the scan's floor or our declared floor
needs reconciling. This is a decision, not a code fix.

## Plan

- [ ] **Dev decision:** is CI lint currently red? Choose the strategy —
      ratchet (freeze the 263 as a baseline and fail only on new errors),
      downgrade the four `no-unsafe-*` rules to warn while keeping the rest as
      errors, or burn the backlog down before re-arming the gate. Everything
      else here depends on this answer.
- [ ] Fix the guard's stale path so it runs, and wire it into `verify` + CI.
- [ ] Update the guard's compat target from 1.11.4 to the declared
      `minAppVersion`, and add the CSS properties the scan actually flags.
- [ ] Either install stylelint and wire a `lint:css` gate, or delete the orphan
      config — a config that cannot run is worse than none, it reads as covered.
- [ ] Reconcile the scan's 1.11.4 floor against `minAppVersion: 1.12.0`.

## Acceptance criteria

- [ ] `vp run lint` has a defined, enforced pass condition, and CI fails when it
      is violated.
- [ ] The scorecard guard runs in CI and fails on a reintroduced finding.
- [ ] CSS is either linted by an installed toolchain or the orphan config is gone.
- [ ] A reintroduced `text-decoration` / `display: contents` / `!important`
      regression is caught locally, not by the next Obsidian scan.
