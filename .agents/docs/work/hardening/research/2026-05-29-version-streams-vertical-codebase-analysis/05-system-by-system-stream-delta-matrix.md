---
title: System-by-System Stream Delta Matrix
type: research-shard
status: active
parent: "[[index|Version Streams Vertical Codebase Analysis]]"
created: 2026-06-05T13:45:00
updated: 2026-06-05T13:45:00
created_by: codex-gpt-5
updated_by: codex-gpt-5
stream_scope:
  - stable
  - sandbox
  - proto-design-v12
tags:
  - agent/research
  - initiative/hardening
  - architecture/vertical-analysis
  - version-streams
  - delta-matrix
---

# 05 - System-by-System Stream Delta Matrix

## 000. Shard Contract

- This shard compares systems across the already-read streams.
- It does not replace shard 02.
- It does not replace shard 03.
- It does not replace shard 04.
- It consumes them as source records.
- Stable source baseline is shard 02.
- Sandbox source baseline is shard 03.
- Proto design baseline is shard 04.
- Stream taxonomy baseline is shard 01.
- The purpose is not to repeat every vertical read.
- The purpose is to convert vertical reads into decisions.
- Each system gets a practical delta.
- Each system gets a promotion decision.
- Each system gets a translation note.
- Each system gets a risk note.
- Each system gets a next action.
- The matrix is intentionally blunt.
- Stable protects users.
- Sandbox proves implementation.
- Proto v12 supplies design vocabulary.
- Dev/beta is currently absent as a branch in the observed workspace.
- Therefore this matrix cannot rely on an intermediate branch.
- It must describe what must happen before anything is called stable.
- It must describe what can be taken directly.
- It must describe what must be translated.
- It must describe what must not be promoted as-is.
- It must describe what remains unknown.
- This shard includes product/runtime tooling because sandbox has product-facing diagnostics.
- This shard excludes test-suite deep dives.
- This shard uses test/tooling references only as stream evidence.
- This shard is a god-object source record.
- Mechanical splitting may happen later.
- Do not manually compress it before splitting.

## 001. Decision Legend

- `KEEP_STABLE`: preserve stable behavior as user contract.
- `KEEP_SANDBOX`: sandbox implementation is the best current implementation baseline.
- `TRANSLATE_PROTO`: proto v12 has the better interaction/model vocabulary, but must be translated into product architecture.
- `STABILIZE_BEFORE_PROMOTION`: sandbox has the right direction but is too risky for stable.
- `DO_NOT_PROMOTE_AS_IS`: copying this stream surface directly would be wrong.
- `MISSING_BETA_GATE`: the observed workspace lacks the dev/beta branch needed for middle validation.
- `UNKNOWN`: current shards do not give enough evidence.
- These labels are not mutually exclusive.
- A system can require `KEEP_STABLE` for behavior and `KEEP_SANDBOX` for implementation.
- A system can require `TRANSLATE_PROTO` for language and `STABILIZE_BEFORE_PROMOTION` for runtime.
- The final promotion spec should turn these labels into work packages.

## 002. Evidence Spine

- Shard 01 says the stream gap is architectural.
- Shard 01 says promotion cannot be fast-forward.
- Shard 01 says stable is `origin/main` / `1.0.1` in practice.
- Shard 01 says sandbox metadata says `1.1.0-beta.1`.
- Shard 01 says sandbox theory says canary.
- Shard 01 says proto design v12 is canonical.
- Shard 02 says stable has 66 product source files.
- Shard 02 says stable has about 9809 product LOC.
- Shard 02 says stable has 32 components.
- Shard 02 says stable has 6 services.
- Shard 02 says stable has 0 providers.
- Shard 02 says stable has 6 type groups.
- Shard 02 says stable is a single-frame service-backed imperative-panel plugin.
- Shard 02 says stable has filters, ops, stats, queue, content replace, linter, curator, popups, status bar, and settings.
- Shard 02 says stable has no provider/data-plane architecture.
- Shard 02 says stable has no virtualization.
- Shard 02 says stable has some direct destructive operations.
- Shard 02 says stable has no explicit mobile/platform gate despite `isDesktopOnly:false`.
- Shard 03 says sandbox has 271 product-ish source files.
- Shard 03 says sandbox has about 43k product LOC.
- Shard 03 says sandbox has 83 components.
- Shard 03 says sandbox has 72 services.
- Shard 03 says sandbox has 7 providers.
- Shard 03 says sandbox has 24 type groups.
- Shard 03 says sandbox is implementation reconstruction.
- Shard 03 says sandbox center of gravity is services plus provider taxonomy.
- Shard 03 says sandbox's queue/filter/view data triangle is central.
- Shard 03 says sandbox's highest risk is staged mutation plus operation scope.
- Shard 03 says sandbox has product diagnostics.
- Shard 03 says sandbox has mutable/immutable, legacy/snapshot, native/interceptor, manual/library DnD dual paths.
- Shard 04 says proto v12 is canonical design reference.
- Shard 04 says proto v12 view taxonomy has four axes: engine, mode, orientation, viewScope.
- Shard 04 says proto v12 has root app, control island, sidebar, pages, stack island, explorer, views, nautilus, icons, popups, search island, desktop.
- Shard 04 says proto v12 is not mergeable code.
- Shard 04 says proto v12 should be adopted as vocabulary, not copied as architecture.
- Shard 04 says proto v12 filter stack needs executable predicate AST.
- Shard 04 says proto v12 queue stack needs operation previews and transactions.
- Shard 04 says proto v12 search/replace-to-queue flow should be preserved as design evidence.
- Shard 04 says desktop taxonomy is stale relative to newer view taxonomy.

## 003. Global Matrix

| System | Stable | Sandbox | Proto v12 | Decision |
|---|---|---|---|---|
| Stream metadata | true stable `1.0.1` | branch is sandbox, metadata beta | design stream outside package metadata | fix labels before release |
| Boot/lifecycle | small direct plugin | full service graph | root React app state | keep sandbox graph, preserve stable open path |
| Explorer | imperative panels | providers + data plane + ViewHost | TabExplorer + view engines | keep sandbox implementation, translate proto taxonomy |
| Views | tree/grid, render limit | tree/list/table/grid/cards, virtualized | engine/mode/orientation/viewScope | extend sandbox with proto vocabulary |
| Filters | filter service + popups | filter service + active index + toolbar | filter stack UI grammar | keep sandbox runtime, translate proto grammar |
| Search/FnR | content replace preview | FnR island + prop/tag/file/content operations | search island create/replace chips | merge stable safety + sandbox runtime + proto UX |
| Queue/Ops | partial queue, some direct ops | queue/VFS/diff/ops log | queue stack simulated apply | keep sandbox queue, preserve stable trust |
| Layout | one frame + bottom nav | frame pages, dashboard, detached leaves | desktop/sidebar/both/i3 panels | stabilize sandbox, translate panel tree carefully |
| Theme/style | Obsidian theme respect | Elastic UI, presets, SCSS, native identity | rich visual tokens and control island | keep stable respect, translate proto via sandbox tokens |
| Native binding | context menu, Iconic, linter bridge | node-note aliases + native surface binding | semantic icons/context UI | stabilize adapters before promotion |
| DnD | limited/implicit | generic/manual/alias-aware/DnD-kit paths | cell rearrange, stack/window DnD | do not promote without hardening |
| Bases | settings only | import preview and filter conversion | visual/data inspiration | sandbox is first real path; needs validation |
| ServiceAPI | absent | read/plan/enqueue risk API | no plugin API | keep sandbox but mark experimental |
| Diagnostics | little/no runtime telemetry | PerfMeter, ops log, perf probe, smoke scripts | prototype has no runtime perf proof | keep sandbox diagnostics as canary tools |
| Mobile | manifest supported, no gate | manifest supported, desktop-heavy code | design visual/desktop-heavy | block stable promotion without platform gate |

## 004. Overall Translation Thesis

- Stable is the behavior floor.
- Sandbox is the implementation candidate.
- Proto v12 is the design language.
- None of the three alone is sufficient.
- Stable alone is too coupled and too small.
- Sandbox alone is too broad and transitional.
- Proto alone is not product code.
- The correct direction is selective synthesis.
- Preserve stable user promises.
- Preserve stable mutation caution.
- Preserve stable simple launch model.
- Replace stable internals where sandbox clearly improves boundaries.
- Keep sandbox providers.
- Keep sandbox indexes.
- Keep sandbox data-plane direction.
- Keep sandbox queue/VFS direction.
- Keep sandbox semantic overlay direction.
- Keep sandbox diagnostics during canary/beta.
- Translate proto view taxonomy into sandbox type contracts.
- Translate proto control island into settings/surface commands.
- Translate proto search island into sandbox toolbar/FnR workflows.
- Translate proto stack island into popup/windowing primitives only where runtime can support it.
- Translate proto panel tree only after persistence and focus semantics are designed.
- Do not copy proto globals.
- Do not copy proto mock data builders.
- Do not copy proto DOM query navigation.
- Do not copy stale desktop taxonomy.
- Do not promote sandbox's dual-path systems without reconciliation.
- Do not call sandbox beta/stable until stream labels match actual maturity.

## 005. Release And Stream Metadata

### Stable

- Stable metadata is coherent.
- `origin/main` reports version `1.0.1`.
- `origin/main` is a small patch continuation from `1.0.0`.
- Stable is a user-protecting line.
- Stable has no AI files by branch policy.
- Stable is not architecture-leading.
- Stable should not receive broad reconstruction by accident.

### Sandbox

- Sandbox branch is current workspace.
- Sandbox metadata reports `1.1.0-beta.1`.
- Sandbox theory says canary.
- This creates a naming mismatch.
- The code breadth supports canary more than beta.
- The stream has many transitional systems.
- Transitional systems are expected in canary.
- Transitional systems are risky in beta.
- Transitional systems are unacceptable in stable.

### Proto v12

- Proto v12 is outside plugin package metadata.
- Proto v12 is canonical design authority.
- Proto v12 is not a release stream.
- Proto v12 cannot define `manifest.json`.
- Proto v12 cannot define `versions.json`.
- Proto v12 cannot decide BRAT/release semantics directly.

### Delta

- Stable has coherent release identity.
- Sandbox has incoherent release label.
- Proto has no release identity.
- Therefore stream metadata is not ready for promotion.

### Decision

- `KEEP_STABLE`: stable release semantics remain the user-facing baseline.
- `STABILIZE_BEFORE_PROMOTION`: sandbox metadata must be relabeled or branch semantics clarified.
- `DO_NOT_PROMOTE_AS_IS`: do not release sandbox as stable with beta/canary mismatch.

### Next Action

- Define whether `1.1.0-beta.1` is truly beta or just canary metadata.
- If canary, change metadata before distributing beyond canary testers.
- If beta, create or identify the beta validation branch.
- Shard 06 should turn this into a release discipline rule.

## 006. Product Identity And Open Path

### Stable

- Stable has a simple product identity.
- Ribbon icon opens one Vaultman view.
- The open path is easy to reason about.
- Bottom navigation exposes ops, statistics, and filters.
- The product feels like an Obsidian side panel.
- This is a stable user promise.
- Users should not lose the simple open path.

### Sandbox

- Sandbox keeps an Obsidian plugin root.
- Sandbox has a main frame view.
- Sandbox has independent detached tab view types.
- Sandbox has ribbon/status/command integration.
- Sandbox can open sidebar, main, or detached surfaces.
- Sandbox has plugin-level hooks for mounted component actions.
- Sandbox product identity becomes an app shell inside Obsidian.
- This is more powerful.
- It is also more complex.

### Proto v12

- Proto v12 has root app mode.
- Mode can be sidebar.
- Mode can be desktop monitor.
- Mode can be both.
- It has scene-level state.
- It has control island for product personalization.
- It has i3-style panel helpers.
- It has global toast.
- It looks more like a standalone app shell.

### Delta

- Stable product identity is simple.
- Sandbox product identity is integrated app shell.
- Proto identity is design-heavy scene shell.
- The future should preserve simple launch while allowing richer surfaces.

### Decision

- `KEEP_STABLE`: preserve one reliable open command and ribbon path.
- `KEEP_SANDBOX`: use sandbox frame/view registration as implementation baseline.
- `TRANSLATE_PROTO`: translate scene mode and control island into settings/surface services.
- `STABILIZE_BEFORE_PROMOTION`: prove detached/multi-surface behavior before stable.

### Next Action

- Define an "open path contract" that all streams must preserve.
- Contract should cover ribbon, command palette, reopen, reveal existing leaf, and detached tab behavior.
- Contract should be independent of whether dashboard is enabled.

## 007. Boot Lifecycle And Service Graph

### Stable

- Stable boot path is small.
- `src/main.ts` creates core services.
- Stable services include filter.
- Stable services include operation queue.
- Stable services include property index.
- Stable services include icons.
- Stable services include property type.
- Stable services include context menu.
- Stable registers one frame view.
- Stable loads settings.
- Stable opens one view.
- Stable lifecycle is easy to audit.

### Sandbox

- Sandbox boot path is a full service graph.
- It initializes ops log.
- It marks boot timing through PerfMeter.
- It loads settings.
- It hydrates theme service.
- It initializes files, tags, and props indexes.
- It refreshes core indexes.
- It registers vault and metadata events.
- It instantiates filter service.
- It instantiates operation queue.
- It instantiates explorer data plane.
- It instantiates content, operations, active filters, snippets, plugins, and templates indexes.
- It instantiates overlay state.
- It instantiates decoration manager.
- It instantiates view service.
- It installs perf probe global.
- It instantiates Iconic, property type, context menu, node binding, and native surface binding services.
- It registers main frame view.
- It registers all detached tab view types.
- It creates leaf detach service.
- It registers commands.
- It adds settings tab.
- It binds ops log to queue.
- It restores detached leaves on layout ready.

### Proto v12

- Proto v12 root is React app state.
- It stores mode, theme, accent, control state, sidebar state, page state, panel state, sort, view, settings, filter stack, and queue stack in one root object.
- It applies body side effects.
- It mounts global toast.
- It does not model Obsidian lifecycle.
- It does not model plugin unload cleanup.
- It does not model workspace view registration.

### Delta

- Stable lifecycle is safer but less modular.
- Sandbox lifecycle is modular but large.
- Proto lifecycle is design-state-centric but not plugin-safe.
- Product code should use sandbox lifecycle, not proto globals.
- Stable lifecycle simplicity should remain a benchmark.

### Decision

- `KEEP_SANDBOX`: service graph is the implementation direction.
- `KEEP_STABLE`: retain simple boot/open expectations.
- `TRANSLATE_PROTO`: root state concepts should become typed services, not one global object.
- `STABILIZE_BEFORE_PROMOTION`: audit cleanup, hook lifetimes, event subscriptions, and detached restore.

### Next Action

- Build a boot lifecycle checklist for Shard 06.
- Include init order.
- Include unload order.
- Include service ownership.
- Include hook cleanup.
- Include layout-ready restore.
- Include failure behavior.

## 008. Settings And Persistence

### Stable

- Stable settings are broad for v1.
- Settings include language.
- Settings include property defaults.
- Settings include explorer behavior.
- Settings include operations scope.
- Settings include open mode.
- Settings include view labels.
- Settings include context menu toggles.
- Settings include several Bases settings.
- Stable settings are simpler than sandbox.
- Stable settings include future-looking placeholders.
- Stable settings UI is understandable.

### Sandbox

- Sandbox settings schema is much broader.
- It includes toolbar search mode.
- It includes island dismiss behavior.
- It includes faint accents.
- It includes Elastic UI.
- It includes filter templates.
- It includes session file path.
- It includes queue preview.
- It includes matched filter decorations.
- It includes node backgrounds and borders.
- It includes content search.
- It includes operation scope.
- It includes hidden files.
- It includes folders-first.
- It includes manual DnD.
- It includes mouse gestures.
- It includes node mouse actions.
- It includes layout settings.
- It includes view field visibility.
- It includes operations panel settings.
- It includes Bases settings.
- It includes open mode and page order.
- It includes separate panes.
- It includes grid settings.
- It includes context menu settings.
- It includes ops log retention.
- It includes independent leaves.
- It includes binding note folder.
- It includes FnR regex default.
- The settings UI is large.
- Settings mirror internal architecture.
- This increases migration burden.

### Proto v12

- Proto v12 has settings under root state.
- Settings include nav, toolbar, island, blur, and layout options.
- Control island mutates live settings.
- Control island is the design reference for personalization.
- Proto settings are not persisted through Obsidian plugin data.
- Proto settings are not typed as plugin schema.

### Delta

- Stable settings are user-facing contract.
- Sandbox settings are implementation breadth.
- Proto settings are interaction design.
- The future settings schema should not blindly union everything.
- Settings migration needs explicit versioning.

### Decision

- `KEEP_STABLE`: preserve existing stable settings where user-visible.
- `KEEP_SANDBOX`: use sandbox schema for new architecture only after migration audit.
- `TRANSLATE_PROTO`: control island grouping can inform settings UI.
- `STABILIZE_BEFORE_PROMOTION`: settings migration and defaults must be validated.

### Next Action

- Produce a settings compatibility matrix.
- Mark each stable setting as preserve, rename, migrate, or retire.
- Mark each sandbox setting as stable-ready, canary-only, or experimental.
- Mark proto control island groups as UI-only evidence unless backed by schema.

## 009. Explorer Architecture

### Stable

- Stable has panels for files.
- Stable has panels for props.
- Stable has panels for tags.
- Stable panels are imperative classes/components.
- Panels mix data loading.
- Panels mix render policy.
- Panels mix context actions.
- Panels mix queue projection.
- Panels mix mutation planning.
- Stable has no provider directory.
- Stable has no provider contract.
- Stable has no explorer data plane.
- Stable render limit substitutes for scalability.

### Sandbox

- Sandbox has provider taxonomy.
- Providers exist for files.
- Providers exist for props.
- Providers exist for tags.
- Providers exist for content.
- Providers exist for plugins.
- Providers exist for snippets.
- Providers exist for outline.
- Providers exist for Bases import.
- `ExplorerProvider<TMeta>` is the domain adapter contract.
- Providers expose tree data.
- Providers expose snapshots where applicable.
- Providers expose click/secondary/context behavior.
- Providers expose hover badges.
- Providers expose rename and add behavior.
- Providers expose search/sort/view/add support.
- PanelExplorer orchestrates provider, filters, queue, selection, keyboard, DnD, and views.
- ViewHost dispatches renderers.
- ExplorerDataPlane stores snapshots.
- This is a major architecture improvement.

### Proto v12

- Proto v12 has `TabExplorer`.
- Proto v12 has `explorer.jsx` engine dispatch.
- Proto v12 has generic tab explorer.
- Proto v12 uses mock vault data.
- Proto v12 has view engine concepts.
- Proto v12 has scoped view behavior.
- Proto v12 has Niagara side index.
- Proto v12 has cascade/master-detail/grid/container concepts.

### Delta

- Stable explorer is usable but coupled.
- Sandbox explorer is modular but transitional.
- Proto explorer is design-rich but mock-data driven.
- The product future should use sandbox providers and data plane.
- The product future should translate proto engine taxonomy.
- Stable explorer basics remain behavior contract.

### Decision

- `KEEP_STABLE`: preserve files/props/tags basics and simple filtering behavior.
- `KEEP_SANDBOX`: provider contract and PanelExplorer are the implementation baseline.
- `TRANSLATE_PROTO`: engine/mode/orientation/viewScope should inform future `ViewConfig`.
- `STABILIZE_BEFORE_PROMOTION`: dual legacy tree/snapshot paths need reconciliation.

### Next Action

- Define provider capability matrix.
- Define which providers support snapshots.
- Define which providers support each view mode.
- Define which provider actions can queue mutations.
- Define which provider actions are read-only.

## 010. Explorer Data Plane And Indexes

### Stable

- Stable has property index service.
- Stable reads Obsidian APIs directly in services and panels.
- Stable logic helpers create file, prop, and tag shapes.
- Stable has no formal data-plane snapshot store.
- Stable has no revision-rich explorer snapshots.
- Stable has no operations index or active filters index.

### Sandbox

- Sandbox has FilesIndex.
- Sandbox has TagsIndex.
- Sandbox has PropsIndex.
- Sandbox has ContentIndex.
- Sandbox has OperationsIndex.
- Sandbox has ActiveFiltersIndex.
- Sandbox has SnippetsIndex.
- Sandbox has PluginsIndex.
- Sandbox has TemplatesIndex.
- Sandbox has BasesImportTargetsIndex.
- Indexes expose nodes and revisions.
- ContentIndex is asynchronous and chunked.
- OperationsIndex projects queue state.
- ActiveFiltersIndex projects filter state.
- ExplorerDataPlane publishes per-explorer snapshots.
- Snapshots have rows and lookup maps.
- Snapshots have visible ids.
- Snapshots have id/path/domain lookup maps.
- Snapshots carry revisions.
- Data plane decouples providers and renderers.

### Proto v12

- Proto v12 has mock data builders.
- Proto v12 has recursive node model.
- Proto v12 has operators.
- Proto v12 has rich data shape for demos.
- It does not have Obsidian metadata cache integration.
- It does not have product index services.
- It does not have revision semantics.

### Delta

- Sandbox is the only real data-plane candidate.
- Stable direct reads are simpler but not scalable.
- Proto data should not be copied.
- Proto can inform data vocabulary only after mapping to real providers.

### Decision

- `KEEP_SANDBOX`: indexes and data-plane snapshots are the product direction.
- `KEEP_STABLE`: stable direct behavior remains a regression oracle.
- `DO_NOT_PROMOTE_AS_IS`: do not copy proto mock data.
- `STABILIZE_BEFORE_PROMOTION`: revision contracts and cache invalidation need hardening.

### Next Action

- Add a data-plane contract spec.
- Include revision sources.
- Include snapshot invalidation.
- Include provider publish rules.
- Include stale snapshot behavior.
- Include fallback behavior when metadata cache is incomplete.

## 011. Files Domain

### Stable

- Stable files panel shows files.
- Files can render as grid or tree.
- File actions include open, move, rename, and delete surfaces.
- Some stable file operations are queued.
- Some destructive actions may bypass queue.
- Stable file model is readable.
- Stable file model is less abstract.

### Sandbox

- Files provider is provider id `files`.
- It registers file open.
- It registers file rename.
- It registers file delete.
- It registers append links.
- It registers file move.
- It registers folder filter.
- It caches structural tree data.
- It supports hidden-file filtering.
- It supports selected-only source files.
- It supports filtered source files.
- It supports vault source files.
- It builds file/folder snapshots.
- It supports adopted children from outline.
- It decorates rows through explorer layer maps.
- It supports hover badges and FnR handoff.

### Proto v12

- Proto v12 file-manager grammar is in Nautilus.
- It has grid drill.
- It has container grid.
- It has file-manager visual language.
- It has side index behavior.
- It has mock node data.
- It has semantic icons.

### Delta

- Stable file basics are the user contract.
- Sandbox files provider is implementation baseline.
- Proto Nautilus is design inspiration.
- Proto file-manager affordances need runtime translation.

### Decision

- `KEEP_STABLE`: preserve open/move/rename/delete expectations and simple file explorer trust.
- `KEEP_SANDBOX`: files provider and snapshot support.
- `TRANSLATE_PROTO`: Nautilus/grid drill/container grid visual grammar.
- `STABILIZE_BEFORE_PROMOTION`: destructive file operations must be queue-safe and scope-safe.

### Next Action

- Create file-operation promotion checklist.
- Require delete/move/rename preview.
- Require queue or explicit confirmation for destructive operations.
- Require grid drill navigation semantics.

## 012. Properties Domain

### Stable

- Stable props panel shows properties and values.
- Stable property manager builds operations.
- Stable property index tracks frontmatter properties.
- Stable supports property filters.
- Stable supports some queued property operations.
- Stable property behavior is central to user value.

### Sandbox

- Props provider is provider id `props`.
- It is the largest provider.
- It handles prop nodes.
- It handles value nodes.
- It registers set, binding note, rename, delete, and type-change actions.
- It supports FnR rename handoffs.
- It supports operation scope.
- It preserves actual frontmatter key casing.
- It builds snapshots with prop/value domain keys.
- It decorates with Iconic icons.
- It decorates incompatible type badges.
- It supports quick add badges.
- It uses `NATIVE_RENAME_PROP`.
- It routes secondary action to content search.

### Proto v12

- Proto has filter stack rows.
- Proto has node cells and semantic icons.
- Proto has search/create/replace flows.
- Proto can inspire property row affordances.
- Proto does not implement frontmatter casing semantics.
- Proto does not implement Obsidian property metadata integration.

### Delta

- Stable property domain is proven user value.
- Sandbox property provider is implementation leader.
- Proto property UI is visual/interaction inspiration.
- Product correctness comes from sandbox/stable, not proto.

### Decision

- `KEEP_STABLE`: preserve property/value explorer basics.
- `KEEP_SANDBOX`: preserve prop provider and casing protection.
- `TRANSLATE_PROTO`: adopt node cells and semantic icon affordances where they fit.
- `STABILIZE_BEFORE_PROMOTION`: property type conversion and scoped mutations need validation.

### Next Action

- Define property mutation safety contract.
- Include casing preservation.
- Include type compatibility.
- Include value rename/delete behavior.
- Include queue preview.

## 013. Tags Domain

### Stable

- Stable tags panel shows tag tree.
- Stable tag filters exist.
- Stable tag operations are more direct than ideal.
- Stable tag behavior is simple.

### Sandbox

- Tags provider is provider id `tags`.
- It uses TagsLogic.
- It subscribes to TagsIndex.
- It invalidates cache on tag changes.
- It registers rename, set, binding note, and delete actions.
- It builds tag snapshots.
- It uses `#tag` domain keys.
- It supports all/leaf search.
- It supports top/children sort.
- It decorates with tag icons.
- It toggles has-tag filters.
- It routes secondary action to content search.
- It queues tag set/delete/rename via helpers.

### Proto v12

- Proto has semantic icon packs.
- Proto has search chips.
- Proto has filter stack UI.
- Proto can influence tag chip and icon behavior.
- Proto does not implement Obsidian tag cache semantics.

### Delta

- Stable tag basics should remain.
- Sandbox tag provider should replace direct coupling.
- Proto tag visuals should be translated only after provider semantics are stable.

### Decision

- `KEEP_STABLE`: preserve tag browse/filter basics.
- `KEEP_SANDBOX`: tag provider and queue helpers.
- `TRANSLATE_PROTO`: semantic icon/chip language.
- `STABILIZE_BEFORE_PROMOTION`: ensure tag delete/rename never bypasses queue safety.

### Next Action

- Audit tag operations for queue-first behavior.
- Add tag operation preview requirements to promotion spec.

## 014. Content Search And Replacement

### Stable

- Stable content find/replace exists.
- It has preview-and-queue workflow.
- It is local to the content/ops page.
- It is one of stable's practical strengths.
- It should be preserved.

### Sandbox

- Content provider groups content index matches by file.
- ContentIndex scans vault content asynchronously.
- ContentIndex chunks reads.
- ContentIndex publishes progress.
- FnR can build content replace changes.
- Content replace maps to `FIND_REPLACE_CONTENT`.
- Toolbar search can route to content tab.
- `openContentSearchHook` exists.

### Proto v12

- Search island has search, create, replace, and chips.
- It is a strong design reference.
- It sends events over mock data.
- It does not have real provider/query engine.

### Delta

- Stable has safety workflow.
- Sandbox has broader runtime architecture.
- Proto has better interaction model.
- Future content search should combine all three.

### Decision

- `KEEP_STABLE`: preserve preview before replacement.
- `KEEP_SANDBOX`: use ContentIndex + content provider + FnR change builder.
- `TRANSLATE_PROTO`: search island chips and replace launcher.
- `STABILIZE_BEFORE_PROMOTION`: regex/template behavior and scope must be user-safe.

### Next Action

- Specify content replace flow from query to preview to queue to diff.
- Include regex errors.
- Include file scope.
- Include cancellation.
- Include progress reporting.

## 015. Filters And Predicate Model

### Stable

- Stable has `FilterService.activeFilter`.
- Stable has pure filter evaluator.
- Stable supports filter tree semantics.
- Stable has filter authoring modal.
- Stable has filter template persistence.
- Stable has scope/search/move popups.
- Stable filters are user-proven.

### Sandbox

- Sandbox FilterService is rune state.
- It derives filtered files.
- It evaluates filter tree.
- It applies search-name and search-folder filters.
- It exposes flat rules.
- It toggles and deletes rules.
- It supports templates.
- It supports selected file filters.
- ActiveFiltersIndex flattens filters and search rules.
- Active filters are renderable.
- Toolbar search writes filter search state.
- Frame popups manage active filter rules.

### Proto v12

- Proto has filter stack system.
- Filter stack is UI grammar.
- It supports grouped rows.
- It is not an executable predicate AST.
- Shard 04 says FilterStack needs executable predicate AST.

### Delta

- Stable predicate correctness matters.
- Sandbox indexing/rendering matters.
- Proto stack grammar matters for UX.
- Future model should make proto stack executable through sandbox FilterService semantics.

### Decision

- `KEEP_STABLE`: preserve filter semantics and template mental model.
- `KEEP_SANDBOX`: active filter index and popup/render integration.
- `TRANSLATE_PROTO`: filter stack grouping UI.
- `STABILIZE_BEFORE_PROMOTION`: define filter AST compatibility and migration.

### Next Action

- Create filter AST spec.
- Map stable filter rules to sandbox FilterGroup.
- Map proto filter stack rows to executable FilterGroup.
- Mark unsupported proto UI states explicitly.

## 016. Toolbar, Search Island, And Create Actions

### Stable

- Stable filter toolbar is simpler.
- Stable navbar filters expose practical controls.
- Stable uses popups for scope/search/move.
- Stable has less state coupling than sandbox toolbar but more parent callbacks.

### Sandbox

- Sandbox Toolbar is a command cockpit.
- It combines search.
- It combines FnR.
- It combines sort.
- It combines view mode.
- It combines add/create.
- It combines operation scope.
- It combines node expansion.
- It mirrors FnRIslandService.
- It handles regex/whole-word/match-case flags.
- It handles search history.
- It handles active rename handoff.
- It handles toolbar mouse gestures.
- It opens sort and view popups.
- It clears/cycles states.

### Proto v12

- Proto search island has search/create/replace/chips.
- Proto control island handles global personalization.
- Proto stack island handles windows.
- Proto top/bottom islands are stateful surfaces.
- Proto island behavior is strong design evidence.

### Delta

- Stable toolbar behavior is simpler.
- Sandbox toolbar is implementation-rich but complex.
- Proto island interactions are cleaner as design language.
- Future should avoid a toolbar god component if possible.

### Decision

- `KEEP_SANDBOX`: FnRIslandService and toolbar command integration are valuable.
- `TRANSLATE_PROTO`: search island layout and chip vocabulary.
- `KEEP_STABLE`: preserve simple filter/search affordances.
- `STABILIZE_BEFORE_PROMOTION`: split toolbar responsibilities or define service boundaries.

### Next Action

- Write toolbar responsibility map.
- Separate query state, FnR state, sort/view state, operation scope, and create actions.
- Decide which belong to frame, page, provider, or service.

## 017. FnR And Rename Handoffs

### Stable

- Stable has content replace workflow.
- Stable does not have the full cross-provider FnR island architecture.
- Stable does not have prop/tag/file/value rename handoff in the same shape.

### Sandbox

- Sandbox FnR supports plain, regex, whole-word, and ant-renamer syntax.
- Rename source kind can be prop.
- Rename source kind can be value.
- Rename source kind can be tag.
- Rename source kind can be file.
- FnR builds queue changes.
- FnRIslandService validates token and regex errors.
- Template system tokenizes and resolves safe tokens.
- Prop rename maps to native rename op.
- Value rename preserves actual frontmatter key casing.
- Content replace maps to queued content operation.
- Toolbar auto-expands for rename handoff.

### Proto v12

- Proto search island includes replace mode.
- It includes chips and launcher behavior.
- It does not implement real frontmatter operations.
- It does not implement Obsidian file rename constraints.

### Delta

- Sandbox is implementation authority for FnR.
- Stable is safety authority for preview-and-queue.
- Proto is UX authority for search/replace surface.

### Decision

- `KEEP_SANDBOX`: FnR state/service/change builders.
- `KEEP_STABLE`: preview-before-apply safety expectation.
- `TRANSLATE_PROTO`: replace/create chip interactions.
- `STABILIZE_BEFORE_PROMOTION`: token/template and regex behavior need user-visible validation.

### Next Action

- Define FnR capability table by domain.
- Domains: content, file, property, value, tag.
- Columns: find, replace, preview, queue, diff, undo/remove before execute.

## 018. Queue And Mutation Engine

### Stable

- Stable has operation queue.
- Stable queue is central to trust.
- Stable has diff preview modal.
- Stable content replace queues changes.
- Stable frontmatter operations use `processFrontMatter`.
- Stable still has some direct destructive operations.
- Stable operations are closures, not serializable action plans.

### Sandbox

- Sandbox OperationQueueService is mutation safety core.
- It models mutable transactions.
- It models immutable VFS chains.
- It stages property operations.
- It stages file rename.
- It stages file move.
- It stages file delete.
- It stages content replace.
- It stages append links.
- It stages template apply.
- It stages tag operations.
- It supports diff review.
- It supports operation removal.
- It supports transaction replay.
- It supports node op conflict registry.
- It supports simulate changes.
- It chunks commits.
- It handles YAML/body split.
- It handles frontmatter serialization.
- It has a dual mutable/immutable path.

### Proto v12

- Proto queue stack is simulated.
- Queue stack has grouped rows.
- Queue stack has apply/execute design.
- It has design grammar but no real file mutation engine.
- Shard 04 says QueueStack needs operation previews and transactions.

### Delta

- Stable establishes user trust.
- Sandbox supplies real engine.
- Proto supplies row/windowing design.
- The future queue must combine stable safety, sandbox engine, and proto queue presentation.

### Decision

- `KEEP_STABLE`: queue-first user mental model and preview trust.
- `KEEP_SANDBOX`: OperationQueueService direction.
- `TRANSLATE_PROTO`: queue stack grouping/windowing where it improves UX.
- `STABILIZE_BEFORE_PROMOTION`: reconcile mutable/immutable paths before stable.

### Next Action

- Shard 06 should require a queue promotion checklist.
- Checklist should include all destructive operations.
- Checklist should include diff before apply.
- Checklist should include remove-before-execute.
- Checklist should include operation scope display.
- Checklist should include transaction serialization plan or explicit non-goal.

## 019. Diff Review

### Stable

- Stable has queue details modal.
- Stable can preview frontmatter and file path changes.
- Stable diff preview is a key trust feature.

### Sandbox

- Sandbox has serviceDiff for mutable VFS.
- Sandbox has serviceDiffSnapshot for immutable VFS chain.
- Sandbox computes frontmatter deltas.
- Sandbox computes line-based body hunks.
- Sandbox omits huge body diffs over safety limit.
- Sandbox viewDiff consumes diff shape.
- Sandbox tools page exposes diff review.

### Proto v12

- Proto queue stack implies reviewable operation rows.
- It does not implement real diff.
- It does not model file body/frontmatter diffs.

### Delta

- Diff review is product code territory.
- Stable and sandbox own this.
- Proto can inform presentation but not semantics.

### Decision

- `KEEP_STABLE`: preserve diff preview as user trust baseline.
- `KEEP_SANDBOX`: use shared FileDiff shape and diff services.
- `TRANSLATE_PROTO`: optional grouping/windowing only.
- `STABILIZE_BEFORE_PROMOTION`: unify mutable and snapshot diff paths.

### Next Action

- Define canonical diff input.
- Decide whether mutable transactions or immutable chain snapshots become source of truth.
- Define body diff size policy in user-facing terms.

## 020. Operations Scope

### Stable

- Stable has operation scope.
- Scope appears in settings and popups.
- Stable users understand selected/filtered/all-like operation targeting.
- Stable scope safety is important.

### Sandbox

- Sandbox operation scope can be auto.
- It can be selected.
- It can be filtered.
- Legacy `all` is normalized.
- `resolveVerifiedOperationScopeFiles` returns stale selected files.
- Scope feeds pageFilters.
- Scope feeds FnR.
- Scope feeds ServiceAPI.
- Scope feeds providers.
- Scope feeds queue planning.

### Proto v12

- Proto search/replace flow implies scope.
- Proto viewScope is a different concept.
- Proto filter stack and queue stack imply action targets.
- It does not define Obsidian file-scope safety.

### Delta

- Stable and sandbox should define mutation scope.
- Proto should not define mutation scope directly.
- Proto `viewScope` should not be confused with operation scope.

### Decision

- `KEEP_STABLE`: preserve scope transparency.
- `KEEP_SANDBOX`: use verified operation scope helpers.
- `TRANSLATE_PROTO`: only translate UI hints, not semantics.
- `STABILIZE_BEFORE_PROMOTION`: display resolved scope before destructive changes.

### Next Action

- Require every queued batch to expose target file count and source.
- Source should be selected, filtered, or empty.
- Auto scope should be explained in UI.

## 021. View Taxonomy

### Stable

- Stable has tree.
- Stable has grid for files.
- Stable has small grid mode for props.
- Stable has no virtualizer.
- Stable has render limit.
- Stable view taxonomy is simple.

### Sandbox

- Sandbox view modes include tree.
- Sandbox view modes include list.
- Sandbox view modes include table.
- Sandbox view modes include grid.
- Sandbox view modes include cards.
- Sandbox view modes include markmap.
- Platform view modes are tree/list/table/grid/cards.
- ViewHost switches renderers.
- ViewService builds render models.
- Renderers use TanStack virtualizer.
- Table uses TanStack table core.
- View contracts define capability and scale gates.
- Native class emission differs by renderer.

### Proto v12

- Proto v12 view taxonomy has engine.
- It has mode.
- It has orientation.
- It has viewScope.
- Engine can be lineal.
- Engine can be grid.
- Engine can be matrix.
- Engine can be canvas.
- Lineal modes include tree, cascade, master-detail.
- Grid modes include matrix, cards, masonry, table.
- Canvas modes include graph, mindmap, json-canvas.
- Orientation handles drill/indent/flat/accordion/columns/rows/container.
- Scoped view config can be global, per-level, or per-parent.

### Delta

- Stable taxonomy is too small for future.
- Sandbox taxonomy is implementation-backed but not as conceptually clean as proto.
- Proto taxonomy is the cleanest vocabulary but not runtime-backed.
- Future should merge sandbox view modes with proto axes.

### Decision

- `KEEP_SANDBOX`: ViewHost, renderers, view service, virtualizer direction.
- `TRANSLATE_PROTO`: engine/mode/orientation/viewScope vocabulary.
- `KEEP_STABLE`: do not break basic tree/grid familiarity.
- `STABILIZE_BEFORE_PROMOTION`: every supported view axis needs capability matrix and fallback.

### Next Action

- Create `ViewConfig` spec with proto axes.
- Map sandbox modes to proto axes.
- Mark unsupported proto engines as design-only.
- Define renderer capability table.

## 022. Scoped Views

### Stable

- Stable has no scoped view config model.
- Stable view config is mostly global/simple.

### Sandbox

- Sandbox has view modes per explorer.
- It has view field visibility.
- It has ViewHostService.
- It has node element masks.
- It has preset constraints.
- It does not yet expose proto-style per-level or per-parent view snapshots.

### Proto v12

- Proto viewScope can be off.
- Proto viewScope can be per-level.
- Proto viewScope can be per-parent.
- Parent focus emits `vm-focused-parent`.
- Parent overrides live in `view.parentViews`.
- Level overrides live in `view.levelViews`.
- `viewSnapshot()` strips internal scope metadata.

### Delta

- Proto has the strongest scoped-view design.
- Sandbox has the right architecture to host it later.
- Stable has no corresponding concept.

### Decision

- `TRANSLATE_PROTO`: scoped view vocabulary and parent/level override idea.
- `KEEP_SANDBOX`: implement through typed settings/services, not proto state shape.
- `STABILIZE_BEFORE_PROMOTION`: scope keys must use persistent provider identity.
- `DO_NOT_PROMOTE_AS_IS`: do not copy `_hiddenSecs` or DOM-only focus state into product schema.

### Next Action

- Decide override keying.
- Options: provider id, node domain key, path, depth, parent id, or stable occurrence id.
- Define what happens when nodes move or filters hide parents.

## 023. Renderer Scale And Performance

### Stable

- Stable has no virtualization.
- Stable uses render limits.
- Stable is simpler.
- Stable may be acceptable on small vaults.
- Stable cannot prove 50k/100k explorer behavior.

### Sandbox

- Sandbox uses TanStack virtualizer in tree/list/table/grid/cards.
- Sandbox has view scale contracts.
- Tree/list have 10k release gate.
- Tree/list have 50k must-pass target.
- Tree/list have 100k proof target.
- Table/grid/cards have 10k release gate.
- Table/grid/cards have 50k characterization target.
- PerfProbe has scroll burst scenarios.
- Smoke scripts exist for scroll.

### Proto v12

- Proto has rich visual renderers.
- Proto has Niagara side index.
- Proto has canvas demos.
- Proto has no product performance proof.
- Proto DOM query jumping must not be copied into virtualized runtime.

### Delta

- Sandbox owns performance direction.
- Stable owns small-vault trust.
- Proto owns visual ambition.
- Performance gates must decide which proto affordances are feasible.

### Decision

- `KEEP_SANDBOX`: virtualization, scale contracts, perf probe.
- `KEEP_STABLE`: small-vault responsiveness and simple fallback.
- `TRANSLATE_PROTO`: Niagara/visual modes only through virtualized-compatible services.
- `STABILIZE_BEFORE_PROMOTION`: no renderer should be stable without scale gate.

### Next Action

- Define release gate by view mode.
- Define proof target by view mode.
- Keep proto-only renderers behind experimental flag until measured.

## 024. Layout, Surfaces, And Navigation

### Stable

- Stable has one frame.
- It has bottom navigation.
- It has popup overlay router.
- It has queue island.
- It has active filters island.
- It has status bar.
- It is simple.
- It is coupled.

### Sandbox

- Sandbox has frame pages.
- Pages include ops.
- Pages include statistics.
- Pages include filters.
- It has frame navbar shell.
- It has dashboard mode.
- It has popup islands.
- It has overlay controller.
- It has page FAB definitions.
- It has dock/top/workspace tab surfaces.
- It has layout drop actions.
- It has detached leaves.
- It has Addons island.
- It has frame viewport controller.

### Proto v12

- Proto has sidebar mode.
- Proto has desktop monitor mode.
- Proto has both mode.
- Proto has i3-style panel tree.
- Proto has focused panel.
- Proto has panel config snapshots.
- Proto has top islands and bottom islands.
- Proto has control island.

### Delta

- Stable layout is safe.
- Sandbox layout is powerful but requires hardening.
- Proto layout is visually and conceptually rich but not persistence-safe product code.

### Decision

- `KEEP_STABLE`: simple one-frame navigation remains required.
- `KEEP_SANDBOX`: frame pages, overlay controller, and layout service.
- `TRANSLATE_PROTO`: panel tree and island z-order only after state schema design.
- `STABILIZE_BEFORE_PROMOTION`: detached and dashboard behavior must be tested in real workspace layouts.

### Next Action

- Create layout persistence spec.
- Include sidebar/main/detached leaves.
- Include dashboard threshold.
- Include frame page order.
- Include focus restore.
- Include failure recovery.

## 025. Detached Leaves And Workspace Tabs

### Stable

- Stable does not have canonical detached tab registry.
- Stable opens one main Vaultman frame.
- This is less flexible but safer.

### Sandbox

- Sandbox has canonical `TabId`.
- Detachable tabs include explorer-files.
- They include explorer-tags.
- They include explorer-props.
- They include explorer-values.
- They include content.
- They include explorer-outline.
- They include page-tools.
- They include queue.
- View types are deterministic.
- Detached state persists under `independentLeaves`.
- Restore happens after layout ready.
- DetachedTabHost renders detached content.

### Proto v12

- Proto has workspace panel tree.
- Proto has inactive panel config snapshots.
- Proto has focused panel.
- Proto suggests a richer workspace split than detached leaves.

### Delta

- Sandbox detached leaves are real.
- Proto panel tree is design target.
- Stable is fallback.
- Promotion should not jump from stable to full panel tree.

### Decision

- `KEEP_SANDBOX`: detached leaves as first implementation step.
- `TRANSLATE_PROTO`: panel tree later, not immediate.
- `KEEP_STABLE`: single-frame fallback.
- `STABILIZE_BEFORE_PROMOTION`: restore idempotence and mobile behavior must be proven.

### Next Action

- Add detached-leaf compatibility table.
- Include each tab id.
- Include whether it can run standalone.
- Include which state is shared and which is local.

## 026. Theme, Style, And Native Identity

### Stable

- Stable respects Obsidian theme variables.
- Stable visual layer is simpler.
- Stable uses simple glass blur body variable.
- Stable CSS is pre-token-layer relative to sandbox.
- Stable visual system is less ambitious but safer.

### Sandbox

- Sandbox has ThemeService.
- It has active preset id.
- It has custom presets.
- It has UI mode.
- It has UI identity.
- It has faint mode.
- It has reduced motion.
- It has window focus.
- It has foul detection.
- It injects sanitized custom CSS tokens.
- It has Elastic UI settings.
- It has native/vaultman built-in presets.
- It has SCSS partial taxonomy.
- It has native class emission.
- It has Bases-like table/cards classes.

### Proto v12

- Proto v12 has rich visual tokens.
- It has themes.
- It has accents.
- It has control island theme controls.
- It has Nautilus visual grammar.
- It has semantic icon visuals.
- It has shell CSS classes.
- It is design evidence, not product CSS.

### Delta

- Stable theme respect is non-negotiable.
- Sandbox theme service is implementation target.
- Proto visual language should feed tokens and presets.
- Native mimicry must be managed carefully.

### Decision

- `KEEP_STABLE`: Obsidian theme respect.
- `KEEP_SANDBOX`: ThemeService, Elastic UI, sanitized custom CSS, SCSS module structure.
- `TRANSLATE_PROTO`: visual tokens, Control Island grouping, Nautilus language.
- `STABILIZE_BEFORE_PROMOTION`: native class mimicry and foul detection need policy.

### Next Action

- Build style token reconciliation map.
- Map proto tokens to sandbox SCSS/custom properties.
- Mark Obsidian-native classes as fragile.
- Add native identity compatibility notes.

## 027. Icons, Badges, And Semantic Visual Language

### Stable

- Stable has Iconic bridge.
- Stable uses icons practically.
- Stable has less formal semantic badge language.
- Stable status bar gives compact counts.

### Sandbox

- Sandbox has Iconic service.
- Sandbox has badge service.
- Badge kinds include set.
- Badge kinds include rename.
- Badge kinds include convert.
- Badge kinds include delete.
- Badge kinds include filter.
- Badge kinds include node-note.
- FAB badges include queue and filters.
- Active badges visualize staged state.
- Hover badges visualize possible actions.
- Contradictions can be expressed as delete-with-mutation.
- Overlay projection maps operations/filters into badges and highlights.

### Proto v12

- Proto has `icons.jsx`.
- Proto has semantic icon system.
- Proto has scene/node icon service concepts.
- Proto has icon picker popup.
- Proto has icon override concepts.
- Shard 04 says semantic icon pack behavior should be preserved as design evidence.

### Delta

- Sandbox badge semantics are stronger for runtime.
- Proto icon system is stronger for design language.
- Stable Iconic bridge is proven integration.

### Decision

- `KEEP_STABLE`: external Iconic integration must keep working or degrade gracefully.
- `KEEP_SANDBOX`: badges/overlay semantic layers.
- `TRANSLATE_PROTO`: semantic icon pack and icon picker concepts.
- `STABILIZE_BEFORE_PROMOTION`: icon override persistence and provider identity needed.

### Next Action

- Define semantic icon source hierarchy.
- Candidate order: provider metadata, user override, Iconic, proto-style pack, fallback.
- Define badge conflict rules.

## 028. Native Bindings And Node Notes

### Stable

- Stable has context menu integration.
- Stable has Iconic bridge.
- Stable has linter bridge.
- Stable bridges external/internal Obsidian surfaces without a full adapter layer.
- Shard 02 flags fragility.

### Sandbox

- Sandbox has NodeBindingService.
- It creates alias tokens for non-file nodes.
- It opens or creates binding notes.
- It routes multiple alias matches to filters.
- It has native surface binding service.
- It binds tags and folders on native Obsidian DOM surfaces.
- It registers hover link source.
- It has native click interceptor as a parallel or older path.
- It can bind plugin and snippet aliases.

### Proto v12

- Proto has context menu and icon picker.
- Proto has semantic icons.
- Proto has surface action concepts.
- Proto does not model Obsidian native DOM fragility.

### Delta

- Sandbox is much more ambitious.
- Stable shows the risk of fragile external bridges.
- Proto provides action language but not adapter safety.

### Decision

- `KEEP_SANDBOX`: node-note binding as a product differentiator.
- `KEEP_STABLE`: context menu integration and external bridge caution.
- `TRANSLATE_PROTO`: surface action vocabulary.
- `STABILIZE_BEFORE_PROMOTION`: native DOM selectors require adapter/fragility registry.
- `DO_NOT_PROMOTE_AS_IS`: duplicate native binding paths should be reconciled.

### Next Action

- Create native integration registry.
- Include selector sources.
- Include Obsidian version assumptions.
- Include fallback behavior.
- Include mobile behavior.
- Include duplicate path cleanup.

## 029. Context Menus And Command Routing

### Stable

- Stable has context menu service.
- Stable has menu curator.
- Stable can hide or curate menu items.
- Stable linter bridge uses external command ids/settings.
- Stable is useful but fragile here.

### Sandbox

- Sandbox has ContextMenuService.
- Sandbox has command registration service.
- Commands open filters.
- Commands open queue.
- Commands process queue.
- Commands open view menu.
- Commands open sort menu.
- Commands open Vaultman.
- Commands open diff.
- Commands open FnR.
- Commands are PerfMeter-wrapped.
- Commands use plugin-level hooks into mounted Svelte.

### Proto v12

- Proto context menu is design surface.
- Proto suggests surface action routing.
- Proto control island and popups imply command routing.
- Proto does not implement Obsidian command palette.

### Delta

- Stable proves context menu value.
- Sandbox command service is better structured.
- Proto action vocabulary should be translated into command router, not copied.

### Decision

- `KEEP_STABLE`: menu curator value and context integration.
- `KEEP_SANDBOX`: command registration service and PerfMeter wrapping.
- `TRANSLATE_PROTO`: surface action taxonomy.
- `STABILIZE_BEFORE_PROMOTION`: plugin-level hooks need lifecycle guarantees.

### Next Action

- Define command router contract.
- Include command id.
- Include availability check.
- Include target surface.
- Include mounted-component hook.
- Include fallback behavior.

## 030. DnD And Direct Manipulation

### Stable

- Stable has limited direct manipulation.
- Stable does not expose the same DnD system.
- Stable should remain safe.

### Sandbox

- Sandbox has DndService.
- It supports node, row, group, column, tab, filter, and card subjects.
- It supports reorder, move, apply-template, detach-tab, attach-tab, and move-tab-surface operations.
- It has alias-aware DnD.
- It has DnD-kit adapter.
- It has manual DnD service.
- It can stage block move into immutable chains.
- It can write markdown and custom DataTransfer payloads.
- This is powerful.
- It is also transitional.

### Proto v12

- Proto has stack/window DnD feel.
- Proto has cell rearrange interaction.
- Proto has panel tree manipulation.
- Proto has container grid and drag-like visual grammar.
- It does not implement vault mutation semantics.

### Delta

- Sandbox is implementation leader but risky.
- Proto is interaction leader.
- Stable should not inherit DnD breadth blindly.

### Decision

- `KEEP_SANDBOX`: core DnD abstractions if hardened.
- `TRANSLATE_PROTO`: cell rearrange and panel layout interactions.
- `STABILIZE_BEFORE_PROMOTION`: block move and alias effects need safety proof.
- `DO_NOT_PROMOTE_AS_IS`: do not ship all DnD paths as stable without cleanup.

### Next Action

- Classify DnD operations by risk.
- Low risk: reorder UI-only.
- Medium risk: tab detach/attach.
- High risk: move file/block/frontmatter injection.
- Gate high risk behind queue/preview.

## 031. Bases Interop

### Stable

- Stable has Bases settings.
- Stable runtime Bases interop was not found in shard 02.
- Stable settings are placeholder-like.
- Stable should not claim full Bases support.

### Sandbox

- Sandbox has BasesImportTargetsIndex.
- Sandbox has Bases import provider.
- Sandbox has `previewBasesImport`.
- Sandbox parses YAML objects.
- Sandbox extracts markdown fenced blocks.
- Sandbox converts global filters.
- Sandbox converts view filters.
- Sandbox combines filters.
- Sandbox reports unsupported expressions.
- Sandbox reports parse errors.
- Sandbox applies converted filter to FilterService.

### Proto v12

- Proto has Bases-like visual grammar.
- Proto table/cards can mimic Bases classes.
- Proto does not define real Bases YAML conversion.

### Delta

- Sandbox is the first real Bases import path.
- Stable has only settings evidence.
- Proto has style inspiration.
- Bases interop must be treated as experimental until expression coverage is known.

### Decision

- `KEEP_SANDBOX`: Bases import preview/report/apply flow.
- `KEEP_STABLE`: do not overpromise based on settings.
- `TRANSLATE_PROTO`: Bases visual classes only if compatible with Obsidian theme.
- `STABILIZE_BEFORE_PROMOTION`: unsupported expression reporting must be user-visible.

### Next Action

- Build Bases expression support matrix.
- Include applied expressions.
- Include unsupported expressions.
- Include parse error cases.
- Include sample imports.

## 032. ServiceAPI And Programmatic Surface

### Stable

- Stable does not expose ServiceAPI.
- Stable operations are internal UI flows.
- Stable queue is not mediated by plan/enqueue API.

### Sandbox

- Sandbox ServiceAPI has read.
- It has plan.
- It has enqueue.
- It reports counts.
- It reports index health.
- It reports scope summary.
- It reports validation errors.
- It reports rollback limits.
- It detects destructive risk.
- It requires confirmation for destructive plans.
- It adds changes to queue.
- It can block enqueue.

### Proto v12

- Proto has no plugin API.
- Proto emits simple events and state mutations.
- Proto cannot define public programmatic API.

### Delta

- ServiceAPI is a sandbox-only implementation candidate.
- It could become a core safety boundary.
- It is not stable-proven.

### Decision

- `KEEP_SANDBOX`: ServiceAPI is promising.
- `STABILIZE_BEFORE_PROMOTION`: mark experimental until contracts are frozen.
- `DO_NOT_PROMOTE_AS_IS`: do not imply public API stability yet.

### Next Action

- Decide if ServiceAPI is internal or public.
- If public, define versioning.
- If internal, name it accordingly.
- Add risk taxonomy beyond action-string heuristics.

## 033. Diagnostics And Product Tooling

### Stable

- Stable has limited runtime telemetry.
- Stable has status bar counts.
- Stable has practical adjacent tools like linter and curator.
- Stable does not have a product ops log.
- Stable does not have global perf probe.

### Sandbox

- Sandbox has OpsLogService.
- Sandbox has PerfMeter.
- Sandbox has `__vaultmanPerfProbe`.
- Sandbox has pageToolsOpsLog.
- Sandbox has scroll smoke scripts.
- Sandbox has perf scenarios for filters/search/scroll/projection/media/view toggles/box selection.
- Sandbox has event loop delay metrics.
- Sandbox has blank-frame metrics.
- Sandbox has long animation frame metrics.
- Sandbox has scroll smoke overlay.
- Sandbox has build/security/SBOM scripts in package metadata.

### Proto v12

- Proto has visual prototype behavior.
- Proto has no Obsidian runtime telemetry.
- Proto performance is not proof.

### Delta

- Sandbox diagnostics are necessary for canary.
- They may be too dev-facing for stable UI.
- Stable users still need compact status/count feedback.

### Decision

- `KEEP_STABLE`: status/count feedback.
- `KEEP_SANDBOX`: diagnostics as canary/beta tooling.
- `STABILIZE_BEFORE_PROMOTION`: decide which diagnostics stay visible in stable.
- `DO_NOT_PROMOTE_AS_IS`: do not expose raw dev probes as normal-user surface without policy.

### Next Action

- Split diagnostics into user-facing, support-facing, and developer-only.
- User-facing: queue/count/status.
- Support-facing: ops log maybe hidden setting.
- Developer-only: global perf probe and smoke overlay.

## 034. Linter And Curator

### Stable

- Stable has linter bridge.
- Stable has menu curator.
- Shard 02 marks both as practical adjacent-workflow value.
- Linter bridge depends on another plugin's internal settings and command ids.
- Menu curator edits or hides menu behavior.

### Sandbox

- Sandbox tools page mounts MenuCuratorPanel.
- Sandbox pageTools contains layout/ops/diff surfaces.
- Linter tab in sandbox source exists but appears minimal.
- Sandbox focus moved to broader tools/layout/ops log.

### Proto v12

- Proto tools tab defaults to curator in root state.
- Proto ToolsPage details are lightly covered.
- Proto does not validate external plugin bridges.

### Delta

- Stable linter/curator features are product-adjacent strengths.
- Sandbox has curator continuity but less evidence of linter maturity.
- Proto references tools but does not define implementation.

### Decision

- `KEEP_STABLE`: curator/linter value should not be forgotten.
- `KEEP_SANDBOX`: tools page as location for these surfaces.
- `STABILIZE_BEFORE_PROMOTION`: external plugin bridges need adapter contracts.

### Next Action

- Decide whether linter remains a supported product feature.
- If yes, define an adapter with command ids, settings paths, and fallback behavior.
- If no, mark stable linter as legacy and remove claims from future docs.

## 035. Statistics And Status Feedback

### Stable

- Stable has statistics page.
- Stable has bottom status bar.
- Stable status bar summarizes total, filtered, selected, queued, property, and value counts.
- This is a strength.
- It gives compact operational feedback.

### Sandbox

- Sandbox has statistics page.
- It supports vault, filtered, and selected scopes.
- It computes file/folder/tag/property/operation counts.
- It can compute links and word counts.
- It limits word count to filtered/selected for cost.
- It can preview notes via MarkdownRenderer.
- Sandbox has ops log page.
- Sandbox has queued/filter badge counts in frame.

### Proto v12

- Proto has stats page state.
- It has dashboard/addon surfaces.
- It has visual status surfaces.
- It does not implement real vault statistics.

### Delta

- Stable compact status should be preserved.
- Sandbox statistics are richer.
- Proto can inspire layout placement.

### Decision

- `KEEP_STABLE`: compact count ledger.
- `KEEP_SANDBOX`: scoped statistics and note preview.
- `TRANSLATE_PROTO`: dashboard placement.
- `STABILIZE_BEFORE_PROMOTION`: expensive stats must remain bounded.

### Next Action

- Define stats cost policy.
- Define which counts update live.
- Define which counts require user action.
- Define fallback for large vaults.

## 036. Mobile And Platform Compatibility

### Stable

- Stable manifest says `isDesktopOnly:false`.
- Shard 02 did not find explicit platform gate.
- Stable has simpler UI.
- Simpler UI lowers risk but does not prove mobile support.

### Sandbox

- Sandbox manifest also says `isDesktopOnly:false`.
- Sandbox has desktop-heavy surfaces.
- It has detached workspace leaves.
- It has native DOM selectors.
- It has ResizeObserver-heavy virtualized views.
- It has DnD.
- It has hover badges.
- It has mouse gesture configs.
- It has native hover-link behavior.
- Shard 03 flags mobile uncertainty.

### Proto v12

- Proto v12 has mobile sidebar shell.
- It also has desktop monitor shell.
- It is visual/design-first.
- It does not prove Obsidian mobile runtime behavior.

### Delta

- All streams claim or imply mobile needs.
- None of the read shards prove mobile.
- Sandbox increases platform risk.

### Decision

- `KEEP_STABLE`: simple stable layout is safer baseline.
- `TRANSLATE_PROTO`: mobile sidebar shell can inform responsive behavior.
- `STABILIZE_BEFORE_PROMOTION`: mobile/platform gate is required.
- `DO_NOT_PROMOTE_AS_IS`: do not release sandbox breadth as mobile-compatible without validation.

### Next Action

- Add platform gate.
- Identify desktop-only APIs.
- Identify hover/mouse-only interactions.
- Identify detached leaf support on mobile.
- Decide whether manifest should remain `isDesktopOnly:false`.

## 037. Security And Mutation Safety

### Stable

- Stable uses Obsidian frontmatter APIs.
- Stable has queue preview for many changes.
- Stable has some direct destructive operations.
- Stable has external bridge risks.

### Sandbox

- Sandbox queues many operation kinds.
- Sandbox supports destructive risk detection in ServiceAPI.
- Sandbox supports diff review.
- Sandbox supports operation scope verification.
- Sandbox has native DOM interception.
- Sandbox has custom CSS injection with sanitization.
- Sandbox has DnD payloads.
- Sandbox has template application.
- Sandbox has regex/content replacement.
- Sandbox has alias note creation.

### Proto v12

- Proto has no real vault mutation.
- Proto has no Obsidian security boundary.
- Proto uses globals and DOM.
- Proto should not be copied as integration pattern.

### Delta

- Sandbox has the most safety machinery.
- Sandbox also has the most risk surface.
- Stable has less machinery but less surface.
- Proto has design but no safety proof.

### Decision

- `KEEP_STABLE`: user trust and preview mental model.
- `KEEP_SANDBOX`: queue/diff/scope safety infrastructure.
- `STABILIZE_BEFORE_PROMOTION`: harden every path that can mutate vault files, settings, CSS, or native UI.
- `DO_NOT_PROMOTE_AS_IS`: no direct copy of proto global/DOM patterns.

### Next Action

- Build mutation surface inventory.
- Columns: source UI, operation kind, target files, preview, queue, confirmation, rollback limit, direct mutation.
- Block stable promotion on unresolved direct destructive paths.

## 038. Build, Packaging, And Release Tooling

### Stable

- Stable has smaller package surface.
- Stable is the release baseline.
- Stable should not contain AI workflow files on main.
- Stable release metadata is coherent.

### Sandbox

- Sandbox uses `vite-plus`.
- Sandbox uses Svelte 5.
- Sandbox uses strict TypeScript.
- Sandbox uses UnoCSS and SCSS.
- Sandbox outputs CommonJS plugin bundle.
- Sandbox externalizes Obsidian/Electron/CodeMirror/Node builtins.
- Sandbox scripts include dev/build/build:plugin/version/lint/check/verify.
- Sandbox scripts include scroll smoke.
- Sandbox scripts include security audit.
- Sandbox scripts include SBOM release.
- Sandbox scripts include dead export and dependency audits.
- Sandbox package metadata is broader and more modern.

### Proto v12

- Proto v12 is loaded as HTML plus JSX scripts.
- It loads 13 files in script order.
- It is not the plugin build pipeline.
- It should not define production bundling.

### Delta

- Sandbox build pipeline is the practical future.
- Stable packaging is release authority.
- Proto build shape is irrelevant to plugin packaging.

### Decision

- `KEEP_SANDBOX`: modern build pipeline for reconstruction branch.
- `KEEP_STABLE`: stable release packaging discipline.
- `DO_NOT_PROMOTE_AS_IS`: do not let proto script-order architecture leak into product build.
- `STABILIZE_BEFORE_PROMOTION`: align package/manifest/versions labels with stream policy.

### Next Action

- Shard 06 should include release-file checklist.
- Checklist: package version, manifest version, versions.json, changelog, branch, AI file exclusion, SBOM/security audit policy.

## 039. SCSS And Design Implementation

### Stable

- Stable visual layer is in `styles.css`.
- It respects Obsidian CSS variables.
- It has simpler styling.
- It has less tokenization.

### Sandbox

- Sandbox has many SCSS partials.
- It has tokens.
- It has global styles.
- It has elastic styles.
- It has animations.
- It has badges.
- It has explorer UI.
- It has settings.
- It has statistics.
- It has tabs.
- It has filters page.
- It has grid.
- It has table.
- It has tree.
- It has cards.
- It has virtual list.
- It has glass overlays.
- It has v3 layout/nav/popups.
- It has queue and diff view styles.
- It has popup islands.
- It has native/Bases mimicry surfaces.

### Proto v12

- Proto has rich visual classes.
- It has theme/accent design.
- It has Nautilus visual grammar.
- It has Control Island grouping.
- It has stack island/windowing behavior.
- It has semantic icon pack behavior.

### Delta

- Stable ensures Obsidian theme respect.
- Sandbox gives product CSS architecture.
- Proto gives high-level visual target.

### Decision

- `KEEP_STABLE`: theme respect and restrained Obsidian compatibility.
- `KEEP_SANDBOX`: SCSS modular surface and token direction.
- `TRANSLATE_PROTO`: visual grammar into tokens/components, not direct CSS copy.
- `STABILIZE_BEFORE_PROMOTION`: avoid native class drift and one-off style duplication.

### Next Action

- Create visual token crosswalk.
- Stable CSS var.
- Sandbox token.
- Proto visual class/intent.
- Promotion status.

## 040. Internationalization And Text Surface

### Stable

- Stable has user-facing labels and settings text.
- Shard 02 did not focus i18n deeply.
- Stable has functional user-facing copy.

### Sandbox

- Sandbox has large i18n files.
- `src/index/i18n/en.ts` is large.
- Toolbar, pages, popups, ops log, settings, and command surfaces depend on translations.
- Expanded system breadth multiplies copy surface.

### Proto v12

- Proto is design prototype.
- It may use hardcoded labels.
- It does not define product i18n strategy.

### Delta

- Sandbox needs stronger i18n discipline than stable.
- Proto labels can inspire wording but not replace localization.

### Decision

- `KEEP_SANDBOX`: i18n integration.
- `KEEP_STABLE`: user familiarity where labels already exist.
- `TRANSLATE_PROTO`: names only after product terminology review.
- `STABILIZE_BEFORE_PROMOTION`: avoid shipping untranslated canary labels.

### Next Action

- Add copy/i18n audit to promotion spec.
- Include commands, settings, popups, badges, errors, and diagnostics.

## 041. External Dependencies

### Stable

- Stable dependency surface is smaller.
- It bridges Iconic and linter-like external behavior.
- Smaller dependency surface is safer.

### Sandbox

- Sandbox depends on Svelte 5.
- It depends on TanStack virtual.
- It depends on TanStack table core.
- It depends on DnD-kit Svelte.
- It depends on git-diff-view Svelte.
- It depends on Bits UI.
- It depends on UnoCSS.
- It depends on Obsidian runtime APIs.
- It touches CodeMirror-like DOM surfaces indirectly through selectors.

### Proto v12

- Proto runs as script-loaded prototype.
- It is not the plugin dependency model.
- It uses design/runtime libraries only in prototype context.

### Delta

- Sandbox has more dependency power and risk.
- Stable has less dependency risk but less capability.
- Proto dependency model should not decide product dependencies.

### Decision

- `KEEP_SANDBOX`: dependencies that support real product features.
- `KEEP_STABLE`: minimalism as release pressure.
- `STABILIZE_BEFORE_PROMOTION`: dependency audit and bundle implications required.

### Next Action

- Mark each sandbox runtime dependency as required, optional, or experimental.
- Tie each required dependency to a user-facing system.

## 042. Stable Contributions To Future

- Stable contributes release discipline.
- Stable contributes simple open path.
- Stable contributes queue-first mental model.
- Stable contributes frontmatter-safe execution.
- Stable contributes diff preview expectation.
- Stable contributes content replacement preview.
- Stable contributes Obsidian theme respect.
- Stable contributes compact status/count feedback.
- Stable contributes small-vault ergonomics.
- Stable contributes property/tag/file explorer basics.
- Stable contributes filter templates.
- Stable contributes linter/curator adjacent-workflow evidence.
- Stable contributes caution against over-shipping reconstruction.

## 043. Stable Things To Retire Or Replace

- Retire god frame boundaries.
- Retire direct panel method coupling.
- Retire direct destructive operations.
- Replace local selection fragmentation.
- Replace render limits with virtualized scale-aware rendering.
- Replace foreign-plugin access with adapter contracts.
- Replace closure operations with inspectable plans where possible.
- Replace pre-token CSS with tokenized style where safe.
- Replace placeholder Bases settings with real capability labels.
- Replace parent-frame callback-heavy popups with service/router boundaries.

## 044. Sandbox Contributions To Future

- Sandbox contributes service graph.
- Sandbox contributes provider taxonomy.
- Sandbox contributes indexes.
- Sandbox contributes explorer data plane.
- Sandbox contributes ViewHost.
- Sandbox contributes view service.
- Sandbox contributes semantic overlays.
- Sandbox contributes operation queue/VFS.
- Sandbox contributes diff services.
- Sandbox contributes FnR system.
- Sandbox contributes Bases import.
- Sandbox contributes node binding.
- Sandbox contributes native surface binding.
- Sandbox contributes DnD abstractions.
- Sandbox contributes ThemeService.
- Sandbox contributes layout service.
- Sandbox contributes detached leaves.
- Sandbox contributes diagnostics.
- Sandbox contributes SCSS architecture.
- Sandbox contributes strict build/runtime modernization.

## 045. Sandbox Things To Stabilize Before Promotion

- Stream metadata mismatch.
- Plugin-level mutable hooks.
- Queue mutable/immutable dual path.
- Legacy tree/snapshot dual path.
- Native binding service/interceptor duplication.
- Manual DnD vs DnD-kit paths.
- Operation scope display.
- ServiceAPI risk detection.
- Native DOM selectors.
- Mobile support.
- Detached leaf restore.
- Settings migration.
- Theme custom CSS injection policy.
- View cache invalidation.
- Overlay false-positive matching.
- Bases expression coverage.
- FnR template and regex behavior.
- Diagnostic visibility.
- Dependency audit.

## 046. Proto v12 Contributions To Future

- Proto contributes view vocabulary.
- Proto contributes engine/mode/orientation/viewScope axes.
- Proto contributes cascade.
- Proto contributes master-detail.
- Proto contributes grid drill.
- Proto contributes container grid.
- Proto contributes control island grouping.
- Proto contributes search island UX.
- Proto contributes stack island windowing.
- Proto contributes queue/filter stack presentation.
- Proto contributes semantic icon language.
- Proto contributes Nautilus file-manager grammar.
- Proto contributes panel tree ambition.
- Proto contributes Niagara side index.
- Proto contributes surface action vocabulary.
- Proto contributes visual polish direction.

## 047. Proto v12 Things Not To Copy

- Do not copy global script order as architecture.
- Do not copy `window.*` integration.
- Do not copy synthetic data builders.
- Do not copy DOM query jumping for navigation.
- Do not copy stale desktop taxonomy.
- Do not copy mock queue execution.
- Do not copy filter stack as if it were executable AST.
- Do not copy root monolithic state into plugin code.
- Do not copy panel config snapshots without persistence schema.
- Do not copy icon overrides without scope/persistence model.
- Do not copy visual classes without Obsidian theme compatibility.

## 048. Missing Beta Gate

- Observed workspace has no visible `dev`, `beta`, or `nightly` branch.
- Shard 01 already records this.
- Theoretical flow needs middle validation.
- Stable cannot validate full sandbox breadth directly.
- Sandbox cannot self-certify stable readiness.
- Proto cannot validate runtime behavior.
- Therefore a missing beta gate is a process risk.
- It is especially risky for layout.
- It is especially risky for mobile.
- It is especially risky for DnD.
- It is especially risky for native bindings.
- It is especially risky for queue mutations.
- It is especially risky for settings migration.

## 049. Promotion Priority Matrix

| Priority | Promote candidate | Source | Reason |
|---|---|---|---|
| P0 | release metadata fix | shard 01 | labels must match maturity |
| P0 | queue safety contract | shards 02/03 | mutations define trust |
| P0 | open path contract | shards 02/03 | user must always reach product |
| P0 | operation scope display | shards 02/03 | prevents accidental bulk edits |
| P1 | provider/data-plane baseline | shard 03 | core architecture direction |
| P1 | ViewConfig taxonomy spec | shards 03/04 | aligns implementation with proto language |
| P1 | settings migration map | shards 02/03/04 | prevents user config loss |
| P1 | mobile/platform gate | shards 02/03/04 | manifest says mobile-capable |
| P2 | native binding registry | shards 02/03 | reduces Obsidian DOM fragility |
| P2 | DnD risk gating | shards 03/04 | direct manipulation is high-risk |
| P2 | Bases expression matrix | shards 02/03 | settings vs runtime mismatch |
| P2 | diagnostics visibility policy | shard 03 | canary tools need stable policy |
| P3 | Nautilus visual grammar | shard 04 | design polish after safety |
| P3 | Control Island translation | shard 04 | personalization after schema |
| P3 | Niagara side index | shard 04 | requires virtualized integration |

## 050. Copy/Translate/Keep/Block Summary

### Copy Directly

- Very little should be copied directly.
- Stable release metadata should remain authoritative for stable.
- Stable simple open path should remain.
- Sandbox provider names can be used as current implementation vocabulary.
- Sandbox `TabId` registry can remain as implementation vocabulary.
- Sandbox operation constants can remain as implementation vocabulary.
- Sandbox view mode names can remain until ViewConfig migration.

### Keep As Runtime Baseline

- Sandbox service graph.
- Sandbox provider contracts.
- Sandbox indexes.
- Sandbox data plane.
- Sandbox ViewHost/renderers.
- Sandbox queue/VFS.
- Sandbox filter service and active filters index.
- Sandbox FnR services.
- Sandbox ServiceAPI as internal candidate.
- Sandbox ThemeService.
- Sandbox layout/leaf detach services.
- Sandbox diagnostics for canary.

### Translate From Proto

- View taxonomy axes.
- Control Island grouping.
- Search Island UX.
- Stack Island presentation.
- Queue/filter stack presentation.
- Nautilus/grid/container visual grammar.
- Semantic icon pack.
- Panel tree ambition.
- Niagara side index.
- Surface action vocabulary.

### Preserve From Stable

- User trust.
- Small open path.
- Queue-first expectation.
- Diff preview expectation.
- Content replace preview expectation.
- Obsidian theme respect.
- Compact status counts.
- Filter templates.
- Simple files/props/tags explorer affordances.
- Caution around external bridge fragility.

### Block Until Hardened

- Sandbox metadata as beta/stable.
- Direct destructive operations.
- Queue dual-path ambiguity.
- Native DOM selectors without registry.
- DnD high-risk operations.
- Mobile compatibility claims.
- Settings migrations.
- Public ServiceAPI claims.
- Proto globals.
- Proto mock queue/filter semantics.

## 051. Open Questions For Shard 06

- What is the exact stream label correction for sandbox?
- Should `1.1.0-beta.1` remain or become a canary label?
- Where is the dev/beta validation branch supposed to live?
- Which sandbox services are stable-ready?
- Which sandbox services remain canary-only?
- Which stable behaviors are regression blockers?
- Which proto v12 terms become product type names?
- Does `ViewConfig` replace current view mode strings or wrap them?
- Does queue source of truth become mutable transactions or immutable VFS chains?
- Does ServiceAPI become public or internal?
- Is mobile support a hard release gate?
- Are detached leaves stable scope or canary scope?
- Are native node bindings stable scope or canary scope?
- Is DnD stable scope or canary scope?
- Does linter stay in product scope?
- Does curator stay in product scope?
- Which diagnostics are visible in stable?
- What is the minimum beta gate before stable?

## 052. Final Matrix Claim

- Stable is not obsolete.
- Stable is the user contract.
- Sandbox is not safe to promote blindly.
- Sandbox is the implementation candidate.
- Proto v12 is not code authority.
- Proto v12 is design vocabulary authority.
- The future product should be a reconciliation.
- The reconciliation should keep stable trust.
- The reconciliation should keep sandbox architecture.
- The reconciliation should translate proto language.
- The reconciliation should block unstable surfaces.
- Shard 06 should now turn this matrix into a promotion and reconciliation spec.
