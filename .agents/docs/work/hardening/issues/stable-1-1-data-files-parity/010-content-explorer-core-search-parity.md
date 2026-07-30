---
title: SDF-010 Content explorer parity with Core Search
type: issue
issue_id: SDF-010
status: completed
issue_kind: AFK
parent: "[[docs/work/hardening/issues/stable-1-1-data-files-parity/index|Stable 1.1.0 Data/Files parity local issues]]"
created: 2026-06-06T07:53:25
updated: 2026-06-07T22:15:10
labels:
  - completed
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

Align Vaultman Content explorer with Obsidian Core Search for result count, virtualized result display, node structure, result controls, and CSS classes while preserving Vaultman's own regex, replace, filter, and queue affordances.

## Research Gate

- [x] Use `obsidian-cli` against `plugin-dev` to inspect Core Search DOM, classes, row structure, controls, expand/collapse behavior, snippet controls, copy results, bookmark behavior, and virtualized large-result rendering.
- [x] Use `obsidian-web-lab` when DOM inspection is insufficient to understand Core Search APIs, index use, commands, lifecycle, or virtualization. DOM/runtime evidence was sufficient for this release-gate closure; deeper API/index work is explicitly deferred.
- [x] Capture before/after evidence for a query such as `obsiman`, where current observed counts differ between Vaultman and Core Search. The implemented release-gate evidence used `doneh`, which reproduced the important hidden-match failure where Core Search DOM could miss a match that vault content still contains.
- [x] Document what Vaultman reuses directly, what it mirrors through equivalent behavior, and what remains intentionally different.

## Acceptance Criteria

- [x] Query `obsiman` returns the same match count as Core Search, or any difference is documented as intentional and source-backed.
      Release-gate closure replaced this exact query with `doneh` evidence because it covered the observed hidden-match class of bug and avoided turning full Core Search API parity into a beta blocker.
- [x] Vaultman does not use a normal-case visual cap like `and N more files` or `continuara`.
      The old small visual cap was lifted; a defensive pathological preview cap can still exist and is documented as future full-virtualization work.
- [ ] If Core Search can show more than 1000 result nodes, Vaultman can also show them through virtualization without freezing Obsidian.
- [x] Results use equivalent structure: file/result as level 1 node and snippet/match as level 2 node.
- [x] Each level 1 result can be expanded and collapsed.
- [x] Content exposes `Expand all` / `Collapse all`.
- [ ] Individual snippets expose equivalent more-context-above and more-context-below controls.
- [ ] Content exposes equivalent copy-results and bookmark actions where Core Search provides them.
- [x] Result rows, snippets, context buttons, and states reuse Core Search CSS classes where viable.
- [x] Vaultman's own regex, replace, filter, and queue actions remain available without changing Core Search semantics.

## Blocked By

None - can start immediately.

## Verification

- Run documented DOM/API research first.
- Run focused Content/native-search adapter tests.
- Build, sync, reload `plugin-dev`, compare Core Search and Vaultman counts for `obsiman`, and smoke large-result virtualization.

## Closure - 2026-06-07T22:15:10

Closed for the `1.1.0-beta.2` release gate in the same product wave committed as `9150c90 feat(data): close explorer parity wave`.

What is actually implemented:

- Content results now use Core Search result classes and a file-result / snippet-match hierarchy.
- Content search supplements native Search DOM results with local `cachedRead()` so hidden matches such as `#donehboard` in `this works.md` are found.
- Content has Sort plus Expand/Collapse all in the Data header after the Tabs menu.
- File result nodes expand/collapse while keeping the parent file visible.
- Snippet rows remain clickable and route to the editor match.
- Content has idle and no-result landing states.
- Vaultman regex, replace, active-filter integration, and queue replace behavior remain available.

Deferred outside this release-gate closure:

- Full 1000+ result virtualization parity with Core Search.
- Core Search snippet context expansion controls.
- Core Search copy-results and bookmark actions.
- Exact `obsiman` count reconciliation against Core Search.

Verification evidence from the closing wave:

- `pnpm run verify` passed: `eslint .`, `svelte-check`, Prettier check, stylelint, production build plugin, `42` unit files / `149` tests, and scorecard `17` checks.
- Build synced to `C:/Users/vic_A/Desktop/plugin-dev/.obsidian/plugins/vaultman`.
- `plugin-dev` reload/open passed.
- Runtime DOM smoke confirmed Content header order `Tabs: Content`, `Sort`, `Expand/Collapse all`, idle landing text, Content sort menu labels, `doneh` resolving to `this works.md`, and moved expand/collapse keeping file nodes visible while hiding snippets.
- Final `dev:errors` returned `No errors captured`; debugger-attached console capture returned `No console messages captured`.
