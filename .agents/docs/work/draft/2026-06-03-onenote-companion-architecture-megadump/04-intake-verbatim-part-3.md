---
title: Megadump intake verbatim — part 3 (second chunk)
type: backlog-intake-shard
status: active
parent: "[[docs/work/draft/2026-06-03-onenote-companion-architecture-megadump/index|onenote companion megadump]]"
created: 2026-06-03T10:33:47
updated: 2026-06-03T10:33:47
created_by: claude-opus-4-8
updated_by: claude-opus-4-8
tags:
  - agent/work
  - agent/backlog
  - initiative/draft
---

# Megadump Intake — Verbatim Part 3 (second chunk, 2026-06-03)

Dev sent a follow-up chunk: partly repeats part-2 (Layout Design API / Modular config / System Modules Library) but adds the **symbiont** post framing + refined SCENE-file readme + acronym expansions wanted for official docs. Captured lossless, fenced. New terms triaged in [[docs/work/draft/2026-06-03-onenote-companion-architecture-megadump/01-triage-classification|01-triage]] addendum.

```text
#vaultman #description Ready to use bundled framework that flows seamlessly by default with the rest of your workspace themes, snippets and plugins.
- , Layout Design API
	1. Workspace Surface Abstraction
		- agnostic UI rework with DOM manipulation for full customization
		- core obsidian user experience becomes just another preset
		- primitive paneling becomes remount-able scenes collections
	2. UI components and [[presetWind4]] variables (*U.C.V.*)
		- core obsidian classes for snippet retrocompatibility
		- default opinionated ones to showcase extension
		- Unopinionated reusable ones
	3. **Live Redesign** mode to move and change things.
		- with a control panel to quickly adjust composition
	4. Paginate, use layers,  pan, zoom and rotate freely everywhere!
		- upcoming Excalidraw add-on to draw as well (editorScene as excalidraw canvas)
- , Modular and granular configuration
	1. Saving Presets System (*S.P.S.*)
		- to quickly change between workspace settings, layout, checkpoints, etc.
		- queued operations batcher for automation.
		- for 
	2. Load-Unload Plugins API (*L.U.P.A.*)
		- to debloat them from unneeded functions or interfaces.
		- to choose common UI components or operations from different providers.
		- inter-plugin compatibility score recognition
	3. Node/Input Binding (*N.I.B.*) patterns for navigation and workflow config.
		- Keyboard + input modifiers
		- Mouse
		- Touch screen
	4. SCENE files (JSON+HTML) to easily share configurations, presets or info.
		- SPS and LUPA data into a single file
		- Embedded multiple markdown notes (*like plugin documentation*)
		- Custom HTML and CSS (*based on UCV*)
- , System Modules Library
	1. Services, Commands and Scripts Indexing (S.A.S.I)
		- acts as public facade for inter-plugin API calls
		- works with NIB to create buttons, rulesets or automations
		- can have its own provider to retrieve data for explorers
	2. Node-Notes Explorers
		- Data, Metadata, Intercepted and Fetched!
		- Views engine
		- Sorting service
	3. Storage management
		- reading/writing operations
		- filtering and batch queued operations
		- Upcoming GIT add-on
***
#vaultman #idea/post Why many plugins when few do trick?

[[Vaultman]], the symbiont plugin. An entire overhaul of the Obsidian interface and user experience.

the publication of the app.js and app.cs for and obsidian-web-lab made this possible.

The common ground where all community plugins converge. A plan to connect them all!

Multiple builds just for the same generic user interfaces. Why not a single UI that can morph to any preset form with just one file and one click?

#idea/readme
a [[SCENE]] file is basically an opinionated [[HTML]] with [[YAML]] / [[JSON]] sections, inspired by the [[Svelte]] file format.

You can manifest [[SCENE]] dependencies from VM-Modules API or via html import declarations (*like [[TypeScript]], [[JavaScript]] or [[Python]]; runtimes not included*)

You can bundle in them Obsidan-flavored markdown, with the option to have multiple notes with their own frontmatter inside a single file.

These files don't support inline scripting as a security measure, only script imports  (because scripts could be reviewed and shipped in the Obsidian Marketplace, but you can modify that behavior of course). That way, you can storage and share them securely as if they were .BASE files.
```
