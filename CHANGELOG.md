# Changelog

All notable changes to Vaultman will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **Version history note**: Versions 0.7–0.9 were previously labeled 1.2.2–1.3.0 during private
> internal development. Renumbered to 0.x to reserve 1.0.0 for the first public stable release.

## [1.1.0](https://github.com/Meibbo/Vaultman/compare/1.0.0...1.1.0) (2026-05-20)


### Features

* (structure): auditoría manual del dev con asistencia eventual de gemini 3 flash para modularizar el codigo y corregir error historicos de lienter. ([59b48c7](https://github.com/Meibbo/Vaultman/commit/59b48c7d45ca6d9d43b4ab80313a15fab183e877))
* **0-A:** add serviceNodeElementVisibility with NodeElementMask ([7450dbc](https://github.com/Meibbo/Vaultman/commit/7450dbce320b73a0b9cd7a857df4b4b0d196d91e))
* **0-A:** add serviceViewHost runes class + Symbol context keys ([26e5ce7](https://github.com/Meibbo/Vaultman/commit/26e5ce72e6e49d0510d1b2fb6248579f478efed3))
* **0-A:** add ViewHost shell with mode switch + context distribution ([3157c54](https://github.com/Meibbo/Vaultman/commit/3157c54e2026c50136e5afce34fc9aa38cedbde5))
* **0-A:** extend ExplorerViewFeatureContract with nativeDomEmission ([8d7f42e](https://github.com/Meibbo/Vaultman/commit/8d7f42eb54d667332c754ba4288658d81d9bb3c7))
* **0-A:** wire overlayViewMenu — viewModes filter + btnNodeElementsVisibility submenu ([2a98f13](https://github.com/Meibbo/Vaultman/commit/2a98f13a0d9a4967c7b5fcbca3520c93d2372b69))
* **0-b:** add built-in theme presets (native + vaultman) ([7180f96](https://github.com/Meibbo/Vaultman/commit/7180f96cda7034ed9d7f4c19670539020b286a98))
* **0-b:** add normalizeCustomPreset validator ([1576766](https://github.com/Meibbo/Vaultman/commit/157676656883f2b91a04e6f147be7d456377783d))
* **0-b:** add ThemePreset type contract + isBuiltInPreset ([c202c7f](https://github.com/Meibbo/Vaultman/commit/c202c7fb92da66df0e08e95569bdab5cd38cb2cf))
* **0-b:** add ThemeService preset registry state ([13b99bd](https://github.com/Meibbo/Vaultman/commit/13b99bd88babd53b13a5beaf42ed5e1a14010085))
* **0-b:** add ThemeService write methods ([d59ae4a](https://github.com/Meibbo/Vaultman/commit/d59ae4a0d646f691a592ff57c3456a37fe478cd7))
* **0-b:** adopt unocss-preset-theme for built-in token blocks ([4181889](https://github.com/Meibbo/Vaultman/commit/41818898e4c5d4fc02e2b4cd6c546231d909fed9))
* **0-b:** derive useNativeDom + rootClasses from active preset ([4d51b50](https://github.com/Meibbo/Vaultman/commit/4d51b506da8dc30c9cc0651adc16a6f561e203d7))
* **0-b:** extend ElasticUiSettings with themePresetId + customPresets ([d9f1135](https://github.com/Meibbo/Vaultman/commit/d9f11355d3bc12d1de44b0b6f038892c05bfc6f7))
* **0-b:** hydrate themePresetId + customPresets in ThemeService ([3ab453a](https://github.com/Meibbo/Vaultman/commit/3ab453a3b0d7c99199239b56ae280b6ca42450ee))
* **0-b:** inject runtime &lt;style&gt; element for custom theme presets ([5c2d018](https://github.com/Meibbo/Vaultman/commit/5c2d018075e7f178f3b2556d48e01805d16184a5))
* **0-b:** wire main.ts saveSettings sync + onunload dispose ([1410003](https://github.com/Meibbo/Vaultman/commit/14100031de72571c324b6acd47c2e17dbcdb1311))
* **0-h:** add list callback surface and panel mode ([e2bf5e5](https://github.com/Meibbo/Vaultman/commit/e2bf5e545fefad65f50903f043f0a3b9f28edfd5))
* adapt tree grid row inputs ([161d494](https://github.com/Meibbo/Vaultman/commit/161d4940c47c157750dbe7543df3bc4fe6c84619))
* add ContextMenuService scaffold (registry, panel menu, workspace hooks, curator) ([4a7d098](https://github.com/Meibbo/Vaultman/commit/4a7d098971d739ee2e2f44821f417acf53af3ec4))
* add ContextMenuService types and settings fields ([2f6c3d5](https://github.com/Meibbo/Vaultman/commit/2f6c3d5b1afe703dccb3a738783ebf9a4996b9d0))
* add explorer data-plane perf probes ([044e189](https://github.com/Meibbo/Vaultman/commit/044e1893a23cb364b02c72aded6dfb40e15140d0))
* add explorer node media field toggle ([b83c47c](https://github.com/Meibbo/Vaultman/commit/b83c47c5d467a2356ab29419f448162c0dd5d956))
* add explorer projection contract ([75d0af8](https://github.com/Meibbo/Vaultman/commit/75d0af8ddc0b0b515dfbc19b6a8fa0542c7d75d3))
* add explorer row input contract ([a10d633](https://github.com/Meibbo/Vaultman/commit/a10d63318f199106d18a327dbca4cab82f9d6759))
* add explorer scroll geometry coordinator ([abe6766](https://github.com/Meibbo/Vaultman/commit/abe6766dd06b0571ae42b961f8ef64f6eb11ea26))
* add explorer snapshot shared adapter contract ([d78120e](https://github.com/Meibbo/Vaultman/commit/d78120ecf4a59e881a79594e9422e83ddd08f68e))
* add explorer view feature contract ([7f6dcb8](https://github.com/Meibbo/Vaultman/commit/7f6dcb84c9d833e306835465755de45565047c1c))
* add main view (3-section layout), recover PropertyGridComponent (Iter.4) ([ea5f321](https://github.com/Meibbo/Vaultman/commit/ea5f3212412f1904f7e7d41ba1caddc64f4ffe8f))
* add MenuCuratorPanel and Layout tab stub in OperationsPage ([5779819](https://github.com/Meibbo/Vaultman/commit/577981907ba3c92abde3de8d02fc4ec9a51ae7f5))
* add props explorer snapshot adapter ([5056e9b](https://github.com/Meibbo/Vaultman/commit/5056e9b3be1c4c613c9d52a7002ed87ac3eb71d5))
* add sticky tree rows ([c1ab28b](https://github.com/Meibbo/Vaultman/commit/c1ab28b03bee699f94d818fba66955a3cf670f68))
* add tags snapshot adapter ([4937acf](https://github.com/Meibbo/Vaultman/commit/4937acf8be8c4982a2c2562805ff90a322977e37))
* **add-mode:** ADD op button in ViewMode popup; setAddMode on all explorers; 'add' PropertyAction ([df79f80](https://github.com/Meibbo/Vaultman/commit/df79f80b52f1b473a8489864fa18642b6648be8b))
* **adjustments:** change of names and styles. ([5a5fedb](https://github.com/Meibbo/Vaultman/commit/5a5fedb5a87f97c35e3eb6b4cf8f4e2cc6e4f5f2))
* **adjustments:** moved explorers as providers and added operations logic to leverage deletions over others. ([59336c9](https://github.com/Meibbo/Vaultman/commit/59336c91879293c639ebee683fb1de5a57b18761))
* **architecture:** adopted pnpm, vite+, oxlint and added new unit tests ([ebed71a](https://github.com/Meibbo/Vaultman/commit/ebed71aee96ed8d9775b344d5be20ad9a05d850d))
* batch explorer decoration layers ([89861aa](https://github.com/Meibbo/Vaultman/commit/89861aadb2073224e4a28ffea8f975a7ee7bb8c1))
* **comments:** new header, titles, subtitles and in-line comments styles ([4fb418f](https://github.com/Meibbo/Vaultman/commit/4fb418fb0e09a48fece7d8e600d76951ddc6a0f7))
* **compatibility:** first approach to bases imports and exports ([920f8c9](https://github.com/Meibbo/Vaultman/commit/920f8c9f25dfe2665eb3f2b0fa2e9370e52c8d5a))
* complete Vaultman rename — settings tab + types ([2bb2e0a](https://github.com/Meibbo/Vaultman/commit/2bb2e0a7ab1fa88cd99c37c9ac6fd5feaf47a066))
* **content:** add content tab i18n keys ([f15df2b](https://github.com/Meibbo/Vaultman/commit/f15df2b62f86d2a882a6ff7c136f7ce3cfbbbd0c))
* **content:** add CSS for content tab find & replace ([1d46d05](https://github.com/Meibbo/Vaultman/commit/1d46d051661f0ec582bf85014a83d5dc98e7bc46))
* **content:** add FIND_REPLACE_CONTENT signal constant ([d30f4f6](https://github.com/Meibbo/Vaultman/commit/d30f4f65a234ac40db29339a378decce1131e89d))
* **content:** handle FIND_REPLACE_CONTENT in OperationQueueService ([6bcb3ab](https://github.com/Meibbo/Vaultman/commit/6bcb3ab175309746562a5c607644f600fbbe2349))
* **debug:** fixed bad renaming of a const in VaultmanFrame.svelte ([0df2317](https://github.com/Meibbo/Vaultman/commit/0df2317ca3e64cc3d95fbd6d37b7a8a6ade4f6ff))
* **decorate:** actual service connected to the explorer ([00d93d2](https://github.com/Meibbo/Vaultman/commit/00d93d2e0151441807c8cd6296f75eca42176fbf))
* **diff:** add computeBodyHunks with LCS + size guard ([c1c23ed](https://github.com/Meibbo/Vaultman/commit/c1c23ed1a825f8a2fec06426269ce67d34a9ebd1))
* **diff:** add serviceDiff module with buildDiff and diffFm ([cfa6e57](https://github.com/Meibbo/Vaultman/commit/cfa6e57c38075a89ee9db31c414c543949a50f7d))
* docs updates ([83806ad](https://github.com/Meibbo/Vaultman/commit/83806ada798c85cbc325db109a42bd3bead3e768))
* **explorer:** Grid view, Cards view with drill-down, view toggles wired, 0-count fix ([833a305](https://github.com/Meibbo/Vaultman/commit/833a305eed5658071e1b801e737adff142c1d5be))
* **explorer:** Iter.14 complete — Logic/Panel/View split, UnifiedTreeView, context menus, Iconic, beta.11 ([fca8ab9](https://github.com/Meibbo/Vaultman/commit/fca8ab9be8d876c0835de5a3c469e74b0dff4ee1))
* **explorers:** add explorerQueue + explorerActiveFilters with Virtualizer&lt;T&gt; (Sub-A.4.2) ([ee4f2d4](https://github.com/Meibbo/Vaultman/commit/ee4f2d49f4d58d5c446692b4248b1d5cada0147d))
* **explorer:** search clear btn, active-filter highlight, tags-only mode, view options API ([4cef09d](https://github.com/Meibbo/Vaultman/commit/4cef09d3b221b5abc1eb2a648aa71bd58311966c))
* **explorer:** view toggles (prop icon/name), fix type icon default, 0-count hiding, tags click handlers ([7a46cd3](https://github.com/Meibbo/Vaultman/commit/7a46cd3afd5826d5e9fc4acf44d8ad04b7ef38b0))
* extract explorer overlay projection ([9dec4db](https://github.com/Meibbo/Vaultman/commit/9dec4db1cd29910b5698795118a8965b6c295fd2))
* **feauture:** new view grid toolbar items for in-folder navigation ([a8ffae4](https://github.com/Meibbo/Vaultman/commit/a8ffae4bd8e3cdd51ea20fb3ae70edb31951f307))
* **filters:** add persistent header with pill searchbox, fix files tab height ([aaaf9ce](https://github.com/Meibbo/Vaultman/commit/aaaf9ceb308ab686147e4d9983114d9d5d8af3c6))
* **filters:** create navbarFilters component ([2df26ad](https://github.com/Meibbo/Vaultman/commit/2df26ada364e331d6dbe2b43aca15108d4d948b3))
* **filters:** embed PropertyExplorerComponent, add 4-tab toolbar, remove inline prop browser ([47f280a](https://github.com/Meibbo/Vaultman/commit/47f280a54f5eb02f493a871dd8c8f6b49f917aae))
* **filters:** extract navbarTabs component ([12c5a9c](https://github.com/Meibbo/Vaultman/commit/12c5a9c149eab1a1475ade6658a6c3690768c8e3))
* **filters:** FiltersFilesTab — FileListComponent as standalone tab ([66bad84](https://github.com/Meibbo/Vaultman/commit/66bad84f3df62689ec1499130aa090a2d6285a38))
* **filters:** FiltersPropsTab — extracted PropertyExplorer tab ([e60a4e3](https://github.com/Meibbo/Vaultman/commit/e60a4e3698367e1be9b1744ca95af63be09acfc7))
* **filters:** FiltersTagsTab — mounts TagsExplorerComponent ([147e97a](https://github.com/Meibbo/Vaultman/commit/147e97ac8d077a981da0ef7c1db399fd7a28cac4))
* **filters:** glass-top navbarFilters sticky strip + prop card CSS ([a063c30](https://github.com/Meibbo/Vaultman/commit/a063c30f4c2590c889ce90bc8d2189dc4ff83e81))
* **filters:** redesign Active Filters popup with squircle buttons and slide-up animation ([27c8e65](https://github.com/Meibbo/Vaultman/commit/27c8e6574f4f30513685fdb9093d0614a91df9c0))
* **filters:** replace filter tree in Rules tab with inline property browser ([7f814a8](https://github.com/Meibbo/Vaultman/commit/7f814a87f499043bc93cbc4fb178fb4a6e68545b))
* **filters:** wire SortPopup to all three explorers; fix constn typo ([1f01572](https://github.com/Meibbo/Vaultman/commit/1f01572207e99ade25cc22c2ca98db696905a977))
* **filters:** wire ViewMode popup to explorers; PropsExplorer grid view ([cbea1a3](https://github.com/Meibbo/Vaultman/commit/cbea1a3320a2e0d9d04ca56cb465b7f0bd224fc9))
* finalize ADD operation mode and add badges for pending ops ([2b81ed4](https://github.com/Meibbo/Vaultman/commit/2b81ed4306fd4e2b3badba3203c0235546c3a0e3))
* **fix:** badge hover selection now has a better adaptation with the explorers. ([68c85e3](https://github.com/Meibbo/Vaultman/commit/68c85e328c1651e7031d06f0983961bca02875cd))
* **fix:** FnR now succesfully renames nodes in all explorers ([84ce2c2](https://github.com/Meibbo/Vaultman/commit/84ce2c2db1d5441c0f796410c7f1608ecc3933a4))
* **fix:** maintenance to recover explorer finest performance ([427222c](https://github.com/Meibbo/Vaultman/commit/427222c9488bf6013cd66f2326852934c3963e09))
* **fix:** standardrized the node size in the explorers for better visualization. ([675e017](https://github.com/Meibbo/Vaultman/commit/675e017fc2ac7efe4f82b9455cff6e1b4d2fec6e))
* **formatter:** first ever formatter session. ([fc43a7d](https://github.com/Meibbo/Vaultman/commit/fc43a7d3b436b1b982ffabdea1d033ab74100cf7))
* **frame:** wire dashboard add-ons ([b1af97b](https://github.com/Meibbo/Vaultman/commit/b1af97bde4e1c8fca80947f485deb2628b84b1ce))
* **i18n+css:** add prop browser and snippet diff styles ([7f8dddf](https://github.com/Meibbo/Vaultman/commit/7f8dddfecc1df7809914b65b223293672f6eaecd))
* **i18n+settings:** add Iter.7 i18n keys, separatePanes setting, ObsiManFilesView scaffold ([5665495](https://github.com/Meibbo/Vaultman/commit/56654955c5cf0d73fb2cb64908a1bfeacf2d9334))
* implement A2 rename handoff for files and tags via serviceFnR ([c196ba4](https://github.com/Meibbo/Vaultman/commit/c196ba44a37ca57f1c30d277755ff8342526a8fa))
* implement badge bubbling system for tree nodes and add styling components ([a4a58d9](https://github.com/Meibbo/Vaultman/commit/a4a58d9a74620c129b6d5ec428e84ca761e292a4))
* implement Find & Replace in Content tab (Iter.6) ([38ee31e](https://github.com/Meibbo/Vaultman/commit/38ee31e7e8423db4e431a0550c778331d1ac36c4))
* implement node selection service with Svelte reactivity and unit tests ([27eea51](https://github.com/Meibbo/Vaultman/commit/27eea511a90da9b16c3c54542713a59f6abdecb9))
* **iter17:** Sort popup, View Mode popup, FiltersPage header replacement + tab fade ([d674937](https://github.com/Meibbo/Vaultman/commit/d6749378c3aa49bd857117c973115958680c2898))
* **logic:** add logicExplorer + tests (Sub-A.4.1) ([54326bd](https://github.com/Meibbo/Vaultman/commit/54326bd5ce4295a28070e919196397c5da06b1f5))
* **logic:** PropsLogic + FilesLogic — cached trees, type incompatibility, folder hierarchy ([504e394](https://github.com/Meibbo/Vaultman/commit/504e394c932ec5888673fd5a683e9fe6168448c6))
* **logic:** TagsLogic — cached tag tree build + in-memory filter ([f52b0b9](https://github.com/Meibbo/Vaultman/commit/f52b0b9f33062ce9683bd924ad4dffa18f1ce8ed))
* **main:** wire IFiles/ITags/IProps indices into plugin lifecycle (Sub-A.2.1) ([109a43f](https://github.com/Meibbo/Vaultman/commit/109a43fa36adc591b92322e361d9da72c2d1dd80))
* migrate table cards row contract ([df66be9](https://github.com/Meibbo/Vaultman/commit/df66be9d915e6c38d525d2cd4e9c1467ec1522db))
* **module:** extracted and re-oriented the clicks business logic into a new serviceMouse for agnostic complex shortcuts. ([2ecc9d9](https://github.com/Meibbo/Vaultman/commit/2ecc9d99a164e927c15cc27e2ccc34b6c77cc9d0))
* **module:** separation of the badges as their own service for retrieval ([5748dc9](https://github.com/Meibbo/Vaultman/commit/5748dc9adcbb18cf64bd0cb39901b7b388361c5a))
* **multifacet-2:** FnR island, badges, ops-log, leaves, binding notes ([396bf69](https://github.com/Meibbo/Vaultman/commit/396bf69a538274ed6fc445401b55861841627918))
* **navigation:** Enhanced mouse and keyboard navigation within the nodes and added quick shortcuts to the FABs ([c113e5d](https://github.com/Meibbo/Vaultman/commit/c113e5d397fbfd9d6a233f8f50ce67e98ec2461e))
* **nav:** responsive bottom bar collapses on narrow frames ([d9f241b](https://github.com/Meibbo/Vaultman/commit/d9f241b840d559112bd86c24bb082b5bab44dc7e))
* **nav:** restructure sidebar — ops/statistics/filters, Filters 3-tab extraction ([04e488b](https://github.com/Meibbo/Vaultman/commit/04e488b16222fb94aee5b69ecd8e26040d63d097))
* new explorer system for data providers ([f4cdbc7](https://github.com/Meibbo/Vaultman/commit/f4cdbc74255537e9280122f759c29a0c0b8f562e))
* **new:** selection service iniative ([647c2e6](https://github.com/Meibbo/Vaultman/commit/647c2e6c72d3e8d93518f123aa2f029b4d14c382))
* **O:** extract FrameDashboardShell ([7d06fe2](https://github.com/Meibbo/Vaultman/commit/7d06fe2cc7e47a69baf61bf58d8d0d362fb99913))
* **O:** extract FrameNavbarShell ([e904d8f](https://github.com/Meibbo/Vaultman/commit/e904d8f7a06bf6e98d78a3c68bb381c5cc0a7bba))
* **O:** extract FrameNavigationService ([5ec5f66](https://github.com/Meibbo/Vaultman/commit/5ec5f66f9765577ecb6ac148b1aaa29d6f349232))
* **O:** extract FramePopupsState ([6f52570](https://github.com/Meibbo/Vaultman/commit/6f525706f2b7155afa96275222dbcc59ab22cb2a))
* **option:** inline grid group opening ([3ce1b11](https://github.com/Meibbo/Vaultman/commit/3ce1b11de6de49123575541f511950bf495afb65))
* **org:** changed scss file structure and fixed a bug that hided the explorer and cut in half the viewport ([4cad9e3](https://github.com/Meibbo/Vaultman/commit/4cad9e3ce14afce7dced2d8ad821aceef2d1c251))
* **overlays:** register search-island id alongside queue/filters ([7e3e05b](https://github.com/Meibbo/Vaultman/commit/7e3e05b843c52ab283baadf12e594dd3ba4941b1))
* **panels:** IconicService tagIcons, TagsExplorerPanel, PropsExplorerPanel, FilesExplorerPanel ([2e0c98b](https://github.com/Meibbo/Vaultman/commit/2e0c98b902b4e323567fe35112c921ba43f82049))
* **performance:** added debounce to the node calculations so there's not anymore O(N^2) calculations. ([d9fa9ee](https://github.com/Meibbo/Vaultman/commit/d9fa9ee1c9e54f994fbed9046cd399ac20dc41b2))
* **performance:** fix some issues related to de badge bubbling that slowed down the plugin performance ([dbcec2f](https://github.com/Meibbo/Vaultman/commit/dbcec2fb89edb4cec644af15528f13c1d5976094))
* **performance:** incredible boost of scrooling render capability, now this project isn't a toy anymore ([c270e4a](https://github.com/Meibbo/Vaultman/commit/c270e4a63d1e00305fdb06632f7b63883b888486))
* **pkm-ai:** add analyze-code tool for lightweight AST extraction ([17eb37e](https://github.com/Meibbo/Vaultman/commit/17eb37e007643774429fff3308edfa9af24d3f13))
* **pkm-ai:** add logs and metrics analysis tools ([4ff1432](https://github.com/Meibbo/Vaultman/commit/4ff1432929655126831dac4793b965201df0bc23))
* **pkm-ai:** add manage-memory tool for archiving context ([d212d5f](https://github.com/Meibbo/Vaultman/commit/d212d5f3658a5e34d5f778c1998f0e1832738c3d))
* **pkm-ai:** add traverse-graph tool for dependency tracking ([fba070d](https://github.com/Meibbo/Vaultman/commit/fba070dcb0b583ab3a627dc6e162739b22b7125d))
* **plan:** tests to obtain a better performance ([8d8cec2](https://github.com/Meibbo/Vaultman/commit/8d8cec2aa96bb0471e6bd77476e9cd7819c3756a))
* **primitives:** add _primitives.scss with all 6 primitive CSS rules; import in main.scss (Sub-A.3) ([aca2268](https://github.com/Meibbo/Vaultman/commit/aca2268d43408c25aaa1077709517147e5cc97cf))
* **primitives:** add Badge (Sub-A.3) ([1ca6c83](https://github.com/Meibbo/Vaultman/commit/1ca6c8332762bb82d773db5f17891577e5bf68aa))
* **primitives:** add BtnSquircle (Sub-A.3) ([3ec0eed](https://github.com/Meibbo/Vaultman/commit/3ec0eed18f43d4ae9446b199f510b30ea4fc5f8c))
* **primitives:** add Dropdown (Sub-A.3) ([fb28c8c](https://github.com/Meibbo/Vaultman/commit/fb28c8c95dcf4cee89fcfb59f9dc304eaed8c956))
* **primitives:** add HighlightText (Sub-A.3) ([bb5609e](https://github.com/Meibbo/Vaultman/commit/bb5609ee26ecf441c3bd74dbb4357a93e9d2b0ad))
* **primitives:** add TextInput (Sub-A.3) ([0d62552](https://github.com/Meibbo/Vaultman/commit/0d62552bcedf043c6d0b15c5b2c949638f79e333))
* **primitives:** add Toggle (Sub-A.3) ([ddd1589](https://github.com/Meibbo/Vaultman/commit/ddd15890664746f7298cc7daaecf3054d768bbf7))
* **queue:** add VFS lifecycle helpers (getOrCreateVFS, splitYamlBody, serializeFile) ([6d0d8b2](https://github.com/Meibbo/Vaultman/commit/6d0d8b204f622b7bd1e5fd3c87d1d16c758bbba4))
* **queue:** async add/addBatch with per-op StagedOp translation ([c14f124](https://github.com/Meibbo/Vaultman/commit/c14f1241ccb337ad80c20d475069c5c1e7211d34))
* **queue:** async snippet diff for find_replace_content operations ([5d493e0](https://github.com/Meibbo/Vaultman/commit/5d493e0fc19818286cecd7e67f222c6ddae0424c))
* **queue:** NATIVE_RENAME_PROP expansion with lazy body ([dc762e1](https://github.com/Meibbo/Vaultman/commit/dc762e1220f321b5070919b5849b79c2e919fe9b))
* **queue:** removeFile, removeOp, clear with VFS re-materialization ([cafd557](https://github.com/Meibbo/Vaultman/commit/cafd557ab8e89691ee53d4f21f730b17a4b451aa))
* reconcile explorer data-plane wave 3 ([d110fe6](https://github.com/Meibbo/Vaultman/commit/d110fe60ce020fe642cb66c69080c06684200f16))
* **refactor:** adjustments in typeTabs for it to have the variables of the navbarTabs. ([d1efe8b](https://github.com/Meibbo/Vaultman/commit/d1efe8ba4ac801089173cdec64e3f8b09bb5a3fa))
* **refactoring:** not so much of a succesful attempt ([38067c3](https://github.com/Meibbo/Vaultman/commit/38067c3785cf965ecb52bb3ab1636e741411a188))
* **refactor:** succesful transition from CSS to SASS, with evident regressions from previous versions that affect functionality. But at least, a sign of progress. ([26a5f11](https://github.com/Meibbo/Vaultman/commit/26a5f116a22626cdee81598180fa72e17f138a03))
* register ContextMenuService on plugin lifecycle ([1342886](https://github.com/Meibbo/Vaultman/commit/13428865c606ffacc2ea04b2415305b7e5b65970))
* register workspace stub action (Edit with VM) ([8120056](https://github.com/Meibbo/Vaultman/commit/81200565f395dbefdc7d4db5482f482d12dbf2bc))
* remove svar filemanager ([b3847ca](https://github.com/Meibbo/Vaultman/commit/b3847caa9d5df73dda5a9448dab03f05fab6efe1))
* **rename fiels:** reordenamiento  enorme de archivos para mayor visibilidad para el dev ([ad4294e](https://github.com/Meibbo/Vaultman/commit/ad4294ece5db8a133d6bb6f91eb5d87a0d28c92e))
* **rename:** serviceFnR, cmenu and queuelist are finally connected. ([b482370](https://github.com/Meibbo/Vaultman/commit/b482370f84ae56a01c21800236301dcef3344de5))
* **scopes:** better search and filters for communication between the explorers ([2af5fbe](https://github.com/Meibbo/Vaultman/commit/2af5fbe6336e2dea354dd569671a24e781290893))
* **service:** new serviceViews for a better management of the different layouts tha the explorers can handle. ([f26526a](https://github.com/Meibbo/Vaultman/commit/f26526a29786d574a2d5b39db10c4678817824a2))
* **services:** add createNodeIndex&lt;T&gt; factory + tests (Sub-A.2.1) ([5092cb4](https://github.com/Meibbo/Vaultman/commit/5092cb47e5cd44555d53faa0a6947d3323430c73))
* **services:** add CSSSnippets + Templates index stubs; wire all 8 indices in main.ts; add id to BaseChange (Sub-A.2.2) ([e0fba29](https://github.com/Meibbo/Vaultman/commit/e0fba298a38be88dee4919cd30b010ec851d3048))
* **services:** add OverlayStateService (IOverlayState) + ADR-010 + tests (Sub-A.4.2) ([febcccf](https://github.com/Meibbo/Vaultman/commit/febcccf6aaa30a11ffd15195da3bac1364078a31))
* **services:** add serviceContentIndex (IContentIndex impl) (Sub-A.2.2) ([86da540](https://github.com/Meibbo/Vaultman/commit/86da540ccb2699de501da65bdd8b7d5b679d53d5))
* **services:** add serviceExplorer (IExplorer&lt;T&gt;) + tests (Sub-A.4.1) ([341ae4e](https://github.com/Meibbo/Vaultman/commit/341ae4ea34aba91edb60e1e071cd8010d5f71b3a))
* **services:** add serviceFilesIndex (IFilesIndex impl) (Sub-A.2.1) ([a0fd55b](https://github.com/Meibbo/Vaultman/commit/a0fd55b159954415108675facc1fa7b2ba422ad6))
* **services:** add serviceOperationsIndex + serviceActiveFiltersIndex (Sub-A.2.2) ([d2a6033](https://github.com/Meibbo/Vaultman/commit/d2a603364835d197b1fe776d14fa7e4e5bc494ff))
* **services:** add servicePropsIndex (IPropsIndex impl) (Sub-A.2.1) ([78b0ac2](https://github.com/Meibbo/Vaultman/commit/78b0ac206bed62085afa803cf465d41652e6b86f))
* **services:** add serviceTagsIndex (ITagsIndex impl) (Sub-A.2.1) ([c7db5b4](https://github.com/Meibbo/Vaultman/commit/c7db5b47c0af3aa6d4a874a6a834498ae62e4521))
* **services:** promote serviceDecorate_WIP → serviceDecorate (IDecorationManager) + tests + ADR-011 (Sub-A.4.1) ([a7bebb7](https://github.com/Meibbo/Vaultman/commit/a7bebb76ff1493539d8a45245f83ef95dc47c651))
* **services:** promote serviceNavigation-WIP → serviceNavigation (IRouter impl) + tests (Sub-A.2.1) ([e80c0ad](https://github.com/Meibbo/Vaultman/commit/e80c0adf75e7f9f5ce0ad2fa9558bce6d55409d2))
* **services:** revive serviceSorting with perf budget (Sub-A.4.1) ([028ad5f](https://github.com/Meibbo/Vaultman/commit/028ad5fde925019e86fb198a1403834fbfe4f984))
* **settings:** add glassBlurIntensity + update pageOrder default ([5548192](https://github.com/Meibbo/Vaultman/commit/5548192dbfec56d882d04ff21d5356164e770f11))
* **settings:** add toolbarSearchMode key with island default ([94ca739](https://github.com/Meibbo/Vaultman/commit/94ca73972e34be71529b714627d023a065f226a7))
* **settings:** glass blur intensity slider + updateGlassBlur() live update ([603e41b](https://github.com/Meibbo/Vaultman/commit/603e41b7650e97f444ec7d04e694efee4fa49c21))
* **sort:** date sort for props/tags via max mtime of files containing that prop/tag ([db7f845](https://github.com/Meibbo/Vaultman/commit/db7f84551888f89e69695809be8a6da86a11535b))
* **statistics:** StatisticsPage — stat cards, scope pills, vault name ([7ac83ac](https://github.com/Meibbo/Vaultman/commit/7ac83ac8a0146acd7d013196840029531d65ff02))
* **structure:** nueva auditoría y mayor refactorización modular (aun falta) ([c01f8a4](https://github.com/Meibbo/Vaultman/commit/c01f8a47217d1a66850fc18171bd8a5ec477def1))
* **styles buil-up:** first implementation of scss (SASS) language to make more flexible and easy to work with the styles.css ([0b2d760](https://github.com/Meibbo/Vaultman/commit/0b2d7601148b52d0f0e3ddbe31da16d0ff42642c))
* **tabs:** wire all three Filters tabs to new Panel components ([a048ff1](https://github.com/Meibbo/Vaultman/commit/a048ff1d98eefd704d09208c80518d5bdf44b87f))
* **tags:** TagsExplorerComponent — dedicated tag tree with unlimited nesting ([7e6cf17](https://github.com/Meibbo/Vaultman/commit/7e6cf17c8a8465c550942ed91d58eb86aae15d98))
* **template:** caller pre-resolves templateContent for eager diff ([eab94d4](https://github.com/Meibbo/Vaultman/commit/eab94d4dbdcfe4cfda22aca91c726220bb356064))
* **test:** new performance harness ([07be364](https://github.com/Meibbo/Vaultman/commit/07be3640e315131fdf698b1af4a3dbff2b6f6f47))
* **types:** add contracts.ts with 16 interfaces (Sub-A.1) ([7e9b0bd](https://github.com/Meibbo/Vaultman/commit/7e9b0bdfb74239c44d1bb9abc7ad0ab134391c80))
* **types:** add obsidian-extended wrapper; migrate frame's (app as any) casts (Sub-A.1) ([38ed7d3](https://github.com/Meibbo/Vaultman/commit/38ed7d36cd0c3c40481e8f9ccb9dd0bbd74cb715))
* **types:** add StagedOp, VirtualFileState, OpKind ([cba37e4](https://github.com/Meibbo/Vaultman/commit/cba37e4e62c7b6fb414631f7c5dd50759f1161d0))
* **types:** add TreeNode&lt;T&gt;, TagMeta, PropMeta, FileMeta ([54bb105](https://github.com/Meibbo/Vaultman/commit/54bb1051c04748d955073b2dbdd76915ce433a43))
* **types:** reconstruct typeUI.ts; trim typePrimitives (Sub-A.1) ([7633516](https://github.com/Meibbo/Vaultman/commit/7633516bbfd1c44a512c7bdc0e33892832c34ccc))
* **ui/ux:** first approach to the new transaction queue and viewdiff implementation. ([314ec2d](https://github.com/Meibbo/Vaultman/commit/314ec2d8b8dcf3973e2b1aa91fbcebbcce61b3cf))
* **ui:** btnSelection shared primitive for 4-squircle rows (D5) ([192c15c](https://github.com/Meibbo/Vaultman/commit/192c15cab45c0fbd7985ef7070068fdcef5a9513))
* **ui:** componentQueueList/islandQueue/frameVaultman migrated to file-centric counters ([37a62d1](https://github.com/Meibbo/Vaultman/commit/37a62d16cf82228f5b86507c37967d3f2d33d86d))
* **ui:** glassmorphism bottom bar + .obsiman-glass CSS system ([7a452ff](https://github.com/Meibbo/Vaultman/commit/7a452ff13a95aaea2129d78d2b9bad90a93f605b))
* **ui:** migrate islandQueue/islandActiveFilters/menuView to btnSelection (D5/D6); menuSort deferred — nested sort-dir indicator incompatible with btnSelection ([e05527c](https://github.com/Meibbo/Vaultman/commit/e05527cfcf2237f98d3ac26f68708dc85788cb44))
* **ui:** modalQueueDetails transitional adapter to buildDiff (deprecated for Fase 2) ([0cda266](https://github.com/Meibbo/Vaultman/commit/0cda266bcfa99fe4a44673525d7a96f1626ecda9))
* **ui:** tab bar unification, ops icons, clear button inside search input ([6193e42](https://github.com/Meibbo/Vaultman/commit/6193e428e63c9abc75b9a7f60d4b9c84ebc8a692))
* unify search architecture and fix UI regressions in Filters page ([40104c5](https://github.com/Meibbo/Vaultman/commit/40104c5a45313c51edbdd21d309a5b8fda62a1a0))
* **utils:** dropDAutoSuggestionInput file-picker utility (spec §13.4) ([cb4159c](https://github.com/Meibbo/Vaultman/commit/cb4159c047a612bba9620bb20aba8f21a12b1de4))
* **view:** addition of the grid view for the explorers ([55b5d71](https://github.com/Meibbo/Vaultman/commit/55b5d716e61ee1a528caa3cbd573835019ef1955))
* **view:** UnifiedTreeView + GridView — shared renderers ([0a0b8d4](https://github.com/Meibbo/Vaultman/commit/0a0b8d4516805567b768470459fee597baa5ca89))
* **view:** viewTable first mockup before polishing style and funcionality ([5358d3e](https://github.com/Meibbo/Vaultman/commit/5358d3edb012b78d02e607be61d65482dc8a041b))
* wire explorer media descriptors without hidden render cost ([40505ac](https://github.com/Meibbo/Vaultman/commit/40505acb9618be0badc8535beba3e2322f1d34c2))


### Bug Fixes

* **0-b:** make final verification gate stable ([2f7b52a](https://github.com/Meibbo/Vaultman/commit/2f7b52a1399d1748cb5360683642588cbb3015a0))
* **0-h:** activate plugin and snippet rows ([bc199c7](https://github.com/Meibbo/Vaultman/commit/bc199c7f3491e188b87f4c331f839c6449ad1ac4))
* **0-h:** expose list mode in view menu ([dad8198](https://github.com/Meibbo/Vaultman/commit/dad819830dd2a0576eb4d8699114df74fd7f6a26))
* adjusted tests suite to handle excesive latency even in idle pages ([7337e6b](https://github.com/Meibbo/Vaultman/commit/7337e6bf4a8105ab92cc1a9d3219745e9e79f175))
* best pergormance until now for the scroll in different views ([6afc277](https://github.com/Meibbo/Vaultman/commit/6afc277bb360a4b5e3455e4f2779efaf884d5529))
* case-sensitive import for PopupOverlay ([78cfb42](https://github.com/Meibbo/Vaultman/commit/78cfb42cccc8dabe328e89f92b5f09039d521fd5))
* close fnr vmPopover on service collapse ([e0f01de](https://github.com/Meibbo/Vaultman/commit/e0f01deccc6d03c44c75ac41b89877f30b831f2c))
* **css:** add expand/collapse fade-in animation to tree children (BUG-11) ([054a6b2](https://github.com/Meibbo/Vaultman/commit/054a6b2250cf054e02fd6a26b2a7619a1a072a07))
* **css:** scope squircle-row absolute rule to islands; navbar-filters max-width 520px; restore FAB size ([2777943](https://github.com/Meibbo/Vaultman/commit/2777943130abd8a4a3aa81465b6beb0b093e0561))
* **css:** unified tree styles — icon overflow, chevron min-width, badge-warning ([ce5f941](https://github.com/Meibbo/Vaultman/commit/ce5f94175208ee5540b82ee7d5e3ded6666c8bb3))
* deprecate viewservice selection mirror ([0bb23d9](https://github.com/Meibbo/Vaultman/commit/0bb23d9b188f29457db16c539106ad68c8c9d24d))
* exclude test directory from linting/checking and remove unused var ([98c28aa](https://github.com/Meibbo/Vaultman/commit/98c28aa00b52642342498e0d675bd58816d52609))
* **explorer:** Iter.9 Tasks 17-19 — tabs, grid, cards view rewrites ([a1722e9](https://github.com/Meibbo/Vaultman/commit/a1722e9e3e8090cb5e516e49a2bbedb838bfd628))
* **files:** normalize root folderPath '/' to ''; add folder-open/closed icons to tree ([33c9b11](https://github.com/Meibbo/Vaultman/commit/33c9b11589799d1039a9ce1b98649fad9498dbe4))
* **filters+nav:** FilterService search, badges, drag reorder fix, search tab toggle, remove header ([98cdd51](https://github.com/Meibbo/Vaultman/commit/98cdd5126d7989a4eaf448a2e313ecf878804c6d))
* **filters:** popup overflow, search shrink, close btn alignment, vert-dropdown z-index ([e380a5c](https://github.com/Meibbo/Vaultman/commit/e380a5ccd565c4e7b9f82bdf850b093fb57036fd))
* **grid:** add 'date' SortColumn; wire setSortBy to GridView.setSortColumn; grid owns sorting ([dc156c5](https://github.com/Meibbo/Vaultman/commit/dc156c5f1a96af47f69cdb996a577a5f88a05927))
* issues withthe styling and decoration of the viewTree that were a hassle to the user experience ([725d6f6](https://github.com/Meibbo/Vaultman/commit/725d6f672ebeff764ace458cf678f7d1e1b0886d))
* **lint:** replace prompt(), fix unsafe types, proper modal imports ([3b31028](https://github.com/Meibbo/Vaultman/commit/3b31028063b2195338ff13d6aea4ea34fc8b240c))
* **lint:** resolve 19 pre-existing lint errors (prefer-active-doc, prefer-active-window-timers, prefer-create-el, no-unnecessary-type-assertion) ([ca5f590](https://github.com/Meibbo/Vaultman/commit/ca5f5904ea54d369b2d845ea80105f352cd19ae2))
* little adjusment to the scroll service. ([278d2ae](https://github.com/Meibbo/Vaultman/commit/278d2ae073cddb57ad94d5b07fa24dfcb1cedf72))
* little adjustments to the view lists ([f1ef408](https://github.com/Meibbo/Vaultman/commit/f1ef408ad2d6b0f311aa1d167f80be6eeeed09b4))
* **nav:** clear expand timer on destroy, measure viewRootEl in re-collapse check ([4cef09d](https://github.com/Meibbo/Vaultman/commit/4cef09d3b221b5abc1eb2a648aa71bd58311966c))
* **nav:** filter badge shows recursive leaf count, not just top-level ([0de944a](https://github.com/Meibbo/Vaultman/commit/0de944a7a9637a4a885f3674a350cf6295f81c6a))
* **nav:** pixel-based page translation with ResizeObserver (fixes page-3 transition) ([6ee89ae](https://github.com/Meibbo/Vaultman/commit/6ee89aeaf4816770c19901e01f5e0f81df78082a))
* **primitives:** add missing CSS rules for all primitives; add destroy to attachIcon (Sub-A.3 review) ([cc993c4](https://github.com/Meibbo/Vaultman/commit/cc993c4fdcc1b1858f61fb7b8cde42b27ffdddbd))
* **primitives:** add missing primitive CSS rules to styles.css (Sub-A.3 review) ([e921fd2](https://github.com/Meibbo/Vaultman/commit/e921fd29cf1f02e057a031e39c533071d11d300b))
* **primitives:** BtnSquircle attachIcon action signature (Sub-A.3) ([4270a39](https://github.com/Meibbo/Vaultman/commit/4270a3923db268a27ed0b5f3f6e0c154e4e0e63a))
* **queue:** add missing opCounter field ([44347a0](https://github.com/Meibbo/Vaultman/commit/44347a09236c2719053c8ef1c123ec82a8bce325))
* **queue:** defer opCounter to Task 6 (avoids noUnusedLocals error) ([2fadb22](https://github.com/Meibbo/Vaultman/commit/2fadb22cb3dd0b5b8fa86e919c736c5dabd3fb2a))
* **queue:** pre-filter files to only those containing the target prop/value before staging ([99165b3](https://github.com/Meibbo/Vaultman/commit/99165b3ca771c16e69bf096d1a7994e5e5370057))
* **queue:** remove spurious [@ts-ignore](https://github.com/ts-ignore) on opCounter ([f40c5d0](https://github.com/Meibbo/Vaultman/commit/f40c5d0a9369dab9a6ab16659a65140180750c16))
* **queue:** rename value scope scoped to prop+value files; queue island replaces native popup ([d8f4350](https://github.com/Meibbo/Vaultman/commit/d8f435025232061959f217fa10d11697c0272ce6))
* **queue:** skip MOVE_FILE and FIND_REPLACE_CONTENT in simulateChanges ([ed4e4b2](https://github.com/Meibbo/Vaultman/commit/ed4e4b258d05968ddeb39089289726ce7aa47825))
* quick edition of the default beaviour on table-core library so the cells don't show all at once when first loading the view. (this caused the app to freeze) ([901c910](https://github.com/Meibbo/Vaultman/commit/901c91057de7cab2f6f7018a4f19581f9da2da46))
* regenerate package-lock.json to resolve picomatch conflict ([226a5b5](https://github.com/Meibbo/Vaultman/commit/226a5b5091409c04a994dd34a2717dc9cad8bf58))
* register open diff command ([ee4652e](https://github.com/Meibbo/Vaultman/commit/ee4652e08f795375c7743d8c2e7fb7ef36ff1a67))
* restore projection lookup type compatibility ([1ecbdcf](https://github.com/Meibbo/Vaultman/commit/1ecbdcfa56932626950b6124e0d06f1de1d600a3))
* restore tree visual contract ([a79f905](https://github.com/Meibbo/Vaultman/commit/a79f9054e7c8ad7d47a68c97cc1a6b66ed85954d))
* **services:** all-occurrences scan in serviceContentIndex; deterministic id in serviceActiveFiltersIndex (Sub-A.2.2 review) ([5e38c9b](https://github.com/Meibbo/Vaultman/commit/5e38c9bc8dd1cfd2ea9f0f259be31976033375e9))
* **settings:** use Setting.setHeading() for Layout section, store plugin in FilesView, remove dead i18n key ([282a6bf](https://github.com/Meibbo/Vaultman/commit/282a6bf595fa009c377abf9d593c5ced652b2bf8))
* **sort:** count/date/sub sort default to descending; name defaults to ascending ([76ef6d8](https://github.com/Meibbo/Vaultman/commit/76ef6d81d131e94f45432d724e3392f7751c0caa))
* **svelte:** use untrack() for $state prop initialization in popupView ([2c1124b](https://github.com/Meibbo/Vaultman/commit/2c1124bd2b78508586042bd27a9c51e2bad4867b))
* **ui:** keep overlay islands open ([b6418b1](https://github.com/Meibbo/Vaultman/commit/b6418b1e6a493f260bd31b7a74602e0c7751f79d))
* **ui:** replace button with div[role=button] for navbar FABs to fix icon sizing ([bf798a7](https://github.com/Meibbo/Vaultman/commit/bf798a738f19ea027a6d906c41e649fce9e9a8dc))
* **ui:** restore islands and hardening regressions ([25d8b62](https://github.com/Meibbo/Vaultman/commit/25d8b623a660800cb57fefeb1bc65475116cdb18))
* **ui:** ViewMode initialViewMode prop; currentViewMode tracking in navbar; ADD mode FAB stub ([83ad5ad](https://github.com/Meibbo/Vaultman/commit/83ad5ada32008170ccd096745fd9d06df6965ce4))
* update node to v22 and sync package-lock for CI ([7a612bb](https://github.com/Meibbo/Vaultman/commit/7a612bbccbe44968a1e6a50c6da2ca1443d046db))
* use active window timers in addons island service ([11ec6a1](https://github.com/Meibbo/Vaultman/commit/11ec6a1c6eecb4d65fd6d965e3aaaedf9c9eab12))


### Performance Improvements

* instrument plugin boot lifecycle with PerfMeter marks ([fb7b2c0](https://github.com/Meibbo/Vaultman/commit/fb7b2c08226b4c74aac4a8282c44541dc704fe02))
* stabilize explorer table final gate ([5283148](https://github.com/Meibbo/Vaultman/commit/52831489c927e63a1e9b03b6788dbf3516f8340f))

## [Unreleased]

---

## [1.0.0-beta.5] — 2026-04-07

> Property browser, queue snippet diffs, and content replace UX polish.

### Added

- **Filters → Property Browser**: the Rules tab now shows a live, scrollable list of all vault properties directly in the Filters page. Click a property name to immediately add a `has_property` filter; expand any property with ▶ to see its known values and click one to add a `specific_value` filter — no modal required. The filter tree (active rules) moved exclusively to the Active Filters popup (FAB).
- **Queue Details → Content Snippet Diff**: when a Find & Replace Content operation is queued, opening Queue Details now shows a dedicated "Content changes" section below the property diffs. Each affected file renders async snippets: `…before context [MATCH → replacement] after context…` with the original match highlighted in red and the replacement in green.

### Fixed

- `simulateChanges()` no longer stores `MOVE_FILE` and `FIND_REPLACE_CONTENT` signal keys as fake property entries in the diff — this was causing `[object Object]` to appear in the Queue Details property diff table for content-replace and move operations.

### Internal

- `src/services/OperationQueueService.ts`: `simulateChanges()` now skips `MOVE_FILE` and `FIND_REPLACE_CONTENT` alongside the existing `RENAME_FILE` skip
- `src/modals/QueueDetailsModal.ts`: new async `renderContentOps()` method reads files via `vault.read()` and renders snippet-style diffs for `find_replace_content` ops
- `src/views/VaultmanView.svelte`: `propBrowserItems` reactive state + `refreshPropBrowser()` reads from `PropertyIndexService`; refreshes on mount and `metadataCache.resolved`
- `styles.css`: new `.vaultman-prop-browser*` and `.vaultman-diff-content-*` CSS utility classes

---

## [1.0.0-beta.4] — 2026-04-07

> Find & Replace in file content, Move to folder, batch queue performance, UI navigation overhaul.

### Added

- **Find & Replace Content tab**: search and replace raw file content (including frontmatter) using plain text or regex. Features case-sensitive toggle (`Aa`), regex toggle (`.*`), inline Preview (shows match count + collapsible per-file snippet list), and Queue Replace to stage the operation. Scope adapts to selected files or filtered files automatically.
- **Move to folder**: in-frame slide-up popup (following wireframe UX) to move selected/filtered files to a target folder with folder autocomplete
- **Scope tab inside Filters page**: sub-tab bar (Rules | Scope) in the Filters page — scope selection (All vault / Filtered files / Selected files) is now inline in the Filters page instead of a popup
- **Long-press nav icon reorder** (2s hold → drag to swap): pages can be reordered without leaving the sidebar; visual `.is-reorder-target` highlight during drag; order saved to settings
- **Bottom nav float + blur**: nav bar now floats over page content (`position: absolute; bottom: 0`) with a gradient fade and `padding-bottom: 80px` so content scrolls clear of the nav
- **Active filter badge** on Filters nav icon showing rule count; queue badge on Ops nav icon
- `addBatch()` on `OperationQueueService` — batches multiple queue additions into a single UI re-render event (prevents UI freeze when queuing 1000+ files)
- Chunked execution in `OperationQueueService.execute()` (20 files/tick, `setTimeout(0)` yield) + live progress Notice

### Fixed

- Ribbon icon now opens the sidebar (was incorrectly calling the bases picker)
- Navbar click navigation (was broken after pointer-capture refactor in Iter.3)
- Blank pages 2 & 3 — root cause: `overflow: hidden` was on the same element as `translateX`, clipping pages in local space. Fixed by adding `.vaultman-pages-viewport` wrapper
- `addClass('class1 class2')` → `addClasses(['class1', 'class2'])` in all 4 modals

### Internal

- `FIND_REPLACE_CONTENT` and `MOVE_FILE` signal constants in `src/types/operation.ts`
- `FolderSuggest` added to `src/utils/autocomplete.ts`
- Svelte 5 `$state` + `$derived` for all reactive UI — no framework bindings
- `.vaultman-pages-viewport` overflow wrapper pattern for horizontal slide navigation

---

## [1.0.0-beta.3] — 2026-04-06

> Full Svelte 5 migration, redesigned navigation, major layout fixes.

### Added

- **Svelte 5 sidebar**: `VaultmanView.svelte` replaces the old imperative TypeScript view — 3-page horizontal slide navigation (Ops | Files | Filters) with CSS `translateX` and `transitionend` guard
- **Frosted glass pill nav**: Lucide icons per page, active glow via `color-mix`, `backdrop-filter: blur`, per-page FABs on outer edges following the wireframe spec
- **Per-page FABs**: Files page always gets both FABs (View mode popup, Search popup); Ops page gets left FAB (Queue Details modal); Filters page gets right FAB (Active Filters popup)
- **View mode popup, Search popup, Active Filters popup, Scope popup**: all as in-frame overlays (slide-up spring animation)
- **Queue Details modal** (`QueueDetailsModal`): collapsible file sections, color-coded property diffs (green/red), "Show unchanged" toggle, live progress during execution
- **Linter batch modal** (`LinterModal`): runs Obsidian Linter on all filtered/selected files
- **File Move modal** (`FileMoveModal`): folder autocomplete via `FolderSuggest`

### Fixed

- Empty Files/Filters pages — `refreshFilterTree()` now called in `onMount`; `metadataCache.on('resolved')` triggers file re-render after vault indexes
- Page order default corrected to `['ops', 'files', 'filters']` (matches wireframe)
- HTML5 drag-and-drop replaced with pointer events (Obsidian intercepted native drag events and created tab groups)

### Internal

- `esbuild.config.mjs` updated with `esbuild-svelte@0.9.4` plugin (`css: "injected"`)
- `src/svelte.d.ts` created for TypeScript `.svelte` module declarations

---

## [1.0.0-beta.2] — 2026-03-28

> Bug-fix release addressing four known regressions from v0.9.0.

### Fixed

- **Inline rename**: double-clicking a name cell in the property grid now correctly opens the inline edit input
- **Header checkbox CSS**: "select all" checkbox in the grid header restored to accent/indeterminate styling
- **Grid re-render flash**: `MarkdownRenderer` cell updates no longer produce a visible rebuild flash on each click
- **Tags in grid**: `#hashtag` property values now render as styled tag chips matching Obsidian's live preview

---

## [1.0.0-beta.1] — 2026-03-27

> First public beta. Core features are functional but several known regressions exist. Not recommended for production vaults.

### Added

- Nothing new since 0.9.0 — this release packages the current state for BRAT beta testing

### Known issues in this release

- Inline rename (double-click on name cell) is broken
- Header checkbox lost its CSS styling
- Grid re-render flash on click (chunked render mode)
- Tags don't render exactly like Obsidian reading view

### Placeholder / not yet implemented

- File diff view for pending changes
- File move operation
- Linter tab
- Templates tab (Templater support)

---

## [0.9.0] — 2026-03-27

### Added

- **Inline file rename**: double-click a name cell in the grid (configurable via `gridEditableColumns` setting) — _note: currently has a bug, see Known Issues_
- **Live preview rendering**: property values render with Obsidian formatting (tags, wikilinks, dates) via `MarkdownRenderer` — supports plain, chunked, and full render modes — _note: tags still don't render exactly like reading view; chunked mode shows a visible re-render flash_
- **.base file integration**: bidirectional sync between the plugin grid and Obsidian Bases `.base` YAML files — columns, sort, column widths, and filters
- **Base filter parser**: full expression parser for Obsidian Bases query syntax (comparisons, `.contains()`, `.containsAny()`, `file.hasTag()`, `link()`, `date()`, nested AND/OR)
- New settings: `gridRenderMode`, `gridRenderChunkSize`, `gridLivePreviewColumns`, `gridEditableColumns`, `baseFilePath`
- New grid callbacks: `onSortChange` and `onColumnResize` for external sync
- i18n keys for all new settings (English and Spanish)

### Fixed

- **Checkbox toggle**: clicking a checkbox now correctly toggles selection (was always clearing and re-adding, making uncheck impossible)
- **Show only checked**: now correctly shows all selected files (was showing only the last due to checkbox bug)
- **Select all**: header checkbox now immediately updates all row checkboxes without requiring a column sort
- **Column widths**: table now has explicit pixel width matching colgroup sum, preventing columns from shifting with text content
- **Header checkbox accent**: indeterminate/accent styling now only appears when more than one file is selected
- **Ctrl/Shift selection**: separated checkbox click logic from row click logic so modifier keys work correctly on both paths

### Known regressions in this version

- Inline rename (double-click on name cell) is broken
- Header checkbox lost its CSS styling

---

## [0.8.0] — 2026-03-26

### Added

- Custom SVG plugin icon registered via `addIcon()` — replaces generic `settings-2` icon on ribbon, view tabs, and sidebar
- **Operations panel**: split layout with a pinned queue section always visible at the bottom, independent of active tab
- **Operations panel**: "Clear selected" button to deselect all files from the grid
- Column resize handles on the property grid — drag column header borders to adjust widths
- Native Obsidian status bar integration — file counts, property/value stats, and queue status
- Minimal session row replacing the colored header bar — session picker and show-selected toggle in a compact row

### Changed

- **Property explorer**: triangle toggle icons (▶/▼) replaced with Lucide chevron icons
- **Navbar**: hidden when the explorer panel is open, shown again when collapsed
- **Operations panel**: opens by default alongside the grid
- **Property grid**: uses a single `<table>` with `table-layout: fixed` and `<colgroup>` for precise column alignment
- **Property grid**: virtual scroll now uses spacer `<tr>` elements inside `<tbody>` instead of separate spacer divs
- Removed custom `.vaultman-statusbar` HTML in favor of Obsidian's native `addStatusBarItem()` API
- Removed `HeaderBarComponent` from the main view

### Fixed

- **Critical**: files and properties not appearing in views due to metadata cache timing — `PropertyIndexService` now rebuilds on `metadataCache.on('resolved')` event
- **Critical**: `FilterService.applyFilters()` re-triggered on `metadataCache.on('resolved')` to ensure filters run after cache is ready
- **Compatibility**: replaced `structuredClone()` with `JSON.parse(JSON.stringify())` for older Electron versions

---

## [0.7.0] — 2026-03-26

### Added

- `onExternalSettingsChange()` lifecycle hook — settings now sync when modified externally (e.g. via cloud sync)
- `onunload()` cleanup in SessionFileService and PropertyIndexService
- `destroy()` method on PropertyExplorerComponent for timer cleanup
- Vault `create` event listener in PropertyIndexService for accurate file count tracking
- README.md with full feature documentation, installation, and usage guide
- CHANGELOG.md following Keep a Changelog format
- CONTRIBUTING.md with architecture overview and development guidelines

### Changed

- **IconicService** and **PropertyTypeService** now extend `Component` with proper lifecycle management
- **PropertyIndexService**: incremental per-file removal on delete (was full vault rebuild)
- **PropertyIndexService**: metadata change handler debounced (50ms) to batch rapid updates
- **FileListComponent** and **PropertyGridComponent**: O(1) `getFileByPath()` lookups instead of O(n) vault scan
- **SessionFileService**: `detectConflicts()` scoped to parent folder instead of full vault scan
- Settings loading uses `structuredClone()` for deep merge

### Fixed

- Potential stale callback execution from pending `setTimeout` in SessionFileService on unload
- Global `document.querySelector` in PropertyExplorerComponent scoped to `ownerDocument`
- `.className = '...'` pattern wiping Obsidian-injected classes

---

## [0.1.0] — 2026-03-25

### Added

- Initial release of Vaultman as an Obsidian TypeScript plugin
- Property explorer with hierarchical tree view, search, sort, and Iconic integration
- Virtual-scrolled property grid with inline editing
- Advanced filter system with boolean logic (AND/OR/NOT) and 8 filter types
- Operations queue for batch property management (set, rename, delete, clean, change type)
- Session management with persistent `.md` files in `+/` folder
- Bidirectional session sync with Google Drive conflict detection
- File list component with search and checkbox selection
- Batch file renaming modal
- Obsidian Linter integration modal
- Filter template save/load system
- Settings tab with language, property type, layout, and behavior options
- Internationalization support (English, Spanish) with auto-detection
- Sidebar view with collapsible sections
- Full-screen main view with responsive layout
- Ribbon icon and command palette commands

> Versions 0.2–0.6 correspond to the Python script predecessor (PKM Manager).
> See `docs/pkm_manager_python_architecture.md` for that history.

[Unreleased]: https://github.com/Meibbo/Vaultman-Plugin/compare/1.0.0-beta.5...HEAD
[1.0.0-beta.5]: https://github.com/Meibbo/Vaultman-Plugin/compare/1.0.0-beta.4...1.0.0-beta.5
[1.0.0-beta.4]: https://github.com/Meibbo/Vaultman-Plugin/compare/1.0.0-beta.3...1.0.0-beta.4
[1.0.0-beta.3]: https://github.com/Meibbo/Vaultman-Plugin/compare/1.0.0-beta.2...1.0.0-beta.3
[1.0.0-beta.2]: https://github.com/Meibbo/Vaultman-Plugin/compare/1.0.0-beta.1...1.0.0-beta.2
[1.0.0-beta.1]: https://github.com/Meibbo/Vaultman-Plugin/compare/0.9.0...1.0.0-beta.1
[0.9.0]: https://github.com/Meibbo/Vaultman-Plugin/compare/0.8.0...0.9.0
[0.8.0]: https://github.com/Meibbo/Vaultman-Plugin/compare/0.7.0...0.8.0
[0.7.0]: https://github.com/Meibbo/Vaultman-Plugin/compare/0.1.0...0.7.0
[0.1.0]: https://github.com/Meibbo/Vaultman-Plugin/releases/tag/0.1.0
