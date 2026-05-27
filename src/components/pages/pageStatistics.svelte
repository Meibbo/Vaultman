<script lang="ts">
  import { setIcon } from "obsidian";
  import { translate } from "../../i18n/index";

  let { plugin }: { plugin: VaultmanPlugin } = $props();

  type Scope = "vault" | "filtered" | "selected";
  let scope = $state<Scope>("vault");

  let metaStats = $state({ links: 0, words: 0, loading: false });

  $effect(() => {
    const files =
      scope === "vault"
        ? plugin.app.vault.getMarkdownFiles()
        : scope === "filtered"
          ? plugin.filterService.filteredFiles
          : plugin.filterService.selectedFiles;

    // Reset and show loading if needed
    metaStats.loading = true;
    let totalLinks = 0;
    let totalWords = 0;

    // Use a small timeout to avoid blocking the main thread immediately if there are many files
    const compute = async () => {
      for (const file of files) {
        const cache = plugin.app.metadataCache.getFileCache(file);
        totalLinks +=
          (cache?.links?.length ?? 0) + (cache?.embeds?.length ?? 0);
        // Word count is heavy, so we limit it to filtered/selected for now
        if (files.length < 5000) {
          // Approximate word count from cache if available or just skip for now
          // plugin.app.metadataCache doesn't have word count, would need vault.read
        }
      }
      metaStats.links = totalLinks;
      metaStats.words = 0; // Word count requires reading content, deferred for efficiency
      metaStats.loading = false;
    };
    void compute();
  });

  let counts = $derived.by(() => ({
    folders: plugin.app.vault.getAllFolders(true).length,
    files:
      scope === "vault"
        ? plugin.app.vault.getMarkdownFiles().length
        : scope === "filtered"
          ? plugin.filterService.filteredFiles.length
          : plugin.filterService.selectedFiles.length,
    props: plugin.propertyIndex.index.size,
    values: [...plugin.propertyIndex.index.values()].reduce(
      (n, s) => n + s.size,
      0,
    ),
    tags: Object.keys(
      (
        plugin.app.metadataCache as unknown as {
          getTags(): Record<string, number>;
        }
      ).getTags() ?? {},
    ).length,
  }));

  const statCards = $derived([
    {
      label: translate("stats.folders"),
      icon: "lucide-folder",
      value: counts.folders,
      color: "var(--color-blue)",
    },
    {
      label: translate("stats.files"),
      icon: "lucide-file-text",
      value: counts.files,
      color: "var(--color-green)",
    },
    {
      label: translate("stats.props"),
      icon: "lucide-tag",
      value: counts.props,
      color: "var(--color-orange)",
    },
    {
      label: translate("stats.values"),
      icon: "lucide-list",
      value: counts.values,
      color: "var(--color-purple)",
    },
    {
      label: translate("stats.tags"),
      icon: "lucide-hash",
      value: counts.tags,
      color: "var(--color-red)",
    },
  ]);

  const scopeOptions: { id: Scope; label: string; icon: string }[] = [
    { id: "vault", label: translate("scope.all"), icon: "lucide-database" },
    {
      id: "filtered",
      label: translate("scope.filtered"),
      icon: "lucide-filter",
    },
    {
      id: "selected",
      label: translate("scope.selected"),
      icon: "lucide-check-square",
    },
  ];

  function iconAction(el: HTMLElement, name: string) {
    setIcon(el, name);
    return {
      update(newName: string) {
        setIcon(el, newName);
      },
    };
  }
</script>

<div class="vaultman-statistics-page">
  <div class="vaultman-stat-header">
    <div class="vaultman-stat-scope-pills">
      {#each scopeOptions as opt}
        <button
          class="vaultman-stat-scope-pill"
          class:is-active={scope === opt.id}
          onclick={() => (scope = opt.id)}
          aria-label={opt.label}
        >
          <span class="vaultman-pill-icon" use:iconAction={opt.icon}></span>
          <span class="vaultman-pill-label">{opt.label}</span>
        </button>
      {/each}
    </div>
  </div>

  <div class="vaultman-stat-cards-grid">
    {#each statCards as card}
      <div class="vaultman-stat-card" style="--card-color: {card.color}">
        <div class="vaultman-stat-card-icon" use:iconAction={card.icon}></div>
        <div class="vaultman-stat-card-info">
          <span class="vaultman-stat-card-value"
            >{card.value.toLocaleString()}</span
          >
          <span class="vaultman-stat-card-label">{card.label}</span>
        </div>
      </div>
    {/each}
  </div>

  <div class="vaultman-stat-meta-island">
    <div class="vaultman-stat-meta-item">
      <span class="vaultman-meta-icon" use:iconAction={"lucide-link"}></span>
      <span class="vaultman-meta-label">{translate("stats.total_links")}</span>
      <span class="vaultman-meta-value">{metaStats.links.toLocaleString()}</span
      >
    </div>
    <div class="vaultman-stat-meta-item">
      <span class="vaultman-meta-icon" use:iconAction={"lucide-type"}></span>
      <span class="vaultman-meta-label">{translate("stats.word_count")}</span>
      <span class="vaultman-meta-value"
        >{metaStats.words > 0 ? metaStats.words.toLocaleString() : "—"}</span
      >
    </div>
  </div>
</div>
