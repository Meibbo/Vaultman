<script lang="ts">
	import { translate } from "../../i18n/index";
	import { untrack } from 'svelte';

	type FiltersTab = "props" | "files" | "tags";
	type ViewMode   = "tree" | "dnd" | "grid" | "cards";

	type PillDef = {
		id:      string;
		labelKey: string;
		defaultOn: boolean;
	};

	const VIEW_MODES: { id: ViewMode; iconName: string; labelKey: string }[] = [
		{ id: "tree",  iconName: "lucide-list-tree",    labelKey: "viewmode.mode.tree"  },
		{ id: "dnd",   iconName: "lucide-grip-vertical", labelKey: "viewmode.mode.dnd"   },
		{ id: "grid",  iconName: "lucide-layout-grid",   labelKey: "viewmode.mode.grid"  },
		{ id: "cards", iconName: "lucide-layout-panel-top", labelKey: "viewmode.mode.cards" },
	];

	// Pills for each combination of tab × view (files splits by view mode).
	const PILLS: Record<string, PillDef[]> = {
		tags: [
			{ id: "icon",   labelKey: "viewmode.pill.icon",   defaultOn: true  },
			{ id: "text",   labelKey: "viewmode.pill.text",   defaultOn: true  },
			{ id: "count",  labelKey: "viewmode.pill.count",  defaultOn: true  },
			{ id: "files",  labelKey: "viewmode.pill.files",  defaultOn: false },
			{ id: "nested", labelKey: "viewmode.pill.nested", defaultOn: false },
			{ id: "date",   labelKey: "viewmode.pill.date",   defaultOn: false },
		],
		props: [
			{ id: "icon",   labelKey: "viewmode.pill.icon",   defaultOn: true  },
			{ id: "text",   labelKey: "viewmode.pill.text",   defaultOn: true  },
			{ id: "count",  labelKey: "viewmode.pill.count",  defaultOn: true  },
			{ id: "type",   labelKey: "viewmode.pill.type",   defaultOn: false },
			{ id: "values", labelKey: "viewmode.pill.values", defaultOn: false },
			{ id: "date",   labelKey: "viewmode.pill.date",   defaultOn: false },
		],
		"files-grid": [
			{ id: "name",  labelKey: "viewmode.pill.name",  defaultOn: true  },
			{ id: "date",  labelKey: "viewmode.pill.date",  defaultOn: true  },
			{ id: "tags",  labelKey: "viewmode.pill.tags",  defaultOn: false },
			{ id: "path",  labelKey: "viewmode.pill.path",  defaultOn: false },
			{ id: "size",  labelKey: "viewmode.pill.size",  defaultOn: false },
		],
		"files-tree": [
			{ id: "name", labelKey: "viewmode.pill.name", defaultOn: true  },
			{ id: "ext",  labelKey: "viewmode.pill.ext",  defaultOn: true  },
			{ id: "date", labelKey: "viewmode.pill.date", defaultOn: false },
			{ id: "tags", labelKey: "viewmode.pill.tags", defaultOn: false },
			{ id: "path", labelKey: "viewmode.pill.path", defaultOn: false },
		],
	};

	function defaultPills(key: string): Set<string> {
		const defs = PILLS[key] ?? [];
		return new Set(defs.filter((p) => p.defaultOn).map((p) => p.id));
	}

	function pillsKey(tab: FiltersTab, view: ViewMode): string {
		if (tab === "files") return view === "grid" ? "files-grid" : "files-tree";
		return tab;
	}

	let {
		activeTab,
		onClose,
		onViewModeChange,
		onAddModeChange,
		icon,
		initialViewMode = "tree" as ViewMode,
		addOpCount = 0,
	}: {
		activeTab: FiltersTab;
		onClose: () => void;
		onViewModeChange?: (mode: "tree" | "dnd" | "grid" | "cards") => void;
		onAddModeChange?: (active: boolean) => void;
		icon: (node: HTMLElement, name: string) => { update(n: string): void };
		initialViewMode?: ViewMode;
		addOpCount?: number;
	} = $props();

	let activeView  = $state<ViewMode>(untrack(() => initialViewMode));
	let activePills = $state<Set<string>>(untrack(() => defaultPills(pillsKey(activeTab, initialViewMode))));

	// Reset when activeTab changes (not on first render — initialViewMode handled above)
	let _prevTab = $state<FiltersTab>(untrack(() => activeTab));
	$effect(() => {
		if (activeTab !== _prevTab) {
			_prevTab = activeTab;
			activeView  = "tree";
			activePills = defaultPills(pillsKey(activeTab, "tree"));
		}
	});

	const currentPillKey  = $derived(pillsKey(activeTab, activeView));
	const currentPillDefs = $derived(PILLS[currentPillKey] ?? []);
	const showSearch      = $derived(activeTab === "files" && activeView === "grid");

	function selectView(v: ViewMode) {
		if (activeView === v) return;
		activeView  = v;
		activePills = defaultPills(pillsKey(activeTab, v));
		onViewModeChange?.(v);
	}

	function togglePill(id: string) {
		const next = new Set(activePills);
		if (next.has(id)) {
			next.delete(id);
		} else {
			next.add(id);
		}
		activePills = next;
	}

	let addMode = $state(false);

	function toggleAddMode() {
		addMode = !addMode;
		onAddModeChange?.(addMode);
	}
</script>

<div class="vaultman-viewmode-popup">
	<!-- Row 1: close · template · search* · pills (scroll) -->
	<div class="vaultman-viewmode-row vaultman-viewmode-row-controls">
		<div
			class="vaultman-viewmode-close-btn clickable-icon"
			aria-label={translate("viewmode.close")}
			onclick={onClose}
			onkeydown={(e: KeyboardEvent) => {
				if (e.key === "Enter" || e.key === " ") onClose();
			}}
			role="button"
			tabindex="0"
			use:icon={"lucide-chevron-left"}
		></div>
		<div
			class="vaultman-viewmode-circle-btn"
			aria-label={translate("viewmode.template")}
			onclick={() => { /* no-op: Iter 17 */ }}
			onkeydown={(e: KeyboardEvent) => {
				if (e.key === "Enter" || e.key === " ") { /* no-op: Iter 17 */ }
			}}
			role="button"
			tabindex="0"
			use:icon={"lucide-bookmark"}
		></div>
		{#if showSearch}
			<div
				class="vaultman-viewmode-circle-btn"
				aria-label={translate("viewmode.search_cols")}
				onclick={() => { /* no-op: Iter 17 */ }}
				onkeydown={(e: KeyboardEvent) => {
					if (e.key === "Enter" || e.key === " ") { /* no-op: Iter 17 */ }
				}}
				role="button"
				tabindex="0"
				use:icon={"lucide-search"}
			></div>
		{/if}
		<!-- ADD mode FAB -->
		<div
			class="vaultman-nav-fab"
			class:is-add-active={addMode}
			role="button"
			tabindex="0"
			aria-label={translate("viewmode.add_mode")}
			onclick={toggleAddMode}
			onkeydown={(e: KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") toggleAddMode(); }}
			use:icon={"lucide-plus"}
		>
			{#if addOpCount && addOpCount > 0}
				<span class="vaultman-fab-badge">{addOpCount}</span>
			{/if}
		</div>
		<!-- Pills (horizontal scroll, no scrollbar) -->
		<div class="vaultman-viewmode-pills">
			{#each currentPillDefs as pill (pill.id)}
				<button
					class="vaultman-viewmode-pill"
					class:is-active={activePills.has(pill.id)}
					onclick={() => togglePill(pill.id)}
				>
					{translate(pill.labelKey)}
				</button>
			{/each}
		</div>
	</div>

	<!-- Row 2: view-mode squircles -->
	<div class="vaultman-viewmode-row vaultman-squircle-row">
		{#each VIEW_MODES as vm (vm.id)}
			<div
				class="vaultman-squircle"
				class:is-accent={activeView === vm.id}
				aria-label={translate(vm.labelKey)}
				onclick={() => selectView(vm.id)}
				onkeydown={(e: KeyboardEvent) => {
					if (e.key === "Enter" || e.key === " ") selectView(vm.id);
				}}
				role="button"
				tabindex="0"
				use:icon={vm.iconName}
			></div>
		{/each}
	</div>
</div>
