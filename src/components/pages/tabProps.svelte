<script lang="ts">
  import { PropsExplorerPanel } from "../containers/explorerProps";
  import type { VaultmanPlugin } from "../../main";

  let {
    plugin,
    searchTerm = "",
    searchMode = 0,
    propExplorer = $bindable<PropsExplorerPanel | undefined>(undefined),
  }: {
    plugin: VaultmanPlugin;
    searchTerm?: string;
    searchMode?: number;
    propExplorer?: PropsExplorerPanel | undefined;
  } = $props();

  $effect(() => {
    if (propExplorer) {
      propExplorer.setSearchTerm(searchTerm, searchMode);
    }
  });

  function initPropsPanel(node: HTMLElement) {
    propExplorer = new PropsExplorerPanel(node, plugin);
    propExplorer.load();
    return {
      destroy() {
        propExplorer?.unload();
        propExplorer = undefined;
      },
    };
  }
</script>

<div class="vaultman-props-tab-content" use:initPropsPanel></div>

<style>
  .vaultman-props-tab-content {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
  }
</style>
