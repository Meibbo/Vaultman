---
title: Engineering context
type: agent-context
status: active
parent: "[[docs/current/status|current-status]]"
created: 2026-05-06T07:05:00
updated: 2026-05-11T11:11:26
tags:
  - agent/current
  - agent/context
  - architecture
---

# Engineering Context

This note captures the standing engineering posture requested by the user on
2026-05-06. Read it with `status.md` and `handoff.md` before designing or
implementing Vaultman work.

## Operating Posture

- Act as a senior fullstack engineer with strong codebase architecture
  experience across generic libraries, agnostic services, and product-specific
  modules.
- Prefer deep modules: small stable interfaces that hide meaningful behavior
  and improve locality.
- Keep implementation aligned with the existing Vaultman architecture before
  introducing new abstractions.
- Use current source research for UI, accessibility, Svelte, Obsidian, or
  platform-specific assumptions when the answer depends on present best
  practice.
- When backlog wording is imprecise, translate it into explicit specs and
  plans instead of scattering inline implementation details.
- `v1.0 scope` is broad in Vaultman: it includes hardening plus the successor
  v1.0 Polish work. Do not treat the old triage term `out-hardening` as
  "outside v1"; it means outside the hardening project but inside v1.0 Polish
  unless the source explicitly says `post-rc.1`, `cancelled`, or
  `already-fixed`.
- Use TDD for behavior changes. Tests should cover public behavior, not private
  helper shapes.
- Obsidian CLI runtime tests and live smokes must target `plugin-dev`
  explicitly. Use commands such as `obsidian vault=plugin-dev plugin:reload
  id=vaultman`, `obsidian vault=plugin-dev command id=vaultman:open`, and
  `obsidian vault=plugin-dev dev:errors`; do not rely on the most recently
  focused vault and do not use the repository vault `vaultman` for test smoke
  work unless the user explicitly asks for that vault.
- Use subagents when work can be split into independent write scopes or
  read-only explorations.

## UI And Interaction Posture

- Design dense operational tools as professional working surfaces, not landing
  pages or marketing layouts.
- Selection, focus, hover, active filters, pending operations, and primary
  actions are separate UI concepts. Do not collapse them into one visual state.
- Cursor affordance policy: keep the normal cursor on broad clickable working
  surfaces such as explorer rows, tiles, cards, and frame-level panels. Reserve
  `cursor: pointer` for explicit compact controls such as icon buttons, links,
  toggles, chevrons, action badges, resize handles, drag handles, and other
  controls where the pointer communicates a concrete command rather than a
  whole-row selection surface.
- Treat keyboard navigation as a first-class interaction model.
- Use context menus strategically for batch actions and destructive actions.
  Do not hide core actions only in context menus when a direct row or label
  affordance is expected.
- Apple Liquid Glass and gooey motion can inform polish, but motion must not
  compromise legibility, hit targets, responsiveness, or reduced-motion users.
- Prefer crisp state transitions, subtle translucent layers, and responsive
  layout organization over decorative blur or one-note color palettes.
- v1.0 UX sequencing starts with perceived performance and interaction feel:
  cursor affordance policy, cheap hover states, clean row/tile/card state
  separation, and reduced-motion behavior should be settled before larger
  visible redesigns such as navbar/menu layout, inline rename, or explorer
  Outline.
- Interaction-feel implementation starts in SCSS: cursor and hover treatment on
  broad surfaces should be corrected before touching Svelte. Cross into Svelte
  only when evidence shows hover/reveal behavior is mutating reactive state,
  causing extra renders, or coupling visual hover to selection/action logic.
- The first interaction-feel pass is narrow: only broad working surfaces such as
  rows, tiles, cards, file rows, and filter/list rows. Do not include navbars,
  popups, primitives, badges, chevrons, toggles, links, drag handles, resize
  handles, or explicit icon/text buttons in that first pass.

## Documentation Posture

- Preserve technical detail in docs. Do not compress away context to satisfy an
  arbitrary line target.
- Put complete active-work records in the relevant initiative folder and link
  them from `current/status.md` or `current/handoff.md`; do not turn current
  docs into compacted substitutes for the initiative record.
- If a spec or plan is large, shard it. If sharding interrupts capture, write
  the detail first and shard later.
- Current docs may temporarily exceed compactness rules when the user has
  explicitly prioritized fidelity over brevity.
