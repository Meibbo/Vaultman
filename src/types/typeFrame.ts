import { ItemView, type WorkspaceLeaf } from 'obsidian';
import type { VaultmanPlugin } from '../main';
import { mount, unmount, type Component } from 'svelte';
import VaultmanFrameSvelte from '../components/frame/frameVaultman.svelte';
import { translate } from '../index/i18n/lang';
export const TYPE_FRAME_VM = 'vm-frame';
/**
 * Full-width explorer view shell.
 */
export class VaultmanFrame extends ItemView {
	private plugin: VaultmanPlugin;
	private svelteApp: ReturnType<typeof mount> | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: VaultmanPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return TYPE_FRAME_VM;
	}
	getDisplayText(): string {
		return translate('plugin.frame_name');
	}
	getIcon(): string {
		return 'lucide-vault';
	}

	async onOpen(): Promise<void> {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('vm-frame');

		this.svelteApp = mount(
			VaultmanFrameSvelte as unknown as Component<{ plugin: VaultmanPlugin }>,
			{
				target: contentEl,
				props: { plugin: this.plugin },
			},
		);
	}

	async onClose(): Promise<void> {
		if (this.svelteApp) {
			await unmount(this.svelteApp);
			this.svelteApp = null;
		}
		this.contentEl.empty();
	}
}
