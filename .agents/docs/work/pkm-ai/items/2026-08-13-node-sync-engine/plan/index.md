---
title: Phase 0 sanitation — implementation plan
type: plan
status: ready
lifecycle: active
parent: "[[docs/work/pkm-ai/items/2026-08-13-node-sync-engine/index|node-sync-engine]]"
created_by: claude-opus-5
updated_by: claude-opus-5
tags:
  - agent/work
  - initiative/pkm-ai
  - tooling/sync
dateCreated: 2026-08-13T20:00:00
dateUpdated: 2026-08-13 20:00:00
---
# Phase 0 Sanitation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development`
> (recommended) or `executing-plans` to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `vaultman` and the Obsidian vault usable as real git repositories on m1
and m2, eliminating the CRLF-dirty trees, the inherited Windows worktree registry and
the diverging doc duplicate — so that worktree work on a phone (starting with U121-029
→ `origin/dev`) becomes possible.

**Architecture:** The phones stop holding rclone copies and start holding real clones
pulled from `pc` over git-direct. `.agents/docs` becomes a symlink into the Obsidian
vault on every node, reproducing the junction topology that already exists on `pc`, so
there is exactly one copy of the docs per node. `str`'s `vault` project is retired.

**Tech stack:** git 2.x, OpenSSH (Termux `-p 8022`, WSL sshd `-p 2222`), rclone,
Termux bash/zsh, Windows cmd + PowerShell.

**Verification model:** these are operations tasks, not code tasks, so the TDD loop is
adapted — every task opens with a check that **currently fails**, applies the change,
then re-runs the same check and requires it to **pass**. The check is the test.

---

## Verified transport facts

These were established live on 2026-08-13 and must not be re-derived:

| Route | Result |
| --- | --- |
| `git ls-remote vic_a@meibbopc:C:/Users/vic_A/Desktop/vaultman` | **fails** — cmd.exe mangles the quoted Windows path |
| `git ls-remote ssh://vic_a@meibbopc/C:/Users/vic_A/Desktop/vaultman` | **fails** — same cause |
| `git ls-remote ssh://vic@meibbopc:2222/mnt/c/Users/vic_A/Desktop/vaultman` | **works** — returns `refs/heads/sandbox` at the live tip |

**Git-direct to `pc` goes through the WSL sshd on port 2222 against `/mnt/c/...`.** This
is the canonical `pc` git URL for the whole initiative. No bundles are needed.

## File structure

| Path | Responsibility |
| --- | --- |
| `~/vaultman` on m1, m2 | Replaced: real clone of `sandbox` from `pc`. |
| `~/vaultman/.agents/docs` on m1, m2 | Becomes a symlink into the vault. Never a directory again. |
| `~/vaultman/.git/info/exclude` on m1, m2 | Node-local neutralisation of the symlink so git never records it. |
| `.gitattributes` at repo root | New. `* text=auto eol=lf`. Prevents F2 recurring. |
| `<vault>/.git` on m1, m2 | Replaced: real repository instead of the replicated Windows gitfile. |
| `~/bin/str-rclone` on m1, m2 | Modified: the `vault` project is removed. |
| `~/vaultman-preflight/` on m1, m2 | Temporary. Holds the rescue manifest; deleted in Task 8. |

## Tasks

| # | Task | Shard |
| --- | --- | --- |
| 1 | Inventory and rescue unique content on the phones | [01-rescate.md](01-rescate.md) |
| 2 | Land `.gitattributes` on `pc` | [01-rescate.md](01-rescate.md) |
| 3 | Re-clone `vaultman` on m2 | [02-reclonado.md](02-reclonado.md) |
| 4 | Re-clone `vaultman` on m1 | [02-reclonado.md](02-reclonado.md) |
| 5 | Turn `.agents/docs` into a symlink and neutralise it for git | [03-enlaces-y-vault.md](03-enlaces-y-vault.md) |
| 6 | Give the Obsidian vault a real `.git` on m1 and m2 | [03-enlaces-y-vault.md](03-enlaces-y-vault.md) |
| 7 | Retire the `vault` project from `str-rclone` | [04-retirada-y-verificacion.md](04-retirada-y-verificacion.md) |
| 8 | Full verification sweep | [04-retirada-y-verificacion.md](04-retirada-y-verificacion.md) |

## Ordering constraints

- **Task 1 must precede Tasks 3 and 4.** Re-cloning destroys the tree that holds the
  only copy of what Task 1 rescues.
- **Task 2 must precede Tasks 3 and 4.** The fresh clones must already carry
  `.gitattributes`, otherwise F2 reappears on the first checkout.
- **Task 5 must follow Tasks 3 and 4** and must complete before Task 7, or the docs
  would be reachable by neither transport in the gap.
- Task 6 is independent of Task 5 and may run in parallel.

## Out of scope

The engine itself (`sync`, `link`, `master`, `handoff`, `fidelity`, `doctor`) is Plan B.
This plan performs phase 0 by hand precisely so that Plan B can be written against a
system that is already consistent. The first fidelity pass — step 7 of the spec's
sanitation shard, which repairs the daily notes — belongs to Plan B, because it requires
the manifest format the engine defines.

Subsystems A (harness routing) and D (build → m1 proot vault) remain out of scope.
