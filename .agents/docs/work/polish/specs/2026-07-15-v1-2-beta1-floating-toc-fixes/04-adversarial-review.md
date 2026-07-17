---
title: Adversarial review — v1.2.0-beta.1 Floating TOC corrective batch
type: spec-review
status: passed
parent: "[[docs/work/polish/specs/2026-07-15-v1-2-beta1-floating-toc-fixes/index|beta.1 corrective batch]]"
created: 2026-07-15T00:00:00
created_by: codex-gpt-5
tags: [agent/review, floating-toc, release/1.2.0-beta.1]
---

# Adversarial review

Unprompted pass required by policy C2 before locking the corrective design.

## Scenarios invented beyond the report

| Scenario | Failure without guard | Locked response |
|---|---|---|
| Drag begins on Close after nodes are joined | Index closes while user intended to scrub | Action entries affect geometry but movement never invokes; click invokes once |
| Inactive Props panel rerenders while Files is scoped | Files scope mutates from unrelated callback | Frame callback captures panel identity and reconciles only the active port |
| Collapse an unrelated sibling branch | Scope jumps backward unexpectedly | Pure ancestry walk changes scope only if it reaches the collapsed id |
| Collapse a grandparent while descendant expanded ids remain cached | Hidden descendant scope survives because its own id still appears expanded | Resolve by ancestry of the collapsed id, not by testing only `expandedIds.has(root)` |
| Old beta JSON has `tocGlow=true`/`tocNamePill=true` | Removed features remain visible with no controls | Effective runtime options force deferred effects off |
| Smooth scrub emits pointermove repeatedly over one group | Native smooth scroll is continually restarted | Route only when the active group changes |
| User reverses direction after offside follow | Old HWM pins the track and upward slide remains impossible | Signed shift is recomputed per move; no monotonic latch |
| Bottom rail with dock hidden | Rail keeps a phantom nav offset | Dock-off selector uses frame inset; dock-on uses available edge above dock |
| Conditional toggle/drill/back disappears | Close ceases to be first or indices drift | Build entries from stable ids and derive geometry index from rendered entry order |
| Future sixth right-side Files action | Toolbar wraps again | Append it to the Tools suffix instead of visible nodes |

## SOLID/readability check

- Scope reconciliation is pure logic rather than embedded in three panel callbacks.
- Panels report facts (`collapse-node`/`collapse-all`); the frame owns index state and
  decides the transition.
- The reveal port receives behavior but remains independent of Settings.
- Toolbar menu construction reuses existing actions instead of duplicating explorer
  operations.
- Track entries separate action semantics from shared geometry, avoiding a callback
  union that would execute arbitrary actions during scrub.
- Stored keys are preserved where a rename would add migration risk without user value.

## Explicit quality loss versus `3d86f57c`

- Glow and animated name cells are intentionally removed from beta.1 UI/UX, reducing
  prototype visual parity in exchange for a smaller supported surface.
- Enabling the Tools menu adds one click to Auto-reveal and Expand/Collapse All; it is
  opt-in and buys the five-node density guarantee.
- Soft scrolling can take longer than an immediate jump; it is opt-in and can be turned
  off without remounting the explorer.
- Joined mode increases geometry entries and therefore per-pointer calculations by at
  most four small action nodes; no tree-node or DOM-query scan is added.

## Not covered

- The old Props/Tags table-grid reveal limitation remains deferred.
- Content does not gain a Floating TOC.
- Toolbar redesign for arbitrarily narrow frames or long text controls is outside this
  node-count fix.
- No new 2.0 ActionNode/WAR machinery is imported into 1.x.
- No visual feel, device performance, mobile safe-area, or screenshot verdict is made
  by the agent; the dev owns those checks under the explicit 2026-07-14/15 instruction.

## Verdict

The recommended middle approach remains preferable to symptom-only CSS patches and to
moving the rail into every explorer panel. The three issues are independently
reviewable, preserve the current port seam, and cover every approved requirement.

