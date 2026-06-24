---
title: "Vaultman v1 backlog audit from beta 15-18 scope note"
type: backlog-audit
status: active
initiative: hardening
parent: "[[docs/work/hardening/index|hardening]]"
created: 2026-05-07T06:06:10
updated: 2026-05-07T06:29:09
created_by: codex
updated_by: codex
source_note: "C:/Users/vic_A/My Drive (vic_alejandronavas@outlook.com)/Start of The Road/+/2026-04-15-1812 Vaultman v1.0 scope.md"
tags:
  - agent/backlog
  - agent/audit
  - hardening/v1
---

# Vaultman v1 Backlog Audit From Beta 15-18 Scope Note

## Purpose

This audit classifies the 2026-04-15 beta 15/17/18 backlog against the current
Vaultman hardening worktree, active docs, and the migrated 2026-04-28 v1.0
scope triage. It is a triage artifact, not an implementation plan.

## Classification

- `release-blocking v1`: the complete v1.0 required scope, not only a minimal
  stability bar. This includes hardening outputs, adjacent fixes, and the
  successor v1.0 Polish project.
- `in-hardening`: direct hardening output or adjacent fix from the old triage.
- `v1.0 polish`: old triage `out-hardening` items. These were outside the
  hardening project but inside the v1.0 release path.
- `post-rc.1`: valid work beyond v1.0 Polish, not required for the v1.0 release.
- `superseded/resolved`: current code or active plans appear to cover it.
- `needs verification`: source evidence suggests a direction, but the item
  needs live Obsidian or targeted test confirmation before being moved.

## Shards

- [[docs/work/hardening/backlog/2026-05-07-v1-scope-audit/01-release-blocking-v1|01-release-blocking-v1]]
- [[docs/work/hardening/backlog/2026-05-07-v1-scope-audit/02-v1-polish-scope|02-v1-polish-scope]]
- [[docs/work/hardening/backlog/2026-05-07-v1-scope-audit/03-superseded-or-resolved|03-superseded-or-resolved]]
- [[docs/work/hardening/backlog/2026-05-07-v1-scope-audit/04-needs-verification|04-needs-verification]]

## Current Read

The earlier 2026-04-28 triage is authoritative for the release boundary:
`out-hardening` means "move to v1.0 Polish", not "after v1.0". Therefore the
v1.0 scope is broad. It includes hardening, UX polish, Bases parity, theming,
and the programmable interface foundation/consumers listed in Annex B.

The only explicit non-v1 buckets from that triage are `post-rc.1`, `cancelled`,
and items already verified as fixed. Some current items may still move from
`needs verification` to resolved, but they should not be downgraded to "later"
just because they are polish-heavy.

## Open Decision

Resolved sequencing decision: after current hardening work, v1.0 UX Features
begin with perceived performance and interaction feel before larger visible
redesigns. The first UX slice is cursor affordance policy, cheap hover states,
clean state separation for rows/tiles/cards, and reduced-motion behavior. This
precedes navbar/menu redesign, inline rename, and explorer Outline work.
