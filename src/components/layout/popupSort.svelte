<script lang="ts">
	import { translate } from "../../i18n/index";

	type FiltersTab = "props" | "files" | "tags";

	type SortOption = {
		id: string;
		iconName: string;
		labelKey: string;
	};

	const SORT_OPTIONS: Record<FiltersTab, SortOption[]> = {
		props: [
			{ id: "count", iconName: "lucide-hash", labelKey: "sort.by.count" },
			{
				id: "name",
				iconName: "lucide-a-large-small",
				labelKey: "sort.by.name",
			},
			{
				id: "date",
				iconName: "lucide-calendar",
				labelKey: "sort.by.date",
			},
			{ id: "sub", iconName: "lucide-indent", labelKey: "sort.by.sub" },
		],
		tags: [
			{ id: "count", iconName: "lucide-hash", labelKey: "sort.by.count" },
			{
				id: "name",
				iconName: "lucide-a-large-small",
				labelKey: "sort.by.name",
			},
			{
				id: "date",
				iconName: "lucide-calendar",
				labelKey: "sort.by.date",
			},
			{
				id: "sub",
				iconName: "lucide-indent",
				labelKey: "sort.by.subtags",
			},
		],
		files: [
			{
				id: "name",
				iconName: "lucide-a-large-small",
				labelKey: "sort.by.name",
			},
			{ id: "count", iconName: "lucide-hash", labelKey: "sort.by.count" },
			{
				id: "date",
				iconName: "lucide-calendar",
				labelKey: "sort.by.date",
			},
			{
				id: "columns",
				iconName: "lucide-columns-2",
				labelKey: "sort.by.columns",
			},
		],
	};

	const DRAWER_OPTIONS: Record<"props" | "tags", string[]> = {
		props: ["Text", "Number", "Date", "Toggle", "List"],
		tags: ["All", "Nested", "Simple"],
	};

	let {
		activeTab,
		onClose,
		onSortChange,
		icon,
	}: {
		activeTab: FiltersTab;
		onClose: () => void;
		onSortChange?: (sortBy: string, direction: "asc" | "desc") => void;
		icon: (node: HTMLElement, name: string) => { update(n: string): void };
	} = $props();

	let sortBy = $state("name");
	let sortDir = $state<"asc" | "desc">("asc");
	let drawerOpen = $state(false);
	let vertTopActive = $state(false);
	let activeScope = $state("all");

	const DEFAULT_DIR: Record<string, "asc" | "desc"> = {
		name: "asc",
		count: "desc",
		date: "desc",
		sub: "desc",
		columns: "asc",
	};

	// Reset per-tab state when the active tab changes.
	$effect(() => {
		void activeTab;
		sortBy = "name";
		sortDir = DEFAULT_DIR["name"];
		drawerOpen = false;
		vertTopActive = false;
	});

	function selectSort(id: string) {
		if (sortBy === id) {
			sortDir = sortDir === "asc" ? "desc" : "asc";
		} else {
			sortBy = id;
			sortDir = DEFAULT_DIR[id] ?? "asc";
		}
		onSortChange?.(sortBy, sortDir);
	}

	const vertTopIcon = $derived(
		activeTab === "props"
			? "lucide-list-tree"
			: activeTab === "tags"
				? "lucide-network"
				: "lucide-circle",
	);

	const vertBotIcon = $derived(
		activeTab === "files" ? "lucide-circle-dot" : "lucide-chevrons-down",
	);
</script>

<div class="vaultman-sort-popup">
	<!-- Vert-col: absolute, floats left over tab content -->
	<div class="vaultman-sort-vertcol">
		{#if activeTab !== "files"}
			<div
				class="vaultman-sort-vertcol-btn"
				class:is-active={vertTopActive}
				aria-label={activeTab === "props"
					? translate("sort.vertcol.props_values")
					: translate("sort.vertcol.node_level")}
				onclick={() => {
					vertTopActive = !vertTopActive;
				}}
				onkeydown={(e: KeyboardEvent) => {
					if (e.key === "Enter" || e.key === " ")
						vertTopActive = !vertTopActive;
				}}
				role="button"
				tabindex="0"
				use:icon={vertTopIcon}
			></div>
		{/if}
		<div
			class="vaultman-sort-vertcol-btn"
			class:is-active={drawerOpen}
			aria-label={activeTab === "files"
				? translate("sort.vertcol.direct_toggle")
				: translate("sort.vertcol.scope_drawer")}
			onclick={() => {
				drawerOpen = !drawerOpen;
			}}
			onkeydown={(e: KeyboardEvent) => {
				if (e.key === "Enter" || e.key === " ")
					drawerOpen = !drawerOpen;
			}}
			role="button"
			tabindex="0"
			use:icon={vertBotIcon}
		></div>
		{#if drawerOpen && activeTab !== "files"}
			<div class="vaultman-sort-vertcol-drawer">
				{#each DRAWER_OPTIONS[activeTab] as opt}
					<div class="vaultman-sort-drawer-item">{opt}</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Main content panel: row 1 + row 2 -->
	<div class="vaultman-sort-main">
		<!-- Row 1: Scope dropdown · Template btn · Close btn -->
		<div class="vaultman-sort-row vaultman-sort-row-controls">
			<select
				class="vaultman-sort-scope-select"
				bind:value={activeScope}
				aria-label={translate("sort.scope.label")}
			>
				<option value="all">{translate("sort.scope.all")}</option>
				<option value="filtered"
					>{translate("sort.scope.filtered")}</option
				>
				<option value="selected"
					>{translate("sort.scope.selected")}</option
				>
			</select>
			<div
				class="vaultman-sort-circle-btn"
				aria-label={translate("sort.template")}
				onclick={() => {
					/* no-op: Iter 17 */
				}}
				onkeydown={(e: KeyboardEvent) => {
					if (e.key === "Enter" || e.key === " ") {
						/* no-op: Iter 17 */
					}
				}}
				role="button"
				tabindex="0"
				use:icon={"lucide-bookmark"}
			></div>
			<div
				class="vaultman-sort-close-btn clickable-icon"
				aria-label={translate("sort.close")}
				onclick={onClose}
				onkeydown={(e: KeyboardEvent) => {
					if (e.key === "Enter" || e.key === " ") onClose();
				}}
				role="button"
				tabindex="0"
				use:icon={"lucide-chevron-right"}
			></div>
		</div>

		<!-- Row 2: 4 squircles -->
		<div class="vaultman-sort-row vaultman-squircle-row">
			{#each SORT_OPTIONS[activeTab] as opt (opt.id)}
				<div
					class="vaultman-squircle"
					class:is-accent={sortBy === opt.id}
					aria-label={translate(opt.labelKey) +
						(sortBy === opt.id
							? sortDir === "asc"
								? " ↑"
								: " ↓"
							: "")}
					onclick={() => selectSort(opt.id)}
					onkeydown={(e: KeyboardEvent) => {
						if (e.key === "Enter" || e.key === " ")
							selectSort(opt.id);
					}}
					role="button"
					tabindex="0"
				>
					<span class="vaultman-squircle-icon" use:icon={opt.iconName}
					></span>
					{#if sortBy === opt.id}
						<span
							class="vaultman-sort-dir"
							use:icon={sortDir === "asc"
								? "lucide-arrow-up"
								: "lucide-arrow-down"}
						></span>
					{/if}
				</div>
			{/each}
		</div>
	</div>
</div>
