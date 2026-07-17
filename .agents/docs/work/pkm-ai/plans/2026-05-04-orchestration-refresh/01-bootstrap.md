---
title: Bootstrap structure
type: plan-slice
status: draft
initiative: pkm-ai
parent: "[[docs/work/pkm-ai/plans/2026-05-04-orchestration-refresh/index|pkm-ai]]"
created: 2026-05-04T00:00:00
updated: 2026-05-06T05:12:35
tags:
  - agent/plan
---

# Bootstrap Structure

## Task 1: Track Agent Workspace

**Files:**
- Modify: `.gitignore`

- [ ] Add exceptions under `*`:

```gitignore
*
!
!docs/
!docs/**
!skills/
!skills/**
!tools/
!tools/**
```

- [ ] Run:

```powershell
git check-ignore -v docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh/index.md
```

Expected: no output.

## Task 2: Create Bootloaders

**Files:**
- Replace: `AGENTS.md`
- Replace: `CLAUDE.md`

- [ ] Write `AGENTS.md` under 200 lines. It must say: read
`docs/start.md`, obey session modes, keep AI files off `main`.

- [ ] Write `CLAUDE.md` under 200 lines. It must redirect to `AGENTS.md`.

## Task 3: Create Current Entrypoints

**Files:**
- Create: `docs/start.md`
- Create: `docs/index.md`
- Create: `docs/current/status.md`
- Create: `docs/current/handoff.md`

- [ ] Use timestamp format `YYYY-MM-DDTHH:mm:ss`.
- [ ] Use Obsidian parent links when a parent exists.
- [ ] Keep `status.md` and `handoff.md` under 200 lines.

## Task 4: Create Architecture Policies

**Files:**
- Create files under `docs/architecture/`.

- [ ] Create `glossary.md`, `behavior.md`, `routing.md`.
- [ ] Create policies: `context.md`, `git.md`, `code.md`, `docs.md`,
`backlog.md`.
- [ ] Each policy contains `Rules`, `Read when`, `Do not read when`,
`Related decisions`, `Repair triggers`.
