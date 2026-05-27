<script lang="ts">
	import { translate } from "../../i18n/index";

	let {
		openFileRename,
		openPropertyManager,
		openMovePopup,
		icon,
	}: {
		openFileRename: () => void;
		openPropertyManager: () => void;
		openMovePopup: () => void;
		icon: (node: HTMLElement, name: string) => any;
	} = $props();
</script>

<div class="vaultman-ops-section">
	<div class="vaultman-ops-buttons">
		<button class="vaultman-btn" onclick={openFileRename}>
			<span class="vaultman-btn-icon" use:icon={"lucide-pencil"}></span>
			{translate("ops.rename")}
		</button>
		<button class="vaultman-btn" onclick={openPropertyManager}>
			<span class="vaultman-btn-icon" use:icon={"lucide-plus"}></span>
			{translate("ops.add_property")}
		</button>
		<button class="vaultman-btn" onclick={openMovePopup}>
			<span class="vaultman-btn-icon" use:icon={"lucide-folder-input"}
			></span>
			{translate("ops.move")}
		</button>
	</div>
</div>
