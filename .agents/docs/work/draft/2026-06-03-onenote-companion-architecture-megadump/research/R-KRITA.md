---
title: R-KRITA — license + layer/canvas model
type: research-record
status: active
parent: "[[docs/work/draft/2026-06-03-onenote-companion-architecture-megadump/research/index|megadump research]]"
created: 2026-06-03T10:33:47
updated: 2026-06-03T10:33:47
created_by: claude-opus-4-8
updated_by: claude-opus-4-8
tags:
  - agent/work
  - agent/research
  - initiative/draft
---

# R-KRITA — license + reference model

Feeds MD-D3 (document/layout content layers) + canvas pan/zoom/rotate (MD-D2, L2.4).

## License = GPL v3

Source: https://krita.org/en/about/license/. Krita is open source under **GNU GPLv3**.

Implications:
- **Referencing concepts / UX / patterns**: free, no restriction (GPL governs code distribution, not
  inspiration). Applies whether the VM plugin is open or closed source.
- **Porting/borrowing Krita CODE**: triggers GPLv3 copyleft → the distributed plugin would have to be
  GPLv3. Krita's extension API is GPL too; linking inherits obligations.
- **Bottom line**: borrow the **model** ✓, copy the **code** ✗ (unless we accept GPLv3 on Vaultman).

## Layer / canvas model (reference for our layers + canvas)

Sources: docs.krita.org user_manual (layers_and_masks, basic_concepts).

Model/view split (the key takeaway):
- **Image** = root container: layer data + color space + dimensions + metadata (the model).
- **View** = non-destructive viewport: independent zoom / rotation / mirror / color-adjust; multiple
  views per image (the render state — maps cleanly to our "scene is data, view is non-destructive render";
  cf. ADR 0008 render-ownership two-layer).
- **Window** = app container hosting views + dockers.

Layer system:
- Stack compositing bottom→top. **Group layers** composite children then fold into parent ("pass-through"
  mode = behave as ungrouped). Layer types: paint(raster), vector, filter, adjustment, mask, file.
- Non-destructive: **filter masks** (effects w/o altering pixels), **transform masks** (deform/rotate/scale),
  alpha/clipping, transparency masks. Masks/transforms are auxiliary node types, not layer props.
- **Canvas** = saved rectangular surface; layer data may extend beyond bounds. Transform tool =
  rotate / resize / perspective / warp / cage / liquify. Workspaces = saved docked-panel layouts.

## Applicability

The Image(model) ↔ View(non-destructive viewport) separation is the strongest reference for a VM
"layout content layers" + workspace-as-canvas (pan/zoom/rotate). Layer-as-tree with mask/transform
nodes is a reference for node geometry (MD-B1) without copying any code.

## Sources

- https://krita.org/en/about/license/
- https://docs.krita.org/en/user_manual/layers_and_masks.html
- https://docs.krita.org/en/user_manual/getting_started/basic_concepts.html
