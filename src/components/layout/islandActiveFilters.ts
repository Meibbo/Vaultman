import { setIcon, Menu } from 'obsidian';
import { translate } from '../../i18n/index';
import type { VaultmanPlugin } from '../../main';
import { SaveTemplateModal } from '../../modals/modalSaveTemplate';

/**
 * In-frame floating island showing active filter rules.
 * Mirrors the design of QueueIslandComponent.
 */
export class ActiveFiltersIslandComponent {
	private containerEl: HTMLElement;
	private plugin: VaultmanPlugin;
	private onClose: () => void;

	private islandEl: HTMLElement | null = null;
	private listEl: HTMLElement | null = null;
	private headerEl: HTMLElement | null = null;

	constructor(
		containerEl: HTMLElement,
		plugin: VaultmanPlugin,
		onClose: () => void
	) {
		this.containerEl = containerEl;
		this.plugin = plugin;
		this.onClose = onClose;
	}

	mount(): void {
		this.islandEl = this.containerEl.createDiv({ cls: 'vaultman-active-filters-island' });

		// 1. Squircle action buttons row
		const btnRow = this.islandEl.createDiv({ cls: 'vaultman-squircle-row vaultman-filters-island-btns' });

		// Left: Clear All
		const clearAllBtn = btnRow.createDiv({
			cls: 'vaultman-squircle',
			attr: { 'aria-label': translate('filters.popup.clear_all'), role: 'button', tabindex: '0' },
		});
		setIcon(clearAllBtn, 'lucide-trash-2');
		clearAllBtn.addEventListener('click', () => {
			this.plugin.filterService.clearFilters();
			this.onClose();
		});

		// Left: List Details (Reserved/Toggle View?)
		const detailsBtn = btnRow.createDiv({
			cls: 'vaultman-squircle',
			attr: { 'aria-label': translate('ops.details'), role: 'button', tabindex: '0' },
		});
		setIcon(detailsBtn, 'lucide-list');
		detailsBtn.addEventListener('click', () => {
			// Toggle between tree and flat list if needed in future
		});

		// Right: Templates
		const templateBtn = btnRow.createDiv({
			cls: 'vaultman-squircle',
			attr: { 'aria-label': translate('filters.popup.templates'), role: 'button', tabindex: '0' },
		});
		setIcon(templateBtn, 'lucide-bookmark');
		templateBtn.addEventListener('click', (e) => {
			const menu = new Menu();
			this.plugin.settings.filterTemplates.forEach((tpl) => {
				menu.addItem((item) =>
					item.setTitle(tpl.name).onClick(() => {
						this.plugin.filterService.loadTemplate(tpl);
						this.onClose();
					}),
				);
			});
			menu.addSeparator();
			menu.addItem((item) =>
				item.setTitle(translate("filter.template.save")).onClick(() => {
					new SaveTemplateModal(this.plugin.app, this.plugin, this.plugin.filterService.activeFilter).open();
					this.onClose();
				})
			);
			menu.showAtMouseEvent(e);
		});

		// Right: Apply (reserved for active filters, maybe "Save for later")
		const saveBtn = btnRow.createDiv({
			cls: 'vaultman-squircle is-accent',
			attr: { 'aria-label': 'Save Filter', role: 'button', tabindex: '0' },
		});
		setIcon(saveBtn, 'lucide-check');
		saveBtn.addEventListener('click', () => {
			// Logic to save as permanent filter if needed
			this.onClose();
		});

		// 2. Header
		this.headerEl = this.islandEl.createDiv({ cls: 'vaultman-active-filters-island-header' });

		// 3. Scrollable item list
		this.listEl = this.islandEl.createDiv({ cls: 'vaultman-active-filters-island-list' });

		this.render();

		window.requestAnimationFrame(() => {
			this.islandEl?.addClass('is-open');
		});
	}

	render(): void {
		if (!this.listEl || !this.headerEl) return;
		const rules = this.plugin.filterService.getFlatRules();

		this.headerEl.setText(`${rules.length} ${translate('filters.popup.active') || 'active rules'}`);

		this.listEl.empty();
		if (rules.length === 0) {
			this.listEl.createDiv({ cls: 'vaultman-active-filters-empty', text: translate('filters.popup.empty') });
			return;
		}

		for (const rule of rules) {
			const row = this.listEl.createDiv({ cls: 'vaultman-active-filter-island-row' });
			row.toggleClass('is-disabled', !rule.enabled);

			row.createSpan({ cls: 'vaultman-active-filter-row-text', text: rule.description });

			const actions = row.createDiv({ cls: 'vaultman-active-filter-row-actions' });

			const toggle = actions.createDiv({
				cls: 'vaultman-active-filter-toggle clickable-icon',
				attr: { 'aria-label': rule.enabled ? 'Disable' : 'Enable' }
			});
			setIcon(toggle, rule.enabled ? 'lucide-eye' : 'lucide-eye-off');
			toggle.addEventListener('click', (e) => {
				e.stopPropagation();
				this.plugin.filterService.toggleFilterRule(rule.id);
				this.render();
			});

			const del = actions.createDiv({
				cls: 'vaultman-active-filter-delete clickable-icon',
				attr: { 'aria-label': 'Delete' }
			});
			setIcon(del, 'lucide-trash-2');
			del.addEventListener('click', (e) => {
				e.stopPropagation();
				this.plugin.filterService.deleteFilterRule(rule.id);
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
