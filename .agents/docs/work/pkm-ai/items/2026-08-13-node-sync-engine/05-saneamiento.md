---
title: Phase 0 — sanitation
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
# Phase 0 — Sanitation

Ordered remediation. Steps 1–3 unblock the dev's immediate goal (worktree 029 → merge
to `origin/dev` on m2). The engine performs these steps; they are specified here as
behaviour, not as manual instructions, per the dev's decision to design the engine
before touching anything.

The order matters: step 1 must precede step 2, because step 2 destroys the tree that
holds the only copy of the material rescued in step 1.

## Step 1 — Rescue uncommitted work on the phones

m2 carries untracked content that exists nowhere else, including
`.agents/docs/architecture/research/` and several session logs. The 1477 "modified"
paths are CRLF noise (F2) and carry no information, but the 377 "deleted" paths and
the untracked set must be inspected before anything is discarded.

**Acceptance:** every untracked path on m1 and m2 is either committed, copied into the
vault, or explicitly recorded as discarded, with the dev's confirmation. Nothing is
deleted on inference.

## Step 2 — Re-clone vaultman on m1 and m2

A clean clone rather than an in-place repair. `.git` is 50 MB, so the cost is small,
and a clone eliminates in one move both the 1854 CRLF-dirty paths and the 30 inherited
Windows worktree registrations. Repairing in place is more work and leaves residue.

**Acceptance:** `git status --porcelain` is empty on both phones, and
`git worktree list` shows only the local primary worktree.

## Step 3 — Add `.gitattributes` and set line-ending policy

`* text=auto eol=lf` in the repo, so the divergence cannot reappear when a new node
joins. This is a commit to `vaultman` and travels normally.

**Acceptance:** a fresh clone on a phone and on `pc` produce byte-identical working
trees for text files.

## Step 4 — Convert `.agents/docs` into an exposure on m1 and m2

Replace the materialized duplicate with a symlink into the vault, reproducing the `pc`
topology (F4, F7). Before removing the duplicate, its content is merged into the vault
copy, because the phones' duplicates and the vault copies have diverged (F5) and the
duplicate may hold the newer version of a given file.

Immediately after, neutralize the git-and-symlink hazard described in shard 02, so
that no phone can record the link as a mass deletion.

**Acceptance:** on all three nodes, `.agents/docs` resolves to the vault path; the
phones' `git status` stays clean; and Q4 (how doc content reaches vaultman commits)
is answered and recorded.

## Step 5 — Give the vault a real `.git` on m1 and m2

Replace the replicated Windows gitfile (F6) with a real repository per node, add the
device-to-device remotes, and configure the public branch and its refspec so that
`local` units never reach GitHub (shard 02, publication scope).

**Acceptance:** `git status` and `git commit` work in the vault on both phones, and a
push of a `local` unit to `origin` is refused.

## Step 6 — Retire `str` project `vault`

Remove it from `str-rclone`. From this point the first invariant makes the failure mode
unreachable rather than merely discouraged.

**Acceptance:** `doctor` reports no rclone unit resolving to a path containing `.git`.

## Step 7 — First fidelity pass

Run the derivation cascade across the vault, emit the sidecar manifest, and apply
resolved metadata on each node. This is the step that repairs the daily notes.

**Acceptance:** a sample of daily notes whose filename encodes a date show a matching
`dateCreated`, identical on all three nodes; `session-log.md` reports the same mtime
everywhere.

## Deliberately not in phase 0

Subsystem A (harness routing) and subsystem D (build → m1 proot vault pipeline). Both
are unblocked by this work but neither is part of it.
