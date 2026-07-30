---
title: GitLens multi-agent git orchestration research
type: research-queue-item
status: draft
lifecycle: active
parent: "[[docs/work/draft/index|draft work]]"
created: 2026-06-17T18:03:55
updated: 2026-06-17T18:03:55
created_by: codex-gpt-5
updated_by: codex-gpt-5
tags:
  - agent/research
  - git
  - gitlens
  - mcp
  - multi-agent
---

# GitLens Multi-Agent Git Orchestration Research

## Prompt

Research how current GitLens/GitKraken tooling can support multi-agent Vaultman work across Codex, Claude, Antigravity, and related IDE agents, especially for regression recovery, commit graph inspection, worktree hygiene, `GOOD/BAD` confirmation, and cherry-pick/revert workflows.

## Initial Source Scout

- GitKraken Help Center, GitLens current release notes:
  https://help.gitkraken.com/gitlens/gitlens-release-notes-current/
- GitKraken Help Center, MCP getting started:
  https://help.gitkraken.com/mcp/mcp-getting-started/
- GitKraken Help Center, MCP tools reference:
  https://help.gitkraken.com/mcp/mcp-tools-reference/
- GitKraken Help Center, MCP example workflows:
  https://help.gitkraken.com/mcp/mcp-example-workflows/

## Early Findings To Verify

- GitLens `17.5+` bundles the GitKraken MCP Server, but the current Codex tool list in this session does not expose a GitKraken/GitLens MCP tool directly.
- GitLens 18 release notes describe agent sessions integrated into GitLens workflows and branch-associated session visibility.
- The GitKraken MCP docs describe tool categories for git operations, GitLens workflows, issue tracking, and pull request management.

## Research Questions

- Can Antigravity expose GitLens/GitKraken MCP tools to Codex in this environment, or only to agents launched inside that IDE?
- Which GitLens MCP tools map cleanly to Vaultman regression recovery: commit graph, file history, changed-file inspection, `GOOD/BAD` marking, revert, cherry-pick, and worktree/session dashboards?
- Can GitLens agent sessions reduce abandoned worktrees by making branch/session ownership visible to the dev and other agents?
- What parts must remain CLI-only for auditability under Vaultman PKM-AI policy?

## Desired Output

- A short operating protocol for using GitLens/GitKraken MCP during Vaultman regression recovery.
- A compatibility note for Codex, Claude, Antigravity, Gemini CLI, and any IDE-only agents.
- A policy recommendation for when GitLens visual confirmation should supplement automated bisect/tests.
