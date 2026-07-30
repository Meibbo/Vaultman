---
title: Spec - Lifecycle And Indexing
status: draft
created: 2026-05-09T23:45:00
updated: 2026-05-09T23:45:00
created_by: codex
updated_by: codex
parent: "[[work/research/2026-05-10-agent-brain-synthesis/index|Agent Brain Synthesis]]"
---

# Spec - Lifecycle And Indexing

## Problem

Archived lifecycle specs asked Vaultman to move long-lived indexes and eventful services under Obsidian `Component` lifecycle ownership. Current code has not done that for the core node indexes.

Current evidence:

- `main.ts` imports `createFilesIndex`, `createTagsIndex`, `createPropsIndex`, and `createContentIndex`.
- `main.ts` registers vault and metadata events centrally.
- `indexFiles.ts`, `indexTags.ts`, `indexProps.ts`, and `indexContent.ts` expose functional factories, not `Component` subclasses.
- Some services already use `Component`, so the app has mixed lifecycle models.

## Goal

Make index ownership explicit, testable, and lifecycle-safe without changing view behavior.

## Non-Goals

- Do not rewrite all services.
- Do not change visible explorer/table behavior.
- Do not migrate styling or UI primitives.
- Do not revive archived broad refactors unless they serve this lifecycle boundary.

## Required Design

1. Introduce lifecycle-owned index classes or adapters for Files, Tags, Props, and Content.
2. Preserve the existing `INodeIndex` contract, including `revision`.
3. Move index-specific event registration next to the index owner where practical.
4. Keep `main.ts` as orchestration glue, not the place where all index internals live.
5. Add regression tests for refresh and revision behavior before replacing the current factories.

## Svelte Frame Event Safety

Archived event-leak prevention also applies to frame-level subscriptions.
Current `frameVaultman.svelte` manually subscribes/unsubscribes to `metadataCache.on('resolved', ...)`.

Spec requirement:

- Pass lifecycle context into the frame if Obsidian leaf lifecycle ownership is the desired model.
- Otherwise document that manual cleanup is the intentional current contract and add a targeted test or code comment around it.

## Acceptance Criteria

- Core index refresh behavior remains identical for create/delete/rename, metadata changed, and resolved events.
- Index `revision` increments are preserved and covered by tests.
- Plugin unload releases index-owned event refs through Obsidian lifecycle or a documented cleanup path.
- No page/view code has to know whether an index is factory-backed or component-backed.
- `main.ts` loses direct ownership of index internals and keeps only composition responsibilities.

## Superseded Notes

- The archived demand to remove every manual emitter from `*.svelte.ts` is too broad for the current codebase. Current compatibility surfaces use manual listeners in places. The relevant requirement is lifecycle clarity and no leaking Obsidian event refs.
- The old "no `(app as any)`" hardening criterion is effectively covered for source code; remaining `as any` usage is mostly tests/helpers and should not drive this spec.
