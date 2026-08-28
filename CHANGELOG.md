# Changelog

All notable changes to Vaultman will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **Version history note**: Versions 0.7–0.9 were previously labeled 1.2.2–1.3.0 during private
> internal development. Renumbered to 0.x to reserve 1.0.0 for the first public stable release.

## [1.2.0](https://github.com/Meibbo/Vaultman/compare/1.1.6...1.2.0) (2026-07-24)


### Features

* add tag-pinned release bulletin policy ([14de6fb](https://github.com/Meibbo/Vaultman/commit/14de6fbbebdc554d3ccd3602039c30fcda8c4724))
* **addons:** add explorer toolbar parity ([5414a0f](https://github.com/Meibbo/Vaultman/commit/5414a0f08a475d83fb0e005a7f029c5f39d4f364))
* **addons:** add native state cells ([d98d28e](https://github.com/Meibbo/Vaultman/commit/d98d28e4ac8ad5402ab358fd6503f0c2e9487815))
* **addons:** native confirm modals for deletion operations ([3eda8d0](https://github.com/Meibbo/Vaultman/commit/3eda8d05a802c227a614bd01255bfe123f04eb19))
* **addons:** persist custom icon overrides ([d092826](https://github.com/Meibbo/Vaultman/commit/d0928260ee9ac2846483afa2074830399d090238))
* **addons:** surface plugin-emitted icons with Iconic ribbon overrides ([3b95a9a](https://github.com/Meibbo/Vaultman/commit/3b95a9aef6d1216e821462adb0b82811262bb298))
* **backlog:** attempt of solving bugs. ([b56b9a7](https://github.com/Meibbo/Vaultman/commit/b56b9a788409d7d00bfc798e891bddcd648550f3))
* **beta:** complete 1.2 beta.2 explorer fixes ([c7c7da2](https://github.com/Meibbo/Vaultman/commit/c7c7da2606a85486d6e8ce6d15530142a2e7f2cd))
* **content:** add configurable Rename/Delete to content search nodes (BT5-036) ([e094503](https://github.com/Meibbo/Vaultman/commit/e0945039b5f61c8b0389ded48da881bed4f0497d))
* **docs:** updated readme and changed the wrench icon ([14e87dc](https://github.com/Meibbo/Vaultman/commit/14e87dc7e3b306f485b5f9f7af4f4f02b149ed0a))
* **explorer:** add condensed toolbar tools menu ([d9eb4cf](https://github.com/Meibbo/Vaultman/commit/d9eb4cf0eed00766ee6fce627013301278c97d8e))
* **explorer:** add floating toc rail ([8050bb2](https://github.com/Meibbo/Vaultman/commit/8050bb2b62d9ccc0510ed7a2d0362a25380a4601))
* **explorer:** add per-tab interaction modes ([7ba6a3c](https://github.com/Meibbo/Vaultman/commit/7ba6a3c99e54eec785a5a83cac9071fa72d741f2))
* **explorer:** add scoped sort levels ([ee7bc0f](https://github.com/Meibbo/Vaultman/commit/ee7bc0f29c0ef84b75ebbecb2e30ec98ce112310))
* **explorer:** add semantic state and type sorts ([e015742](https://github.com/Meibbo/Vaultman/commit/e0157424554e007f258693887d9659f6c75cd0f0))
* **explorer:** apply the shared glyph color to explorer node glyphs ([beb545e](https://github.com/Meibbo/Vaultman/commit/beb545e33b9113efa644008bc698bd2b843cc6cf))
* **explorer:** By level sort group with fixed folders and click drill ([e82efc5](https://github.com/Meibbo/Vaultman/commit/e82efc531f7cf1e3883ad58d7ad4f286b4195a3b))
* **explorer:** centralize cell registry and hover order ([f2e4f8c](https://github.com/Meibbo/Vaultman/commit/f2e4f8c36f0414fd858de06e582020b3de0ae1ca))
* **explorer:** contain the niagara rail and add one-way slide option ([247b4b1](https://github.com/Meibbo/Vaultman/commit/247b4b1d75479657b52dfe0a8be6dfa5a93b2019))
* **explorer:** exclude a file through the filter pipeline (BT5-009) ([0a71532](https://github.com/Meibbo/Vaultman/commit/0a71532f60d5e8fd707e0bd21ebae65eef46b5fe))
* **explorer:** exclude files from the files explorer ([f7f5c7d](https://github.com/Meibbo/Vaultman/commit/f7f5c7dbd0780006a23fbfb824fda40d813679b1))
* **explorer:** floating index glyph color with static/always modes ([7c471e1](https://github.com/Meibbo/Vaultman/commit/7c471e15b2f4c27b1f3a98993d88ff0068d26145))
* **explorer:** floating toc drill by level, mode-aware controls, menu toggle ([c02b18e](https://github.com/Meibbo/Vaultman/commit/c02b18e2645b43ec4c9550d9f10e4ad0410ad332))
* **explorer:** floating toc files/folders toggle + scope drill ([5c776f2](https://github.com/Meibbo/Vaultman/commit/5c776f28ba678131fc77cbdcc8d63df86b878bee))
* **explorer:** floating toc jumps to group via reveal router ([33e8741](https://github.com/Meibbo/Vaultman/commit/33e8741d584255cfcd0347ff982495427831a5a6))
* **explorer:** FTC-004 save/restore per-tab view config ([213baae](https://github.com/Meibbo/Vaultman/commit/213baaef5b8123ff21b51ceb5c1629cc8a1d53ae))
* **explorer:** FTC-005 Niagara scrub effects (off by default) ([9cf8cf6](https://github.com/Meibbo/Vaultman/commit/9cf8cf689369767fb30f8977116d9157601baa86))
* **explorer:** full Niagara port with effects, options, node-scrub ([3d86f57](https://github.com/Meibbo/Vaultman/commit/3d86f57c2614519eba3872237fe4bdb04d72aa5d))
* **explorer:** give folders a Last opened order and an mtime tie-break ([404c33b](https://github.com/Meibbo/Vaultman/commit/404c33b42778f940d10ce6fe6e3d6a7d31b000a3))
* **explorer:** let the node icon occupy an unusable caret slot ([d396c3f](https://github.com/Meibbo/Vaultman/commit/d396c3f04e70a3b7fd3ec834f844fd8d10c7f9c4))
* **explorer:** make the Files context menu configurable ([a188d67](https://github.com/Meibbo/Vaultman/commit/a188d672d50b2b694f2b07b0347386f9053453c3))
* **explorer:** move floating-index toggle to the tabs menu ([adfc046](https://github.com/Meibbo/Vaultman/commit/adfc046cd76a7c738620ce9277a87678d84561e3))
* **explorer:** named saved layouts via Config submenu ([e238a36](https://github.com/Meibbo/Vaultman/commit/e238a36b70db61a695e0b6440d884a1d42423b35))
* **explorer:** nest the Files menu page and list intercepted items ([b4f0815](https://github.com/Meibbo/Vaultman/commit/b4f0815a0ecc725d2f373906d59f6641ef7932a9))
* **explorer:** opt-in rainbow folder colors in the files tree ([6a937e1](https://github.com/Meibbo/Vaultman/commit/6a937e1ab8e158204f01183efc94436bfde234b1))
* **explorer:** order cells by activation ([bf0e455](https://github.com/Meibbo/Vaultman/commit/bf0e455c6aaa86939bd78377ba23e2d6c776b0c9))
* **explorer:** persist last opened per file as a cell and a sort ([843da5a](https://github.com/Meibbo/Vaultman/commit/843da5abd92a7675b2d95b8cff81a4034fe0437d))
* **explorer:** project the flat Files label onto name or path ([7c2f592](https://github.com/Meibbo/Vaultman/commit/7c2f5928c072d424ff8a0473d05560dd4e49eb90))
* **explorer:** remaining inline tasks cell, sort, and hover field ([dc918b1](https://github.com/Meibbo/Vaultman/commit/dc918b1ebc3a179ada67b24058eaab64a95299df))
* **explorer:** rename card engine to Cards with natural compact height ([374cc59](https://github.com/Meibbo/Vaultman/commit/374cc59c8ce7dc587eb2fe07540da9e4d50bee20))
* **explorer:** rename compositions, seed defaults, shared glyph palette ([1b3031b](https://github.com/Meibbo/Vaultman/commit/1b3031b20aafa127f7174bcd4863cb2d5a3ff1f7))
* **explorer:** render cells in activation order (option B) ([ea49897](https://github.com/Meibbo/Vaultman/commit/ea4989754ca3294b4319af90312da2ac21fe2c47))
* **explorer:** save the floating index with view configs ([7beb438](https://github.com/Meibbo/Vaultman/commit/7beb4386a22c26c470a40dabf110c32f5e58e14f))
* **explorer:** show recursive folder cell totals (BT5-040) ([b4b625f](https://github.com/Meibbo/Vaultman/commit/b4b625f7dedc5dfa743ddc3d10ff3776f270c43c))
* **explorer:** split toc kind toggle from scope drill, rail over scrollbar ([0bd21c4](https://github.com/Meibbo/Vaultman/commit/0bd21c4852dc2266e726828dc76676b9982b7f37))
* **explorer:** toggle collapsed folder activity between a dot and badges ([ff083b9](https://github.com/Meibbo/Vaultman/commit/ff083b91630340ee9222579150c9eec8e97782e2))
* **explorer:** toolbar auto-hide + edge peek, instant toc toggle, scope-aware kind ([d06d48c](https://github.com/Meibbo/Vaultman/commit/d06d48ca0c84fd7f993c55657f8aed716bf4f673))
* **explorer:** toolbar on/off + scope-aware toc kind toggle ([296c8b5](https://github.com/Meibbo/Vaultman/commit/296c8b524207769496fb04db2f1829c3a798eca8))
* **files:** bubble hidden descendant activity ([eed4e8a](https://github.com/Meibbo/Vaultman/commit/eed4e8a3ae60ab011b8b1d017c83adc14da3bf07))
* **iconic:** integrate property and tag icons ([194a730](https://github.com/Meibbo/Vaultman/commit/194a7306edf0b59e8f222482761b252a7f717f29))
* **img:** Reference screenshots ([cf63391](https://github.com/Meibbo/Vaultman/commit/cf633914471406d62924a753a4cd4d9ebc5a5fcf))
* **properties:** complete localized type and conversion menus ([d764b42](https://github.com/Meibbo/Vaultman/commit/d764b424be37341712e87b1abeb5aba1b43e7714))
* **release:** automate multichannel publishing ([97b263e](https://github.com/Meibbo/Vaultman/commit/97b263e11e6b54974d6710a16f2bae07e33b0867))
* **search:** pause and resume the content scan from the toolbar ([7da6426](https://github.com/Meibbo/Vaultman/commit/7da6426d9b2c86c1181ec772adf4b571e7bb4530))
* **settings:** default new vaults to a new-instance open mode ([3b5c655](https://github.com/Meibbo/Vaultman/commit/3b5c655cbde9088d7686ee08974da28c60ee94ed))
* **settings:** lead with Layout Configuration and soften new-vault defaults ([cf9ba35](https://github.com/Meibbo/Vaultman/commit/cf9ba3599b6b65acb7bbd71db7d86492125020a3))
* **settings:** preview saved payloads safely ([79cdf33](https://github.com/Meibbo/Vaultman/commit/79cdf33bad113e05020a4afaaecf89efd62b8335))
* **settings:** rename Files icon scope to Node icon scope and move it ([3353cd8](https://github.com/Meibbo/Vaultman/commit/3353cd88541998d635fea7f4bb71e81bd8d6248f))
* **settings:** reorganize and relabel the settings sections ([3f6ce3b](https://github.com/Meibbo/Vaultman/commit/3f6ce3b8764baf1934f45c7c671e0f42b99da360))
* **settings:** reorganize layout controls ([d5001eb](https://github.com/Meibbo/Vaultman/commit/d5001eb0b18030c21b400d4ac6d88ceea6831ac9))
* **settings:** reshape Layout Settings around sub-pages ([bccd775](https://github.com/Meibbo/Vaultman/commit/bccd775067d0e7b1cd0f630e20508afe547920d2))
* **settings:** Style Config section + style preset selector ([0011b29](https://github.com/Meibbo/Vaultman/commit/0011b29716ef075d8b99dc9287c88100760d1da0))
* **statistics:** add a Remaining tasks card ([8efd427](https://github.com/Meibbo/Vaultman/commit/8efd427eea5b3d854563bb82553beb1de6a9b55f))
* **statistics:** match the explorer toolbar and add an Opened today card ([871a837](https://github.com/Meibbo/Vaultman/commit/871a837e78df43f415e9cdd46e9b9c2628831047))
* **toolbar:** add a horizontal-scroll overflow strategy ([57739ac](https://github.com/Meibbo/Vaultman/commit/57739ac592585da970b87bee2b3331bc227e3702))
* **toolbar:** bind Create File to an Obsidian command ([3973ed2](https://github.com/Meibbo/Vaultman/commit/3973ed290c268ed541e620a4efff4b17f2590261))
* **toolbar:** create-action placement and custom command toolbar nodes ([546c376](https://github.com/Meibbo/Vaultman/commit/546c376d474d013119e25ed163f5f5943a077dd7))
* **tweak:** Changed text values for better UI. ([8aa28e2](https://github.com/Meibbo/Vaultman/commit/8aa28e2563559bcf43911df1ad27386c7f82797b))


### Bug Fixes

* **addons:** reflect external enable/disable state in explorer cells ([f199ed6](https://github.com/Meibbo/Vaultman/commit/f199ed6444cb59b69c4f752c29b394fc89fea628))
* **addons:** top-align index reveals and keep the state toggle rightmost ([8ace554](https://github.com/Meibbo/Vaultman/commit/8ace5549e0794915977eb8ecbe4250f27546e1c1))
* **addons:** wire up snippet rename using FileRenameModal ([9afa0e0](https://github.com/Meibbo/Vaultman/commit/9afa0e078bf601ef58cb1423660b9fac9829d79b))
* align explorer sort and expansion controls ([f1dbe2f](https://github.com/Meibbo/Vaultman/commit/f1dbe2f565b1ef9059647628f0837c9458a979ce))
* **commands:** stop focus commands from closing Vaultman ([7ef2e69](https://github.com/Meibbo/Vaultman/commit/7ef2e69d66c1dd87cd21c6fdedfef2327c383990))
* **explorer:** arm the row tooltip before the pointer arrives ([eb8ad91](https://github.com/Meibbo/Vaultman/commit/eb8ad91df03d48db76667fe3ab7fe69172d7efb1))
* **explorer:** clamp the bottom islands to the frame height ([2bdea92](https://github.com/Meibbo/Vaultman/commit/2bdea92914a32d83a439dc3fe25724ab5114d7cc))
* **explorer:** dot a collapsed filter parent instead of decorating it ([6e64f28](https://github.com/Meibbo/Vaultman/commit/6e64f28bd66beadff7497218852bdfa22c14f1ad))
* **explorer:** floating toc follows explorer order and literal glyph ([ccb2634](https://github.com/Meibbo/Vaultman/commit/ccb2634962afff11a39fcee72c4a3b15ebd7f5cb))
* **explorer:** floating toc scope-pick no longer hangs on Content tab ([524c30c](https://github.com/Meibbo/Vaultman/commit/524c30c0f9cf968f4bbe029a4aaf2c0dd7ada5d9))
* **explorer:** free the rail displacement and add the stretch mode ([86512e0](https://github.com/Meibbo/Vaultman/commit/86512e06185a14524b8d3ed8fd281a0b90ff2c9c))
* **explorer:** give each row a single tooltip owner ([577789c](https://github.com/Meibbo/Vaultman/commit/577789c2a63945c9c04f5cd2836a8ddf61bacd7f))
* **explorer:** grow spacer before applying the anchored cards scroll ([29fcef2](https://github.com/Meibbo/Vaultman/commit/29fcef2477d00627190df6797ae4e5ac64c48334))
* **explorer:** hide folder sort options where they cannot apply ([e86cd6f](https://github.com/Meibbo/Vaultman/commit/e86cd6f4a419d31b5ba2d056dc4b91da5896148c))
* **explorer:** index sigil folders by first letter, clear scrollbar ([ab2465e](https://github.com/Meibbo/Vaultman/commit/ab2465e7ccd5a022d938e3a933d219e19e313c73))
* **explorer:** keep activation off the model render path ([149effc](https://github.com/Meibbo/Vaultman/commit/149effc6f75d6cc29ab405bacf692cc1235282a9))
* **explorer:** keep rainbow row cleanup stub-safe and guards literal-free ([76fc0e4](https://github.com/Meibbo/Vaultman/commit/76fc0e45ed554f04504c3344bc30482dc1e95a31))
* **explorer:** keep the Last opened order live ([102bb0b](https://github.com/Meibbo/Vaultman/commit/102bb0b6d1392b60df98b61b31f1d75b9bc760c1))
* **explorer:** let the inline rename editor take the row height ([aeb1df1](https://github.com/Meibbo/Vaultman/commit/aeb1df1d938af48c6764b7a05e97d111b9097a76))
* **explorer:** make the caret-slot icon actually align the labels ([dad3ef3](https://github.com/Meibbo/Vaultman/commit/dad3ef32f3c59da9d4320a95accd8b2507558d72))
* **explorer:** re-render panels when their pane becomes visible again ([038b127](https://github.com/Meibbo/Vaultman/commit/038b1278d63d81f11728f214b4eb726b89cd221b))
* **explorer:** remove files inset and tighten index lane ([03fe92b](https://github.com/Meibbo/Vaultman/commit/03fe92bc8f373a038b359fe79c31689251b6277d))
* **explorer:** render the tasks cell alone and give it a checkbox icon ([7dc846b](https://github.com/Meibbo/Vaultman/commit/7dc846b5ffed08751adadbb4ff72a99819f2b1e2))
* **explorer:** repaint Files when an icon changes ([9cd1e3a](https://github.com/Meibbo/Vaultman/commit/9cd1e3ace3a80f8299ccbe86a5a9fee3a5263577))
* **explorer:** require scrub intent before the niagara rail reacts ([62429f1](https://github.com/Meibbo/Vaultman/commit/62429f1a64b034bd3f839cbb4d0c7d49fadf5c3f))
* **explorer:** respect folder partitions when reordering on open ([ced1c07](https://github.com/Meibbo/Vaultman/commit/ced1c078d8aa1b4c006490eed24fc94ded5a91c7))
* **explorer:** restore lane rail shift and reachable narrow-width tools ([736a9e6](https://github.com/Meibbo/Vaultman/commit/736a9e62eccabe0eca8fa69bb0e4af14f5b1c3db))
* **explorer:** route each node menu through its own kind + content link ([0f9fba7](https://github.com/Meibbo/Vaultman/commit/0f9fba74e43df2bae8e052fe1688b810328c03f9))
* **explorer:** stabilize cards window on height changes and wrap metadata ([6e78432](https://github.com/Meibbo/Vaultman/commit/6e78432d9287584e06d042222795ad58d7d5d651))
* **explorer:** stop a redundant re-render from eating the first click ([4a61d41](https://github.com/Meibbo/Vaultman/commit/4a61d41953b454284546b075c9b40adc626784fb))
* **explorer:** stop stale drill sorts from capturing the root level ([be97b4a](https://github.com/Meibbo/Vaultman/commit/be97b4a994b57b8163385b75f40203c28cb3d7f9))
* **explorer:** synchronize floating index lifecycle ([409b15e](https://github.com/Meibbo/Vaultman/commit/409b15eddad7c6563f81ac73c8430bdddbb0f727))
* **explorer:** toolbar menu checkmark + live save-layout list + View Config label ([eee7ed3](https://github.com/Meibbo/Vaultman/commit/eee7ed31c429157f9b3ce18d418a889b5dcd8c2e))
* **explorer:** unify Niagara rail track ([58193e1](https://github.com/Meibbo/Vaultman/commit/58193e1450bcbd2779fbb1ce70464cfbfa46d604))
* **explorer:** wall the rail's perpendicular displacement at the frame ([4cf7937](https://github.com/Meibbo/Vaultman/commit/4cf7937cd524e6b2751968d6d7918b13afdd74d3))
* **filters:** honor tab labels in minimal header ([4624347](https://github.com/Meibbo/Vaultman/commit/462434791a53f60475ef606ba539dc0aaeaa69b2))
* **filters:** make polarity interaction reversible ([cde6420](https://github.com/Meibbo/Vaultman/commit/cde642065512817483571dde6be5ab04ca5eaab1))
* **filters:** recompute the filtered set when the vault gains or loses a file ([cce9b0c](https://github.com/Meibbo/Vaultman/commit/cce9b0c91418e9fbfe20b956aec38833878d6fdf))
* highlight active file in Content explorer ([017d804](https://github.com/Meibbo/Vaultman/commit/017d804963f5c4a59ddda0a00022f651e408f3fb))
* **i18n:** label new explorer features ([2fe074d](https://github.com/Meibbo/Vaultman/commit/2fe074d0a8d8ea7869e78e24a10a403cf2f203c7))
* **i18n:** restore concise filter labels ([a9c8fdc](https://github.com/Meibbo/Vaultman/commit/a9c8fdc901233c31b6edb012b4dd6b48b8d3a717))
* **iconic:** bound runtime lookups and coalesce explorer refreshes ([6bd7761](https://github.com/Meibbo/Vaultman/commit/6bd776137ba64f583f82fc5dc902da9f7029fdb5))
* **iconic:** drive external sync from the vault raw event ([31657f5](https://github.com/Meibbo/Vaultman/commit/31657f5675b952cd8318b75399ca44726b466cb8))
* **iconic:** guard the data watch for windowless test environments ([8f05496](https://github.com/Meibbo/Vaultman/commit/8f054966f5d59cb9e27b86ee53f98cae41ace75c))
* **iconic:** move runtime rule evaluation off the render path ([5f57193](https://github.com/Meibbo/Vaultman/commit/5f571932069c77d8b6188637bf4f88bac0c7b753))
* **iconic:** open the real picker menus and rename the custom scope ([d944338](https://github.com/Meibbo/Vaultman/commit/d944338639aaf2604167255a179a0627166f66d2))
* **iconic:** pick up external data.json edits without a plugin restart ([09ae085](https://github.com/Meibbo/Vaultman/commit/09ae08594fe9be55a76d056127e9421c8d779156))
* **index:** withhold Top/Bottom index positions from the picker ([efdf479](https://github.com/Meibbo/Vaultman/commit/efdf4796617245a0bcbdeecd464bc0badd6e6a80))
* **layout:** preserve one hidden-scrollbar gutter ([3fb23d1](https://github.com/Meibbo/Vaultman/commit/3fb23d1756d2c4f41e30bd5a7ceb5ef2a34f1a2f))
* **operations:** restore rich queued rename flows ([45c8637](https://github.com/Meibbo/Vaultman/commit/45c863738999a95290431a712583b8f84ff7c7a0))
* **plugins:** allow Vaultman self-disable ([1c689ef](https://github.com/Meibbo/Vaultman/commit/1c689ef192ec7175bcfc45685fb41a3fc9747801))
* **properties:** make Convert bidirectional for linked values ([fea7c9c](https://github.com/Meibbo/Vaultman/commit/fea7c9c3c84004c64dfb1c2153d754c38d31bcc2))
* **release:** accept pnpm argument separator ([f2f8b15](https://github.com/Meibbo/Vaultman/commit/f2f8b15bc734d8c33c539dca624e5f592378b1cb))
* **release:** avoid non-interactive gh auth hang ([f4d331b](https://github.com/Meibbo/Vaultman/commit/f4d331b38bad068148490626015cb7a823972b1d))
* **release:** invoke Corepack safely on Windows ([533d93e](https://github.com/Meibbo/Vaultman/commit/533d93e24f7e20ec0af136f2b74133167559f8f5))
* **release:** report slow preflight progress ([09064fb](https://github.com/Meibbo/Vaultman/commit/09064fb10f6931cd26c6393a8f498b4f35cc16b6))
* **release:** satisfy beta4 verification gates ([f46bd03](https://github.com/Meibbo/Vaultman/commit/f46bd03be9458f6ac1d123e9753f702a1f74366b))
* resolve BT5 explorer lifecycle and sorting blockers ([c60e3bc](https://github.com/Meibbo/Vaultman/commit/c60e3bc77576e2e85b4aff377e8112aba08640c8))
* **search:** refresh the content preview after vault edits ([be2cce4](https://github.com/Meibbo/Vaultman/commit/be2cce4aa716a5cdc0cc879fa81062aa330ca58d))
* **search:** scan only text formats and keep typing responsive ([82f254c](https://github.com/Meibbo/Vaultman/commit/82f254ca07fb38c1d6578ef5f9f3d497cebda1c2))
* **search:** treat local raw-file offsets as authoritative per file ([a0e1e3f](https://github.com/Meibbo/Vaultman/commit/a0e1e3f11f5604ba5e889a3682c88b46a7d828f9))
* **snippets:** canonicalize reveal action ([70d36f5](https://github.com/Meibbo/Vaultman/commit/70d36f569f46ff6cfed095843f15cdd5d598eead))
* **tags:** reject invalid tag names, and label Text exclusions and replaces ([d4cf0d0](https://github.com/Meibbo/Vaultman/commit/d4cf0d0f2a3342814cf5f5a7e4b17e14366186ab))
* **tooling:** normalize all text checkouts ([e5b9b4d](https://github.com/Meibbo/Vaultman/commit/e5b9b4d3328cfee78e57f8d13cf9811d677876ad))
* **tooling:** normalize Svelte checkout line endings ([3f044ad](https://github.com/Meibbo/Vaultman/commit/3f044ada8008a1b256c7b47aafd6bf16bee9e33b))


### Performance Improvements

* **explorer:** reorder one node instead of rebuilding the Last opened tree ([d836725](https://github.com/Meibbo/Vaultman/commit/d836725597c73446061f1a9d16ee04d775a61040))
* **filters:** evaluate once and derive the filtered order in linear time ([e1097b6](https://github.com/Meibbo/Vaultman/commit/e1097b665af2296839f1110f6c1203e6e8cc4e25))


### Reverts

* **explorer:** drop BT4-017 containment and one-way slide ([8c264c1](https://github.com/Meibbo/Vaultman/commit/8c264c1de0530bff9700aa9f03d1a2262aabf8f7))

## [Unreleased]

---

## [1.2.0] - 2026-07-24

### Added

- Added Plugins and Snippets explorers with enable/disable actions and folders that open in the native file manager.
- Added plugin-emitted ribbon icons and working Iconic change-icon actions for Properties, Tags, and Plugins, with user overrides taking precedence.
- Added pause and resume controls for Content searches so partial matches can filter the explorer and be replaced before a full scan finishes.
- Added an Exclude file action and editable excluded-files setting for the Files explorer.
- Added floating-index state and scope persistence to saved view configs, plus configurable static or always-visible glyph colors.
- Added opt-in rainbow folder colors for the Files tree.
- Added remaining-inline-task statistics as an optional file cell, hover field, and sort option.
- Added a configurable context menu for every explorer node kind (Files, Properties, Tags, Content, Snippets, Plugins), each with its own show/hide, order, dividers and submenus under Layout Configuration.
- Added a Path cell that shows the full file path in the flat Files list, with independent Name and Path sorts.
- Added a shared glyph-color palette (default, faint, accent, custom, rainbow) for the Floating Index and the Explorer, and two seeded, deletable default View Compositions.
- Added an option to draw a node's icon in the caret column so labels stay aligned, and an option to bind Create File to a chosen Obsidian command.
- Added a persistent Last opened time for every file as an optional cell, hover field, and most-recent-first sort, plus Remaining tasks and Opened today statistics cards.
- Added a toolbar overflow strategy (condensed menu or horizontal scroll), optional placement of Create File/Folder on the toolbar, and Obsidian commands as toolbar action nodes.
- Added configurable Files hover information, word-count sorting, character statistics, and persistent statistics caching for large vaults.
- Added an optional floating index for Files, Props, and Tags with close, mode, scope, back, and collapse-aware lifecycle actions.
- Added Add-ons settings for Iconic integration and configurable file/folder icon visibility while preserving existing manual icon behavior.
- Added Niagara rail scrubbing with reversible drag behavior, prototype-shaped node displacement, joined action/index tracks, and optional soft scrolling.
- Added hold-click recursive folder expansion and an Updates message that explains renamed or newly introduced behavior after upgrading.
- Added named view layouts, Style Config controls, toolbar auto-hide with edge peek, and a condensed Files Tools menu.

### Changed

- Redesigned By level sorting with inline or submenu presentation, nested and fixed-folder controls, click-to-pick scopes, six-character scope labels, contextual options, and optional floating-index scope synchronization.
- Reorganized Layout Settings into clearer Explorer and Context menus sub-pages and moved dock visibility below the style preset controls.
- Renamed View config to View Compositions and Layout Settings to Layout Configuration; made file exclusion a composable filter node; and made the sort menu hide folder options in flat views and with nesting off.
- Aligned file opening, modifier-click handling, drag payloads, native menus, Make a copy, and third-party menu actions more closely with Obsidian Core Files.
- Renamed Action Presets to Operations Presets, moved View Config beneath it, and placed Floating index settings inside Style Config.
- Made explorer rows, floating-index nodes, tool condensation, and the optional index gutter respond to frame size and display density.
- Moved the performance HUD into Developer Tools and renamed Clean Selection to Clean Filters.
- Moved node-type sort controls into a second-level menu, enabled multi-selection, and renamed property/value sorting for clarity.
- Made applying a filter evaluate the vault once and derive the filtered order in linear time instead of re-sorting the subset on every change.
- Changed the default open mode for new vaults to open Vaultman in its own tab instead of the sidebar; existing vaults keep their saved choice.
- Made Layout Configuration the first settings section, and set new vaults to default to the compact preset without tab labels and to single-click badge cancel; existing vaults keep their saved values.
- Reorganized and relabeled the settings: the Layout Configuration entries use a Widget: naming scheme, the open-mode and Explorer controls were retitled with clearer descriptions, and the bulk-operation warning now defaults to 200 files.

### Fixed

- Fixed add-on index reveals, external plugin enable-state refresh, and plugin cell ordering so configuration precedes the right-aligned toggle.
- Fixed Content search scanning binary files, blocking input while typing, double-counting local matches, and retaining stale previews after replacements.
- Fixed explorer panels appearing empty after leaving and returning to a tab.
- Fixed Iconic runtime lookups hanging explorer renders and made external data.json icon changes refresh without restarting Vaultman.
- Fixed Niagara rail taps triggering deformation, restored free directional displacement within the frame, and added an optional stretch interaction mode.
- Restored narrow-toolbar tool-case collapse, reserved-lane rail positioning, and root-level sorting behavior that regressed in beta.3.
- Fixed the Files explorer not repainting when an icon changed, two tooltips competing for a row, and a collapsed parent inheriting the active-filter decoration instead of showing a small dot.
- Fixed a redundant re-render that swallowed the first click on an inactive explorer, a tooltip that needed a second hover, and the Last opened order not refreshing when a file was opened.
- Fixed active-filter highlighting so a collapsed parent bubbles the state of matching descendants.
- Fixed floating-index availability warnings, scoped collapse recovery, Collapse all recovery, bottom placement, plain rail styling, and switching between indexed explorers.
- Fixed Iconic overrides and plugin-provided file menu actions not propagating consistently to Vaultman file nodes.
- Fixed Niagara upward movement and reverse-direction dragging so the gesture scrubs through the opposite node range before moving the rail again.
- Fixed explorer and floating-index controls appearing disproportionately small on high-density mobile displays.
- Fixed the Content preview reading "with active filters" in accent; it now reports "with N excluded" in primary text, and a staged content replace is labeled "Replace" in the queue.
- Fixed the Properties Convert submenu disappearing on a value that was already a wikilink; it now keeps the case conversions and offers a Plain text inverse, and Titlecase no longer duplicates lowercase for linked values.
- Fixed a deleted file's node lingering in the Files explorer after the file was already gone, and newly created files not appearing until another refresh, by recomputing the filtered set whenever the vault gains or loses a file.
- Fixed the focus commands closing Vaultman when it was already open in sidebar or main mode; only the explicit Open command toggles now.
- Fixed the inline rename editor spilling out of its row and covering the neighbouring cells; it now takes the row height.
- Fixed the Last opened sort ordering folders alphabetically instead of by the newest note opened beneath them, and made recency ties fall back to modification time so a folder no longer drifts to the top for no reason.
- Fixed switching tabs stuttering while the Last opened sort was active by reordering only the opened note instead of rebuilding the whole tree.
- Fixed renaming a tag to a name with spaces or other invalid characters writing the broken name into every file's frontmatter, which left the tag unreachable until reload; invalid names are now rejected with the inline editor kept open.

## [1.2.0-beta.7] - 2026-07-23

### Added

- Added Plugins and Snippets explorers with enable/disable actions and folders that open in the native file manager.
- Added plugin-emitted ribbon icons and working Iconic change-icon actions for Properties, Tags, and Plugins, with user overrides taking precedence.
- Added pause and resume controls for Content searches so partial matches can filter the explorer and be replaced before a full scan finishes.
- Added an Exclude file action and editable excluded-files setting for the Files explorer.
- Added floating-index state and scope persistence to saved view configs, plus configurable static or always-visible glyph colors.
- Added opt-in rainbow folder colors for the Files tree.
- Added remaining-inline-task statistics as an optional file cell, hover field, and sort option.
- Added a configurable context menu for every explorer node kind (Files, Properties, Tags, Content, Snippets, Plugins), each with its own show/hide, order, dividers and submenus under Layout Configuration.
- Added a Path cell that shows the full file path in the flat Files list, with independent Name and Path sorts.
- Added a shared glyph-color palette (default, faint, accent, custom, rainbow) for the Floating Index and the Explorer, and two seeded, deletable default View Compositions.
- Added an option to draw a node's icon in the caret column so labels stay aligned, and an option to bind Create File to a chosen Obsidian command.
- Added a persistent Last opened time for every file as an optional cell, hover field, and most-recent-first sort, plus Remaining tasks and Opened today statistics cards.
- Added a toolbar overflow strategy (condensed menu or horizontal scroll), optional placement of Create File/Folder on the toolbar, and Obsidian commands as toolbar action nodes.
- Added configurable Files hover information, word-count sorting, character statistics, and persistent statistics caching for large vaults.
- Added an optional floating index for Files, Props, and Tags with close, mode, scope, back, and collapse-aware lifecycle actions.
- Added Add-ons settings for Iconic integration and configurable file/folder icon visibility while preserving existing manual icon behavior.
- Added Niagara rail scrubbing with reversible drag behavior, prototype-shaped node displacement, joined action/index tracks, and optional soft scrolling.
- Added hold-click recursive folder expansion and an Updates message that explains renamed or newly introduced behavior after upgrading.
- Added named view layouts, Style Config controls, toolbar auto-hide with edge peek, and a condensed Files Tools menu.

### Changed

- Redesigned By level sorting with inline or submenu presentation, nested and fixed-folder controls, click-to-pick scopes, six-character scope labels, contextual options, and optional floating-index scope synchronization.
- Reorganized Layout Settings into clearer Explorer and Context menus sub-pages and moved dock visibility below the style preset controls.
- Renamed View config to View Compositions and Layout Settings to Layout Configuration; made file exclusion a composable filter node; and made the sort menu hide folder options in flat views and with nesting off.
- Aligned file opening, modifier-click handling, drag payloads, native menus, Make a copy, and third-party menu actions more closely with Obsidian Core Files.
- Renamed Action Presets to Operations Presets, moved View Config beneath it, and placed Floating index settings inside Style Config.
- Made explorer rows, floating-index nodes, tool condensation, and the optional index gutter respond to frame size and display density.
- Moved the performance HUD into Developer Tools and renamed Clean Selection to Clean Filters.
- Moved node-type sort controls into a second-level menu, enabled multi-selection, and renamed property/value sorting for clarity.
- Made applying a filter evaluate the vault once and derive the filtered order in linear time instead of re-sorting the subset on every change.
- Changed the default open mode for new vaults to open Vaultman in its own tab instead of the sidebar; existing vaults keep their saved choice.
- Made Layout Configuration the first settings section, and set new vaults to default to the compact preset without tab labels and to single-click badge cancel; existing vaults keep their saved values.

### Fixed

- Fixed add-on index reveals, external plugin enable-state refresh, and plugin cell ordering so configuration precedes the right-aligned toggle.
- Fixed Content search scanning binary files, blocking input while typing, double-counting local matches, and retaining stale previews after replacements.
- Fixed explorer panels appearing empty after leaving and returning to a tab.
- Fixed Iconic runtime lookups hanging explorer renders and made external data.json icon changes refresh without restarting Vaultman.
- Fixed Niagara rail taps triggering deformation, restored free directional displacement within the frame, and added an optional stretch interaction mode.
- Restored narrow-toolbar tool-case collapse, reserved-lane rail positioning, and root-level sorting behavior that regressed in beta.3.
- Fixed the Files explorer not repainting when an icon changed, two tooltips competing for a row, and a collapsed parent inheriting the active-filter decoration instead of showing a small dot.
- Fixed a redundant re-render that swallowed the first click on an inactive explorer, a tooltip that needed a second hover, and the Last opened order not refreshing when a file was opened.
- Fixed active-filter highlighting so a collapsed parent bubbles the state of matching descendants.
- Fixed floating-index availability warnings, scoped collapse recovery, Collapse all recovery, bottom placement, plain rail styling, and switching between indexed explorers.
- Fixed Iconic overrides and plugin-provided file menu actions not propagating consistently to Vaultman file nodes.
- Fixed Niagara upward movement and reverse-direction dragging so the gesture scrubs through the opposite node range before moving the rail again.
- Fixed explorer and floating-index controls appearing disproportionately small on high-density mobile displays.
- Fixed the Content preview reading "with active filters" in accent; it now reports "with N excluded" in primary text, and a staged content replace is labeled "Replace" in the queue.
- Fixed the Properties Convert submenu disappearing on a value that was already a wikilink; it now keeps the case conversions and offers a Plain text inverse, and Titlecase no longer duplicates lowercase for linked values.
- Fixed the focus commands closing Vaultman when it was already open in sidebar or main mode; only the explicit Open command toggles now.
- Fixed the inline rename editor spilling out of its row and covering the neighbouring cells; it now takes the row height.
- Fixed the Last opened sort ordering folders alphabetically instead of by the newest note opened beneath them, and made recency ties fall back to modification time so a folder no longer drifts to the top for no reason.
- Fixed switching tabs stuttering while the Last opened sort was active by reordering only the opened note instead of rebuilding the whole tree.
- Fixed renaming a tag to a name with spaces or other invalid characters writing the broken name into every file's frontmatter, which left the tag unreachable until reload; invalid names are now rejected with the inline editor kept open.

## [1.2.0-beta.6] - 2026-07-21

### Added

- Added Plugins and Snippets explorers with enable/disable actions and folders that open in the native file manager.
- Added plugin-emitted ribbon icons and working Iconic change-icon actions for Properties, Tags, and Plugins, with user overrides taking precedence.
- Added pause and resume controls for Content searches so partial matches can filter the explorer and be replaced before a full scan finishes.
- Added an Exclude file action and editable excluded-files setting for the Files explorer.
- Added floating-index state and scope persistence to saved view configs, plus configurable static or always-visible glyph colors.
- Added opt-in rainbow folder colors for the Files tree.
- Added remaining-inline-task statistics as an optional file cell, hover field, and sort option.
- Added a configurable context menu for every explorer node kind (Files, Properties, Tags, Content, Snippets, Plugins), each with its own show/hide, order, dividers and submenus under Layout Configuration.
- Added a Path cell that shows the full file path in the flat Files list, with independent Name and Path sorts.
- Added a shared glyph-color palette (default, faint, accent, custom, rainbow) for the Floating Index and the Explorer, and two seeded, deletable default View Compositions.
- Added an option to draw a node's icon in the caret column so labels stay aligned, and an option to bind Create File to a chosen Obsidian command.
- Added a persistent Last opened time for every file as an optional cell, hover field, and most-recent-first sort, plus Remaining tasks and Opened today statistics cards.
- Added a toolbar overflow strategy (condensed menu or horizontal scroll), optional placement of Create File/Folder on the toolbar, and Obsidian commands as toolbar action nodes.
- Added configurable Files hover information, word-count sorting, character statistics, and persistent statistics caching for large vaults.
- Added an optional floating index for Files, Props, and Tags with close, mode, scope, back, and collapse-aware lifecycle actions.
- Added Add-ons settings for Iconic integration and configurable file/folder icon visibility while preserving existing manual icon behavior.
- Added Niagara rail scrubbing with reversible drag behavior, prototype-shaped node displacement, joined action/index tracks, and optional soft scrolling.
- Added hold-click recursive folder expansion and an Updates message that explains renamed or newly introduced behavior after upgrading.
- Added named view layouts, Style Config controls, toolbar auto-hide with edge peek, and a condensed Files Tools menu.

### Changed

- Redesigned By level sorting with inline or submenu presentation, nested and fixed-folder controls, click-to-pick scopes, six-character scope labels, contextual options, and optional floating-index scope synchronization.
- Reorganized Layout Settings into clearer Explorer and Context menus sub-pages and moved dock visibility below the style preset controls.
- Renamed View config to View Compositions and Layout Settings to Layout Configuration; made file exclusion a composable filter node; and made the sort menu hide folder options in flat views and with nesting off.
- Aligned file opening, modifier-click handling, drag payloads, native menus, Make a copy, and third-party menu actions more closely with Obsidian Core Files.
- Renamed Action Presets to Operations Presets, moved View Config beneath it, and placed Floating index settings inside Style Config.
- Made explorer rows, floating-index nodes, tool condensation, and the optional index gutter respond to frame size and display density.
- Moved the performance HUD into Developer Tools and renamed Clean Selection to Clean Filters.
- Moved node-type sort controls into a second-level menu, enabled multi-selection, and renamed property/value sorting for clarity.

### Fixed

- Fixed add-on index reveals, external plugin enable-state refresh, and plugin cell ordering so configuration precedes the right-aligned toggle.
- Fixed Content search scanning binary files, blocking input while typing, double-counting local matches, and retaining stale previews after replacements.
- Fixed explorer panels appearing empty after leaving and returning to a tab.
- Fixed Iconic runtime lookups hanging explorer renders and made external data.json icon changes refresh without restarting Vaultman.
- Fixed Niagara rail taps triggering deformation, restored free directional displacement within the frame, and added an optional stretch interaction mode.
- Restored narrow-toolbar tool-case collapse, reserved-lane rail positioning, and root-level sorting behavior that regressed in beta.3.
- Fixed the Files explorer not repainting when an icon changed, two tooltips competing for a row, and a collapsed parent inheriting the active-filter decoration instead of showing a small dot.
- Fixed a redundant re-render that swallowed the first click on an inactive explorer, a tooltip that needed a second hover, and the Last opened order not refreshing when a file was opened.
- Fixed active-filter highlighting so a collapsed parent bubbles the state of matching descendants.
- Fixed floating-index availability warnings, scoped collapse recovery, Collapse all recovery, bottom placement, plain rail styling, and switching between indexed explorers.
- Fixed Iconic overrides and plugin-provided file menu actions not propagating consistently to Vaultman file nodes.
- Fixed Niagara upward movement and reverse-direction dragging so the gesture scrubs through the opposite node range before moving the rail again.
- Fixed explorer and floating-index controls appearing disproportionately small on high-density mobile displays.

## [1.2.0-beta.5] - 2026-07-20

### Added

- Added Plugins and Snippets explorers with enable/disable actions and folders that open in the native file manager.
- Added plugin-emitted ribbon icons and working Iconic change-icon actions for Properties, Tags, and Plugins, with user overrides taking precedence.
- Added pause and resume controls for Content searches so partial matches can filter the explorer and be replaced before a full scan finishes.
- Added an Exclude file action and editable excluded-files setting for the Files explorer.
- Added floating-index state and scope persistence to saved view configs, plus configurable static or always-visible glyph colors.
- Added opt-in rainbow folder colors for the Files tree.
- Added remaining-inline-task statistics as an optional file cell, hover field, and sort option.
- Added configurable Files hover information, word-count sorting, character statistics, and persistent statistics caching for large vaults.
- Added an optional floating index for Files, Props, and Tags with close, mode, scope, back, and collapse-aware lifecycle actions.
- Added Add-ons settings for Iconic integration and configurable file/folder icon visibility while preserving existing manual icon behavior.
- Added Niagara rail scrubbing with reversible drag behavior, prototype-shaped node displacement, joined action/index tracks, and optional soft scrolling.
- Added hold-click recursive folder expansion and an Updates message that explains renamed or newly introduced behavior after upgrading.
- Added named view layouts, Style Config controls, toolbar auto-hide with edge peek, and a condensed Files Tools menu.

### Changed

- Redesigned By level sorting with inline or submenu presentation, nested and fixed-folder controls, click-to-pick scopes, six-character scope labels, contextual options, and optional floating-index scope synchronization.
- Reorganized Layout Settings into clearer Explorer and Context menus sub-pages and moved dock visibility below the style preset controls.
- Aligned file opening, modifier-click handling, drag payloads, native menus, Make a copy, and third-party menu actions more closely with Obsidian Core Files.
- Renamed Action Presets to Operations Presets, moved View Config beneath it, and placed Floating index settings inside Style Config.
- Made explorer rows, floating-index nodes, tool condensation, and the optional index gutter respond to frame size and display density.
- Moved the performance HUD into Developer Tools and renamed Clean Selection to Clean Filters.
- Moved node-type sort controls into a second-level menu, enabled multi-selection, and renamed property/value sorting for clarity.

### Fixed

- Fixed add-on index reveals, external plugin enable-state refresh, and plugin cell ordering so configuration precedes the right-aligned toggle.
- Fixed Content search scanning binary files, blocking input while typing, double-counting local matches, and retaining stale previews after replacements.
- Fixed explorer panels appearing empty after leaving and returning to a tab.
- Fixed Iconic runtime lookups hanging explorer renders and made external data.json icon changes refresh without restarting Vaultman.
- Fixed Niagara rail taps triggering deformation, restored free directional displacement within the frame, and added an optional stretch interaction mode.
- Restored narrow-toolbar tool-case collapse, reserved-lane rail positioning, and root-level sorting behavior that regressed in beta.3.
- Fixed active-filter highlighting so a collapsed parent bubbles the state of matching descendants.
- Fixed floating-index availability warnings, scoped collapse recovery, Collapse all recovery, bottom placement, plain rail styling, and switching between indexed explorers.
- Fixed Iconic overrides and plugin-provided file menu actions not propagating consistently to Vaultman file nodes.
- Fixed Niagara upward movement and reverse-direction dragging so the gesture scrubs through the opposite node range before moving the rail again.
- Fixed explorer and floating-index controls appearing disproportionately small on high-density mobile displays.

## [1.2.0-beta.4] - 2026-07-19

### Added

- Added Plugins and Snippets explorers with enable/disable actions and folders that open in the native file manager.
- Added plugin-emitted ribbon icons and working Iconic change-icon actions for Properties, Tags, and Plugins, with user overrides taking precedence.
- Added pause and resume controls for Content searches so partial matches can filter the explorer and be replaced before a full scan finishes.
- Added an Exclude file action and editable excluded-files setting for the Files explorer.
- Added floating-index state and scope persistence to saved view configs, plus configurable static or always-visible glyph colors.
- Added opt-in rainbow folder colors for the Files tree.
- Added remaining-inline-task statistics as an optional file cell, hover field, and sort option.
- Added configurable Files hover information, word-count sorting, character statistics, and persistent statistics caching for large vaults.
- Added an optional floating index for Files, Props, and Tags with close, mode, scope, back, and collapse-aware lifecycle actions.
- Added Add-ons settings for Iconic integration and configurable file/folder icon visibility while preserving existing manual icon behavior.
- Added Niagara rail scrubbing with reversible drag behavior, prototype-shaped node displacement, joined action/index tracks, and optional soft scrolling.
- Added hold-click recursive folder expansion and an Updates message that explains renamed or newly introduced behavior after upgrading.
- Added named view layouts, Style Config controls, toolbar auto-hide with edge peek, and a condensed Files Tools menu.

### Changed

- Redesigned By level sorting with inline or submenu presentation, nested and fixed-folder controls, click-to-pick scopes, six-character scope labels, contextual options, and optional floating-index scope synchronization.
- Reorganized Layout Settings into clearer Explorer and Context menus sub-pages and moved dock visibility below the style preset controls.
- Aligned file opening, modifier-click handling, drag payloads, native menus, Make a copy, and third-party menu actions more closely with Obsidian Core Files.
- Renamed Action Presets to Operations Presets, moved View Config beneath it, and placed Floating index settings inside Style Config.
- Made explorer rows, floating-index nodes, tool condensation, and the optional index gutter respond to frame size and display density.
- Moved the performance HUD into Developer Tools and renamed Clean Selection to Clean Filters.
- Moved node-type sort controls into a second-level menu, enabled multi-selection, and renamed property/value sorting for clarity.

### Fixed

- Fixed add-on index reveals, external plugin enable-state refresh, and plugin cell ordering so configuration precedes the right-aligned toggle.
- Fixed Content search scanning binary files, blocking input while typing, double-counting local matches, and retaining stale previews after replacements.
- Fixed explorer panels appearing empty after leaving and returning to a tab.
- Fixed Iconic runtime lookups hanging explorer renders and made external data.json icon changes refresh without restarting Vaultman.
- Fixed Niagara rail taps triggering deformation, restored free directional displacement within the frame, and added an optional stretch interaction mode.
- Restored narrow-toolbar tool-case collapse, reserved-lane rail positioning, and root-level sorting behavior that regressed in beta.3.
- Fixed active-filter highlighting so a collapsed parent bubbles the state of matching descendants.
- Fixed floating-index availability warnings, scoped collapse recovery, Collapse all recovery, bottom placement, plain rail styling, and switching between indexed explorers.
- Fixed Iconic overrides and plugin-provided file menu actions not propagating consistently to Vaultman file nodes.
- Fixed Niagara upward movement and reverse-direction dragging so the gesture scrubs through the opposite node range before moving the rail again.
- Fixed explorer and floating-index controls appearing disproportionately small on high-density mobile displays.

## [1.2.0-beta.3] - 2026-07-18

### Added

- Added Plugins and Snippets explorers with enable/disable actions and folders that open in the native file manager.
- Added configurable Files hover information, word-count sorting, character statistics, and persistent statistics caching for large vaults.
- Added an optional floating index for Files, Props, and Tags with close, mode, scope, back, and collapse-aware lifecycle actions.
- Added Add-ons settings for Iconic integration and configurable file/folder icon visibility while preserving existing manual icon behavior.
- Added Niagara rail scrubbing with reversible drag behavior, prototype-shaped node displacement, joined action/index tracks, and optional soft scrolling.
- Added hold-click recursive folder expansion and an Updates message that explains renamed or newly introduced behavior after upgrading.
- Added named view layouts, Style Config controls, toolbar auto-hide with edge peek, and a condensed Files Tools menu.

### Changed

- Aligned file opening, modifier-click handling, drag payloads, native menus, Make a copy, and third-party menu actions more closely with Obsidian Core Files.
- Renamed Action Presets to Operations Presets, moved View Config beneath it, and placed Floating index settings inside Style Config.
- Made explorer rows, floating-index nodes, tool condensation, and the optional index gutter respond to frame size and display density.
- Moved the performance HUD into Developer Tools and renamed Clean Selection to Clean Filters.
- Moved node-type sort controls into a second-level menu, enabled multi-selection, and renamed property/value sorting for clarity.

### Fixed

- Fixed active-filter highlighting so a collapsed parent bubbles the state of matching descendants.
- Fixed floating-index availability warnings, scoped collapse recovery, Collapse all recovery, bottom placement, plain rail styling, and switching between indexed explorers.
- Fixed Iconic overrides and plugin-provided file menu actions not propagating consistently to Vaultman file nodes.
- Fixed Niagara upward movement and reverse-direction dragging so the gesture scrubs through the opposite node range before moving the rail again.
- Fixed explorer and floating-index controls appearing disproportionately small on high-density mobile displays.

## [1.2.0-beta.2] - 2026-07-17

### Added

- Added Plugins and Snippets explorers with enable/disable actions and folders that open in the native file manager.
- Added configurable Files hover information, word-count sorting, character statistics, and persistent statistics caching for large vaults.
- Added an optional floating index for Files, Props, and Tags with close, mode, scope, back, and collapse-aware lifecycle actions.
- Added Add-ons settings for Iconic integration and configurable file/folder icon visibility while preserving existing manual icon behavior.
- Added Niagara rail scrubbing with reversible drag behavior, prototype-shaped node displacement, joined action/index tracks, and optional soft scrolling.
- Added hold-click recursive folder expansion and an Updates message that explains renamed or newly introduced behavior after upgrading.
- Added named view layouts, Style Config controls, toolbar auto-hide with edge peek, and a condensed Files Tools menu.

### Changed

- Aligned file opening, modifier-click handling, drag payloads, native menus, Make a copy, and third-party menu actions more closely with Obsidian Core Files.
- Renamed Action Presets to Operations Presets, moved View Config beneath it, and placed Floating index settings inside Style Config.
- Made explorer rows, floating-index nodes, tool condensation, and the optional index gutter respond to frame size and display density.
- Moved the performance HUD into Developer Tools and renamed Clean Selection to Clean Filters.
- Moved node-type sort controls into a second-level menu, enabled multi-selection, and renamed property/value sorting for clarity.

### Fixed

- Fixed active-filter highlighting so a collapsed parent bubbles the state of matching descendants.
- Fixed floating-index availability warnings, scoped collapse recovery, Collapse all recovery, bottom placement, plain rail styling, and switching between indexed explorers.
- Fixed Iconic overrides and plugin-provided file menu actions not propagating consistently to Vaultman file nodes.
- Fixed Niagara upward movement and reverse-direction dragging so the gesture scrubs through the opposite node range before moving the rail again.
- Fixed explorer and floating-index controls appearing disproportionately small on high-density mobile displays.

## [1.2.0-beta.1] — 2026-07-15

### Added

- Added an optional floating index for Files, Props, and Tags, with literal glyphs that follow the visible explorer order and route jumps through the active explorer panel.
- Added index lifecycle actions for close, files/folders mode, scope drill, back, and collapse-aware return to a valid level.
- Added optional Niagara scrubbing with the prototype curve, reversible movement, soft scrolling, joined action/index tracks, configurable rail placement, and a plain rail style.
- Added named view layouts, Style Config controls, toolbar auto-hide with edge peek, and an optional Files Tools menu that keeps the primary toolbar to at most five nodes.

### Changed

- Renamed Action Presets to Operations Presets and moved View Config directly below it in Settings.
- Replaced the inactive instant-jump setting with Soft scroll and kept the deferred name/glow sub-effects out of the beta UI.

### Fixed

- Fixed the floating index lifecycle when switching Content, collapsing a scoped node, or using Collapse all.
- Fixed Niagara upward scrubbing, action activation during scrub, bottom rail positioning, plain styling across indexed nodes, and duplicate group navigation.

### Known beta gaps

- Props and Tags table/grid modes do not yet expose scroll-to routing, so their floating-index jumps are limited to tree mode; Files supports its available views.
- Name Pill, Scrub Glow, Name Cell, Name Reveal, and Name Letters remain deferred for later 1.2.x work.
- Real-device mobile, clean-install, and stable-upgrade validation remain required before promotion to `1.2.0` stable.

---

## [1.1.6] — 2026-06-23

### Fixed

- Active-filters counter now shows visible/total-vault file counts instead of repeating the filtered count.
- Content search header counts the matched files while a search is running, updating as results arrive, instead of showing the full scope total.
- Content find and replace inputs now have a bottom border that starts at the placeholder text rather than under the leading icon.
- Word count no longer reports a count for binary files (PNG and other non-Markdown files).
- Word count now matches Obsidian's own counter, including accented text, instead of counting Markdown punctuation as words.
- The Files Words cell refreshes in near-real time as files are saved, without needing to open Statistics or toggle the column.

---

## [1.1.1] — 2026-06-09

### Added

- Added the Data surface as the stable explorer workspace for Files, Props, Tags, Content, active filters, Queue, and Statistics.
- Added Core-like explorer controls, including dock-off tab navigation, view/sort/search controls, resizable table surfaces, Files grid view, and nested/path view behavior.
- Added Content search and replace with queued operations, native-search fallback support, sorting, expand/collapse controls, and result landings.
- Added queue templates, filter templates, risk warnings for bulk operations, and safer duplicate/contradictory operation handling.
- Added cache-backed Statistics projections, live update support, and a local performance HUD for large-vault diagnostics.

### Changed

- Promoted the validated `1.1.0-beta.4` code line to stable as `1.1.1`; `1.1.0` remains skipped for stable because that tag already exists from earlier prerelease work.
- Replaced the npm-based release gate with the pnpm/Node 24 toolchain used by the beta stream.
- Aligned the minimal mobile navbar with Obsidian Core Files geometry instead of a custom floating visual layer.
- Changed Files path display so `Nested` on/off is the single tree/path presentation toggle.

### Fixed

- Fixed severe explorer virtualization regressions, including stale rows, duplicated Files rows, scroll lifecycle leaks, tab-switch offsets, and row rebuild churn.
- Fixed Files explorer filtering so folder and file-type filters hide unrelated empty folders and present matched folder contents as the active root surface.
- Fixed Files, Tags, and Props drag payloads, folder queue handling, root-level drops, and Obsidian editor/frontmatter drop behavior.
- Fixed mobile phone navigation regressions in minimal mode, including navbar placement, search toggle behavior, and transparent Core-like controls.
- Fixed nested explorer indentation guides so `nested=on` exposes hierarchy lines without changing virtual row heights.
- Fixed multiple stable UX placeholders, silent setting reactivity issues, active-filter zero-result warnings, and queue warning indicators.
- Fixed Obsidian Scorecard CSS regressions by guarding against `!important`, `display: contents`, and unsupported stable styling patterns.

---

## [1.1.0-beta.4] — 2026-06-09

### Changed

- Hardened beta release publishing so prerelease tags are created as GitHub prereleases and are not marked latest.
- Improved mobile minimal navbar behavior so the search toggle can close the searchbox directly.
- Rebased active folder filters so filtered folder contents appear as a temporary root surface while filters are active.

### Fixed

- Fixed mobile minimal navbar styling that introduced black side bars, borders, and extra visual layers over Obsidian's phone navigation.
- Fixed Files explorer drag-and-drop so nested files and folders can be moved back to the vault root by dropping onto a level-1 row.
- Fixed folder delete queue handling so empty folders can be queued and deleted as folder targets instead of reporting zero affected files.
- Fixed duplicate native file move menu entries by keeping Vaultman's autosuggest move action as the visible move command.
- Fixed Statistics page navigation parity by restoring a minimal header tab menu surface.

### Known beta gaps

- Clean-install validation on a real phone is still required before any stable promotion.
- Stable promotion should use a normal-version release from the same code lineage, not a mutation of this prerelease tag.

---

## [1.1.0-beta.3] — 2026-06-09

### Added

- Added a performance probe and scroll smoke scripts for explorer regression checks.
- Added Core-like DnD action guides for Vaultman file, tag, and property drags.

### Changed

- Improved mobile/minimal navigation behavior, searchbox layout, explorer row styling, and Content input controls.
- Updated file/property/tag explorer DnD payloads so Vaultman nodes participate more closely in Obsidian-native drag flows.

### Fixed

- Fixed property drops into Markdown editors so frontmatter entries can be applied without the invalid-drop target path.
- Fixed file/folder drag payloads so file nodes expose native Obsidian file payloads for workspace tab drops.
- Fixed root-level drops for files and nested tags.
- Fixed queue/filter islands retaining dock spacing when the dock is disabled.
- Fixed release metadata registration so new versions are added to `versions.json` even when they share `minAppVersion`.

### Known beta gaps

- Full Core Files DnD parity still needs manual validation for destructive move operations and workspace tabbar drops.
- Explorer virtualization remains release-critical to watch under large-vault scroll and tab-switch stress.

---

## [1.1.0-beta.2] — 2026-06-08

### Added

- Added a minimal-style Data surface with dock-off navigation, Core-like header controls, and Data tab
  routing for Files, Props, Tags, Content, Active filters, Queue, and Statistics.
- Added table and grid view parity work for Files, plus table view support for Props and Tags with
  resizable Bases-style columns.
- Added Content search result hierarchy with Core Search-like rows, result sorting, expand/collapse all,
  idle/no-result landings, and queue-compatible replace behavior.
- Added queue risk warnings for bulk operations and folder operations, plus duplicate/contradictory
  operation guards.
- Added explorer drag payload support for files, tags, and properties, including frontmatter-aware
  property drops and wikilink file drops.

### Changed

- Moved Files into the Data header tab menu and made Data the primary explorer surface for beta testing.
- Split explorer search state by surface so Props/Tags search terms do not leak into Files filters.
- Improved Files, Props, Tags, and Content sorting, including modified-time and created-time fields.
- Reworked Statistics routing, scoped projections, and cache-backed file time data for the beta gate.
- Added `dev` branch coverage to CI, CodeQL, and OpenSSF Scorecard workflows.

### Fixed

- Fixed multiple stable UX placeholders and non-reactive settings, including tab-label visibility and
  minimal-style FAB/dock updates.
- Fixed Files explorer extension display, folder filtering, folder queue operations, active-file styling,
  file-grid selection/context menu behavior, and empty-folder affordances.
- Fixed Props explorer property-name search semantics, property type display, value filtering, and grid
  node interactions.
- Fixed Tags nested/simple grouping semantics and view-grid interaction behavior.
- Fixed severe explorer virtualization regressions: stale Files table roots, duplicated file rows, scroll
  lifecycle leaks, row rebuild churn, and tab-switch vertical offset jumps.
- Fixed Content search fallback so hidden matches missed by the native Search DOM can still appear in
  Vaultman results.

### Known beta gaps

- Full Core Search parity for 1000+ result virtualization, snippet context controls, copy results, and
  bookmark actions remains deferred.
- Full Content table renderer parity remains deferred while the Core Search-compatible result-list
  surface stabilizes.
- Further indexed or batched filter-performance work may still be needed if rapid active-filter clicks
  produce user-visible FPS drops in plugin-dev.

---

## [1.0.2] — 2026-06-04

### Fixed

- Removed the redundant queue-details value guard reported by CodeQL.
- Kept stable CSS compatible with Obsidian Scorecard expectations by blocking
  `!important` and `display: contents` release regressions.
- Removed stable-channel placeholder tabs and no-op controls while keeping
  functional settings visible.

### Changed

- Normalized the stable release gate on pnpm and Node 24 while keeping the
  esbuild production build.
- Added release-blocking `svelte-check`, format, stylelint, Scorecard, and
  security audit gates.
- Added a public security reporting policy.
- Reordered the sidebar dock to start on Filters, moved Content operations into
  Filters, moved Files into Operations, and placed the Statistics scope selector
  below the metrics.
- Added live settings refresh for Svelte views so tab-label visibility changes
  no longer require reloading the plugin.

---

## [1.0.1] — 2026-05-26

### Fixed
- Published a stable `1.0.x` patch from the `1.0.0` product line.
- Added release workflow provenance for `main.js`, `manifest.json`, and `styles.css` assets.
- Resolved Obsidian Scorecard findings for manifest punctuation, source directive comments, popout-compatible globals, language detection, and unnecessary assertions.

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
- **Inline file rename**: double-click a name cell in the grid (configurable via `gridEditableColumns` setting) — *note: currently has a bug, see Known Issues*
- **Live preview rendering**: property values render with Obsidian formatting (tags, wikilinks, dates) via `MarkdownRenderer` — supports plain, chunked, and full render modes — *note: tags still don't render exactly like reading view; chunked mode shows a visible re-render flash*
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

[Unreleased]: https://github.com/Meibbo/Vaultman/compare/1.2.0...HEAD
[1.2.0-beta.1]: https://github.com/Meibbo/Vaultman/compare/1.1.6...1.2.0-beta.1
[1.1.6]: https://github.com/Meibbo/Vaultman/compare/1.1.1...1.1.6
[1.1.1]: https://github.com/Meibbo/Vaultman/compare/1.0.1...1.1.1
[1.1.0-beta.4]: https://github.com/Meibbo/Vaultman/compare/1.1.0-beta.3...1.1.0-beta.4
[1.1.0-beta.3]: https://github.com/Meibbo/Vaultman/compare/1.1.0-beta.2...1.1.0-beta.3
[1.1.0-beta.2]: https://github.com/Meibbo/Vaultman/compare/1.0.1...1.1.0-beta.2
[1.0.2]: https://github.com/Meibbo/Vaultman/compare/1.0.1...1.0.2
[1.0.1]: https://github.com/Meibbo/Vaultman/compare/1.0.0...1.0.1
[1.0.0-beta.5]: https://github.com/Meibbo/Vaultman-Plugin/compare/1.0.0-beta.4...1.0.0-beta.5
[1.0.0-beta.4]: https://github.com/Meibbo/Vaultman-Plugin/compare/1.0.0-beta.3...1.0.0-beta.4
[1.0.0-beta.3]: https://github.com/Meibbo/Vaultman-Plugin/compare/1.0.0-beta.2...1.0.0-beta.3
[1.0.0-beta.2]: https://github.com/Meibbo/Vaultman-Plugin/compare/1.0.0-beta.1...1.0.0-beta.2
[1.0.0-beta.1]: https://github.com/Meibbo/Vaultman-Plugin/compare/0.9.0...1.0.0-beta.1
[0.9.0]: https://github.com/Meibbo/Vaultman-Plugin/compare/0.8.0...0.9.0
[0.8.0]: https://github.com/Meibbo/Vaultman-Plugin/compare/0.7.0...0.8.0
[0.7.0]: https://github.com/Meibbo/Vaultman-Plugin/compare/0.1.0...0.7.0
[0.1.0]: https://github.com/Meibbo/Vaultman-Plugin/releases/tag/0.1.0
[1.2.0-beta.2]: https://github.com/Meibbo/Vaultman/compare/1.2.0-beta.1...1.2.0-beta.2
[1.2.0-beta.3]: https://github.com/Meibbo/Vaultman/compare/1.2.0-beta.2...1.2.0-beta.3
[1.2.0-beta.4]: https://github.com/Meibbo/Vaultman/compare/1.2.0-beta.3...1.2.0-beta.4
[1.2.0-beta.5]: https://github.com/Meibbo/Vaultman/compare/1.2.0-beta.4...1.2.0-beta.5
[1.2.0-beta.6]: https://github.com/Meibbo/Vaultman/compare/1.2.0-beta.5...1.2.0-beta.6
[1.2.0-beta.7]: https://github.com/Meibbo/Vaultman/compare/1.2.0-beta.6...1.2.0-beta.7
[1.2.0]: https://github.com/Meibbo/Vaultman/compare/1.2.0-beta.7...1.2.0
