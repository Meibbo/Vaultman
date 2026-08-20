<script lang="ts">
	import { translate } from '../../index/i18n/lang';

	let {
		searchName = $bindable(),
		searchFolder = $bindable(),
		closePopup,
		icon,
	}: {
		searchName: string;
		searchFolder: string;
		closePopup: () => void;
		icon: (node: HTMLElement, name: string) => any;
	} = $props();
</script>

<div>
	<div class="vm-popup-header">
		<span class="vm-popup-title">{translate('nav.search_files')}</span>
		<div
			class="clickable-icon"
			aria-label="Close"
			use:icon={'lucide-x'}
			onclick={closePopup}
			onkeydown={(e: KeyboardEvent) => {
				if (e.key === 'Enter' || e.key === ' ') closePopup();
			}}
			role="button"
			tabindex="0"
		></div>
	</div>
	<div class="vm-search-fields">
		<input
			class="vm-search-input"
			type="text"
			placeholder={translate('search.name_placeholder')}
			bind:value={searchName}
			onkeydown={(e: KeyboardEvent) => {
				if (e.ctrlKey && (e.key === 'Backspace' || e.key === 'Delete')) e.stopPropagation();
			}}
		/>
		<input
			class="vm-search-input"
			type="text"
			placeholder={translate('search.folder_placeholder')}
			bind:value={searchFolder}
			onkeydown={(e: KeyboardEvent) => {
				if (e.ctrlKey && (e.key === 'Backspace' || e.key === 'Delete')) e.stopPropagation();
			}}
		/>
	</div>
</div>
