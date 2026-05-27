<script lang="ts">
	import { translate } from "../../i18n/index";
	import type { VaultmanPlugin } from "../../main";

	let {
		plugin,
		scopeOptions,
		setScope,
		closePopup,
		icon,
	}: {
		plugin: VaultmanPlugin;
		scopeOptions: any[];
		setScope: (val: string) => void;
		closePopup: () => void;
		icon: (node: HTMLElement, name: string) => any;
	} = $props();
</script>

<div>
	<div class="vaultman-popup-header">
		<span class="vaultman-popup-title">{translate("scope.title")}</span>
		<div
			class="clickable-icon"
			aria-label="Close"
			use:icon={"lucide-x"}
			onclick={closePopup}
			onkeydown={(e: KeyboardEvent) => {
				if (e.key === "Enter" || e.key === " ") closePopup();
			}}
			role="button"
			tabindex="0"
		></div>
	</div>
	<div class="vaultman-scope-list">
		{#each scopeOptions as opt}
			<div
				class="vaultman-scope-item"
				class:is-active={plugin.settings.explorerOperationScope ===
					opt.value}
				onclick={() => setScope(opt.value)}
				onkeydown={(e: KeyboardEvent) => {
					if (e.key === "Enter" || e.key === " ") setScope(opt.value);
				}}
				role="option"
				aria-selected={plugin.settings.explorerOperationScope ===
					opt.value}
				tabindex="0"
			>
				<div class="vaultman-scope-icon" use:icon={opt.icon}></div>
				<span>{opt.label}</span>
			</div>
		{/each}
	</div>
</div>
