---
title: Phase 07d - Test Inventory
created: 2026-05-17
status: done
source:
  - test/
---

# Phase 07d - Test Inventory

## Top-Level Counts

| Area | Files | Tests | Lines |
|---|---:|---:|---:|
| `test/component` | 77 | 391 | 13915 |
| `test/integration` | 8 | 13 | 514 |
| `test/unit/services` | 89 | 603 | 11321 |
| `test/unit/components` | 9 | 78 | 2482 |
| `test/unit/logic` | 6 | 38 | 664 |
| `test/unit/utils` | 9 | 44 | 665 |
| `test/unit/performance` | 3 | 13 | 701 |
| Other unit groups | 20 | 100 | 1193 |
| Helpers/support/fixtures/stubs | 8 | 0 | 1061 |

## Unit Service Files

`serviceViews`, `serviceQueue`, `serviceFilter`, `serviceNativeSurfaceBinding`, `serviceThemeRunes`, `serviceCommandsRegistration`, `serviceBasesInterop`, `serviceViewTableAdapter`, `serviceExplorerRowInput`, `serviceFnR`, `serviceSelection`, `serviceDnd`, `serviceActiveFiltersIndex`, `serviceContentIndex`, `serviceExplorerMediaCache`, `serviceDndSvelteAdapter`, `serviceFnRTemplate`, `serviceOverlayProjection`, `serviceOperationsIndex`, `serviceAPI`, `serviceExplorerLayersBatch`, `serviceMouse`, `serviceExplorerMediaDescriptor`, `serviceQueuePresentation`, `serviceLeafDetach`, `serviceNodeBinding`, `serviceExplorerScrollGeometry`, `serviceScroll`, `serviceDndMoveBlock`, `serviceNodeCardLayout`, `serviceManualDnd`, `serviceQueueDeletePurge`, `serviceDiff`, `serviceFnRIsland`, `serviceOpsLog`, `serviceNodeFieldVisibility`, `serviceExplorerDataPlane`, `badgeRegistry`, `serviceExplorer`, `serviceLayoutDetach`, `serviceGroups`, `serviceFnRTokenAllowlist`, `serviceNativeClickIntercept`, `serviceDndAliasAware`, `serviceQueueChains`, `serviceQueueRace`, `serviceActiveFilterPresentation`, `serviceFnRDateParser`, `serviceNodeRowMeasure`, `serviceNodeRowStyle`, `serviceOperationScope`, `perfMeter`, `serviceCMenu`, `serviceDecorate`, `serviceExplorerProjection`, `serviceOverlayState`, `serviceFnRPropSet`, `servicePluginsIndex`, `serviceVfsChain`, `serviceNodeCardStyle`, `serviceTextMeasurePretext`, `createNodeIndex`, `serviceTextMeasure`, `serviceMessage`, `serviceDiffSnapshot`, `serviceQueueFragility`, `serviceExplorerLayers`, `serviceFileQueue`, `serviceTagQueue`, `servicePortalResolver`, `serviceLayoutElastic`, `serviceFoulDetection`, `serviceSnippetsIndex`, `serviceTagsIndex`, `serviceLayout`, `serviceExplorerViewContract`, `serviceIcons`, `frameOverlaysSearchIsland`, `svarRemovalContract`, `serviceAdoption`, `serviceViewSize`, `serviceNavigation`, `serviceSorting`, `serviceAliasTokens`, `serviceFilesIndex`, `serviceAddonsIsland`, `serviceViewsZombie`, `serviceCache`, `servicePropsIndex`.

## Component Files

`ViewNodeList`, `addonsMarkdownPane`, `cmenuCreateBindingNote`, `cmenuSetAction`, `dashboard3Column`, `detachedTabHost`, `explorerContentSingleInput`, `frameDashboardAddons`, `frameFaintMultiWindow`, `frameVaultmanRootClasses`, `modalDeleteConflict`, `nativeClickInterceptor`, `navbarDock`, `navbarPillDoubleClickClear`, `navbarPillFabBadges`, `navbarQueueDoubleClickClear`, `navbarTabs`, `overlaySortMenu`, `overlayViewMenu`, `pageFiltersChooseMode`, `pageFiltersRenameHandoff`, `pageStatsNotePreview`, `pageToolsDiff`, `pageToolsLayout`, `pageToolsOpsLog`, `pageToolsPlugins`, `pageToolsSnippets`, `panelExplorerBadgeCollision`, `panelExplorerCrear`, `panelExplorerDeleteConflict`, `panelExplorerEmpty`, `panelExplorerSelection`, `perfProbeDom`, `popupIsland`, `primitiveFab`, `reactiveExplorers`, `searchboxIsland`, `searchboxIslandFlags`, `settingsLeafToggle`, `settingsUI`, `snippetMimicry`, `tabOutlinesRegistration`, `tabViewMenuDetach`, `themeServiceCustomStyleInjection`, `toolbarClickWeights`, `toolbarMenuPlacement`, `viewDiffChains`, `viewDiffNavbar`, `viewEmptyLanding`, `viewGridHoverBadges`, `viewGridSelection`, `viewMarkmap`, `viewNodeCards`, `viewNodeDelegation`, `viewNodeDynamicGeometry`, `viewNodeFieldVisibility`, `viewNodeMirrorClasses`, `viewNodeScrollJank`, `viewNodeSelectionGranularity`, `viewNodeTableHeightmap`, `viewNodeVariableScrollFallback`, `viewTableSelection`, `viewTableStress`, `viewTreeAdoptedNodes`, `viewTreeDecorations`, `viewTreeGridRowInputContract`, `viewTreeHoverBadges`, `viewTreeScrollFallback`, `viewTreeSelection`, `viewTreeVisualContract`, `virtualizerItemKeys`, `vmDialogPortal`, `vmPopoverIsland`.

## Other Test Groups

| Group | Files |
|---|---|
| integration | `debug-path`, `explicit-vault`, `fileCentricQueue`, `manual-register`, `performance`, `plugin`, `settingsMigration`, `setup`. |
| unit/components | `explorerContent`, `explorerFiles`, `explorerPlugins`, `explorerProps`, `explorerSnippets`, `explorerTags`, `explorerTagsSnapshot`, `frameOverlaysCommandHooks`, `framePages`. |
| unit/logic | `logicExplorer`, `logicExplorerSnapshot`, `logicKeyboard`, `logicProps`, `logicTags`, `logicsFiles`. |
| unit/utils | `autocomplete`, `dropDAutoSuggestionInput`, `filter-evaluator`, `inputModal`, `utilBadgeBubbling`, `utilDebounce`, `utilExplorerExpansion`, `utilPropIndex`, `utilPropType`. |
| unit/types | `typeElasticUi`, `typeObsidian`, `typeThemePreset`, `typeVfsImmutable`. |
| unit/styles | `compactControlScroll`, `elasticThemeStyles`, `faintAccentFocus`, `nodeDecorationStyles`, `nodeVirtualPositioning`, `toolbarIconCentering`, `treeAffordanceSpacing`. |
| unit/performance | `explorerNotebookNavigatorComparison`, `explorerPlatformSynthetic`, `stress`. |
| other unit | `serviceBadge`, `unoPreflightGate`, `themePresetsBuiltin`, `perfProbe`, `frameFiltersSearch`, `frameSearchSources`, `sanity`, `indexBasesImportTargets`, `noMutableVfsRule`, `mainThemeSettingsSync`, `explorerOutline`, `explorerAddOps`, `explorerScrollSmokeScript`. |
| helpers/support/fixtures | `obsidian-mocks`, `dom-obsidian-polyfill`, `gen-large-vault`, `bench-props`, `yaml`, `explorerSyntheticDataset`, `obsidian-stub`, `vm-snippet-smoke.css`. |
