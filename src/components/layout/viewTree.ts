// src/components/UnifiedTreeView.ts
import { setIcon } from 'obsidian';
import type { TreeNode } from '../../types/typeTree';
import { vaultmanPerfMonitor } from '../../utils/performanceMonitor';
import {
	buildVirtualTreeWindow,
	flattenVisibleTree,
} from '../../utils/treeVirtualization';

export interface TreeViewOptions {
	nodes: TreeNode[];
	expandedIds: Set<string>;
	onToggle: (id: string) => void;
	onRowClick: (id: string) => void;
	onContextMenu: (id: string, e: MouseEvent) => void;
	activeFilterIds?: Set<string>;
	searchHighlightIds?: Set<string>;
	warningIds?: Set<string>;
	editingId?: string | null;
	onRename?: (id: string, newLabel: string) => void;
	onCancelRename?: () => void;
	onBadgeDoubleClick?: (queueIndex: number) => void;
	visibleCells?: Set<string>;
}

export class UnifiedTreeView {
	private containerEl: HTMLElement;
	private rowEls = new Map<string, HTMLElement>();
	private _pendingRaf: number | null = null;
	private _pendingScrollTimer: number | null = null;
	private _opts: TreeViewOptions | null = null;
	private readonly _ownerId = `vaultman-tree-${Math.random()
		.toString(36)
		.slice(2)}`;
	private _pendingScroll: { id: string; block: ScrollLogicalPosition } | null =
		null;
	private _spacerEl: HTMLElement | null = null;
	private _contentEl: HTMLElement | null = null;
	private _rows: TreeNode[] = [];
	private _indexById = new Map<string, number>();
	private readonly _rowHeight = 27;
	private readonly _overscan = 24;
	private readonly _onScroll = () => this._scheduleWindowRender();

	constructor(containerEl: HTMLElement) {
		this.containerEl = containerEl;
	}

	render(opts: TreeViewOptions): void {
		this._opts = opts;
		this.containerEl.dataset.vaultmanTreeOwner = this._ownerId;
		if (this._pendingRaf !== null) {
			cancelAnimationFrame(this._pendingRaf);
			this._pendingRaf = null;
		}
		if (this._pendingScrollTimer !== null) {
			window.clearTimeout(this._pendingScrollTimer);
			this._pendingScrollTimer = null;
		}

		const scrollTop = this.containerEl.scrollTop;
		const modelStarted = performance.now();
		this._rows = flattenVisibleTree(opts.nodes, opts.expandedIds);
		this._indexById = this._buildIndex(this._rows);
		this._ensureScaffold();
		if (this._spacerEl) {
			this._spacerEl.style.height = `${this._rows.length * this._rowHeight}px`;
		}
		this.containerEl.scrollTop = Math.min(
			scrollTop,
			Math.max(
				0,
				this._rows.length * this._rowHeight - this.containerEl.clientHeight,
			),
		);
		vaultmanPerfMonitor.record('tree.model', performance.now() - modelStarted, {
			rows: this._rows.length,
		});

		const renderStarted = performance.now();
		this._renderWindow();
		this._flushPendingScroll();
		vaultmanPerfMonitor.record(
			'tree.render',
			performance.now() - renderStarted,
			{
				rows: this._rows.length,
				visibleRows: this.rowEls.size,
			},
		);
		vaultmanPerfMonitor.recordAction('tree', 'render', {
			rows: this._rows.length,
			visibleRows: this.rowEls.size,
		});
	}

	destroy(): void {
		if (this._pendingRaf !== null) {
			cancelAnimationFrame(this._pendingRaf);
			this._pendingRaf = null;
		}
		if (this._pendingScrollTimer !== null) {
			window.clearTimeout(this._pendingScrollTimer);
			this._pendingScrollTimer = null;
		}
		if (this.containerEl.dataset.vaultmanTreeOwner === this._ownerId) {
			delete this.containerEl.dataset.vaultmanTreeOwner;
		}
		this.containerEl.removeEventListener('scroll', this._onScroll);
		this.containerEl.removeClass('vaultman-tree-virtual-viewport');
		this._spacerEl?.remove();
		this._spacerEl = null;
		this._contentEl = null;
		this._rows = [];
		this._indexById.clear();
		this.rowEls.clear();
		this._pendingScroll = null;
	}

	/** Toggle visibility of rows matching/not matching filtered IDs — no DOM rebuild */
	updateVisibility(visibleIds: Set<string>): void {
		for (const [id, el] of this.rowEls) {
			el.toggleClass('is-hidden', !visibleIds.has(id));
		}
	}

	scrollToId(id: string, block: ScrollLogicalPosition = 'center'): void {
		const row = this.rowEls.get(id);
		if (row) {
			row.scrollIntoView({ block, inline: 'nearest' });
			return;
		}
		const index = this._indexById.get(id);
		if (index !== undefined) {
			this.containerEl.scrollTop = this._scrollTopForIndex(index, block);
			this._scheduleWindowRender();
			this._pendingScroll = null;
			vaultmanPerfMonitor.recordAction('tree', 'scrollToId', { id, index });
			return;
		}
		this._pendingScroll = { id, block };
	}

	private _buildIndex(rows: TreeNode[]): Map<string, number> {
		const indexById = new Map<string, number>();
		rows.forEach((row, index) => {
			if (!indexById.has(row.id)) indexById.set(row.id, index);
		});
		return indexById;
	}

	private _ensureScaffold(): void {
		if (this._spacerEl && this.containerEl.contains(this._spacerEl)) return;
		this.containerEl.removeEventListener('scroll', this._onScroll);
		this.containerEl.empty();
		this.rowEls.clear();
		this.containerEl.addClass('vaultman-tree-virtual-viewport');
		this._spacerEl = this.containerEl.createDiv({
			cls: 'vaultman-tree-virtual-spacer',
		});
		this._contentEl = this._spacerEl.createDiv({
			cls: 'vaultman-tree-virtual-content',
		});
		this.containerEl.addEventListener('scroll', this._onScroll, {
			passive: true,
		});
	}

	private _scheduleWindowRender(): void {
		if (this._pendingRaf !== null || this._pendingScrollTimer !== null) return;
		const run = () => {
			if (this._pendingRaf !== null) {
				window.cancelAnimationFrame(this._pendingRaf);
			}
			if (this._pendingScrollTimer !== null) {
				window.clearTimeout(this._pendingScrollTimer);
			}
			this._pendingRaf = null;
			this._pendingScrollTimer = null;
			this._renderWindow();
		};
		this._pendingRaf = window.requestAnimationFrame(run);
		this._pendingScrollTimer = window.setTimeout(run, 32);
	}

	private _renderWindow(): void {
		if (!this._opts || !this._contentEl) return;
		const started = performance.now();
		const projection = buildVirtualTreeWindow({
			rows: this._rows,
			scrollTop: this.containerEl.scrollTop,
			viewportHeight: this.containerEl.clientHeight,
			rowHeight: this._rowHeight,
			overscan: this._overscan,
		});
		this._contentEl.empty();
		this.rowEls.clear();
		for (const row of projection.visibleRows) {
			const rowEl = this._renderRow(row.node, this._contentEl, this._opts);
			rowEl.addClass('vaultman-tree-row--virtual');
			rowEl.style.top = `${row.top}px`;
		}
		this._focusEditingRow(this._opts);
		vaultmanPerfMonitor.record('tree.window', performance.now() - started, {
			rows: this._rows.length,
			visibleRows: projection.visibleRows.length,
			start: projection.startIndex,
			end: projection.endIndex,
		});
	}

	private _scrollTopForIndex(
		index: number,
		block: ScrollLogicalPosition,
	): number {
		const rowTop = index * this._rowHeight;
		const rowBottom = rowTop + this._rowHeight;
		const viewportHeight = this.containerEl.clientHeight;
		const currentTop = this.containerEl.scrollTop;
		const currentBottom = currentTop + viewportHeight;
		let target = currentTop;
		if (block === 'start') {
			target = rowTop;
		} else if (block === 'end') {
			target = rowBottom - viewportHeight;
		} else if (block === 'nearest') {
			if (rowTop < currentTop) target = rowTop;
			else if (rowBottom > currentBottom) target = rowBottom - viewportHeight;
		} else {
			target = rowTop - viewportHeight / 2 + this._rowHeight / 2;
		}
		const maxScroll = Math.max(
			0,
			this._rows.length * this._rowHeight - viewportHeight,
		);
		return Math.max(0, Math.min(maxScroll, target));
	}

	private _focusEditingRow(opts: TreeViewOptions): void {
		if (!opts.editingId) return;
		const row = this.rowEls.get(opts.editingId);
		const input = row?.querySelector('input');
		if (input instanceof HTMLInputElement) {
			input.focus();
			input.select();
		}
	}

	private _flushPendingScroll(): void {
		if (!this._pendingScroll) return;
		const { id, block } = this._pendingScroll;
		const row = this.rowEls.get(id);
		if (!row) return;
		row.scrollIntoView({
			block,
			inline: 'nearest',
		});
		this._pendingScroll = null;
	}

	private _renderRow(
		node: TreeNode,
		parent: HTMLElement,
		opts: TreeViewOptions,
	): HTMLElement {
		const hasChildren = (node.children?.length ?? 0) > 0;
		const isExpanded = opts.expandedIds.has(node.id);
		const isActive = opts.activeFilterIds?.has(node.id) ?? false;
		const isWarning = opts.warningIds?.has(node.id) ?? false;
		const isEditing = opts.editingId === node.id;
		const visibleCells = opts.visibleCells;
		const showIcon = visibleCells ? visibleCells.has('icon') : true;
		const showLabel = visibleCells
			? visibleCells.has('text') || visibleCells.has('name')
			: true;
		const showCount = visibleCells ? visibleCells.has('count') : true;

		const row = parent.createDiv({ cls: 'vaultman-tree-row' });
		if (typeof node.cls === 'string' && node.cls.trim()) {
			for (const c of node.cls.trim().split(/\s+/)) row.addClass(c);
		}
		row.dataset.id = node.id;
		row.style.setProperty('--depth', String(node.depth));
		if (isActive) row.addClass('is-active-filter');
		if (isWarning) row.addClass('vaultman-badge-warning');
		if (opts.searchHighlightIds?.has(node.id))
			row.addClass('vaultman-search-highlight');
		if (isEditing) row.addClass('is-editing');

		this.rowEls.set(node.id, row);

		// Chevron / spacer
		const toggleSpan = row.createSpan({ cls: 'vaultman-tree-toggle' });
		if (hasChildren) {
			setIcon(
				toggleSpan,
				isExpanded ? 'lucide-chevron-down' : 'lucide-chevron-right',
			);
			toggleSpan.addEventListener('click', (e) => {
				e.stopPropagation();
				opts.onToggle(node.id);
			});
		}

		// Icon
		if (node.icon && showIcon) {
			const iconSpan = row.createSpan({ cls: 'vaultman-tree-icon' });
			setIcon(iconSpan, node.icon);
		}

		// Label / Input
		if (isEditing && showLabel) {
			const input = row.createEl('input', {
				cls: 'vaultman-tree-input',
				value: node.label,
			});
			input.addEventListener('click', (e) => e.stopPropagation());
			input.addEventListener('keydown', (e) => {
				if (e.key === 'Enter') {
					opts.onRename?.(node.id, input.value);
				} else if (e.key === 'Escape') {
					opts.onCancelRename?.();
				}
			});
			input.addEventListener('blur', () => {
				// Prevent blur from firing if we are already re-rendering
				if (this._opts?.editingId === node.id) {
					opts.onCancelRename?.();
				}
			});
		} else if (showLabel) {
			row.createSpan({ cls: 'vaultman-tree-label', text: node.label });
		}

		// Multi-zone Badges container
		if (
			(showCount && node.count != null && node.count > 0) ||
			(node.badges && node.badges.length > 0)
		) {
			const badgeZone = row.createDiv({ cls: 'vaultman-tree-badge-zone' });

			// Priority: Operations/Conflicts badges first
			if (node.badges) {
				for (const badge of node.badges) {
					const bEl = badgeZone.createSpan({ cls: 'vaultman-badge' });
					// Only apply color class for solid/inherited badges; default is --text-normal
					if (badge.solid && badge.color)
						bEl.addClass(`vaultman-badge--${badge.color}`);
					if (badge.solid) bEl.addClass('is-solid');
					if (badge.isInherited) bEl.addClass('is-inherited');
					if (badge.icon) {
						const iEl = bEl.createSpan({ cls: 'vaultman-badge-icon' });
						setIcon(iEl, badge.icon);
					}
					if (badge.text) {
						bEl.setAttribute('title', badge.text);
						if (!badge.icon) bEl.setText(badge.text);
					}
					// Double-click to undo this specific queue operation
					if (badge.queueIndex !== undefined && opts.onBadgeDoubleClick) {
						bEl.addClass('is-undoable');
						bEl.setAttribute(
							'title',
							`${badge.text ?? ''} — double-click to undo`,
						);
						bEl.addEventListener('dblclick', (e) => {
							e.stopPropagation();
							opts.onBadgeDoubleClick!(badge.queueIndex!);
						});
					}
				}
			}

			// Frequency counter second
			if (showCount && node.count != null && node.count > 0) {
				badgeZone.createSpan({
					cls: 'vaultman-tree-count',
					text: String(node.count),
				});
			}
		}

		// Click + context menu
		row.addEventListener('click', () => opts.onRowClick(node.id));
		row.addEventListener('contextmenu', (e) => {
			e.preventDefault();
			e.stopPropagation();
			opts.onContextMenu(node.id, e);
		});
		return row;
	}
}
