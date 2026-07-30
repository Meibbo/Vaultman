---
title: Health residual auto repair
type: implementation-plan
status: done
parent: "[[docs/work/pkm-ai/plans/2026-05-10-agent-control-plane/index|agent-control-plane-plan]]"
created: 2026-05-10T10:56:07
updated: 2026-05-10T10:56:07
created_by: codex
updated_by: codex
tags:
  - agent/plan
  - initiative/pkm-ai
  - agent/workflow
---

# Health Residual Auto Repair

## Goal

Extend the PKM-AI health checker beyond line-limit sharding so it can repair the remaining blocking residual classes from the active docs tree.

## Scope

Implemented:

- `--repair-parent-shape`
- `--repair-timestamp-offsets`
- `--repair-forbidden-public-docs`
- `--repair-residuals` as the combined repair entrypoint

The existing `--repair-line-limits` remains explicit and is included in `--repair-residuals`.

## Behavior

Parent repair normalizes malformed `parent` values into the required `[[path|alias]]` shape. Relative `[[index]]` parents are expanded to the document's sibling index path. Raw `path|alias` parents are wrapped. Template placeholder parents under `.agents/docs/templates/` are preserved as `"{{parent_link}}"` and treated as valid placeholders instead of nested inside another wikilink.

Timestamp repair removes `Z` or `+/-HH:MM` offsets from `created` and `updated` values while preserving the original local wall-clock value.

Public-doc repair moves forbidden root `docs/superpowers` into:

```text
.agents/docs/archive/pkm-ai/public-docs/<timestamp>-superpowers/
```

The content is moved, not deleted, and an `archive_created` metric is recorded.

## Live Repair Result

Running:

```powershell
node .agents/tools/pkm-ai/check-doc-health.mjs --repair-residuals
```

performed:

- parent repair: 18 files;
- timestamp repair: 8 files;
- public-doc repair: archived `docs/superpowers`;
- final doc health: `doc health: OK`.

Glossary candidates remain warnings and are intentionally not blocking.

## Verification

- RED: focused doc-health test failed because `--repair-residuals` did not exist.
- GREEN: focused `doc-health.test.mjs` passed, 4/4.
- Full PKM-AI tool suite passed, 19/19:
  `npm --prefix .agents/tools/pkm-ai test`.
- Live health passed:
  `node .agents/tools/pkm-ai/check-doc-health.mjs` -> `doc health: OK`.
- Scoped `git diff --check` passed for PKM-AI tools, docs, archive moves, and metrics.
