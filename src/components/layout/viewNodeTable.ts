import { setIcon } from 'obsidian';
import { translate } from '../../i18n/index';
import {
	resolveNodeTableLayout,
	type NodeTableColumn,
	type NodeTableLayout,
	type NodeTableSurface,
} from '../../logic/logicNodeTableLayout';
import type { TreeNode } from '../../types/typeTree';
import { buildVirtualTableWindow } from '../../utils/tableVirtualization';
import { flattenVisibleTree } from '../../utils/treeVirtualization';

export interface NodeTableViewOptions<TMeta = unknown> {
	surface: NodeTableSurface;
	nodes: TreeNode<TMeta>[];
	expandedIds: Set<string>;
	visibleCells: Set<string>;
	activeFilterIds?: Set<string>;
	searchHighlightIds?: Set<string>;
	warningIds?: Set<string>;
	onToggle: (id: string) => void;
	onRowClick: (id: string) => void;
	onContextMenu: (id: string, event: MouseEvent) => void;
	onBadgeDoubleClick?: (queueIndex: number) => void;
}

export class NodeTableView<TMeta = unknown> {
	private containerEl: HTMLElement;
	private headerEl: HTMLElement | null = null;
	private listEl: HTMLElement | null = null;
	private tableEl: HTMLElement | null = null;
	private tbodyEl: HTMLElement | null = null;
	private opts: NodeTableViewOptions<TMeta> | null = null;
	private rows: TreeNode<TMeta>[] = [];
	private readonly rowHeight = 30;
	private readonly overscan = 12;
	private readonly onScroll = () => {
		this._syncHeaderScroll();
		this._renderWindow();
	};

	constructor(containerEl: HTMLElement) {
		this.containerEl = containerEl;
	}

	render(opts: NodeTableViewOptions<TMeta>): void {
		this.opts = opts;
		this.rows = flattenVisibleTree(
			opts.nodes as TreeNode[],
			opts.expandedIds,
		) as TreeNode<TMeta>[];
		this._ensureScaffold();
		const layout = resolveNodeTableLayout(opts.surface, opts.visibleCells);
		this._renderHeader(layout);
		this._applyDimensions(layout);
		this._renderWindow();
	}

	destroy(): void {
		this.listEl?.removeEventListener('scroll', this.onScroll);
		this.containerEl.removeClass('vaultman-node-table-root');
		this.headerEl = null;
		this.listEl = null;
		this.tableEl = null;
		this.tbodyEl = null;
		this.opts = null;
		this.rows = [];
	}

	private _ensureScaffold(): void {
		if (this.listEl && this.tbodyEl && this.containerEl.contains(this.listEl))
			return;

		this.containerEl.empty();
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
		this.headerEl.style.width = `${layout.totalWidth}px`;
		const row = this.headerEl.createDiv({
			cls: 'bases-tr vaultman-node-table-header-row',
		});
		row.style.width = `${layout.totalWidth}px`;
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
			header.createDiv({ cls: 'bases-table-header-resizer' });
		}
		this._syncHeaderScroll();
	}

	private _applyDimensions(layout: NodeTableLayout): void {
		const width = `${layout.totalWidth}px`;
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

	private _positionCell(cell: HTMLElement, column: NodeTableColumn): void {
		cell.style.insetInlineStart = `${column.left}px`;
		cell.style.width = `${column.width}px`;
	}

	private _renderWindow(): void {
		if (!this.opts || !this.listEl || !this.tbodyEl) return;
		const projection = buildVirtualTableWindow({
			rows: this.rows,
			scrollTop: this.listEl.scrollTop,
			viewportHeight: this.listEl.clientHeight,
			rowHeight: this.rowHeight,
			overscan: this.overscan,
		});
		const layout = resolveNodeTableLayout(
			this.opts.surface,
			this.opts.visibleCells,
		);
		this._applyDimensions(layout);
		this.tbodyEl.empty();
		for (const row of projection.visibleRows) {
			this._renderRow(row.row, row.top, layout, this.opts);
		}
	}

	private _renderRow(
		node: TreeNode<TMeta>,
		top: number,
		layout: NodeTableLayout,
		opts: NodeTableViewOptions<TMeta>,
	): void {
		if (!this.tbodyEl) return;
		const row = this.tbodyEl.createDiv({
			cls: 'bases-tr vaultman-node-table-row',
		});
		if (typeof node.cls === 'string' && node.cls.trim()) {
			for (const className of node.cls.trim().split(/\s+/)) {
				row.addClass(className);
			}
		}
		row.dataset.id = node.id;
		row.style.top = `${top}px`;
		row.style.height = `${this.rowHeight}px`;
		row.style.width = `${layout.totalWidth}px`;
		row.style.setProperty('--depth', String(node.depth));
		row.toggleClass(
			'is-active-filter',
			opts.activeFilterIds?.has(node.id) ?? false,
		);
		row.toggleClass(
			'vaultman-badge-warning',
			opts.warningIds?.has(node.id) ?? false,
		);
		row.toggleClass(
			'vaultman-search-highlight',
			opts.searchHighlightIds?.has(node.id) ?? false,
		);

		for (const column of layout.columns) {
			this._renderCell(row, node, column, opts);
		}

		row.addEventListener('click', () => opts.onRowClick(node.id));
		row.addEventListener('keydown', (event) => {
			if (event.key !== 'Enter' && event.key !== ' ') return;
			event.preventDefault();
			opts.onRowClick(node.id);
		});
		row.addEventListener('contextmenu', (event) => {
			event.preventDefault();
			event.stopPropagation();
			opts.onContextMenu(node.id, event);
		});
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
			cell.createSpan({
				cls: 'bases-table-cell bases-rendered-value vaultman-node-table-label',
				text: node.label,
			});
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
					opts.onToggle(node.id);
				});
			} else {
				toggle.addClass('vaultman-node-table-toggle--empty');
			}
		}
		if (node.icon) {
			const iconEl = cell.createSpan({ cls: 'vaultman-node-table-icon' });
			setIcon(iconEl, node.icon);
		}
	}

	private _renderCountCell(
		cell: HTMLElement,
		node: TreeNode<TMeta>,
		opts: NodeTableViewOptions<TMeta>,
	): void {
		const zone = cell.createDiv({ cls: 'vaultman-node-table-badge-zone' });
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
			if (badge.text) badgeEl.setAttribute('title', badge.text);
			if (badge.queueIndex !== undefined && opts.onBadgeDoubleClick) {
				badgeEl.addClass('is-undoable');
				badgeEl.addEventListener('dblclick', (event) => {
					event.stopPropagation();
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
}
