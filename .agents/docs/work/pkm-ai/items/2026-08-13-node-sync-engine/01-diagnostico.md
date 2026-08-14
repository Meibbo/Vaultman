---
title: Diagnosis — verified findings F1–F10
type: spec-shard
status: active
lifecycle: active
parent: "[[docs/work/pkm-ai/items/2026-08-13-node-sync-engine/index|node-sync-engine]]"
created_by: claude-opus-5
updated_by: claude-opus-5
tags:
  - agent/work
  - initiative/pkm-ai
  - tooling/sync
dateCreated: 2026-08-13T18:00:00
dateUpdated: 2026-08-13 18:00:00
---
# Diagnosis

All evidence gathered live on 2026-08-13 against `pc` (meibbopc), `m1`
(poco-x6-pro-5g) and `m2` (poco-f4-gt, local node).

## F1 — The phone repos are rclone copies, not clones

`git worktree list` on m2 returns 30 entries whose paths are Windows paths:

```
/data/.../home/vaultman/.git/worktrees/u121-029-union/C:/Users/vic_A/Desktop/vaultman/.claude/worktrees/u121-029-union   58d8fcf4 [claude/u121-030] prunable
```

Every non-primary entry is marked `prunable`. The phones inherited the PC's worktree
registry verbatim. `~/vaultman/.worktrees/` does not exist on m2, so there is no
worktree infrastructure on the phones at all — only the registry describing the PC's.

**Consequence.** The dev's stated goal of working worktree 029 on m2 and merging to
`origin/dev` cannot be executed against this tree.

## F2 — Line endings make `git status` unusable on the phones

```
pc:  git config core.autocrlf → true
m2:  git config core.autocrlf → (unset)
m2:  git status --porcelain | wc -l → 1854      (1477 modified, 377 deleted)
m2:  git diff --stat            → 1836 files, 222,578 insertions, 271,688 deletions
pc:  git status --porcelain     → 1098
```

`git diff -- vite.config.ts | cat -A` shows `^M$` on the `+` (worktree) side and `$`
on the `-` (index) side: the working tree carries CRLF, the objects carry LF. The repo
has no `.gitattributes`.

**Consequence.** No agent can reason about repository state on a phone. Any
`git status`-driven workflow — including every skill that checks for a clean tree —
reports a catastrophic false positive.

## F3 — Root cause

`~/bin/str-rclone` defines project `vault`:

```
vault)
  P[m1]="$TH/vaultman"
  P[m2]="$TH/vaultman"
  P[pc]="C:/Users/vic_A/Desktop/vaultman" ;;
```

It rclone-syncs the whole directory, `.git` included, between Windows and Android.
F1 and F2 are both direct consequences. The same antipattern is applied a second time
to the Obsidian vault (see F6).

## F4 — Correction: the junction points the other way

Two probes were run in the wrong direction before the dev supplied decisive evidence
(deleting two files from the Obsidian vault also deleted them in `vaultman`). Recorded
because the reasoning matters:

- `dir /al` on the vault root and on `x` → `File Not Found`
- `fsutil reparsepoint query` on `x\Agent Docs` → `Error 4390: not a reparse point`

Both are true and both are irrelevant, because the link is on the **repo** side:

```
fsutil reparsepoint query "C:\Users\vic_A\Desktop\vaultman\.agents\docs"
  Reparse Tag Value : 0xa0000003   (Mount Point)
  Substitute Name   : \??\C:\Users\vic_A\My Drive\Start of The Road\x\Agent Docs
```

**The Obsidian vault physically owns the PKM-AI docs. The repo links into it.**

This inverts the assumed architecture. It also explains why the docs are visible in
the vault the instant they are written by an agent working in the repo: there is only
one copy on `pc`.

A second correction from the same session: an earlier claim that `Agent Docs` was
absent from m2 came from `find` over `/sdcard` returning empty even for directories
that exist — the FUSE layer does not support the traversal. `ls` is authoritative
there; `find` is not.

## F5 — The phones hold a diverging duplicate

Because rclone copies *through* the junction, `~/vaultman/.agents/docs` exists on the
phones as real files. The phones therefore hold two copies of the docs: one in the
repo path, one in the vault path. They diverge:

| | pc | m2 (vault copy) |
| --- | --- | --- |
| `x/Agent Docs/sessions/session-log.md` size | 415,369 B | 415,369 B |
| same file, mtime | 2026-08-11 01:58 | 2026-08-04 06:17 |
| `work/pkm-ai/items/2026-08-13-*` | present | absent |

Identical bytes, mtime a week apart. The content channel works; the fidelity channel
does not. This is the concrete instance of the metadata problem the dev described
independently (see shard 03).

## F6 — The vault repo is broken on the phones, the same way

```
$SOTR/.git  →  ASCII text, with CRLF line terminators
              gitdir: C:/Users/vic_A/Desktop/Start of The Road/.git
```

The vault is a Windows worktree whose gitfile was replicated to Android. Git is
inoperative for the vault on `m1` and `m2`. The dev's requirement to commit the vault
independently from any device is currently unsatisfiable.

Note that the split itself is sound design on `pc`: keeping `.git` on `Desktop` while
the working tree lives in `My Drive` keeps the repository out of Google Drive's sync.
Only its replication to other platforms is wrong.

## F7 — Symlink direction on Android

```
ln -s <target> "$SOTR/__test"                → Permission denied
ln -s "$SOTR/x/Agent Docs" ~/.__linktest     → OK
  read  through the link                     → OK
  write through the link                     → OK (lands on /sdcard as media_rw)
```

Links cannot be created **inside** `/sdcard`, but a link in Termux home **pointing
into** `/sdcard` is fully functional. This is the enabler that lets the phones
reproduce the PC topology exactly, rather than falling back to a mirror.

## F8 / F9 — Metadata capability matrix

| Mechanism | `/sdcard` (vault) | Termux home (ext4) | pc (NTFS) |
| --- | --- | --- | --- |
| `mtime` via `touch -d` | yes | yes | yes |
| user xattrs (`setfattr user.*`) | **no** — `Operation not supported on transport endpoint` | yes | yes (ADS) |
| real creation date | **absent** — `stat -c %w` → `-` | present, writable only via `debugfs` on the raw device as root | yes, writable |
| `ctime` | equals sync time; not settable by any tool | same | n/a |

`ctime` is POSIX *inode change time*, not creation time. No syscall sets it backwards;
it is a kernel audit field. The field that Obsidian reads as a creation date is
*birthtime* / `crtime`, which `/sdcard` does not store at all.

## F10 — The two exclusion sets disagree

`exclude.txt` contains `**/Agent Docs/**`; `exclude_mobile.txt` does not. Both live at
the vault root and both are consumed by rclone paths. Whichever is in force decides
whether the docs reach a phone, and nothing declares which applies where.
