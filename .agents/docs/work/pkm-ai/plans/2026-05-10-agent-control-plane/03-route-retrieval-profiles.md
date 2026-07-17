---
title: Route and retrieval profiles
type: plan-slice
status: draft
parent: "[[docs/work/pkm-ai/plans/2026-05-10-agent-control-plane/index|Agent Control Plane Implementation Plan]]"
created: 2026-05-10T03:29:53
updated: 2026-05-10T05:13:29
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

- [x] **Step 1: Create the profile shard**

Create the file with the same frontmatter pattern as other control-plane spec
shards and title `Agent control plane - route and retrieval profiles`.

- [x] **Step 2: Add route profile table**

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

- [x] **Step 3: Add retrieval profile table**

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

- [x] **Step 4: Add tool choice rules**

Add rules:

- use `rg`/`rg --files` first for local text and files;
- use `query-docs.mjs` when frontmatter, type, status, initiative, tag, or
  glossary matter;
- use official docs for unstable framework/API facts;
- use Defuddle-style extraction for user-provided URLs when the page is noisy;
- use web search for current external facts only when local sources cannot
  answer or freshness matters;
- record source gaps in the relevant source record, not only in chat.

- [x] **Step 5: Verify the slice**

Run:

```powershell
node .agents\tools\pkm-ai\query-docs.mjs "route retrieval profiles"
node .agents\tools\pkm-ai\check-doc-health.mjs | Select-String -Pattern 'route-retrieval|doc health'
```

Expected:

- query should find the new shard after index rebuild or direct scan;
- no `route-retrieval` health failure appears.

## Result

Completed 2026-05-10T05:13:29. Created
[[docs/work/pkm-ai/specs/2026-05-10-agent-control-plane/05-route-retrieval-profiles|Route and retrieval profiles]]
with route profiles, retrieval profiles, and tool-choice rules. Linked the new
shard from the parent Agent Control Plane spec index.

During verification, `index-docs.mjs` was blocked by three pre-existing
frontmatter parse errors in vertical-analysis research notes. The repair was
limited to quoting YAML titles containing `:` and removing trailing whitespace
from those same touched files. `query-docs.mjs "route retrieval profiles"` also
exposed literal substring matching that could not find
`route and retrieval profiles`; the search matcher now tokenizes punctuation
and connector-word cases, with a regression test in
`.agents/tools/pkm-ai/test/frontmatter.test.mjs`.

Verification:

- RED: `node --test ".agents/tools/pkm-ai/test/frontmatter.test.mjs"` failed on
  `filterEntries matches search words across punctuation and connector words`.
- GREEN: focused frontmatter test passed, then
  `node --test ".agents/tools/pkm-ai/test/*.test.mjs"` passed 14/14.
- `node .agents\tools\pkm-ai\index-docs.mjs` indexed 331 docs.
- `node .agents\tools\pkm-ai\query-docs.mjs "route retrieval profiles"` found
  the Task 3 plan slice and new spec shard.
- Filtered doc health still reports global `doc health: FAIL (47)`, with no
  `route-retrieval` or `frontmatter-parse` path failure.
- Scoped trailing-whitespace scan and scoped `git diff --check` returned no
  path errors; Git emitted only CRLF conversion warnings.
