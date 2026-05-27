<script lang="ts">
	import { Menu } from "obsidian";
	import { translate } from "../../i18n/index";
	import type { VaultmanPlugin } from "../../main";
	import { SaveTemplateModal } from "../../modals/modalSaveTemplate";

	let {
		plugin,
		activeFilterRules,
		refreshActiveFiltersPopup,
		updateStats,
		closePopup,
		toggleFilterRule,
		deleteFilterRule,
		icon,
	}: {
		plugin: VaultmanPlugin;
		activeFilterRules: any[];
		refreshActiveFiltersPopup: () => void;
		updateStats: () => void;
		closePopup: () => void;
		toggleFilterRule: (rule: any) => void;
		deleteFilterRule: (rule: any) => void;
		icon: (node: HTMLElement, name: string) => any;
	} = $props();
</script>

<div class="vaultman-active-filters-popup">
	<!-- Squircle action buttons row -->
	<div class="vaultman-squircle-row">
		<div
			class="vaultman-squircle"
			aria-label={translate("filters.popup.clear_all")}
			use:icon={"lucide-x"}
			onclick={() => {
				plugin.filterService.clearFilters();
				refreshActiveFiltersPopup();
				updateStats();
				closePopup();
			}}
			onkeydown={(e: KeyboardEvent) => {
				if (e.key === "Enter" || e.key === " ") {
					plugin.filterService.clearFilters();
					refreshActiveFiltersPopup();
					updateStats();
					closePopup();
				}
			}}
			role="button"
			tabindex="0"
		></div>
		<div
			class="vaultman-squircle vaultman-squircle-reserved"
			aria-label="Reserved"
			use:icon={"lucide-plus"}
			role="button"
			tabindex="0"
		></div>
		<div
			class="vaultman-squircle"
			aria-label={translate("filters.popup.templates")}
			use:icon={"lucide-bookmark"}
			onclick={(e: MouseEvent) => {
				const menu = new Menu();
				plugin.settings.filterTemplates.forEach((tpl) => {
					menu.addItem((item) =>
						item.setTitle(tpl.name).onClick(() => {
							plugin.filterService.loadTemplate(tpl);
							refreshActiveFiltersPopup();
							updateStats();
							closePopup();
						}),
					);
				});
				menu.addSeparator();
				menu.addItem((item) =>
					item
						.setTitle(translate("filter.template.save"))
						.onClick(() => {
							new SaveTemplateModal(
								plugin.app,
								plugin,
								plugin.filterService.activeFilter,
							).open();
							closePopup();
						}),
				);
				menu.showAtMouseEvent(e);
			}}
			onkeydown={(e: KeyboardEvent) => {
				if (e.key === "Enter" || e.key === " ") {
					// Menu needs a mouse event or position. For keyboard, we target the element bottom.
					const target = e.currentTarget as HTMLElement;
					const rect = target.getBoundingClientRect();
					const menu = new Menu();
					// ... same menu logic ...
					plugin.settings.filterTemplates.forEach((tpl) => {
						menu.addItem((item) =>
							item.setTitle(tpl.name).onClick(() => {
								plugin.filterService.loadTemplate(tpl);
								refreshActiveFiltersPopup();
								updateStats();
								closePopup();
							}),
						);
					});
					menu.addSeparator();
					menu.addItem((item) =>
						item
							.setTitle(translate("filter.template.save"))
							.onClick(() => {
								new SaveTemplateModal(
									plugin.app,
									plugin,
									plugin.filterService.activeFilter,
								).open();
								closePopup();
							}),
					);
					menu.showAtPosition({ x: rect.left, y: rect.bottom });
				}
			}}
			role="button"
			tabindex="0"
		></div>
		<div
			class="vaultman-squircle vaultman-squircle-reserved"
			aria-label="Reserved"
			use:icon={"lucide-check"}
			role="button"
			tabindex="0"
		></div>
	</div>

	<!-- Filter rules list -->
	<div class="vaultman-active-filters-list">
		{#if activeFilterRules.length === 0}
			<div class="vaultman-active-filters-empty">
				{translate("filters.popup.empty")}
			</div>
		{:else}
			{#each activeFilterRules as rule (rule.id)}
				<div
					class="vaultman-active-filter-rule"
					class:is-disabled={!rule.enabled}
				>
					<span class="vaultman-active-filter-rule-text"
						>{rule.description}</span
					>
					<div
						class="vaultman-active-filter-toggle clickable-icon"
						aria-label={rule.enabled
							? translate("filters.popup.rule.disable")
							: translate("filters.popup.rule.enable")}
						use:icon={rule.enabled
							? "lucide-eye"
							: "lucide-eye-off"}
						onclick={() => toggleFilterRule(rule)}
						onkeydown={(e: KeyboardEvent) => {
							if (e.key === "Enter" || e.key === " ")
								toggleFilterRule(rule);
						}}
						role="button"
						tabindex="0"
					></div>
					<div
						class="vaultman-active-filter-delete clickable-icon"
						aria-label={translate("filters.popup.rule.delete")}
						use:icon={"lucide-x"}
						onclick={() => deleteFilterRule(rule)}
						onkeydown={(e: KeyboardEvent) => {
							if (e.key === "Enter" || e.key === " ")
								deleteFilterRule(rule);
						}}
						role="button"
						tabindex="0"
					></div>
				</div>
			{/each}
		{/if}
	</div>
</div>
