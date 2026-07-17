---
title: R-OBSIDIAN-GIT — obsidian-git features + architecture
type: research-record
status: active
parent: "[[docs/work/draft/2026-06-03-onenote-companion-architecture-megadump/research/index|megadump research]]"
created: 2026-06-03T10:33:47
updated: 2026-06-03T10:33:47
created_by: claude-opus-4-8
updated_by: claude-opus-4-8
tags:
  - agent/work
  - agent/research
  - initiative/draft
---

# R-OBSIDIAN-GIT — Git plugin (Vinzent03)

Repo `Vinzent03/obsidian-git`, docs `publish.obsidian.md/git-doc`. Feeds MD-O1 (VM git add-on).

## User-facing features

- **Commit-and-sync**: interval auto-commit/pull/push; on-edit-stop trigger; push-only / pull-only modes;
  submodule update (v1.10+). Per-file staging (not vault-wide by default).
- **Source Control view**: stage/unstage/discard per file; commit; push/pull/sync; **stage/reset individual
  hunks**.
- **History view**: commit log (msg, optional author/date, expandable changed-files).
- **Diff view**: side-by-side / unified; open from SCM or command.
- **Line Authoring (git blame)**: per-line author + date + optional hash; gutter age color-coding;
  copy-paste tracking; multi-line→newest commit; ignore-whitespace; submodule-aware; async. Desktop only,
  Live-Preview + Source modes (feature by GollyTicker).
- **Editor indicators**: added/modified/deleted signs; navigate/stage/reset hunk under cursor (desktop only).
- **GitHub links**; commit-message templating (`{{hostname}}`); merge strategies (ours / theirs / reset /
  "other sync service" = move HEAD w/o changing files, for Obsidian Sync coexistence).

## Architecture

- **Desktop**: `simple-git` wrapping the **system git binary** → full SSH, GPG, submodules, fast.
- **Mobile**: **isomorphic-git** (JS reimpl) via custom FS adapter → HTTPS-token only, no SSH, no
  submodules, memory-bound, "very unstable" per docs. Provider pattern swaps `SimpleGit` ↔ `IsomorphicGit`.
- Notes: Snap Linux unsupported (sandbox); iCloud syncs whole `.git` (slow startup) — workaround place
  repo above vault.

## API for other plugins

No dedicated exported API. Other plugins invoke via Obsidian command registry
(`app.commands.executeCommand('obsidian-git:<cmd>')`) or `obsidian://command/...`. Line-authoring + diff
data are computed for UI, not exposed as structured data.

## Maps to VM git add-on (MD-O1)

Already exists: line blame, diff view, commit history, inline indicators, hunk stage/reset, multi-device.
**VM differentiation** (what to actually build): interactive **line-evolution timeline** (birth→edit→
delete→rebirth across commits); **temporal "file-as-of-commit X"** viewer; **blame-range queries**
("who changed lines 5-20 between A..B"); **structured line-history API** (JSON) for other plugins/scenes;
**conflict-aware per-line blame**; mobile line-history via cached isomorphic-git. Foundation = reuse the
`.git` object model; complement (not replace) obsidian-git; optionally bridge its settings (author, templates).
Related: `kometenstaub/obsidian-version-history-diff` (diff across Sync/File-Recovery/Git).

## Sources

- https://github.com/Vinzent03/obsidian-git · https://publish.obsidian.md/git-doc (Features, Line+Authoring, Authentication)
- https://community.obsidian.md/plugins/obsidian-git
