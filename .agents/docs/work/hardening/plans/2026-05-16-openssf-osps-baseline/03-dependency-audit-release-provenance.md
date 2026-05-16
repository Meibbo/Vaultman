---
title: OpenSSF dependency audit release provenance
type: plan-shard
status: draft
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

- [ ] **Step 1: Re-run audits**

Run:

```powershell
pnpm audit --prod
pnpm audit --dev
```

Expected: capture current advisories and distinguish runtime impact from dev
tooling impact.

- [ ] **Step 2: Replace `obsidian: latest`**

Change `package.json` from:

```json
"obsidian": "latest"
```

to an explicit supported version selected from the current Obsidian plugin API
compatibility target.

Expected: dependency resolution is reproducible and the selected version is
documented in the commit body or hardening record.

- [ ] **Step 3: Add an audit gate with a documented threshold**

Recommended initial policy:

```text
Production audit: fail on high or critical advisories.
Development audit: report moderate and above, fail on high or critical when a
fixed version exists and the fix does not require an unrelated major migration.
```

Expected: known advisories are not hidden, and the release gate is strict enough
for runtime risk without blocking unrelated dev-only migration work.

## Task 6: Release Provenance And Assets

- [ ] **Step 1: Create a release workflow from tags**

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

- [ ] **Step 2: Verify release dry run**

Run the workflow on a test tag or `workflow_dispatch` dry run that does not
publish a public release.

Expected: generated artifacts, checksums, SBOM, and attestation metadata are
downloadable and match the built assets.
