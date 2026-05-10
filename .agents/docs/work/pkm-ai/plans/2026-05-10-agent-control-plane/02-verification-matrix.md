---
title: Verification matrix
type: plan-slice
status: draft
parent: "[[docs/work/pkm-ai/plans/2026-05-10-agent-control-plane/index|Agent Control Plane Implementation Plan]]"
created: 2026-05-10T03:29:53
updated: 2026-05-10T03:29:53
created_by: codex
updated_by: codex
tags:
  - agent/plan
  - initiative/pkm-ai
  - agent/workflow
---

# Verification Matrix

## Task

Create a shared verification matrix so future plans cite one source instead of
inventing commands and residual rules per slice.

## Files

- Create:
  `.agents/docs/work/pkm-ai/specs/2026-05-10-agent-control-plane/04-verification-matrix.md`
- Modify:
  `.agents/docs/work/pkm-ai/specs/2026-05-10-agent-control-plane/index.md`
- Modify:
  `.agents/docs/work/pkm-ai/index.md`

## Steps

- [ ] **Step 1: Create the matrix shard**

Create the file with frontmatter matching the existing spec shards, using:

```yaml
title: Agent control plane - verification matrix
type: spec-shard
status: draft
parent: "[[docs/work/pkm-ai/specs/2026-05-10-agent-control-plane/index|Agent Control Plane]]"
```

- [ ] **Step 2: Add matrix rows**

Add a Markdown table with these columns:

```markdown
| Change type | Focused check | Broad check | Runtime/live check | Sequencing | Residual rule |
|---|---|---|---|---|---|
```

Rows to include:

- docs-only;
- agent-tooling script;
- Svelte component;
- Svelte lifecycle/reactivity;
- service logic;
- queue/file operation;
- settings/persistence;
- performance-sensitive path;
- CodeQL guardrail;
- Obsidian runtime behavior;
- dependency/package change.

- [ ] **Step 3: Fill required commands**

Use these command contracts:

- docs-only: `node .agents\tools\pkm-ai\check-doc-health.mjs`, scoped
  `git diff --check`;
- agent-tooling script: `node --test ".agents/tools/pkm-ai/test/*.test.mjs"`;
- Svelte component: focused component test with `--fileParallelism=false`,
  then `pnpm run check`;
- Svelte lifecycle/reactivity: mounted component test plus Obsidian smoke when
  available;
- service logic: focused unit test, then `pnpm run test:unit` when the service
  is shared;
- queue/file operation: focused unit and component tests plus Obsidian smoke
  for live vault mutation paths;
- settings/persistence: focused unit/component test plus migration check when
  settings shape changes;
- performance-sensitive path: focused perf/integration probe plus CodeQL shape
  if applicable;
- CodeQL guardrail: local `codeql test run --additional-packs
  codeql\queries\javascript codeql\tests --threads=0`;
- Obsidian runtime behavior: Obsidian CLI or WDIO smoke;
- dependency/package change: install/build/check plus lockfile scope review.

- [ ] **Step 4: Link the new shard**

Add this bullet to the `Shards` list in the spec index:

```markdown
- [[docs/work/pkm-ai/specs/2026-05-10-agent-control-plane/04-verification-matrix|04 Verification Matrix]]
```

- [ ] **Step 5: Verify the slice**

Run:

```powershell
node .agents\tools\pkm-ai\check-doc-health.mjs | Select-String -Pattern 'agent-control-plane|verification-matrix|doc health'
```

Expected: no new failure under `agent-control-plane`.
