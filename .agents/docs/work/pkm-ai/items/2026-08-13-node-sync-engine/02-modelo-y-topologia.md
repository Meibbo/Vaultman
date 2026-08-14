---
title: Model and physical topology
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
  - topology/multi-device
dateCreated: 2026-08-13T18:00:00
dateUpdated: 2026-08-13 18:00:00
---
# Model And Physical Topology

## The three layers

Today `str`, `devicesync` and the hand-made copies each fuse several concerns into a
single gesture, which is why a failure in one shows up as a mystery in another. The
engine separates three concerns that are genuinely orthogonal:

**Propagation** — how content travels *between nodes*.
Transports: `git-direct` (push/pull between devices over tailscale or LAN, never via
GitHub), `rclone` (notes and binaries), `ssh+tar` (configs — what `devicesync` already
does).

**Exposure** — how content is made visible *to another application within the same
node*. Mechanisms: `link` (symlink on Linux/proot, junction on NTFS) where the
filesystem allows it, `mirror` (one-way copy) where it does not. The declaration
states the intent — "these docs are visible here" — and the engine picks the
mechanism per platform. F7 establishes that `link` is available on every node for the
docs case, so `mirror` is not needed for it.

**Fidelity** — what metadata survives the journey, and what metadata is *repaired*
when the origin was already wrong. This layer does not exist today. Shard 03.

## Unit declaration

```
unit: pkm-docs
  home:        vault:x/Agent Docs       # the physical owner of the bytes
  class:       urgent
  nodes:       pc, m1, m2
  propagation: git-direct               # travels with its home repo
  publication: local                    # never pushed to GitHub
  exposure:
    pc: junction → vaultman/.agents/docs
    m1: symlink  → vaultman/.agents/docs
    m2: symlink  → vaultman/.agents/docs
  fidelity:    preserve mtime; derive dateCreated via cascade
```

### Unit classes

| Class | Meaning | Transport implication |
| --- | --- | --- |
| `urgent` | Must converge across nodes promptly; divergence is a defect. PKM-AI docs, agent room state. | Propagated on every `sync`; `doctor` checks commit convergence. |
| `on-demand` | Propagated only when the dev asks. Worktree contents, in-progress code. | Never propagated automatically; moved by `handoff`. |
| `bulk` | Large or binary; correctness matters, latency does not. `media-lib/`, `_RESOURCES/`, attachments. | rclone only; excluded from git. |

A fourth class is proposed but not yet locked — see A2 in shard 06, which identifies
hot per-node state files that fit none of these three.

Note the inversion versus the first draft of this design: `home` is the vault, and the
repo path is an *exposure*, not the origin. F4 forced this and it is the correct
reading — the docs are notes that a repo happens to link to, not repo files that a
vault happens to mirror.

What this buys: `.git` stops travelling over rclone **because the engine cannot do
it** — `git-direct` is the only valid transport for a unit whose home is a git path,
and the `rclone` executor rejects any path containing `.git`. The rule stops depending
on the dev remembering it.

Master election falls out of the same declaration: a `master: <node>` field names the
node that is authoritative for a given handoff. Changing master is editing one line,
not rewriting scripts.

## Nodes

| Node | Devices | Notes |
| --- | --- | --- |
| `pc` | Windows + WSL archlinux | One node, per dev decision. WSL is not addressed separately. |
| `m1` | Poco X6 Pro 5G, Termux + proot archlinux | Runs Obsidian GUI inside proot (`startobsidian_arch.sh`, user `meibbo`). Target of subsystem D. |
| `m2` | Poco F4 GT, Termux | Local node; where the agent harness runs. |

## Repositories

### vaultman — plugin code

A real, independent git clone per node. `origin` is GitHub; additional remotes `pc`,
`m1`, `m2` over tailscale/LAN carry on-request handoff. rclone is forbidden on this
path — the `vault` project is removed from `str-rclone`.

`.agents/` retains its existing push boundary (committed locally, never pushed to
`origin`), which the `publication: local` property now expresses declaratively instead
of by convention.

`.agents/docs` is an exposure into the vault on all three nodes.

### Start of The Road — Obsidian vault, and the physical home of the docs

A real `.git` per node, replacing the replicated Windows gitfile (F6). Device-to-device
remotes carry the content; `origin` on GitHub receives only the public branch.

rclone is retained **only** for `media-lib/`, `_RESOURCES/` and binary attachments,
which are `.gitignore`d. These are the only paths where rclone and git touch the same
tree, and the exclusion is enforced from both sides.

### Agent configs

`devicesync` remains the executor. Its TSV manifest is absorbed as units of class
`config`.

## The git-and-symlink hazard

Git treats links differently per platform, and this is the sharpest edge in the design.

On `pc`, git traverses the junction and tracks the vault's files as if they were repo
files. On Termux, git stores a symlink **as a symlink** and does not descend into it.
So after D4 is applied, a `git add .agents/docs` on a phone would record that thousands
of tracked files were deleted and replaced by a single link.

This must be neutralized explicitly, not left to chance. Two candidate mechanisms:

- `git update-index --skip-worktree` on the path, per phone clone.
- A phone-local `.git/info/exclude` entry, which does not travel to other nodes.

The choice is deferred to the implementation plan; both keep `pc` as the only node
that commits doc content into `vaultman`, which is consistent with `pc` being the node
where the junction is traversable. Q4 in the index tracks the audit of how doc content
reaches vaultman commits today.

## Publication scope

The dev's stated plan — use `.gitignore` so that certain paths are committed locally
but never reach GitHub — cannot work: `.gitignore` means "never enters a commit", so
those paths would not travel between nodes either.

The mechanism that does work separates *commit scope* from *publication scope*, which
is exactly the pattern `vaultman` already uses for `.agents/`. Each unit declares
`publication: local | github`. Local units are committed on a branch that is pushed
only to the device-to-device remotes; only the public branch is pushed to GitHub.
`.gitignore` is reserved for content that must not be in git at all — the heavy
binaries that travel by rclone.
