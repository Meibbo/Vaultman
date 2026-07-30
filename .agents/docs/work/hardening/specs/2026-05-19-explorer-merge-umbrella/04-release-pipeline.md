---
title: Release Pipeline — per-version detail + R.D
type: spec-shard
status: draft
parent: "[[index|umbrella]]"
created: 2026-05-19T00:00:00
updated: 2026-05-19T00:00:00
---

# Release Pipeline v1.2.0 → v2.0.0

Per-version: tema, scope sub-systems, shippable criterion (qué debe cumplirse para release), SemVer rationale, blockers, R.D actions específicas.

`v1.1.0` ya fue usado como release catch-up de main el 2026-05-20. Ese release no pertenece al feature pipeline del umbrella; ver [[docs/work/hardening/plans/2026-05-20-release-1-1-0-catch-up|Release 1.1.0 catch-up]].

## v1.2.0 — Explorer Hardening + sticky-parents

**Tema**: arregla todos los bugs visibles reportados. Foundation para v1.3.0+ refactor.

**Sub-systems incluidos**:
- **A.R** — Action Routing Contract (FIRST DETAIL SPEC)
- **viewTree sticky-parents fix** — adopt proto reference (pages.jsx + HTML sticky CSS)
- **0-A.S** — Adversarial Scroll Harness + tree triple-write fix (sibling, paralelo)
- **T.G** — Test Invariant Gates basis (WDIO + Vitest browser mode + ARIA tree suite)
- **0-A close** — finalize remaining 0-A commits (in-flight desde cd2d8fc…cfc2604)

**Shippable criterion**:
- Caret click funciona en tree (placeholder div en `viewTree.svelte:974-978` resuelto)
- Keyboard nav (Arrows/Home/End/PageUp/Down/Enter/Space/typeahead) funciona en TODOS los views
- Selection contract unified `(id, MouseEvent)` en TODOS los mount-contexts (ViewNodeList sin contract divergente `(row, SelectModifiers)`)
- Expand/collapse all funciona en tree + grid + cualquier view que exponga hasExpansionSurface
- Context menu funciona en TODOS los views con standard 10-item set
- Tree scroll sin blank frames (triple-write race en `viewTree.svelte:420-441` resuelto)
- Sticky parents en filter pages (tags + props) funciona — proto pages.jsx reference
- WAI-ARIA Tree View pattern compliance suite GREEN
- WDIO + wdio-obsidian-service tier configured en CI
- ARIA tree + caret hit-target (WCAG 2.5.8 ≥ 24×24) tests GREEN

**SemVer rationale**: MINOR (1.1.0 → 1.2.0)
- No breaking changes — solo bug fixes + new test infrastructure
- Uses the already-bootstrapped release-please + bare-tag pipeline from 1.1.0 catch-up

**R.D actions**:
- `[Unreleased]` → `[1.2.0]` en CHANGELOG.md (vía release-please release-PR)
- Push `sandbox → origin/sandbox` before release branch/PR as needed
- manifest.json bump (release-please `extra-files` lo sincroniza con package.json)
- versions.json append (`"1.2.0": "<minObsidianVersion>"`)
- Tag `1.2.0` — **NO prefijo `v`**. Obsidian community plugins exigen tag == manifest.json version exacto
- main merge: release-please release-PR como ÚNICO PR que toca main + `dorny/paths-filter` guard que falla si toca `.agents/**`/`CLAUDE.md`/`AGENTS.md`/`.claude/**`
- GitHub Release con notes (auto-draft via release-please)

**Blockers**:
- 0-A close debe completarse (currently in-flight, 12 commits done)
- A.R first detail spec debe escribirse + approved

---

## v1.3.0 — Architecture cleanup

**Tema**: god-objects → shells. Clean foundation para v1.4.0+.

**Sub-systems incluidos**:
- **V.D** — View Decomposition (5 views → ~1050 LoC vs 4377)
- **P.D** — Panel Decomposition (panelExplorer 1329 → orchestrators)
- **N.R** — NodeRow Primitive

**Shippable criterion**:
- viewTree ≤ 250 LoC
- ViewNodeList ≤ 150 LoC
- ViewNodeTable ≤ 200 LoC
- ViewNodeGrid ≤ 250 LoC
- ViewNodeCards ≤ 200 LoC
- panelExplorer ≤ 350 LoC (orchestrators extraídos)
- NodeRow primitive embedded por TODOS los views
- Cada módulo tiene UNA responsabilidad bien definida + dedicated test
- Performance gates: no regression vs v1.2.0 (50K projection, scroll burst, 100K proof)

**SemVer rationale**: MINOR
- Refactor no-breaking si A.R contract preservado
- New primitives son additive

**R.D actions**: standard release flow

**Blockers**:
- A.R contract definido (v1.2.0)
- T.G basis configured (v1.2.0)

---

## v1.4.0 — Keyboard + Public API

**Tema**: workspace-wide keyboard + handshake cross-plugin.

**Sub-systems incluidos**:
- **K.B** — Keyboard + Hotkeys/Macros Provider
- **API** — Vaultman public API `vaultman.v1`

**Shippable criterion**:
- `serviceKeyboardNav.ts` reemplaza implementations inline
- `HotkeysProvider` + `MacrosProvider` registrables
- `app.plugins.getPlugin("vaultman").api` expone `vaultman.v1` namespace
- 6 sub-namespaces accessible: `navigation`, `metadata`, `selection`, `menus`, `events`, `themes`
- Events bus emite: `selection-changed`, `view-mode-changed`, `provider-changed`, etc.
- Types published como `@vaultman/api` package
- Onload detection pattern documentado

**SemVer rationale**: MINOR
- Adds new public API — additive, no breaking

**R.D actions**: standard release flow + publish `@vaultman/api` npm package primera vez

**Blockers**: V.D + P.D landed (v1.3.0)

---

## v1.5.0 — Nautilus rewrites + Adwata icons primer

**Tema**: redesign visual de viewList + viewGrid según proto Nautilus. Adwata SVG icons primitive.

**Sub-systems incluidos**:
- **viewList → Nautilus tiles rewrite**
- **viewGrid → Nautilus icons rewrite** (+ rich rows-only mode toggle)
- **Adwata SVG primitive** (primer batch — full sub-feature en v1.6.0 con Theme Builder)

**Shippable criterion**:
- ViewNodeList renderea como Nautilus tiles (horizontal icon + multi-meta)
- ViewNodeGrid renderea como Nautilus icons (Adwaita SVG + per-folder semantic colors)
- viewGrid rich rows-only mode toggle funcional (decidir en spec si es view variant interna o view mode separado)
- Adwata SVG folder + file primitives (parametric, no Theme Builder UI todavía)
- `detectKind(name)` utility
- Performance gates preserved

**SemVer rationale**: MINOR
- Visual rewrite no-breaking — viewmode names unchanged
- New primitives additive

**R.D actions**: standard

**Blockers**: V.D landed (v1.3.0) — views como shells permite el rewrite sin tocar A.R

---

## v1.6.0 — Theme Builder + Layout extension

**Tema**: Settings UI rediseño + Theme Builder UI + Layout settings completas.

**Sub-systems incluidos**:
- **10** — Theme Builder UI (acceso desde Settings)
- **6** — Layout extension (placeholders rediseñados + drawer modes)
- **5** — Settings UI refresh (recent themes + dashboard3 redef + suggestion rows input)
- **8** — Color governance

**Shippable criterion**:
- Theme Builder UI accessible desde Settings tab
- Recent themes UI (3 + custom slot) funcional
- Suggestion rows: bits-ui `−/+` input (NO chips) — preview UX
- Adwata icons importer (Gnome icons) en Theme Builder
- Lucide icons section visible en icon selector
- Per-node manual icon override funcional
- Bar visibility toggles (toolbar/bottom/top show-hide) en Theme Builder
- Layout settings: pill/dual/drawer + corner + direction + pill style + swap-tabs
- dashboard3 redefinido: hidratación de tab-mount module + bars per-tab control
- Color governance: zebra + rainbow + accent rules unified

**SemVer rationale**: MINOR
- Adds opt-in features — no behavior change para users que no las activen

**R.D actions**: standard

**Blockers**: 0-B impl complete (currently 🟢 in-flight) + 0-A close + L6 deps en serviceLayout

---

## v1.7.0 — Design system migration

**Tema**: SCSS → UnoCSS + bits-ui preset adoption.

**Sub-systems incluidos**:
- **N** — SCSS → UnoCSS migration (~90% target)
- **12** — bits-ui adoption preset (Vaultman preset rewrite based on proto HTML + 10 React files)
- **StackIsland adoption** (squircle-up-center option)

**Shippable criterion**:
- 90% de SCSS migrado a UnoCSS classes
- Vaultman preset rewritten con bits-ui components
- StackIsland primitive available + adopted por FiltersIsland + QueueIsland + SortIsland + ViewIsland
- Suggestion rows component finalizado (de v1.6.0 preview a stable)
- Bundle size impact documented + acceptable

**SemVer rationale**: MINOR
- Internal migration — visible polish only, no behavior change

**R.D actions**: standard

**Blockers**: N completed first (per roadmap line 58: "N recomendado antes" del 12)

---

## v1.8.0 — NN Interop

**Tema**: first cross-plugin compatibility. Vaultman providers → NN explorer.

**Sub-systems incluidos**:
- **I.E direction B** — Vaultman providers → NN explorer (engine swap setting)

**Shippable criterion**:
- Setting `explorer.engine: 'vaultman' | 'notebook-navigator'` (default `'vaultman'`)
- Cuando seleccionado `'notebook-navigator'`:
  - Detect NN plugin presence en `onLayoutReady`
  - Subscribe `api.on('selection-changed')` → Vaultman state-mod bus
  - Write metadata via NN's `api.metadata.set*Meta` setters
  - Register cmenu via NN's `api.menus.registerFileMenu/registerFolderMenu`
- Direction A (Vaultman renderer ← NN data) DEFERRED hasta NN expose content-provider hook

**SemVer rationale**: MINOR
- Opt-in feature — gated by setting, no impact si user no la activa

**R.D actions**: standard + community announcement (first cross-plugin compat)

**Blockers**: API `vaultman.v1` exposed (v1.4.0)

---

## v2.0.0 ⚠️ — Bases Parity BREAKING

**Tema**: full Bases parity. Major version jump por breaking property IDs.

**Sub-systems incluidos**:
- **B.P** — Bases Parity (extends 4-I)
- **C.D** — Cross-provider Cell Data
- **viewTable Bases rewrite**
- **viewCards Bases rewrite**

**Shippable criterion**:
- Property addressing migrated `prop:area → prop.note.area` (BREAKING)
- DOM vocab emits `bases-tr`, `bases-table-cell`, `bases-td`, `bases-cards-item`, `bases-cards-property mod-title`, `bases-cards-cover` cuando `useNativeDom === true`
- `data-property="note.X"` attribute convention applied
- `registerBasesView()` para viewTable funcional (inherit Bases pipeline)
- viewTable rewrite completa (Bases vocab + cell semantics)
- viewCards rewrite completa (Bases cards vocab)
- Polyfill para leer Base results (open-detached-leaf → `controller.results`)
- Cell semantics: `Cell.getValue("note.area")` funciona cross-provider
- Migration shim para user-saved bases/filters con `prop:area` legacy IDs

**SemVer rationale**: MAJOR (1.x → 2.0)
- Breaking: property IDs change
- Migration shim ships pero user-data require attention
- Documentation explicit sobre breaking changes
- Pre-release: v2.0.0-beta.1 → v2.0.0-rc.1 → v2.0.0 con beta period mínimo 2 semanas

**R.D actions**:
- Pre-release version cycle: beta + rc
- Migration guide en docs
- Breaking changes prominently en CHANGELOG
- Community announcement con migration steps
- Compatibility window con v1.8.x maintained (security patches only)

**Blockers**: A.R + N.R + V.D landed (v1.2.0-v1.3.0) + 4-I baseline shipped

---

## R.D — Release Discipline (cross-cutting)

Aplica a TODAS las releases desde el catch-up `1.1.0` y el umbrella `v1.2.0 → v2.0.0+`.

### Per-release checklist

Antes de cada release:

- [ ] `CHANGELOG.md` `[Unreleased]` section accumulating durante el sprint
- [ ] Pre-release: move `[Unreleased]` → `[X.Y.Z]` con date
- [ ] `package.json` version bump via release-please release PR
- [ ] `manifest.json` version bump
- [ ] `versions.json` append entry
- [ ] `pnpm verify` green (lint + check + unit + component + build)
- [ ] Live `plugin-dev` smoke: `obsidian vault=plugin-dev dev:errors` returns "No errors captured"
- [ ] Push `sandbox → origin/sandbox` before opening release branch/PR if sandbox is the source
- [ ] Tag `X.Y.Z` — **NO prefijo `v`** (Obsidian exige tag == manifest.json version exacto). No `--no-gpg-sign` unless explicit
- [ ] Merge to main: release-please release-PR como ÚNICO PR que toca main + `dorny/paths-filter` guard Action que FALLA el PR si toca `.agents/**`/`CLAUDE.md`/`AGENTS.md`/`.claude/**` (mecánico, no procedural) per AGENTS.md "main = 0 AI files"
- [ ] GitHub Release published con notes copy-paste desde CHANGELOG section
- [ ] Obsidian community plugin update (manifest.json reachable on main)

### Branch hygiene

- `main`: production, 0 AI files
- `origin/main`: published, public release tags
- `origin/sandbox`: dev integration, AI files OK
- `sandbox` (local): active work, AI files OK
- `claude/explorer`, etc.: feature branches, AI files OK, merged to sandbox

### Versioning

- Adheres a SemVer (existing package.json convention)
- Adheres a Keep a Changelog 1.1.0 format
- Pre-release suffix `-beta.N` y `-rc.N` para major versions (v2.0.0 specifically)
- Minor bumps cada feature release (v1.X.0)
- Patch bumps para hotfixes (v1.X.Y donde Y > 0)

### Manifest sync

- manifest.json `id`, `name`, `version`, `minAppVersion`, `description`, `author`, `isDesktopOnly` deben coincidir con package.json en cada release
- versions.json mantiene historial completo para Obsidian community plugin distribution

### Tooling (research 2026-05-19)

- **release-please** (installed on `main` 2026-05-20; `googleapis/release-please-action`, `release-type: node`, `extra-files: [manifest.json, versions.json]`, tag format `${version}` sin `v`): genera release-PR reviewable que consolida commits en changelog Conventional-Commits-grouped.
  Mejor que semantic-release para multi-subsystem porque el PR es amendable antes del tag.
- **Conventional Commits** baked en executing-plans output template (`feat:` / `fix:` / `feat!:`) → semver bump determinístico.
- **`dorny/paths-filter`** guard Action: enforcement mecánico de "main = 0 AI files" (falla PR a main si toca `.agents/**`/`CLAUDE.md`/`AGENTS.md`/`.claude/**`).
- **`anthropics/claude-code-action@v1`** como neutral PR reviewer (Sonnet 4.6 default, Opus 4.7 para large-codebase reasoning): postea severity, NO auto-bloquea. Auto-merge matrix = CI green + severity ≤ low + ≥1 human approval.
- **Anti-drift gates** (ver T.G): AgentAssay-style statistical gates (N=5 runs + Wilson CI + Fisher exact) + CUSUM drift detection entre iteraciones. Ataca **intent-drift** (behavior diverge del spec sin fallar un test) — la causa raíz de "tests no previenen regresiones".
- Refs: [release-please](https://github.com/googleapis/release-please) · [paths-filter](https://github.com/dorny/paths-filter) · [claude-code-action](https://github.com/anthropics/claude-code-action) · [obsidian-releases](https://github.com/obsidianmd/obsidian-releases) · [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) · [release-please Obsidian extra-files](https://docs.obsidian.md/Plugins/Releasing/Release+your+plugin+with+GitHub+Actions)
