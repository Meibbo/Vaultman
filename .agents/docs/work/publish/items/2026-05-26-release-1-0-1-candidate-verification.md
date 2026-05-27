---
title: Release 1.0.1 candidate verification
type: verification-record
status: ready-for-user-release-approval
parent: "[[docs/work/publish/index|Publish]]"
created: 2026-05-27T00:28:49-05:00
updated: 2026-05-27T00:28:49-05:00
tags:
  - agent/verification
  - initiative/publish
  - release/1-0-1
  - obsidian/scorecard
created_by: codex
updated_by: codex
---

# Release 1.0.1 candidate verification

## Candidate

- Worktree: `.claude/worktrees/release-1.0.1-from-1.0.0`
- Branch: `release/1.0.1-from-1.0.0`
- Base: tag `1.0.0` (`b75706b chore: prepare release 1.0.0`)
- Head: `5c98d70 chore(security): resolve release audit findings`
- Product version: `package.json`, `manifest.json`, and `versions.json` set to `1.0.1`.
- Main-branch AI guard: release worktree contains no `AGENTS.md`, `CLAUDE.md`, `.agents/`, or `.claude/`.

## Commits

1. `e1440a9 test(scorecard): add release regression scan`
2. `0571060 chore(release): prepare 1.0.1 branch workflow`
3. `e8ad49c fix(scorecard): resolve Obsidian source warnings`
4. `39135cb chore(release): set stable version 1.0.1`
5. `5c98d70 chore(security): resolve release audit findings`

## Verification passed

- `npm ci --no-audit --no-fund --prefer-offline`
- `npm run verify`
  - `npm run lint`
  - `npm run check`
  - `npm run build:plugin`
  - `npm run test:scorecard`
- `npm run security:audit`
- `git diff --check 1.0.0..HEAD`
- Manual release asset staging:
  - `dist/release/main.js` size `227214`, SHA256 `25F5A86BA7BACC02BD74350F6866F9C5EADCBE0EF6F83E92630F9D3462A28C0B`
  - `dist/release/styles.css` size `99785`, SHA256 `3AD13565D58F0614C3F32C64B57AA8246FB79F77B15B5EB9478CF6D177115867`
  - `dist/release/manifest.json` size `291`, SHA256 `D2605C48FC1871536A97B5B377A84C4408149D17BEDC2326F906266C1552EB07`
- Release workflow scan confirms `actions/attest` covers:
  - `dist/release/main.js`
  - `dist/release/manifest.json`
  - `dist/release/styles.css`

## Scorecard fixes covered

- Manifest description now ends with punctuation.
- `src/i18n/index.ts` uses Obsidian `getLanguage()` and no longer disables `no-restricted-globals`.
- `src/svelte.d.ts` no longer disables `@typescript-eslint/no-explicit-any`.
- Popout-compatible globals use `activeDocument`, `window.requestAnimationFrame`, `window.setTimeout`, and `window.clearTimeout` where Scorecard flagged them.
- Unnecessary assertions and unsafe `frontmatter` assignment in flagged TypeScript paths were removed.
- CI/release workflows are npm-based and publish `main.js`, `manifest.json`, and `styles.css`.

## Integration-test note

`npm run test:integrity` remains a local Obsidian desktop integration harness, not a GitHub release gate. It was removed from CI because it depends on a running Obsidian/CLI environment and is not a reproducible hosted-runner check. During this session:

- Before syncing the build, it failed with `No build found`.
- With `obsidian-integration-testing@1.3.2`, it failed because the package imports a missing `dist/lib/esm/vitest.ts`.
- After updating to `obsidian-integration-testing@4.1.6`, it started but hung locally in the harness and was stopped after timeout.

The release candidate therefore treats `verify` plus `security:audit` as the reproducible release gates, and leaves the desktop integration harness as a separate follow-up.

## Not performed

- No push.
- No PR creation.
- No merge to `main`.
- No tag creation.
- No GitHub Release creation or edit.
- No change to the existing `1.1.0` GitHub Release.

## Next release-management actions

After explicit user approval:

1. Push `release/1.0.1-from-1.0.0`.
2. Open a PR to `main`, confirming the PR contains zero AI workflow files.
3. After merge, tag `1.0.1` on `main`.
4. Let `.github/workflows/release.yml` publish assets and artifact attestations.
5. Verify the GitHub Release assets and attestations.
6. Only then decide how to mark the existing `1.1.0` release as prerelease/superseded.
