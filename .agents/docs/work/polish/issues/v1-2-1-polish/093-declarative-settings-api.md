---
title: BT5-093 — Adopt the declarative settings API (getSettingDefinitions)
type: issue
status: needs-triage
lifecycle: active
priority: P2
execution: AFK
parent: "[[docs/work/polish/issues/v1-2-1-polish/index|v1.2.1 polish backlog]]"
dateCreated: 2026-07-29T18:52:04
dateUpdated: 2026-07-29T18:52:04
created_by: claude-opus-5
updated_by: claude-opus-5
tags: [agent/issue, triage/needs-triage, initiative/polish, release/1.2.1, settings, obsidian-api]
---

# BT5-093 — Adopt the declarative settings API (getSettingDefinitions)

## Symptom

Obsidian team automated scan on stable 1.2.0:

> This PluginSettingTab does not implement getSettingDefinitions(); its settings
> will not appear in Obsidian's settings search for users on 1.13.0 or later.
> Consider adopting the declarative settings API.

Cited at `src/VaultmanSettings.ts:53` on the stable tree.

**User-visible consequence:** on Obsidian 1.13.0+, none of Vaultman's settings are findable through the settings search box. Given the size of the settings surface (root, toolbar, floating-toc, files-hover, explorer, … pages), this is the difference between discoverable and effectively hidden configuration.

## Verified state

- Stable (`main`, manifest `1.2.0`): `VaultmanSettingsTab extends PluginSettingTab` at `src/VaultmanSettings.ts`, no `getSettingDefinitions` anywhere in `src/`.
- Sandbox: same gap, the class moved to `src/settingsVM.ts:6`. **Fixing this on the patch branch alone will not carry to sandbox** — the file was renamed, so the change has to be applied on both lines or ported deliberately.
- **Typings need a bump on the patch line.** Stable pins `obsidian@1.12.3`, which predates the API — there is nothing to type `getSettingDefinitions()` against there. Sandbox already carries `obsidian@1.13.1`. So this issue implies raising stable's `obsidian` devDep to ≥1.13.x, which also means re-checking stable's `minAppVersion: 1.12.0` against whatever the new typings assume.

## Plan

- [ ] Confirm the `getSettingDefinitions()` contract against the 1.13 typings (return shape, id/name/description fields, how nested pages map onto a flat searchable list).
- [ ] Implement it for the settings tab, deriving definitions from the existing page model rather than hand-duplicating every `Setting` — a second hardcoded list would drift out of sync on the next settings change.
- [ ] Decide the page-to-definition mapping for the multi-page tab: a search hit must be able to open the right page, not just the tab root.
- [ ] Apply on both the patch line and sandbox (`src/settingsVM.ts`).

## Acceptance criteria

- [ ] Settings appear in Obsidian's settings search on 1.13.0+.
- [ ] Selecting a search hit lands on the page that owns that setting.
- [ ] Definitions are derived from one source of truth, so adding a setting does not require editing two lists.
- [ ] The Obsidian scan no longer emits this warning.

## Notes

The local lint harness has no rule for this — see [[095-lint-and-guard-harness-red|BT5-095]]. Bumping `eslint-plugin-obsidianmd` to 0.4.1 does **not** add one either (0.4.0 was a maintainer handoff with no substantive rule additions), so this class of warning is only caught by the Obsidian-side scan today.
