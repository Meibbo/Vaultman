---
title: Phase 08 inventory
type: research-inventory
status: complete
parent: "[[08-scripts-ci-release-layer|Scripts CI release layer]]"
created: 2026-05-17T18:10:00-05:00
updated: 2026-05-17T18:10:00-05:00
tags:
  - agent/research
  - architecture
  - inventory
created_by: codex
updated_by: codex
---

# Phase 08 Inventory

## Scripts

- `scripts/run-explorer-scroll-smoke.mjs`
- `scripts/no-mutable-vfs.mjs`
- `scripts/generate-release-sbom.mjs`
- `scripts/security-audit.mjs`
- `scripts/sync-test-build.mjs`

## GitHub Workflows And Config

- `.github/workflows/ci.yml`
- `.github/workflows/codeql.yml`
- `.github/workflows/release.yml`
- `.github/workflows/scorecard.yml`
- `.github/dependabot.yml`
- `.github/codeql/codeql-config.yml`

## CodeQL Query Pack

- `codeql/queries/javascript/vaultman/VirtualizerMissingItemKey.ql`
- `codeql/queries/javascript/vaultman/UnsafeDynamicCodePathHtml.ql`
- `codeql/queries/javascript/vaultman/UnboundedVaultReadPromiseAll.ql`
- `codeql/queries/javascript/vaultman/TrailingDebounceExplorerRefresh.ql`
- `codeql/queries/javascript/vaultman/qlpack.yml`

## CodeQL Query Tests

- `codeql/tests/javascript/vaultman/virtualizer-missing-item-key/`
- `codeql/tests/javascript/vaultman/unsafe-dynamic-code-path-html/`
- `codeql/tests/javascript/vaultman/unbounded-vault-read-promise-all/`
- `codeql/tests/javascript/vaultman/trailing-debounce-explorer-refresh/`
- `codeql/tests/javascript/vaultman/qlpack.yml`

## Generated Or Release-Facing Artifacts

- `main.js`
- `styles.css`
- `manifest.json`
- `versions.json`
- `dist/build/manifest.json`
- `dist/release/manifest.json`
- `dist/release/sbom.cdx.json`
- `dist/release/SHA256SUMS`

## Package Script Surfaces Referenced

- `build`
- `build:plugin`
- `verify`
- `test:all`
- `smoke:scroll`
- `smoke:scroll:stress`
- `security:audit`
- `sbom:release`
- `audit:all`
