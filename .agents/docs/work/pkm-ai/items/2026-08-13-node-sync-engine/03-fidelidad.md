---
title: Fidelity — metadata preservation and repair
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
  - obsidian/metadata
dateCreated: 2026-08-13T18:00:00
dateUpdated: 2026-08-13 18:00:00
---
# Fidelity

## The problem, stated precisely

A note created last year and synced today shows a creation date of today in the vault.
The dev's daily notes are the clearest case: the filename says `2025-11-04` and the
vault's creation date says 2026. The dev has been patching this by hand with
`dateCreated` / `dateModified` frontmatter properties across most of the vault.

The requirement is stronger than preservation: the engine must also **repair origins
that were already wrong**, because many notes arrived with bad metadata long before
this design existed.

## What the hardware actually allows

Measured on the live devices (F8/F9), not assumed:

| Mechanism | `/sdcard` (vault) | Termux home (ext4) | pc (NTFS) |
| --- | --- | --- | --- |
| `mtime` | settable | settable | settable |
| user xattrs | **unsupported** | supported | supported (ADS) |
| creation date | **not stored** | stored, writable only via `debugfs` on the raw device as root | stored and writable |
| `ctime` | = sync time | = sync time | n/a |

Two conclusions follow directly.

First, a terminology trap that was the source of a real disagreement during design:
POSIX `ctime` is **inode change time**, not creation time. It is a kernel audit field,
bumped by any inode change including the sync itself, and no tool — root included —
can set it backwards, because no syscall exists to do so. The field that Obsidian
reads as a creation date is *birthtime* / `crtime`. On `/sdcard` that field is not
stored at all, so on the two nodes where the vault actually lives, there is nothing to
preserve.

Second, therefore: **the filesystem cannot be the source of truth for creation date**,
and any design that propagates it through the transport fails on two of three nodes.
The dev's manual frontmatter patch was not a workaround — it was the correct
architecture, arrived at empirically.

## The inversion

Rather than preserving filesystem metadata through the transport, the engine
**reconstructs it from content-level truth on each node after each sync**. The
filesystem becomes a derived artifact.

Two carriers, in priority order:

1. **Note frontmatter** (`dateCreated`, `dateModified`) — the universal carrier. It
   travels inside the content, works on every filesystem, and is the only one Obsidian
   reads. The existing property names are reused; the engine does not invent new ones.
2. **A sidecar manifest** emitted alongside the content — the dev's proposal, adopted.
   It carries metadata for files that have no frontmatter (binaries, attachments,
   canvases) and works precisely where xattrs do not, which is `/sdcard`, which is
   where the vault lives.

xattrs are used only as an optimisation on nodes that support them (Termux home, NTFS)
and never as the sole carrier.

## Derivation cascade

Applied per note when `dateCreated` is missing. The order is the design — it is what
repairs wrong origins:

1. **Existing frontmatter** — if present, respected and never touched again.
2. **Date embedded in the filename** — `2025-11-04.md`. This is what fixes the daily
   notes: the filename tells the truth and the filesystem lies, so the filename wins.
   Scope of this rule is **Q1**, still open: whole vault, or only folders declared as
   dated notes.
3. **First commit that introduced the file** —
   `git log --diff-filter=A -1 --format=%aI -- <path>`. Both repos are git, so for
   anything that has passed through git there is a real, auditable creation date that
   is identical on all three nodes. This is the strongest oracle available and it costs
   nothing to consult.
4. **Oldest plausible timestamp observed across nodes** — last resort, resolved by the
   rules below rather than by naive minimum, and recorded as low-confidence in the
   manifest.

## Cross-node resolution rules

These decide, when the same file exists on several nodes with disagreeing timestamps,
which value is real. Both are **pure functions of the manifest** — which carries a
`(content-hash, mtime, ctime)` tuple per node — so any node computing them reaches the
same answer without observing the others directly. That is what makes the cascade
node-deterministic and closes the defect recorded as A3.

**Creation date — oldest wins, unless absurd.** The oldest candidate across all sources
is taken as the real creation date. A candidate is rejected as corrupt when it diverges
implausibly from the other sources: a 1962 timestamp against a git first-commit date of
2025 is filesystem corruption, not history. Rejection requires disagreement with **both**
of the remaining sources, so a single bad clock cannot veto a good date, and the
rejected value is recorded in the manifest rather than discarded silently.

**Modification date — newest wins, but only if the change is real.** A newer mtime is
accepted only when the content actually differs. When two nodes hold **byte-identical
content** with different mtimes, no edit occurred: the difference is a sync artifact,
and the **oldest** mtime is taken.

The second rule is not hypothetical — it is exactly the `session-log.md` case in F5:
415,369 bytes on both `pc` and `m2`, mtimes a week apart, zero content difference. Under
a naive newest-wins rule the file would be permanently marked as modified on every sync,
which is how the current drift became invisible.

`dateModified` is written from the resolved mtime. The engine then sets the file's `mtime`
from the resolved dates so that listings agree across nodes, and sets NTFS
`CreationTime` on `pc` where the filesystem can hold it.

**Nothing in the system depends on `ctime`.**

## Immutability

The cascade runs **once per note**. Once `dateCreated` is written it is immutable: if a
derived date turns out to be wrong, the dev corrects the frontmatter by hand and the
engine respects it forever after.

The rejected alternative — recompute on every run — would make a renamed note silently
change its creation date, which is worse than the bug being fixed.

## Dependency outside the engine

Obsidian must be configured to display `dateCreated` instead of the filesystem
creation date. Without that, the vault keeps showing the sync date even when the
frontmatter is perfect. This is vault configuration, not engine work, and it is a
prerequisite for the dev to observe any benefit.
