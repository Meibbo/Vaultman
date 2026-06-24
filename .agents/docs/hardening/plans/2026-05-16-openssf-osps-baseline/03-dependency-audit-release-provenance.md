---
title: OpenSSF dependency audit release provenance
type: plan-shard
status: active
parent: "[[docs/work/hardening/plans/2026-05-16-openssf-osps-baseline/index|OpenSSF OSPS baseline implementation plan]]"
created: 2026-05-16T04:42:00
updated: 2026-05-16T04:42:00
tags:
  - agent/plan
  - initiative/hardening
  - security
  - openssf
created_by: codex
updated_by: codex
---

# Dependency Audit And Release Provenance

## Task 5: Dependency Audit Response

- [x] **Step 1: Re-run audits**

Run:

```powershell
pnpm audit --prod
pnpm audit --dev
```

Expected: capture current advisories and distinguish runtime impact from dev
tooling impact.

Execution note, 2026-05-16: `pnpm audit --prod` found no known
vulnerabilities after the Svelte/devalue patch update. `pnpm audit --dev`
still reports 8 dev-tooling advisories: `serialize-javascript` through
`mocha`, `lodash` through `obsidian-launcher`, `fast-uri` through
`eslint-plugin-obsidianmd -> eslint-plugin-json-schema-validator -> ajv`, and
`fast-xml-builder` through `@wdio/cli -> @wdio/utils -> edgedriver`. Treat
these as a follow-up dev-tooling audit slice; do not add broad overrides until
the owning tools are checked for compatible patched releases.

Follow-up execution note, 2026-05-16: the 8 dev-tooling advisories were
resolved under local Vite+ Node 24.15.0 by updating `obsidian-launcher` and
`wdio-obsidian-service` to `3.0.3`, then adding targeted `pnpm.overrides` for
`fast-uri@3.1.2`, `fast-xml-builder@1.2.0`, and
`serialize-javascript@7.0.5`. Fresh `pnpm audit --dev` and
`pnpm audit --prod` both returned no known vulnerabilities. `pnpm run
build:plugin` also passed under Node 24.15.0. This clears the current advisory
backlog but does not replace Step 3; the audit threshold still needs to become
an explicit CI gate.

- [x] **Step 2: Replace `obsidian: latest`**

Change `package.json` from:

```json
"obsidian": "latest"
```

to an explicit supported version selected from the current Obsidian plugin API
compatibility target.

Expected: dependency resolution is reproducible and the selected version is
documented in the commit body or hardening record.

Execution note, 2026-05-16: `obsidian` was pinned to `1.12.3`, the current npm
release returned by `npm view obsidian version`. The same pass added Node 24
runtime declarations (`engines.node`, `.node-version`, `.nvmrc`), changed CI
`setup-vp` to Node 24, updated Vite+/Svelte/Vitest patch dependencies, and
kept `cssMinify: 'esbuild'` because removing it caused Lightning CSS warnings
for generated `:global(svg)` selectors during `pnpm run build:plugin`.

- [x] **Step 3: Add an audit gate with a documented threshold**

Recommended initial policy:

```text
Production audit: fail on high or critical advisories.
Development audit: report moderate and above, fail on high or critical when a
fixed version exists and the fix does not require an unrelated major migration.
```

Expected: known advisories are not hidden, and the release gate is strict enough
for runtime risk without blocking unrelated dev-only migration work.

Execution note, 2026-05-16: CI now runs `vp run security:audit` after
dependency install and before lint/build. The gate uses
`scripts/security-audit.mjs`, which parses `pnpm audit --json` separately for
production and development scopes. The documented threshold is: report
`moderate` and above, fail on `high` or `critical`. Fresh local execution under
Node 24.15.0 reported zero advisories for both scopes.

## Task 6: Release Provenance And Assets

- [x] **Step 1: Create a release workflow from tags**

Required sequence:

1. Checkout immutable tag.
2. Install with pnpm.
3. Run `pnpm verify`.
4. Run `pnpm run build:plugin`.
5. Collect `main.js`, `manifest.json`, and `styles.css`.
6. Generate checksums.
7. Generate an SBOM.
8. Attest release assets with GitHub Artifact Attestations or SLSA generic
   provenance.
9. Publish a GitHub release.

Expected: release assets are produced by CI from the tag, not manually from a
developer workstation.

Execution note, 2026-05-16: `.github/workflows/release.yml` now builds from
tag pushes matching `v*` and supports `workflow_dispatch` dry runs. It installs
with Vite+ on Node 24, runs `vp run verify`, runs the dependency audit gate,
builds `main.js`, `manifest.json`, and `styles.css`, generates
`SHA256SUMS`, generates `sbom.cdx.json` through `cdxgen`, attests the release
assets plus SBOM with GitHub Artifact Attestations, uploads the bundle as a
workflow artifact, and publishes the GitHub Release only from a tag ref.

- [ ] **Step 2: Verify release dry run**

Run the workflow on a test tag or `workflow_dispatch` dry run that does not
publish a public release.

Expected: generated artifacts, checksums, SBOM, and attestation metadata are
downloadable and match the built assets.

Local execution note, 2026-05-16: the non-GitHub portions of the release flow
were exercised locally under Node 24.15.0: `pnpm run build:plugin`, copying
release assets to `dist/release`, `pnpm run sbom:release`, and generating
SHA-256 checksums all completed. A true attestation/release dry run still needs
the workflow to run in GitHub Actions after the branch is pushed; no push or
test tag was created in this local slice.
