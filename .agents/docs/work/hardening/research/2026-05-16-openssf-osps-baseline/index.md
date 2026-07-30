---
title: OpenSSF OSPS baseline research
type: research
status: active
parent: "[[docs/work/hardening/index|Hardening]]"
created: 2026-05-16T04:42:00
updated: 2026-05-16T04:42:00
tags:
  - agent/research
  - initiative/hardening
  - security
  - openssf
  - supply-chain
created_by: codex
updated_by: codex
---

# OpenSSF OSPS Baseline Research

## Summary

Vaultman already has a strong base for OpenSSF alignment: CI, tests, coverage, CodeQL, and custom CodeQL queries are present. The missing work is not one more scanner. The missing work is a public security posture and release/supply-chain hygiene that can be measured by OpenSSF tools and GitHub repository controls.

The pragmatic route is:

1. Adopt OpenSSF OSPS Baseline Level 1 as the initial checklist.
2. Add OpenSSF Scorecard as automatic measurement.
3. Fix issues Scorecard and OSPS will flag: `SECURITY.md`, branch protection, workflow permissions, dependency alerts, release provenance, and documented release process.
4. After Level 1 is credible, pursue the OpenSSF Best Practices Badge and release attestations/SBOM.

## External References

- OpenSSF OSPS Baseline current version for new efforts:
  <https://baseline.openssf.org/>
- OpenSSF OSPS Baseline v2026.02.19:
  <https://baseline.openssf.org/versions/2026-02-19.html>
- OpenSSF Scorecard:
  <https://scorecard.dev/>
- Scorecard GitHub Action:
  <https://github.com/ossf/scorecard-action>
- OpenSSF Best Practices Badge:
  <https://openssf.org/projects/best-practices-badge/>
- GitHub Artifact Attestations:
  <https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations>
- SLSA GitHub generator:
  <https://github.com/slsa-framework/slsa-github-generator>

These sources were supplied by external read-only research on 2026-05-16 and were not re-browsed during this capture pass.

## Local Vaultman Observations

Vaultman is an Obsidian plugin built with Svelte and TypeScript.
`src/main.ts` initializes file, tag, property, and content indexes, then wires services, commands, and Obsidian views. The UI is mounted through `src/types/typeFrame.ts`.

The main data flow is:

```text
Obsidian vault and metadata
-> indexes
-> providers
-> panelExplorer
-> views
```

Destructive operations are not applied directly. They become `PendingChange` items, pass through `OperationQueueService`, are simulated in the VFS, and are then applied through `vault.process`, `fileManager.renameFile`, or `fileManager.trashFile` in the queued service path.

Verification is already substantial:

- `package.json:31` has `verify`.
- `package.json:28` has coverage through `test:cover`.
- `.github/workflows/ci.yml` runs lint, check, build, unit coverage, and uploads coverage artifacts.
- `.github/workflows/codeql.yml:17` declares explicit CodeQL permissions.

## Gaps Found

Repository-level controls need attention:

- The remote ruleset named `Main branch protection` exists but is disabled.
- Classic `main` branch protection is absent.
- Vulnerability alerts are disabled.
- Dependabot alerts were not available or not activated according to the read-only API check.

Public project files are inconsistent in this worktree:

- `LICENSE`, `SECURITY.md`, and `CODE_OF_CONDUCT.md` are not present in the local worktree.
- `CONTRIBUTING.md` exists in `HEAD` but is deleted in the current dirty worktree.
- GitHub community profile reportedly sees `LICENSE` and `CONTRIBUTING.md` on `main`, so this branch must reconcile those files before release or main merge work.

Workflow hygiene needs hardening:

- `.github/workflows/ci.yml` has no top-level `permissions:`.
- `.github/workflows/ci.yml:16` uses `actions/checkout@v4`.
- `.github/workflows/ci.yml:17` uses `voidzero-dev/setup-vp@v1`.
- `.github/workflows/ci.yml:29` uses `actions/upload-artifact@v4`.
- `.github/workflows/codeql.yml` has explicit permissions for the main analysis job, but `query-tests` lacks an explicit job-level permissions block.

Dependency hygiene needs a tracked response:

- `package.json:64` pins `obsidian` to `latest`.
- External audit reported production vulnerabilities through `@dnd-kit/svelte -> svelte -> devalue`.
- External audit reported development vulnerabilities including `serialize-javascript`, `lodash`, `fast-uri`, `fast-xml-builder`, `svelte`, and `devalue`.

Release hygiene is not yet reproducible:

- Vaultman distributes Obsidian release assets: `main.js`, `manifest.json`, and `styles.css`.
- GitHub Artifact Attestations or SLSA generic provenance are a better first fit than npm provenance unless the project decides to publish through npm.

## Recommended Route

Start with an OSPS Level 1 local hardening slice:

1. Create `SECURITY.md`.
2. Reconcile `LICENSE` and `CONTRIBUTING.md` without overwriting dirty local changes.
3. Add least-privilege workflow permissions to CI and CodeQL query tests.
4. Add Scorecard as a measurement workflow.
5. Document required repository settings: branch protection/ruleset, vulnerability alerts, Dependabot alerts, required CI, and required CodeQL.

Then run the dependency and release slices:

1. Resolve or document current audit findings.
2. Replace `obsidian: latest` with an explicit version or documented policy.
3. Add a reproducible release workflow from tag.
4. Produce checksums, SBOM, and GitHub artifact attestations for release assets.

## Next Action

Execute the implementation plan:
[[docs/work/hardening/plans/2026-05-16-openssf-osps-baseline/index|OpenSSF OSPS baseline implementation plan]].
