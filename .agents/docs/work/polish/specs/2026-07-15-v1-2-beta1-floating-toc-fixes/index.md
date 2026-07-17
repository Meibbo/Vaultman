---
title: Spec — v1.2.0-beta.1 Floating TOC corrective batch
type: spec
status: approved
parent: "[[docs/work/polish/specs/2026-07-14-v1-2-floating-toc/index|v1.2 Floating TOC]]"
created: 2026-07-15T00:00:00
created_by: codex-gpt-5
approved_by: dev
tags:
  - agent/spec
  - initiative/polish
  - release/1.2.0-beta.1
  - floating-toc
---

# Spec — v1.2.0-beta.1 Floating TOC corrective batch

Corrective batch approved by the dev on 2026-07-15 after manual review of the
`3d86f57c` Niagara port. The batch keeps the existing `v12/ftc-001` worktree and
repairs the lifecycle, toolbar-density, scroll, track-composition, positioning,
and style contracts before publishing `1.2.0-beta.1`.

The original FTC-001..006 records remain the implementation history. This spec
supersedes their claims that the complete Niagara port was closed or that beta.1
ended after FTC-004.

## Approved sub-specs

- [[docs/work/polish/specs/2026-07-15-v1-2-beta1-floating-toc-fixes/01-ftc-007-index-lifecycle|FTC-007 — index lifecycle, scoped collapse, and soft scroll]].
- [[docs/work/polish/specs/2026-07-15-v1-2-beta1-floating-toc-fixes/02-ftc-008-toolbar-settings|FTC-008 — toolbar Tools menu and Settings information architecture]].
- [[docs/work/polish/specs/2026-07-15-v1-2-beta1-floating-toc-fixes/03-ftc-009-niagara-track|FTC-009 — Niagara track composition, placement, and option deferral]].
- [[docs/work/polish/specs/2026-07-15-v1-2-beta1-floating-toc-fixes/04-adversarial-review|Adversarial review and explicit losses/non-goals]].

## Baseline

- Code worktree: `C:/tmp/vaultman-v12-ftc001`.
- Branch: `v12/ftc-001`.
- Baseline commit: `3d86f57c feat(explorer): full Niagara port with effects, options, node-scrub`.
- Base release: `1.1.6` (`5b0ea994`).
- Publication target: `1.2.0-beta.1`; this corrective batch is part of beta.1,
  not a 1.1.6 patch and not a post-1.2 patch.
- AI docs stay local-only and never enter the pushable code commit.

## Cross-cutting invariants

1. The floating index remains an overlay owned by `VaultmanFrame.svelte`; explorer
   panels remain ports and do not mount their own copies of the component.
2. The jump path remains `FloatingToc -> FloatingTocRouter -> active panel ->
   virtualized view`; DOM-query jumping from the prototype remains prohibited.
3. Closing the index persists `floatingTocEnabled=false` without remounting the
   explorer page.
4. Action nodes and index-group nodes are distinct behaviors even when they share
   one Niagara geometry track. Scrubbing across an action node never invokes it.
5. A toolbar with the opt-in Tools menu has at most five action nodes in every
   currently reachable Data tab configuration.
6. Old persisted values for deferred name/glow options must not leak their effects
   back into beta.1 after their Settings rows are removed.
7. No visual/UI automation, Obsidian smoke, `emulateMobile`, screenshot comparison,
   or device emulation is an agent gate. The dev owns visual and device judgment
   until this instruction is explicitly changed.

## Nonvisual completion gates

- RED/GREEN focal tests for each behavioral contract.
- Svelte autofixer on every touched `.svelte` file, ending with `issues: []`.
- Focused Vitest suites for Floating TOC, toolbar, settings, router, tree, and
  affected virtualized views.
- `pnpm run check`.
- `pnpm run lint`.
- `pnpm run stylelint` when `styles.css` changes.
- `pnpm run build`.
- Full unit suite before declaring the complete corrective batch closed.
- `git diff --check` and a final worktree/provenance audit.

## Issue order

FTC-007 lands first because it defines the typed lifecycle and reveal behavior.
FTC-008 is independent of the rail geometry and lands second. FTC-009 consumes the
FTC-007 action callbacks and performs the final track restructure. Each issue must
remain a separately reviewable code commit; `.agents` updates are a separate local-only
docs commit.

