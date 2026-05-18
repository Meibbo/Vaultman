---
title: Generated artifacts and outputs
type: research-shard
status: complete
parent: "[[08-scripts-ci-release-layer|Scripts CI release layer]]"
created: 2026-05-17T18:10:00-05:00
updated: 2026-05-17T18:10:00-05:00
tags:
  - agent/research
  - architecture
  - artifacts
created_by: codex
updated_by: codex
---

# Generated Artifacts And Outputs

## Root Files

| File | Role | Observed size |
| --- | --- | ---: |
| `main.js` | Built plugin JavaScript artifact | 739331 bytes |
| `styles.css` | Built plugin CSS artifact | 136065 bytes |
| `manifest.json` | Obsidian plugin manifest | 294 bytes |
| `versions.json` | Obsidian version compatibility map | 689 bytes |

`manifest.json` currently identifies the plugin as `vaultman`, version `1.1.0`,
with `minAppVersion` `1.12.0`. `versions.json` includes the same `1.1.0` entry.

## Generated Directories

| Path | Role |
| --- | --- |
| `dist/build/manifest.json` | Build-sync output used by local/test plugin copies. |
| `dist/release/manifest.json` | Release staging copy. |
| `dist/release/sbom.cdx.json` | Generated CycloneDX release SBOM. |
| `dist/release/SHA256SUMS` | Release checksums. |

## Output Boundaries

- `dist/vite` is the upstream Vite build source used by sync and release
  staging.
- `dist/build` is a local synchronized output surface.
- `dist/release` is the release staging surface.
- Root `main.js` and `styles.css` are generated build artifacts and should not
  be used to infer source architecture.
- Root `manifest.json` and `versions.json` are release metadata and do affect
  package/release behavior.

## CodeQL Pack Outputs

The `codeql/` directory is source for security analysis, not generated output.
It belongs in this phase because workflows execute it outside the runtime/test
bundle.

- `codeql/queries/javascript/vaultman/qlpack.yml` defines the query pack.
- `codeql/tests/javascript/vaultman/qlpack.yml` defines the query test pack.
- Each custom query has a `.ql`, `.qlref`, `.expected`, and `.ts` fixture path.

## Handling Recommendation

When implementing product changes:

- Edit `src/`, `test/`, scripts, workflows, or manifest metadata as the source
  of truth.
- Let build/release commands regenerate `main.js`, `styles.css`, `dist/build`,
  and `dist/release`.
- Review generated artifacts only when the change explicitly affects packaging,
  manifest fields, CSS output, release checksums, or SBOM behavior.
