<script lang="ts">
  import { FilesExplorerPanel } from "../containers/explorerFiles";
  import type { VaultmanPlugin } from "../../main";

  let {
    plugin,
    fileList = $bindable<FilesExplorerPanel | undefined>(undefined),
    onSelectionChange,
  }: {
    plugin: VaultmanPlugin;
    fileList?: FilesExplorerPanel | undefined;
    onSelectionChange?: (count: number) => void;
  } = $props();

  function initFilesPanel(el: HTMLElement) {
    fileList = new FilesExplorerPanel(el, plugin, onSelectionChange);
    fileList.load();
    fileList.render(
      plugin.filterService.filteredFiles,
      plugin.propertyIndex.fileCount,
    );
    return {
      destroy() {
        fileList?.unload();
        fileList = undefined;
      },
    };
  }
</script>

<div class="vaultman-files-tab-content" use:initFilesPanel></div>

<style>
  .vaultman-files-tab-content {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
  }
</style>
