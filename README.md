# <a href="https://community.obsidian.md/plugins/vaultman"><img src="./img/vaultman_icon.png" width="64" alt="vaultman"></a> VaultMan

![GitHub manifest version](https://img.shields.io/github/manifest-json/v/meibbo/vaultman?color=white&label=version&logo=github&logoColor=white&style=for-the-badge)![License](https://img.shields.io/github/license/Meibbo/vaultman?color=white&label=license&style=for-the-badge)[![GitHub stars](https://img.shields.io/github/stars/Meibbo/vaultman?style=for-the-badge&color=white)](https://github.com/Meibbo/vaultman/stargazers)[![GitHub open issues](https://img.shields.io/github/issues/Meibbo/vaultman?style=for-the-badge&color=white&logo=git&logoColor=white)](https://github.com/Meibbo/vaultman/issues)![Obsidian](https://img.shields.io/badge/required-%E2%89%A51.12.0-white?style=for-the-badge&logo=obsidian)

> The Symbiont Manager, morphs and adapts to your needs. 

This plugin aims to expand your Obsidian Core plugins, adding functionality and flexibility to the data and metadata explorers you already know.

Each explorer shows its data in a node/cells based structure. Where you can choose different layouts, show/hide details or sort and group data to visualize the same information from different dperspectives.

You can navigate, apply filters to your files, tags, properties or content and select what you want to change, queue batch operations and then apply everything at once.

# Table of Contents

- [1. Installation](#obsidian-community-plugins)
  - [1.1 Testing](#via-brat)
  - [1.2 Statistics](#statistics)
- [2. Features](#features)
  - [2.1 Providers](#providers)
  - [2.2 Explorers](#explorer-panels)
  - [2.3 Widgets](#widget-panels)
  - [2.4 Configuration](#configuration)
- [3. Project](#project)
  - [3.1 Resume](#resume)
  - [3.2 Roadmap](#roadmap)
  - [3.3 Known Issues](#known-issues)
  - [3.4 Development](#development)
- [4. Contributions](#contribution)
- [5. License](#license)

## Installation

There are 3 different version streams to select from (_stable, beta and alpha_). Which you can install following these instructions:

### Obsidian Community Plugins

Search: "**Vaultman**" in Community Plugins, press `Install` and `Enable` to start using it!

Or you can go and take a look into the community webpage _to see its overall score_ and stats at the [Obsidian Community Page](https://community.obsidian.md/plugins/vaultman).

### Via BRAT

I'm also releasing experimental versions for those who want to check the project progress and for PC/Mobile testing.

1. Install [BRAT](https://github.com/TfTHacker/obsidian42-brat) from the community plugins store
2. In BRAT settings → **Add Beta Plugin**
3. Enter `meibbo/vaultman`
4. Select an specific version (_recommended_)
5. Enable **Vaultman** in Settings → Community Plugins.

> Beta versions are more prone to bugs and performance issues, and can break your vault. Use them at your own risk, and always make backups before updating or using them.

### Statistics

[Watch more detailed plugin info](https://www.moritzjung.dev/obsidian-stats/plugins/vaultman) || [Search for similar plugins](https://plugins.semiautonomous.org/plugin/vaultman)

![Obsidian Downloads](https://img.shields.io/badge/dynamic/json?logo=obsidian&color=%23ffffff&label=downloads&query=%24%5B%22vaultman%22%5D.downloads&url=https%3A%2F%2Fraw.githubusercontent.com%2Fobsidianmd%2Fobsidian-releases%2Fmaster%2Fcommunity-plugin-stats.json&style=for-the-badge)![Total Downloads](https://img.shields.io/github/downloads/Meibbo/vaultman/total?color=white&label=Total%20Downloads&style=for-the-badge)![Stable version](https://img.shields.io/github/v/release/meibbo/vaultman?color=white&label=latest%20stable&logo=github&logoColor=white&style=for-the-badge)[![Stable downloads](https://img.shields.io/github/downloads/meibbo/vaultman/latest/main.js?color=white&label=downloads&style=for-the-badge)](https://github.com/meibbo/vaultman/releases)![Pre-release version](https://img.shields.io/github/v/release/meibbo/vaultman?include_prereleases&sort=semver&color=white&label=latest%20pre-release&style=for-the-badge&logo=github&logoColor=white)[![Pre-release downloads](https://img.shields.io/github/downloads-pre/meibbo/vaultman/latest/main.js?color=white&label=downloads&style=for-the-badge)](https://github.com/meibbo/vaultman/releases)

## Features

The main interface lives in the sidebar, with a toolbar that lets you choose its content depending of what you want to edit or visualize.

You can make granular configurations to your experience from the extense number of options available on the plugin settings panel.

Compatibility and adapters with other plugins are being added to help you decide which functionality would you want to be expanded and which doesn't need to be duplicated on your workflow.

### Providers

- **Properties**: Every property and value in your vault, built from the Obsidian frontmatter index to manage your notes metadata.

- **Files**: Files and folders of your vault, affecting the amount of elements showed based on your active filters.

- **Tags**: Gives you power to arrange your tags and set them in the frontmatter of your notes.

- **Content**: (WIP) Provides functionality to scope by content of your notes. 
- **Snippets**: Quickly activate/deactivate snippets from your vault.  
- **Plugins**: Quickly activate/deactivate or config your installed plugins.

### Explorer panels

They are generic hierarchies that adapts to any data provider configured to show fetched data from different sources within Obsidian and converts them into **node** elements with **cells** that contains more details.

> Such as icons, labels, content (WIP), operation badges, highlights, counters, etc.

<table>
  <tr>
    <td>
      <img src="./img/vm_sidebar.png" width="400" />
    </td>
    <td>
      <h1>Sidebar Leaf</h1>
      <p>This is the surface where the explorers live, from here you can scope the exact nodes you wanted to select for different kinds of operations.

> Every explorer has a toolbar with a search box, sorts and different views to facilitate your navigation and only will affect each tab individually

  </tr>
  <tr>
    <td>
      <img src="./img/vm_queue.png" width="400" />
    </td>
    <td>
      <h1>Queue list</h1>
      <p>
        Every operation of file edition for any group of nodes will be stored by default on the queued changes list. It helps to preview exactly what every action will change and apply everything at once.

> There is a warning system for incompatible operations and a configurable threshold for excessive affected files.

  </tr>
  <tr>
    <td>
      <img src="./img/vm_filters.png" width="400" />
    </td>
    <td>
      <h1>Filters list</h1>
      <p>A node will be any of the options that are listed from the provider data of the selected tab (even snippets, plugins and layouts will have their own tabs!)

Every selected node will apear in the **Active filters island**, where you can strategically add logical groups _and/or/none_ (WIP), supress filters, clear all, or even select templates of filters to scope down the exact nodes you wanted to edit.
![]()

> This versions only scopes the files tab from selected properties, tags or content.

  </tr>
</table>

### Widget panels

Modular panels designed to assist first hand your explorers navigation, order, layout and quick actions.

- **Toolbar**: Per-tab header, configurable actions and menus.
  - **Tabs menu**: Change the explorer data provider: _Files, Properties, Tags, Content, Snippets or Plugins_. Or open
  - **View menu**: how the nodes are arranged in the explorer.
  - **Sort menu**: Order, groups and type filters.
  - **Searchbox**: Quickly type a "match text" filter, change the kind of search to file/folder and create a new note or folder with that name.
  - **More tools**: Scroll to current editor note, Expand-Collapse all nodes.
- **Action Dock**:
- **Control Islands**: Shows your explorer active filters and queued file operations.
- **Floating Index**: First-letter rail on explorer edge. Scrub fast through long lists.

### Configuration

#### Style presets

- Minimal
- Experimental

#### Explorer layouts

##### Engines

- tree
- table
- grid

##### Cells

etc.

> (_this section is under maintenance_)

---

## Project

### Resume

This plugin has adapters for the following plugins:

- Bases
- [Iconic](https://github.com/gfxholo/iconic)

This project has the following workflow:

- Developed since March 2026.
- Manual system architecture, docs and QA.
- Assisted codign with AI agentic harness.

The following open-source tools were used:

- TypeScript, Svelte 5, ESBuild, ESLint, Stylelint, Prettier, Vite, Vitest.
- All third-party software retain their respective licenses.

### Roadmap

- [x] Increase explorers performances using memory snapshots and/or indexing
- [x] Save configs & templates for automation and quick navigation
- [ ] Refactor codebase for more granularity settings
- [ ] Drag & Drop operations
- [ ] Add logic groups for filters for better scoping
- [ ] Sticky rows for tree views
- [ ] Keyboard and enhanced mouse/touch navigation support
- [ ] Add groups and manual sorting for all explorers
- [ ] Release official Node-Notes feature (_every concept deserves its note_)

### Known Issues

It is available for public scrutine the current status and backlogs to already acknowledged bugs, issues and development direction.

For ideas and bug reports you can open issues until I find a better communication channel for feedback (like having a Discord thread in the Obsidian Members Group or anything else).
### Development

I'll be working on the branches: **Main**, **Dev** and **Sandbox** (my favourite), any issue/suggestion/pull request is welcome!

This project has at least 65% of coverage with unit tests (_still in sandbox branch_), CI/CD, GitHub Actions, CodeQL and smoke tests.

The file operations (and other internal functions) has been tested in a 10k notes vault without issues, but performance has work to be done.

```bash
git clone https://github.com/Meibbo/VaultMan
cd VaultMan
pnpm build:plugin
```

## Contribution

There's not still a well stablished contribution discipline for this repository. Please, for now, pull requests won't be reviewed nor accepted unless there's a previous communication.

## License

> [Apache V2](license) - [Meibbo](https://github.com/Meibbo): _Built for me, for you, and for better tools that lets us make more with less effort._
> _I'm committed to this project so expect more frequent updates and features coming your way!._