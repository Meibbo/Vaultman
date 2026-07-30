# Code And Style Coverage

## TypeScript Coverage

Command:

```json
{"tool":"mcp__codebase_memory_mcp.query_graph","arguments":{"project":"C-Users-vic_A-Desktop-vaultman","query":"MATCH (f:File) WHERE f.file_path =~ 'src/.*\\\\.ts$' OPTIONAL MATCH (f)-[:DEFINES]->(n) RETURN count(DISTINCT f) AS tsFiles, count(n) AS definedNodes","max_rows":5}}
```

Observed:

| Metric | Count |
| --- | ---: |
| `src/*.ts` files | 185 |
| defined nodes | 2753 |
| functions | 878 |
| classes | 75 |
| interfaces | 419 |
| types | 220 |

Classification: strong for TypeScript structural discovery.

Use MCP first for TS symbols, definitions, snippets, internal imports, and impact analysis.

## Svelte Coverage

Command:

```json
{"tool":"mcp__codebase_memory_mcp.query_graph","arguments":{"project":"C-Users-vic_A-Desktop-vaultman","query":"MATCH (f:File) WHERE f.file_path =~ 'src/.*\\\\.svelte$' OPTIONAL MATCH (f)-[:IMPORTS]->(dst) RETURN count(DISTINCT f) AS svelteFiles, count(dst) AS importEdges, count(DISTINCT dst) AS distinctImportTargets","max_rows":5}}
```

Observed:

| Metric | Count |
| --- | ---: |
| `src/*.svelte` files | 63 |
| import edges | 396 |
| distinct import targets | 136 |

High-import Svelte surfaces:

| File | Imports |
| --- | ---: |
| `src/components/pages/pageFilters.svelte` | 29 |
| `src/components/containers/panelExplorer.svelte` | 25 |
| `src/components/frame/frameVaultman.svelte` | 22 |
| `src/components/views/ViewNodeTable.svelte` | 21 |
| `src/components/explorer/ViewHost.svelte` | 21 |
| `src/components/views/ViewNodeGrid.svelte` | 19 |
| `src/components/views/viewTree.svelte` | 18 |
| `src/components/layout/Toolbar.svelte` | 16 |
| `src/components/frame/FrameDashboardShell.svelte` | 16 |
| `src/components/views/ViewNodeCards.svelte` | 16 |

Classification: partial. MCP is useful for Svelte file/import surface, but not complete for Svelte runtime semantics.

## Missed Svelte Semantic Trace

MCP command:

```json
{"tool":"mcp__codebase_memory_mcp.trace_path","arguments":{"project":"C-Users-vic_A-Desktop-vaultman","function_name":"createExplorerScrollGeometry","mode":"calls","direction":"inbound","depth":2,"include_tests":false,"risk_labels":true}}
```

Observed:

```json
{"function":"createExplorerScrollGeometry","direction":"inbound","mode":"calls","callers":[]}
```

Literal verification:

```powershell
rg -n "createExplorerScrollGeometry" src/components/views src/services/serviceExplorerScrollGeometry.ts
```

Observed callers:

- `src/components/views/viewTree.svelte:360`
- `src/components/views/ViewNodeList.svelte:189`

Interpretation: MCP sees enough Svelte for imports, but this trace proves that calls inside Svelte scripts can be missed. Use Svelte MCP/autofixer or targeted literal scans when call/template semantics matter.

## Styling Strata

Command:

```powershell
rg --files -g '*.css' -g '*.scss' -g '*.svelte' -g '!node_modules/**' -g '!.agents/**'
```

Observed:

| Stratum | Files |
| --- | ---: |
| CSS | 2 |
| SCSS | 41 |
| Svelte | 69 |

Classification: mixed styling architecture.

This matches the known branch reality:

- `stable` is expected to have styling concentrated as pure CSS in `styles.css`.
- `sandbox` still has a majority of real SCSS.
- UnoCSS migration is already planned in the PKM-AI goal stream.

## UnoCSS Integration

Command:

```powershell
rg -n "uno|UnoCSS|virtual:uno\.css|presetWind3|presetIcons|unocss-preset-theme|@unocss/vite" uno.config.ts vite.config.ts src/pluginEntry.ts src/svelte.d.ts test/unit/build/unoPreflightGate.test.ts package.json
```

Observed:

- `vite.config.ts` imports `@unocss/vite` and registers `UnoCSS({ configFile: './uno.config.ts' })`.
- `uno.config.ts` imports `presetAttributify`, `presetIcons`, `presetWind3`, and `unocss-preset-theme`.
- `uno.config.ts` uses `presetWind3({ preflight: false })`.
- `src/pluginEntry.ts` imports `virtual:uno.css`.
- `src/svelte.d.ts` declares module `virtual:uno.css`.
- `test/unit/build/unoPreflightGate.test.ts` verifies UnoCSS preset and preflight assumptions.

Interpretation: UnoCSS is active as build/runtime CSS infrastructure, but class ownership still requires selector/class scanning. The MCP graph does not model CSS selector provenance.

## Migration Implications

- Keep Obsidian shell/global integration styles global until selectors are proven component-local.
- Use CSS custom properties for runtime theme tokens.
- Convert repeated utility-like SCSS groups into UnoCSS shortcuts only after checking dynamic class construction and safelist needs.
- Treat SCSS removal as a follow-up migration project, not part of this audit.
