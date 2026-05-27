---
title: Release 1.0.1 Plan - Version Metadata
type: implementation-plan-shard
status: active
parent: "[[docs/work/publish/plans/2026-05-26-release-1-0-1-from-1-0-0/index|Release 1.0.1 From 1.0.0 Implementation Plan]]"
created: 2026-05-26T22:07:55
updated: 2026-05-26T22:07:55
tags:
  - agent/plan
  - initiative/publish
created_by: codex-gpt-5
updated_by: codex-gpt-5
---

# Version Metadata

## Task 8: Set 1.0.1 Release Metadata

**Files:** `package.json`, `manifest.json`, `versions.json`, `.release-please-manifest.json`, `CHANGELOG.md`

- [ ] **Step 1: Set package and manifest versions**

Set both `package.json.version` and `manifest.json.version` to:

```json
"1.0.1"
```

- [ ] **Step 2: Add versions entry**

In `versions.json`, keep the existing `1.0.0` entry and add:

```json
"1.0.1": "1.12.0"
```

- [ ] **Step 3: Confirm release-please manifest**

Ensure `.release-please-manifest.json` is:

```json
{
  ".": "1.0.1"
}
```

- [ ] **Step 4: Add changelog entry**

At the top of `CHANGELOG.md`, above `1.0.0`, add:

```markdown
## [1.0.1](https://github.com/Meibbo/Vaultman/compare/1.0.0...1.0.1) (2026-05-26)

### Bug Fixes

* publish a stable 1.0.x patch from the 1.0.0 product line
* add GitHub release attestations for plugin assets
* resolve Obsidian Scorecard manifest, source, and popout-compatibility findings
```

- [ ] **Step 5: Verify JSON metadata**

Run:

```powershell
node -e "const fs=require('fs'); for (const f of ['package.json','manifest.json','versions.json','.release-please-manifest.json']) JSON.parse(fs.readFileSync(f,'utf8')); console.log('json ok')"
```

Expected:

```text
json ok
```

- [ ] **Step 6: Commit version metadata**

Run:

```powershell
git add package.json manifest.json versions.json .release-please-manifest.json CHANGELOG.md
git commit -m "chore(release): set stable version 1.0.1"
```
