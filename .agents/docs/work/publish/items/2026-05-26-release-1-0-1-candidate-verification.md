---
title: Release 1.0.1 candidate verification
type: verification-record
status: released
parent: "[[docs/work/publish/index|Publish]]"
created: 2026-05-27T00:28:49-05:00
updated: 2026-05-27T12:55:00-05:00
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

## PR #25 merge

- PR: <https://github.com/Meibbo/Vaultman/pull/25>
- PR branch: `release/1.0.1-main-pr`
- PR base: `main`
- PR head: `2793c89 chore(release): restore stable 1.0.1 line`
- State: merged.
- Merged at: `2026-05-27T07:48:39Z`.
- Merged by: `Meibbo`.
- Merge commit on `main`: `8fac770481220ca7c43ff78a70d897a62dc136ec`
  (`chore: release 1.0.1 from the stable 1.0.0 line`).
- Reason for PR branch split: GitHub rejected a direct PR from `release/1.0.1-from-1.0.0` because that branch has no history in common with current `main`. The mergeable PR branch starts from `origin/main` and restores the verified candidate tree.
- Admin bypass rationale: repository ruleset required one approving review and
  auto-merge was disabled. The PR was mergeable, required checks were passing,
  and the user explicitly authorized the admin merge bypass.

## Commits

1. `e1440a9 test(scorecard): add release regression scan`
2. `0571060 chore(release): prepare 1.0.1 branch workflow`
3. `e8ad49c fix(scorecard): resolve Obsidian source warnings`
4. `39135cb chore(release): set stable version 1.0.1`
5. `5c98d70 chore(security): resolve release audit findings`

## Verification passed

### Original candidate branch

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

### Mergeable PR branch

- `npm ci --no-audit --no-fund --prefer-offline`
- `npm run verify`
- `npm run security:audit`
- `git diff --check origin/main..HEAD`
- AI-file diff guard against `AGENTS.md`, `CLAUDE.md`, `.agents/`, `.claude/`
- GitHub checks on PR #25:
  - `Guard main against AI workflow files`: pass
  - `verify`: pass
  - `Analyze (javascript-typescript)`: pass
  - `CodeQL`: pass
  - `CodeRabbit`: pass

### Published release

- Tag: `1.0.1` pushed to
  `8fac770481220ca7c43ff78a70d897a62dc136ec`.
- Release workflow run:
  <https://github.com/Meibbo/Vaultman/actions/runs/26526886518>
  - Event: push to tag `1.0.1`.
  - Conclusion: success.
  - Gates passed: `npm ci`, `npm run verify`, `npm run security:audit`,
    `npm run build:plugin`, asset preparation, artifact attestation, release
    bundle upload, and GitHub Release publication.
- GitHub Release: <https://github.com/Meibbo/Vaultman/releases/tag/1.0.1>
  - Name: `1.0.1`.
  - Published at: `2026-05-27T17:16:52Z`.
  - Draft: false.
  - Prerelease: false.
- Published assets:
  - `main.js` size `227208`, SHA256
    `06A4B4879DACAC14BDDC90137F0C84073E0E3789A612FC074FD94BEE550EBC35`.
  - `manifest.json` size `284`, SHA256
    `6CCC9D97846B8563290136074F3DF8081071E8C384C6A3626BDE224D65CED3A5`.
  - `styles.css` size `95169`, SHA256
    `EEEF8075ECF9C7C7130322590C8CE03189AFEDE98B0A97299AB0F65896530AED`.
- Downloaded `manifest.json` confirms:
  - `id`: `vaultman`
  - `name`: `Vaultman`
  - `version`: `1.0.1`
  - `minAppVersion`: `1.12.0`
  - `isDesktopOnly`: `false`
  - `description`: `Files, content and frontmatter explorer like Bases with scoped queued changes list.`
- Attestation verification passed for `main.js`, `manifest.json`, and
  `styles.css` with:
  - predicate type: `https://slsa.dev/provenance/v1`
  - source repository: `https://github.com/Meibbo/Vaultman`
  - source ref: `refs/tags/1.0.1`
  - source SHA: `8fac770481220ca7c43ff78a70d897a62dc136ec`
- Non-blocking release-run annotation: GitHub warns that one pinned action still
  runs on Node.js 20. The run succeeded, but future workflow maintenance should
  update pinned action SHAs or opt into Node.js 24 before GitHub removes Node.js
  20 runner support.

### Release metadata correction

- Release `1.1.0` was edited to avoid stable-channel confusion:
  - URL: <https://github.com/Meibbo/Vaultman/releases/tag/1.1.0>
  - Tag: `1.1.0`
  - Name: `1.1.0-beta.1`
  - Draft: false
  - Prerelease: true
  - Target: `8d5c4fd61a6e1840cb74e8523ca46312f20936ec`
- Release `1.0.1` was edited so its title is the bare version:
  - Name: `1.0.1`
  - Draft: false
  - Prerelease: false
  - Latest: true, as reported by `gh release list`
- Note: the `1.1.0` Git tag still exists as `1.1.0`; this operation changed
  GitHub Release metadata only. A future true stable `1.1.0` would require an
  explicit tag/release strategy decision.

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

## Performed

- Pushed source candidate branch `release/1.0.1-from-1.0.0`.
- Created mergeable PR branch `release/1.0.1-main-pr`.
- Opened PR #25 to `main`.
- Merged PR #25 to `main` with explicit user-approved admin bypass.
- Created and pushed tag `1.0.1`.
- Published GitHub Release `1.0.1`.
- Verified release assets and artifact attestations.
- Marked existing GitHub Release `1.1.0` as prerelease and renamed it
  `1.1.0-beta.1`.
- Renamed GitHub Release `1.0.1` to bare title `1.0.1`.

## Remaining not performed

- No branch cleanup.
- No tag rename, tag delete, or tag retarget.

## Next release-management actions

After explicit user approval:

1. Decide whether to preserve, delete, or otherwise handle the existing
   `1.1.0` tag before any future stable `1.1.0` plan.
2. Clean up temporary release branches only if desired.
3. Schedule the pinned-action Node.js 20 warning as workflow maintenance.

The original pushed branch `release/1.0.1-from-1.0.0` remains as the verified
source candidate but is not the mergeable PR branch.
