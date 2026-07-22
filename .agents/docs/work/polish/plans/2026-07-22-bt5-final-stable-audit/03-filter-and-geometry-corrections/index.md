---
title: BT5 final stable audit plan — filter and geometry corrections
type: implementation-plan-shard-index
status: active
lifecycle: active
parent: "[[../index|Vaultman v1.2.0 final stable audit implementation plan]]"
created: 2026-07-22T15:45:00
updated: 2026-07-22T15:45:00
created_by: codex-gpt5-root
updated_by: codex-gpt5-root
tags: [agent/plan, initiative/polish, release/1.2.0]
---

# Filter and geometry corrections

- [[01-scrollbar-and-filter-polarity|BT5-051/052/053 — one scrollbar footprint and reversible filter polarity]].
- [[02-property-menu-glyph-and-top-edge|BT5-054/058/059 — property menus, glyph projection and frame top edge]].

Implement BT5-052 immediately before BT5-053 so the interaction tests assert the final copy. Diagnose BT5-059 early, but apply its CSS after the universal Navbar host is structurally stable if the same top slot is touched.
