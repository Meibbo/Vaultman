---
title: Feature Intake Continuation — Identity, Occurrence, Membership Cases
type: research-shard
status: active
parent: "[[docs/work/hardening/research/2026-05-28-feature-request-architecture-fit/index|feature-request architecture fit]]"
created: 2026-05-29T23:58:00
updated: 2026-05-29T23:58:00
created_by: codex-gpt-5
updated_by: codex-gpt-5
tags:
  - agent/research
  - initiative/hardening
  - explorer/architecture
  - agent/feature-intake
---

# Identity, Occurrence, Membership Cases

Continuation from the 2026-05-29 grill. This shard preserves the concrete cases that locked S-26.

## Physical Copies vs Virtual Membership (2026-05-29 Case)

Dev scenario:

```text
a/hola.md
b/hola.md        # physically copied file; same name/content does not imply same identity
a/chao.md
b/              # virtually contains chao.md by membership, not by filesystem path
```

The model needs three separate concepts:

| Concept | Example | Meaning |
|---|---|---|
| **Entity identity** | `FileNode:path=a/chao.md` | The real thing an operation can mutate. For files, path/TFile identity is physical. |
| **Occurrence / placement** | `a/chao.md shown under virtual parent b` | A rendered placement of an entity inside a projection/context. |
| **Membership** | `b includes a/chao.md as virtual child` | The relation explaining why the occurrence appears under `b`. |

Physical duplicates are NOT the same node by default:

- `a/hola.md` and `b/hola.md` are two `FileNode` identities because the vault has two files.
- They may be related by a duplicate/similarity detector later, but filesystem operations target each path independently.
- "Delete `b/hola.md`" deletes only that physical file. "Rename duplicate cluster" would be a separate multi-target operation.

Virtual membership is different:

- `a/chao.md` remains one physical `FileNode` identity.
- `b -> a/chao.md` is a membership. `b` may be a physical folder node acting as a virtual parent in this projection, or a synthetic/manual `ContainerNode`. The occurrence under `b` is not a file copy.
- "Remove from b" deletes the membership only.
- "Move to b physically" changes the file path from `a/chao.md` to `b/chao.md` and should also reconcile or remove the old virtual membership.
- "Copy to b physically" creates a new `FileNode:path=b/chao.md`; it is no longer just membership.

`Parent node` is a role; `ContainerNode` is a kind:

- A **parent node** is any node that has children in the current projection. A folder `FileNode`, a `TagNode`, a `PropNode`, a `ContainerNode`, or a playlist node can all act as parents.
- A **ContainerNode** is a synthetic NodeKind whose main purpose is grouping/containment. Examples:
  user-named manual container, serviceGroup group-by bucket, FilterGroup group, playlist, dashboard section.
- Therefore: every ContainerNode is usually a parent, but not every parent is a ContainerNode. A physical folder is a real FileNode parent. A tag/prop/adopted header can also be a parent in an adopted-node projection without becoming a ContainerNode.

Metadata providers already imply this:

- One file may appear under multiple tag nodes because `file --hasTag--> tag` memberships exist.
- One file may appear under multiple property-value nodes because `file --hasPropValue--> value` memberships exist.
- Previously this was easy to treat as "scope filters" only. Once tags/props are navigable parents with adopted children, the same identity/occurrence/membership problem becomes visible.

Required UX:

- Occurrences need a visible provenance hint: physical parent vs virtual membership vs duplicate copy.
- Context menu verbs must be explicit:
  - remove from virtual parent / manual container / playlist
  - move file here
  - copy file here
  - reveal physical location
  - delete physical file
  - duplicate as real file
- Drag/drop needs modifier-aware semantics:
  - default into virtual parent = add membership
  - explicit move = physical path move
  - explicit copy = physical copy
  - remove from parent = remove membership
- Search/selection should be identity-aware:
  - selecting one occurrence selects that occurrence by default.
  - multi-select can collapse by identity when running identity-level actions.
  - destructive actions must show when N occurrences map to M physical identities.

## Same Display Label, Different Identity (2026-05-29 Case)

Identity MUST NOT be the visible label. It is provider-scoped and kind-scoped:

```text
NodeIdentity = {
  providerId,
  kind,
  canonicalId,   # e.g. full file path, full tag path, prop key/value path, external stable id
  version?       # optional, if provider needs migration/versioning
}
```

The visible label is just a Cell / label resolver output. Multiple distinct identities may render the same label.

### Nested tag example

```text
#project/todo
#party/todo
```

The two visible leaf labels are both `todo`, but the identities are distinct:

```text
TagNode(provider=tags, canonicalId="#project/todo")
TagNode(provider=tags, canonicalId="#party/todo")
```

If tag segments are rendered as parent/child nodes, the parent context is part of the canonical tag path.
`todo` under `project` and `todo` under `party` are not the same node. Each can have its own node-note because node-note keys attach to `NodeIdentity`, not to `label`.

This also applies to prop/value trees:

```text
PropValueNode(provider=props, canonicalId="status:todo")
PropValueNode(provider=props, canonicalId="context:todo")
```

Same label, different provider/kind/canonicalId.

### Same basename files

```text
a/tareas.md
b/tareas.md
```

Both may render as `tareas`, but identities are distinct:

```text
FileNode(provider=files, canonicalId="a/tareas.md")
FileNode(provider=files, canonicalId="b/tareas.md")
```

If both appear inside one manual ContainerNode by user ordering, the ContainerNode has two occurrence rows whose labels collide but identities do not:

```text
ManualContainerNode("Work list")
  occurrence -> FileNode("a/tareas.md"), label "tareas"
  occurrence -> FileNode("b/tareas.md"), label "tareas"
```

The code routes selection, actions, node-note lookup, DnD, and destructive operations by identity / occurrence id, never by display text.

Required UI rule: when sibling visible labels collide, Vaultman should surface a disambiguation cell or affordance by default (path breadcrumb, provider/kind chip, parent path, or canonical id tooltip), even if the user normally hides `path`. Hiding disambiguation is allowed only as a user/preset choice, not as the default for collision contexts.

### Identity vs node-note

Node-notes must key from `NodeIdentity`, not display label:

- `node-note(tags/#project/todo)` is separate from `node-note(tags/#party/todo)`.
- `node-note(files/a/tareas.md)` is separate from `node-note(files/b/tareas.md)`.
- If the user wants a shared note for "all todo-like labels", that is a separate synthetic/group node or query result, not the default identity note.

## Locked Decision — S-26 (2026-05-29)

Dev approved the recommendation. Canon:

- `NodeIdentity` = `{ providerId, kind, canonicalId }`; never the visible label.
- `NodeOccurrence` = a visual appearance of an identity within a parent/projection/context.
- `Membership` = the relation/context that causes an occurrence to appear under a parent.
- Operations declare their target: identity, occurrence, or membership.
- Parent node = role in a projection. `ContainerNode` = synthetic grouping kind.
- Sibling label collisions require a default disambiguation affordance/cell.

S-26 removed from `pending-decisions`; this source record is now the current rationale.
