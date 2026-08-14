---
title: Node sync and link engine — cross-device topology
type: spec
status: needs-triage
lifecycle: active
parent: "[[docs/work/pkm-ai/index|pkm-ai]]"
created_by: claude-opus-5
updated_by: claude-opus-5
tags:
  - agent/work
  - initiative/pkm-ai
  - tooling/sync
  - topology/multi-device
  - triage/needs-triage
dateCreated: 2026-08-13T18:00:00
dateUpdated: 2026-08-13 18:00:00
---
# Node Sync And Link Engine

Design for a single engine that governs how content moves between the three nodes
(`pc`, `m1`, `m2`), how it is exposed inside each node, and what metadata survives
the journey. It replaces the current ad-hoc combination of `str` (rclone),
`devicesync` (ssh+tar) and hand-made copies with one declarative policy.

Brainstormed with the dev on 2026-08-13. Every finding below is backed by a command
run against the live devices during that session. No inferred behavior — where a
first probe was wrong, the correction and the reason are recorded in shard 01.

**Scope.** This spec covers subsystems **B** (git topology) and **C** (sync policy),
which the dev merged into one during the session because the engine cannot be
designed for one without the other. Subsystem **A** (single agent harness / `AGENTS.md`
routing) and subsystem **D** (build → Obsidian vault test pipeline on m1) are
explicitly out of scope and get their own specs.

## Shards

- [01-diagnostico.md](01-diagnostico.md) — verified findings F1–F10, with the exact
  commands and outputs, including two corrected mis-diagnoses.
- [02-modelo-y-topologia.md](02-modelo-y-topologia.md) — the three orthogonal layers
  (propagation / exposure / fidelity), the unit declaration format, and the physical
  topology per repo and per node.
- [03-fidelidad.md](03-fidelidad.md) — metadata design: what each filesystem can and
  cannot store, the sidecar manifest, and the derivation cascade that repairs wrong
  origins.
- [04-motor.md](04-motor.md) — the engine: commands, enforced invariants, where it
  lives and why it cannot live inside what it synchronizes.
- [05-saneamiento.md](05-saneamiento.md) — phase 0: the ordered remediation that
  unblocks work on the phones, with acceptance criteria.
- [06-riesgos.md](06-riesgos.md) — adversarial pass: what this design does not cover,
  what quality is lost versus the status quo, and the scenarios the dev did not raise.

## Executive Matrix — Verified Findings

| ID | Finding | Evidence | Severity |
| --- | --- | --- | --- |
| F1 | `~/vaultman` on m1/m2 is an rclone copy of the PC repo, `.git` included; the worktree registry lists 30 Windows paths, all `prunable` | `git worktree list` on m2 | critical |
| F2 | Line endings diverge: `core.autocrlf=true` on pc, unset on the phones → 1854 dirty paths on m2 (1477 modified, 377 deleted) | `git status --porcelain`, `git diff \| cat -A` shows `^M` on the worktree side only | critical |
| F3 | Root cause: `str-rclone` project `vault` maps `$HOME/vaultman` ↔ `C:/Users/vic_A/Desktop/vaultman` and syncs the whole directory including `.git` | `~/bin/str-rclone` path table | critical |
| F4 | `Desktop\vaultman\.agents\docs` is a **junction** into the Obsidian vault — the vault owns the docs, the repo links to them | `fsutil reparsepoint query` → tag `0xa0000003`, target `My Drive\Start of The Road\x\Agent Docs` | high (architecture) |
| F5 | On the phones that junction was materialized by rclone into real duplicated files, which diverge | m2 vault copy of `session-log.md`: 415,369 B @ 2026-08-04 vs pc 415,369 B @ 2026-08-11; `items/2026-08-13-*` absent on m2 | critical |
| F6 | The STR vault `.git` is a gitfile pointing at `C:/Users/vic_A/Desktop/Start of The Road/.git`, replicated with CRLF to the phones → git inoperative there | `file` + `head -c` on m2 | high |
| F7 | Symlinks cannot be created **inside** `/sdcard`, but a symlink in Termux home **pointing into** `/sdcard` works for both read and write | `ln -s` → `Permission denied`; reverse direction verified read+write | high (enabler) |
| F8 | `/sdcard` metadata: `mtime` settable, user xattrs unsupported, birthtime absent, `ctime` equals sync time | `touch -d` OK; `setfattr` → *Operation not supported on transport endpoint*; `stat -c %w` → `-` | high |
| F9 | Termux home (ext4) does support user extended attributes | `setfattr` + `getfattr` round-trip OK | medium |
| F10 | `exclude.txt` excludes `**/Agent Docs/**` from rclone; `exclude_mobile.txt` does not — the two exclusion sets disagree about the docs | both files read on m2 | medium |

## Locked Decisions

| ID | Decision |
| --- | --- |
| D1 | Three nodes: `pc` (Windows and WSL treated as one node), `m1`, `m2`. |
| D2 | Three orthogonal layers: **propagation** (between nodes), **exposure** (within a node), **fidelity** (what metadata survives). Today's tooling conflates them. |
| D3 | `vaultman`: a real independent git clone per node. `origin` = GitHub; device-to-device remotes over tailscale/LAN for on-request handoff. rclone is **forbidden** on this path. |
| D4 | `.agents/docs` is a link into the vault on all three nodes — junction on `pc` (already true), symlink from Termux home on `m1`/`m2`. The duplicate is eliminated. |
| D5 | Start of The Road: a real `.git` per node, git-direct between nodes; rclone retained only for heavy media (`media-lib/`, `_RESOURCES/`, binary attachments). |
| D6 | Publication scope is a unit property (`local` vs `github`), implemented with branch and refspec discipline — **not** with `.gitignore`. |
| D7 | Filesystem metadata is a derived artifact. Carriers are the sidecar manifest and the note frontmatter. Derivation cascade: frontmatter → filename → first git commit → oldest observed mtime. Written once, then immutable. **Step 4 of the cascade is not yet safe — see A3 in shard 06; it must be made node-deterministic before implementation.** |
| D8 | The engine lives in `~/bin`, propagated by `devicesync`. It must not live inside anything it synchronizes. |
| D9 | `vaultman` is re-cloned on `m1`/`m2` rather than repaired in place, after rescuing uncommitted work. |

## Open Questions

| ID | Question | Blocks |
| --- | --- | --- |
| Q1 | Does the filename-date rule (cascade step 2) apply to the whole vault, or only to folders declared as dated notes (journal, daily)? | shard 03 implementation |
| Q2 | Engine name and command prefix. | shard 04 |
| Q3 | Exact vault path inside the m1 proot archlinux container — not readable from outside the container during this session. | subsystem D |
| Q4 | How `.agents/docs` content currently reaches vaultman commits given it is a junction: git on Windows traverses it, but the mechanism has not been audited on the phones. | shard 05 step 4 |

Four further items are unresolved and are **blocking for implementation**, not merely
open: A1 (Google Drive is an undeclared fourth node writing the same tree), A2 (hot
per-node state files have no declared class), A3 (the fidelity cascade is not
node-deterministic — a defect in this design), and A6 (`handoff` of genuinely
uncommitted work is unspecified). All four are stated in full in
[06-riesgos.md](06-riesgos.md). A1 in particular may force a revision of D5.
