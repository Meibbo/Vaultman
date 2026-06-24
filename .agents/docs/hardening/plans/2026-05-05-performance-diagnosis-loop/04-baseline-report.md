---
title: Baseline report
type: plan-shard
status: completed
parent: "[[docs/work/hardening/plans/2026-05-05-performance-diagnosis-loop/index|performance-diagnosis-loop-plan]]"
created: 2026-05-05T20:58:26
updated: 2026-05-05T21:45:00
tags:
  - agent/plan
  - performance
---

# Baseline Report

## Task 4: Capture Baseline Evidence

**Files:**

- Create: `docs/work/hardening/research/2026-05-05-performance-baseline/index.md`

- [x] **Step 1: Run the four baseline scenarios**

Run each command after `pnpm run build`, `obsidian plugin:reload id=vaultman`, and `obsidian command id=vaultman:open`:

```powershell
obsidian eval code="window.__vaultmanPerfProbe.run('filters-search',{query:'status'}).then(r=>JSON.stringify(r))"
obsidian eval code="window.__vaultmanPerfProbe.run('tree-scroll',{steps:12}).then(r=>JSON.stringify(r))"
obsidian eval code="window.__vaultmanPerfProbe.run('filter-select').then(r=>JSON.stringify(r))"
obsidian eval code="window.__vaultmanPerfProbe.run('operation-badges').then(r=>JSON.stringify(r))"
```

Expected: each command returns JSON with `startedAt`, `endedAt`, `counters`, and `timings`.

- [x] **Step 2: Create the baseline report**

Create `docs/work/hardening/research/2026-05-05-performance-baseline/index.md` only after Step 1 returns JSON for all scenarios. The final file must contain:

```markdown
---
title: Performance baseline
type: research
status: active
parent: "[[docs/work/hardening/specs/2026-05-05-performance-diagnosis-loop/index|performance-diagnosis-loop]]"
created: 2026-05-05T20:58:26
updated: 2026-05-05T20:58:26
tags:
  - agent/research
  - performance
---

# Performance Baseline

## Environment

- Date: 2026-05-05
- Branch: hardening-refactor
- Command path: Obsidian CLI `obsidian eval`
- Plugin reload: passed

## Scenario Results

### filters-search

Paste the complete JSON returned by the `filters-search` command in a fenced
`json` block.

### tree-scroll

Paste the complete JSON returned by the `tree-scroll` command in a fenced
`json` block.

### filter-select

Paste the complete JSON returned by the `filter-select` command in a fenced
`json` block.

### operation-badges

Paste the complete JSON returned by the `operation-badges` command in a fenced
`json` block.

## Findings

1. Highest call count: write the metric name, count, scenario, and why it matters.
2. Highest total measured time: write the metric name, total milliseconds, scenario, and why it matters.
3. Highest max measured time: write the metric name, max milliseconds, scenario, and whether it matches perceived jank.
4. Missing metrics: write `none` if every required metric appeared, otherwise name each absent metric.

## Next Optimization Candidates

1. Write the first candidate module or function and the metric that justifies it.
2. Write the second candidate module or function and the metric that justifies it.
```
```

- [x] **Step 3: Identify the top two hot paths**

Use these rules:

- Highest repeated call count wins if it runs during every interaction.
- Highest `totalMs` wins if it consumes more total time than other timings.
- Highest `maxMs` wins if one interaction visibly stalls.
- Missing metrics are not evidence; list them separately.

- [x] **Step 4: Verify doc health**

Run: `node tools/pkm-ai/check-doc-health.mjs`

Expected: `doc health: OK`. Glossary warnings for new terms are acceptable only if the terms remain listed in `glossary_candidates`.
