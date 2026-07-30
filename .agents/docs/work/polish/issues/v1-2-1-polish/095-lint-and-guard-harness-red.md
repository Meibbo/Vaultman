---
title: BT5-095 — CSS compat is unguarded on stable; sandbox regressed the whole harness
type: issue
status: needs-triage
lifecycle: active
priority: P1
execution: HITL
parent: "[[docs/work/polish/issues/v1-2-1-polish/index|v1.2.1 polish backlog]]"
dateCreated: 2026-07-29T18:52:04
dateUpdated: 2026-07-29T20:14:00
created_by: claude-opus-5
updated_by: claude-opus-5
tags: [agent/issue, triage/needs-triage, initiative/polish, release/1.2.1, tooling, ci, lint]
---

# BT5-095 — CSS compat is unguarded on stable; sandbox regressed the whole harness

> **Branch-attribution correction (2026-07-29).** The first version of this issue
> reported sandbox measurements as if they described stable. `vite-plus` (`vp`)
> exists only on sandbox, so `vp run lint`, the 263-error count and the orphaned
> stylelint config are all sandbox facts. Stable's harness is intact. The two
> lines are separated below.

## Part A — stable (`main`, manifest 1.2.0): CSS compat has no guard

Stable's harness is wired correctly:

- `verify` = `lint && check && format:check && **stylelint** && build:plugin && test:unit && **test:scorecard**`
- `stylelint@17.12.0` + `stylelint-config-recommended@18.0.0` +
  `stylelint-declaration-block-no-ignored-properties@3.0.0` are real devDeps
- `stylelint: "stylelint styles.css"` and
  `test:scorecard: "node scripts/scorecard-regression-check.mjs"` both exist
- CI runs `pnpm run verify` then `pnpm run security:audit`

So the guard the dev remembered **does** run on stable. The W5 warning still got
through, and the reason is coverage, not wiring:

- `stylelint-config-recommended` carries **no browser-compatibility rule**. It
  catches invalid CSS, not "this property is only partially supported by the
  Obsidian version we target". Nothing in the preset would ever flag
  `text-decoration-line`.
- `scorecard-regression-check.mjs` asserts only `!important` and
  `display: contents` for `styles.css`
  ([:74-82](scripts/scorecard-regression-check.mjs:74)) — `text-decoration` was
  never in its list.
- Its compat target is written as "Obsidian 1.11.4" while stable's
  `manifest.json` declares `minAppVersion: 1.12.0` — a stale target that also
  makes the scan's 1.11.4 floor worth reconciling.

**Conclusion:** the 1.1.x fix was a manual `styles.css` edit, and no rule was
ever added to hold it. It regressed because it was never guarded, not because a
gate was switched off.

### Part A plan

- [ ] Add a real CSS-compat check for the declared `minAppVersion`. Options to
      weigh: a stylelint compat plugin driven by the Chromium version Obsidian
      1.12 ships, or extending the scorecard guard's property list with what the
      Obsidian scan actually flags. The guard is cheaper; the plugin generalizes.
- [ ] Update the guard's compat target from the hardcoded 1.11.4 to the declared
      `minAppVersion`.
- [ ] Reconcile the scan's 1.11.4 floor against `minAppVersion: 1.12.0` — decide
      whether to raise the manifest floor, or accept the warning as
      out-of-support noise and record that decision so the next scan does not
      re-open this.
- [ ] Measure stable's own `eslint .` baseline. Unknown today; stable runs
      `eslint@9.39.4` + `typescript-eslint@8.35.1`, different majors from
      sandbox, so the sandbox count below does not transfer.

## Part B — sandbox: the vite-plus migration dropped the harness

Sandbox is measurably worse than stable, and this is assimilation debt for the
eventual `vp` merge into main rather than 1.2.1 patch work.

| Gate | stable | sandbox |
| --- | --- | --- |
| stylelint installed | ✅ 17.12.0 + 2 plugins | ❌ absent from `package.json` and `node_modules` |
| stylelint wired | ✅ in `verify` | ❌ no `stylelint` script, no CI step |
| scorecard guard wired | ✅ `test:scorecard` in `verify` | ❌ referenced by no script and no workflow |
| scorecard guard runs | ✅ (paths valid) | ❌ crashes: `ENOENT ... src/i18n/index.ts` at [:107](scripts/scorecard-regression-check.mjs:107) |

`stylelint.config.mjs` still sits in the sandbox root with a full ruleset, which
reads as coverage while linting nothing — worse than having no config.

The guard crashes on sandbox specifically because sandbox reorganized `src/` and
the guard still points at pre-reorganization paths. Its check named
*"verify includes format and stylelint gates"*
([:90](scripts/scorecard-regression-check.mjs:90)) would also fail on sandbox,
since there is no stylelint gate to find.

### Sandbox eslint baseline

`npx eslint src` on sandbox → `exit=1`, 263 problems, all severity error:

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

`no-unnecessary-type-assertion` is **already enabled** here (via
`obsidianmd/recommended`) and already reporting — invisible against a 263-error
background. Sandbox CI runs `vp run lint` unguarded at
[ci.yml:29](.github/workflows/ci.yml:29), so sandbox CI is either red and
tolerated or not running on the branches that matter.

### Part B plan

- [ ] **Dev decision:** is sandbox CI currently red? Pick the strategy — ratchet
      a 263 baseline and fail only on new errors, downgrade the four
      `no-unsafe-*` rules to warn while the rest stay errors, or burn the
      backlog down before re-arming. Everything else here waits on this.
- [ ] Restore the stylelint gate on sandbox under `vp`, or delete the orphan
      config.
- [ ] Fix the guard's stale paths for the reorganized `src/`, and wire
      `test:scorecard` into the sandbox `verify` chain.
- [ ] Add both gates to the `vp`-assimilation checklist so the merge into main
      cannot silently drop them again.

## Acceptance criteria

- [ ] A reintroduced `text-decoration` / `display: contents` / `!important`
      regression is caught locally on stable, not by the next Obsidian scan.
- [ ] The guard's compat target tracks the declared `minAppVersion`.
- [ ] Sandbox has a stylelint gate and a running scorecard guard, or an explicit
      recorded decision that it will regain them at assimilation.
- [ ] Both lines have a defined, enforced lint pass condition and CI fails when
      it is violated.
