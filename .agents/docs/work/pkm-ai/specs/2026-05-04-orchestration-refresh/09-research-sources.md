---
title: Research sources
type: spec-slice
parent: "[[docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh/index|pkm-ai]]"
status: approved-draft
created: 2026-05-04T00:00:00
updated: 2026-05-04T00:00:00
tags:
  - agent/spec
  - agent/research
---

# Research Sources

These sources informed the design. During implementation, move durable notes to
`knowledge/` with `source_url`, `verified_at`, and `expires_at`.

## Context And Agent Manifests

- OpenAI Codex loop: https://openai.com/index/unrolling-the-codex-agent-loop/
- Claude context docs: https://support.claude.com/en/articles/14553240-give-claude-context-claude-md-and-better-prompts
- AGENTS.md evaluation: https://arxiv.org/abs/2602.11988
- Agent config study: https://arxiv.org/abs/2602.14690

## Skills And Workflows

- OpenAI skills academy: https://openai.com/academy/codex-plugins-and-skills/
- Skill creator guidance: https://github.com/openai/skills/blob/main/skills/.system/skill-creator/SKILL.md
- Matt Pocock skills: https://github.com/mattpocock/skills
- Human-in-the-loop agents: https://openai.github.io/openai-agents-js/guides/human-in-the-loop/

## Retrieval And Indexing

- Aider repo map: https://aider.chat/docs/repomap.html
- CodeSight context index: https://github.com/Houseofmvps/codesight
- Docker Agent RAG: https://docs.docker.com/ai/docker-agent/rag/
- AutoGen memory/RAG: https://microsoft.github.io/autogen/dev/user-guide/agentchat-user-guide/memory.html
- ContextBench: https://arxiv.org/abs/2602.05892
- ACON context compression: https://arxiv.org/abs/2510.00615

## Docs And Decisions

- Diataxis: https://diataxis.fr/
- ADR home: https://adr.github.io/
- Google ADR overview: https://docs.cloud.google.com/architecture/architecture-decision-records
- Keep a Changelog: https://keepachangelog.com/
- Conventional Commits: https://www.conventionalcommits.org/

## Obsidian And Script Tooling

- Obsidian properties: https://help.obsidian.md/properties
- Obsidian Bases syntax: https://help.obsidian.md/bases/syntax
- VS Code TypeScript tooling: https://code.visualstudio.com/docs/typescript/typescript-transpiling
- Python tooling for TypeScript developers: https://pydevtools.com/handbook/explanation/python-tooling-for-typescript-developers/
