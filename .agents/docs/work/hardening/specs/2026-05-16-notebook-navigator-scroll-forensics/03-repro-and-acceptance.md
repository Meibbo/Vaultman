---
title: Repro And Acceptance Criteria
type: spec-shard-index
status: active
parent: "[[docs/work/hardening/specs/2026-05-16-notebook-navigator-scroll-forensics/index|Notebook Navigator Scroll Forensics]]"
created: 2026-05-16T00:00:00
updated: 2026-05-16T00:00:00
tags:
  - agent/spec
  - explorer/performance
  - plugin-dev
---

# Repro And Acceptance Criteria

This shard is split between the live plugin-dev repro and the test/acceptance
matrix.

## Continuations

1. [[docs/work/hardening/specs/2026-05-16-notebook-navigator-scroll-forensics/03a-plugin-dev-repro|Plugin-dev repro]]
2. [[docs/work/hardening/specs/2026-05-16-notebook-navigator-scroll-forensics/03b-acceptance-matrix|Acceptance matrix]]

## Non-Negotiable Test Environment

Use `plugin-dev` explicitly for Obsidian CLI commands.

Do not open or target the personal `vaultman` vault for this work.

Allowed shape:

```powershell
obsidian plugin:reload id=vaultman vault=plugin-dev
obsidian dev:errors vault=plugin-dev
obsidian eval code="<specific code>" vault=plugin-dev
```

If Obsidian CLI eval latency is already tens of seconds before the scroll test,
restart or reload plugin-dev before recording results. A slow control eval is a
bad measurement baseline.

