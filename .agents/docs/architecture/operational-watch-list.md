---
title: Operational Watch List — cross-cutting invariants & risks
type: architecture
status: active
parent: "[[docs/work/hardening/index|hardening]]"
created: 2026-05-27T00:00:00
updated: 2026-05-27T00:00:00
created_by: claude-opus-4-7
updated_by: claude-opus-4-7
tags:
  - agent/architecture
  - agent/navigation
  - agent/invariants
---
# Operational Watch List

Things every design pass must respect: sync · mobile · API churn · release · security · fragility · performance · architecture locks · docs discipline · memory surfaces. Standing reminder so we stop re-deriving the panorama every session. Companion to [[docs/architecture/zoom-out-map|zoom-out-map]] (subsystems), [[docs/architecture/research-inventory|research-inventory]] (research backlog), and [[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/open-inventory|open-inventory]] (decisions).

## 1. Obsidian Sync / persistence boundary

- `.obsidian/plugins/<id>/` (incl. `data.json` and any subfolders/files) **IS synced** by Obsidian Sync.
  Anything under it = synced by default.
- IndexedDB (Electron renderer) is **per-origin, per-device, NEVER synced** — the natural home for device-local caches.
- Electron `userData` (true device-local outside the vault) = mobile-incompatible + sandboxing/plugin-review risk; verify before relying.
- `data.json` is ONE file → any write resyncs the whole file. High-cardinality / binary / hot-write data inside it = **sync churn + bloat**. Reserve for small portable settings.
- **Sync-boundary LOCKED** (decision-ledger): synced (provider-enablement · property-names · display-size · content-meaningful marks · presets · view-config defaults · filter templates) vs device-local (cache blobs · regenerable indexes · per-device toggles · last-active state).
- Selective sync (per type) + size/file-count limits exist. Plan for: Sync off entirely · Sync disabled per type · Sync paused on one device.
- Multi-device race: concurrent `data.json` writes → last-write-wins via Sync. Avoid concurrent hot writes.
- **Note frontmatter** (per-note YAML) — vault-synced, user-visible, user-editable / deletable.
  Proposed as a storage tier (#6) for **node-attribute cells only** (cell-as-node-display: bg / color / per-container engine / per-note overrides), **never for subsystem-wide configs** (deletion risk).
  Namespace VM keys (`vm:` prefix or nested); schema-validate on read. Pure-frontmatter `.md` requires full YAML parser → load/unload sub-system (reinforces `serviceUnload`).
- **Holistic Storage Architecture grill = decisions S-1..S-7 PENDING in `pending-decisions`** (recon done in `storage-architecture-findings`; dev sending more analysis before answering).

## 2. Mobile + platform gating

- `Platform.isMobile / isIosApp / isAndroidApp / isDesktop` + manifest `isDesktopOnly` + `serviceUnload` revert (LOCKED).
- **Mobile regression OPEN** (publish backlog #2): `isDesktopOnly:false` but `src/` has no `Platform` checks — document the actual break + decide gate vs fix.
- Mobile constraints: tighter RAM/IDB quotas · no Electron `userData` · no Node APIs · iOS sandbox restricts file:// outside the vault.
- Desktop-leaning integrations (hover-editor, Excalidraw, popout, electron-only) MUST be mobile-guarded.
- Debug-mode plugin (Ssentiago) emulates mobile for local testing.

## 3. Obsidian core API churn + version floor

- Current stable `minAppVersion` = **1.12.0** (manifest).
- Bases API documented at **`obsidian.d.ts` 1.10.0+**; young — expect ~1–2 breaking bumps / 12–18mo (e.g. `BaseOption#shouldHide` already changed).
- All fragile integrations behind **PlatformAdapter + Fragility Registry + T.G shape-tests** (ADR 0004).
- Bumping `minAppVersion` = breaking for older-Obsidian users → publish discipline.
- Foreign plugin views = **opaque** (extension-API recon): can't host third-party views; only ForeignEmbed (black-box) OR `registerBasesView` (us into Bases, opt-in add-on per ADR 0009).

## 4. Release / channel discipline

- 5 streams: **goal** (docs) · **proto** (Claude-design, re-translated, never merged) · **canary** = `sandbox` · **beta** = `dev` · **stable** = `main`.
- **Upward-only promotion** (sandbox → dev → main); reject downward merges. Weekly `dev → sandbox` rebase keeps canary fresh.
- Shared `package-lock.json` for main+dev; sandbox/proto may diverge but **lose upgrade rights at backport time**.
- **Branch-protect main + husky manifest-block + green checks all channels** — prevents the prior mis-release (1.1.0 → main as stable).
- Stable repaired: **1.0.1 SHIPPED** from 1.0.0 line (Codex 2026-05-27). Users already on 1.1.0 won't auto-update to 1.0.1 (semver lower) — known tradeoff.
- Pre-release labels OPEN (semver is linearly-ordered + update-detection gotcha; ADR 0006 reconcile pending).
- `release-please` bare tags (`include-v-in-tag:false`); `release.yml` triggers on `X.Y.Z`, publishes `main.js` + `manifest.json` + `styles.css` + artifact attestations.
- `manifest.json` immutable on `main` until release; husky hook blocks direct edits.

## 5. Security + supply chain

- OpenSSF Scorecard kept green at high+ (publish 1.0.1 fixed flagged patterns).
- CodeQL + Dependabot on default branch.
- Artifact attestations (`actions/attest`) cover `main.js` / `manifest.json` / `styles.css`.
- AI-file guard on `main` (no `AGENTS.md` / `CLAUDE.md` / `.agents/` / `.claude/` in PRs to main).
- Node.js 20 pinned-action deprecation warning — schedule maintenance bump.

## 6. Foreign-plugin / monkey-patch fragility

- Targets, all behind PlatformAdapters: hover-editor `WorkspaceLeaf` patch · popout / floating-tile · Excalidraw export · iconize-absorb · menu-intercept · native-ribbon-relocate · `registerBasesView` add-on (ADR 0009).
- Each adapter: probe + fallback + `serviceUnload` revert. Failed probe = graceful auto-disable.
- T.G shape-tests gate Obsidian-version bumps.
- **Monkey-patch invariant** (from R-DND-A 2026-05-27): always wrap prototypes via `monkey-around` (returns an `unpatch` for revert) and **load patches in `onLayoutReady()`** (NOT `onload`) so they do not race Obsidian's internal init. Keep each adapter's patch surface minimal + named.
- **Floating-tile / hover-editor template**: popover w/ `.popover-titlebar` drag handle + edge resize zones via `interact.js`. Use for `HoverFloatAdapter` + `ForeignEmbedAdapter`.
- **Foreign-drop adapters**: editor drops via `registerEditorExtension(EditorView.domEventHandlers({ drop, dragover }))` + `view.posAtCoords()` + `view.dispatch()` (CodeMirror 6). Workspace leaf-drops via the public `Workspace.onDragLeaf` / `getDropLocation` / `recursiveGetTarget` API.

## 7. Performance / virtualization

- TanStack-virtual = default. virtua = prototype-behind-harness only.
- 0-A.S stress: 50k Tree/List/Table Files passed (zero blank frames) but event-loop delay uneven (pre-jank-fix maxDelay: Tree 108 / List 258 / Table 1312 / Grid 600 / Cards 24 ms). Grid expand-all at 50k hung > 90s → collapsed-topology default. 100k blocked by Obsidian CLI / index readiness.
- Variable scroll repair done; live-smoke zero blank frames; scroll-idle Table/Grid defer measurements 96 ms after scroll.
- **Render-runtime is SHARED across engines** (ADR 0008) — never per-engine reimplementation.
- **scenesManager / redesign_mode thumbnail invariant** (ADR 0011, 2026-06-03): scenesManager renders surfaces+scenes as Figma-style primitives with `cell_media` thumbnails; LayoutBuilder / redesign_mode edits them live. DECOUPLE the live-edit loop from thumbnail regeneration — thumbnails are **on-demand / lazy** (only when scenesManager is visible + thumbnail in viewport), **debounced**, and **cached** (device-local, regenerable). Never regenerate per redesign frame; must not regress the zero-blank-frame guarantee.

## 8. Architecture invariants (do NOT relitigate)

- ADRs 0001–0009 Accepted: 8-dim model · View=pure-renderer · Cell+view-config Bases-aligned · PlatformAdapter+Fragility · ActionNode unification · Channel split · Page=editor-group · 2-layer render ownership · Bases interop hybrid.
- Panel-scoped controllers · WorkspaceMediator stateless · InteractionPolicy stateless · Selection/Dnd scope-generic axons · InputRouter per panel · Unified mutation pipeline.
- FilterGroup = predicate tree (≠ serviceGroup) · predicate leaf = generic Cell · Scene-family (`filter/queue/sort/view`) · 1:1/2:1 parity · island-look = polish preset only.

## 9. Docs + process discipline

- **ARCHIVE FIRST** before removing current-doc content (`archive-active-doc.mjs` + link).
- Decision changes → row in `decision-changelog`, never silent overwrite.
- `created_by` / `updated_by` = agent-model.
- Line-limits tiered: ≤200 clean · 201–300 soft-WARN dev-decides · >300 hard (shard).
- `status.md` / `handoff.md` = navigational indexes; detail in initiative source records.
- **No per-sub-system specs until dev greenlights.**
- Research subagents = **read-only (Explore)**; general-purpose write = the 706-file-deletion risk.

## 10. Memory routing surfaces

- [[docs/architecture/zoom-out-map|zoom-out-map]] — subsystem registry + buildable-now.
- [[docs/architecture/research-inventory|research-inventory]] — research backlog (done · in progress · pending).
- [[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/open-inventory|open-inventory]] — consolidated decision state.
- [[docs/work/hardening/research/2026-05-25-architecture-foundation-discovery/decision-changelog|decision-changelog]] — audit trail of supersessions.
- This doc — operational invariants / watch list.
- [[docs/work/pkm-ai/items/2026-05-27-agent-memory-routing-upgrade|memory-routing upgrade item]] — the standing meta-fix.

## Status

Created 2026-05-27 at dev request ("panorama de cosas de las que hay que estar atentos"). Update as new invariants land. Candidate for the `vm-zoom-out` skill to regenerate.
