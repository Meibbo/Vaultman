---
title: Branch and docs boundary
type: spec-slice
status: draft
initiative: pkm-ai
parent: "[[docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh-v2/index|pkm-ai]]"
created: 2026-05-04T08:50:28
updated: 2026-05-04T08:50:28
tags:
  - agent/spec
---

# Branch And Docs Boundary

## Branch Policy

- `main`: zero AI files.
- `hardening`: current AI-docs working branch during hardening/refactor/polish.
- `dev`: later long-lived AI-docs branch.

AI files include `AGENTS.md`, `CLAUDE.md`, ``, `.claude/`, caches, and
agent-only generated docs.

## Docs Boundary

- `docs`: agent working memory, policies, specs, plans, items, archive.
- `skills`: project-owned skills and approved local skill copies.
- `tools`: deterministic scripts for agent workflow.
- `docs`: public user/dev docs only.

## Merge Implication

Do not merge an AI-docs branch directly into `main` if it would carry AI files.
Use a release path that explicitly excludes `.agents`, root bootloaders, and
other AI-only files.

## Skill Tracking Scope

For now, track only project skills named `vm-*`. Other local skills can remain
available in the workspace but should not be made part of the repo unless a
later health pass classifies and approves them.

