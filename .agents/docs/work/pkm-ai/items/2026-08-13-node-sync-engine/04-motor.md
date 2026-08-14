---
title: The engine — commands, invariants, placement
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
# The Engine

One executable plus one declarative policy file. It does not replace rclone, git or
`devicesync` — those remain the executors. It unifies their *configuration* and their
*decision*, which is where the current disorder lives.

## Commands

| Command | Purpose |
| --- | --- |
| `sync [unit]` | Propagate a unit, or every urgent unit, choosing the transport from the declaration. |
| `link` | Apply the exposures declared for this node — create junctions and symlinks, verify existing ones. Idempotent. |
| `master <node>` | Set the authoritative node for a unit's next handoff. |
| `handoff <unit> <node>` | Move in-progress work to another node on explicit request: commit or stash, push to that node's remote, verify, and hand over master. |
| `fidelity [unit]` | Export the sidecar manifest, run the derivation cascade, and apply resolved metadata on this node. |
| `doctor` | Verify the invariants below and report violations without fixing them. |

## Enforced invariants

`doctor` checks these, and the executors refuse operations that would violate them.
Each corresponds to a real failure found on 2026-08-13:

| Invariant | Guards against |
| --- | --- |
| No rclone unit resolves to a path containing `.git` | F1, F2, F3 — the whole-repo rclone sync |
| No `.git` is a gitfile pointing at another platform's path | F6 — the replicated Windows gitfile |
| Every declared exposure exists and resolves to its declared target | F5 — the materialized duplicate that silently replaced a link |
| Nodes converge on the same commit for `class: urgent` units | F5 — a week of drift going unnoticed |
| Exactly one exclusion set applies per unit, and it is named in the declaration | F10 — `exclude.txt` and `exclude_mobile.txt` disagreeing |

`doctor` is the piece that protects the dev, because none of these five is checked by
anything today. Each one failed silently for an unknown length of time.

## Placement

**The engine must not live inside anything it synchronizes.** If it lives in
`vaultman`, it cannot repair `vaultman` when `vaultman` is broken — which is the exact
state of `m1` and `m2` right now.

It lives in `~/bin`, propagated by `devicesync` (ssh+tar over LAN), which is the only
channel that currently works without depending on anything else. On `pc` the
equivalent location is the existing `bin` directory reachable from both Windows and
WSL, since they are one node.

The policy file lives beside it and is itself a `config`-class unit, so the three
nodes converge on one policy by the same mechanism as everything else — but its
transport is `ssh+tar`, never git, to avoid a bootstrap cycle where fixing git
requires a working git.

## What it absorbs

| Existing tool | Fate |
| --- | --- |
| `str` / `str-rclone`, project `vault` | Removed. Forbidden by the first invariant. |
| `str` / `str-rclone`, project `sotr` | Narrowed to `media-lib/`, `_RESOURCES/` and binary attachments. |
| `devicesync` | Retained as the `ssh+tar` executor; its TSV manifest becomes `config` units. |
| Hand-made `Agent Docs` copies on the phones | Removed; replaced by the exposures of D4. |
| `exclude.txt` / `exclude_mobile.txt` | Folded into unit declarations, one named exclusion set per unit. |
