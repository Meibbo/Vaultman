---
title: Storage Architecture Findings (IDB + media-cache + Obsidian Sync compat)
type: research-shard
status: active
parent: "[[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/index|Architecture Foundation Discovery]]"
created: 2026-05-27T00:00:00
updated: 2026-05-27T00:00:00
created_by: claude-opus-4-7
updated_by: claude-opus-4-7
tags:
  - agent/research
  - initiative/hardening
  - explorer/storage
  - explorer/sync
---

# Storage Architecture Findings

Recon for the holistic Storage Architecture grill (waits-on resolved 2026-05-27). Grounds the
cross-cutting storage decision spanning `serviceMark`, `servicePropertyIndex` + other indexes,
media-cache, explorer pipeline transient state, settings/presets/filter templates. Read-only agent +
official docs + plugin source surveys. Feeds the next ADR (storage tiering candidate).

## 1. IndexedDB in Obsidian's plugin renderer (Electron)

- **Available** in the Electron renderer (per-vault per-device origin scoping). Reference impl:
  `Fevol/obsidian-database-library` (localforage-backed wrapper).
- Desktop quota ≈ 1/3 free disk; reporting is inconsistent across Electron versions (electron/electron#16029).
- Mobile IDB available but **write performance is poor on large vaults**
  (forum: "IndexedDB transactions not flushed to disk" → unpractical load times).
- **Confirmed NOT synced** by Obsidian Sync — IDB is per-origin, per-device only.
- Constraint: JSON-serializable-only values; no functions/complex objects; no exposed quota-management API.
- Known perf issue: "excessive IndexedDB access" can cause 100% CPU on large vaults (forum #62180).

## 2. Media-cache patterns in the ecosystem

| Plugin | Where stored | Eviction | Quality tiers |
|---|---|---|---|
| Attachments Cache (`luisbs/obsidian-attachments-cache`) | vault subfolder (per-path rules) | manual | single |
| Come Down (`mntno/obsidian-come-down`) | `.obsidian/plugins/<id>/cache/` subfolder | manual | single |
| Image Toolkit | in-memory only | session-end | n/a |
| Media Sync | vault-synced sidecar folder | manual | single |

Patterns observed:
- **No LRU/TTL** evictions found across community plugins — all manual or session-based.
- **Vault-FS sidecar dominates** (`vault/.attachments-cache/`, `.obsidian/plugins/<id>/cache/`).
- `data.json` typically holds only the index / metadata; binaries go to subfolders.
- **Quality tiers (thumb vs full) absent** across analyzed plugins — innovation opportunity for us.

## 3. User-facing cache controls

- Few plugins expose cache-size limits or clear-cache UIs (manual filesystem cleanup is common).
- Attachments Cache exposes per-path storage rules + a manual "delete cache folder" workflow.
- Gap = an opportunity: a real cache-controls UI (size cap · quality selection · LRU/TTL · clear-cache).

## 4. Obsidian Sync compatibility — critical

- `.obsidian/` syncs by default. All plugin subfolders + `data.json` under
  `.obsidian/plugins/<id>/` are synced. **No mechanism to opt SPECIFIC files/subfolders out of Sync
  on a per-plugin basis** — Sync is all-or-nothing for `.obsidian`.
- Dotted subfolders (e.g. `.obsidian/plugins/<id>/.cache/`) → hidden from listing but **still synced**.
- File-size cap: **200 MB** (raised from 100 MB Jan 2024 plans).
- File-count: no documented hard cap; sync overhead degrades on >10k-file vaults.
- `data.json` conflict resolution: "last-modified wins" for non-Markdown; JSON files reportedly get
  "key-merging" (local keys overwrite remote) — but the merge behavior is **not formally specified**
  and may vary per Obsidian version.
- Race condition: simultaneous writes on different devices → timestamp determines winner; e.g.
  iconize plugin issue (#565) reports mobile data.json overwriting desktop.
- `data.json` modification date is bumped on every Obsidian launch even when content is unchanged →
  produces false sync conflicts.
- IDB confirmed **never synced**; per-device only.
- 3rd-party sync (Git, Syncthing) on `.obsidian/`: forum reports of plugin settings being deleted
  cross-device due to conflict handling.
- User scenarios to plan for: no Obsidian Sync · Sync paused on one device · Sync disabled per content
  type (cannot exclude `.obsidian/` selectively) · 3rd-party sync · mobile Sync (iOS sandbox + tighter
  IDB quota).
## 5. Vault-FS sidecars

- `.obsidian/plugins/<id>/<subfolder>/` for binary/large data is **synced by default**.
- "Out of vault" sync (e.g. user-configured Syncthing on a non-vault folder) is a viable user
  workaround for large media if they don't want to use Obsidian Sync for it — but it's user
  configuration, not something our plugin can require.

## 6. Electron `userData` (true device-local outside the vault)

- **Cannot reliably access** from the plugin renderer (sandboxed).
- Possible via `require('electron').app.getPath('userData')` if the plugin is `isDesktopOnly` — but
  this triggers plugin-review flags and Obsidian discourages circumventing vault-based storage.
- Not available on mobile.
- **Not recommended** for normal use.

## 7. Mobile constraints

- IDB available, write perf poor at scale.
- Node.js / Electron APIs unavailable (plugin crashes on access).
- iOS sandbox restricts file:// outside the vault.
- Quotas tighter; exact mobile IDB limits not published.
- Implication: mobile cache strategy must be smaller + more aggressive eviction; IDB-backed thumb
  cache + on-demand fetch is safer than large vault-FS sidecars.

## 8. Storage tier recommendation per subsystem — PROPOSED

| Subsystem | Tier | Rationale | Sync implication |
|---|---|---|---|
| `serviceMark` (durable per-node annotations: size-marks, manual order) | **Synced `data.json`** | small JSON; user-intent should roam; LWW acceptable | ✅ full Sync |
| `servicePropertyIndex` + other indexes (regenerable from vault) | **Device-local IDB** | regenerable; faster than reconstruction; avoids cross-device conflicts | ❌ no Sync (per-device) |
| media-cache (image/video thumbnails, icons) | **Hybrid**: compressed thumbnails in IDB (device-local, fast) + full assets in a vault-FS sidecar (`.obsidian/plugins/vaultman/cache/` — synced) OR user-opt-in "no-sync" subfolder convention | binary blobs in `.obsidian/` bloat Sync; user choice: portable-but-bloated vs lean-but-per-device | ⚠ partial — metadata index synced, thumbs per-device, full assets follow user choice |
| explorer pipeline transient (snapshot · render-projection) | **In-memory + optional session IDB** for crash recovery | not durable; rebuild on load | ❌ no Sync |
| settings + presets + filter templates | **Synced `data.json`** with schema-versioned **deep-merge** (NOT raw LWW) | user config must roam; mitigate Obsidian's LWW with our own merge logic at the schema layer | ✅ full Sync |
| **node-attribute cells** (cell-as-node-display: media-as-bg · color · per-container engine choice · per-note overrides) — added by dev 2026-05-27 | **Note frontmatter** (per-note YAML, vault-synced, user-visible) | per-note data lives with the note → portable + Bases-aligned (`note.X` namespace, ADR 0003) + Dataview-readable. Risk: user edit/delete + schema drift. Mitigations: namespace VM keys (`vm:` prefix), schema-validate on read, **NEVER subsystem-wide configs in frontmatter** | ✅ travels with the note via vault sync |

## 9. Honest gaps (flag for the grill)

- `saveData()` conflict resolution beyond "last-modified wins" not formally documented; key-merge
  behavior version-variable.
- IDB quota enforcement: not observably enforced by Electron in practice; need our own eviction.
- Quality-tier media-cache: no existing reference implementation → ours to design.
- No documented per-folder Sync opt-out → no clean "device-local vault-FS sidecar" path.
- Mobile IDB exact limits not published; treat as small-and-fragile.
- Plugin-renderer `userData` access reliability unconfirmed; treat as off-limits.

## 10. Implications + open decisions for the grill

- **`data.json` hot-write hygiene**: the mod-date-on-launch quirk + LWW + the "one file resyncs whole"
  rule together mean `data.json` should hold ONLY small, low-churn, content-meaningful state. Heavy or
  hot writes must go elsewhere.
- **Quality-tier + LRU/TTL cache**: a real innovation; we should ship it.
- **Deep-merge our settings** at the schema layer (key-by-key, schema-aware) instead of trusting
  Obsidian's raw LWW. Mitigates the mobile-overwrites-desktop class of bugs.
- **Mobile tier**: smaller cache, aggressive eviction, no large vault-FS sidecars on mobile.
- **Sync opt-out for media** is a USER choice (Obsidian Sync vs Syncthing/Git for a separate folder);
  we can document the pattern but cannot enforce per-folder exclusion ourselves.

**Grill decisions to take** (after the dev reads this):
1. Confirm or revise the per-subsystem tier table.
2. Pick the media-cache strategy: (a) IDB-only thumbs + on-demand fetch; (b) hybrid IDB thumbs + vault
   sidecar full; (c) vault sidecar everything + user opt-in for no-sync; (d) something else.
3. Approve our own schema-aware deep-merge for settings; size and shape.
4. Cache controls UX: size cap · quality tier · clear-cache UI.
5. Whether to write an ADR 0010 (storage tiering) once decided.

The five grill decisions above are parked durably for cross-agent visibility in
[[docs/architecture/pending-decisions|pending-decisions]] (S-1 through S-5; new S-6/S-7/R-1 listed too).

## 11. New input 2026-05-27 — note-frontmatter as a tier · scene file formats · dataview/datacore

Dev raised three threads after this recon. All three are tracked in `pending-decisions` (S-6, S-7, R-1).

### 11.1 Note-frontmatter as a storage tier (now tier #6 in §8)

YAML frontmatter (and pure-frontmatter `.md` files) is a candidate storage for **node-level variables
only** — cells whose values ALTER the node's display (cell-as-node-attribute): media-cell → node
background, color-cell → node color, per-container engine choice for the parent's children, per-note
overrides of view-config defaults. This is a clean **extension of ADR 0003 semantic roles** — the Cell
`semantic role` enum gains "node-style modifiers" (bg / color / style / per-container-engine-choice)
alongside existing roles (title / subtitle / meta / media / cover / badge / …). The Value's `renderTo`
(from the Bases dev API research) is the natural execution layer: a frontmatter value with role
`bg-image` resolves into a CSS-modifying render.

Strict scope: **node-level only, never subsystem-wide configs** — the user can delete a note + its
frontmatter; subsystem configs orphaned in one note would corrupt the plugin. Mitigations:
- Namespace VM keys inside frontmatter (`vm:` prefix or a nested `vaultman:` object) to avoid collisions
  with user keys + Bases / Dataview consumers.
- Schema-validate on read; warn-but-don't-crash on shape drift.
- For pure-frontmatter `.md` files: requires full YAML parsing (arrays + nested properties) — implies a
  load/unload-toggleable sub-system (reinforces `serviceUnload` importance, locked in
  `decision-ledger`).
- **Per-setting "storage-selector"** (advanced power-user override: user picks where each data class
  goes, we provide defaults) = post-MVP, not v1.

Cross-references: ADR 0003 (Cell + view-config Bases-aligned) · ADR 0008 (decoration descriptors flow
through projection) · `obsidian-extension-api-findings` (`Value.renderTo`) · parking-lot
`serviceUnload`.

### 11.2 Our own scene file formats

`.base` (Bases YAML) and `.canvas` (Canvas JSON) cannot be safely altered (Bases refuses to render an
altered `.base`). Recommendation: own format. Proposed shape:

- Single polymorphic extension **`.vmscene`** with top-level
  `{type: filter | queue | sort | view | composite, name, version, payload}`.
- YAML (for consistency with Bases + note frontmatter; less ambiguous than JSON for user editing).
- `registerExtensions(['vmscene'], 'vaultman-scene')` (per extension-API recon) so opening a
  `.vmscene` file mounts our renderer.
- Bidirectional bridges to `.base` / `.canvas` / `.json` / dataview-codeblock / datacore-codeblock
  (the last two depend on R-1).
- Pairs with the ADR 0009 hybrid — own native format AND import/export to ecosystem formats.

Parked as decision S-7 in `pending-decisions`.

### 11.3 Dataview / Datacore interop research (pending)

Need a read-only recon of the Dataview + Datacore query languages, codeblock syntaxes, value models, JS
APIs, and common plugin import/export patterns. Feeds the scene-file-format bridges (S-7) and the
broader interop story. Added to `research-inventory` as **R-1**, LATER tier.

## Sources

- `Fevol/obsidian-database-library` · `luisbs/obsidian-attachments-cache` · `mntno/obsidian-come-down` ·
  obsidian-iconize #565 · forum threads on Sync conflict + IDB perf + 200 MB plan + mobile IDB ·
  docs.obsidian.md mobile-dev + sync settings.
