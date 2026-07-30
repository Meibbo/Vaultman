---
title: Session — beta.2 release and multichannel automation
type: session
status: complete
created: 2026-07-17
created_by: codex-gpt5-release-beta2
tags:
  - release/beta
  - release/automation
  - vaultman/1.2
---

# 2026-07-17 — beta.2 release and multichannel automation

## Outcome

- Published `1.2.0-beta.2` from `dev` at `5e5fa1df0829c0616a2f73bca8ebe9c126606c24`.
- GitHub prerelease: https://github.com/Meibbo/Vaultman/releases/tag/1.2.0-beta.2
- Release workflow: https://github.com/Meibbo/Vaultman/actions/runs/29570726976 — success, 1m31s, required assets and attestations produced.
- `main.js`, `manifest.json`, and `styles.css` in plugin-dev match the release build by SHA-256. No visual/UI/Obsidian/mobile testing was run; developer owns that validation.

## Public commits

- `c7c7da26 feat(beta): complete 1.2 beta.2 explorer fixes`
- `97b263e1 feat(release): automate multichannel publishing`
- `09064fb1 fix(release): report slow preflight progress`
- `f4d331b3 fix(release): avoid non-interactive gh auth hang`
- `f2f8b15b fix(release): accept pnpm argument separator`
- `533d93e2 fix(release): invoke Corepack safely on Windows`
- `79122957 test(release): remove redundant raw-source assertion`
- `3f044ada fix(tooling): normalize Svelte checkout line endings`
- `e5b9b4d3 fix(tooling): normalize all text checkouts`
- `5e5fa1df chore(release): prepare 1.2.0-beta.2`

## Release CLI

- `pnpm release -- stable 1.2`: promote `1.2.0` if prerelease-only, otherwise next stable patch in line.
- `pnpm release -- beta 1.3`: next `1.3.0-beta.N`.
- `pnpm release -- alpha 1.3`: next `1.3.0-alpha.N` while the core has not reached beta.
- `pnpm release -- 1.3.0-beta.4`: validate an explicit higher version without silently rewriting it.
- Supports `--dry-run`, `--prepare-only`, and `--yes`; validates expected branch, upstream ancestry, forbidden AI paths, GitHub state, reviewed fragments, version metadata, local gates, workflow conclusion, prerelease/stable flags, and assets.
- Uses argument-array child processes with `shell:false`; Windows invokes Corepack's JS entry point through `node.exe` rather than executing `corepack.cmd`.
- `changes/X.Y/*.md` isolates release notes per train. Prereleases keep cumulative fragments; stable consumes them into CHANGELOG.

## Verification

- Local release gate: lint; TypeScript/Svelte `0/0`; Prettier; Stylelint; production bundle; 92 unit files / 472 tests; scorecard 17; production audit zero known vulnerabilities; build and plugin-dev sync.
- CI repeated install, verify, audit, build, asset preparation, attestation, upload, and GitHub Release publication successfully.
- `HEAD == origin/dev == tag` at `5e5fa1df`.
- Release assets: `main.js` 507,619 bytes, `manifest.json` 291 bytes, `styles.css` 142,541 bytes.

## Compatibility and preserved work

- `minAppVersion` remains Obsidian `1.12.0`.
- `.gitattributes` now declares `* text=auto eol=lf` so clean Windows worktrees do not break Prettier or multiline raw-source tests under global `core.autocrlf=true`.
- Concurrent uncommitted edits to `README.md` and `navbarFilters.svelte` in the original implementation worktree were never staged, committed, overwritten, or published.
- Agent specs/plans/policy/session memory remain local-only under `.agents`.
