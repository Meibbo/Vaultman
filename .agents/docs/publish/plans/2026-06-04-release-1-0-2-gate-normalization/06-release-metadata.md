---
title: Release 1.0.2 Plan - release metadata
type: plan-step
status: pending
parent: "[[docs/work/publish/plans/2026-06-04-release-1-0-2-gate-normalization/index|Release 1.0.2 gate normalization implementation plan]]"
created: 2026-06-04T05:11:57
updated: 2026-06-04T05:11:57
tags:
  - agent/plan
  - release/1-0-2
created_by: codex-gpt-5
updated_by: codex-gpt-5
---

# Task 06: Release Metadata

**Files:**
- Modify: `CHANGELOG.md`
- Read/verify: `manifest.json`
- Read/verify: `versions.json`

- [ ] **Step 1: Add `1.0.2` changelog entry**

Insert below `## [Unreleased]`:

```markdown
---

## [1.0.2] — 2026-06-04

### Fixed

- Removed the redundant queue-details value guard reported by CodeQL.
- Kept stable CSS compatible with Obsidian Scorecard expectations by blocking
  `!important` and `display: contents` release regressions.

### Changed

- Normalized the stable release gate on pnpm and Node 24 while keeping the
  esbuild production build.
- Added release-blocking `svelte-check`, format, stylelint, Scorecard, and
  security audit gates.
- Added a public security reporting policy.
```

- [ ] **Step 2: Verify manifest version and compatibility floor**

Run:

```powershell
Get-Content manifest.json
```

Expected:

```json
{
	"id": "vaultman",
	"name": "Vaultman",
	"version": "1.0.2",
	"minAppVersion": "1.12.0",
	"description": "Files, content and frontmatter explorer like Bases with scoped queued changes list.",
	"author": "Meibbo",
	"authorUrl": "https://github.com/Meibbo",
	"isDesktopOnly": false
}
```

Do not change `minAppVersion` in this plan.

- [ ] **Step 3: Verify `versions.json`**

Run:

```powershell
Select-String -Path versions.json -Pattern '"1.0.2"'
```

Expected:

```text
"1.0.2": "1.12.0"
```

Do not rewrite old historical entries.

- [ ] **Step 4: Commit**

Run:

```powershell
git add CHANGELOG.md manifest.json versions.json
git commit -m "docs(release): prepare 1.0.2 metadata"
```
