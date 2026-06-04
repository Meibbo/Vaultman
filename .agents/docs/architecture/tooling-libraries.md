---
title: Tooling, Libraries & References (with stream tier alignment)
type: architecture
status: active
parent: "[[docs/work/hardening/index|hardening]]"
created: 2026-05-27T00:00:00
updated: 2026-05-28T22:06:00
created_by: claude-opus-4-7
updated_by: codex-gpt-5
tags:
  - agent/architecture
  - agent/tooling
  - agent/transition
---

# Tooling, Libraries & References

Standing registry of what we use, what we're transitioning to, what was removed, and which tools live in
which stream. Helps onboarding, transition planning, and the periodic "stability promotion" from `main`
into `dev` + `sandbox` (a separate transition-agent owns the mechanic; this doc is the inventory).

Pair with: [[docs/architecture/dev-glossary|dev-glossary]] · [[docs/architecture/zoom-out-map|zoom-out-map]]
· [[docs/architecture/operational-watch-list|operational-watch-list]] · [[docs/work/hardening/research/2026-05-27-version-streams-distillation/index|version-streams]].

## Stream tier reminder

- **stable** (`main`): conservative; must work. Adopts beta tooling only after promotion gate.
- **beta / nightly** (`dev`): testing freedom; toward-stable; adopts canary tools when proven safe.
- **canary** (`sandbox`): creative; tagged for extraction/reference back upstream; may break.
- **proto design** (Claude-design, `Downloads/vaultman`): anything goes — visualization stream only,
  NEVER merges code; the stack is irrelevant beyond translation reference.
- **goal** (docs): no toolchain.

## Current stack (IN USE)

| Tool / library | URL | What it does | Streams using it | Added | Notes |
|---|---|---|---|---|---|
| **Svelte 5** | https://svelte.dev | UI framework w/ runes (`$state`/`$derived`/`$effect`/`$props`/`$bindable`) | stable · beta · canary · proto | ~2024 | runes-mode in beta/canary; mixed in stable line |
| **TypeScript** | https://www.typescriptlang.org | typed language | all | early | strict-mode in beta+ |
| **esbuild** | https://esbuild.github.io | production bundler | stable · beta · canary | early | stable 1.0.1 spec considers Vite fallback if CSS extraction breaks |
| **TanStack Virtual** | https://tanstack.com/virtual | row virtualization | beta · canary | 2026 perf pass | DEFAULT; virtua = prototype behind harness only |
| **TanStack Table Core** | https://tanstack.com/table | framework-agnostic table engine | beta · canary | Table engine spec | column order/visibility from view-config |
| **PretextJS (`@chenglou/pretext`)** | n/a (research source) | text layout / measurement | beta · canary | measured-card layout | measures card text budgets |
| **vitest** | https://vitest.dev | unit + component testing | all | early | component matrix gated |
| **eslint + custom rules** | https://eslint.org | linting | all | early | `eslint-rules/` extends |
| **husky** | https://typicode.github.io/husky | git hooks | all | release infra | manifest-block hook on main |
| **release-please** | https://github.com/googleapis/release-please | release automation | stable | 1.0.1 catch-up | bare tags (`include-v-in-tag:false`) |
| **GitHub Actions** | https://github.com/features/actions | CI / release | all | early | ci.yml + codeql.yml + scorecard.yml + release.yml |
| **CodeQL** | https://codeql.github.com | security analysis | stable + PRs to main | 1.0.1 catch-up | |
| **OpenSSF Scorecard** | https://scorecard.dev | supply-chain scoring | stable | 1.0.1 catch-up | green at high+ |
| **GitHub artifact attestations** | https://docs.github.com/actions/security-guides/using-artifact-attestations | provenance | stable | 1.0.1 catch-up | covers `main.js` / `manifest.json` / `styles.css` |
| **Obsidian API** (`obsidian.d.ts`) | https://github.com/obsidianmd/obsidian-api | plugin API surface | all | always | `minAppVersion` 1.12.0 stable; Bases dev API 1.10.0+ |
| **pnpm** | https://pnpm.io | package manager + scripts | beta · canary | early | stable 1.0.1 uses `npm` (Codex plan) |
| SCSS (current style system) | https://sass-lang.com | structural / complex styles | beta · canary | early | targeted for replacement by UnoCSS where utility-first fits |

## Target / candidate stack (research / grill PENDING)

| Tool / library | URL | Purpose | Status | Replaces | Notes |
|---|---|---|---|---|---|
| **UnoCSS** | https://unocss.dev | utility-first CSS (Tailwind power, ecosystem-friendly) | research + grill PENDING (**R-UNOCSS**) | SCSS in most surfaces | dev manually inspecting docs; verify whether the `unocss` skill is installed |
| **`dnd-kit-svelte` (HanielU port)** | https://github.com/hanielu/dnd-kit-svelte · demo https://dnd-kit-svelte.vercel.app | DnD axon (provider · draggable · droppable · sortable · sensors · modifiers · accessibility); full dnd-kit feature parity, Svelte 5 compatible | **SELECTED TARGET** — proposed lock S-10 in `pending-decisions` (awaits R-DND-A for foreign-drop adapter design) | n/a | full recon in `dnd-library-findings`; alternatives weighed = svelte-dnd-action (no modifiers/collision), @thisux/sveltednd (nascent), @dnd-kit/svelte (less maintained), @neodrag/svelte (kept as touch-only fallback) |
| **`monkey-around`** | https://github.com/pjeby/monkey-around | safe prototype wrapping for monkey-patches; returns an `unpatch` for clean revert (matches `serviceUnload` requirement, ADR 0004) | **SELECTED TARGET** — proposed lock S-11 (with `interact.js`) | n/a | hover-editor reference impl; pane-relief uses it; ALWAYS load patches in `onLayoutReady()` |
| **`interact.js`** (and `@nothingislost/interactjs` Obsidian fork) | https://interactjs.io · https://github.com/nothingislost/obsidian-hover-editor (fork in `package.json`) | floating-tile drag + resize · edge modifiers · pointer-event abstraction (desktop + mobile) | **SELECTED TARGET** — proposed lock S-11 | n/a | `HoverFloatAdapter` + `ForeignEmbedAdapter` template — popover w/ `.popover-titlebar` handle + edge resize zones |
| **Obsidian DnD public API** (`Workspace.onDragLeaf` / `getDropLocation` / `recursiveGetTarget` · `WorkspaceLeaf.containerEl`) | docs.obsidian.md (declarations in `obsidian.d.ts`) | leaf-aware drag-out to workspace splits; locate drop target | **IN USE (architectural)** — `obsidian-dnd-findings` documents the public surface | n/a | private internals (tab/split/stacked-tabs reorder, floating windows, properties DnD) = monkey-patch needed |
| **virtua** | https://github.com/inokawa/virtua | alt virtualization | prototype behind harness only | n/a | live blank-frame harness gate |
| **LayerChart (next / Svelte 5)** | https://www.layerchart.com | Svelte-native charting candidate for `Charts`/`DataViz` panelData runtime | research PENDING (**R-CHARTS**) | n/a | user flagged the newer Svelte 5 docs + possible `llms.txt`; verify current API before deciding |
| **D3.js** | https://d3js.org | low-level visualization primitives / scales / layouts | research PENDING (**R-CHARTS**) | n/a | keep only if we need primitives LayerChart/Plot do not cover |
| **Observable Plot** | https://observablehq.com/plot | declarative statistical charts | research PENDING (**R-CHARTS**) | n/a | compare bundle/runtime value against LayerChart before keeping/removing |
| **Markmap / Markmind references** | tbd | outline graph / mindmap reference patterns | research PENDING (**R-GRAPH**) | n/a | reference only until Canvas graph/mindmap mode is scoped |
| **minisearch** | https://github.com/lucaong/minisearch | client-side full-text index | deferred (H1) — own index vs Omnisearch bridge | n/a | search backend research pending |
| **bits-ui** | https://www.bits-ui.com | headless Svelte primitives | pending diagnosis (broke FnR in beta) | partial | research how it broke before re-adopting |
| **shadcn-svelte** | https://www.shadcn-svelte.com | copyable Svelte component recipes | research PENDING (**R-UI-PRIMITIVES**) | n/a | compare against Bits UI/custom through a VM primitive adapter; Tailwind classes are not accepted unchanged until UnoCSS/Obsidian styling is proven |
| **`@svar-ui/svelte-filemanager`** | tbd | reference filemanager | reference / command-opened | n/a | not the production explorer |
| **iconize replacement** (`IconNode`) | (own implementation) | cross-surface icon override | LOCKED design | iconize plugin dependency | absorbs the role |

## Stream-tier alignment for the transition

- **Stable (`main`)**: minimal modernization until promoted. Current = `1.0.1` line. Adopts tooling
  AFTER promotion gate.
- **Beta (`dev`)**: target candidate stack lands here first. UnoCSS / Svelte-DnD / new bundle/test
  changes pilot here.
- **Canary (`sandbox`)**: anything goes; tagged for extraction/reference back to beta.
- **Proto design**: pure CSS / React / HTML — irrelevant to our stack (re-translation only; tooling
  there does not constrain ours).
- **Periodic "stability promotion"** (dev flagged 2026-05-27): rhythm pushing main's security / test /
  release improvements INTO `dev` + `sandbox` on cadence so canary/beta don't drift behind on
  fundamentals. To be scheduled by the transition-agent (publish initiative owns the mechanic).

## Superseded / removed (running log)

| Removed | Date | Replaced by | Reason |
|---|---|---|---|
| `applyVaultmanTheme` / body-scoped `vm-theme` | 2026-05-17 | `serviceTheme` + `--vm-*` tokens | 0-B token layer |
| `normalizeLayoutTheme` / `LAYOUT_THEME_OPTIONS` / `LayoutTheme` | 2026-05-17 | `serviceTheme` token layer | 0-B refactor |
| `vm-glass-blur` (body-scoped) | 2026-05-17 | `--vm-*` token glass | 0-B refactor |
| 6 hard-coded theme palettes (Catppuccin / Gruvbox / Dracula / Nord …) | 2026-05-19 | dropped — Obsidian handles themes; system-theme provider + recent-themes UI to come | merge-umbrella lock |
| Map / `ViewNodeMap` (selectable) | 2026-05-18 | deferred; not selectable | post-platform-pass repair |
| `Dashboard3Column` (hardcoded 3-col responsive shell) | 2026-05-26 | layout-as-data (Scene tile-tree + native split / page=editor-group ADR 0007) | foundation grill |

(append rows as removals happen — include date + reason + replacement.)

## Process

- Append a row when a tool is added or removed (date + reason).
- When proposing a target tool, dispatch a research thread → record under "Target / candidate" until
  adopted, then move to "Current stack" + keep a row in "Superseded" if replacing something.
- Pair with the stream-tier alignment so the dev knows which stream a tool lives in.
- Reconstruction watch (raised 2026-05-27): the gap between stable's tooling and beta's tooling is
  abysmal; document each adoption with a transition note (impact, fallback, rollback). Pair with the
  preview-prototype strategy ([[docs/architecture/pending-decisions|S-8]]).

## Status

Created 2026-05-27 at dev request ("doc de todo el tooling, librerías y referencias"). Initial
inventory; grow over time. Hand to the transition-agent for the periodic stability-promotion mechanic.
