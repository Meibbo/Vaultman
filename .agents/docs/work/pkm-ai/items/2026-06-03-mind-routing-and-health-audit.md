---
title: PKM-AI mind-routing + doc-health audit (2026-06-03)
type: work-item
status: active
parent: "[[docs/work/pkm-ai/index|pkm-ai]]"
created: 2026-06-03T10:33:47
updated: 2026-06-03T10:33:47
created_by: claude-opus-4-8
updated_by: claude-opus-4-8
tags:
  - agent/work
  - agent/health
  - initiative/pkm-ai
---

# PKM-AI Mind-Routing + Doc-Health Audit — 2026-06-03

Dev-requested P3 verification (MD-P3) before product brainstorm. Read-only Explore pass + authoritative `check-doc-health.mjs` run + manual file-existence verification. No files edited.

## Verdict: mind-routing INTACT

The Explore agent raised several "missing file / broken route" alarms. **Verified false** — all exist:

- `architecture/glossary.md` ✓ · `current/engineering-context.md` ✓
- `architecture/adr/README.md` ✓ + ADRs **0001–0009 all present** ✓
- `architecture/explorer-model/` 4 shards (01 responsibility-map · 02 render-and-data · 03 surfaces-interaction · 04 panels-axons-mutation-layout) + index + visuals/model-map ✓
- All 8 architecture surfaces + `decision-graph.md` + `dev-glossary.md` + `agent-memory-routing-best-practices.md` ✓

start.md → status → handoff → architecture-cluster chain resolves. Lesson: Explore reads excerpts, not globs — its existence claims need verification (this is why the audit was re-run, not trusted).

## REAL findings (ordered by risk)

### 1. Conflict-duplicate files in `architecture/` (HIGH — twin docs mislead agents)

Obsidian-Sync conflict copies left in tree:
- `architecture/research-inventory (conflict 2026-05-28-00-54-26).md`
- `architecture/explorer-model/01-responsibility-map (conflict 2026-05-26-16-49-26).md`
- `architecture/explorer-model/03-surfaces-and-interaction (conflict 2026-05-26-20-14-43).md`
- `architecture/explorer-model/04-panels-axons-mutation-layout (conflict 2026-05-26-20-14-43).md`

**Fix (dev-gated, NOT auto-delete)**: diff each conflict copy vs its canonical sibling, merge any unique content into canonical, then remove the stale copy. Do NOT bulk-delete (cf. 706-file deletion incident).

### 2. Doc-health: FAIL = 121 issues (HIGH — quantified P4 backlog)

`check-doc-health.mjs` headline `doc health: FAIL (121)`. Breakdown:
- **52 hard line-limit** (>300, must shard). Worst: `hardening/research/2026-05-29-version-streams-vertical-codebase-analysis/` shards at 627 / 1516 / 1913 / **2635** lines; multiple `polish/plans/2026-05-11-ui-modernization-vertical-threads/` at 1000–1379; `0-A baseline-log` 624.
- **40 timestamp-offset** (`-05:00` present; policy = no offset). Mechanical fix.
- **29 parent-shape** (parent not `[[path|alias]]`). Concentrated in `hardening/plans/2026-05-18-explorer-sub-system-0-a-native-dom-parity/` shards. Mechanical fix.
- Plus **78 WARN** (soft line-limit 201–300 etc.) — dev-decided, not failures.

### 3. Stale routing text (MEDIUM)

- `handoff.md` says decisions "S-1..S-11"; `status.md` says "S-1..S-14"; reality = **S-26 locked, S-27 next** (per 2026-05-29 checkpoint). Update handoff/status decision-count text.
- `status.md` (295 ln) + `handoff.md` (297 ln) sit at the soft cap and carry long Verification-Snapshot / session-recap logs that policy says belong in initiative/archive records, not the route index.
- Checkpoints (2026-05-28, 2026-05-29) are reachable from status/handoff but not in start.md's mandatory list.
- `session-log.md` has only the 2026-05-29 entry (no backfill) — limited cross-session audit trail.

## Recommended P4 cleanup order (effort/risk ascending)

1. **timestamp-offset (40)** — strip offsets; safe, scriptable.
2. **parent-shape (29)** — fix to `[[path|alias]]`; safe, mostly one folder.
3. **Stale S-count + checkpoint route text** — small edits to handoff/status/start.
4. **Conflict files (4)** — dev-gated diff+merge+remove.
5. **Hard line-limit (52)** — shard >300 docs into parts + manifests; review auto-shard (`--repair-line-limits`) output (it splits only past hard cap). Big ones need manual topic-aware splits.
6. **Status/handoff log bloat → archive** via `archive-active-doc.mjs` then relink.
7. **Soft WARNs (78)** — dev-decided, lowest priority.

## Notes

- My 2026-06-03 megadump draft files passed clean (correct frontmatter, within limits).
- `current/` already has dedicated `backlog.md`, `bugs.md`, `conflicts.md`, `regressions.md` — the megadump's CR-1..CR-8 forks could promote into `current/conflicts.md` when the dev routes them.
- Ties: [[docs/architecture/agent-memory-routing-best-practices|memory-routing best-practices]] (S-31 gap), [[docs/work/pkm-ai/items/2026-05-27-agent-memory-routing-upgrade|memory-routing upgrade]].
