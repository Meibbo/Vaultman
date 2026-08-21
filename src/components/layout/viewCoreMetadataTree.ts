import { setIcon, setTooltip } from 'obsidian';

import {
	resolveExplorerHighlight,
	type ExplorerHighlightIdSets,
} from '../../logic/logicExplorerHighlight';
import type { TreeNode } from '../../types/typeTree';
import {
	attachBadgeCancelInteraction,
	badgeCancelInteractionLabel,
	normalizeBadgeCancelClickMode,
	type BadgeCancelClickMode,
} from '../../utils/badgeInteraction';

/**
 * Provider-owned values for Core's file-properties anatomy. The renderer owns
 * the structure; the provider only supplies the property vocabulary and the
 * existing value Cell renderer.
 */
export interface CoreMetadataTreeAnatomy {
	heading: string;
	addButtonLabel: string;
	propertyKey: (node: TreeNode) => string;
	propertyType: (node: TreeNode) => string;
	renderValue: (
		container: HTMLElement,
		valueNode: TreeNode,
		propertyAttributeContainer: HTMLElement,
	) => boolean;
	/** Tree owns the reorder gesture; the mutation policy is supplied later. */
	onReorderStart?: (id: string, event: DragEvent) => void;
	onReorderOver?: (id: string, event: DragEvent) => void;
	onReorderDrop?: (id: string, event: DragEvent) => void;
}

export interface CoreMetadataTreeRenderOptions {
	nodes: TreeNode[];
	coreMetadata: CoreMetadataTreeAnatomy;
	visibleCells?: Set<string>;
	activeFilterIds?: Set<string>;
	excludedFilterIds?: Set<string>;
	highlightIds?: ExplorerHighlightIdSets;
	selectedIds?: Set<string>;
	selectionCheckboxPosition?: 'start' | 'end' | 'hidden';
	onSelectionToggle?: (id: string, selected: boolean) => void;
	searchHighlightIds?: Set<string>;
	warningIds?: Set<string>;
	onRowClick: (id: string, event?: MouseEvent) => void;
	onContextMenu: (id: string, event: MouseEvent) => void;
	onBadgeDoubleClick?: (queueIndex: number) => void;
	badgeCancelClickMode?: BadgeCancelClickMode;
}

/**
 * A layout strategy for the one engine that Core actually has. Table and Cards
 * never instantiate this class, so they cannot accidentally grow a metadata
 * imitation alongside their native Cells.
 */
export class CoreMetadataTreeView {
	private active = false;
	private collapsed = false;

	constructor(
		private readonly containerEl: HTMLElement,
		private readonly rowEls: Map<string, HTMLElement>,
	) {}

	get isActive(): boolean {
		return this.active;
	}

	render(opts: CoreMetadataTreeRenderOptions): void {
		this.active = true;
		this.containerEl.empty();
		this.rowEls.clear();
		this.containerEl.addClass('metadata-container');
		this.containerEl.addClass('vaultman-core-metadata-tree');
		this.containerEl.toggleClass('is-collapsed', this.collapsed);
		this.containerEl.setAttribute('data-property-count', String(opts.nodes.length));

		const heading = this.containerEl.createDiv({
			cls: 'metadata-properties-heading',
			attr: { tabIndex: 0 },
		});
		const collapse = heading.createDiv({
			cls: 'collapse-indicator collapse-icon',
		});
		setIcon(collapse, 'right-triangle');
		collapse.toggleClass('is-collapsed', this.collapsed);
		heading.setAttribute('aria-expanded', String(!this.collapsed));
		heading.createDiv({
			cls: 'metadata-properties-title',
			text: opts.coreMetadata.heading,
		});
		const setCollapsed = (collapsed: boolean): void => {
			this.collapsed = collapsed;
			this.containerEl.toggleClass('is-collapsed', collapsed);
			collapse.toggleClass('is-collapsed', collapsed);
			heading.setAttribute('aria-expanded', String(!collapsed));
		};
		heading.onclick = (event) => {
			event.preventDefault();
			setCollapsed(!this.collapsed);
		};
		heading.onkeydown = (event) => {
			if (event.key === 'ArrowLeft') setCollapsed(true);
			else if (event.key === 'ArrowRight') setCollapsed(false);
			else if (event.key === 'Enter' || event.key === ' ') {
				setCollapsed(!this.collapsed);
			} else {
				return;
			}
			event.preventDefault();
		};

		const content = this.containerEl.createDiv({ cls: 'metadata-content' });
		const properties = content.createDiv({ cls: 'metadata-properties' });
		for (const node of opts.nodes) {
			this.renderProperty(properties, node, opts);
		}

		const addButton = content.createDiv({
			cls: 'metadata-add-button text-icon-button',
			attr: { 'aria-disabled': 'true', tabIndex: -1 },
		});
		const addIcon = addButton.createSpan({ cls: 'text-button-icon' });
		setIcon(addIcon, 'lucide-plus');
		addButton.createSpan({
			cls: 'text-button-label',
			text: opts.coreMetadata.addButtonLabel,
		});
	}

	destroy(): void {
		if (!this.active) return;
		this.active = false;
		this.containerEl.empty();
		this.containerEl.removeClass('metadata-container');
		this.containerEl.removeClass('vaultman-core-metadata-tree');
		this.containerEl.removeClass('is-collapsed');
		this.containerEl.removeAttribute('data-property-count');
		this.rowEls.clear();
	}

	private renderProperty(
		properties: HTMLElement,
		node: TreeNode,
		opts: CoreMetadataTreeRenderOptions,
	): void {
		const anatomy = opts.coreMetadata;
		const propertyKey = anatomy.propertyKey(node);
		const propertyType = anatomy.propertyType(node);
		const row = properties.createDiv({ cls: 'metadata-property' });
		row.dataset.id = node.id;
		row.setAttribute('data-property-key', propertyKey);
		row.setAttribute('data-property-type', propertyType);
		this.applyNodeState(row, node, opts);
		this.bindNode(row, node, opts, false);
		this.rowEls.set(node.id, row);

		if ((opts.selectionCheckboxPosition ?? 'start') === 'start') {
			this.renderSelectionCheckbox(row, node, opts);
		}

		const key = row.createDiv({ cls: 'metadata-property-key' });
		const icon = key.createSpan({ cls: 'metadata-property-icon' });
		if (opts.visibleCells?.has('icon') ?? true) {
			setIcon(icon, node.icon ?? 'lucide-file-question');
		}
		icon.draggable = Boolean(anatomy.onReorderStart);
		icon.setAttribute(
			'aria-disabled',
			anatomy.onReorderStart ? 'false' : 'true',
		);
		icon.ondragstart = anatomy.onReorderStart
			? (event) => {
					row.addClass('is-being-dragged');
					anatomy.onReorderStart?.(node.id, event);
				}
			: null;
		icon.ondragend = () => row.removeClass('is-being-dragged');

		const keyInput = key.createEl('input', {
			cls: 'metadata-property-key-input',
			type: 'text',
			value: propertyKey,
			attr: { autocapitalize: 'none' },
		});
		keyInput.readOnly = true;
		keyInput.hidden = !(opts.visibleCells?.has('text') ?? true);
		keyInput.addEventListener('click', (event) => event.stopPropagation());

		const value = row.createDiv({ cls: 'metadata-property-value' });
		value.setAttribute('data-property-key', propertyKey);
		value.setAttribute('data-property-type', propertyType);
		for (const valueNode of node.children ?? []) {
			const item = value.createDiv({
				cls: 'metadata-property-value-item vaultman-metadata-property-value-node',
			});
			item.dataset.id = valueNode.id;
			this.applyNodeState(item, valueNode, opts);
			this.bindNode(item, valueNode, opts, true);
			this.rowEls.set(valueNode.id, item);
			if (!anatomy.renderValue(item, valueNode, value)) {
				item.createSpan({
					cls: 'vaultman-property-value-text',
					text: valueNode.label,
				});
			}
			this.renderBadges(item, valueNode, opts);
		}

		if ((opts.selectionCheckboxPosition ?? 'start') === 'end') {
			this.renderSelectionCheckbox(row, node, opts);
		}
		if (opts.warningIds?.has(node.id)) {
			const warning = row.createSpan({
				cls: 'clickable-icon metadata-property-warning-icon',
			});
			setIcon(warning, 'lucide-alert-triangle');
		}
		this.renderBadges(row, node, opts);

		row.ondragover = anatomy.onReorderOver
			? (event) => anatomy.onReorderOver?.(node.id, event)
			: null;
		row.ondrop = anatomy.onReorderDrop
			? (event) => {
					row.removeClass('is-being-dragged-over');
					anatomy.onReorderDrop?.(node.id, event);
				}
			: null;
	}

	private bindNode(
		element: HTMLElement,
		node: TreeNode,
		opts: CoreMetadataTreeRenderOptions,
		stopPropagation: boolean,
	): void {
		element.setAttribute('role', 'button');
		element.setAttribute('aria-label', node.label);
		element.tabIndex = 0;
		element.onclick = (event) => {
			if (stopPropagation) event.stopPropagation();
			opts.onRowClick(node.id, event);
		};
		element.oncontextmenu = (event) => {
			event.preventDefault();
			event.stopPropagation();
			opts.onContextMenu(node.id, event);
		};
	}

	private applyNodeState(
		element: HTMLElement,
		node: TreeNode,
		opts: CoreMetadataTreeRenderOptions,
	): void {
		if (typeof node.cls === 'string' && node.cls.trim()) {
			for (const className of node.cls.trim().split(/\s+/)) {
				element.addClass(className);
			}
		}
		const highlight = resolveExplorerHighlight({
			hover: opts.highlightIds?.hover?.has(node.id),
			inclusive:
				opts.highlightIds?.inclusive?.has(node.id) ||
				opts.activeFilterIds?.has(node.id),
			exclusive:
				opts.highlightIds?.exclusive?.has(node.id) ||
				opts.excludedFilterIds?.has(node.id),
			deletion: opts.highlightIds?.deletion?.has(node.id),
		});
		element.toggleClass('is-explorer-hover-highlight', highlight.hover);
		element.toggleClass('is-active-filter', highlight.inclusive);
		element.toggleClass('is-excluded-filter', highlight.exclusive);
		element.toggleClass('is-deletion-highlight', highlight.deletion);
		element.toggleClass(
			'vaultman-search-highlight',
			opts.searchHighlightIds?.has(node.id) ?? false,
		);
		element.toggleClass(
			'vaultman-badge-warning',
			opts.warningIds?.has(node.id) ?? false,
		);
		element.toggleClass('is-selected', opts.selectedIds?.has(node.id) ?? false);
	}

	private renderSelectionCheckbox(
		container: HTMLElement,
		node: TreeNode,
		opts: CoreMetadataTreeRenderOptions,
	): void {
		if (!opts.onSelectionToggle) return;
		if (opts.selectionCheckboxPosition === 'hidden') return;
		const checkbox = container.createEl('input', {
			type: 'checkbox',
			cls: `metadata-input-checkbox vaultman-selection-checkbox vaultman-selection-checkbox--${opts.selectionCheckboxPosition ?? 'start'}`,
			attr: { 'aria-label': `Select ${node.label}` },
		});
		checkbox.checked = opts.selectedIds?.has(node.id) ?? false;
		checkbox.onclick = (event) => event.stopPropagation();
		checkbox.onchange = (event) => {
			event.stopPropagation();
			opts.onSelectionToggle?.(node.id, checkbox.checked);
		};
	}

	private renderBadges(
		container: HTMLElement,
		node: TreeNode,
		opts: CoreMetadataTreeRenderOptions,
	): void {
		if (!node.badges?.length) return;
		const zone = container.createDiv({ cls: 'vaultman-tree-badge-zone' });
		for (const badge of node.badges) {
			const badgeEl = zone.createSpan({ cls: 'vaultman-badge' });
			if (badge.solid && badge.color) {
				badgeEl.addClass(`vaultman-badge--${badge.color}`);
			}
			if (badge.solid) badgeEl.addClass('is-solid');
			if (badge.isInherited) badgeEl.addClass('is-inherited');
			if (badge.icon) {
				const icon = badgeEl.createSpan({ cls: 'vaultman-badge-icon' });
				setIcon(icon, badge.icon);
			}
			const badgeHint = badge.tooltip ?? badge.text;
			if (badgeHint) setTooltip(badgeEl, badgeHint);
			if (badge.text && !badge.icon) badgeEl.setText(badge.text);
			if (badge.queueIndex === undefined || !opts.onBadgeDoubleClick) continue;
			const cancelMode = normalizeBadgeCancelClickMode(
				opts.badgeCancelClickMode,
			);
			badgeEl.addClass('is-undoable');
			badgeEl.setAttribute(
				'title',
				`${badge.text ?? ''} — ${badgeCancelInteractionLabel(cancelMode)}`,
			);
			attachBadgeCancelInteraction(badgeEl, cancelMode, () => {
				opts.onBadgeDoubleClick?.(badge.queueIndex!);
			});
		}
	}
}
