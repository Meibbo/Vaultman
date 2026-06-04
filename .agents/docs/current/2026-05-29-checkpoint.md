---
title: 2026-05-29 Checkpoint — feature grill closeout + decision maps
type: agent-handoff-shard
status: active
parent: "[[docs/current/handoff|handoff]]"
created: 2026-05-29T23:45:00
updated: 2026-05-29T23:58:00
created_by: codex-gpt-5
updated_by: codex-gpt-5
tags:
  - agent/current
  - agent/checkpoint
  - agent/handoff
---
# 2026-05-29 Checkpoint — feature grill closeout + decision maps

Feature-request grill captured and closed for this session. No product code changed. This checkpoint
adds a dev-facing pending-question item plus Mermaid visual maps for resuming.

## What changed

- S-26 locked: `NodeIdentity={providerId,kind,canonicalId}`, `NodeOccurrence` = visual appearance,
  `Membership` = relation/context causing appearance. Identity is never label; sibling label collisions
  require a default disambiguation affordance.
- `MembershipEdge` renamed to **Membership**.
- `pack` clarified as non-canonical; use user-named manual `ContainerNode`.
- S-27 panelData was NOT locked; it needs a dedicated grill/research (`R-PANELDATA`).
- PKM-AI gap recorded: anecdotal edge-case/model-thinking routing (S-31).

## New / updated source records

- [[docs/work/hardening/items/2026-05-29-dev-pending-question-inventory|Dev Pending Question Inventory]]
- [[docs/work/hardening/visuals/2026-05-29-pending-decisions-roadmap-map|Pending Decisions / Roadmap Mermaid Map]]
- [[docs/work/hardening/research/2026-05-28-feature-request-architecture-fit/index|Feature Request Architecture Fit]]
- [[docs/work/hardening/research/2026-05-28-feature-request-architecture-fit/01-api-patterns-paneldata-membership|API Patterns / Repeated Membership]]
- [[docs/work/hardening/research/2026-05-28-feature-request-architecture-fit/02-identity-occurrence-membership-cases|Identity / Occurrence / Membership Cases]]
- [[docs/work/hardening/research/2026-05-28-feature-request-architecture-fit/03-paneldata-primitives-presets|PanelData / Primitive Adapters / Presets]]
- [[docs/work/pkm-ai/items/2026-05-27-agent-memory-routing-upgrade|Agent memory routing upgrade]]
- [[docs/architecture/pending-decisions|pending-decisions]]
- [[docs/architecture/research-inventory|research-inventory]]
- [[docs/architecture/tooling-libraries|tooling-libraries]]

## Next action

Resume at **S-27 panelData contract**:

- distinguish `panelExplorer` vs `panelData`;
- decide what capabilities `panelData` exposes to Mediator / viewScene / sortScene / LayoutBuilder;
- evaluate charts/widgets/timers/spreadsheet/table/script bridges before locking architecture.

Then: S-29 primitive adapter strategy, S-10/S-11 DnD/tooling locks, then S-15/S-16 external APIs.

## Verification notes

- `git diff --check` passed for the latest touched docs.
- Feature-intake continuation shards are below hard cap: 123, 192, and 116 lines.
- Full doc health still has pre-existing hard-cap/parent/timestamp failures outside this slice.
- `pending-decisions.md` remains soft-WARN range; dev decides shard vs leave.

## Worktree note

Branch `sandbox` was already docs-dirty from goal-anchor iterations. This session preserved unrelated
dirty files and added docs-only checkpoint / inventory / visual records.
