---
title: Route and retrieval profiles
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

# Route And Retrieval Profiles

## Task

Define how agents choose information sources for local docs, codebase,
archives, web, official docs, and tool-assisted extraction.

## Files

- Create:
  `.agents/docs/work/pkm-ai/specs/2026-05-10-agent-control-plane/05-route-retrieval-profiles.md`
- Modify:
  `.agents/docs/work/pkm-ai/specs/2026-05-10-agent-control-plane/index.md`
- Optionally modify:
  `.agents/docs/architecture/policies/tools.md`

## Steps

- [ ] **Step 1: Create the profile shard**

Create the file with the same frontmatter pattern as other control-plane spec
shards and title `Agent control plane - route and retrieval profiles`.

- [ ] **Step 2: Add route profile table**

Add this table shape:

```markdown
| Intent | First source | Second source | Web allowed | Write target |
|---|---|---|---|---|
```

Rows:

- micro command;
- docs update;
- code review;
- implementation;
- bug/performance diagnosis;
- architecture research;
- tool/environment friction;
- online/library fact check.

- [ ] **Step 3: Add retrieval profile table**

Add this table shape:

```markdown
| Profile | Use when | Tools | Source strictness | Failure mode |
|---|---|---|---|---|
```

Rows:

- `local-code`;
- `local-docs`;
- `archive-audit`;
- `online-primary`;
- `online-clean-page`;
- `current-unstable`;
- `connector-backed`;
- `skill-backed`.

- [ ] **Step 4: Add tool choice rules**

Add rules:

- use `rg`/`rg --files` first for local text and files;
- use `query-docs.mjs` when frontmatter, type, status, initiative, tag, or
  glossary matter;
- use official docs for unstable framework/API facts;
- use Defuddle-style extraction for user-provided URLs when the page is noisy;
- use web search for current external facts only when local sources cannot
  answer or freshness matters;
- record source gaps in the relevant source record, not only in chat.

- [ ] **Step 5: Verify the slice**

Run:

```powershell
node .agents\tools\pkm-ai\query-docs.mjs "route retrieval profiles"
node .agents\tools\pkm-ai\check-doc-health.mjs | Select-String -Pattern 'route-retrieval|doc health'
```

Expected:

- query should find the new shard after index rebuild or direct scan;
- no `route-retrieval` health failure appears.
