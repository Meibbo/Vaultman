# What's new in Vaultman

A brief, benefit-focused look at each Vaultman release. New entries appear first; each
section links to the technical changelog for complete details.

<!--
Editorial template for the next release (remove this comment before publication):

<a id="vX-Y-Z-channel-N"></a>
## X.Y.Z-channel.N — A short benefit-led title
<!-- reviewed: true -- >

One inviting sentence that explains who benefits and why.

- **Benefit, not subsystem:** Explain the user-visible improvement in plain language.
- **Keep it selective:** Prefer three to five highlights; leave internals to CHANGELOG.
- **Images are optional:** Use alt text and repository-relative paths, for example
  `![Explorer preview](../img/explorer-preview.png)`.

[Full changelog](../CHANGELOG.md#exact-github-anchor-for-this-release)
-->

<a id="v1-2-0-beta-6"></a>
## 1.2.0-beta.6 — More to configure, fewer papercuts
<!-- reviewed: true -->

This beta puts more of the explorers under your control and clears out a batch of
small interaction bugs.

- **Configure every node menu:** Files, Properties, Tags, Content, Snippets and
  Plugins each have their own context menu you can reorder, hide, and group with
  dividers and submenus — and the Files menu can also list the items other plugins
  add.
- **Shape the toolbar:** Choose whether extra actions condense into a menu or stay
  on one horizontally scrollable line, move Create File/Folder onto the toolbar, and
  add your own Obsidian commands as toolbar buttons — Create File can even run a
  command you pick.
- **Know your files better:** A new Last opened time drives an optional cell and a
  "most recent first" sort, and Statistics gains Remaining tasks and Opened today
  cards. In the flat Files list, a Path cell shows the full path.
- **Color and compose:** One shared glyph-color palette (default, faint, accent,
  custom, rainbow) covers the Floating Index and the Explorer, and two ready-made
  View Compositions (Basic list and Preview) are there to start from or delete.
- **Fewer papercuts:** The first click on an inactive explorer works, tooltips show
  on the first hover, Files repaints the moment an icon changes, and a collapsed
  folder that hides an active filter shows a small dot instead of looking like a
  filter itself.

[Full changelog](../CHANGELOG.md#120-beta6---2026-07-21)

<a id="v1-2-0-beta-5"></a>
## 1.2.0-beta.5 — Calmer typing, tidier explorers
<!-- reviewed: true -->

This beta focuses on how the explorers feel while you work: less background noise
while you type, and clearer control over what each row shows.

- **Typing stays smooth:** Explorers that sit in a hidden tab no longer rebuild
  themselves while you write in a note; the work waits until you look at them again.
- **Rows show what you choose:** Cell options, hover details and their order now come
  from one place, so Files can add a Label line, reorder hover fields, and keep your
  choices when a layout is saved.
- **Your own icons for snippets and plugins:** Pick any icon for a snippet or a
  community plugin from a searchable list, and reset it whenever you like. This works
  with or without the Iconic plugin installed.
- **Cards, honestly named:** The card engine is now called Cards, and a card without
  extra fields shrinks to fit instead of leaving an empty gap.
- **See activity you can't see:** A collapsed folder shows a small colored dot when
  something inside it has a pending operation, and hides it again once you expand.

[Full changelog](../CHANGELOG.md#120-beta5---2026-07-20)

<a id="v1-2-0-beta-4"></a>
## 1.2.0-beta.4 — More capable explorers, less friction
<!-- reviewed: true -->

This beta makes Vaultman's explorer workspace quicker to navigate and more useful for
large, highly customized vaults.

- **Find your way faster:** The optional floating index now works across Files,
  Properties, and Tags, with scope controls and smoother navigation.
- **See the information you need:** Files can show words, characters, remaining tasks,
  timestamps, and selected hover details backed by a persistent local cache.
- **Manage more from one place:** Snippets and Plugins join the explorer family, while
  Iconic integration and richer file actions fit more naturally into Obsidian workflows.
- **Stay responsive:** Content search can pause and resume, and narrow layouts preserve
  their controls through responsive toolbar behavior.

[Full changelog](../CHANGELOG.md#120-beta4---2026-07-19)
