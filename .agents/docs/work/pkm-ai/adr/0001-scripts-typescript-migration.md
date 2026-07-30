---
title: PKM-AI 0001 — Scripts → TypeScript via Node native type-stripping
type: adr
status: active
parent: "[[docs/work/pkm-ai/adr/README|pkm-ai adr]]"
created: 2026-06-04T00:00:00
updated: 2026-06-04T00:00:00
created_by: claude-opus-4-8
updated_by: claude-opus-4-8
tags:
  - agent/adr
  - initiative/pkm-ai
---

# PKM-AI 0001 — Scripts → TypeScript (Node native type-stripping)

**Decision status:** Accepted (dev-directed, CR grill 2026-06-04; reversible). **Date:** 2026-06-04.

## Context

`.agents/tools/pkm-ai/` has 19 `.mjs` scripts, several large + complex (`agent-room.mjs` 37 KB, `manage-tasks.mjs` 18.8 KB, `check-doc-health.mjs` 16 KB, `split-shard.mjs` 11 KB). No type safety → agent-authored edits break silently. The orchestration upgrade adds more (registry query, retrieval/graph, versioning) — complexity will grow. gbrain + pi (the reference tools) are TypeScript. We want types WITHOUT adding a build step or a new runtime.

## Decision

Migrate `.mjs` → `.ts`, run via **Node native type-stripping** (verified: Node **v24.15** runs `node x.ts` directly; supported Node ≥ 22.18). **No build, no Bun, no tsx.**

- **Constraint: erasable types only** — type annotations, `interface`, `type`, `import type`. NO enums, namespaces, parameter-properties, or other non-erasable constructs (use `tsconfig` `erasableSyntaxOnly`).
- **Phased:** high-value/complex first (`agent-room` · `manage-tasks` · `check-doc-health` · `split-shard` · `update-frontmatter`); trivial < 1 KB scripts last/optional.
- Add `tsconfig.json` (strict, `erasableSyntaxOnly`, `allowImportingTsExtensions`, `module: nodenext`);
  keep `"type": "module"`; pin `engines.node >= 22.18`. Agents/CI invoke `node <script>.ts`.

## Consequences

- Type safety + editor/agent assistance on the most error-prone scripts; aligns with gbrain/pi for borrowing.
- Zero build artifacts, zero new runtime dependency (Node-native).
- Cost: requires Node ≥ 22.18 (have v24.15 ✓); erasable-only discipline; `.ts` relative imports need explicit extensions. Risk: very old Node environments can't run — mitigated by `engines` pin + the AI-files-only scope (these scripts never ship to `main`).

## Alternatives considered

- **Keep `.mjs`:** zero types; bug class persists as complexity grows.
- **Bun:** extra runtime to install/maintain; overkill for CLI scripts.
- **tsx / ts-node:** extra dependency + per-run transpile startup cost.
- **Full `tsc` build:** build artifacts + watch step to maintain; defeats the "scripts are just run" simplicity.
