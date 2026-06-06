---
title: Scripts and package gates
type: research-shard
status: complete
parent: "[[08-scripts-ci-release-layer|Scripts CI release layer]]"
created: 2026-05-17T18:10:00
updated: 2026-05-17T18:10:00
tags:
  - agent/research
  - architecture
  - scripts
created_by: codex
updated_by: codex
---

# Scripts And Package Gates

## Package Script Router

| Script | Route | Notes |
| --- | --- | --- |
| `build` | `tsc -noEmit -skipLibCheck` -> `vp build` -> `scripts/sync-test-build.mjs` | Produces and syncs local build outputs. |
| `build:plugin` | `tsc -noEmit -skipLibCheck` -> `vp build` | Used by release before explicit `dist/release` staging. |
| `verify` | lint -> check -> build -> unit -> component | Main local/CI confidence gate. |
| `test:all` | integrity -> unit -> component -> e2e | Broader suite, distinct from `verify`. |
| `smoke:scroll` | `scripts/run-explorer-scroll-smoke.mjs --mode=smoke` | Live Explorer smoke via Obsidian CLI. |
| `smoke:scroll:stress` | `scripts/run-explorer-scroll-smoke.mjs --mode=stress` | Higher jump count and tighter delay. |
| `security:audit` | prod audit then dev audit | Fails high severity, reports moderate in dev scope. |
| `sbom:release` | `scripts/generate-release-sbom.mjs` | Writes CycloneDX SBOM to `dist/release`. |
| `audit:all` | dead exports -> knip -> depcheck | Static cleanup/audit route. |

## Script Contracts

### `scripts/sync-test-build.mjs`

- Reads Vite output from `dist/vite`.
- Copies `main.js` and `styles.css` from `dist/vite`.
- Copies `manifest.json` from the repo root.
- Writes outputs to the repo root, `dist/build`, the live `plugin-dev` plugin
  folder, and `test/vaults/stress-vault/.obsidian/plugins/vaultman`.
- This means `pnpm run build` is also a local deployment command.

### `scripts/run-explorer-scroll-smoke.mjs`

- Hard-codes the Obsidian vault name as `plugin-dev`.
- Supports `tree`, `list`, `table`, `grid`, `cards`, and `auto` view routing.
- Defaults to 100 jumps in smoke mode and 1000 jumps in stress mode.
- Runs `pnpm run build` unless `--no-build` is passed.
- Reloads the plugin unless `--no-reload` is passed.
- Opens Vaultman unless `--no-open` is passed and the frame is already open.
- Executes `window.__vaultmanPerfProbe.run(...)` through `obsidian eval`.
- Fails when burst results report failure or when `obsidian dev:errors` returns
  captured errors.

### `scripts/security-audit.mjs`

- Wraps `pnpm audit --json`.
- Supports production and development dependency scopes.
- Separates report thresholds from fail thresholds.
- Exits nonzero when advisories meet or exceed the configured fail severity.

### `scripts/generate-release-sbom.mjs`

- Creates `dist/release`.
- Runs `cdxgen` for a JavaScript CycloneDX 1.6 SBOM.
- Writes `dist/release/sbom.cdx.json`.
- Removes `NODE_PATH` from the spawned environment before running `cdxgen`.

### `scripts/no-mutable-vfs.mjs`

- Provides a custom lint rule guarding `vfs.fm`, `vfs.body`, and mutating
  operations on `vfs.ops`.
- The unit suite `test/unit/lint/noMutableVfsRule.test.ts` binds this rule to a
  regression contract.

## Automation Meaning

The package scripts are not just convenience commands. They encode the practical
contract for each layer:

- Runtime source is valid when TypeScript, Svelte, lint, build, and tests pass.
- Explorer scroll behavior is valid only when the live `plugin-dev` probe passes.
- Release payloads are valid only after security audit, build, explicit staging,
  SBOM generation, checksums, and attestations.
