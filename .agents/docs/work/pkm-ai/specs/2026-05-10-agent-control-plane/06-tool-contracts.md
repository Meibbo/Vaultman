---
title: Agent control plane - tool contracts
type: spec-shard
status: draft
parent: "[[docs/work/pkm-ai/specs/2026-05-10-agent-control-plane/index|Agent Control Plane]]"
created: 2026-05-10T05:26:33
updated: 2026-05-10T10:56:07
created_by: codex
updated_by: codex
tags:
  - agent/spec
  - initiative/pkm-ai
  - agent/workflow
---

# Tool Contracts

## Purpose

These contracts classify PKM-AI tools by the strength of evidence they can
support. A tool can be useful without being strong enough to justify an
architecture or completion claim by itself.

## Confidence Levels

- authoritative: deterministic enough to support a completion claim when its
  command succeeds and scope matches the task.
- evidence-bearing: useful proof, but only for the exact surface it checks.
- heuristic: orientation only; cannot justify architecture or completion
  claims by itself.
- deprecated: do not use except to read historical context.

## Current Tool Classification

| Tool | Confidence | Contract |
| --- | --- | --- |
| `check-doc-health.mjs` | evidence-bearing | Proves the documented health rules it implements for the scanned tree; global failure still requires path-specific interpretation. With `--repair-line-limits`, it mutates only oversized active Markdown files by preserving source lines, creating continuation shards with source/parent YAML, adding continuation wikilinks, and recording `line_limit_sharded` metrics. With `--repair-residuals`, it also normalizes parent link shape, strips timestamp offsets, and archives forbidden root `docs/superpowers` under `.agents/docs/archive/pkm-ai/public-docs/`. |
| `query-docs.mjs` | evidence-bearing | Proves frontmatter/index/glossary lookup for indexed docs; absence can mean cache staleness, parse failure, or unindexed content. |
| `record-metric.mjs` | evidence-bearing | Proves a workflow event was appended with evidence details; it does not prove the underlying work succeeded. |
| `archive-active-doc.mjs` | authoritative | Authoritative for archive creation when the command succeeds and the replacement source links the archive. |
| `update-frontmatter.mjs` | evidence-bearing | Proves timestamp/frontmatter edits for the targeted files; content semantics still need review. |
| `shard-index.mjs` | evidence-bearing | Proves sharding/index support for the files it processes; it does not judge whether the shard model is the right design. |
| `code-index.mjs` | evidence-bearing | Uses TypeScript AST plus `svelte/compiler` script parsing to prove parsed static imports, exports, relative dependency edges, dependents, legacy `export let` props, Svelte 5 `$props()` destructured props, and `createEventDispatcher` string-literal events for targeted local code files. It does not prove type-checker symbol resolution, alias resolution, runtime call graph, full Svelte template semantics, DOM events, or inferred callback-event meaning. |
| `traverse-graph.mjs` | heuristic | Regex import traversal is orientation only and cannot support architecture claims without source reads or stronger parsing. |
| `analyze-code.mjs` | heuristic | Regex export/function summaries are orientation only and cannot support completion or dependency claims by themselves. |

## Use Rules

- Cite authoritative or evidence-bearing tools only for the exact scope they
  check.
- Do not cite heuristic tools as sole proof for architecture, ownership, or
  completion claims.
- When a heuristic result affects a decision, confirm it with source reads,
  tests, runtime evidence, or a stronger parser.
- When a tool fails because of unrelated malformed docs, stale cache, or
  environment friction, record the blocking path and classify the residual
  before continuing.
