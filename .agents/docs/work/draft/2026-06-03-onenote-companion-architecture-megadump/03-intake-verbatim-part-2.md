---
title: Megadump intake verbatim — part 2
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

# Megadump Intake — Verbatim Part 2

Lossless capture (cont.). Readme/identity blocks + misc feature items. Fenced to
keep wikilinks/tags inert. Classification in
[[docs/work/draft/2026-06-03-onenote-companion-architecture-megadump/01-triage-classification|01-triage-classification]].

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
		- Upcoming GIT add-on#idea/readme
a [[SCENE]] file is basically an opinionated [[HTML]] with [[YAML]] and [[JSON]] sections, inspired by the [[Svelte]] file format.

You can manifest [[SCENE]] dependencies from VM-Modules API or via html import declarations (*like [[TypeScript]], [[JavaScript]] or [[Python]]; runtimes not included*)

You can bundle in them Obsidan-flavored markdown, with the option to have multiple notes with their own frontmatter inside a single file.

These files don't support inline scripting as a security measure, only script imports  (because scripts could be reviewed and shipped in the Obsidian Marketplace, but you can modify that behavior of course). That way, you can storage and share them securely as if they were .BASE files.- directly use [[excalidraw]] plugin as if it were a library for tooling on the "drawing mode of editorScenes" and the 'backmatter' layer with the layerScene to hide the excalidraw code from the notes.
	- esto aprovechando que cualquier archivo .md puede convertirse en un excalidraw por dicho plugin.

- the cell_path as part of the active node FORM (noteScene) to quickly change the file storage path (with possible warning tooltip if the wrote path is not a path inside the vault)

- real file metadata read/write. reveal hidden files and folders. open any path from your device storage without exiting your current vault.
	- might need admin priviliges/root permission; maybe keep it for the external paid app (linux users won't like that though).

- Left/Right mouse_pad scroll as back and forth page command (input_binfing).

- noteScene for outline, frontmatter, backlinks and outgoing links.

- [[n8n]] / [[ComfyUI]] / [[Scrap]] action binding workflow
- execute [[python]] and [[JavaScript|js]] scripts with an API of UI library (possible runtime selector as well)

debo recordar que como mi sistema se basa en presets tanto de estilo como de funcionalidad traducir el proto design que vendría a ser el preset "Polished" requiere una fuerte abstracción y granularidad por la presencia del S.P.S. (saving preset system) e incluso el L.U.P.A (load-unload plugins api)- [ ] Apply templates into selected files
- [ ] la actualización de stable en cuanto a funciones puede ser extrayendo capas, primero las más sólidas como el tooling o las librerías. puede salir el resultado tanto por reconstrucción como por recupperación por commits donde ya se hizo (más específicamente el detalle de que los css se conviertan en scss fue un trabajo que ya hicimos hace tiempo)
	- [ ] el otro camino y tal vez más viable (aunque no recomendable del todo porque yo no lo comprendo muy bien del todo) es en reversa. Usar beta como base y hacer downgrades hasta que haga match con estable. Tal vez sea más trabajo, pero contaría como un mega refactor sin romper código.

- [ ] debo hacer una iteración de verificación de interconectividad y mind routing del pkmai antes de pasar al pre brainstorm y toma de decisiones sobre el producto.

- [ ] otra ronda de limpieza y archivado de docs para que información antigua o superseded pierda relevancia en la memoria de trabajo del agente y este se encargue de mejorar su disciplina de información para orquestar todos los tipos de memoria existentes.

- lista de todos los plugins que el user puede potencialmente reemplazar con la instalación de vaultman

an import option of dataview text syntax to vaultman
```
