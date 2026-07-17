# Routing And Next Actions

## Routing Rules

- Use MCP graph tools first for TS symbol lookup, internal imports, code
  snippets, callers/callees, complexity, and impact analysis. Evidence:
  [02-mcp-and-pkm-ai.md](02-mcp-and-pkm-ai.md) and
  [04-code-and-style-coverage.md](04-code-and-style-coverage.md).
- Use MCP graph tools for Svelte file-level imports and component surfaces, but
  verify runtime calls and template semantics with Svelte-specific tools or
  textual scans. Evidence: the `createExplorerScrollGeometry` missed trace in
  [04-code-and-style-coverage.md](04-code-and-style-coverage.md).
- Use PKM-AI textual retrieval for docs and decision retrieval while semantic
  vectors are unpopulated. Evidence: [02-mcp-and-pkm-ai.md](02-mcp-and-pkm-ai.md).
- Use PKM-AI semantic retrieval only after the document recovery gate and
  embedding rebuild. Evidence: `0` vectors and failed semantic query in
  [02-mcp-and-pkm-ai.md](02-mcp-and-pkm-ai.md).
- Use Obsidian File Recovery only after producing a read-only restore candidate
  list. Evidence: File Recovery is available in `Start of The Road`, but this
  audit did not inspect or restore snapshots.
- Use textual scans for CSS/SCSS selectors, UnoCSS classes, dynamic class
  construction, package literals, and config usage. Evidence:
  [04-code-and-style-coverage.md](04-code-and-style-coverage.md) and
  [05-library-usage.md](05-library-usage.md).
- Use MCP HTTP UI for human visual inspection, not as canonical evidence.

## Next Actions

1. Review missing-doc candidates and approve a restore list.
2. Restore approved docs in a separate reversible change.
3. Rebuild PKM-AI textual and semantic indexes after recovery.
4. Re-run semantic retrieval checks.
5. Decide whether to add repeatable audit scripts.
6. Decide whether to add a Svelte/UnoCSS class-analysis helper.
7. Decide whether to use MCP UI, Mermaid, or Obsidian Canvas for visualization.

## Recovery Priority

Start with the most operationally risky evidence:

1. `487` current tracked deletions under `.agents/docs/work/hardening`.
2. `5` missing paths still referenced by current route/session docs.
3. `570` missing paths remembered by `.agents/cache/retrieval-index.json`.
4. `work/pkm-ai` gaps before semantic embedding rebuild.
5. Historical `superpowers` and `draft` gaps after active work is safe.

## Guardrails

- Do not run `node .agents/tools/pkm-ai/embed-docs.ts` before recovery review.
- Do not bulk restore from Git or Obsidian without an approved path list.
- Do not remove dependencies based on this audit alone.
- Do not treat Svelte call tracing as complete until the MCP indexer proves it
  can resolve calls inside `.svelte` scripts/templates.
- Do not use the MCP UI as the only source for an architectural claim.
