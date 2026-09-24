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

export interface SelectedNodeItem {
	id: string;
	label: string;
	occurrenceId?: string;
	scene?: string;
	deselect?: () => void;
}

export interface SelectedNodesSnapshot {
	scene?: string;
	instanceId?: string;
	revision?: number;
	rows: readonly SelectedNodeItem[];
}

/**
 * In-frame floating island showing active filter rules or actively selected nodes.
 * U130-GGC-030: Squircle toggle between node_filters and node_selected views per scene/instance.
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
	private viewToggleBtn: HTMLElement | null = null;
	private clearAllBtn: HTMLElement | null = null;

	private currentView: 'filters' | 'selected' = 'filters';

	constructor(
		containerEl: HTMLElement,
		plugin: VaultmanPlugin,
		onClose: () => void,
		viewStates: () => ActiveFilterViewState[] = () => [],
		onClearAll?: () => void,
		private readonly getDisplayedCount?: () => { filtered: number; total: number },
		private readonly getSelectedSnapshot?: () => SelectedNodesSnapshot | readonly SelectedNodeItem[],
		private readonly onClearSelection?: () => void,
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

		// Left: Clear All (Filters or Selected)
		this.clearAllBtn = btnRow.createDiv({
			cls: 'vaultman-squircle',
			attr: {
				'aria-label': translate('filters.popup.clear_all'),
				role: 'button',
				tabindex: '0',
			},
		});
		setIcon(this.clearAllBtn, 'lucide-trash-2');
		this.clearAllBtn.addEventListener('click', () => {
			if (this.currentView === 'selected') {
				if (this.onClearSelection) {
					this.onClearSelection();
				} else {
					const rows = this.getSelectedRows();
					for (const row of rows) row.deselect?.();
				}
				this.render();
			} else {
				this.onClearAll();
			}
		});

		// View Toggle: node_filters <-> node_selected (U130-GGC-030)
		this.viewToggleBtn = btnRow.createDiv({
			cls: 'vaultman-squircle vaultman-filters-view-toggle',
			attr: {
				'aria-label': translate('filters.island.view_selected'),
				'aria-pressed': 'false',
				role: 'button',
				tabindex: '0',
			},
		});
		setIcon(this.viewToggleBtn, 'lucide-check-square');
		const handleToggle = () => {
			this.toggleViewMode();
		};
		this.viewToggleBtn.addEventListener('click', handleToggle);
		this.viewToggleBtn.addEventListener('keydown', (e: KeyboardEvent) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				handleToggle();
			}
		});

		// Templates
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

		// Bases Interop
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

		if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
			window.requestAnimationFrame(() => {
				this.islandEl?.addClass('is-open');
			});
		}
	}

	private getSelectedRows(): readonly SelectedNodeItem[] {
		if (!this.getSelectedSnapshot) return [];
		const raw = this.getSelectedSnapshot();
		if (!raw) return [];
		if (Array.isArray(raw)) return raw;
		return 'rows' in raw ? raw.rows : [];
	}

	toggleViewMode(target?: 'filters' | 'selected'): void {
		if (target) {
			this.currentView = target;
		} else {
			this.currentView = this.currentView === 'filters' ? 'selected' : 'filters';
		}
		this.updateViewToggleState();
		this.render();
	}

	getViewMode(): 'filters' | 'selected' {
		return this.currentView;
	}

	private updateViewToggleState(): void {
		if (!this.viewToggleBtn) return;
		const isSelected = this.currentView === 'selected';
		if (typeof this.viewToggleBtn.toggleClass === 'function') {
			this.viewToggleBtn.toggleClass('is-accent', isSelected);
		}
		this.viewToggleBtn.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
		const label = isSelected
			? translate('filters.island.view_filters')
			: translate('filters.island.view_selected');
		this.viewToggleBtn.setAttribute('aria-label', label);
		this.viewToggleBtn.setAttribute('title', label);
		setIcon(this.viewToggleBtn, isSelected ? 'lucide-filter' : 'lucide-check-square');

		if (this.clearAllBtn) {
			const clearLabel = isSelected
				? translate('filters.island.deselect_all')
				: translate('filters.popup.clear_all');
			this.clearAllBtn.setAttribute('aria-label', clearLabel);
			this.clearAllBtn.setAttribute('title', clearLabel);
		}
	}

	render(): void {
		if (!this.listEl || !this.headerEl) return;
		this.updateViewToggleState();

		if (this.currentView === 'selected') {
			this.renderSelectedNodesView();
		} else {
			this.renderFiltersView();
		}
	}

	private renderFiltersView(): void {
		if (!this.listEl || !this.headerEl) return;
		const rules = this.plugin.filterService.getFlatRules();
		const viewStates = this.viewStates();
		const counts = this.getDisplayedCount?.() ?? {
			filtered: this.plugin.filterService.filteredVaultFiles.length,
			total: this.plugin.app.vault.getFiles().length,
		};

		this.headerEl.setText(
			translate('filters.popup.filtered_files', counts),
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
			if (typeof row.toggleClass === 'function') {
				row.toggleClass('is-disabled', !rule.enabled);
			}
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

	private renderSelectedNodesView(): void {
		if (!this.listEl || !this.headerEl) return;
		const rows = this.getSelectedRows();

		this.headerEl.setText(
			translate('filters.island.selected_nodes', { count: rows.length }),
		);

		this.listEl.empty();
		if (rows.length === 0) {
			this.listEl.createDiv({
				cls: 'vaultman-active-filters-empty',
				text: translate('filters.island.no_selected'),
			});
			return;
		}

		for (const row of rows) {
			const itemRow = this.listEl.createDiv({
				cls: 'vaultman-active-filter-island-row is-selected-node',
			});
			itemRow.setAttribute('title', row.occurrenceId ?? row.id);

			const textEl = itemRow.createSpan({
				cls: 'vaultman-active-filter-row-text',
			});
			if (row.scene) {
				const badge = textEl.createSpan({
					cls: 'vaultman-active-filter-row-rule',
					text: row.scene.toUpperCase(),
				});
				badge.addClass('is-scene-badge');
			}
			textEl.createSpan({
				cls: 'vaultman-active-filter-row-label',
				text: row.label || row.id,
			});

			const actions = itemRow.createDiv({
				cls: 'vaultman-active-filter-row-actions',
			});

			const deselectBtn = actions.createDiv({
				cls: 'vaultman-active-filter-delete clickable-icon',
				attr: { 'aria-label': translate('filters.island.deselect_item') },
			});
			setIcon(deselectBtn, 'lucide-x');
			deselectBtn.addEventListener('click', (e) => {
				e.stopPropagation();
				row.deselect?.();
				this.render();
			});
		}
	}

	destroy(): void {
		this.islandEl?.remove();
		this.islandEl = null;
		this.listEl = null;
		this.headerEl = null;
		this.viewToggleBtn = null;
		this.clearAllBtn = null;
	}
}
