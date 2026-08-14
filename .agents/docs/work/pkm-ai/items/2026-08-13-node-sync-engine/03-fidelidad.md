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

## Collect, validate, rank

An earlier draft short-circuited on the first available source. The dev rejected that
on 2026-08-13: a frontmatter date is not automatically trustworthy — a future date or a
corrupt one would be believed blindly. Resolution therefore proceeds in three phases,
and **no source is consulted for a verdict until every source has been collected**.

### Phase 1 — Collect

Every candidate is gathered with its source, its precision and its confidence. None is
discarded yet.

| Source | Extraction | Precision |
| --- | --- | --- |
| Frontmatter | `dateCreated`, then `date` — the vault's daily notes use `date`, not `dateCreated` (verified on `+/2024-11-16.md`) | as written |
| Filename | see the accepted patterns below | day, or minute for Zettelkasten IDs |
| Git | `git log --diff-filter=A -1 --format=%aI -- <path>` | second |
| Filesystem | per-node `mtime` from the manifest | second |

**Accepted filename patterns**, derived from the live vault rather than invented:

| Pattern | Example | Verdict |
| --- | --- | --- |
| `YYYY-MM-DD` prefix, alone or followed by text | `2024-11-16.md`, `2025-08-14 Finneas - Lost my mind.md` | accept |
| `YYYYMMDDHHMM` Zettelkasten ID prefix | `202507150801 Ideas para controlar el teclado.md` | accept — highest precision available from a name |
| Bare year, or year followed by non-date text | `2024.md`, `2025.md`, `2000 20's.md` | **reject** — a year is not a creation date |
| Date not at the start of the name | `notas sobre 2025-01-01.md` | **reject** — the note is *about* the date, not created on it |
| Ambiguous day/month order | `13-08-2026`, `08-13-2026` | **reject** — unresolvable without a locale assumption |

The rule applies to the **whole vault**, per the dev's decision, because the rejection
rules above carry the safety rather than a folder allowlist. `2000 20's.md` is the
reason the allowlist is not needed: it is caught by the pattern rules, not by its
location.

### Phase 2 — Validate

Each candidate is checked independently, and failures are recorded in the manifest
rather than dropped silently:

- **Future dates are rejected**, from any source including frontmatter. A creation date
  later than now is impossible. Note that a *filename* may legitimately carry a future
  date — a daily note written ahead of time — so the rejection applies to that
  candidate's use as a creation date, not to the file.
- **Absurd outliers are rejected**: a candidate is discarded when it disagrees with
  **both** remaining sources by an implausible margin — a 1962 timestamp against a git
  first-commit of 2025. Requiring disagreement with both means a single bad clock
  cannot veto a good date.
- **Malformed values are rejected** — unparseable frontmatter, ambiguous filename
  patterns.

### Phase 3 — Rank

Among the survivors, source authority decides:

**frontmatter → filename → git → filesystem**

Frontmatter still wins when present, but now only when it has survived validation,
which is the whole point of the restructure. When two sources agree — as they do on a
daily note whose `date` matches its filename — the result is recorded as
high-confidence in the manifest.

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
