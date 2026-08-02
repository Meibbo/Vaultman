---
title: U121-003 shard 06 execution record - gates and exact build
type: implementation-record
status: in-progress
parent: "[[index|U121-003 corrective implementation plan]]"
created_by: claude-opus-5
updated_by: claude-opus-5
dateCreated: 2026-08-02
updated: 2026-08-02
---

# 06 — Gate and exact-build evidence, 2026-08-02 evening

Recorded by `claude-opus-5` on `claude/u121-030-033-maintenance`.

## Task 6.2 — repository gates

`pnpm run verify` **exit 0** at `6da42823`. That is the first time the aggregate
gate has passed on this branch. Constituents, each also run on its own:

| Gate | Result |
| --- | --- |
| `pnpm run lint` | 0 errors, 12 warnings |
| `pnpm run check` | tsc + svelte-check, 0 errors / 0 warnings over 1256 files |
| `pnpm run format:check` | clean |
| `pnpm run stylelint` | clean |
| `pnpm run build:plugin` | exit 0 |
| `pnpm run test:unit` | 1533/1533 in 204 files at `298b9d9c` |
| `pnpm run test:scorecard` | 18 checks passed |
| `git diff --check` | clean |

**Two of these were already failing before this session's work**, and were
repaired in `d45e71a2` without weakening a rule. Detail in the shard 08 part 2
execution record. Summary: `lint` exited 1 with 34 errors at `27ee0170`, and
`format:check` failed on `VaultmanFrame.svelte`.

## Task 6.3 — the exact build

The developer's evening prompt names `plugin-dev` as the smoke vault, superseding
this plan's `Start of The Road`, which was deliberately left holding the older
`cac504a9` build.

- Source commit: `298b9d9cff156a0155d7d5c3a0e05f8de93143e7`
- Worktree clean at build time: yes
- `pnpm run build:plugin` run immediately before copying: yes
- Target: `C:\Users\vic_A\Desktop\plugin-dev\.obsidian\plugins\vaultman`

SHA-256, source and installed target compared — all three match:

```text
main.js        C307F987AB7BEA520DA6EBB71440740423EDCBDFDC7F992941ED1114C4575C46
styles.css     A8F851C687E60AC2FFFC2ADB2930D443B28335ED4AD6A9F3422B4E9B1C51B9CC
manifest.json  AE221D676BB492425E1480590F3514007193803DABC96EE44C63EC5ED669A996
```

## Task 6.4 — the live acceptance matrix

**Not executed.** It needs the developer in a live Obsidian, and the build above
is the exact one to run it against. Reload Vaultman in `plugin-dev` before
starting; the plugin directory now holds `298b9d9c`.

What this build newly makes smokeable, beyond the shard 06 matrix as written:

| Scenario | What to look for |
| --- | --- |
| `Move to prop...` | invoke from a value node's context menu; the explorer switches to select, two switches appear inside the searchbox, `Proceed with selected` and `Cancel` appear in the toolbar |
| Destination picking | selecting a property registers it; selecting the value's own property is refused with a stated reason; selecting the same property twice deselects it |
| Exit paths | `Cancel`, re-invoking `Move to prop...`, and changing provider all leave cleanly and restore the previous interaction mode |
| Stage vs bypass | with staging, `Proceed` queues and opens nothing; with bypass, the summary modal is required and queues nothing unless confirmed |
| Coercion | moving into a property of an incompatible type states `name: from -> to` in the summary and queues a type change beside the values |
| Queue details | the bypass toggle is reachable from the queue details modal |
| `reveal this file` | the toggle sits between search and collapse in Props; it narrows to the active file's properties, follows note switches with no user action, and returns the previous projection when switched off |
| Reveal + move | entering the move mode replaces the reveal toggle; exiting restores it |

## Task 6.5 — not started

No code review pass, no developer acceptance. **U121-003 does not close until the
developer accepts a live smoke of the build hashed above.**

## What is still unimplemented in this build

- Plan shard 09 tasks **9.3** (Tree's Core file-properties anatomy; Table and
  Cards keeping their own Cells) and **9.4** (the mutation policy and the
  value-entry input). Reveal currently projects the active file's properties
  through the existing Tree/Table/Cards rendering, not through Core's
  `metadata-property` anatomy.
- Cancelling a coercing move's queue entry does not revert the destination type;
  it is a second queue entry. See the shard 08 part 2 record.
- `resolveCellCapabilities` still has no caller, so reveal narrows the projection
  but not a live Cell list.
- `PropertyValueInteractionPort` still has no caller — task 5.2 of shard 05.
