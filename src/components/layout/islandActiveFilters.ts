import { setIcon } from 'obsidian';
import { translate } from '../../i18n/index';
import type { VaultmanPlugin } from '../../main';
import { openBasesFilterInteropMenu } from '../../utils/basesFilterInterop';
import { openFilterTemplateMenu } from '../../utils/filterTemplateMenu';

export interface ActiveFilterViewState {
	id: string;
	rule: string;
	label: string;
	description: string;
	clear: () => void;
}

/**
 * In-frame floating island showing active filter rules.
 * Mirrors the design of QueueIslandComponent.
 */
export class ActiveFiltersIslandComponent {
	private containerEl: HTMLElement;
	private plugin: VaultmanPlugin;
	private onClose: () => void;
	private viewStates: () => ActiveFilterViewState[];
	private onClearAll: () => void;

	private islandEl: HTMLElement | null = null;
	private listEl: HTMLElement | null = null;
	private headerEl: HTMLElement | null = null;

	constructor(
		containerEl: HTMLElement,
		plugin: VaultmanPlugin,
		onClose: () => void,
		viewStates: () => ActiveFilterViewState[] = () => [],
		onClearAll?: () => void,
	) {
		this.containerEl = containerEl;
		this.plugin = plugin;
		this.onClose = onClose;
		this.viewStates = viewStates;
		this.onClearAll =
			onClearAll ??
			(() => {
				this.plugin.filterService.clearFilters();
				this.onClose();
			});
	}

	mount(): void {
		this.islandEl = this.containerEl.createDiv({
			cls: 'vaultman-active-filters-island',
		});

		// 1. Squircle action buttons row
		const btnRow = this.islandEl.createDiv({
			cls: 'vaultman-squircle-row vaultman-filters-island-btns',
		});

		// Left: Clear All
		const clearAllBtn = btnRow.createDiv({
			cls: 'vaultman-squircle',
			attr: {
				'aria-label': translate('filters.popup.clear_all'),
				role: 'button',
				tabindex: '0',
			},
		});
		setIcon(clearAllBtn, 'lucide-trash-2');
		clearAllBtn.addEventListener('click', () => {
			this.onClearAll();
		});

		// Right: Templates
		const templateBtn = btnRow.createDiv({
			cls: 'vaultman-squircle',
			attr: {
				'aria-label': translate('filters.popup.templates'),
				role: 'button',
				tabindex: '0',
			},
		});
		setIcon(templateBtn, 'lucide-bookmark');
		templateBtn.addEventListener('click', (e) => {
			openFilterTemplateMenu(this.plugin, e, this.onClose);
		});

		const basesBtn = btnRow.createDiv({
			cls: 'vaultman-squircle',
			attr: {
				'aria-label': translate('filters.bases.menu'),
				role: 'button',
				tabindex: '0',
			},
		});
		setIcon(basesBtn, 'lucide-database-zap');
		basesBtn.addEventListener('click', (e) => {
			openBasesFilterInteropMenu(this.plugin, e, this.onClose);
		});

		// 2. Header
		this.headerEl = this.islandEl.createDiv({
			cls: 'vaultman-active-filters-island-header',
		});

		// 3. Scrollable item list
		this.listEl = this.islandEl.createDiv({
			cls: 'vaultman-active-filters-island-list',
		});

		this.render();

		window.requestAnimationFrame(() => {
			this.islandEl?.addClass('is-open');
		});
	}

	render(): void {
		if (!this.listEl || !this.headerEl) return;
		const rules = this.plugin.filterService.getFlatRules();
		const viewStates = this.viewStates();
		const filtered = this.plugin.filterService.filteredVaultFiles.length;
		const total = this.plugin.app.vault.getFiles().length;

		this.headerEl.setText(
			translate('filters.popup.filtered_files', { filtered, total }),
		);

		this.listEl.empty();
		if (rules.length === 0 && viewStates.length === 0) {
			this.listEl.createDiv({
				cls: 'vaultman-active-filters-empty',
				text: translate('filters.popup.empty'),
			});
			return;
		}

		for (const rule of rules) {
			const row = this.listEl.createDiv({
				cls: 'vaultman-active-filter-island-row',
			});
			row.toggleClass('is-disabled', !rule.enabled);
			row.setAttribute('title', rule.warning ?? rule.description);

			const textEl = row.createSpan({
				cls: 'vaultman-active-filter-row-text',
			});
			textEl.createSpan({
				cls: 'vaultman-active-filter-row-rule',
				text: rule.rule ?? '',
			});
			textEl.createSpan({
				cls: 'vaultman-active-filter-row-label',
				text: rule.label ?? rule.description,
			});

			const actions = row.createDiv({
				cls: 'vaultman-active-filter-row-actions',
			});

			const toggle = actions.createDiv({
				cls: 'vaultman-active-filter-toggle clickable-icon',
				attr: { 'aria-label': rule.enabled ? 'Disable' : 'Enable' },
			});
			setIcon(toggle, rule.enabled ? 'lucide-eye' : 'lucide-eye-off');
			toggle.addEventListener('click', (e) => {
				e.stopPropagation();
				this.plugin.filterService.toggleFilterRule(rule.id);
				this.render();
			});

			const del = actions.createDiv({
				cls: 'vaultman-active-filter-delete clickable-icon',
				attr: { 'aria-label': 'Delete' },
			});
			setIcon(del, 'lucide-trash-2');
			del.addEventListener('click', (e) => {
				e.stopPropagation();
				this.plugin.filterService.deleteFilterRule(rule.id);
				this.render();
			});
		}

		for (const viewState of viewStates) {
			const row = this.listEl.createDiv({
				cls: 'vaultman-active-filter-island-row is-view-state',
			});
			row.setAttribute('title', viewState.description);

			const textEl = row.createSpan({
				cls: 'vaultman-active-filter-row-text',
			});
			textEl.createSpan({
				cls: 'vaultman-active-filter-row-rule',
				text: viewState.rule,
			});
			textEl.createSpan({
				cls: 'vaultman-active-filter-row-label',
				text: viewState.label,
			});

			const actions = row.createDiv({
				cls: 'vaultman-active-filter-row-actions',
			});

			const del = actions.createDiv({
				cls: 'vaultman-active-filter-delete clickable-icon',
				attr: { 'aria-label': translate('filters.popup.rule.delete') },
			});
			setIcon(del, 'lucide-x');
			del.addEventListener('click', (e) => {
				e.stopPropagation();
				viewState.clear();
				this.render();
			});
		}
	}

	destroy(): void {
		this.islandEl?.remove();
		this.islandEl = null;
		this.listEl = null;
		this.headerEl = null;
	}
}
