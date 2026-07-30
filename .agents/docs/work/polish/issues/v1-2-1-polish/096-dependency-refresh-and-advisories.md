---
title: "BT5-096 — Dependency refresh: 19 Dependabot alerts, 13 stale PRs, obsidianmd bump"
type: issue
status: needs-triage
lifecycle: active
priority: P2
execution: HITL
parent: "[[docs/work/polish/issues/v1-2-1-polish/index|v1.2.1 polish backlog]]"
dateCreated: 2026-07-29T18:52:04
dateUpdated: 2026-07-29T20:14:00
created_by: claude-opus-5
updated_by: claude-opus-5
tags: [agent/issue, triage/needs-triage, initiative/polish, release/1.2.1, dependencies, security]
---

# BT5-096 — Dependency refresh: 19 Dependabot alerts, 13 stale PRs, obsidianmd bump

> **Branch-attribution correction (2026-07-29).** The first version quoted a
> sandbox `pnpm why` trace (`immutable ← sass ← vite-plus`) as if it described
> stable. `vite-plus` is sandbox-only, so stable's graph differs. GitHub's alerts
> are against the default branch. Both are separated below.

## GitHub's view (default branch): 19 alerts, every one dev-scope

Queried via `gh api repos/Meibbo/Vaultman/dependabot/alerts?state=open`:

| Package | Alerts | Severities |
| --- | --- | --- |
| `undici` | 9 | 2 high, 3 medium, 4 low |
| `brace-expansion` | 3 | 3 high |
| `fast-uri` | 2 | 2 high |
| `vite` | 2 | 1 high, 1 medium |
| `tar` | 1 | 1 medium |
| `js-yaml` | 1 | 1 high |
| `esbuild` | 1 | 1 low |

**All 19 report `scope: development`.** The shipped artifact is a bundled
`main.js`, so none of these reaches a user's Obsidian — the exposure is the build
machine and CI, which is real supply-chain surface but not a user-facing
vulnerability. Worth saying explicitly when the badge count is the motivation:
clearing it is repo hygiene, not a user security fix.

Sandbox already pins four of these families through `pnpm.overrides`
(`esbuild`, `js-yaml`, `undici`, `vite`), so those alerts are stable-only and
will resolve when sandbox's override block lands. `brace-expansion`, `fast-uri`
and `tar` are covered by neither line.

## Sandbox's own audit is also failing

`scripts/security-audit.mjs` on sandbox:

- `--scope=prod` → `high:3` — `immutable` ×2 (patched ≥5.1.8), `postcss`
  (patched ≥8.5.18). Traced with `pnpm why` to `sass@1.99.0` and to
  `vite`/`svelte-preprocess`/`vite-plus` — all devDependency paths.
- `--scope=dev` → **13 advisories at high+**, adding `fast-uri` ×2,
  `fast-xml-parser` (≥5.10.1) and `tar` ×4 (≥7.5.21 covers the set).

So sandbox's overrides do not make it clean; they cover a different subset than
the one GitHub reports for stable. Neither line is green.

## The 13 open PRs

11 of the 13 are Dependabot. Every sampled one is **already satisfied or
exceeded on sandbox**:

| PR | Package | PR target | sandbox has |
| --- | --- | --- | --- |
| #34, #30 | `esbuild` | 0.28.1 / 0.28.0 | `^0.28.1` |
| #31 | `mocha` | 11.7.6 | `^11.7.6` |
| #19 | `globals` | 17.6.0 | `17.6.0` |
| #18 | `@eslint/js` | 10.0.1 | `^10.0.1` |
| #29 | `@wdio/local-runner` | 9.27.2 | `^9.29.0` (ahead) |

The rest are GitHub Actions bumps (#39 `codeql-action/analyze`, #36
`actions/checkout`, #33 `codeql-action`, #28 `actions/setup-node`, #26
`release-please-action`) which are workflow-file changes independent of either
branch's `package.json`.

Non-Dependabot: **#40** `chore(main): release 1.2.0` (release-please) and **#35**
`Adjust image size and update Table of Contents links` (dev's own).

**The decision this needs:** merging the dev-dependency PRs into stable duplicates
work that sandbox already did, and merging into a branch that `vp` will later
replace may just create conflicts. Closing them makes the badge count drop but
leaves stable's lockfile stale if the sandbox merge slips. That trade-off is the
dev's call, and it drives whether this issue is "merge 11 PRs" or "close 6, merge
the 5 Actions bumps".

## The outdated lint plugin does not explain the scan findings

| Package | stable | sandbox | Latest | Verdict |
| --- | --- | --- | --- | --- |
| `eslint-plugin-obsidianmd` | 0.3.0 | 0.3.0 | **0.4.1** | outdated on both |
| `obsidian` | 1.12.3 | 1.13.1 | 1.13.1 | stable behind (see BT5-093) |
| `eslint` | 9.39.4 | 10.5.0 | — | different majors |
| `typescript-eslint` | 8.35.1 | 8.61.1 | — | stable behind |

0.4.0 (2026-06-30) was a maintainer handoff (`joethei` → `lishid`) plus an
ESLint `>=9.19.0` floor and dependency bumps; 0.4.1 (2026-07-02) added no
substantive rules. So the bump would **not** have caught the
`getSettingDefinitions` warning ([[093-declarative-settings-api|BT5-093]]), and
the assertion findings come from `typescript-eslint`, which was already
installed and already reporting. Do the bump as maintenance, not as a fix.

## Plan

- [ ] **Dev decision:** merge vs close the 6 dev-dependency PRs, given sandbox
      already exceeds all of them and `vp` will rewrite stable's toolchain.
- [ ] Merge the 5 GitHub Actions bumps — branch-independent, low risk, and they
      also feed the `TokenPermissionsID` scorecard findings in
      [[097-code-scanning-alerts|BT5-097]].
- [ ] Cover `brace-expansion`, `fast-uri` and `tar` on both lines — neither has
      them pinned. `tar` ≥7.5.21 clears all four of its advisories.
- [ ] Add `immutable` ≥5.1.8, `postcss` ≥8.5.18, `fast-xml-parser` ≥5.10.1 to
      sandbox's existing `pnpm.overrides` block.
- [ ] Bump `eslint-plugin-obsidianmd` to 0.4.1 on both lines; treat any new
      findings as separate items.
- [ ] Re-run `security:audit` for prod **and** dev on both lines — `verify` runs
      both scopes, and only prod was checked in the first pass.
- [ ] Resolve #40 (release 1.2.0) and #35 (dev's docs PR) — neither is a
      dependency concern, but both count toward the "repo looks clean" goal.

## Acceptance criteria

- [ ] `security:audit` passes at `fail-level=high` for prod and dev on both lines.
- [ ] Dependabot's open-alert count is zero, or each survivor has a recorded
      reason (dev-scope-only being a legitimate one).
- [ ] No stale dependency PRs remain open.
- [ ] Build, unit, component and integration suites green after the bumps.
