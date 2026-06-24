---
title: FnR rename handoff
type: spec-shard
status: draft
parent: "[[docs/work/hardening/specs/2026-05-06-user-facing-recovery-wave-a/index|user-facing-recovery-wave-a]]"
created: 2026-05-06T02:46:22
updated: 2026-05-06T02:46:22
tags:
  - agent/spec
  - initiative/hardening
  - explorer/views
---

# FnR Rename Handoff

## Current State

`serviceFnR.svelte.ts` already exists for content find/replace. It supports
plain, regex, Obsidian search, Bases, Dataview, and Ant Renamer syntax options.
`tabContent.svelte` uses it for content replace and queues
`content_replace` operations.

Prop/value rename still uses `showInputModal` in `explorerProps`. File rename
uses `FileRenameModal`. Tag rename has no working implementation.

## User Decision

The first rename handoff implementation should start with **prop/value**.
Tags/files are still mandatory before wave completion, but they follow after
A0 repairs the context-menu queue path.

## Target UX

Selecting Rename from a prop or value context menu should move the user into a
smart FnR/navbar state rather than opening an isolated input modal.

The navbar/FnR surface should:

- prefill find from the selected node;
- focus the replace input;
- carry source metadata such as prop name, value, node type, and selected scope;
- show enough context to make it clear what will be renamed;
- queue the operation without immediately mutating files;
- preserve the existing queue preview/execute model.

## State Model

Add a rename handoff state next to existing `FnRState` rather than overloading
content replace fields with hidden meaning.

The handoff should include:

- source kind: `prop`, `value`, `tag`, or `file`;
- original text;
- replacement text;
- selected node ids or source metadata needed to build the operation;
- scope: selected, filtered, or all;
- status: inactive, editing, ready, queued, or cancelled.

## Builder Model

Queue operation construction should live in testable TypeScript helpers or
service functions, not in Svelte markup. The Svelte components should only bind
state, focus inputs, and dispatch commands.

For prop/value:

- prop rename builds the existing `NATIVE_RENAME_PROP`-based change.
- value rename builds the existing value replacement change.
- canonical property casing remains preserved through existing provider logic.

For tag/file in A2:

- tag rename should update frontmatter tags through queue operations.
- file rename should reuse the existing `RENAME_FILE` operation semantics.

## Non-Goals

- Do not implement content replace again.
- Do not remove existing content FnR behavior.
- Do not make FnR evaluate Bases or Dataview expressions in this wave.

