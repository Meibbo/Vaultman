<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { TagsExplorerPanel } from "../containers/explorerTags";
  import type { VaultmanPlugin } from "../../main";

  let {
    plugin,
    searchTerm = "",
    searchMode = 0,
    tagsExplorer = $bindable<TagsExplorerPanel | null>(null),
  }: {
    plugin: VaultmanPlugin;
    searchTerm?: string;
    searchMode?: number;
    tagsExplorer?: TagsExplorerPanel | null;
  } = $props();

  $effect(() => {
    if (tagsExplorer) {
      tagsExplorer.setSearchTerm(searchTerm, searchMode === 1 ? "leaf" : "all");
    }
  });

  let containerEl: HTMLElement;

  onMount(() => {
    tagsExplorer = new TagsExplorerPanel(containerEl, plugin);
    plugin.addChild(tagsExplorer);
  });

  onDestroy(() => {
    if (tagsExplorer) {
      plugin.removeChild(tagsExplorer);
      tagsExplorer = null;
    }
  });
</script>

<div class="vaultman-tags-tab-content" bind:this={containerEl}></div>

<style>
  .vaultman-tags-tab-content {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
  }
</style>
