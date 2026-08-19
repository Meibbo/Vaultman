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
