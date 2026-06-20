---
title: Agent control plane - modules and interfaces
type: spec-shard
status: draft
parent: "[[docs/work/pkm-ai/specs/2026-05-10-agent-control-plane/index|Agent Control Plane]]"
created: 2026-05-10T03:11:56
updated: 2026-05-10T03:11:56
created_by: codex
updated_by: codex
tags:
  - agent/spec
  - initiative/pkm-ai
  - agent/workflow
---

# Modules And Interfaces

## Module 1 - Agent Route Module

### Interface

Inputs:
- user mode or inferred intent;
- task size;
- current route docs;
- active initiative and source links;
- context budget.

Outputs:
- mode;
- minimum read set;
- allowed write locations;
- required policies;
- stop conditions.

### Depth Target

The Interface should hide routing complexity. An agent should not need to
manually rediscover whether a task belongs in hardening, polish, research,
pkm-ai, draft, or archive. The Module should return the next few documents to
read and the target source-record location.

### Current Adapters

- `AGENTS.md`
- `.agents/docs/start.md`
- `.agents/docs/architecture/routing.md`
- `.agents/docs/current/status.md`
- `.agents/docs/current/handoff.md`

### Needed Improvement

Add a compact route decision record or script-backed checklist that says:
"given this intent, read these docs, write here, verify with this contract."

## Module 2 - Retrieval Module

### Interface

Inputs:
- query intent: code, docs, archive, online, package docs, product docs;
- freshness need;
- source strictness: primary-only, local-only, web-allowed;
- expected output shape.

Outputs:
- ranked source list;
- exact paths or URLs;
- confidence and caveats;
- next retrieval command.

### Depth Target

The Interface should produce high-quality sources without making the agent
manually choose every tool. The Implementation may use `rg`, `query-docs`,
MCP/resources, Defuddle for URLs, official docs, web search, or package docs,
but callers should ask for evidence by intent.

### Existing Adapters

- `rg` and `rg --files` for local code/docs.
- `query-docs.mjs` for structured active-doc metadata.
- `index-docs.mjs` for metadata cache.
- Skills for Svelte, Obsidian, GitHub, Defuddle, and OpenAI docs.
- Web browsing for unstable or online sources.
- GitHub connector where repository/PR context is required.

### Needed Improvement

Replace or supplement regex-only code analysis with a deeper Adapter:

- TypeScript AST export/import index;
- Svelte component prop/event extraction;
- dependency graph by Module;
- route from test files to source files;
- map from plans/specs to touched code paths.

## Module 3 - Residual Classifier Module

### Interface

Inputs:
- failed check, warning, flaky command, or caveat text;
- touched files;
- source task scope;
- recurrence evidence.

Outputs:
- `fix-now`;
- `backlog`;
- `accepted-noise`;
- `blocked-by-environment`;
- `not-reproducible-yet`;
- required owner/path/expiration for any non-fix-now result.

### Depth Target

The Interface should prevent "pre-existing" from becoming a terminal state.
It should turn residuals into source records that future agents can inspect.

### Needed Improvement

Create a residual audit record and a small checklist that every verification
section must satisfy before claiming completion.

## Module 4 - Verification Contract Module

### Interface

Inputs:
- change type: docs, Svelte UI, service logic, queue/file ops, performance,
  package/dependency, Obsidian runtime, CodeQL guardrail, agent tooling;
- touched files;
- user-facing risk;
- known transient/toolchain constraints.

Outputs:
- minimum verification commands;
- sequencing constraints;
- required live/mounted checks;
- evidence location;
- allowed residual handling.

### Depth Target

The Interface should remove guesswork. A Svelte runtime fix should automatically
require mounted component or Obsidian smoke evidence. A docs-only change should
not require product build unless it changes executable tooling.

### Existing Adapters

- `pnpm run lint`
- `pnpm run check`
- `pnpm run build`
- `pnpm run test:unit`
- `pnpm run test:component`
- `pnpm run test:integrity`
- `pnpm run test:e2e`
- `codeql test run --additional-packs codeql/queries/javascript codeql/tests`
- `node .agents/tools/pkm-ai/check-doc-health.mjs`
- scoped `git diff --check`

### Needed Improvement

Add an explicit matrix to PKM-AI docs and make plans cite it instead of
rewriting verification logic each time.

## Module 5 - Agent Operation Module

### Interface

Inputs:
- active scope;
- selected nodes;
- validated operation plan;
- destructive/non-destructive classification.

Outputs:
- previewable target set;
- queueable operation group;
- validation errors;
- rollback limits;
- human-readable summary.

### Depth Target

This is the future `serviceAPI` direction. It should be queued and
user-supervised. It must not allow direct destructive vault mutation.

### Dependency

Do not implement this before queue contract drift and verification-led explorer
scope checks are resolved or explicitly accepted.
