---
title: Release 1.1.1 From 1.0.0 With Beta Workflow Safety
type: design-spec
status: approved
parent: "[[docs/work/publish/index|publish]]"
created: 2026-05-26T21:20:53
updated: 2026-05-26T21:20:53
tags:
  - agent/spec
  - initiative/publish
  - release/discipline
  - release/scorecard
created_by: codex-gpt-5
updated_by: codex-gpt-5
---

# Release 1.1.1 From 1.0.0 With Beta Workflow Safety

## Goal

Ship a `1.1.1` stable patch candidate based on the `1.0.0` product code, not
on the regressed `1.1.0`/`beta.2` product line, while reusing the safer modern
release workflow mechanics from the beta/release-infra work.

The release must publish `main.js`, `manifest.json`, and `styles.css`, and the
published JavaScript and CSS assets must be covered by GitHub artifact
attestations.

## User Decision

The user approved the conservative option:

- Start from tag `1.0.0`.
- Port only release/CI/workflow infrastructure from the beta.2 / PR #23 line.
- Keep product source behavior equivalent to `1.0.0`, except for the Obsidian
  Scorecard fixes listed in this spec.
- Publish `styles.css` as a real release asset.

The prior local experiment that changed PR #24 to `1.1.0-beta.2` is not the
implementation source of truth. It remains useful only as evidence of the
desired beta/stable channel direction.

## Source Baseline

Implementation branch:

- Base commit/tag: `1.0.0` (`b75706b`, `chore: prepare release 1.0.0`).
- Intended candidate branch: `release/1.1.1-from-1.0.0`.

Product-code boundary:

- `src/` starts from `1.0.0`.
- `test/` starts from `1.0.0`.
- No Explorer hardening, architecture refactor, theme migration, or UI/UX
  changes from `1.1.0`, `sandbox`, or beta.2 are in scope.

Infrastructure boundary:

- Port modern GitHub workflows and release config only where they are compatible
  with the `1.0.0` source tree.
- Do not blindly copy beta.2 `package.json`, `tsconfig`, `vite.config.ts`, or
  build entry assumptions if they require `1.1.0` product files.

## Release Build Design

`1.0.0` originally used an esbuild flow that bundled `src/main.ts` into
`main.js` and injected Svelte component CSS. For `1.1.1`, the build must emit a
separate `styles.css` release asset.

The preferred build design is:

- Keep esbuild as the production bundler for compatibility with the `1.0.0`
  codebase.
- Change the Svelte compiler CSS mode from injected CSS to external CSS.
- Add an explicit style entry or esbuild CSS output path so the build creates
  `styles.css` deterministically.
- Keep the Obsidian plugin entry as `src/main.ts`; do not require
  `src/pluginEntry.ts`.
- Keep release output staging in `dist/release/` with exactly:
  - `main.js`
  - `manifest.json`
  - `styles.css`

If extracting CSS from the old Svelte/esbuild path proves too brittle, the
fallback is a minimal Vite/Vite+ build config adapted to the `1.0.0` entry point
and style structure. That fallback must not require beta.2-only source files.

## Workflow Design

Port these concepts from the modern beta/release-infra line:

- CI workflow for lint, typecheck/build, and tests.
- CodeQL workflow and config.
- OpenSSF Scorecard workflow.
- Release workflow triggered by bare `X.Y.Z` tags.
- Release-please config with bare tags (`include-v-in-tag: false`) and
  `manifest.json` / `versions.json` as version files.
- Artifact attestations for release assets.

The release workflow must:

- Build from the immutable tag ref.
- Stage only Obsidian-supported release files into `dist/release/`.
- Upload/publish only `main.js`, `manifest.json`, and `styles.css`.
- Attest at least `main.js` and `styles.css`; attesting `manifest.json` too is
  acceptable.
- Avoid publishing `SHA256SUMS` or `sbom.cdx.json` as release assets unless the
  user separately reintroduces them.

## Scorecard Fix Scope

Manifest:

- `manifest.json.description` must end with punctuation.

Source directives and language detection:

- Remove undescribed or forbidden `eslint-disable` comments from
  `src/i18n/index.ts`.
- Replace direct `localStorage.getItem("language")` language detection with
  Obsidian's `getLanguage()` API where available.
- Remove the forbidden `@typescript-eslint/no-explicit-any` suppression from
  `src/svelte.d.ts` by using a typed Svelte component shape.

Popout compatibility:

- Use Obsidian-compatible document access, such as `activeDocument`, instead of
  global `document` in:
  - `src/VaultmanSettings.ts`
  - `src/main.ts`
- Use `window.requestAnimationFrame()` instead of global
  `requestAnimationFrame()` in:
  - `src/components/layout/islandActiveFilters.ts`
  - `src/components/layout/islandQueue.ts`
  - `src/components/layout/viewTree.ts`
  - `src/utils/inputModal.ts`
- Use `window.setTimeout()` instead of global `setTimeout()` in:
  - `src/modals/modalLinter.ts`
  - `src/services/serviceOperationQueue.ts`
  - `src/services/servicePropertyIndex.ts`
- Use `window.clearTimeout()` instead of global `clearTimeout()` in:
  - `src/services/servicePropertyIndex.ts`

Type/lint cleanup:

- Remove unnecessary assertions reported in:
  - `src/components/containers/explorerFiles.ts`
  - `src/components/containers/explorerProps.ts`
- Fix unsafe `any` assignment in `src/components/containers/explorerProps.ts`.

## Version Metadata

Set release metadata to stable `1.1.1`:

- `package.json.version = "1.1.1"`
- `manifest.json.version = "1.1.1"`
- `versions.json` includes `"1.1.1": "1.12.0"`
- `.release-please-manifest.json` records `"1.1.1"`
- Changelog/release notes identify this as a stable patch based on `1.0.0`
  with workflow and Scorecard fixes.

Do not mark this release as beta. This is the stable patch line that repairs
the stable channel without taking the `1.1.0` product changes.

## Verification Gates

Minimum local gates before presenting the candidate as ready:

- JSON parse gate for `package.json`, `manifest.json`, `versions.json`, and
  `.release-please-manifest.json`.
- `pnpm run build:plugin` produces `main.js` and `styles.css`.
- `pnpm run lint` passes or reports only explicitly documented pre-existing
  warnings not related to Scorecard.
- Existing `1.0.0` test command passes, or any pre-existing failure is isolated
  and documented.
- Targeted source scans show no remaining Scorecard-listed patterns:
  - forbidden eslint disables
  - direct `localStorage.getItem("language")`
  - global `document`
  - global `requestAnimationFrame`
  - global `setTimeout`
  - global `clearTimeout`
- Release workflow static review confirms attestation covers `main.js` and
  `styles.css`.
- `git diff --check` passes.

Remote/publish gates:

- Do not push, tag, delete tags, edit GitHub Release state, merge to `main`, or
  publish a release without explicit user instruction.
- Before any merge to `main`, confirm the branch contains zero AI workflow files:
  no `AGENTS.md`, `CLAUDE.md`, `.agents/`, `.claude/`, or generated agent
  caches.

## Non-Goals

- Do not preserve `1.1.0` product behavior.
- Do not repair the broader mobile regression beyond Scorecard-compatible API
  usage unless a specific failing mobile behavior is reproduced.
- Do not include Explorer hardening, architecture cleanup, theme-builder, or
  roadmap work.
- Do not publish beta artifacts from this branch.

## Acceptance Criteria

The design is satisfied when a local branch exists that:

- Diffs against `1.0.0` only in release infrastructure, version metadata,
  build-output mechanics, and Scorecard fixes.
- Builds a release bundle containing `main.js`, `manifest.json`, and
  `styles.css`.
- Has workflow configuration capable of attesting `main.js` and `styles.css`.
- Keeps `main` release hygiene intact by excluding all AI workflow files.
