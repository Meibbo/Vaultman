---
title: BT5 final stable audit — corrective slices for v1.2.0
type: issue-index
status: active
lifecycle: active
parent: "[[docs/work/polish/issues/bt5-next-release/index|BT5]]"
created: 2026-07-22T13:05:00
updated: 2026-07-22T13:05:00
created_by: codex-gpt5-root
updated_by: codex-gpt5-root
tags: [agent/issues, triage/needs-triage, initiative/polish, release/1.2.0, release/stable]
---

# BT5 final stable audit — corrective slices for v1.2.0

Corrective issue-set approved by the dev on 2026-07-22 after auditing the three
original pre-release prompts against `codex/bt5-next-10` at `b56b9a78`. These
issues do not rewrite the history of BT5-019/021/025/036/037/038/039: they link
and correct the incomplete or misleading outcomes.

Full source, literal prompts, source evidence, Git forensics and adversarial pass:
[[docs/sessions/2026-07-22-codex-gpt5-root|2026-07-22 audit shard]].

## Approved order

| Issue                                       | Title     | Type                                            | Blocked by |          |
| ------------------------------------------- | --------- | ----------------------------------------------- | ---------- | -------- |
| [[043-universal-navbar-panel-widget]]       | BT5-043]] | Universal Navbar `panelWidget` host             | AFK        | —        |
| [[044-text-exclusion-navbar-action]]        | BT5-044]] | Move Has/Hasn't text into Text Navbar           | AFK        | 043      |
| [[045-navbar-overflow-measured-strategies]] | BT5-045]] | Measured Condensed/Scroll/Wrap overflow         | AFK        | 043      |
| [[046-provider-navbar-migration]]           | BT5-046]] | Migrate Statistics and providers to one Navbar  | AFK        | 043, 045 |
| [[047-change-icon-capability-router]]       | BT5-047]] | Canonical ChangeIcon capability router          | AFK        | —        |
| [[048-change-icon-adapters-and-fallback]]   | BT5-048]] | Picker adapters, fallback, intercept and dedupe | HITL       | 047      |
| [[049-vaultman-self-disable-toggle]]        | BT5-049]] | Vaultman self-disable from Plugins cell/action  | HITL       | —        |
| [[050-snippet-reveal-canonical-action]]     | BT5-050]] | Canonical Snippet Reveal action                 | AFK        | —        |
| [[051-hide-scrollbar-single-footprint]]     | BT5-051]] | Hide scrollbar with one index footprint         | HITL       | —        |
| [[052-filter-i18n-copy-restore]]            | BT5-052]] | Restore short filter i18n copy                  | AFK        | —        |
| [[053-filter-polarity-interaction]]         | BT5-053]] | Inclusive/exclusive/remove filter polarity      | HITL       | —        |
| [[054-property-menu-types-and-conversions]] | BT5-054]] | Property types and value conversions            | AFK        | —        |
| [[055-property-format-cell]]                | BT5-055]] | Configurable Property value `format` cell       | AFK        | —        |
| [[056-checkbox-action-cell-queue]]          | BT5-056]] | Checkbox action_cell through operation queue    | HITL       | 055      |
| [[057-date-datetime-action-cell-queue]]     | BT5-057]] | Date/datetime picker action_cell through queue  | HITL       | 055      |
| [[058-glyph-color-projection-gaps]]         | BT5-058]] | Glyph color on rail actions and Files labels    | HITL       | —        |
| [[059-frame-top-edge-geometry]]             | BT5-059]] | Restore frame top-edge clipping geometry        | HITL       | —        |
| [[060-rich-rename-modal-regression]]        | BT5-060]] | Restore rich queued rename for individual nodes | AFK        | —        |

## Shipped in the v1.2.0 close (2026-07-23, claude-opus-4-8-audit)

Bugs and regressions the dev reported while smoke-testing the beta, landed as
the final v1.2.0 slices. `060` also completed after the takeover.

| Issue                                          | Title                                          | Status      | Commit               |
| ---------------------------------------------- | ---------------------------------------------- | ----------- | -------------------- |
| [[065-settings-layout-and-new-user-defaults]]  | Layout Configuration first + softer defaults   | completed   | cf9ba359             |
| [[067-focus-commands-stop-closing-frame]]      | Focus commands stop closing Vaultman           | completed   | 7ef2e69d             |
| [[077-tag-name-validation]]                    | Reject invalid tag names, repair soft-lock     | completed   | d4cf0d0f             |
| [[085-queue-replace-label]]                    | Name the Replace operation in the queue        | completed   | d4cf0d0f             |
| [[086-text-excluded-count-heading]]            | "with N excluded" in primary text              | completed   | d4cf0d0f             |
| [[089-single-node-tree-move]]                  | Single-node tree move for Last opened          | completed   | d8367255, ced1c078   |
| [[090-folder-recency-and-mtime-tiebreak]]      | Folder recency + mtime tie-break               | completed   | 404c33b4             |
| [[091-inline-rename-editor-height]]            | Inline rename editor takes the row height      | completed   | aeb1df1d             |
| [[088-filter-apply-performance]]               | Filter apply performance (P2 done; P3 → 1.2.1) | in-progress | e1097b66             |

Deferred out of v1.2.0: [[051-hide-scrollbar-single-footprint|051]] (Top/Bottom
positions withheld), and the whole [[../v1-2-1-polish/index|v1.2.1 polish backlog]]
(Navbar 043–048, decoration contract, Text explorer, tags inline/frontmatter,
differential render, and the rest).

## Release-quality contract

- Every behavior change follows red/green/refactor and keeps a reproducible
  regression test.
- Each slice is independently reviewable and has a focused gate before the next
  slice begins.
- Cross-cutting UI slices include `plugin-dev` runtime evidence; HITL remains open
  until the dev accepts the visible result.
- No push, tag, merge or public release occurs without an explicit final order.
- Final stable preflight includes upgrade, clean-install and mobile/desktop gates
  applicable to the changed surfaces.
