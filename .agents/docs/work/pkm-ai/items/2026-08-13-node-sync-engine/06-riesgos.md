---
title: Adversarial pass — gaps, hazards and what is lost
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
  - review/adversarial
dateCreated: 2026-08-13T18:00:00
dateUpdated: 2026-08-13 18:00:00
---
# Adversarial Pass

Run unprompted before locking, per the Adversarial Pass policy. Scenarios the dev did
not raise, defects in this design's own reasoning, and what quality is lost relative to
the status quo.

## A1 — Google Drive is an undeclared fourth node (high)

The vault's physical home is `C:\Users\vic_A\My Drive\Start of The Road`. Google Drive
is synchronising that tree continuously, to the cloud and to anything else signed into
that account. The design declares three nodes and gives git authority over the vault,
but Drive keeps writing to the same tree with no coordination and no knowledge of git.

Concrete failure modes: Drive conflicted copies appearing as untracked files mid-merge;
`.gdoc` stubs (already present next to `.docx` files in `x/`) being treated as content;
Drive restoring a file that git just deleted. Two uncoordinated sync engines over one
tree is the exact antipattern this spec exists to remove — and the design currently
reintroduces it.

There is also a disclosure dimension the dev has not weighed: every PKM-AI doc an agent
writes on a phone now lands in a consumer cloud account by construction, because the
docs' home is inside a Drive folder.

**Unresolved.** Options are to move the vault out of `My Drive`, to exclude the
git-governed subtrees from Drive, or to accept Drive as the vault's transport and drop
git-direct for it — which would partly contradict D5.

## A2 — Hot state files have no declared home (high)

`.obsidian/workspace.json`, `.smart-env/*.ajson` and plugin `data.json` files are
rewritten constantly — several were modified within minutes of each other during this
session. The design assigns notes to git and heavy media to rclone, and never says
where these belong. They are neither.

If git carries them, every node produces conflicting commits on every Obsidian focus
change. If they are `.gitignore`d, per-node divergence is fine for workspace layout but
wrong for plugin settings the dev expects to be shared. `exclude_mobile.txt` already
encodes a partial answer, which suggests the dev has hit this before.

**Unresolved.** The unit model needs a third class between `urgent` and `bulk` —
something like `per-node` (never propagated) — and each hot path assigned to it
deliberately.

## A3 — The fidelity cascade is not deterministic across nodes (high, defect in this design)

Cascade step 4 resolves `dateCreated` from "the oldest mtime observed across nodes",
but `fidelity` is specified to run per node. A local run cannot see other nodes' mtimes,
so two nodes can derive different dates for the same note, write different frontmatter,
and then conflict in git — with the engine as the author of the conflict.

**Fix required before implementation:** either the cascade runs on exactly one node
(the unit's `master`) and propagates its result, or step 4 is replaced by something
locally deterministic. Steps 1–3 are already deterministic and node-independent, so
the cheapest fix is to make step 4 a manifest-mediated decision rather than a local
observation.

## A4 — A destructive git command in the repo can delete vault notes (high)

Because `.agents/docs` is a link into the vault and git on Windows traverses junctions,
a `git clean -xfd`, a bad `checkout`, or a `reset --hard` inside `vaultman` on `pc` can
delete or overwrite the dev's real notes in the Obsidian vault. This is already true
today — the design does not introduce it — but the design makes the link topology
official on three nodes instead of one, so the blast radius grows.

**Mitigation to specify:** the phones' neutralization (shard 02) already prevents this
there. On `pc` nothing prevents it. `doctor` should refuse to run, and agents should be
instructed not to run tree-destructive git commands, while the junction is present.

## A5 — The plugin's test target is the vault itself (medium)

`.obsidian/plugins/vaultman/data.json` exists in the STR vault: the vault under git
control is also a test installation of the plugin being developed. Subsystem D (build →
vault on m1) therefore writes build artifacts into a git-tracked tree. `exclude.txt`
already excludes `**/plugins/**/main.js`, `styles.css` and `manifest.json` from rclone;
the equivalent `.gitignore` entries must exist before D is built, or every test build
becomes a commit.

## A6 — `handoff` of genuinely uncommitted work is unspecified (medium)

The dev asked for on-request handoff of *work in progress*. Shard 04 says `handoff`
will "commit or stash", but `git stash` does not travel to a remote. Moving truly
uncommitted state requires a WIP commit on a throwaway branch, which pollutes history,
or a non-git transport for the dirty tree — which the first invariant forbids for repo
paths. The tension is real and unresolved.

## A7 — Removing rclone from vaultman removes the asynchronous path (medium — quality lost)

`str` has a `gdrive` remote, so today a node can propagate without the other node being
awake. `git-direct` over tailscale or LAN requires the peer to be reachable. After this
change, if m1 is off, m2 cannot hand off to it at all; and `local`-publication units
have no cloud fallback by design.

This is a genuine capability loss, accepted knowingly. Note that the docs themselves
retain an off-device copy because their home is inside the Drive-synced vault — which
is A1 working in the dev's favour, and another reason A1 needs a deliberate answer
rather than a removal.

## A8 — `str bid` never deletes; git does (medium — quality lost)

The current bidirectional mode merges without propagating deletions and renames
conflicts to `.conflicto` — nothing is ever lost, at the cost of accumulating cruft.
Git will propagate deletions faithfully and can lose uncommitted work to a bad merge or
reset. For a dev who has been relying on "sync never destroys", this is a real change in
safety posture and deserves an explicit backup story before phase 0 step 2.

## A9 — Friction added to the fast path (low — quality lost)

Today a doc written on a phone propagates with one rclone command and no discipline.
After this, propagating docs requires a commit. For mid-session doc writing from a
phone this is added friction, and it is the most likely reason for the design to be
bypassed in practice. Worth measuring after phase 0 rather than pre-optimising.

## Names checked against the live system

`str-rclone` projects `sotr` and `vault`; `devicesync` manifest at
`~/.config/opencode/skills/device-sync/sync-manifest.tsv`; rclone remotes `pc`,
`pc-lan`, `m1`, `m1-lan`, `gdrive`, `pcwsl`; `agent-room.ts` under
`.agents/tools/pkm-ai/`. All verified present on 2026-08-13, not recalled from memory.

## Readability in a week

The unit declaration is the only thing the dev must hold in their head; everything else
is derived from it. The risk is the opposite of complexity — it is that the policy file
grows into a second undocumented system. Cap: if a unit needs a special case that the
declaration cannot express, that is a signal to change the model, not to add a flag.
