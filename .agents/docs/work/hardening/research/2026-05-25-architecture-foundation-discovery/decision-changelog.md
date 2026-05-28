---
title: Decision Changelog (superseded / changed decisions)
type: research-shard
status: active
parent: "[[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/decision-ledger|Decision Ledger]]"
created: 2026-05-27T00:00:00
updated: 2026-05-27T00:00:00
created_by: claude-opus-4-7
updated_by: claude-opus-4-7
tags:
  - agent/research
  - agent/decision-ledger
  - agent/audit
---

# Decision Changelog

Audit trail of decisions that CHANGED or were SUPERSEDED — what, when, why. Created 2026-05-27
after the dev flagged that in-place overwrites were dropping the "why it changed" trail. Practice
going forward: when a recorded decision changes, **add a row here** + update the source doc — do
not silently overwrite.

| Date | Decision | From → To | Why |
|---|---|---|---|
| 2026-05-26 | orchestrator umbrella name | "Scene orchestrators" → **Panel-scoped controllers** | code shows state keyed by `provider.id` (per-panel); the Scene composes via `PanelHandle` |
| 2026-05-26 | per-node decoration source (style row 1) | "ADOPT stable" → **ADOPT beta `.vm-badge`** | stable↔beta evidence: beta's badge system (quick-action/hover/undoable/inherited) is richer than stable's basic badges |
| 2026-05-26 | in-filters highlight (style row 2a) | "stable prettiest" → **ADOPT beta** (inset-shadow + opacity elevation) | evidence: beta upgraded it; the "stable prettiest" recall was taste / conflated with the selection-color regression |
| 2026-05-26 | style matrix row 4 (theming) | "ADOPT color-mix + theme packs ADD" → **color-mix TECHNIQUE ADOPT; 6 palettes DROP** | conflated technique with palettes; merge-umbrella 01-merge-map LOCKED the palette DROP (Obsidian handles themes) |
| 2026-05-27 | branch ↔ channel mapping | "sandbox = beta" (ADR 0006 / research-streams) → **main=stable · dev=beta · sandbox=canary** | dev decision; ADR 0006 to reconcile |
| 2026-05-27 | pre-release tag scheme | "dev=`-beta.N` / sandbox=`-rc.N`" → **OPEN** (corrected) | naive/backwards (rc > beta in stability) + semver pre-release is linearly ordered (update-detection gotcha); labels map to stability, more than two allowed |
| 2026-05-27 | feature-flags ↔ serviceUnload | "feature-flags = our serviceUnload/load-preset" → **SEPARATE** | dev-side feature-flags (release/branch divergence) ≠ user-facing load-preset (lite/bloated granularity, anti-uninstall) |
| 2026-05-27 | input→action: nav vs action | "nav-intent vs action-intent split" → **nav is a subset of actions** (nav-kind ActionNode, transient view-state, handled by Selection/Expansion) | dev: navigation ≈ action; unify under ActionNode (ADR 0005), distinguish by EFFECT not routing |
| 2026-05-27 | reconciliation vocab | added **FIX** (half-done); folded **EXCLUDE → DEFER**; DROP clarified = reject-on-merits | dev found DROP/EXCLUDE confusing + needs a FIX verb for half-done features |
| 2026-05-27 | proto naming | "proto-v6" → **"proto design"** (rolling stream; pin a snapshot id only when mapping) | proto v7 ships 2026-05-28 → version-pinned doc refs lose meaning |
| 2026-05-27 (later) | FilterGroup vs serviceGroup | sidebar-map "FiltersIslandV4 → filter logic + `serviceGroup` (ContainerNodes)" → **FilterGroup = recursive boolean predicate tree (≠ serviceGroup); both materialize as ContainerNode trees, different producer** | proto `stack-island.jsx` is a boolean predicate tree (and/or/none + orphans), not node-grouping; serviceGroup = the SortIsland group-by → ContainerNodes |
| 2026-05-27 (later) | proto stream direction | "proto = throwaway, never merges (re-translate only)" → **add: we may EDIT proto to keep it aligned with the idea, then hand back to Claude-design (bidirectional steer)** | dev: stop letting proto drift across versions disconnected from our logic/subsystems |
| 2026-05-27 (later) | Bases OUT "confirmed" | ledger "Bases OUT = `registerBasesView` (confirmed in web-lab app.js)" → **target only; NOT built, API method shapes UNKNOWN (app.js minified, not analysable)** | read-only agent could not reverse-engineer minified app.js; current code is IN-only → B.P must source the API from official Obsidian API docs |
| 2026-05-27 (later, +1) | Bases OUT "API shape UNKNOWN" | "UNKNOWN" → **DOCUMENTED in `obsidian.d.ts` v1.10.0+** (`registerBasesView`/`BasesView`/`BasesEntry`/`Value.renderTo`) | extension-API research found the typings; minified app.js was the wrong source — see `obsidian-extension-api-findings` |
| 2026-05-27 (later, +2) | Bases interop strategy | ledger "Bases OUT = registerBasesView + emit `bases-*`" (open target) → **HYBRID LOCKED via [[docs/architecture/adr/0009-bases-interop-hybrid\|ADR 0009]]**: native shells PRIMARY · Bases-IN + import/export ALWAYS · Bases-OUT = opt-in PlatformAdapter add-on · foreign views stay OPAQUE | ecosystem recon (~6–10 plugins, API documented 1.10.0+, ~1–2 breaking bumps/12–18mo); bulk-ops + interactive builder = the orthogonal moat — pure Path A or B both suboptimal |

## Open meta-improvement

PKM-AI memory management (working vs procedural/semantic) needs an upgrade — the dev reports
info loss between chats + repeated "go read doc X" reminders. Candidate: a pkm-ai initiative
item to make status/handoff + this changelog the reliable cross-session memory surface.
