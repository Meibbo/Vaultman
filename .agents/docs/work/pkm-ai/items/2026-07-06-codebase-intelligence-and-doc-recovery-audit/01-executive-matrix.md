# Executive Matrix

| System | Status | Evidence | Useful For | Gap | Next Action |
| --- | --- | --- | --- | --- | --- |
| codebase-memory-mcp graph | ready | `index_status`, `get_graph_schema` | TS symbols, internal imports, calls, usages, routes, complexity | Svelte and external package semantics still need targeted checks | Use as primary code graph |
| MCP HTTP UI | available | `Invoke-WebRequest http://127.0.0.1:9749/` returned `200` | Human graph inspection | UI is inspection aid, not canonical evidence | Use after MCP tool checks |
| PKM-AI textual retrieval | populated | `.agents/cache/retrieval-index.json` has `824` docs | Documentation recall and missing-path detection | Cache includes many paths that no longer exist locally | Run recovery gate before reindexing |
| PKM-AI semantic retrieval | unpopulated | retrieval cache has `0` vectors; `query-docs --semantic` reports `no embeddings found` | Future semantic doc recall | Embeddings must not be rebuilt until recovery gate is resolved | Restore approved docs first |
| Obsidian File Recovery | available | `obsidian eval` reports vault `Start of The Road` and plugin `file-recovery` | Candidate source for deleted docs | This audit did not inspect or restore snapshots | Produce human-approved restore list |
| TypeScript graph coverage | strong | MCP `query_graph` found `185` TS files and `2753` defined nodes | Functions, classes, types, imports | Freshness depends on index refresh | Use MCP first |
| Svelte graph coverage | partial | MCP found `63` Svelte files and `396` import edges; missed `createExplorerScrollGeometry` callers | Component import surface | Runtime calls/template semantics require Svelte/text checks | Pair MCP with Svelte tools |
| Styling strata | mixed | literal scans found `41` SCSS, `2` CSS, `69` Svelte files, UnoCSS entrypoints | CSS/SCSS/UnoCSS migration planning | Selector/class semantics need text scans | Use for UnoCSS migration map |
| Library usage | mixed | import parser plus package script scan | Dependency classification | CLI, test env, and type packages create false positives | Review candidates before removal |
