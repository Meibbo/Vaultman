---
title: Architecture Decision Records
type: adr-index
status: active
parent: "[[docs/work/hardening/index|hardening]]"
created: 2026-05-26T00:00:00
updated: 2026-05-26T00:00:00
created_by: claude-opus-4-7
updated_by: claude-opus-4-7
tags:
  - agent/adr
  - explorer/architecture
---

# Architecture Decision Records

Nygard-style ADRs for the Explorer/Vaultman architecture, from the 2026-05-26
foundation brainstorm. Model: [[docs/architecture/explorer-model/index|explorer-model]].
Decision capture: [[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/decision-ledger|decision-ledger]].

| ID | Title | Decision status |
|---|---|---|
| [[docs/architecture/adr/0001-eight-dimension-model|0001]] | Eight-dimension architecture model | Accepted |
| [[docs/architecture/adr/0002-view-pure-renderer|0002]] | View = pure renderer | Accepted |
| [[docs/architecture/adr/0003-cell-view-config-bases-aligned|0003]] | Cell + view-config, Bases-aligned | Accepted |
| [[docs/architecture/adr/0004-platform-adapter-fragility-registry|0004]] | PlatformAdapter + Fragility Registry | Accepted |
| [[docs/architecture/adr/0005-actionnode-unification|0005]] | ActionNode unification | Accepted |
| [[docs/architecture/adr/0006-publish-channel-split|0006]] | Publish channel split (beta/stable) | Accepted |
| [[docs/architecture/adr/0007-page-editor-group|0007]] | Page = editor-group | Accepted |
| [[docs/architecture/adr/0008-render-ownership-two-layer|0008]] | Render ownership: data-plane vs shared runtime | Accepted |
| [[docs/architecture/adr/0009-bases-interop-hybrid|0009]] | Bases interop strategy: native-primary + opt-in `registerBasesView` add-on | Accepted |

ADRs 0001–0009 are all Accepted. 0007 and 0008 were promoted on 2026-05-26 after grill
confirmation; 0009 was accepted 2026-05-27 after the Bases ecosystem + extension-API research
(see `bases-interop-findings` and `obsidian-extension-api-findings`). See the decision-ledger.
