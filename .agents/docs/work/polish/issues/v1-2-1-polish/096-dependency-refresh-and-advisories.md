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

**All 19 report `scope: development`.** The shipped artifact is a bundled `main.js`, so none of these reaches a user's Obsidian — the exposure is the build machine and CI, which is real supply-chain surface but not a user-facing vulnerability. Worth saying explicitly when the badge count is the motivation:
clearing it is repo hygiene, not a user security fix.

Sandbox already pins four of these families through `pnpm.overrides` (`esbuild`, `js-yaml`, `undici`, `vite`), so those alerts are stable-only and will resolve when sandbox's override block lands. `brace-expansion`, `fast-uri` and `tar` are covered by neither line.

## Sandbox's own audit is also failing

`scripts/security-audit.mjs` on sandbox:

- `--scope=prod` → `high:3` — `immutable` ×2 (patched ≥5.1.8), `postcss` (patched ≥8.5.18). Traced with `pnpm why` to `sass@1.99.0` and to `vite`/`svelte-preprocess`/`vite-plus` — all devDependency paths.
- `--scope=dev` → **13 advisories at high+**, adding `fast-uri` ×2, `fast-xml-parser` (≥5.10.1) and `tar` ×4 (≥7.5.21 covers the set).

So sandbox's overrides do not make it clean; they cover a different subset than the one GitHub reports for stable. Neither line is green.

## The badge undercounts, and the audit is prod-only by construction

Measured by the parallel agent (`claude-opus-5`) from a clean `main` worktree @ `b30f8f23`; recorded here rather than re-derived.

- `pnpm audit --prod --audit-level=high` on main → **clean, exit 0**. That is exactly what `security:audit` runs on this line, so the whole dev-scope backlog is invisible to stable's own gate **by construction**, not by accident.
- `pnpm audit` without `--prod` → **27 vulnerabilities**: 1 critical, 14 high, 7 moderate, 5 low.
- The critical is `tar` GHSA-23hp-3jrh-7fpw (vulnerable ≤ 7.5.18, patched ≥ 7.5.19). **Dependabot reports it as medium**, so the panel badge *understates* the worst finding. Anyone triaging by badge severity alone will mis-rank this.

### Two vulnerable paths enter through the lint toolchain itself

- `eslint-plugin-obsidianmd > eslint-plugin-json-schema-validator > ajv > fast-uri`
- `stylelint > table > ajv > fast-uri`

This changes the framing of the `eslint-plugin-obsidianmd` 0.3.0 → 0.4.1 bump elsewhere in this issue: it is not only maintenance hygiene, it is one of the two routes carrying a vulnerable transitive. Same for `stylelint`, which stable deliberately keeps wired.

## The 13 open PRs

11 of the 13 are Dependabot. Every sampled one is **already satisfied or exceeded on sandbox**:

| PR | Package | PR target | sandbox has |
| --- | --- | --- | --- |
| #34, #30 | `esbuild` | 0.28.1 / 0.28.0 | `^0.28.1` |
| #31 | `mocha` | 11.7.6 | `^11.7.6` |
| #19 | `globals` | 17.6.0 | `17.6.0` |
| #18 | `@eslint/js` | 10.0.1 | `^10.0.1` |
| #29 | `@wdio/local-runner` | 9.27.2 | `^9.29.0` (ahead) |

The rest are GitHub Actions bumps (#39 `codeql-action/analyze`, #36 `actions/checkout`, #33 `codeql-action`, #28 `actions/setup-node`, #26 `release-please-action`) which are workflow-file changes independent of either branch's `package.json`.

Non-Dependabot: **#40** `chore(main): release 1.2.0` (release-please) and **#35** `Adjust image size and update Table of Contents links` (dev's own).

### Dev decision (2026-07-29)

Port the devDependencies from sandbox to main, then **close** the dependency PRs without accepting them. Two constraints found while scoping that port:

1. **#40 and #35 must not be closed.** #40 is release-please's `chore(main): release 1.2.0` (author `app/github-actions`) — closing it breaks the release automation. #35 is the dev's own PR. Only the 11 Dependabot PRs are in scope, and only 6 of those are `package.json` changes.
2. **The eslint family is coupled and is a major bump.** #18 raises `@eslint/js` to 10.0.1, but no PR raises `eslint` itself, which main pins at 9.39.4.
   `@eslint/js` 10 pairs with eslint 10; sandbox works because it carries both at 10.x. So "port sandbox's devDeps" means taking eslint 9.39.4 → 10.5.0 and `typescript-eslint` 8.35.1 → 8.61.1 on stable. A major eslint bump will move main's lint baseline — the number nobody has measured yet (see BT5-095 Part A).

| Group | PRs | Portable from sandbox? |
| --- | --- | --- |
| Uncoupled devDeps: `esbuild`, `mocha`, `@wdio/local-runner`, `globals` | #34, #30, #31, #29, #19 | Yes, low risk |
| eslint family: `@eslint/js` + `eslint` + `typescript-eslint` | #18 | Only as a gated major bump |
| GitHub Actions pins | #39, #36, #33, #28, #26 | Not a `package.json` change. Sandbox pins actions by **commit SHA** rather than version tag, so porting sandbox's workflow refs resolves these — a separate workflow change. |

**Sequencing this implies:** measure main's eslint baseline first, then port the uncoupled four, then treat the eslint major as its own gated step, then close the
11. Closing before the port would drop the badge count while leaving stable's lockfile stale.

## The outdated lint plugin does not explain the scan findings

| Package | stable | sandbox | Latest | Verdict |
| --- | --- | --- | --- | --- |
| `eslint-plugin-obsidianmd` | 0.3.0 | 0.3.0 | **0.4.1** | outdated on both |
| `obsidian` | 1.12.3 | 1.13.1 | 1.13.1 | stable behind (see BT5-093) |
| `eslint` | 9.39.4 | 10.5.0 | — | different majors |
| `typescript-eslint` | 8.35.1 | 8.61.1 | — | stable behind |

0.4.0 (2026-06-30) was a maintainer handoff (`joethei` → `lishid`) plus an ESLint `>=9.19.0` floor and dependency bumps; 0.4.1 (2026-07-02) added no substantive rules. So the bump would **not** have caught the `getSettingDefinitions` warning ([[093-declarative-settings-api|BT5-093]]), and the assertion findings come from `typescript-eslint`, which was already installed and already reporting. Do the bump as maintenance, not as a fix.

## Plan

- [ ] **Dev decision:** merge vs close the 6 dev-dependency PRs, given sandbox already exceeds all of them and `vp` will rewrite stable's toolchain.
- [ ] Merge the 5 GitHub Actions bumps — branch-independent, low risk, and they also feed the `TokenPermissionsID` scorecard findings in [[097-code-scanning-alerts|BT5-097]].
- [ ] Cover `brace-expansion`, `fast-uri` and `tar` on both lines — neither has them pinned. `tar` ≥7.5.21 clears all four of its advisories.
- [ ] Add `immutable` ≥5.1.8, `postcss` ≥8.5.18, `fast-xml-parser` ≥5.10.1 to sandbox's existing `pnpm.overrides` block.
- [ ] Bump `eslint-plugin-obsidianmd` to 0.4.1 on both lines; treat any new findings as separate items.
- [ ] Re-run `security:audit` for prod **and** dev on both lines — `verify` runs both scopes, and only prod was checked in the first pass.
- [ ] Resolve #40 (release 1.2.0) and #35 (dev's docs PR) — neither is a dependency concern, but both count toward the "repo looks clean" goal.

## Acceptance criteria

- [ ] `security:audit` passes at `fail-level=high` for prod and dev on both lines.
- [ ] Dependabot's open-alert count is zero, or each survivor has a recorded reason (dev-scope-only being a legitimate one).
- [ ] No stale dependency PRs remain open.
- [ ] Build, unit, component and integration suites green after the bumps.
