---
title: SDF-010 Content explorer parity with Core Search
type: issue
issue_id: SDF-010
status: needs-triage
issue_kind: AFK
parent: "[[docs/work/hardening/issues/stable-1-1-data-files-parity/index|Stable 1.1.0 Data/Files parity local issues]]"
created: 2026-06-06T07:53:25
updated: 2026-06-06T07:53:25
labels:
  - needs-triage
  - needs-research
tags:
  - agent/issue
  - initiative/hardening
  - release/1.1.0
  - explorer/content
  - explorer/search
created_by: codex-gpt-5
updated_by: codex-gpt-5
---

# SDF-010 Content Explorer Parity With Core Search

## Parent

[[docs/work/hardening/issues/stable-1-1-data-files-parity/index|Stable 1.1.0 Data/Files parity local issues]]

## What To Build

Align Vaultman Content explorer with Obsidian Core Search for result count, virtualized result
display, node structure, result controls, and CSS classes while preserving Vaultman's own regex,
replace, filter, and queue affordances.

## Research Gate

- [ ] Use `obsidian-cli` against `plugin-dev` to inspect Core Search DOM, classes, row structure,
      controls, expand/collapse behavior, snippet controls, copy results, bookmark behavior, and
      virtualized large-result rendering.
- [ ] Use `obsidian-web-lab` when DOM inspection is insufficient to understand Core Search APIs,
      index use, commands, lifecycle, or virtualization.
- [ ] Capture before/after evidence for a query such as `obsiman`, where current observed counts
      differ between Vaultman and Core Search.
- [ ] Document what Vaultman reuses directly, what it mirrors through equivalent behavior, and what
      remains intentionally different.

## Acceptance Criteria

- [ ] Query `obsiman` returns the same match count as Core Search, or any difference is documented as intentional and source-backed.
- [ ] Vaultman does not use a normal-case visual cap like `and N more files` or `continuara`.
- [ ] If Core Search can show more than 1000 result nodes, Vaultman can also show them through virtualization without freezing Obsidian.
- [ ] Results use equivalent structure: file/result as level 1 node and snippet/match as level 2 node.
- [ ] Each level 1 result can be expanded and collapsed.
- [ ] Content exposes `Expand all` / `Collapse all`.
- [ ] Individual snippets expose equivalent more-context-above and more-context-below controls.
- [ ] Content exposes equivalent copy-results and bookmark actions where Core Search provides them.
- [ ] Result rows, snippets, context buttons, and states reuse Core Search CSS classes where viable.
- [ ] Vaultman's own regex, replace, filter, and queue actions remain available without changing Core Search semantics.

## Blocked By

None - can start immediately.

## Verification

- Run documented DOM/API research first.
- Run focused Content/native-search adapter tests.
- Build, sync, reload `plugin-dev`, compare Core Search and Vaultman counts for `obsiman`, and smoke large-result virtualization.
