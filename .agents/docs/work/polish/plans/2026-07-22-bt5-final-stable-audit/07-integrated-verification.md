---
title: BT5 final stable audit plan — integrated verification
type: implementation-plan-shard
status: active
lifecycle: active
parent: "[[index|Vaultman v1.2.0 final stable audit implementation plan]]"
created: 2026-07-22T15:45:00
updated: 2026-07-22T15:45:00
created_by: codex-gpt5-root
updated_by: codex-gpt5-root
tags: [agent/plan, initiative/polish, release/1.2.0, verification]
---

# Integrated regression and stable preflight

## Task 21 — Cross-slice integration tests

**Create/modify only where the harness supports real behavior:**

- focused WDIO specs under `test/e2e/` for Navbar overflow, Property action cells and queue badges;
- unit test groups named in prior shards;
- scroll smoke fixtures only if geometry changes require a new invariant.

### Integration scenarios

1. Content/Text: pause → Has/Hasn't → sort order, then Condensed moves the rightmost suffix into menu without changing action behavior.
2. Statistics: same Navbar instance switches in, scope menu updates data, then switching to Plugins has no stale Statistics action.
3. Props: Format on, checkbox/date edit, one queued Update badge, repeat replaces, cancel restores raw state, Apply persists.
4. Icons: Iconic disabled while menu is open; selection falls back safely; no duplicate action after re-enable.
5. Layout: hidden explorer scrollbar + Floating Index + wrapped Navbar + toolbar hidden/peek; rows never hide beneath the rail and clip at top.
6. Rename: Content single target starts literal basename, queue badge appears, Apply; Snippet stages and Apply refreshes CSS snippets.
7. Filters: fast double exclusive, next single remove; slow double acts as two singles; highlight/dot remain consistent through collapse and view switch.

Each test must reset settings/queue and avoid order dependence.

## Task 22 — Fresh automated release gates

Run from `C:\tmp\vaultman-release-beta2-final2` after all slices and after any subsequent fix:

```powershell
git diff --check
pnpm run lint
pnpm run check
pnpm run format:check
pnpm run stylelint
pnpm run build:plugin
pnpm run test:unit
pnpm run test:scorecard
pnpm run test:integrity
pnpm run smoke:scroll
pnpm run smoke:scroll:stress
pnpm run security:audit
```

Then run the relevant WDIO specs, followed by full `pnpm run test:e2e` if the environment is healthy. Record exact command, exit code, test count and timestamp. A previously green result is not fresh evidence.

If `security:audit` reports the repository's documented dev-only frozen advisories, compare against `package.json` policy and report them; do not silently waive a new production advisory.

## Task 23 — Upgrade and clean-install matrix

Use two isolated vault profiles:

- **Upgrade:** install beta.6 settings/layouts/icon overrides/filter state, then install the candidate.
- **Clean:** no Vaultman data, install candidate directly.

Verify:

- saved context-menu aliases normalize without duplicate ChangeIcon/Snippet Reveal;
- old visible-cell arrays do not force `format` on;
- overflow strategy retains Condensed/Scroll/Wrap values;
- toolbar/Navbar visibility and commands retain user choice;
- no stale self-protection translation/UI remains;
- filters, queue templates and saved layouts load without schema loss;
- disabling Vaultman is recoverable by re-enabling from Obsidian settings.

## Task 24 — HITL release-acceptance matrix

The dev must inspect at least:

| Surface | Required variants |
|---|---|
| Navbar | 7 providers × 3 overflow modes × min/wide × label on/off |
| ChangeIcon | 6 target kinds × integration on/off × Iconic on/off |
| Floating Index | left/right/top/bottom × plain/pill × hide/reserve matrix |
| Filters | Props key/value + Tags × Tree/Cards/Table where supported |
| Property controls | raw/formatted × checkbox/date/datetime × stage/cancel/apply |
| Rename | Content + Snippet, literal single target, rich preview, badge/apply |
| Frame top | toolbar shown/hidden/peek × Data/Statistics × desktop/mobile |

Capture concise screenshots/logs tied to issue IDs; do not mark HITL issues closed solely from source tests.

## Task 25 — Final adversarial and code review

Before any “ready for stable” statement:

- search for stale direct icon-picker calls, direct Snippet adapter rename, native Content rename prompt, duplicated Navbar mounts, Files-only overflow branches, disabled checkbox, and stale filter CSS class;
- inspect all changed Svelte with the required analyzer;
- inspect every queue change for immediate side effects before Apply;
- audit listeners/ResizeObservers/picker interception for teardown;
- audit i18n key parity and accessible labels;
- compare bundle size and scroll scorecard to baseline;
- run an independent code-review pass ordered P0–P3.

Suggested searches:

```powershell
rg -n "promptForFileRename|_RENAME_FILE|adapter\.rename|open(File|Property|Tag|Snippet|Plugin)IconPicker|import NavbarFilters|activeSectionTab === 'files'|checkbox\.disabled = true|vm-tree-row-surface" src test
rg -n "TODO|FIXME|TEMP|HACK|placeholder|not implemented" src test
```

Any match must be explained or removed; do not use a zero-match claim without showing the command result.

## Task 26 — Candidate handoff, not publication

Prepare a decision report:

- code commits and exact diff scope;
- issues completed / HITL accepted / remaining;
- fresh automated gate table;
- runtime matrix results;
- known limitations and quality lost versus beta.6, if any;
- rollback point and install artifact checksum;
- explicit statement that no push/tag/merge/version/release occurred.

Only after the dev explicitly approves publication may a separate release action perform version bump, final artifact build, commit/push/tag/release. Re-run the release gates on the exact release commit before publishing.
