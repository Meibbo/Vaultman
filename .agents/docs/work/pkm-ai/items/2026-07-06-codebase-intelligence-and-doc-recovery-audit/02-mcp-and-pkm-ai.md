# MCP And PKM-AI

## MCP Project Status

Command:

```json
{"tool":"mcp__codebase_memory_mcp.index_status","arguments":{"project":"C-Users-vic_A-Desktop-vaultman"}}
```

Observed:

```json
{"project":"C-Users-vic_A-Desktop-vaultman","nodes":12705,"edges":26429,"status":"ready"}
```

Classification: ready.

## MCP Graph Schema

Command:

```json
{"tool":"mcp__codebase_memory_mcp.get_graph_schema","arguments":{"project":"C-Users-vic_A-Desktop-vaultman"}}
```

Relevant node labels:

| Label | Count |
| --- | ---: |
| Section | 4867 |
| Function | 1982 |
| File | 1492 |
| Module | 1396 |
| Variable | 888 |
| Method | 854 |
| Interface | 498 |
| Type | 256 |
| Class | 102 |
| Route | 13 |

Relevant edge types:

| Edge | Count |
| --- | ---: |
| DEFINES | 10843 |
| CALLS | 6486 |
| USAGE | 4237 |
| IMPORTS | 1791 |
| DEFINES_METHOD | 854 |
| WRITES | 379 |
| SEMANTICALLY_RELATED | 41 |
| HTTP_CALLS | 13 |

Interpretation: this is a real structural graph, not only text search. It is strong enough to be the default source for code discovery and impact analysis.

## MCP HTTP UI

Command:

```powershell
Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:9749/' -TimeoutSec 5
```

Observed:

```json
{"StatusCode":200,"Title":"Codebase Memory - Graph"}
```

Classification: available at `http://127.0.0.1:9749/`.

Interpretation: the UI exists and is reachable locally. Treat it as a visual inspection surface; keep MCP tool output as canonical evidence.

## PKM-AI Retrieval Cache

Command:

```powershell
node -e "const fs=require('fs');const index=JSON.parse(fs.readFileSync('.agents/cache/retrieval-index.json','utf8'));const docs=Array.isArray(index.docs)?index.docs:[];const withVector=docs.filter((doc)=>Array.isArray(doc.vector)&&doc.vector.length>0);console.log({docs:docs.length,withVector:withVector.length,vectorDims:withVector[0]?.vector?.length??0})"
```

Observed:

```json
{
  "path": ".agents/cache/retrieval-index.json",
  "docs": 824,
  "withVector": 0,
  "vectorDims": 0,
  "generatedAt": null,
  "version": null
}
```

Classification:

- textual/cache retrieval: populated;
- semantic/vector retrieval: unpopulated.

## PKM-AI Semantic Query

Command:

```powershell
node .agents/tools/pkm-ai/query-docs.ts --semantic "vector store"
```

Observed:

```text
query-docs --semantic: no embeddings found. Run: node .agents/tools/pkm-ai/embed-docs.ts
```

Exit code: `1`.

Interpretation: semantic retrieval support exists in code, but this workspace currently has no persisted doc embeddings. Do not run `embed-docs.ts` until the document recovery gate is resolved; otherwise the vector index would snapshot an incomplete doc corpus.
