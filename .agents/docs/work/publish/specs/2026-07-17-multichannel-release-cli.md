---
title: Multichannel release CLI
type: spec
status: approved
created: 2026-07-17
created_by: codex-gpt5-release-beta2
tags:
  - release/automation
  - release/alpha
  - release/beta
  - release/stable
---

# Multichannel release CLI

## Objective

Provide one safe package command that can calculate, prepare, push, and verify Vaultman
alpha, beta, and stable releases while supporting concurrent release trains such as
stable patches on `1.2.x`, betas on `1.3.0`, and alphas on a later train.

The default command is interactive:

```bash
pnpm release -- <channel-or-exact-version> [line]
```

Examples:

```bash
pnpm release -- stable 1.2
pnpm release -- beta 1.3
pnpm release -- alpha 2.0
pnpm release -- 1.3.0-beta.4
```

## Version model

- Tags are the authoritative release ledger. GitHub release metadata is checked for
  drift, but a historical display name or prerelease flag never replaces tag SemVer.
- Version monotonicity is evaluated inside a release train, not against one global
  maximum. `1.2.2` remains a valid maintenance release while `1.3.0-beta.3` exists.
- `stable X.Y` selects `X.Y.0` when promoting prereleases and no stable `X.Y.0` exists;
  otherwise it selects the next `X.Y.Z` patch.
- `beta X.Y` selects the next `X.Y.0-beta.N`. It is forbidden after stable `X.Y.0`.
- `alpha X.Y` selects the next `X.Y.0-alpha.N`. It is forbidden after a beta, RC, or
  stable release of the same core.
- An explicit version is validated and never silently rewritten. On failure the CLI
  prints the calculated safe version and exits without mutating files.
- Branch mapping is `sandbox` -> alpha, `dev` -> beta, `main` -> stable.
- Tags must be unique locally and remotely. The target branch must be synchronized and
  the public diff must contain no AI workflow files.

This generalizes the current policy from only `2.0.0-alpha.N` to `X.Y.0-alpha.N` while
retaining alpha instability warnings and prerelease distribution constraints.

## Release-note fragments

Pending user-facing changes live in public `changes/` fragments, partitioned by train.
Each fragment declares a line, Keep a Changelog category, and user-facing text. Release
automation selects only the requested line.

- Alpha and beta publication render cumulative train notes without consuming fragments.
- Stable publication compiles matching fragments into the final `CHANGELOG.md` section
  and consumes them.
- Stable patch fragments can coexist with future-minor fragments without CHANGELOG merge
  conflicts.
- Publication fails if the selected train has no reviewed notes.
- Notes are never invented from commits. A separate draft helper may suggest commit
  subjects, but it cannot satisfy the reviewed-note gate.

For `1.2.0-beta.2`, the agent will curate the initial fragment set from the approved
issues and actual diff before executing the release command.

## CLI phases

1. Discover local/remote tags and GitHub releases.
2. Resolve or validate the target version and expected branch.
3. Verify clean worktree, upstream state, GitHub authentication, and forbidden paths.
4. Render reviewed notes and update package/manifest/versions/CHANGELOG as appropriate.
5. Run `pnpm run verify`, `pnpm run security:audit`, and `pnpm run build`.
6. Show the exact release plan and metadata diff; request interactive confirmation.
7. Create `chore(release): prepare <version>`, push the expected branch, create and push
   the tag.
8. Watch the tag-triggered GitHub Actions workflow and verify the release channel plus
   `main.js`, `manifest.json`, and `styles.css` assets.

Options:

- `--dry-run`: resolve and validate without writes, commits, or pushes.
- `--prepare-only`: update metadata, run gates, and create the release commit without
  pushing or tagging.
- `--yes`: skip the interactive confirmation for deliberate automation.

## Failure and idempotency

- Before tag push, any failure stops without remote release mutation.
- After tag push, the CLI never deletes or rewrites the tag. It reports the failed
  workflow and requires a higher recovery version, following release policy.
- A rerun detects an existing local/remote tag and reports its workflow/release state
  instead of publishing a duplicate.
- Git commands use argument arrays rather than shell interpolation.

## Adversarial pass

- A future beta being globally greater must not block an older-line stable patch.
- Alpha cannot restart after beta on the same core, because that is a SemVer downgrade.
- Once `main` has advanced to a later stable minor, publishing an older maintenance line
  requires an explicit maintenance branch; the fixed `main` mapping must reject it.
- A remote tag without a GitHub release is treated as an interrupted publication, not a
  free version number.
- A GitHub release without a corresponding tag is drift and blocks automatic mutation.
- Mixed-line fragments, empty notes, dirty worktrees, or AI files in the public diff
  block publication.
- The command does not cover real-device mobile, clean-install, or upgrade-path checks;
  those remain explicit developer validations and are never represented as agent visual
  coverage.

## Acceptance

- Unit tests cover SemVer ordering, concurrent trains, promotions, invalid regressions,
  fragment selection/rendering, explicit-version suggestions, and channel mapping.
- Headless repository gates pass.
- `1.2.0-beta.2` is published from `dev` as a GitHub prerelease with required assets.
