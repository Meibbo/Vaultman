/**
 * Generic ItemView shell for an independent vaultman tab leaf.
 *
 * Phase 6, multifacet wave 2: each detachable TabId gets its own
 * registered view-type (`viewTypeFor(tabId)`). The leaf hosts a
 * placeholder element marked with the canonical TabId. Future phases
 * will swap the placeholder for the same Svelte component the in-panel
 * tab uses (the spec mandates "the same component"); the wiring is kept
 * minimal here so phase 6 can land without monkey-patching private
 * Obsidian APIs.
 */
import { ItemView, type WorkspaceLeaf } from 'obsidian';
import type { TabId } from '../registry/tabRegistry';
import { viewTypeFor } from '../registry/tabRegistry';
import type { VaultmanPlugin } from '../main';
import { mount, unmount, type Component } from 'svelte';
import DetachedTabHost from '../components/frame/DetachedTabHost.svelte';

export class VaultmanTabLeafView extends ItemView {
	private readonly tabId: TabId;
	private readonly plugin: VaultmanPlugin;
	private svelteApp: ReturnType<typeof mount> | null = null;

	constructor(leaf: WorkspaceLeaf, tabId: TabId, plugin: VaultmanPlugin) {
		super(leaf);
		this.tabId = tabId;
		this.plugin = plugin;
	}

	getViewType(): string {
		return viewTypeFor(this.tabId);
	}

	getDisplayText(): string {
		return `Vaultman: ${this.tabId}`;
	}

	getIcon(): string {
		return 'lucide-dessert';
	}

	async onOpen(): Promise<void> {
		const { contentEl } = this;
		this.containerEl.setAttribute('data-type', this.getViewType());
		contentEl.empty();
		contentEl.addClass('vm-tab-leaf');
		contentEl.setAttribute('data-vm-tab-id', this.tabId);
		this.svelteApp = mount(
			DetachedTabHost as unknown as Component<{ plugin: VaultmanPlugin; tabId: TabId }>,
			{
				target: contentEl,
				props: { plugin: this.plugin, tabId: this.tabId },
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
