---
title: S3b — doc-health backlog prune (scoped, multi-agent-safe) — plan shard
type: plan-shard
status: active
lifecycle: active
parent: "[[docs/work/pkm-ai/plans/2026-06-04-orchestration-upgrade/index|orchestration-upgrade plan]]"
created: 2026-06-06T05:20:00
updated: 2026-06-06T05:20:00
created_by: claude-opus-4-8
updated_by: claude-opus-4-8
tags:
  - agent/work
  - agent/plan
  - initiative/pkm-ai
---

# S3b — Doc-Health Backlog Prune

S3a (ADR [[docs/work/pkm-ai/adr/0002-memory-lifecycle-states|0002]]) added the lifecycle/stale-active checks; S3b clears the standing `check-doc-health` FAIL backlog. Status: **plan-only, dev-gated per bucket** (no files touched yet). Blocker: the repair pass runs corpus-wide, so it cannot run safely while another stream's docs are contended.

## Ground truth (fresh count 2026-06-06) — ~129 fails

| Bucket | Fails | Disposition |
|---|---|---|
| **work/hardening/** (Codex domain) | 88 over 78 files (47 line-limit · 26 parent-shape · 15 timestamp) | **S3b.3 — gated on Codex window** |
| **current/** (status + handoff route docs) | 3 line-limit | **FORBIDDEN** — route-owner/dev only, never this agent |
| **SAFE** (other initiatives + architecture) | ~37 (25 timestamp · 11 line-limit · 3 parent) | **S3b.2 — repair now (uncontended)** |
| session-log.md (shared append-only journal) | 1 line-limit | defer — growing journal; shard with the journal owner |

Note: `work/pkm-ai/**` = **0 fails** (S5/S6 docs clean). Most hardening fails are in older explorer plans/specs (`2026-05-11`…`2026-05-20`), only ~7 in the active `2026-05-29-version-streams` dir.

## Blocker → the tooling fix (S3b.1)

`check-doc-health --repair-residuals` repairs the **whole** `.agents/docs` tree — it would rewrite hardening + current/ docs too (clobbering Codex's in-flight shards and touching forbidden route docs). So the repair must become path-scopable before any prune.

- **S3b.1 (TDD, tooling):** add repeatable `--path <prefix>` (and/or `--exclude <prefix>`) to `check-doc-health`'s check + repair pass, so a run can be confined to a subtree and explicitly skip `current/` and `work/hardening/`. tsc stays 47; default suite green; new test covers scoped repair only touching in-scope files. Reusable later to target hardening once a window opens.

## Slices

- [x] **S3b.1 — `--path`/`--exclude` scoping** (`f380a84`, TDD 3 tests). Multi-agent-safe repair.
- [x] **S3b.2a — repair SAFE content-preserving subset** (`e6dc2ed`): scoped `--repair-timestamp-offsets --repair-parent-shape --exclude work/hardening --exclude current --exclude sessions`. 16 files (work/research, work/publish, work/polish, superpowers specs): stripped tz offsets (value preserved) + 3 parent-shape fixes. SAFE-scope timestamp+parent fails → 0; hardening/current untouched (proven: my repair wrote only those 16 safe files).
- [~] **S3b.2b — line-limit auto-shard (9 SAFE files): DEFERRED** (dev decision 2026-06-06 — do not reshape historical plans for a line-limit WARN). `--repair-line-limits` would split docs >300 lines into continuation parts. Files: `architecture/pending-decisions.md`;
  `work/polish/plans/2026-05-11-ui-modernization-vertical-threads/` (01–04 + index);
  `work/polish/plans/2026-05-13-toolbar-coexistence-fnr-recents/` (01–03). Better remedy for the old plans:
  mark `lifecycle: archived/superseded` (archived docs need no sharding) when curated.
- [ ] **S3b.3 — hardening (88) — GATED on Codex.** Message sent (`msg_mq27ocvh_gfawv6`). Only after Codex confirms safe/committed paths; scoped repair over confirmed paths only; never the in-flight `2026-05-29-version-streams` shards unless handed off.
- current/ (3) + session-log (1): **out of scope** for this agent (route docs + shared journal).

## Coordination protocol (how the hardening window opens)

Agent-room (run `room_20260604_110423_e9c65d`, state in `.git/vaultman-room`), async, poll-at-turn-boundary:

1. `mailbox send --to <codex hardening agent> --kind question` — announce S3b intent + the failing hardening file list; ask Codex to (a) commit in-flight shards, or (b) hand off a list of paths safe to repair, or (c) name paths to exclude.
2. On Codex's reply (next-turn): `scope claim --task <id> --path <confirmed paths>`; re-check `scope conflicts` clean.
3. Run scoped `--repair-residuals --path <confirmed>` only; verify those paths → 0; commit; `scope release`.
4. Never touch a hardening file blind. current/ stays dev-owned regardless.

## Verify gates

`tsc` stays 47 · default `node --test` suite green · scoped repair only modifies in-scope files (`git status --short` shows nothing under `work/hardening/` or `current/` unless explicitly in the window).
