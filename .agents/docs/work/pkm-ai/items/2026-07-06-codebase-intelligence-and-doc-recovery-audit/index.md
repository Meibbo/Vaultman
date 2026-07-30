# Codebase Intelligence And Doc Recovery Audit

Status: complete Date: 2026-07-06 Scope: read-only audit

## Shards

- [01-executive-matrix.md](01-executive-matrix.md)
- [02-mcp-and-pkm-ai.md](02-mcp-and-pkm-ai.md)
- [03-doc-recovery.md](03-doc-recovery.md)
- [04-code-and-style-coverage.md](04-code-and-style-coverage.md)
- [05-library-usage.md](05-library-usage.md)
- [06-routing-and-next-actions.md](06-routing-and-next-actions.md)

## Current Classification

- MCP graph: ready and structurally useful (`12705` nodes, `26429` edges).
- MCP UI: available at `http://127.0.0.1:9749/`.
- PKM-AI textual retrieval: populated (`824` cached docs).
- PKM-AI semantic retrieval: unpopulated (`0` vectors; semantic query fails).
- Document recovery gate: required before embedding rebuild (`570` cached doc paths missing; `487` current tracked deletions under `.agents/docs`).
- TS coverage: strong for source structure (`185` TS files, `2753` defined nodes).
- Svelte coverage: partial (`63` Svelte files, `396` import edges, missed runtime callers inside Svelte scripts).
- Styling strata: mixed (`41` SCSS, `2` CSS, `69` Svelte files, UnoCSS active through config/build entrypoints).
- Library usage: mixed; imports, scripts, configs, test environments, and type packages must be classified separately.

## Primary Finding

Vaultman already has the core substrate for codebase intelligence:
`codebase-memory-mcp` plus PKM-AI retrieval. The immediate risk is not lack of a graph; it is document integrity. PKM-AI semantic embeddings should not be rebuilt until missing `.agents/docs` candidates are reviewed and approved for restore or ignore.
