# Library Usage

## Method

The audit used two checks:

1. Static import parser across repo code, excluding `node_modules`, `.agents`, `dist`, and `coverage`.
2. Literal search in package scripts/configs for packages that are often used as CLIs, type providers, test environments, or build plugins.

The MCP graph is useful for internal imports, but package-level external usage requires textual scanning.

## Runtime Or Source Imports

Packages with direct source/runtime evidence:

| Package | Section | Example |
| --- | --- | --- |
| `@chenglou/pretext` | dependencies | `src/services/serviceTextMeasure.ts` |
| `@dnd-kit/svelte` | dependencies | `src/services/serviceDndSvelteAdapter.ts` |
| `@tanstack/svelte-virtual` | devDependencies | `src/services/serviceSharedVirtualLayout.svelte.ts` |
| `@tanstack/table-core` | devDependencies | `src/services/serviceViewTableAdapter.ts` |
| `bits-ui` | dependencies | `src/components/overlays/vmPopover.svelte` |
| `js-yaml` | devDependencies | `src/services/serviceBasesInterop.ts` |
| `obsidian` | devDependencies | test and source files import Obsidian API types/helpers |
| `svelte` | devDependencies | Svelte components and tests |

Observation: some runtime-relevant packages live in `devDependencies`, which is normal for Obsidian plugin builds but must be understood before dependency cleanup.

## Build, Config, And Test Tooling

Packages with config/script evidence:

| Package | Evidence |
| --- | --- |
| `@sveltejs/vite-plugin-svelte` | `vite.config.ts`, `vitest.config.ts` |
| `@unocss/vite` | `vite.config.ts` |
| `unocss` | `uno.config.ts` |
| `unocss-preset-theme` | `uno.config.ts` |
| `esbuild` | `scripts/esbuild.config.mjs` |
| `esbuild-sass-plugin` | `scripts/esbuild.config.mjs` |
| `esbuild-svelte` | `scripts/esbuild.config.mjs` |
| `svelte-preprocess` | `vite.config.ts`, `svelte.config.js`, `scripts/esbuild.config.mjs` |
| `vite-plus` | `vite.config.ts` |
| `vitest` | `vitest.config.ts`, tests |
| `wdio-obsidian-service` | `wdio.conf.mts` |
| `typescript` | package scripts use `tsc` |
| `svelte-check` | package scripts use `svelte-check` |
| `ts-prune` | package scripts use `ts-prune` |
| `depcheck` | package scripts use `depcheck` |
| `knip` | package scripts use `knip` |
| `prettier` | package scripts use `prettier` |
| `prettier-plugin-svelte` | used by Prettier for `.svelte` formatting |

## Test Environment And Type Packages

Packages that may look unused to import scanning but have contextual evidence:

- `jsdom`: referenced by `@vitest-environment jsdom` comments and DOM tests.
- `mocha`: configured by `wdio.conf.mts`.
- `@wdio/cli`, `@wdio/local-runner`, `@wdio/mocha-framework`, `@wdio/spec-reporter`, `wdio-obsidian-reporter`: tied to `wdio run`.
- `@types/node`: visible in source comments and TS environment expectations.
- `@types/js-yaml`: type companion for `js-yaml`.
- `sass`: required by Sass build pipeline through `esbuild-sass-plugin`.
- `@vitest/coverage-v8`: likely coverage provider, even if no direct import was found.

## Candidate Review List

These packages had no direct import evidence and no strong script/config evidence in the scans run here:

- `@git-diff-view/svelte`
- `@cyclonedx/cdxgen`
- `eslint-plugin-unused-imports`
- `jiti`
- `obsidian-launcher`
- `type-fest`

Do not remove them from this audit alone. Treat them as candidates for a focused dependency-cleanup pass using `knip`, `depcheck`, package-lock/pnpm-lock inspection, and any release/tooling scripts that are outside static imports.

## Conclusion

Library usage is mixed:

- MCP should remain the default for internal code graph questions.
- Static import scanning is needed for package usage.
- Script/config inspection is required before judging devDependencies.
- `@git-diff-view/svelte` is the clearest candidate for manual review because it is in `dependencies` and had no usage evidence in this pass.
