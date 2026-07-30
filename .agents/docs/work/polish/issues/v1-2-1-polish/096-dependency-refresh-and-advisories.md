---
title: "BT5-096 — Dependency refresh: 3 high advisories + outdated obsidianmd plugin"
type: issue
status: needs-triage
lifecycle: active
priority: P2
execution: AFK
parent: "[[docs/work/polish/issues/v1-2-1-polish/index|v1.2.1 polish backlog]]"
dateCreated: 2026-07-29T18:52:04
dateUpdated: 2026-07-29T18:52:04
created_by: claude-opus-5
updated_by: claude-opus-5
tags: [agent/issue, triage/needs-triage, initiative/polish, release/1.2.1, dependencies, security]
---

# BT5-096 — Dependency refresh: 3 high advisories + outdated obsidianmd plugin

## Symptom

The dev's read — that the GitHub security warnings and the scorecard findings
point at the same staleness — is half right, and the split matters.

### Security advisories: real, and all build-time

`node scripts/security-audit.mjs --scope=prod --report-level=moderate --fail-level=high`
fails with `high:3`:

| Advisory | Package | Installed | Patched in |
| --- | --- | --- | --- |
| GHSA-v56q-mh7h-f735 | `immutable` | 5.1.5 | ≥ 5.1.8 |
| GHSA-xvcm-6775-5m9r | `immutable` | 5.1.5 | ≥ 5.1.8 |
| GHSA-r28c-9q8g-f849 | `postcss` | 8.5.16 | ≥ 8.5.18 |

Both are 32-bit-trie / hash-collision DoS in `immutable`, and a source-map path
traversal in `postcss`. Provenance traced with `pnpm why`:

- `immutable@5.1.5` ← `sass@1.99.0` ← `vite-plus`, `esbuild-sass-plugin`,
  `sass-embedded`
- `postcss@8.5.16` ← `vite@8.0.16`, `svelte-preprocess`, `vite-plus`;
  `postcss@8.5.13` ← `depcheck`

**Every path runs through `devDependencies`.** The shipped artifact is a bundled
`main.js`, so none of these three reaches a user's Obsidian — the exposure is the
build machine and CI, not the plugin. That lowers urgency but does not make it
cosmetic: a source-map path traversal in the bundler's own toolchain is a
supply-chain surface, and the audit is a `fail-level=high` gate, so it is red.

Both fixes are patch bumps. The repo already carries the exact convention for
pinning a transitive — `pnpm.overrides` in `package.json` currently pins
`esbuild`, `js-yaml`, `undici` and `vite` — so this follows an established
pattern rather than inventing one.

### The outdated lint plugin: real, but does not explain the scan findings

| Package | Installed | Latest | Verdict |
| --- | --- | --- | --- |
| `eslint-plugin-obsidianmd` | 0.3.0 | **0.4.1** | outdated (0.4.0 2026-06-30, 0.4.1 2026-07-02) |
| `obsidian` | 1.13.1 | 1.13.1 | current |
| `eslint` | 10.5.0 | — | current major |
| `typescript-eslint` | 8.61.1 | — | current major |

0.4.0 was a maintainer handoff (`joethei` → `lishid`) plus an ESLint `>=9.19.0`
floor and dependency bumps; **no substantive rule additions**. So bumping it
would *not* have caught the `getSettingDefinitions` warning
([[093-declarative-settings-api|BT5-093]]) and would not have changed the
assertion findings either — those come from `typescript-eslint`, already
installed and already reporting. Worth doing for maintenance, not as a fix for
the scan.

## Plan

- [ ] Pin `immutable` ≥ 5.1.8 and `postcss` ≥ 8.5.18 via `pnpm.overrides`,
      matching the existing override style; prefer a plain `pnpm update` first if
      the lockfile resolves clean without pinning.
- [ ] Re-run `security:audit` for both `--scope=prod` and `--scope=dev` — the
      `verify` chain runs both and only prod was checked here.
- [ ] Bump `eslint-plugin-obsidianmd` to 0.4.1 and re-run lint; treat any new
      findings as separate items rather than folding them in.
- [ ] Reconcile against GitHub's Dependabot alert list — the dev reports "too
      many" there, and this audit only covers what the repo script scopes. If the
      GitHub list is longer, the delta is its own finding.

## Acceptance criteria

- [ ] `security:audit` passes at `fail-level=high` for prod and dev scopes.
- [ ] `eslint-plugin-obsidianmd` at 0.4.1 with lint output unchanged or
      explained.
- [ ] Build, unit, component and integration suites green after the bumps.
- [ ] The GitHub advisory count is either cleared or each remaining item has a
      recorded reason.

## Notes

Does not unblock [[095-lint-and-guard-harness-red|BT5-095]] and is not blocked by
it — the 263-error lint baseline is a config/gate question, unrelated to
dependency versions.
