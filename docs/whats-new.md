# What's new in Vaultman

A brief, benefit-focused look at each Vaultman release. New entries appear first; each
section links to the technical changelog for complete details.

<!--
Editorial template for the next release (remove this comment before publication):

<a id="vX-Y-Z-channel-N"></a>
## X.Y.Z-channel.N — A short benefit-led title
<!-- reviewed: true -->

One inviting sentence that explains who benefits and why.

- **Benefit, not subsystem:** Explain the user-visible improvement in plain language.
- **Keep it selective:** Prefer three to five highlights; leave internals to CHANGELOG.
- **Images are optional:** Use alt text and repository-relative paths, for example
  .

[Full changelog](../CHANGELOG.md#exact-github-anchor-for-this-release)
-->

<a id="v1-3-0-beta-7"></a>

## 1.3.0-beta.7 — Groups that reveal, menus you own

<!-- reviewed: true -->

Vaultman 1.3.0-beta.7 makes large vaults easier to group and command, from reveal-mode note groups to toolbar menus you configure yourself.

- **Groups ride the scene:** Custom groups and presets now project from the scene itself, so creating or deleting a group acts on what you see, with headers that open on first sight and bubble counts like folders.
- **Menus you own:** Global menu layouts are configurable in settings, with a catalog of toolbar menus and per-instance right-click alternatives that stay visible where they apply.
- **Commands go further:** Scene engines and go-to-tabs are publishable commands, and toolbar menu actions register through the same pipeline, so search and navigation stay consistent.
- **Selections that keep up:** Checkbox changes repaint immediately across scenes, selected folders reach queued operations, and long-pressing a parent selects the whole branch.
- **Calmer chrome:** Edge hit-zones wake a collapsed sidebar on hover, the floating rail respects the toolbar, and revealing a tag flashes its pill instead of the whole row.

[Full changelog](../CHANGELOG.md#130-beta7---2026-09-19)

<a id="v1-3-0-beta-6"></a>

## 1.3.0-beta.6 — Native-feeling properties and calmer trees

<!-- reviewed: true -->

Vaultman 1.3.0-beta.6 makes property capture feel native and large trees easier to scan, from inline editing to group presets.

- **Edit rows in place:** A new Input mode for Props turns any row click into the inline editor, and revealing a file ends with an in-list "+ Add property" row that walks through name and value entry.
- **Suggestions that match the panel:** Property and value suggesters draw from the same projection the panel renders, with type icons, fuzzy matching and duplicates excluded.
- **Sort and shape your lists:** Tag-count and compact-folders options for Files, an indent toggle for trees, and folders that aggregate the stats of everything inside them.
- **Group with intent:** Group presets with a dedicated submenu, custom groups from the selection, and headers that open on first sight while bubbling counts like folders.

[Full changelog](../CHANGELOG.md#130-beta6---2026-09-14)

<a id="v1-3-0-beta-5"></a>

## 1.3.0-beta.5 — Grouped explorers and safer movement

<!-- reviewed: true -->

Vaultman 1.3.0-beta.5 makes large explorer workflows easier to read and safer to act on, from grouped rows to clearer movement controls.

- **See structure at a glance:** Grouped explorer headers project counts and expandable group members across Files, Properties, Tags, Snippets, and Plugins.
- **Move with the right scope:** Move-to-prop and node movement expose their state through the existing toolbar and transaction controls, with node/group choices and explicit proceed/cancel actions.
- **Rows explain themselves:** Elements, icons, timestamps, reveal controls, and hover actions stay in sync with each view and its filters.
- **Keep your place:** Sticky headers, active-file reveal, search results, and saved layouts preserve context through navigation and reloads.
- **Better mobile feedback:** Hidden or out-of-list actions are visibly subdued instead of pretending they can act.

[Full changelog](../CHANGELOG.md#130-beta5---2026-09-10)

<a id="v1-3-0-beta-3"></a>

## 1.3.0-beta.3 — Settings that stick, and options that finally do something

<!-- reviewed: true -->

Vaultman 1.3.0-beta.3 is about trust: panels come back the way you left them, three
switches that looked on but did nothing now work, and the search fields behave.

- **Your panel remembers itself:** After a reload a panel returns with its own
  configuration instead of starting blank. Obsidian hands a panel its identity a moment
  after it opens, and Vaultman was not waiting for it, so every reload lost the settings
  and left another orphan behind.
- **Folders come along:** Selected folders now reach queued operations. Deleting a mixed
  selection queued only the files, three selected folders queued only the one you
  right-clicked, and moving a folder inline did nothing at all.
- **Switches that were lying:** The elements cell in the properties and tags scenes, the
  floating index option for fixed widgets, and a scene engine that quietly reverted to
  Table all behaved as if they were off. They are honest now.
- **Select a whole branch:** Long-press the checkbox of a parent node to select
  everything under it, and press again to clear it.
- **Nothing peeking through on mobile:** The band above the first pinned folder header
  is gone, so the rows scrolling underneath no longer show through it.
- **Search fields that behave:** In Text, the glyphs in the search and replace fields are
  part of the placeholder again — they give way to what you type and come back when you
  clear the field — and the clear button is visible once more. The toolbar's inline
  search field keeps its own size instead of being squashed out of shape.

[Full changelog](../CHANGELOG.md#130-beta3---2026-08-28)

<a id="v1-3-0-beta-2"></a>

## 1.3.0-beta.2 — Sticky navigation that stays out of your way

<!-- reviewed: true -->

Vaultman 1.3.0-beta.2 is a polish release for the pinned folder headers introduced in beta.1: they now hold still, hand over cleanly, and let you decide how much room they take.

- **Smooth scrolling again:** Pinned headers no longer stutter through long lists or stall when you jump straight to the end.
- **Nothing showing through:** The hairline between stacked headers is gone, and a folder no longer appears underneath its own pinned header.
- **Headers that hand over:** Deep levels stay put instead of vanishing behind the ones above, and each folder passes its place to the next one without a jump.
- **Your call on how much:** A new setting chooses how much of the tree the pinned headers may cover, from 20 to 60 percent, so tall panels can show more levels at once.

[Full changelog](../CHANGELOG.md#130-beta2---2026-08-19)

<a id="v1-3-0-beta-1"></a>
## 1.3.0-beta.1 — Property workflows, text search parity, and deeper navigation
<!-- reviewed: true -->

Vaultman 1.3.0-beta.1 introduces Move-to-prop mode, Obsidian Core text search parity, sticky parent navigation, and refined mobile ergonomics.

- **Move-to-prop mode:** Transform and coerce properties across notes with configurable conflict handling.
- **Text search parity:** Enjoy single-line match rows, bookmarks, and lazy snippets with Core-level responsiveness.
- **Sticky parent rows:** Keep folder context floating into view during deep hierarchical scrolling.
- **Live relative times & glyphs:** Instant relative timestamps and live palette projection across geometry views.

[Full changelog](../CHANGELOG.md#130-beta1---2026-08-18)

<a id="v1-2-0"></a>
## 1.2.0 | More to configure, more to try, better to use
<!-- reviewed: true -->

![different-vm-instances](<Captura de pantalla 2026-07-23 212205.png>)

**VM-1.2 has been published!** Vaultman now expands your workflow options, https://community.obsidian.md/plugins/vaultman.

Thanks to everyone that trusted in this project. Following the ideas from the previous versions, I've been hardening the foundations of an *universal/generic explorer* panel and adding new functionality.

The [v1.2.0] update (*besides solving bugs, enhancing the UI/UX and increasing performance*) tries to abstract the different tabs and menus from Obsidian into mere providers that fill explorers with their own data, metadata and rules.

>As a consequence, you are now able to quickly explore and interact with the **new Snippets and Plugins tabs right from your sidebar!**

In addition to this symbiotic flexibility, I'll start implementing runtime integrations and compatibility with other already well-established plugins (_maybe a provider API_). This way, you can add more value into your workflow without duplicating systems.

>My first approach is an adapter that bridges **custom icons** data from the [Iconic](https://github.com/gfxholo/iconic) plugin "data.json".

I made changes to the experience without losing modularity and granular configuration as a pillar, which required a lot of testing from the great number of possible combinations that are now available in this plugin.

Share your opinions and issues. More updates are coming (_some might arrive next week_). **Stay tuned!**

[Full changelog](../CHANGELOG.md#120---2026-07-24)
