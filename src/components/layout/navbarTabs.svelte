<script lang="ts">
  import { translate } from "../../i18n/index";

  type FiltersTab = "props" | "files" | "tags";

  const TAB_ICONS: Record<FiltersTab, string> = {
    tags: "lucide-tag",
    props: "lucide-tag",
    files: "lucide-files",
  };

  let {
    activeTab,
    showLabels = false,
    onTabChange,
    icon,
  }: {
    activeTab: FiltersTab;
    showLabels?: boolean;
    onTabChange: (tab: FiltersTab) => void;
    icon: (node: HTMLElement, name: string) => { update(n: string): void };
  } = $props();
</script>

<div class="vaultman-tab-bar" class:has-labels={showLabels}>
  {#each (["props", "files", "tags"] as FiltersTab[]) as tab}
    <div
      class="vaultman-tab nav-action-button"
      class:is-active={activeTab === tab}
      onclick={() => onTabChange(tab)}
      onkeydown={(e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onTabChange(tab);
        }
      }}
      aria-label={translate("filter.tab." + tab)}
      role="tab"
      tabindex="0"
    >
      <span class="vaultman-tab-icon" use:icon={TAB_ICONS[tab]}></span>
      {#if showLabels}
        <span class="vaultman-tab-label">{translate("filter.tab." + tab)}</span>
      {/if}
    </div>
  {/each}
</div>
