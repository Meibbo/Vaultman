// src/components/UnifiedTreeView.ts
import { Platform, setIcon, setTooltip } from 'obsidian';
import type { TreeNode, TreeNodeCell } from '../../types/typeTree';
import { resolvePresentedActiveFilterIds } from '../../logic/logicActiveFilterBubbling';
import {
	explorerDensityProfile,
	usesMobileExplorerDensity,
} from '../../logic/logicResponsiveLayout';
import { vaultmanPerfMonitor } from '../../utils/performanceMonitor';
import {
	buildVirtualTreeWindow,
	flattenVisibleTree,
} from '../../utils/treeVirtualization';
import {
	attachBadgeCancelInteraction,
	badgeCancelInteractionLabel,
	normalizeBadgeCancelClickMode,
	type BadgeCancelClickMode,
} from '../../utils/badgeInteraction';
import {
	bindLongPressGesture,
	LongPressGesture,
} from '../../utils/longPressGesture';
import { renderIconValue } from '../../utils/renderIconValue';

export interface TreeViewOptions {
	nodes: TreeNode[];
	expandedIds: Set<string>;
	onToggle: (id: string) => void;
	onRecursiveExpand?: (id: string) => void;
	onRowClick: (id: string, event?: MouseEvent) => void;
	onRowDoubleClick?: (id: string, event: MouseEvent) => void;
	onCellClick?: (id: string, cellId: string, event: MouseEvent) => void;
	onRowHover?: (id: string, row: HTMLElement) => void;
	onContextMenu: (id: string, e: MouseEvent) => void;
	activeFilterIds?: Set<string>;
	selectedIds?: Set<string>;
	searchHighlightIds?: Set<string>;
	warningIds?: Set<string>;
	editingId?: string | null;
	onRename?: (id: string, newLabel: string) => void;
	onCancelRename?: () => void;
	onBadgeDoubleClick?: (queueIndex: number) => void;
	badgeCancelClickMode?: BadgeCancelClickMode;
	onDragStart?: (id: string, event: DragEvent) => void;
	onDragOver?: (id: string, event: DragEvent) => void;
	onDrop?: (id: string, event: DragEvent) => void;
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
	private readonly _markupVersion = 2;
	private _structureAnimationTimer: number | null = null;
	private _expandedIdsSignature = '';
	private _hasRenderedExpandedState = false;
	private _pendingScroll: {
		id: string;
		block: ScrollLogicalPosition;
		behavior: ScrollBehavior;
	} | null = null;
	private _spacerEl: HTMLElement | null = null;
	private _contentEl: HTMLElement | null = null;
	private _rows: TreeNode[] = [];
	private _indexById = new Map<string, number>();
	private readonly _overscan = 24;
	private readonly _recursiveExpandGesture = new LongPressGesture();
	private readonly _onScroll = () => {
		if (this._hasVisibleRenderedRows()) {
			this._scheduleWindowRender();
			return;
		}
		this._cancelWindowRender();
		this._renderWindow();
	};

	constructor(containerEl: HTMLElement) {
		this.containerEl = containerEl;
	}

	render(opts: TreeViewOptions): void {
		this._recursiveExpandGesture.cancel();
		if (opts.activeFilterIds) {
			const presentedActiveFilterIds = resolvePresentedActiveFilterIds(
				opts.nodes,
				opts.expandedIds,
				opts.activeFilterIds,
			);
			if (presentedActiveFilterIds !== opts.activeFilterIds) {
				opts = { ...opts, activeFilterIds: presentedActiveFilterIds };
			}
		}
		this._opts = opts;
		this.containerEl.dataset.vaultmanTreeOwner = this._ownerId;
		this.containerEl.toggleClass(
			'vaultman-tree-nested-guides',
			opts.visibleCells?.has('nested') ?? true,
		);
		this._markStructureAnimationIfNeeded(opts.expandedIds);
		if (this._pendingRaf !== null) {
			cancelAnimationFrame(this._pendingRaf);
			this._pendingRaf = null;
		}
		if (this._pendingScrollTimer !== null) {
			window.clearTimeout(this._pendingScrollTimer);
			this._pendingScrollTimer = null;
		}

		const scrollTop = this.containerEl.scrollTop;
		const rowHeight = this.rowHeight();
		const modelStarted = performance.now();
		this._rows = flattenVisibleTree(opts.nodes, opts.expandedIds);
		this._indexById = this._buildIndex(this._rows);
		this._ensureScaffold();
		if (this._spacerEl) {
			this._spacerEl.style.height = `${this._rows.length * rowHeight}px`;
		}
		this.containerEl.scrollTop = Math.min(
			scrollTop,
			Math.max(
				0,
				this._rows.length * rowHeight - this.containerEl.clientHeight,
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
		this._recursiveExpandGesture.cancel();
		if (this._pendingRaf !== null) {
			cancelAnimationFrame(this._pendingRaf);
			this._pendingRaf = null;
		}
		if (this._pendingScrollTimer !== null) {
			window.clearTimeout(this._pendingScrollTimer);
			this._pendingScrollTimer = null;
		}
		if (this._structureAnimationTimer !== null) {
			this._treeWindow().clearTimeout(this._structureAnimationTimer);
			this._structureAnimationTimer = null;
		}
		if (this.containerEl.dataset.vaultmanTreeOwner === this._ownerId) {
			delete this.containerEl.dataset.vaultmanTreeOwner;
		}
		this.containerEl.removeEventListener('scroll', this._onScroll);
		this.containerEl.removeClass('vaultman-tree-virtual-viewport');
		this.containerEl.removeClass('vaultman-tree-nested-guides');
		this.containerEl.removeClass('vaultman-tree-structure-animating');
		this._spacerEl?.remove();
		this._spacerEl = null;
		this._contentEl = null;
		this._rows = [];
		this._indexById.clear();
		this.rowEls.clear();
		this._pendingScroll = null;
		this._expandedIdsSignature = '';
		this._hasRenderedExpandedState = false;
	}

	/** Toggle visibility of rows matching/not matching filtered IDs — no DOM rebuild */
	updateVisibility(visibleIds: Set<string>): void {
		for (const [id, el] of this.rowEls) {
			el.toggleClass('is-hidden', !visibleIds.has(id));
		}
	}

	scrollToId(
		id: string,
		block: ScrollLogicalPosition = 'center',
		behavior: ScrollBehavior = 'auto',
	): void {
		const row = this.rowEls.get(id);
		if (row) {
			row.scrollIntoView({ block, inline: 'nearest', behavior });
			return;
		}
		const index = this._indexById.get(id);
		if (index !== undefined) {
			this.containerEl.scrollTo({
				top: this._scrollTopForIndex(index, block),
				behavior,
			});
			this._scheduleWindowRender();
			this._pendingScroll = null;
			vaultmanPerfMonitor.recordAction('tree', 'scrollToId', { id, index });
			return;
		}
		this._pendingScroll = { id, block, behavior };
	}

	private _buildIndex(rows: TreeNode[]): Map<string, number> {
		const indexById = new Map<string, number>();
		rows.forEach((row, index) => {
			if (!indexById.has(row.id)) indexById.set(row.id, index);
		});
		return indexById;
	}

	private _markStructureAnimationIfNeeded(expandedIds: Set<string>): void {
		const nextSignature = this._expandedIdsSignatureFor(expandedIds);
		if (
			this._hasRenderedExpandedState &&
			nextSignature !== this._expandedIdsSignature
		) {
			this._startStructureAnimation();
		}
		this._expandedIdsSignature = nextSignature;
		this._hasRenderedExpandedState = true;
	}

	private _expandedIdsSignatureFor(expandedIds: Set<string>): string {
		return [...expandedIds].sort().join('\u001f');
	}

	private _startStructureAnimation(): void {
		this.containerEl.addClass('vaultman-tree-structure-animating');
		const treeWindow = this._treeWindow();
		if (this._structureAnimationTimer !== null) {
			treeWindow.clearTimeout(this._structureAnimationTimer);
		}
		this._structureAnimationTimer = treeWindow.setTimeout(() => {
			this.containerEl.removeClass('vaultman-tree-structure-animating');
			this._structureAnimationTimer = null;
		}, 140);
	}

	private _treeWindow(): Window {
		return this.containerEl.ownerDocument?.defaultView ?? window;
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
			this._cancelWindowRender();
			this._renderWindow();
		};
		this._pendingRaf = window.requestAnimationFrame(run);
		this._pendingScrollTimer = window.setTimeout(run, 32);
	}

	private _cancelWindowRender(): void {
		if (this._pendingRaf !== null) {
			window.cancelAnimationFrame(this._pendingRaf);
		}
		if (this._pendingScrollTimer !== null) {
			window.clearTimeout(this._pendingScrollTimer);
		}
		this._pendingRaf = null;
		this._pendingScrollTimer = null;
	}

	private _hasVisibleRenderedRows(): boolean {
		if (this.rowEls.size === 0) return false;
		const viewport = this.containerEl.getBoundingClientRect();
		for (const row of this.rowEls.values()) {
			const rect = row.getBoundingClientRect();
			if (rect.bottom > viewport.top + 1 && rect.top < viewport.bottom - 1) {
				return true;
			}
		}
		return false;
	}

	private _renderWindow(): void {
		if (!this._opts || !this._contentEl) return;
		const started = performance.now();
		const projection = buildVirtualTreeWindow({
			rows: this._rows,
			scrollTop: this.containerEl.scrollTop,
			viewportHeight: this.containerEl.clientHeight,
			rowHeight: this.rowHeight(),
			overscan: this._overscan,
		});
		const visibleIds = new Set(
			projection.visibleRows.map((row) => row.node.id),
		);
		this.removeStaleRows(visibleIds);
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

	private removeStaleRows(visibleIds: Set<string>): void {
		for (const [id, row] of this.rowEls) {
			if (visibleIds.has(id)) continue;
			row.remove();
			this.rowEls.delete(id);
		}
	}

	private rowSignature(node: TreeNode, opts: TreeViewOptions): string {
		const visibleCells = opts.visibleCells
			? Array.from(opts.visibleCells).sort().join(',')
			: 'default';
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
		const cells = (node.cells ?? [])
			.map((cell) =>
				cell.kind === 'toggle'
					? [
							cell.id,
							cell.kind,
							cell.enabled ? '1' : '0',
							cell.style,
							cell.label,
							cell.disabled ? '1' : '0',
						].join(':')
					: [
							cell.id,
							cell.kind,
							cell.icon,
							cell.label,
							cell.disabled ? '1' : '0',
							cell.appearance ?? 'button',
						].join(':'),
			)
			.join('|');
		return [
			`markup:${this._markupVersion}`,
			node.folderColor ?? '',
			node.id,
			node.label,
			node.depth,
			node.cls ?? '',
			node.icon ?? '',
			node.iconColor ?? '',
			node.typeText ?? '',
			node.mtimeText ?? '',
			node.ctimeText ?? '',
			node.wordCountText ?? '',
			node.coreCls ?? '',
			node.count ?? '',
			node.children?.length ?? 0,
			node.showCaret ? '1' : '0',
			opts.activeFilterIds?.has(node.id) ? '1' : '0',
			opts.warningIds?.has(node.id) ? '1' : '0',
			opts.editingId === node.id ? '1' : '0',
			visibleCells,
			badges,
			cells,
		].join('\u001f');
	}

	private rowTitle(node: TreeNode): string | null {
		const parts: string[] = [];
		if (node.mtimeText) parts.push(`Last modified: ${node.mtimeText}`);
		if (node.ctimeText) parts.push(`Created at: ${node.ctimeText}`);
		if (node.wordCountText) parts.push(`Words: ${node.wordCountText}`);
		return parts.length > 0 ? parts.join('\n') : null;
	}

	private applyRowTitle(row: HTMLElement, node: TreeNode): void {
		// Obsidian's native tooltip, not the browser `title` (which double-renders).
		row.removeAttribute('title');
		setTooltip(row, this.rowTitle(node) ?? '');
	}

	private nodeDataPath(node: TreeNode): string | null {
		const meta = node.meta as
			| {
					file?: { path?: string } | null;
					folderPath?: string | null;
			  }
			| null
			| undefined;
		return meta?.file?.path ?? meta?.folderPath ?? null;
	}

	private applyDataPath(row: HTMLElement, node: TreeNode): void {
		const path = this.nodeDataPath(node);
		if (path) row.dataset.path = path;
		else delete row.dataset.path;
	}

	private applyMutableRowState({
		row,
		hasChildren,
		showCaret,
		isExpanded,
		isHighlighted,
		isSelected,
	}: {
		row: HTMLElement;
		hasChildren: boolean;
		showCaret: boolean;
		isExpanded: boolean;
		isHighlighted: boolean;
		isSelected: boolean;
	}): void {
		row.toggleClass('mod-collapsible', showCaret);
		row.toggleClass('vaultman-search-highlight', isHighlighted);
		row.toggleClass('is-selected', isSelected);
		const toggleEl = row.querySelector<HTMLElement>('.collapse-icon');
		if (!toggleEl) return;
		toggleEl.toggleClass('is-collapsed', showCaret && !isExpanded);
		if (hasChildren) {
			toggleEl.setAttribute('aria-expanded', String(isExpanded));
			toggleEl.removeAttribute('aria-hidden');
		} else {
			toggleEl.removeAttribute('aria-expanded');
			toggleEl.setAttribute('aria-hidden', 'true');
		}
	}

	private rowHeight(): number {
		const body = activeDocument.body;
		const isMobile = usesMobileExplorerDensity(
			Platform.isMobile,
			body.classList,
		);
		return explorerDensityProfile(isMobile).treeRowHeight;
	}

	private applyCoreRowClasses(row: HTMLElement, node: TreeNode): void {
		if (!node.coreCls) return;
		for (const className of node.coreCls.trim().split(/\s+/)) {
			if (className) row.addClass(className);
		}
	}

	private _scrollTopForIndex(
		index: number,
		block: ScrollLogicalPosition,
	): number {
		const rowHeight = this.rowHeight();
		const rowTop = index * rowHeight;
		const rowBottom = rowTop + rowHeight;
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
			target = rowTop - viewportHeight / 2 + rowHeight / 2;
		}
		const maxScroll = Math.max(
			0,
			this._rows.length * rowHeight - viewportHeight,
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
		const { id, block, behavior } = this._pendingScroll;
		const row = this.rowEls.get(id);
		if (!row) return;
		row.scrollIntoView({
			block,
			inline: 'nearest',
			behavior,
		});
		this._pendingScroll = null;
	}

	private _renderRow(
		node: TreeNode,
		parent: HTMLElement,
		opts: TreeViewOptions,
	): HTMLElement {
		const hasChildren = (node.children?.length ?? 0) > 0;
		const showCaret = hasChildren || Boolean(node.showCaret);
		const isExpanded = opts.expandedIds.has(node.id);
		const isActive = opts.activeFilterIds?.has(node.id) ?? false;
		const isWarning = opts.warningIds?.has(node.id) ?? false;
		const isEditing = opts.editingId === node.id;
		const isHighlighted = opts.searchHighlightIds?.has(node.id) ?? false;
		const isSelected = opts.selectedIds?.has(node.id) ?? false;
		const visibleCells = opts.visibleCells;
		const showIcon = visibleCells ? visibleCells.has('icon') : true;
		const showLabel = visibleCells
			? visibleCells.has('text') || visibleCells.has('name')
			: true;
		const showCount = visibleCells ? visibleCells.has('count') : true;
		const showType = visibleCells
			? visibleCells.has('type') || visibleCells.has('ext')
			: false;
		const showMtime = visibleCells
			? visibleCells.has('mtime') || visibleCells.has('updated')
			: false;
		const showCtime = visibleCells
			? visibleCells.has('ctime') || visibleCells.has('installed')
			: false;
		const showWords = visibleCells ? visibleCells.has('words') : false;
		const showTasks = visibleCells ? visibleCells.has('tasks') : false;
		const nodeCells = (node.cells ?? []).filter(
			(cell) => !visibleCells || visibleCells.has(cell.id),
		);

		const row =
			this.rowEls.get(node.id) ??
			parent.createDiv({ cls: 'vaultman-tree-row' });
		parent.appendChild(row);
		row.dataset.id = node.id;
		this.applyDataPath(row, node);
		row.draggable = Boolean(opts.onDragStart);
		row.style.setProperty('--depth', String(node.depth));
		if (node.folderColor) {
			row.style.setProperty('--folder-color', node.folderColor);
		} else {
			row.style.removeProperty('--folder-color');
		}
		bindLongPressGesture(
			row,
			this._recursiveExpandGesture,
			hasChildren && opts.onRecursiveExpand
				? () => opts.onRecursiveExpand?.(node.id)
				: undefined,
		);
		row.onclick = (event) => {
			if (this._recursiveExpandGesture.isActivationSuppressed()) {
				event.preventDefault();
				event.stopPropagation();
				return;
			}
			opts.onRowClick(node.id, event);
		};
		row.ondblclick = opts.onRowDoubleClick
			? (event) => {
					if (this._recursiveExpandGesture.isActivationSuppressed()) {
						event.preventDefault();
						event.stopPropagation();
						return;
					}
					opts.onRowDoubleClick?.(node.id, event);
				}
			: null;
		row.onpointerenter = () => opts.onRowHover?.(node.id, row);
		row.onauxclick = (event) => {
			if (event.button !== 1) return;
			event.preventDefault();
			opts.onRowClick(node.id, event);
		};
		row.ondragstart = (event) => {
			this._recursiveExpandGesture.cancel();
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
		row.oncontextmenu = (e) => {
			e.preventDefault();
			e.stopPropagation();
			if (
				this._recursiveExpandGesture.isTrackingPointer() ||
				this._recursiveExpandGesture.isActivationSuppressed()
			) {
				return;
			}
			opts.onContextMenu(node.id, e);
		};
		this.applyRowTitle(row, node);
		const signature = this.rowSignature(node, opts);
		if (row.dataset.renderSignature === signature) {
			this.applyMutableRowState({
				row,
				hasChildren,
				showCaret,
				isExpanded,
				isHighlighted,
				isSelected,
			});
			return row;
		}
		row.empty();
		row.className = 'vaultman-tree-row';
		row.dataset.renderSignature = signature;
		this.applyCoreRowClasses(row, node);
		if (typeof node.cls === 'string' && node.cls.trim()) {
			for (const c of node.cls.trim().split(/\s+/)) row.addClass(c);
		}
		if (isActive) row.addClass('is-active-filter');
		if (isWarning) row.addClass('vaultman-badge-warning');
		if (isEditing) row.addClass('is-editing');

		this.rowEls.set(node.id, row);

		if (showCaret) {
			const toggleEl = row.createDiv({
				cls: 'vaultman-tree-toggle tree-item-icon collapse-icon',
			});
			setIcon(toggleEl, 'right-triangle');
			if (hasChildren) {
				toggleEl.addEventListener('click', (e) => {
					e.stopPropagation();
					if (this._recursiveExpandGesture.isActivationSuppressed()) {
						e.preventDefault();
						return;
					}
					opts.onToggle(node.id);
				});
			} else {
				toggleEl.addClass('vaultman-tree-toggle--empty');
			}
		}

		this.applyMutableRowState({
			row,
			hasChildren,
			showCaret,
			isExpanded,
			isHighlighted,
			isSelected,
		});

		// Icon
		if (node.icon && showIcon) {
			const iconSpan = row.createSpan({ cls: 'vaultman-tree-icon' });
			renderIconValue(iconSpan, node.icon, node.iconColor);
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

		if (showType && node.typeText) {
			row.createSpan({
				cls: 'vaultman-tree-type nav-file-tag',
				text: node.typeText,
			});
		}

		// Multi-zone Badges container
		if (
			(showMtime && node.mtimeText) ||
			(showCtime && node.ctimeText) ||
			(showWords && node.wordCountText) ||
			(showCount && node.count != null && node.count > 0) ||
			(node.badges && node.badges.length > 0) ||
			nodeCells.length > 0
		) {
			const badgeZone = row.createDiv({ cls: 'vaultman-tree-badge-zone' });

			if (showMtime && node.mtimeText) {
				badgeZone.createSpan({
					cls: 'vaultman-tree-date nav-file-tag',
					text: node.mtimeText,
				});
			}
			if (showCtime && node.ctimeText) {
				badgeZone.createSpan({
					cls: 'vaultman-tree-date nav-file-tag',
					text: node.ctimeText,
				});
			}
			if (showWords && node.wordCountText) {
				badgeZone.createSpan({
					cls: 'vaultman-tree-words nav-file-tag',
					text: node.wordCountText,
				});
			}
			if (showTasks && node.tasksText) {
				badgeZone.createSpan({
					cls: 'vaultman-tree-tasks nav-file-tag',
					text: node.tasksText,
				});
			}

			for (const cell of nodeCells) {
				this.renderNodeCell(badgeZone, node.id, cell, opts);
			}

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
						setTooltip(bEl, badge.text);
						if (!badge.icon) bEl.setText(badge.text);
					}
					// Double-click to undo this specific queue operation
					if (badge.queueIndex !== undefined && opts.onBadgeDoubleClick) {
						const cancelMode = normalizeBadgeCancelClickMode(
							opts.badgeCancelClickMode,
						);
						bEl.addClass('is-undoable');
						bEl.setAttribute(
							'title',
							`${badge.text ?? ''} — ${badgeCancelInteractionLabel(cancelMode)}`,
						);
						attachBadgeCancelInteraction(bEl, cancelMode, () => {
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

		return row;
	}

	private renderNodeCell(
		parent: HTMLElement,
		nodeId: string,
		cell: TreeNodeCell,
		opts: TreeViewOptions,
	): void {
		const handleClick = (element: HTMLElement) => {
			element.onclick = (event) => {
				event.preventDefault();
				event.stopPropagation();
				if (!cell.disabled) opts.onCellClick?.(nodeId, cell.id, event);
			};
		};

		if (cell.kind === 'toggle' && cell.style === 'native') {
			const toggleEl = parent.createDiv({
				cls: 'checkbox-container vaultman-addon-toggle-cell',
			});
			toggleEl.toggleClass('is-enabled', cell.enabled);
			toggleEl.toggleClass('is-disabled', cell.disabled === true);
			toggleEl.setAttribute('aria-label', cell.label);
			setTooltip(toggleEl, cell.label);
			const input = toggleEl.createEl('input', {
				cls: 'vaultman-addon-toggle-input',
			});
			input.setAttribute('type', 'checkbox');
			input.setAttribute('tabindex', '0');
			input.setAttribute('aria-label', cell.label);
			input.checked = cell.enabled;
			input.disabled = cell.disabled === true;
			handleClick(toggleEl);
			return;
		}

		if (cell.kind === 'toggle' || cell.appearance === 'badge') {
			const badgeEl = parent.createSpan({
				cls: 'vaultman-badge vaultman-addon-cell',
			});
			badgeEl.addClass('is-solid');
			badgeEl.addClass(
				cell.kind === 'toggle'
					? cell.enabled
						? 'vaultman-badge--success'
						: 'vaultman-badge--faint'
					: 'vaultman-badge--warning',
			);
			const iconEl = badgeEl.createSpan({ cls: 'vaultman-badge-icon' });
			setIcon(
				iconEl,
				cell.kind === 'toggle'
					? cell.enabled
						? 'lucide-toggle-right'
						: 'lucide-toggle-left'
					: cell.icon,
			);
			setTooltip(badgeEl, cell.label);
			if (!cell.disabled) {
				badgeEl.addClass('is-clickable');
				handleClick(badgeEl);
			}
			return;
		}

		const actionEl = parent.createEl('button', {
			cls: 'clickable-icon vaultman-addon-action-cell',
		});
		actionEl.setAttribute('type', 'button');
		actionEl.setAttribute('aria-label', cell.label);
		actionEl.disabled = cell.disabled === true;
		setIcon(actionEl, cell.icon);
		setTooltip(actionEl, cell.label);
		handleClick(actionEl);
	}

	private _handleRowDragOver(
		row: HTMLElement,
		id: string,
		event: DragEvent,
		opts: TreeViewOptions,
	): void {
		opts.onDragOver?.(id, event);
		row.toggleClass('is-being-dragged-over', event.defaultPrevented);
	}
}
