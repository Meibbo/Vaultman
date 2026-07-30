---
title: Root flows
type: research
status: draft
parent: "[[docs/work/research/2026-05-17-codebase-architecture-cluster/01-root-surface-layer|root-surface-layer]]"
created: 2026-05-17T13:10:00
updated: 2026-05-17T13:10:00
tags:
  - agent/research
  - architecture
  - codebase
created_by: codex
updated_by: codex
---

# Root Flows

## Package Script Flow

```mermaid
flowchart TD
  pkg["package.json scripts"] --> dev["dev: vp build --watch"]
  pkg --> build["build: tsc + vp build + sync-test-build"]
  pkg --> build_plugin["build:plugin: tsc + vp build"]
  pkg --> lint["lint: vp lint + eslint ."]
  pkg --> check["check: svelte-check"]
  pkg --> tests["test: unit/component/integration/e2e"]
  pkg --> verify["verify"]
  pkg --> smoke["smoke:scroll scripts"]
  pkg --> security["security:audit"]
  pkg --> sbom["sbom:release"]
  pkg --> audits["audit:knip / depcheck / ts-prune"]

  build --> vite["vite.config.ts"]
  build --> tsconfig["tsconfig.json"]
  build --> sync["scripts/sync-test-build.mjs"]
  vite --> pluginEntry["src/pluginEntry.ts"]
  pluginEntry --> mainSrc["src/main.ts"]
  vite --> styleSrc["src/main.scss"]

  lint --> eslint["eslint.config.mts"]
  eslint --> srcTs["src/**/*.ts"]
  eslint --> mutableRule["scripts/no-mutable-vfs.mjs"]

  check --> tsconfig
  tests --> vitest["vitest.config.ts"]
  tests --> wdio["wdio.conf.mts"]
  vitest --> testUnit["test/unit"]
  vitest --> testComponent["test/component"]
  vitest --> testIntegration["test/integration"]
  vitest --> obsidianMock["test/helpers/obsidian-mocks.ts"]
  wdio --> testE2E["test/e2e + test/vaults/e2e"]

  verify --> lint
  verify --> check
  verify --> build
  verify --> testUnit
  verify --> testComponent
```

## Build And Runtime Surface

```mermaid
flowchart LR
  package["package.json\nmain: main.js"] --> vite["vite.config.ts"]
  vite --> external["externalized APIs\nobsidian/electron/CodeMirror/Node"]
  vite --> svelte["Svelte plugin\nsvelte.config.js"]
  vite --> uno["UnoCSS\nuno.config.ts"]
  svelte --> src["src/pluginEntry.ts"]
  src --> main["src/main.ts"]
  src --> scss["src/main.scss"]
  uno --> scss
  vite --> dist["dist/vite/main.js\nstyles.css"]
  dist --> rootArtifacts["root main.js/styles.css\nrelease/runtime artifacts"]
  manifest["manifest.json"] --> release["release bundle"]
  versions["versions.json"] --> release
  rootArtifacts --> release
```

Root build control is concentrated in `package.json`, `vite.config.ts`, `svelte.config.js`, `uno.config.ts`, and `tsconfig.json`. The source surface it touches first is `src/pluginEntry.ts`, then `src/main.ts` and `src/main.scss`.

## Test Surface

```mermaid
flowchart LR
  package["package.json test scripts"] --> vitest["vitest.config.ts"]
  vitest --> unit["test/unit/**/*.test.ts\nnode env"]
  vitest --> component["test/component/**/*.test.ts\njsdom + Svelte"]
  vitest --> integration["test/integration/**/*.test.ts\nobsidian integration setup"]
  vitest --> mock["test/helpers/obsidian-mocks.ts\nobsidian alias"]
  package --> wdio["wdio.conf.mts"]
  wdio --> e2e["test/e2e/**/*.e2e.ts\ntest/vaults/e2e"]
  unit --> src["src/utils, logic, services, providers"]
  component --> components["src/components/**/*.svelte"]
  integration --> plugin["plugin runtime in Obsidian harness"]
```

`vitest.config.ts` is the root switchboard for fast verification. It separates node unit tests, browser-like Svelte component tests, and Obsidian integration tests. The e2e layer is separate through WDIO.

## Scripts Surface

| Script | Called by | Root-to-surface role |
| --- | --- | --- |
| `scripts/sync-test-build.mjs` | `pnpm build` | Syncs built plugin artifacts after `vp build` for local test/development target. |
| `scripts/run-explorer-scroll-smoke.mjs` | `smoke:scroll`, `smoke:scroll:stress` | Drives Obsidian CLI/perf smoke for Explorer scroll behavior. |
| `scripts/security-audit.mjs` | `security:audit`, CI, release | Runs prod/dev dependency audit gates. |
| `scripts/generate-release-sbom.mjs` | `sbom:release`, release workflow | Generates release SBOM. |
| `scripts/no-mutable-vfs.mjs` | `eslint.config.mts` | Local lint rule preventing unsafe mutable VFS patterns in `src/**/*.ts`. |

## CI And Security Surface

```mermaid
flowchart TD
  github[".github/workflows"] --> ci["ci.yml"]
  github --> codeqlWf["codeql.yml"]
  github --> releaseWf["release.yml"]
  github --> scorecard["scorecard.yml"]
  github --> dependabot["dependabot.yml"]

  ci --> install["vp install"]
  ci --> audit["vp run security:audit"]
  ci --> lint["vp run lint"]
  ci --> check["vp run check"]
  ci --> build["vp run build"]
  ci --> cover["vp run test:cover"]

  codeqlWf --> codeqlConfig[".github/codeql/codeql-config.yml"]
  codeqlWf --> codeqlQueries["codeql/queries/javascript/vaultman"]
  codeqlWf --> codeqlTests["codeql/tests/javascript/vaultman"]

  releaseWf --> verify["vp run verify"]
  releaseWf --> buildPlugin["vp run build:plugin"]
  releaseWf --> sbom["vp run sbom:release"]
  releaseWf --> assets["dist/release/main.js\nstyles.css\nmanifest.json"]

  scorecard --> sarif["Scorecard SARIF upload"]
  dependabot --> deps["npm + GitHub Actions updates"]
```

The root CI layer is intentionally not just a mirror of local commands. It adds security audit, CodeQL query tests, Scorecard, release attestation, checksums, and SBOM generation.

## Next Layer Recommendation

Map `src/pluginEntry.ts`, `src/main.ts`, `src/main.scss`, and the first-level runtime directories next. That should define the trunk that later canvases can attach to:

- `src/components/` UI surface.
- `src/services/`, `providers/`, `registry/` behavior surface.
- `src/types/`, `config/`, `settingsVM.ts` contract surface.
- `src/dev/` smoke/perf hooks.
