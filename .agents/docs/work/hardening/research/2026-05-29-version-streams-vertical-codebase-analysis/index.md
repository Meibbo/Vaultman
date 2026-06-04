---
title: Version Streams Vertical Codebase Analysis
type: research-index
status: active
parent: "[[docs/work/hardening/index|hardening]]"
created: 2026-05-29T23:41:06
updated: 2026-05-31T01:32:10
created_by: codex-gpt-5
updated_by: codex-gpt-5
tags:
  - agent/research
  - initiative/hardening
  - release/discipline
  - architecture/vertical-analysis
  - version-streams
---

# Version Streams Vertical Codebase Analysis

This record answers the user request for an ultra-detailed, sharded, source-backed
analysis of the differences between Vaultman's version streams, in theory and in
practice, with vertical codebase analysis of the product systems those streams
cover.

The user explicitly requested pauses between shards. This index is the manifest
and coverage ledger. Each shard must be substantial; the full set must exceed
1000 lines and contain five or more shards unless the source evidence shows that
more shards are needed.

## Scope

- Analyze version streams as defined by current Vaultman docs and by actual Git,
  tag, metadata, source-tree, and proto-folder state.
- Name the main differences between the streams honestly, separating:
  - theory: intended role and flow;
  - practice: what exists in the current repository and local design material;
  - mismatch: places where theory and practice are not aligned.
- Cover product systems, product architecture, and design-adjacent material.
- Exclude test and tooling deep dives by user request.
- Use tests/tooling only as contextual evidence when release-stream docs mention
  them; do not analyze them as product systems.
- Preserve detail in shards instead of compressing into an abstract summary.
- Mark unread or pending source areas explicitly.

## Source Rules

This record uses `vm-vertical-codebase-analysis` rules:

- Start from inventory and source evidence.
- Do not analyze files as read unless they were actually inspected.
- Keep a coverage table.
- Split large analysis into shards.
- For Svelte code, use the Svelte skills and treat Svelte 5 runes, effects,
  derived state, props, subscriptions, and view boundaries as first-class
  architecture evidence.

## Current Evidence Snapshot

Captured during this session:

- Current worktree branch: `sandbox`.
- Current local worktree had many pre-existing dirty docs and AI files.
- Product source under `src/` was not listed as dirty in `git status --short`.
- Current `package.json` and `manifest.json` report `1.1.0-beta.1`.
- `versions.json` includes prerelease history and `1.1.0-beta.1`.
- `origin/main` manifest reports `1.0.1`.
- Tag `1.1.0` manifest reports `1.1.0`.
- Tag `1.0.0` manifest reports `1.0.0`.
- No local or remote branch matching `dev`, `beta`, or `nightly` was found by
  branch-name search.
- `C:\Users\vic_A\Downloads\vaultman` exists and contains proto versions
  `proto`, `proto-v2`, `proto-v3`, `proto-v4`, `proto-v5`, `proto-v6`,
  `proto-v7`, HTML prototypes, shared `components`, and screenshots.
- `C:\Users\vic_A\Downloads\Vaultman (1)` does not exist in this local machine,
  even though older docs cite it as the proto-v5 path.
- The user confirmed `proto-v7` is the latest and canonical proto design stream.
- `Vaultman Prototype v7.html` loads `proto-v7/data.jsx`, `proto/icons.jsx`,
  `proto-v7/control-island.jsx`, `proto-v7/popups.jsx`,
  `proto-v7/search-island.jsx`, `proto-v7/stack-island.jsx`,
  `proto-v7/views.jsx`, `proto-v7/explorer.jsx`, `proto-v7/pages.jsx`,
  `proto-v7/nautilus.jsx`, `proto-v7/sidebar.jsx`, `proto-v7/desktop.jsx`,
  and `proto-v7/app.jsx`.
- Local `proto-v7/control-island.jsx` and `proto-v7/app.jsx` are now present and
  read; the earlier missing-file caveat in shard 04 has been corrected.

## Product Source Size Snapshot

This is product-source inventory only, excluding tests/spec files. It includes
`src/dev/perfProbe.ts` in the raw count because it is under `src/`; later shards
will exclude it from product-system interpretation unless a runtime product
surface depends on it directly.

| Ref | Product `src` files | Product `src` LOC | Components | Services | Providers | Types |
|---|---:|---:|---:|---:|---:|---:|
| `origin/main` | 66 | 9809 | 32 | 6 | 0 | 6 |
| `1.1.0` | 268 | 42404 | 83 | 70 | 7 | 23 |
| `sandbox` | 271 | 43411 | 83 | 72 | 7 | 24 |

Immediate implication: the practical stream gap is not a small prerelease delta.
The current canary/beta-ish line has roughly 4.4x the product-source LOC of the
stable `origin/main` line and far more system surfaces. That supports the
project's own "reconstruction" framing.

## Shard Contract

Each shard must include:

- Scope and sources read.
- Clear theory/practice/mismatch separation where relevant.
- Product-system implications.
- Concrete code or metadata snippets when useful.
- Read/pending coverage notes.
- No fake completeness claims.

## Shards

| Shard | Title | Status | Intended coverage |
|---|---|---|---|
| 01 | [[01-stream-taxonomy-and-ground-truth|Stream taxonomy and ground truth]] | second pass integrated | 5-stream model, actual branches/tags/metadata, release mismatch, canonical proto-v7 note, immediate product implications |
| 02 | [[02-stable-stream-vertical-read|Stable stream vertical read]] | second pass integrated | `origin/main` / `1.0.0` / `1.0.1` product shape, stable content replace, linter, curator, popups, status bar, user-facing system state, limitations |
| 03 | [[03-canary-stream-vertical-read|Canary stream vertical read]] | second pass integrated | current `sandbox` product systems: frame, pages, explorer, providers, indexes, services, views, overlays, operations, FnR, diff, ops log, badges |
| 04 | [[04-proto-design-v7-vertical-read|Proto design v7 vertical read]] | done for pause 4 | canonical `Downloads/vaultman/proto-v7`, v7 HTML shell, shared icons, root/control source, design systems, adjacent UI ideas, runtime delta |
| 05 | System-by-system stream delta matrix | pending | Explorer, Filters, Queue/Ops, FnR, Layout/Surface, Theme/Style, API/Interop, Bases/NN, mobile, storage |
| 06 | Promotion and reconciliation spec | pending | what must move upward, what must be retranslated, what must not be merged, practical stream-control gaps |

Shard count may expand if the system-by-system read needs separate shards for
Explorer/DataPlane, Surface/Layout, and Design/Theme.

## Coverage Ledger

| Area | Current status | Evidence |
|---|---|---|
| Start docs | read | `start.md`, `status.md`, `handoff.md` |
| Version stream hub | read | `2026-05-27-version-streams-distillation/index.md` |
| ADR 0006 | read | superseded two-channel publish split |
| Publish initiative | read | stable/main reconcile and beta/canary backlog |
| v1-stable beta relabel | read | `1.1.0` relabel record |
| Architecture navigation | read | zoom-out-map, dev-glossary, operational-watch-list, vaultman-identity |
| Roadmap dispatch | read | dynamic DAG and stream authority |
| Explorer model index | read | 8-dim model and composition stack |
| Current branch/tag facts | read | `git status`, branch list, tag list, graph, rev-list counts |
| Current product metadata | read | `package.json`, `manifest.json`, `versions.json` |
| Stable metadata | read | `origin/main`, `1.0.0`, `1.0.1`, `1.1.0` manifests |
| Product source inventory | partial | directory/file/LOC counts done; per-system vertical read pending |
| Current product code | partial | shard 03 covers `src/main.ts`, frame/navigation/overlays/popups, providers, indexes, data-plane, ViewHost, filters, queue, theme/layout, commands, API, Bases/native/binding services |
| Stable product code | partial | `origin/main` entrypoints, frame, settings, core services, explorer panels, logic, popups, queue/details modals, render helpers read |
| Proto design | partial | shard 04 reads canonical `proto-v7` files, v7 HTML shell, shared icons, and root/control files; older proto folders and shared `components/` remain non-canonical/pending unless needed later |
| Tests/tooling | excluded | user requested no tests/tooling analysis |

## Pause Protocol

- After each shard, stop and report:
  - file path;
  - line count;
  - what was covered;
  - what remains pending;
  - whether the next shard should proceed unchanged.
- Do not silently compress later shards to short summaries.
- Do not update `status.md` or `handoff.md` until the user approves continuing
  or closing this research pass, unless the user explicitly asks for current
  indexes to be updated.

## Immediate Answer, Before Full Shards

The major stream differences are already clear:

1. `goal` is the architecture/spec anchor, not code.
2. `proto design` is v7-canonical design/prototype material in a different
   toolchain, not a mergeable code stream; the local v7 artifact now includes
   the referenced `proto-v7/app.jsx` and `proto-v7/control-island.jsx` scripts.
3. `sandbox` is the current canary stream in theory and the actual active
   workspace in practice.
4. `dev` is supposed to be beta/nightly in theory, but no branch with that name
   is currently visible locally/remotely.
5. `main` is stable in theory and `origin/main` is practically the `1.0.1`
   stable line, while tag `1.1.0` records the mis-release line that was later
   relabeled conceptually as prerelease.

The biggest practical mismatch is that `sandbox` metadata says
`1.1.0-beta.1` while current stream theory says `sandbox` is canary, not beta.
That is not just naming polish: prerelease labels affect user update behavior,
BRAT/release expectations, and how agents should promote or quarantine work.
