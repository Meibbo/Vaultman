---
title: Prop value rename handoff implementation
type: implementation-plan-index
status: active
parent: "[[docs/work/hardening/specs/2026-05-06-user-facing-recovery-wave-a/index|user-facing-recovery-wave-a]]"
created: 2026-05-06T03:30:00
updated: 2026-05-06T03:30:00
tags:
  - agent/plan
  - initiative/hardening
  - explorer/props
  - fnr
  - logic/queue
glossary_candidates:
  - rename handoff
  - FnR rename state
---

# Prop Value Rename Handoff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use test-driven-development.
> Write each failing behavior test before implementation. Use
> svelte-code-writer/autofixer for changed Svelte files.

**Goal:** route property and value context-menu rename into a shared FnR/navbar
handoff instead of opening `showInputModal`, while preserving the existing queue
semantics for prop rename and value replacement.

**Architecture:** keep provider actions thin, add typed rename handoff state to
`FnRState`, put queue construction in `serviceFnR`, and render a compact navbar
handoff surface that can confirm or cancel the operation.

**Tech Stack:** TypeScript, Svelte 5 runes, Vitest unit/component tests,
existing `OperationQueueService`, `NATIVE_RENAME_PROP`, and property explorer
scope helpers.

## Shards

1. [[docs/work/hardening/plans/2026-05-06-prop-value-rename-handoff/01-state-and-builders|State and builders]]
2. [[docs/work/hardening/plans/2026-05-06-prop-value-rename-handoff/02-provider-and-navbar-integration|Provider and navbar integration]]
3. [[docs/work/hardening/plans/2026-05-06-prop-value-rename-handoff/03-verification-and-close|Verification and close]]

## Execution Order

1. Add red unit tests in `serviceFnR.test.ts` for prop/value rename builders
   and rename handoff state transitions.
2. Implement typed rename handoff state and prop/value queue builders in
   `serviceFnR.svelte.ts`.
3. Add red provider tests proving `prop.rename` and `value.rename` call a
   handoff callback and do not call `showInputModal`.
4. Update `explorerProps` to accept a start-handoff callback and fall back only
   when no callback is available.
5. Wire `tabProps.svelte`, `pageFilters.svelte`, and `NavbarExplorer.svelte`
   so the props tab can start the shared handoff and navbar can confirm/cancel.
6. Add focused component coverage only for the navbar surface if existing test
   harness supports it cheaply.
7. Run focused tests, Svelte autofixer for changed Svelte files, `pnpm run
   check`, then announce A1 complete and name A2.

## Stop Conditions

- Stop if the handoff cannot be wired without creating a second independent FnR
  state outside `filtersFnRState`.
- Stop if confirming a value rename would produce a different logical queue
  operation than the current modal path.
- Do not commit.
