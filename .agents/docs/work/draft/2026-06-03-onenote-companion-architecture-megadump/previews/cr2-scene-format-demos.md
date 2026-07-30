---
title: CR-2 scene-format demos + data-vs-code viewpoint
type: preview
status: active
parent: "[[docs/work/draft/2026-06-03-onenote-companion-architecture-megadump/index|onenote companion megadump]]"
created: 2026-06-03T10:33:47
updated: 2026-06-03T10:33:47
created_by: claude-opus-4-8
updated_by: claude-opus-4-8
tags:
  - agent/work
  - agent/preview
  - initiative/draft
---

# CR-2 — Scene Format Demos

Concrete sketches so the dev can FEEL each container option, plus the data-vs-code distinction that reframes the choice. Per S-8 preview-prototype mechanic. NOTHING here is built — illustrative only.

## The reframe: two different artifacts

| | Scene = DATA (`.vmscene`) | Module / App = CODE |
|---|---|---|
| what | declarative description of a composed surface | executable logic using VM's API |
| execution | none (VM renders it) | runs (JS/TS) |
| security | safe like `.base` — share freely | reviewed plugin / trusted script |
| look | from active preset (chameleon) | can call UCV primitives programmatically |
| governed by | **CR-2 (this)** | ADR 0011 detachable-module / S-15-16 public API / script-runner |
| analogy | a `.base` / `.canvas` file | a Svelte component / an Obsidian plugin |

The "scene ≈ compressed plugin / svelte / mhtml" instinct = the CODE column (those self-execute).
"No inline script, shareable like `.base`" = the DATA column. Self-executing ⟹ needs review ⟹ not freely shareable → they cannot be the same artifact. Keep them separate.

## Demo 1 — Layered YAML-first `.vmscene` (REC: DATA)

```yaml
# youtube-playlist.vmscene   (lives in the VAULT → synced + shareable + portable)
vmscene: 1
type: composite
name: My YouTube Playlist
preset-hint: polish          # look still resolved by ACTIVE preset; hint only
panels:
  - kind: panelExplorer
    provider: { id: vm-online_fetch, source: youtube, listId: "PL123" }   # needs online-fetch module enabled
    engine: grid
    view-config:
      cells:
        - { role: media,  source: thumbnail }    # UCV resolves: native=<img>, polish=card component
        - { role: title,  source: title }
        - { role: action, action: open-url }      # action-cell → ActionNode
primitives:
  - { kind: action-cell, label: "Refresh", action: vm.refetch }
presentation:                 # OPTIONAL declarative override (DATA, never executed) — polish only
  css-vars: { --vm-card-radius: 12px }
notes:                        # embedded markdown, multi-note, each own frontmatter
  - frontmatter: { title: "About this scene" }
    body: |
      # Playlist
      Bundled doc, like plugin documentation.
```

A "button" = `{ kind: action-cell, action: … }`. VM emits a NATIVE primitive (native preset) or a UCV component (polish). The file never writes `<button>` → chameleon-safe.

## Demo 2 — HTML-first `.scene` (svelte-like: shows the costs)

```html
<!-- playlist.scene -->
<script src="vm://modules/online-fetch"></script>   <!-- "import only" — still an execution surface -->
<vm-scene preset="polish">
  <vm-grid provider="youtube:PL123">
    <vm-cell role="media" src="thumbnail"/>
    <button data-action="open-url">Open</button>     <!-- look BAKED here → fights chameleon -->
  </vm-grid>
  <style>:root{ --vm-card-radius:12px }</style>
</vm-scene>
```

Costs: (1) look baked in file → breaks native↔polish chameleon swap. (2) `<script src>` = execution surface → Obsidian review needed → loses "share like `.base`". (3) "svelte without precompiler" ⟹ VM must ship a runtime interpreter for this DSL = big, fragile, security-heavy. (4) bridging to `.base`/`.canvas` becomes lossy/hard.

## Demo 3 — VM code-module (the "compressed plugin" you actually described)

```ts
// my-cool-view.vmmodule.ts  — CODE; uses VM as runtime (ADR 0011 module-contract / public API S-15-16)
import { vm } from "vaultman/api";
export default vm.defineModule({
  id: "my-cool-view",
  onLoad(ctx) {
    const scene = ctx.scenes.create({ name: "Cool View" });
    scene.addPrimitive(vm.ui.button({ label: "Hi", onClick: () => vm.commands.run("vm:refetch") }));
    // focus on LOGIC; call VM primitives + UCV vars via the API
  },
});
```

THIS is "write logic, use VM primitives via API, create scenes with buttons." It is a module/plugin (reviewed/trusted), NOT a config file — and it can EMIT a `.vmscene` (data) as its output.

## Demo 4 — Pure YAML (strict S-7), for contrast

```yaml
vmscene: 1
type: filter
name: Untagged notes
payload: { where: { tag: { empty: true } } }
```

Minimal, maximally portable/bridgeable; cannot carry embedded notes or presentation in one file.

## Where these live (Sync) — already LOCKED

- `.vmscene` files live in the **vault** → synced by Obsidian Sync + shareable + portable. Distinct from `data.json` (internal plugin settings; ONE file → churn risk → keep small) (watch-list §1).
- Sync-boundary LOCKED: presets / view-config-defaults / filter-templates / content-marks = SYNCED;
  caches / regenerable indexes / per-device toggles = device-local.
- Per-subsystem storage tier table = **S-1..S-7 PENDING** (Storage grill).

## serviceMark vs SPS (memory check)

- **serviceMark (current model)** = durable PER-NODE annotations (size-marks, manual order); view-state;
  synced in `data.json`; NOT BUILT YET (god-object). The dev's "serviceMarks = save/checkpoint manager" = the OLD archived ghost `serviceMarks.ts` (Templates module, never shipped). Don't reuse the name.
- **Saving configs/patterns** = "savable as **preset/template**" + export to `.base`/`.vmscene`/yaml/json.
- **SPS (Saving Presets System)** = dump term, NOT specced. Working def: captures/switches presets (style/layout/load/workspace) + checkpoints + queued-op batches. Overlaps Workspace-profile (OPEN) + preset-taxonomy parking-lot. → **needs its own grill**; `.vmscene` is the file a saved preset serializes to.
