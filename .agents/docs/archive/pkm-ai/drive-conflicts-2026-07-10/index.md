---
title: DriveSync conflict archive 2026-07-10
type: archive-manifest
status: completed
lifecycle: archived
parent: "[[docs/archive/pkm-ai/manifest|pkm-ai archive]]"
created: 2026-07-10T07:34:22
updated: 2026-07-10T07:34:22
created_by: codex-gpt-5
updated_by: codex-gpt-5
tags:
  - agent/archive
  - agent/recovery
  - incident/drivesync
---

# DriveSync Conflict Archive - 2026-07-10

This archive preserves divergent conflict copies removed from active routing
after the Google Drive/DriveSync incident. Canonical files were selected by the
`AGENTS.md` start route, docs policy, lifecycle metadata, and newer source
records. No divergent non-empty file was discarded.

## Canonical Winners

- [[docs/architecture/explorer-model/01-responsibility-map|Explorer responsibility map]]
- [[docs/architecture/explorer-model/03-surfaces-and-interaction|Explorer surfaces and interaction]]
- [[docs/architecture/explorer-model/04-panels-axons-mutation-layout|Panels, axons, mutation, and layout]]
- [[docs/architecture/research-inventory|Research inventory]]

Their four older conflict copies remain below `files/architecture/` with their
original conflict filenames.

## External Quarantine

`C:\tmp\vaultman-docs-quarantine-20260710` preserves material that should not
remain searchable as agent memory:

- `internal-conflicts/untracked-copies/`: 30 untracked `(2)` copies with their
  original relative paths. Twenty-seven are text-identical after normalizing
  line endings. The other three are older revisions of `work/draft/index.md`,
  `work/pkm-ai/items/vm-0002-current-docs-as-route-indexes.md`, and
  `work/pkm-ai/plans/2026-06-06-agent-room-control-ui/index.md`.
- `misplaced-root-sources/2026-06-20-p112-tree-indent-caret-recovery.md`: older
  misplaced copy; the canonical source is
  [[docs/work/hardening/items/2026-06-20-p112-tree-indent-caret-recovery|the hardening item]].

## Removed Placeholders

Forty-seven tracked `(N)` files under `work/research/` were zero bytes. Each had
a non-empty canonical counterpart in the same directory, so the placeholders
were removed from Git.

The distinct `HANDOFF (1).md` under
`archive/pkm-ai/migration-2026-05-04/raw/docs/` remains untouched. It belongs to
the raw historical migration payload and is not an active route.
