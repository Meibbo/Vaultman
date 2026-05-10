---
title: Tool contracts
type: plan-slice
status: draft
parent: "[[docs/work/pkm-ai/plans/2026-05-10-agent-control-plane/index|Agent Control Plane Implementation Plan]]"
created: 2026-05-10T03:29:53
updated: 2026-05-10T05:26:33
created_by: codex
updated_by: codex
tags:
  - agent/plan
  - initiative/pkm-ai
  - agent/workflow
---

# Tool Contracts

## Task

Document which PKM-AI tools are authoritative, which are heuristic, and which
need deeper Modules before agents rely on them for architecture claims.

## Files

- Create:
  `.agents/docs/work/pkm-ai/specs/2026-05-10-agent-control-plane/06-tool-contracts.md`
- Modify:
  `.agents/docs/work/pkm-ai/specs/2026-05-10-agent-control-plane/index.md`
- Modify:
  `.agents/docs/architecture/policies/tools.md`

## Steps

- [x] **Step 1: Create the tool-contract shard**

Create the file with the same control-plane shard frontmatter and title
`Agent control plane - tool contracts`.

- [x] **Step 2: Add confidence levels**

Add these definitions:

```markdown
- authoritative: deterministic enough to support a completion claim when its
  command succeeds and scope matches the task.
- evidence-bearing: useful proof, but only for the exact surface it checks.
- heuristic: orientation only; cannot justify architecture or completion
  claims by itself.
- deprecated: do not use except to read historical context.
```

- [x] **Step 3: Classify current tools**

Classify:

- `check-doc-health.mjs`: evidence-bearing;
- `query-docs.mjs`: evidence-bearing for frontmatter/glossary lookup;
- `record-metric.mjs`: evidence-bearing for workflow event recording;
- `archive-active-doc.mjs`: authoritative for archive creation when command
  succeeds and the archive link is present;
- `update-frontmatter.mjs`: evidence-bearing for timestamp/frontmatter edits;
- `shard-index.mjs`: evidence-bearing for sharding support;
- `traverse-graph.mjs`: heuristic;
- `analyze-code.mjs`: heuristic.

- [x] **Step 4: Add tools policy addendum**

Append a compact section to `.agents/docs/architecture/policies/tools.md`:

```markdown
## Tool Confidence

- Treat regex-only code tools as heuristic orientation.
- Do not cite heuristic tools as sole proof for architecture or completion
  claims.
- When a heuristic result affects a decision, confirm with source reads,
  tests, or a stronger parser.
```

- [x] **Step 5: Verify the slice**

Run:

```powershell
node .agents\tools\pkm-ai\check-doc-health.mjs | Select-String -Pattern 'tool-contracts|tools.md|doc health'
Select-String -Path '.agents/docs/architecture/policies/tools.md','.agents/docs/work/pkm-ai/specs/2026-05-10-agent-control-plane/06-tool-contracts.md' -Pattern '[ \t]+$'
```

Expected: no new path-specific health failure and no trailing-whitespace output.

## Result

Completed 2026-05-10T05:26:33. Created
[[docs/work/pkm-ai/specs/2026-05-10-agent-control-plane/06-tool-contracts|Tool contracts]]
with confidence levels, current PKM-AI tool classifications, and use rules.
Linked the shard from the Agent Control Plane spec index and added the compact
`Tool Confidence` addendum to
[[docs/architecture/policies/tools|Tools policy]].

Verification:

- `node .agents\tools\pkm-ai\check-doc-health.mjs | Select-String -Pattern
  'tool-contracts|tools.md|doc health'` still reports global
  `doc health: FAIL (47)`, with no `tool-contracts` or `tools.md`
  path-specific failure.
- `Select-String -Path '.agents/docs/architecture/policies/tools.md',
  '.agents/docs/work/pkm-ai/specs/2026-05-10-agent-control-plane/06-tool-contracts.md'
  -Pattern '[ \t]+$'` returned no matches.
- Scoped `git diff --check` returned no path errors; Git emitted only CRLF
  conversion warnings.
