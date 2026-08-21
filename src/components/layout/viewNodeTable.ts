import { Platform, setIcon } from 'obsidian';
import { translate } from '../../i18n/index';
import {
	clampNodeTableColumnWidth,
	resolveNodeTableLayout,
	type NodeTableColumn,
	type NodeTableColumnWidths,
	type NodeTableLayout,
	type NodeTableSurface,
} from '../../logic/logicNodeTableLayout';
import type { TreeNode } from '../../types/typeTree';
import { resolveActiveFilterPresentation } from '../../logic/logicActiveFilterBubbling';
import {
	resolveExplorerHighlight,
	resolveExplorerHighlightForId,
	resolveExplorerStatusDots,
	type ExplorerHighlightIdSets,
	type ExplorerStatusDot,
} from '../../logic/logicExplorerHighlight';
import { buildVirtualTableWindow } from '../../utils/tableVirtualization';
import { vaultmanPerfMonitor } from '../../utils/performanceMonitor';
import { elementContentWidth } from '../../utils/elementDimensions';
import { flattenVisibleTree } from '../../utils/treeVirtualization';
import {
	explorerDensityProfile,
	usesMobileExplorerDensity,
} from '../../logic/logicResponsiveLayout';
import {
	attachBadgeCancelInteraction,
	normalizeBadgeCancelClickMode,
	type BadgeCancelClickMode,
} from '../../utils/badgeInteraction';
import {
	bindLongPressGesture,
	LongPressGesture,
} from '../../utils/longPressGesture';
import { renderIconValue } from '../../utils/renderIconValue';

export interface NodeTableViewOptions<TMeta = unknown> {
	surface: NodeTableSurface;
	nodes: TreeNode<TMeta>[];
	expandedIds: Set<string>;
	visibleCells: Set<string>;
	selectedIds?: Set<string>;
	selectionCheckboxPosition?: 'start' | 'end' | 'hidden';
	onSelectionToggle?: (id: string, selected: boolean) => void;
	activeFilterIds?: Set<string>;
	excludedFilterIds?: Set<string>;
	highlightIds?: ExplorerHighlightIdSets;
	statusDotLabel?: (dot: ExplorerStatusDot) => string;
	searchHighlightIds?: Set<string>;
	warningIds?: Set<string>;
	onToggle: (id: string) => void;
	onRecursiveExpand?: (id: string) => void;
	onRowClick: (id: string, event?: MouseEvent | KeyboardEvent) => void;
	onContextMenu: (id: string, event: MouseEvent) => void;
	onBadgeDoubleClick?: (queueIndex: number) => void;
	badgeCancelClickMode?: BadgeCancelClickMode;
	onDragStart?: (id: string, event: DragEvent) => void;
	onDragOver?: (id: string, event: DragEvent) => void;
	onDrop?: (id: string, event: DragEvent) => void;
	renderLabel?: (container: HTMLElement, node: TreeNode<TMeta>) => boolean;
}

export class NodeTableView<TMeta = unknown> {
	private containerEl: HTMLElement;
	private headerEl: HTMLElement | null = null;
	private listEl: HTMLElement | null = null;
	private tableEl: HTMLElement | null = null;
	private tbodyEl: HTMLElement | null = null;
	private opts: NodeTableViewOptions<TMeta> | null = null;
	private rows: TreeNode<TMeta>[] = [];
	private rowEls = new Map<string, HTMLElement>();
	private _filterBubbleIds: ReadonlySet<string> = new Set();
	private _excludedFilterBubbleIds: ReadonlySet<string> = new Set();
	private _highlightBubbleIds: ExplorerHighlightIdSets = {};
	private pendingRaf: number | null = null;
	private pendingScrollTimer: number | null = null;
	private columnWidths: NodeTableColumnWidths = {};
	private readonly overscan = 12;
	private readonly recursiveExpandGesture = new LongPressGesture();
	private readonly onScroll = () => {
		this._syncHeaderScroll();
		this.scheduleWindowRender();
	};

	constructor(containerEl: HTMLElement) {
		this.containerEl = containerEl;
	}

	private get rowHeight(): number {
		const body = this.containerEl.ownerDocument.body;
		const isMobile = usesMobileExplorerDensity(
			Platform.isMobile,
			body.classList,
		);
		return explorerDensityProfile(isMobile).tableRowHeight;
	}

	render(opts: NodeTableViewOptions<TMeta>): void {
		this.recursiveExpandGesture.cancel();
		if (opts.activeFilterIds) {
			// BT5-038: only the exact filters keep the decoration; a collapsed
			// ancestor no longer inherits it (it is signalled separately).
			this._filterBubbleIds = resolveActiveFilterPresentation(
				opts.nodes,
				opts.expandedIds,
				opts.activeFilterIds,
			).bubbled;
		} else {
			this._filterBubbleIds = new Set();
		}
		this._excludedFilterBubbleIds = opts.excludedFilterIds
			? resolveActiveFilterPresentation(
					opts.nodes,
					opts.expandedIds,
					opts.excludedFilterIds,
				).bubbled
			: new Set();
		this._highlightBubbleIds = {};
		for (const channel of ['inclusive', 'exclusive', 'deletion'] as const) {
			const exact = opts.highlightIds?.[channel];
			if (!exact) continue;
			this._highlightBubbleIds[channel] = resolveActiveFilterPresentation(
				opts.nodes,
				opts.expandedIds,
				new Set(exact),
			).bubbled;
		}
		this.opts = opts;
		this.rows = flattenVisibleTree(
			opts.nodes,
			opts.expandedIds,
		) as TreeNode<TMeta>[];
		this._ensureScaffold();
		const layout = this.layoutFor(opts);
		this._renderHeader(layout);
		this._applyDimensions(layout);
		this.cancelScheduledRender();
		this._renderWindow();
	}

	/** Re-measure only the cached table window after its pane becomes visible. */
	refreshViewport(): void {
		this.cancelScheduledRender();
		this._renderWindow();
	}

	destroy(): void {
		this.recursiveExpandGesture.cancel();
		this.cancelScheduledRender();
		this.listEl?.removeEventListener('scroll', this.onScroll);
		this.containerEl.removeClass('vaultman-node-table-root');
		this.containerEl.empty();
		this.headerEl = null;
		this.listEl = null;
		this.tableEl = null;
		this.tbodyEl = null;
		this.opts = null;
		this.rows = [];
		this.rowEls.clear();
	}

	private _ensureScaffold(): void {
		if (this.listEl && this.tbodyEl && this.containerEl.contains(this.listEl))
			return;

		this.listEl?.removeEventListener('scroll', this.onScroll);
		this.containerEl.empty();
		this.rowEls.clear();
		this.containerEl.addClass('vaultman-node-table-root');
		this.headerEl = this.containerEl.createDiv({
			cls: 'bases-thead vaultman-node-table-header',
		});
		this.listEl = this.containerEl.createDiv({
			cls: 'bases-table-container node-insert-event vaultman-node-table-scroll',
		});
		this.tableEl = this.listEl.createDiv({
			cls: 'bases-table vaultman-node-table-virtual-table',
		});
		this.tbodyEl = this.tableEl.createDiv({
			cls: 'bases-tbody vaultman-node-table-virtual-body',
		});
		this.listEl.addEventListener('scroll', this.onScroll, { passive: true });
	}

	private _renderHeader(layout: NodeTableLayout): void {
		if (!this.headerEl) return;
		this.headerEl.empty();
		const width = `${this.surfaceWidth(layout)}px`;
		this.headerEl.style.width = width;
		const row = this.headerEl.createDiv({
			cls: 'bases-tr vaultman-node-table-header-row',
		});
		row.style.width = width;
		for (const column of layout.columns) {
			const cell = row.createDiv({
				cls: `bases-td vaultman-node-table-col-${column.id}`,
			});
			this._positionCell(cell, column);
			const header = cell.createDiv({ cls: 'bases-table-header' });
			const label = header.createDiv({
				cls: 'bases-table-header-label vaultman-node-table-header-label',
			});
			label.createSpan({
				cls: 'bases-table-header-name',
				text: translate(column.labelKey),
			});
			const resizer = header.createDiv({ cls: 'bases-table-header-resizer' });
			this.attachColumnResizer(resizer, column);
		}
		this._syncHeaderScroll();
	}

	private _applyDimensions(layout: NodeTableLayout): void {
		const width = `${this.surfaceWidth(layout)}px`;
		if (this.headerEl) this.headerEl.style.width = width;
		if (this.tableEl) {
			this.tableEl.style.width = width;
			this.tableEl.style.height = `${this.rows.length * this.rowHeight}px`;
		}
		if (this.tbodyEl) {
			this.tbodyEl.style.width = width;
			this.tbodyEl.style.height = `${this.rows.length * this.rowHeight}px`;
			this.tbodyEl.style.setProperty(
				'--bases-table-row-height',
				`${this.rowHeight}px`,
			);
		}
	}

	private _syncHeaderScroll(): void {
		if (!this.headerEl || !this.listEl) return;
		this.headerEl.style.transform = `translateX(${-this.listEl.scrollLeft}px)`;
	}

	private surfaceWidth(layout: NodeTableLayout): number {
		const viewportWidth = this.listEl
			? elementContentWidth(this.listEl)
			: this.containerEl.clientWidth;
		return Math.max(layout.totalWidth, viewportWidth);
	}

	private _positionCell(cell: HTMLElement, column: NodeTableColumn): void {
		cell.style.insetInlineStart = `${column.left}px`;
		cell.style.width = `${column.width}px`;
	}

	private layoutFor(opts: NodeTableViewOptions<TMeta>): NodeTableLayout {
		return resolveNodeTableLayout(
			opts.surface,
			opts.visibleCells,
			this.columnWidths,
		);
	}

	private attachColumnResizer(
		resizer: HTMLElement,
		column: NodeTableColumn,
	): void {
		resizer.onpointerdown = (event) => {
			event.preventDefault();
			event.stopPropagation();
			if (!this.opts) return;
			const startX = event.clientX;
			const startWidth = column.width;
			const ownerWindow = resizer.ownerDocument.defaultView ?? window;
			const ownerBody = resizer.ownerDocument.body;
			ownerBody.classList.add('vaultman-table-resizing');

			const onMove = (moveEvent: PointerEvent) => {
				if (!this.opts) return;
				const nextWidth = clampNodeTableColumnWidth(
					column.id,
					startWidth + moveEvent.clientX - startX,
				);
				if (this.columnWidths[column.id] === nextWidth) return;
				this.columnWidths = {
					...this.columnWidths,
					[column.id]: nextWidth,
				};
				const layout = this.layoutFor(this.opts);
				this._renderHeader(layout);
				this._applyDimensions(layout);
				this._renderWindow();
			};
			const onUp = () => {
				ownerWindow.removeEventListener('pointermove', onMove);
				ownerBody.classList.remove('vaultman-table-resizing');
			};
			ownerWindow.addEventListener('pointermove', onMove);
			ownerWindow.addEventListener('pointerup', onUp, { once: true });
		};
	}

	private _renderWindow(): void {
		if (!this.opts || !this.listEl || !this.tbodyEl) return;
		const started = performance.now();
		const projection = buildVirtualTableWindow({
			rows: this.rows,
			scrollTop: this.listEl.scrollTop,
			viewportHeight: this.listEl.clientHeight,
			rowHeight: this.rowHeight,
			overscan: this.overscan,
		});
		const layout = this.layoutFor(this.opts);
		this._applyDimensions(layout);
		const visibleIds = new Set(projection.visibleRows.map((row) => row.row.id));
		this.removeStaleRows(visibleIds);
		for (const row of projection.visibleRows) {
			this._renderRow(row.row, row.top, layout, this.opts);
		}
		vaultmanPerfMonitor.record(
			'node.table.window',
			performance.now() - started,
			{
				rows: this.rows.length,
				visibleRows: projection.visibleRows.length,
				start: projection.startIndex,
				end: projection.endIndex,
			},
		);
	}

	private scheduleWindowRender(): void {
		if (this.pendingRaf !== null || this.pendingScrollTimer !== null) return;
		const run = () => {
			if (this.pendingRaf !== null) {
				window.cancelAnimationFrame(this.pendingRaf);
			}
			if (this.pendingScrollTimer !== null) {
				window.clearTimeout(this.pendingScrollTimer);
			}
			this.pendingRaf = null;
			this.pendingScrollTimer = null;
			this._renderWindow();
		};
		this.pendingRaf = window.requestAnimationFrame(run);
		this.pendingScrollTimer = window.setTimeout(run, 32);
	}

	private cancelScheduledRender(): void {
		if (this.pendingRaf !== null) {
			window.cancelAnimationFrame(this.pendingRaf);
			this.pendingRaf = null;
		}
		if (this.pendingScrollTimer !== null) {
			window.clearTimeout(this.pendingScrollTimer);
			this.pendingScrollTimer = null;
		}
	}

	private removeStaleRows(visibleIds: Set<string>): void {
		for (const [id, row] of this.rowEls) {
			if (visibleIds.has(id)) continue;
			row.remove();
			this.rowEls.delete(id);
		}
	}

	private resolveRowHighlight(
		id: string,
		opts: NodeTableViewOptions<TMeta>,
	) {
		const generic = resolveExplorerHighlightForId(id, opts.highlightIds);
		return resolveExplorerHighlight({
			...generic,
			inclusive: generic.inclusive || opts.activeFilterIds?.has(id),
			exclusive: generic.exclusive || opts.excludedFilterIds?.has(id),
		});
	}

	private resolveRowStatusDots(id: string): ExplorerStatusDot[] {
		return resolveExplorerStatusDots({
			inclusive:
				this._highlightBubbleIds.inclusive?.has(id) ||
				this._filterBubbleIds.has(id),
			exclusive:
				this._highlightBubbleIds.exclusive?.has(id) ||
				this._excludedFilterBubbleIds.has(id),
			deletion: this._highlightBubbleIds.deletion?.has(id),
		});
	}

	private rowSignature(
		node: TreeNode<TMeta>,
		layout: NodeTableLayout,
		opts: NodeTableViewOptions<TMeta>,
	): string {
		const highlight = this.resolveRowHighlight(node.id, opts);
		const statusDots = this.resolveRowStatusDots(node.id)
			.map((dot) => dot.channel)
			.join(',');
		const visibleCells = Array.from(opts.visibleCells).sort().join(',');
		const columns = layout.columns
			.map((column) => `${column.id}:${column.left}:${column.width}`)
			.join('|');
		const badges = (node.badges ?? [])
			.map((badge) =>
				[
					badge.text ?? '',
					badge.icon ?? '',
					badge.color ?? '',
					badge.solid ? '1' : '0',
					badge.isInherited ? '1' : '0',
					badge.queueIndex ?? '',
				].join(':'),
			)
			.join('|');
		return [
			opts.surface,
			node.id,
			node.label,
			node.depth,
			node.cls ?? '',
			node.icon ?? '',
			node.iconColor ?? '',
			node.typeText ?? '',
			node.count ?? '',
			node.children?.length ?? 0,
			node.showCaret ? '1' : '0',
			opts.expandedIds.has(node.id) ? '1' : '0',
			highlight.hover ? '1' : '0',
			highlight.inclusive ? '1' : '0',
			highlight.exclusive ? '1' : '0',
			highlight.deletion ? '1' : '0',
			this._filterBubbleIds.has(node.id) ? '1' : '0',
			statusDots,
			opts.warningIds?.has(node.id) ? '1' : '0',
			visibleCells,
			columns,
			badges,
			opts.onSelectionToggle ? 'selection' : '',
			opts.selectionCheckboxPosition ?? 'start',
		].join('\u001f');
	}

	private _renderRow(
		node: TreeNode<TMeta>,
		top: number,
		layout: NodeTableLayout,
		opts: NodeTableViewOptions<TMeta>,
	): void {
		if (!this.tbodyEl) return;
		const signature = this.rowSignature(node, layout, opts);
		const row =
			this.rowEls.get(node.id) ??
			this.tbodyEl.createDiv({
				cls: 'bases-tr vaultman-node-table-row',
			});
		// Same guard as viewTree: rows are recycled and absolutely placed, so a
		// redundant re-parent only serves to cancel a click or hover in flight.
		if (row.parentElement !== this.tbodyEl) this.tbodyEl.appendChild(row);
		this.rowEls.set(node.id, row);
		row.dataset.id = node.id;
		row.draggable = Boolean(opts.onDragStart);
		row.style.top = `${top}px`;
		row.style.height = `${this.rowHeight}px`;
		row.style.width = `${this.surfaceWidth(layout)}px`;
		row.style.setProperty('--depth', String(node.depth));
		bindLongPressGesture(
			row,
			this.recursiveExpandGesture,
			node.children?.length && opts.onRecursiveExpand
				? () => opts.onRecursiveExpand?.(node.id)
				: undefined,
		);
		row.onclick = (event) => {
			if (this.recursiveExpandGesture.isActivationSuppressed()) {
				event.preventDefault();
				event.stopPropagation();
				return;
			}
			opts.onRowClick(node.id, event);
		};
		row.ondragstart = (event) => {
			this.recursiveExpandGesture.cancel();
			row.addClass('is-being-dragged');
			opts.onDragStart?.(node.id, event);
		};
		row.ondragend = () => row.removeClass('is-being-dragged');
		row.ondragover = (event) =>
			this._handleRowDragOver(row, node.id, event, opts);
		row.ondragenter = (event) =>
			this._handleRowDragOver(row, node.id, event, opts);
		row.ondragleave = () => row.removeClass('is-being-dragged-over');
		row.ondrop = (event) => {
			row.removeClass('is-being-dragged-over');
			opts.onDrop?.(node.id, event);
		};
		row.onkeydown = (event) => {
			if (event.key !== 'Enter' && event.key !== ' ') return;
			event.preventDefault();
			opts.onRowClick(node.id, event);
		};
		row.oncontextmenu = (event) => {
			event.preventDefault();
			event.stopPropagation();
			if (
				this.recursiveExpandGesture.isTrackingPointer() ||
				this.recursiveExpandGesture.isActivationSuppressed()
			) {
				return;
			}
			opts.onContextMenu(node.id, event);
		};
		const isHighlighted = opts.searchHighlightIds?.has(node.id) ?? false;
		const isSelected = opts.selectedIds?.has(node.id) ?? false;
		const highlight = this.resolveRowHighlight(node.id, opts);
		if (row.dataset.renderSignature === signature) {
			row.toggleClass('vaultman-search-highlight', isHighlighted);
			row.toggleClass('is-selected', isSelected);
			const checkbox = row.querySelector<HTMLInputElement>(
				'.vaultman-selection-checkbox',
			);
			if (checkbox) checkbox.checked = isSelected;
			return;
		}
		row.empty();
		row.className = 'bases-tr vaultman-node-table-row';
		row.dataset.renderSignature = signature;
		if (typeof node.cls === 'string' && node.cls.trim()) {
			for (const className of node.cls.trim().split(/\s+/)) {
				row.addClass(className);
			}
		}
		row.toggleClass(
			'is-active-filter',
			highlight.inclusive,
		);
		row.toggleClass(
			'is-excluded-filter',
			highlight.exclusive,
		);
		row.toggleClass('is-explorer-hover-highlight', highlight.hover);
		row.toggleClass('is-deletion-highlight', highlight.deletion);
		// BT5-038: a collapsed parent hiding an active filter is flagged with a
		// dot class, not the filter decoration.
		row.toggleClass(
			'vaultman-node-table-filter-dot',
			this._filterBubbleIds.has(node.id) ||
				this._excludedFilterBubbleIds.has(node.id),
		);
		row.toggleClass(
			'vaultman-node-table-filter-dot--excluded',
			this._excludedFilterBubbleIds.has(node.id),
		);
		row.toggleClass(
			'vaultman-badge-warning',
			opts.warningIds?.has(node.id) ?? false,
		);
		row.toggleClass('vaultman-search-highlight', isHighlighted);
		row.toggleClass('is-selected', isSelected);

		for (const column of layout.columns) {
			this._renderCell(row, node, column, opts);
		}
		if (opts.onSelectionToggle && opts.selectionCheckboxPosition !== 'hidden') {
			const checkbox = row.createEl('input', {
				type: 'checkbox',
				cls: `metadata-input-checkbox vaultman-selection-checkbox vaultman-selection-checkbox--${opts.selectionCheckboxPosition ?? 'start'}`,
				attr: { 'aria-label': `Select ${node.label}` },
			});
			checkbox.checked = isSelected;
			checkbox.onclick = (event) => event.stopPropagation();
			checkbox.onchange = (event) => {
				event.stopPropagation();
				opts.onSelectionToggle?.(node.id, checkbox.checked);
			};
		}
	}

	private _renderCell(
		row: HTMLElement,
		node: TreeNode<TMeta>,
		column: NodeTableColumn,
		opts: NodeTableViewOptions<TMeta>,
	): void {
		const cell = row.createDiv({
			cls: `bases-td vaultman-node-table-col-${column.id}`,
		});
		this._positionCell(cell, column);
		if (column.id === 'icon') {
			this._renderIconCell(cell, node, opts);
			return;
		}
		if (column.id === 'text') {
			if (opts.renderLabel?.(cell, node)) return;
			const label = cell.createSpan({
				cls: 'bases-table-cell bases-rendered-value vaultman-node-table-label',
				text: node.label,
			});
			if (node.labelColor) label.style.color = node.labelColor;
			return;
		}
		if (column.id === 'type') {
			cell.createSpan({
				cls: 'bases-table-cell bases-rendered-value vaultman-node-table-type nav-file-tag',
				text: node.typeText ?? '',
			});
			return;
		}
		this._renderCountCell(cell, node, opts);
	}

	private _renderIconCell(
		cell: HTMLElement,
		node: TreeNode<TMeta>,
		opts: NodeTableViewOptions<TMeta>,
	): void {
		const hasChildren = (node.children?.length ?? 0) > 0;
		const showCaret = hasChildren || Boolean(node.showCaret);
		const isExpanded = opts.expandedIds.has(node.id);
		const toggle = cell.createSpan({ cls: 'vaultman-node-table-toggle' });
		if (showCaret) {
			setIcon(
				toggle,
				hasChildren && isExpanded
					? 'lucide-chevron-down'
					: 'lucide-chevron-right',
			);
			if (hasChildren) {
				toggle.addEventListener('click', (event) => {
					event.stopPropagation();
					if (this.recursiveExpandGesture.isActivationSuppressed()) {
						event.preventDefault();
						return;
					}
					opts.onToggle(node.id);
				});
			} else {
				toggle.addClass('vaultman-node-table-toggle--empty');
			}
		}
		if (node.icon) {
			const iconEl = cell.createSpan({ cls: 'vaultman-node-table-icon' });
			renderIconValue(iconEl, node.icon, node.iconColor);
		}
	}

	private _renderCountCell(
		cell: HTMLElement,
		node: TreeNode<TMeta>,
		opts: NodeTableViewOptions<TMeta>,
	): void {
		const zone = cell.createDiv({ cls: 'vaultman-node-table-badge-zone' });
		for (const dot of this.resolveRowStatusDots(node.id)) {
			const dotEl = zone.createSpan({
				cls: `vaultman-tree-bubble-dot vaultman-tree-bubble-dot--${dot.tone}`,
			});
			const description = opts.statusDotLabel?.(dot);
			if (description) {
				dotEl.setAttribute('role', 'img');
				dotEl.setAttribute('aria-label', description);
				dotEl.setAttribute('title', description);
			}
		}
		for (const badge of node.badges ?? []) {
			const badgeEl = zone.createSpan({ cls: 'vaultman-badge' });
			if (badge.solid && badge.color)
				badgeEl.addClass(`vaultman-badge--${badge.color}`);
			if (badge.solid) badgeEl.addClass('is-solid');
			if (badge.isInherited) badgeEl.addClass('is-inherited');
			if (badge.icon) {
				const iconEl = badgeEl.createSpan({ cls: 'vaultman-badge-icon' });
				setIcon(iconEl, badge.icon);
			}
			const badgeHint = badge.tooltip ?? badge.text;
			if (badgeHint) badgeEl.setAttribute('title', badgeHint);
			if (badge.queueIndex !== undefined && opts.onBadgeDoubleClick) {
				const cancelMode = normalizeBadgeCancelClickMode(
					opts.badgeCancelClickMode,
				);
				badgeEl.addClass('is-undoable');
				attachBadgeCancelInteraction(badgeEl, cancelMode, () => {
					opts.onBadgeDoubleClick?.(badge.queueIndex!);
				});
			}
		}
		if (node.count != null && node.count > 0) {
			zone.createSpan({
				cls: 'vaultman-tree-count',
				text: String(node.count),
			});
		}
	}

	private _handleRowDragOver(
		row: HTMLElement,
		id: string,
		event: DragEvent,
		opts: NodeTableViewOptions<TMeta>,
	): void {
		opts.onDragOver?.(id, event);
		row.toggleClass('is-being-dragged-over', event.defaultPrevented);
	}
}
