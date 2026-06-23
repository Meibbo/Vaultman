# <a href="https://community.obsidian.md/plugins/vaultman"><img src="./img/vaultman_icon.png" width="64" alt="vaultman"></a> VaultMan
![](https://img.shields.io/github/license/Meibbo/vaultman?color=white&label=license&style=for-the-badge)
![GitHub manifest version](https://img.shields.io/github/manifest-json/v/meibbo/vaultman?color=white&label=version&style=for-the-badge)
![Obsidian](https://img.shields.io/badge/required-%E2%89%A51.12.0-white?style=for-the-badge&logo=obsidian
)
![Obsidian Downloads](https://img.shields.io/badge/dynamic/json?logo=obsidian&color=%23ffffff&label=downloads&query=%24%5B%22vaultman%22%5D.downloads&url=https%3A%2F%2Fraw.githubusercontent.com%2Fobsidianmd%2Fobsidian-releases%2Fmaster%2Fcommunity-plugin-stats.json&style=for-the-badge)
![](https://img.shields.io/github/downloads/Meibbo/vaultman/total?color=white&label=total-downloads&style=for-the-badge)

This plugin aims to expand your Obsidian Core plugins, adding functionality and flexibility to the data and metadata explorers you already know.

Each explorer shows its data in a node/cells based structure. Where you can choose different layouts, show/hide details or sort and group data to visualize the same information from another perspective.

You can navigate, apply filters to your files, tags, properties or content and select what you want to change, queue batch operations and then apply everything at once.
# Table of Contents
- [Installation](#obsidian-community-plugins)
- [Features](#explorers)
- [Development](#development)
- [License](#license)

## Installation

There are 3 different version streams to select from (_stable, beta and alpha_). Which you can install following these instructions:

### Obsidian Community Plugins
Search: "**Vaultman**" in Community Plugins, press `Install` and `Enable` to start using it! 

Or you can go and take a look into the community webpage *to see its overall score* and stats at the [Obsidian Community Page](https://community.obsidian.md/plugins/vaultman).

### Via BRAT
I'm also releasing experimental versions for those who want to check the project progress and for PC/Mobile testing.
1. Install [BRAT](https://github.com/TfTHacker/obsidian42-brat) from the community plugins store
2. In BRAT settings → **Add Beta Plugin**
3. Enter `meibbo/vaultman`
4. Enable **Vaultman** in Settings → Community Plugins.


> Beta versions are more prone to bugs and performance issues, and can break your vault. Use them at your own risk, and always make backups before updating or using them.

## Features

The main interface lives in the sidebar, with a toolbar that lets you choose its content depending of what you want to edit or visualize.

- **Tabs menu**: quickly change the explorer data provider: _Files, Properties, Tags or Content_. Or open 
- **View menu**: how the nodes are arranged in the explorer.
- **Sort menu**: how they are sorted and grouped.
- **Active filters**: which nodes rules over file display.
- **Queue list**: which actions over files are ready to be processed.
***

### Explorers
They are generic and adapts to any data provider configured to show fetched data from different sources within Obsidian and converts them into **node** elements with **cells** containing more details

> Such as icons, labels, content (WIP), operation badges, highlights, counters, etc.

(*currently only available tree, table and grid views.*)
<table>
  <tr>
    <td>
      <img src="./img/vm_sidebar.png" width="400" />
    </td>
    <td>
      <h1>Sidebar Panel</h1>
      <p>This is where the explorers live, from here you can scope the exact nodes you wanted to select for different kinds of operations.

- **Properties tab**: a live scrollable list of every property and value in your vault, built from the frontmatter index.

- **Files tab**: a list of the files and folders of your vault, affecting the amount of elements showed based on your active filters

- **Tags tab**: a tree list that gives you power to rearrenge your tags and set them in the frontmatter of your notes

> Every explorer has a toolbar with a search box, sorts and different views to facilitate your navigation and only will affect each tab individually
      </p>
    </td>
  </tr>
  <tr>
    <td>
      <img src="./img/vm_queue.png" width="400" />
    </td>
    <td>
      <h1>Queue list</h1>
      <p>
        Every action of edition of any node will be stored by default on the queue changes list, let's you preview exactly what they will change and apply everything at once.
        With a warning system for incompatible operations and excessive file scope.
      </p>
    </td>
  </tr>
  <tr>
    <td>
      <img src="./img/vm_filters.png" width="400" />
    </td>
    <td>
      <h1>Filters list</h1>
      <p>A node will be any of the options that are listed from the provider data of the selected tab (even snippets, plugins and layouts will have their own tabs!)

Every selected node will apear in the **Active filters island**, where you can strategically add logical groups (*and/or/none*), supress filters, clear all, or even select templates of filters(WIP) to scope down the exact nodes you wanted to edit.
![]()

> This versions only scopes the files tab from selected properties, tags or content. *Showing content or metadata from selected files will be added soon.*
      </p>
    </td>
  </tr>
  <tr>
    <td>
      <img src="./img/vm_sidebar.png" width="400" />
    </td>
    <td>
      <h1> Stats page</h1>
      <p>For now, is just a simple dashboard placeholder that will gradually become into widgets that fetch general vault statistics.

Also (in beta version), it has an option that let's you choose any file as your sidebar homepage (useful in mobile, because there's not an easy way YET to put notes or bases in your sidebars)

The tools page is currently mostly a stub with the Find and Replace (tabContent.svelte) and a mock menu curator panel (to sanitize your context menus when they reach absurd amounts of options). There will live tools that supercharge obsidian, like Linter (with scopes), Layouts, Snippets, Plugins, etc.
      </p>
    </td>
  </tr>
</table>

***
## Development

I'll be working on the branches: **Main**, **Dev** and **Sandbox** (my favourite), any issue/suggestion/pull request is welcome!

```bash
git clone https://github.com/Meibbo/VaultMan
cd VaultMan
```
This project has at least 65% of coverage with unit tests (*still in sandbox branch*), CI/CD, GitHub Actions, CodeQL and smoke tests.

The file operations (and other internal functions) has been tested in a 10k notes vault without issues, but performance has work to be done.

>*I'm committed to this project so expect more frequent updates and features coming your way!.*
***
### Roadmap

- [x] Increase explorers performances using memory snapshots and/or indexing
- [ ] Add logic groups for filters for better scoping
- [ ] Sticky rows for tree views
- [ ] Keyboard and enhanced mouse/touch navigation support
- [ ] Add groups and manual sorting for all explorers
- [ ] Release official Node-Notes feature (*every concept deserves its note*)
- [x] Marks and templates for automation and quick navigation
- [ ] Drag&Drop operations

### Built With

This project uses the following open-source technologies:

- TypeScript
- Svelte

All third-party libraries retain their respective licenses.

## License

[MIT](LICENSE) — [Meibbo](https://github.com/Meibbo). This product is published *as it is* without any explicit warranty due to its early development state.

> **Disclaimer**: *AI agentic tools were used in the making of this plugin, and was only published after being manually tested and debugged since March 2026*

*Built for me, for you, and for better tools that lets us make more with less effort.*