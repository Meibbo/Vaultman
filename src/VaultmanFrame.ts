import { ItemView, type WorkspaceLeaf } from 'obsidian';
import type { VaultmanPlugin } from './main';
import { mount, unmount } from 'svelte';
import VaultmanFrameSvelte from './VaultmanFrame.svelte';
import { translate } from './i18n/index';

export const VAULTMAN_FRAME_TYPE = 'vaultman-frame';

type VaultmanFrameSvelteApi = ReturnType<typeof mount> & {
	focusContentSearch?(): Promise<void> | void;
	focusActiveExplorerSearch?(): Promise<void> | void;
};

/**
 * Full-width explorer view shell.
 */
export class VaultmanFrame extends ItemView {
	private plugin: VaultmanPlugin;
	private svelteApp: VaultmanFrameSvelteApi | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: VaultmanPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string { return VAULTMAN_FRAME_TYPE; }
	getDisplayText(): string { return translate('plugin.frame_name'); }
	getIcon(): string { return 'lucide-vault'; }

	async onOpen(): Promise<void> {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('vaultman-frame');

		this.svelteApp = mount(VaultmanFrameSvelte, {
			target: contentEl,
			props: { plugin: this.plugin },
		}) as VaultmanFrameSvelteApi;
	}

	async onClose(): Promise<void> {
		if (this.svelteApp) {
			await unmount(this.svelteApp);
			this.svelteApp = null;
		}
		this.contentEl.empty();
	}

	async focusContentSearch(): Promise<void> {
		await this.svelteApp?.focusContentSearch?.();
	}

	async focusActiveExplorerSearch(): Promise<void> {
		await this.svelteApp?.focusActiveExplorerSearch?.();
	}
}
