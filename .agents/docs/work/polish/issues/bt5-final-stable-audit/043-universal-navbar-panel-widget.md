---
title: BT5-043 — Universal Navbar panelWidget host
type: issue
status: needs-triage
lifecycle: active
priority: P1
execution: AFK
parent: "[[docs/work/polish/issues/bt5-final-stable-audit/index|BT5 final stable audit]]"
created: 2026-07-22T13:05:00
updated: 2026-07-22T13:05:00
created_by: codex-gpt5-root
updated_by: codex-gpt5-root
tags: [agent/issue, triage/needs-triage, initiative/polish, release/1.2.0, navbar, architecture]
---

# BT5-043 — Universal Navbar panelWidget host

## Parent

[[docs/work/polish/issues/bt5-final-stable-audit/index|BT5 final stable audit]].
Corrects the page-owned toolbar architecture exposed by BT5-037/039.

## What to build

Introduce one frame-owned Navbar, classified as a `panelWidget`, whose action nodes are contributed by the active provider. Preserve `Toolbar` as a settings and UX alias for v1.2.0, but remove ownership from Files, Statistics or any page.
The host owns ordering, availability, overflow and focus semantics; providers only describe actions and invoke domain ports.

## Acceptance criteria

- [ ] One Navbar host is mounted per Vaultman frame and survives provider switches.
- [ ] A typed provider contribution contract supplies stable action ids, labels, icons, order, availability and invocation.
- [ ] Providers cannot instantiate a second toolbar/navbar renderer.
- [ ] Existing saved toolbar settings migrate without losing action ids or order.
- [ ] The host exposes one focus/keyboard model and one overflow seam.
- [ ] Tests prove provider switching changes contributions without remounting the host.
- [ ] Canonical docs identify Navbar as a `panelWidget`; UX copy may still say Toolbar.

## Blocked by

None — can start immediately.
