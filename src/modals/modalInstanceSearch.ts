import { SuggestModal, setIcon, type App } from 'obsidian';
import type VaultmanPlugin from '../main';
import { translate } from '../i18n/index';
const VAULTMAN_FRAME_TYPE = 'vaultman-frame';

export interface InstanceChoice {
	kind: 'existing' | 'create';
	id: string;
	title: string;
	subtitle?: string;
	activeScene?: string;
	surfacePosition?: string;
}

/**
 * Native fuzzy suggester modal for searching and opening existing Vaultman
 * workspace instances or creating a new one when the entered name does not match.
 */
export class InstanceSearchModal extends SuggestModal<InstanceChoice> {
	private readonly plugin: VaultmanPlugin;

	constructor(app: App, plugin: VaultmanPlugin) {
		super(app);
		this.plugin = plugin;
		this.setPlaceholder(
			translate('instance.search.placeholder') ||
				'Search instance or type new name...',
		);
		this.emptyStateText =
			translate('instance.search.empty') || 'No matching instances';
	}

	getSuggestions(query: string): InstanceChoice[] {
		const trimmed = query.trim();
		const registry =
			this.plugin.settings.instanceRegistry ?? { schema: 1, instances: {} };
		const instances = Object.values(registry.instances).filter(
			(rec) => !rec.tombstoned,
		);

		// Collect live open leaves
		const openLeaves =
			this.app?.workspace?.getLeavesOfType?.(VAULTMAN_FRAME_TYPE) ?? [];
		const mountedIds = new Set(
			openLeaves
				.map((l) => this.plugin.workspaceMountForLeaf(l)?.instanceId)
				.filter((id): id is string => Boolean(id)),
		);

		const choices: InstanceChoice[] = [];
		const lowerQuery = trimmed.toLowerCase();

		// 1. Existing instances matching query
		for (const inst of instances) {
			const displayName = inst.cell_name || inst.customName;
			const title = displayName ? `${displayName} · ${inst.id}` : inst.id;
			const matches =
				!lowerQuery ||
				inst.id.toLowerCase().includes(lowerQuery) ||
				(inst.cell_name && inst.cell_name.toLowerCase().includes(lowerQuery)) ||
				(inst.customName && inst.customName.toLowerCase().includes(lowerQuery)) ||
				(inst.activeScene && inst.activeScene.toLowerCase().includes(lowerQuery));
			if (matches) {
				const isMounted = mountedIds.has(inst.id);
				choices.push({
					kind: 'existing',
					id: inst.id,
					title,
					activeScene: inst.activeScene ?? 'files',
					surfacePosition:
						inst.surfacePosition ?? (inst.homeSurface?.kind ?? 'main'),
					subtitle: `${inst.activeScene ? `[${inst.activeScene}] ` : ''}${
						isMounted ? '(Open / Mounted)' : '(Saved)'
					}`,
				});
			}
		}

		// Sort existing choices: mounted first, then by lastActiveAt descending
		choices.sort((a, b) => {
			const recA = registry.instances[a.id];
			const recB = registry.instances[b.id];
			const mountedA = mountedIds.has(a.id) ? 1 : 0;
			const mountedB = mountedIds.has(b.id) ? 1 : 0;
			if (mountedA !== mountedB) return mountedB - mountedA;
			return (recB?.lastActiveAt ?? 0) - (recA?.lastActiveAt ?? 0);
		});

		// 2. Option to create a new one
		// If query is not empty and does not exactly match an existing instance ID
		const exactMatch = instances.some(
			(inst) => inst.id.toLowerCase() === lowerQuery,
		);
		if (trimmed.length > 0 && !exactMatch) {
			choices.unshift({
				kind: 'create',
				id: trimmed,
				title: `Create new instance: "${trimmed}"`,
				subtitle: 'Create a new Vaultman workspace instance with this name',
			});
		} else if (!trimmed) {
			// When query is empty, also append option to create a new instance with auto ID
			choices.push({
				kind: 'create',
				id: '',
				title: '+ Create new instance',
				subtitle: 'Open a fresh new Vaultman instance',
			});
		}

		return choices;
	}

	renderSuggestion(item: InstanceChoice, el: HTMLElement): void {
		el.empty();
		const container = el.createDiv({ cls: 'vaultman-suggestion-item' });
		const iconEl = container.createSpan({ cls: 'vaultman-suggestion-icon' });
		if (item.kind === 'create') {
			setIcon(iconEl, 'lucide-plus-circle');
		} else {
			setIcon(iconEl, 'lucide-layout');
		}
		const textContainer = container.createDiv({
			cls: 'vaultman-suggestion-text',
		});
		textContainer.createDiv({
			cls: 'vaultman-suggestion-title',
			text: item.title,
		});
		if (item.subtitle) {
			textContainer.createDiv({
				cls: 'vaultman-suggestion-subtitle',
				text: item.subtitle,
			});
		}
	}

	onChooseSuggestion(
		item: InstanceChoice,
		_evt: MouseEvent | KeyboardEvent,
	): void {
		void (async () => {
			if (item.kind === 'existing') {
				await this.plugin.openWorkspaceInstance(item.id);
			} else {
				await this.plugin.createAndOpenWorkspaceInstance(
					undefined,
					item.id || undefined,
				);
			}
		})();
	}
}
