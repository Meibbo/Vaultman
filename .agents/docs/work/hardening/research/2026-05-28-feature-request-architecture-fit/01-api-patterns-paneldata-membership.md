---
title: Feature Intake Continuation — API Patterns And Repeated Membership
type: research-shard
status: active
parent: "[[docs/work/hardening/research/2026-05-28-feature-request-architecture-fit/index|feature-request architecture fit]]"
created: 2026-05-28T22:06:00
updated: 2026-05-29T23:58:00
created_by: codex-gpt-5
updated_by: codex-gpt-5
tags:
  - agent/research
  - initiative/hardening
  - explorer/architecture
  - agent/feature-intake
---

# API Patterns And Repeated Membership

Continuation from the dev's 2026-05-28 follow-up. This shard captures external provider/engine patterns,
fetched storage, external actions, node-notes, and the first repeated-membership model. Later continuation
shards carry the 2026-05-29 identity cases and `panelData` / primitive-adapter discussion.

## Recommended Pattern Stack

- **Ports and adapters / hexagonal architecture**: Vaultman core exposes ports (`ProviderPort`,
  `IndexPort`, `EngineRendererPort`, `ActionPort`, `StoragePolicyPort`). External plugins adapt their
  APIs into those ports. This preserves ADR 0002/0008 and prevents external code from reaching into
  core internals.
- **Registry + capability descriptors**: providers, indexes, actions, renderers, primitives, and Scene
  templates register metadata: ids, capabilities, auth requirements, storage policy, mobile support,
  offline behavior, and unload/revert hooks.
- **Strategy pattern**: engines/renderers, grouping policies, label resolvers, search backends, and
  action handlers are interchangeable strategies selected by config/preset.
- **Command pattern**: `ActionNode` is the command descriptor; execution becomes `OperationNode` when it
  mutates local vault state or external service state.
- **Repository/cache-aside**: external fetched data is read through provider repositories; regenerated
  indexes/caches live outside synced settings unless explicitly materialized into user-owned notes/files.
- **Declarative Scene graph**: pre-mounted Scenes are data: panels + primitives + bars + placement policy.
  External plugins can propose templates, but Vaultman resolves them through capability profiles and
  presets.

## External Data Storage Model

Remote provider data should split by durability and privacy:

| Data class | Example | Default storage | Notes |
|---|---|---|---|
| Provider enablement/config | provider on/off, selected playlists | `data.json` small synced settings | no high-cardinality fetched items |
| Credentials/tokens | YouTube/Spotify OAuth refresh token | device-local only; secure storage research required | do NOT store synced in vault by default |
| Regenerable fetched item cache | video/song metadata, thumbnails, etags | IndexedDB + TTL/LRU | device-local; rebuildable |
| Portable full assets | downloaded cover/thumb/full media if user wants portability | vault sidecar, opt-in | sync-cost warning + cache controls |
| User materialized node-notes | a note made from a video/song | vault markdown note | user-owned and synced |
| Indexes/search vectors | provider search index, relationship graph | IndexedDB by default | regenerable; maybe export/import later |
| Scene/provider presets | grouping/view-config for a provider Scene | `.vmscene` / data.json depending scope | follows Storage ADR 0010 once locked |

Remote providers need explicit capability declarations: auth scopes, rate limits, offline behavior,
cache invalidation, side-effect actions, and privacy mode.

## External Actions And Node-Notes

An external provider can offer special actions if they register as `ActionNode`s:

- local-only action: create node-note from video/song; add to queue; write markdown/frontmatter.
- remote action: like video, add to playlist, mark watched, save track, unfollow, etc.
- hybrid action: create note + attach remote URL + mark remote item saved.

Remote actions should still flow through the mutation pipeline as `RemoteOperationNode` or an
OperationNode variant: preview when possible, execute with auth scope, track success/failure/retry,
and expose offline/undo limitations honestly. Some remote APIs cannot undo; the Operation preview must
state that.

External providers can also propose a Scene template:

```text
YouTube Watch Later Scene
  panelExplorer: videos grouped by playlist/channel/status
  panelData: watch-time stats / channel distribution
  primitives: refresh, like, add-to-note, open-in-browser, cache-quality selector
  bars: provider auth/account status + sync/errors
```

Vaultman still owns placement resolution, mobile fallback, and serviceUnload/unregister behavior.

## Repeated Node Membership

Repeated nodes are a core internal problem, not only an external API problem.

Need a distinction:

- **Node identity**: the actual entity (`SnippetNode:abc`, `VideoNode:yt123`, `FileNode:path.md`).
- **Node occurrence / placement**: an entity appearing under a specific parent/container/context.
- **Membership**: why the occurrence exists (`snippet belongs to a user-named manual
  ContainerNode`, `song is in playlist X`, `file matches FilterGroup Y`).

Example: user-named manual ContainerNodes for snippets. The user may call them anything; `pack` is not
a canonical kind.

```text
User-named ContainerNode A
  occurrence -> SnippetNode:callout-red

User-named ContainerNode B
  occurrence -> SnippetNode:callout-red
```

The snippet is one identity with two occurrences. Selection, DnD, delete, rename, and action semantics
must choose whether they target the identity or the membership:

- remove from the manual ContainerNode = delete membership only.
- delete snippet = delete identity and all occurrences.
- move to another manual ContainerNode = update membership.
- duplicate snippet = create a new identity.

This likely belongs in Node/Logic before public provider API stabilizes.

## Continuation Shards

- [[docs/work/hardening/research/2026-05-28-feature-request-architecture-fit/02-identity-occurrence-membership-cases|Identity, occurrence, and membership cases]] captures the physical-copy vs virtual-membership case, same-label identity collisions, and the locked S-26 rationale.
- [[docs/work/hardening/research/2026-05-28-feature-request-architecture-fit/03-paneldata-primitives-presets|PanelData, primitive adapters, and presets]] captures `panelData`, DataViz/Charts, UI primitive adapter, toolbar preset, and widget-layout follow-ups.

## Status

Captured as feature-intake continuation. No spec or implementation greenlight.
