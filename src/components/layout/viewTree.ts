// src/components/UnifiedTreeView.ts
import { Platform, setIcon, setTooltip } from 'obsidian';
import type { TooltipPlacement } from 'obsidian';
import { translate } from '../../i18n/index';
import type {
	NodeBubbleDot,
	TreeNode,
	TreeNodeCell,
} from '../../types/typeTree';
import type { ExplorerTabId } from '../../types/typeUI';
import type { CounterRange } from '../../types/typeGroupPreset';
import { validateCounterRangeEdit } from '../../logic/logicCounterRangeEditor';
import {
	applyCellTooltip as applySharedCellTooltip,
	resolveTooltipPlacement,
} from '../../logic/logicCellTooltip';
import { resolveActiveFilterPresentation } from '../../logic/logicActiveFilterBubbling';
import {
	resolveExplorerHighlight,
	resolveExplorerHighlightForId,
	resolveExplorerStatusDots,
	type ExplorerHighlightIdSets,
	type ExplorerStatusDot,
} from '../../logic/logicExplorerHighlight';

const EMPTY_ID_SET: ReadonlySet<string> = new Set();
import {
	explorerDensityProfile,
	usesMobileExplorerDensity,
} from '../../logic/logicResponsiveLayout';
import { stickyTreeRows } from '../../logic/logicTreeSticky';
import { vaultmanPerfMonitor } from '../../utils/performanceMonitor';
import {
	buildVirtualTreeWindow,
	flattenVisibleTree,
	flattenVisibleTreeWithChain,
	treeChainFromRows,
} from '../../utils/treeVirtualization';
import {
	scopePreviewGeometry,
	type ScopePreviewMode,
	type ScopePreviewRow,
} from '../../logic/logicScopePreview';
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
import {
	CoreMetadataTreeView,
	type CoreMetadataTreeAnatomy,
} from './viewCoreMetadataTree';

export type { CoreMetadataTreeAnatomy } from './viewCoreMetadataTree';

/**
 * A13: a dblclick that starts inside an editable descendant (the filter/value
 * `input` in props/tags rows, the rename box, a textarea, a contenteditable
 * region) only drives the caret/text selection there. It must never
 * expand/collapse the row.
 */
export function isEditableDblClickTarget(target: EventTarget | null): boolean {
	if (!target || typeof target !== 'object') return false;
	const el = target as Partial<Element> & {
		isContentEditable?: boolean;
		tagName?: string;
	};
	if (typeof el.closest === 'function') {
		const input = el.closest('input');
		if (input && (input.type === 'checkbox' || input.type === 'radio')) {
			return false;
		}
		const hit = el.closest(
			'input, textarea, [contenteditable="true"], [contenteditable=""], [contenteditable="plaintext-only"]',
		);
		if (hit) return true;
	}
	if (el.isContentEditable === true) return true;
	const tag = typeof el.tagName === 'string' ? el.tagName.toUpperCase() : '';
	return tag === 'INPUT' || tag === 'TEXTAREA';
}

export interface TreeViewOptions {
	/** Provider context used only to resolve localized per-cell names. */
	surface?: ExplorerTabId;
	nodes: TreeNode[];
	expandedIds: Set<string>;
	onToggle: (id: string) => void;
	/**
	 * B-groupbody: activacion del CUERPO de un row de grupo. El motor decide
	 * el CAMINO (un grupo nunca entra por `onRowClick`); la escena decide el
	 * MODO dentro de este callback (open/select/filter viven en la escena).
	 * Ausente: el cuerpo cae a `onToggle` (fallback open). El chevron siempre
	 * entra por `onToggle` puro, como en una carpeta.
	 */
	onGroupActivate?: (id: string) => void;
	onRecursiveExpand?: (id: string) => void;
	onRowClick: (id: string, event?: MouseEvent) => void;
	onRowDoubleClick?: (id: string, event: MouseEvent) => void;
	onCellClick?: (id: string, cellId: string, event: MouseEvent) => void;
	onRowHover?: (id: string, row: HTMLElement) => void;
	onContextMenu: (id: string, e: MouseEvent) => void;
	activeFilterIds?: Set<string>;
	excludedFilterIds?: Set<string>;
	/** U121-013: provider-neutral, independently composable highlight channels. */
	highlightIds?: ExplorerHighlightIdSets;
	selectedIds?: Set<string>;
	isNodeSelectable?: (node: TreeNode) => boolean;
	selectionCheckboxPosition?: 'start' | 'end' | 'hidden';
	onSelectionToggle?: (id: string, selected: boolean, event?: MouseEvent) => void;
	searchHighlightIds?: Set<string>;
	warningIds?: Set<string>;
	editingId?: string | null;
	onRename?: (id: string, newLabel: string) => void;
	onBlurRename?: (id: string, newLabel: string) => void;
	onAttachInput?: (node: TreeNode, inputEl: HTMLInputElement) => void;
	getEditingValue?: (node: TreeNode) => string;
	getEditingPlaceholder?: (node: TreeNode) => string;
	onCancelRename?: () => void;
	onOpenRichRename?: (id: string, currentValue: string) => void;
	/** Structured editor for counter preset headers. */
	onCounterRangeCommit?: (
		id: string,
		range: CounterRange,
		mode?: 'adjust' | 'slice',
	) => boolean | void;
	onCounterRangeError?: (id: string, reason: string) => void;
	counterRangeBoundLabel?: (bound: 'lower' | 'upper') => string;
	onBadgeDoubleClick?: (queueIndex: number) => void;
	/**
	 * U121-073: the badge of a node doomed by an ANCESTOR's deletion releases
	 * just that node and its subtree, leaving the operation standing.
	 */
	onBadgeRelease?: (queueIndex: number, path: string) => void;
	/**
	 * Clicking the empty run below the last row. There is nothing there to act
	 * on, which is exactly why it is the natural place to drop a selection.
	 */
	onEmptySpaceClick?: () => void;
	/** U121-106: mantener pulsado el checkbox de un p-node. */
	onRecursiveSelect?: (id: string) => void;
	badgeCancelClickMode?: BadgeCancelClickMode;
	onDragStart?: (id: string, event: DragEvent) => void;
	onDragOver?: (id: string, event: DragEvent) => void;
	onDrop?: (id: string, event: DragEvent) => void;
	visibleCells?: Set<string>;
	/**
	 * BT5-011: when present, value/identity cells are emitted as siblings in
	 * exactly this order instead of the structural default. Absent (the
	 * default) keeps the classic row markup untouched.
	 */
	cellRenderOrder?: readonly string[];
	/**
	 * BT5-017: accessible description for the collapsed-activity dot. The view
	 * stays i18n-agnostic, so the panel supplies the localized text.
	 */
	bubbleDotLabel?: (dot: NodeBubbleDot) => string;
	/** BT5-038: localized label for the active-filter-descendant dot. */
	filterBubbleLabel?: string;
	/** U121-013: accessible label for provider-neutral status dots. */
	statusDotLabel?: (dot: ExplorerStatusDot) => string;
	/**
	 * BT5-032/034: the panel's configured tooltip text for a row. The view
	 * still authors nothing — it only asks, and applies whatever it gets, at
	 * render time so the tooltip is armed before the pointer arrives. A panel
	 * that configures no tooltip omits this and its rows show none.
	 */
	rowTooltip?: (node: TreeNode) => string;
	/**
	 * Provider-owned lazy decoration seam. It runs only for nodes entering the
	 * virtual window and before the row signature is calculated.
	 */
	prepareNode?: (node: TreeNode) => void;
	renderLabel?: (container: HTMLElement, node: TreeNode) => boolean;
	/**
	 * U121-003: delegate Tree to Core's file-properties layout. Table and Cards
	 * have no corresponding option and therefore keep their own Cell anatomy.
	 */
	coreMetadata?: CoreMetadataTreeAnatomy;
	/** Position of the tree expander caret: 'start' | 'end' | 'hidden'. */
	caretPosition?: 'start' | 'end' | 'hidden';
	/** Keep expanded parent rows visible above the virtualized tree window. */
	stickyParentRows?: boolean;
	/**
	 * U130-t33 (L-PNODE): fuerza las guias de indentacion aunque la celda
	 * `nested` este apagada. Un grupo es un p-node con hijos tenga o no
	 * anidacion la escena: con agrupacion activa el arbol proyectado tiene
	 * profundidad real y sus guias salen por el mismo `::before` de siempre.
	 * Ausente: se conserva la lectura historica de `visibleCells`.
	 */
	indentGuides?: boolean;
	/**
	 * view_option `indent`, per_instance. `false` collapses ONLY the rows
	 * that have no caret (no children, no `showCaret`) to the flat 4px
	 * gutter, zeroing their per-depth offset. A p-node keeps its full
	 * `--depth` indent unconditionally — otherwise a deep p-node and a
	 * shallow one would draw their carets at the same x, and there would be
	 * no way to tell which level a given caret belongs to. Absent/`true`
	 * keeps today's geometry for every row.
	 */
	indent?: boolean;
	/**
	 * Settings differentiation: controls whether indent toggle removes all indents,
	 * only depth indentation, or only same-level parent indentation.
	 */
	treeIndentMode?: 'all' | 'depth' | 'parent';
	/**
	 * U130 polishing: view_option `tooltips`, per_instance. `false` apaga
	 * los tooltips nativos de filas y celdas. Ausente/`true` conserva los
	 * de hoy.
	 */
	tooltipsEnabled?: boolean;
	/**
	 * U130 polishing: ubicación de los tooltips nativos (`side` = lateral
	 * como el nativo). La fija el setting global `tooltipPlacement`.
	 * Ausente = lateral.
	 */
	tooltipPlacement?: TooltipPlacement;
	/** Height to reserve above the pinned rows when the layout overlays nav
	 * tools on the scrollport. Left undefined it is measured; pass a number
	 * to override, and 0 for a detached layout that overlays nothing. */
	stickyTopOffset?: number;
	/** Share of the tree the pinned headers may cover. */
	stickyMaxFraction?: number;
	/**
	 * Opt-in drawer animation for expand/collapse. When on, children emerge
	 * from an overflow-hidden wrapper (the "drawer") and siblings slide
	 * smoothly to their new positions. Off by default for performance.
	 */
	expansionAnimation?: boolean;
}

export class UnifiedTreeView {
	private containerEl: HTMLElement;
	private rowEls = new Map<string, HTMLElement>();
	private stickyRowEls = new Map<string, HTMLElement>();
	/** Rows whose sticky twin is currently drawn, so the original can be
	 * hidden instead of showing through underneath it. */
	private _stickyTwinIds = new Set<string>();
	private _pendingRaf: number | null = null;
	private _filterBubbleIds: ReadonlySet<string> = EMPTY_ID_SET;
	private _excludedFilterBubbleIds: ReadonlySet<string> = EMPTY_ID_SET;
	private _highlightBubbleIds: ExplorerHighlightIdSets = {};
	private _hoveredRowId: string | null = null;
	private _pendingScrollTimer: number | null = null;
	private _opts: TreeViewOptions | null = null;
	private readonly _ownerId = `vaultman-tree-${Math.random()
		.toString(36)
		.slice(2)}`;
	private readonly _markupVersion = 2;
	private _structureAnimationTimer: number | null = null;
	private _lastExpandedIds: Set<string> | null = null;
	private _hasRenderedExpandedState = false;
	/** Drawer animation state (opt-in via expansionAnimation). */
	private _drawerEl: HTMLElement | null = null;
	private _drawerTimer: number | null = null;
	private _pendingScroll: {
		id: string;
		block: ScrollLogicalPosition;
		behavior: ScrollBehavior;
	} | null = null;
	private _spacerEl: HTMLElement | null = null;
	private _contentEl: HTMLElement | null = null;
	private _stickyLayerEl: HTMLElement | null = null;
	private _rows: TreeNode[] = [];
	private _scopePreviewRows: ScopePreviewRow[] = [];
	private _scopePreviewLevels = new Map<number, number[]>();
	private _scopePickMode: ScopePreviewMode | null = null;
	private _scopePreviewNodeId: string | null = null;
	private _scopePreviewRaf: number | null = null;
	private _scopePreviewEl: HTMLElement | null = null;
	private _editingCounterRangeId: string | null = null;
	private _editingCounterRange: { id: string; mode: 'adjust' | 'slice' } | null =
		null;
	/** Emitted with the rows so the sticky stack can walk up to the ancestors
	 * of the first visible row instead of scanning everything above it. */
	private _parentIndex: number[] | null = null;
	private _subtreeEnd: number[] | null = null;
	private _indexById = new Map<string, number>();
	private _activeId: string | null = null;
	private readonly _overscan = 24;
	private readonly _recursiveExpandGesture = new LongPressGesture();
	/**
	 * U121-106: pulsacion larga sobre el CHECKBOX. Gesto propio y no el de la
	 * fila: comparten elemento padre, y uno solo no puede distinguir "mantener
	 * sobre la fila" (expandir recursivo) de "mantener sobre el checkbox"
	 * (seleccionar la descendencia).
	 */
	private readonly _recursiveSelectGesture = new LongPressGesture();
	private readonly _coreMetadataView: CoreMetadataTreeView;
	private _scrollGestureStart: number | null = null;
	private _scrollGestureFrom = 0;
	private _scrollGestureTimer: number | null = null;
	private readonly _onScroll = () => {
		this._trackScrollGesture();
		if (this._hasVisibleRenderedRows()) {
			this._scheduleWindowRender();
			return;
		}
		this._cancelWindowRender();
		this._renderWindow();
	};
	private readonly _onScopePointerLeave = () => {
		this._scopePreviewNodeId = null;
		this._clearScopePreview();
	};

	constructor(containerEl: HTMLElement) {
		this.containerEl = containerEl;
		this._coreMetadataView = new CoreMetadataTreeView(containerEl, this.rowEls);
	}

	/**
	 * Arms the owner-local hover affordance used by Select a parent/level.
	 * The overlay is rendered inside this tree's own scrollport, so sibling
	 * Scene instances cannot receive or paint the preview.
	 */
	setScopePickMode(mode: ScopePreviewMode | null): void {
		if (this._scopePickMode === mode) return;
		this._scopePickMode = mode;
		if (mode) {
			this.containerEl.dataset.vaultmanScopePickMode = mode;
			this.containerEl.addEventListener('pointerleave', this._onScopePointerLeave);
			this._ensureScopePreviewElement();
		} else {
			delete this.containerEl.dataset.vaultmanScopePickMode;
			this.containerEl.removeEventListener('pointerleave', this._onScopePointerLeave);
			this._scopePreviewNodeId = null;
			this._clearScopePreview();
		}
	}

	/** Open the structured editor only after the group context-menu action. */
	beginCounterRangeEdit(id: string): boolean;
	beginCounterRangeEdit(id: string, mode: 'adjust' | 'slice'): boolean;
	beginCounterRangeEdit(id: string, mode: 'adjust' | 'slice' = 'adjust'): boolean {
		const node = this._rows.find((candidate) => candidate.id === id);
		if (!node?.counterRange || !node.counterDomain || !this._opts?.onCounterRangeCommit)
			return false;
		this._editingCounterRange = { id, mode };
		this._editingCounterRangeId = id;
		this._renderWindow();
		this._treeWindow().requestAnimationFrame(() => {
			this.rowEls.get(id)?.querySelector<HTMLInputElement>(
				'.vaultman-counter-range-editor input',
			)?.focus();
		});
		return true;
	}

	render(opts: TreeViewOptions): void {
		this._recursiveExpandGesture.cancel();
		// A14: capture the pinned-before state ahead of the render below, so
		// a scene toggle that collapses exactly one pinned row can be parked
		// under the sticky stack once the window is repainted.
		const collapsingPinnedId = this._soleCollapsingPinnedRow(
			opts,
			opts.expandedIds,
		);
		if (opts.activeFilterIds) {
			// BT5-038: exact filters keep the decoration; a collapsed ancestor
			// that only hides one gets a dot, so it no longer looks like a filter.
			const { bubbled } = resolveActiveFilterPresentation(
				opts.nodes,
				opts.expandedIds,
				opts.activeFilterIds,
			);
			this._filterBubbleIds = bubbled;
		} else {
			this._filterBubbleIds = EMPTY_ID_SET;
		}
		this._excludedFilterBubbleIds = opts.excludedFilterIds
			? resolveActiveFilterPresentation(
					opts.nodes,
					opts.expandedIds,
					opts.excludedFilterIds,
				).bubbled
			: EMPTY_ID_SET;
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
		this._opts = opts;
		this.containerEl.dataset.vaultmanTreeOwner = this._ownerId;
		this.containerEl.toggleClass(
			'vaultman-tree-nested-guides',
			!opts.coreMetadata &&
				(opts.indentGuides ?? opts.visibleCells?.has('nested') ?? true),
		);
		if (!opts.coreMetadata) this._markStructureAnimationIfNeeded(opts.expandedIds);
		if (this._pendingRaf !== null) {
			cancelAnimationFrame(this._pendingRaf);
			this._pendingRaf = null;
		}
		if (this._pendingScrollTimer !== null) {
			window.clearTimeout(this._pendingScrollTimer);
			this._pendingScrollTimer = null;
		}
		if (opts.coreMetadata) {
			this.containerEl.removeEventListener('scroll', this._onScroll);
			this.containerEl.removeClass('vaultman-tree-virtual-viewport');
			this._stickyLayerEl?.remove();
			this._stickyLayerEl = null;
			this.stickyRowEls.clear();
			this._spacerEl = null;
			this._contentEl = null;
			this._rows = opts.nodes;
			this._rebuildScopePreviewIndex();
			// Pre-flattened rows arrive without a chain; the scan still answers.
			this._parentIndex = null;
			this._subtreeEnd = null;
			this._indexById = this._buildIndex(opts.nodes);
			const renderStarted = performance.now();
			this._coreMetadataView.render({ ...opts, coreMetadata: opts.coreMetadata });
			vaultmanPerfMonitor.record(
				'tree.render.metadata',
				performance.now() - renderStarted,
				{ rows: opts.nodes.length },
			);
			vaultmanPerfMonitor.recordAction('tree', 'render.metadata', {
				rows: opts.nodes.length,
			});
			return;
		}
		this._coreMetadataView.destroy();

		const scrollTop = this.containerEl.scrollTop;
		const rowHeight = this.rowHeight();
		const modelStarted = performance.now();
		const flattened = flattenVisibleTreeWithChain(
			opts.nodes,
			opts.expandedIds,
		);
		this._rows = flattened.rows;
		this._rebuildScopePreviewIndex();
		this._parentIndex = flattened.parentIndex;
		this._subtreeEnd = flattened.subtreeEnd;
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
		// A14: the shared fileScene jump. Runs after the repaint so the stack
		// it parks under is the new one; a no-op (second window render) when
		// no pinned row collapsed.
		if (collapsingPinnedId) this.scrollRowUnderStickyStack(collapsingPinnedId);
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

	/** Re-measure only the cached virtual window after a hidden pane is shown. */
	refreshViewport(): void {
		this._cancelWindowRender();
		this._renderWindow();
		this._flushPendingScroll();
	}

	/** Mutate the active file highlight without rebuilding the tree model. */
	setActiveId(id: string | null): void {
		if (this._activeId === id) return;
		const previousId = this._activeId;
		this._activeId = id;
		if (previousId) this.rowEls.get(previousId)?.removeClass('is-active');
		if (id) this.rowEls.get(id)?.addClass('is-active');
	}

	destroy(): void {
		this._recursiveExpandGesture.cancel();
		this.setScopePickMode(null);
		this._coreMetadataView.destroy();
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
		if (this._scrollGestureTimer !== null) {
			window.clearTimeout(this._scrollGestureTimer);
			this._scrollGestureTimer = null;
			this._scrollGestureStart = null;
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
		this._stickyLayerEl?.remove();
		this._stickyLayerEl = null;
		this._rows = [];
		this._rebuildScopePreviewIndex();
		this._scopePreviewRows = [];
		this._scopePreviewLevels.clear();
		this._indexById.clear();
		this.rowEls.clear();
		this.stickyRowEls.clear();
		this._pendingScroll = null;
		this._lastExpandedIds = null;
		this._hasRenderedExpandedState = false;
		this._cleanupDrawer();
	}

	private _ensureScopePreviewElement(): HTMLElement {
		if (this._scopePreviewEl && this.containerEl.contains(this._scopePreviewEl)) {
			// A sticky overlay must precede the virtual spacer. Appending it after
			// the spacer puts its sticky origin at the end of the full tree.
			this.containerEl.prepend(this._scopePreviewEl);
			return this._scopePreviewEl;
		}
		const overlay = this.containerEl.createDiv({
			cls: 'vaultman-tree-scope-preview',
		});
		overlay.setAttribute('aria-hidden', 'true');
		this.containerEl.prepend(overlay);
		this._scopePreviewEl = overlay;
		return overlay;
	}

	private _clearScopePreview(): void {
		if (this._scopePreviewRaf !== null) {
			this._treeWindow().cancelAnimationFrame(this._scopePreviewRaf);
			this._scopePreviewRaf = null;
		}
		this._scopePreviewEl?.empty();
		this._scopePreviewEl?.removeClass('is-active');
	}

	private _scheduleScopePreview(nodeId: string): void {
		if (!this._activeScopePickMode()) return;
		this._scopePreviewNodeId = nodeId;
		if (this._scopePreviewRaf !== null) return;
		this._scopePreviewRaf = this._treeWindow().requestAnimationFrame(() => {
			this._scopePreviewRaf = null;
			this._renderScopePreview();
		});
	}

	private _renderScopePreview(): void {
		const mode = this._activeScopePickMode();
		const nodeId = this._scopePreviewNodeId;
		if (this._scopePreviewRows.length !== this._rows.length) {
			this._rebuildScopePreviewIndex();
		}
		const contentEl =
			this._contentEl ??
			this.containerEl.querySelector<HTMLElement>(
				'.vaultman-tree-virtual-content',
			);
		const overlay = this._ensureScopePreviewElement();
		if (!mode || !nodeId || !this._scopePreviewRows.length || !contentEl) {
			this._clearScopePreview();
			return;
		}
		const hoveredIndex =
			this._indexById.get(nodeId) ??
			this._scopePreviewRows.findIndex((row) => row.id === nodeId);
		if (hoveredIndex < 0) {
			this._clearScopePreview();
			return;
		}

		// Read all geometry and CSS metrics before touching the overlay DOM.
		const computed = this._treeWindow().getComputedStyle(this.containerEl);
		const parsePx = (value: string, fallback: number): number => {
			const parsed = Number.parseFloat(value);
			return Number.isFinite(parsed) ? parsed : fallback;
		};
		const renderedRow = this.rowEls.get(nodeId);
		const rowStyle = renderedRow
			? this._treeWindow().getComputedStyle(renderedRow)
			: null;
		const rowInset = parsePx(rowStyle?.marginInlineStart ?? '', 4);
		const rowPaddingStart = parsePx(
			computed.getPropertyValue('--vaultman-tree-row-padding-start'),
			24,
		);
		const leafRowPaddingStart = parsePx(
			computed.getPropertyValue('--size-4-1'),
			4,
		);
		const indentUnit = parsePx(
			computed.getPropertyValue('--vaultman-tree-indent-unit'),
			16,
		);
		const rowHeight = this.rowHeight();
		const viewportHeight = this.containerEl.clientHeight;
		const visibleStartIndex = Math.max(
			0,
			Math.floor(this.containerEl.scrollTop / rowHeight) - this._overscan,
		);
		const visibleEndIndex = Math.min(
			this._rows.length,
			Math.ceil((this.containerEl.scrollTop + viewportHeight) / rowHeight) +
				this._overscan,
		);
		const geometry = scopePreviewGeometry({
			rows: this._scopePreviewRows,
			parentIndex: this._parentIndex ?? [],
			subtreeEnd: this._subtreeEnd ?? [],
			hoveredIndex,
			mode,
			rowHeight,
			scrollTop: this.containerEl.scrollTop,
			viewportHeight,
			contentWidth: this.containerEl.clientWidth,
			rowInset,
			rowPaddingStart,
			leafRowPaddingStart,
			indentUnit,
			indentEnabled: this._opts?.indent !== false,
			levelIndices: this._scopePreviewLevels,
			visibleStartIndex,
			visibleEndIndex,
		});

		// Writes are kept after every read above; pointer movement therefore does
		// not interleave layout reads with style/DOM mutations.
		overlay.empty();
		for (const segment of geometry.segments) {
			const el = overlay.createDiv({ cls: 'vaultman-tree-scope-preview-segment' });
			el.dataset.rowIndex = String(segment.index);
			el.style.top = `${segment.top}px`;
			el.style.left = `${segment.left}px`;
			el.style.width = `${segment.width}px`;
			el.style.height = `${segment.height}px`;
			el.toggleClass('is-open-top', segment.openTop);
			el.toggleClass('is-open-bottom', segment.openBottom);
		}
		overlay.toggleClass('is-active', geometry.segments.length > 0);
	}

	private _activeScopePickMode(): ScopePreviewMode | null {
		const mode = this.containerEl.dataset.vaultmanScopePickMode;
		return mode === 'parent' || mode === 'level'
			? mode
			: this._scopePickMode;
	}

	private _rebuildScopePreviewIndex(): void {
		this._scopePreviewRows = this._rows.map((node) => {
			const hasCaret = Boolean(node.children?.length || node.showCaret);
			const meta = node.meta as { isFolder?: unknown } | null;
			return {
				id: node.id,
				depth: node.depth,
				hasCaret,
				isParent:
					hasCaret ||
					node.isGroupHeader === true ||
					(meta !== null && meta?.isFolder === true),
			};
		});
		this._scopePreviewLevels.clear();
		for (let index = 0; index < this._scopePreviewRows.length; index += 1) {
			const depth = this._scopePreviewRows[index].depth;
			const indexes = this._scopePreviewLevels.get(depth);
			if (indexes) indexes.push(index);
			else this._scopePreviewLevels.set(depth, [index]);
		}
	}

	/**
	 * Re-project one expansion boundary from the cached tree. Unlike render(),
	 * this never flattens the complete root model: it replaces only the changed
	 * node's visible descendants and repaints the current virtual window.
	 */
	updateExpansion(rootId: string, expandedIds: Set<string>): void {
		if (!this._opts || !this._contentEl) return;
		this._recursiveExpandGesture.cancel();
		this._opts = { ...this._opts, expandedIds };
		this._markStructureAnimationIfNeeded(expandedIds);
		this._cancelWindowRender();

		const modelStarted = performance.now();
		const delta = this._replaceVisibleDescendants(rootId);
		if (!delta) return;
		this._rebuildScopePreviewIndex();

		// U121-080: the splice above rewrote the row list, so the chain that
		// describes it has to be rewritten too. Leaving it stale pinned a
		// collapsed folder forever -- it kept the subtreeEnd of its expanded
		// self -- and made an expansion silently kill every sticky, because the
		// indices no longer pointed at the rows they named.
		if (this._opts.stickyParentRows) {
			const chain = treeChainFromRows(this._rows);
			this._parentIndex = chain.parentIndex;
			this._subtreeEnd = chain.subtreeEnd;
		} else {
			this._parentIndex = null;
			this._subtreeEnd = null;
		}

		const rowHeight = this.rowHeight();
		if (this._spacerEl) {
			this._spacerEl.style.height = `${this._rows.length * rowHeight}px`;
		}
		this.containerEl.scrollTop = Math.min(
			this.containerEl.scrollTop,
			Math.max(
				0,
				this._rows.length * rowHeight - this.containerEl.clientHeight,
			),
		);
		vaultmanPerfMonitor.record(
			'tree.model.expansion',
			performance.now() - modelStarted,
			{
				rows: this._rows.length,
				removedRows: delta.removed,
				insertedRows: delta.inserted,
			},
		);

		this._renderWindow();

		// Drawer animation: wrap newly inserted children in an overflow-hidden
		// container whose height animates from 0 → full, giving the Obsidian-
		// like drawer illusion. Only on pure expand (inserted > 0, removed = 0).
		if (this._opts.expansionAnimation && delta.inserted > 0 && delta.removed === 0) {
			this._startDrawerExpand(rootId, delta.inserted);
		} else if (this._opts.expansionAnimation) {
			// Collapse or toggle: siblings slide via CSS transition, clean up after.
			this._scheduleDrawerCleanup();
		}

		this._flushPendingScroll();
	}

	/** Toggle visibility of rows matching/not matching filtered IDs — no DOM rebuild */
	updateVisibility(visibleIds: Set<string>): void {
		for (const [id, el] of this.rowEls) {
			el.toggleClass('is-hidden', !visibleIds.has(id));
		}
	}

	/**
	 * U121-080: is this row currently pinned above the viewport? The twin set is
	 * exactly the rows the sticky stack is standing in for, so it answers without
	 * recomputing anything.
	 */
	isStickyRow(id: string): boolean {
		return this._stickyTwinIds.has(id);
	}

	/**
	 * A14: the single pinned row whose collapse this render performs, if
	 * exactly one. Collapsing a row that is PINNED above the viewport destroys
	 * the content the scroll offset points into, so the browser clamps
	 * wherever the shortened document ends and the collapsed row hides behind
	 * its own still-pinned ancestors. Parking it under the surviving headers
	 * is what fileScene already does per toggle; doing it here shares the
	 * jump with every scene that renders through this view, without touching
	 * any of them. Zero (nothing to anchor) or several (collapse-all and
	 * other structural rewrites) → leave the scroll alone.
	 */
	private _soleCollapsingPinnedRow(
		opts: TreeViewOptions,
		nextExpanded: Set<string>,
	): string | null {
		if (
			!opts.stickyParentRows ||
			!this._hasRenderedExpandedState ||
			!this._lastExpandedIds
		)
			return null;
		// Instance owners often mutate their Set in place before calling render.
		// `_opts.expandedIds` can therefore already be the next state; compare
		// against the immutable snapshot captured after the previous projection.
		const prevExpanded = this._lastExpandedIds;
		let found: string | null = null;
		for (const id of this._stickyTwinIds) {
			if (!prevExpanded.has(id) || nextExpanded.has(id)) continue;
			if (found !== null) return null;
			found = id;
		}
		return found;
	}

	/**
	 * U121-080: park a row directly under whatever stays pinned above it.
	 *
	 * Sending a collapsed row to offset 0 is right only for a root: a level-2
	 * row has ancestors that remain in the stack, so row 0 is underneath them
	 * and the row the user just collapsed disappears behind its own parents.
	 * The slot it occupied IS the number of headers that outlive it, so its
	 * resting place is that many rows down.
	 */
	scrollRowUnderStickyStack(id: string): void {
		const index = this._indexById.get(id);
		if (index === undefined) return;
		const rowHeight = this.rowHeight();
		if (rowHeight <= 0) return;
		const survivors = stickyTreeRows(this._rows, {
			rowHeight,
			scrollTop: index * rowHeight,
			viewportHeight: this.containerEl.clientHeight,
			maxFraction: this._opts?.stickyMaxFraction,
			parentIndex: this._parentIndex ?? undefined,
			subtreeEnd: this._subtreeEnd ?? undefined,
		}).filter((sticky) => sticky.index !== index);
		this.containerEl.scrollTop = Math.max(
			0,
			(index - survivors.length) * rowHeight,
		);
		this._renderWindow();
	}

	scrollToId(
		id: string,
		block: ScrollLogicalPosition = 'center',
		behavior: ScrollBehavior = 'auto',
	): void {
		const index = this._indexById.get(id);
		if (index !== undefined) {
			this.containerEl.scrollTo({
				top: this._scrollTopForIndex(index, block),
				behavior,
			});
			if (behavior === 'auto') {
				this._cancelWindowRender();
				this._renderWindow();
			} else {
				this._scheduleWindowRender();
			}
			this._pendingScroll = null;
			vaultmanPerfMonitor.recordAction('tree', 'scrollToId', { id, index });
			return;
		}
		const row = this.rowEls.get(id);
		if (row) {
			row.scrollIntoView({ block, inline: 'nearest', behavior });
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

	private _replaceVisibleDescendants(
		rootId: string,
	): { removed: number; inserted: number } | null {
		if (!this._opts) return null;
		const rootIndex = this._indexById.get(rootId);
		if (rootIndex === undefined) return null;
		const root = this._rows[rootIndex];
		if (!root) return null;

		const firstChildIndex = rootIndex + 1;
		let afterSubtreeIndex = firstChildIndex;
		while (
			afterSubtreeIndex < this._rows.length &&
			this._rows[afterSubtreeIndex].depth > root.depth
		) {
			afterSubtreeIndex += 1;
		}
		const removedNodes = this._rows.slice(firstChildIndex, afterSubtreeIndex);
		const insertedNodes = this._opts.expandedIds.has(root.id)
			? flattenVisibleTree(root.children ?? [], this._opts.expandedIds)
			: [];
		this._rows.splice(firstChildIndex, removedNodes.length, ...insertedNodes);

		for (const node of removedNodes) this._indexById.delete(node.id);
		// Only the changed suffix can move. Do not rebuild the complete index.
		for (let index = firstChildIndex; index < this._rows.length; index += 1) {
			const node = this._rows[index];
			if (node) this._indexById.set(node.id, index);
		}
		return { removed: removedNodes.length, inserted: insertedNodes.length };
	}

	private _markStructureAnimationIfNeeded(expandedIds: Set<string>): void {
		const changed =
			this._hasRenderedExpandedState &&
			!this._areExpandedSetsEqual(this._lastExpandedIds, expandedIds);
		if (changed) {
			this._startStructureAnimation();
			if (this._opts?.expansionAnimation) {
				this.containerEl.addClass('vaultman-tree-drawer-animating');
			}
		}
		this._lastExpandedIds = new Set(expandedIds);
		this._hasRenderedExpandedState = true;
	}

	private _areExpandedSetsEqual(
		a: Set<string> | null,
		b: Set<string>,
	): boolean {
		if (!a) return false;
		if (a === b) return true;
		if (a.size !== b.size) return false;
		for (const id of a) {
			if (!b.has(id)) return false;
		}
		return true;
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

	/**
	 * Drawer expand: wrap newly inserted children in an overflow-hidden div
	 * whose height animates from 0 → full. Children inside are clipped until
	 * revealed, giving the Obsidian-like drawer illusion without overlap.
	 */
	private _startDrawerExpand(rootId: string, insertedCount: number): void {
		this._cleanupDrawer();
		if (!this._contentEl) return;
		const rootIdx = this._indexById.get(rootId);
		if (rootIdx === undefined) return;

		const rowHeight = this.rowHeight();
		const drawerTop = (rootIdx + 1) * rowHeight;
		const fullHeight = insertedCount * rowHeight;

		const doc = this.containerEl.ownerDocument;
		const drawer = doc.createElement('div');
		drawer.className = 'vaultman-tree-drawer';
		drawer.style.top = `${drawerTop}px`;
		this._contentEl.appendChild(drawer);

		// Move child row elements into the drawer, adjusting top to be
		// relative to the drawer's own top.
		for (let i = rootIdx + 1; i < rootIdx + 1 + insertedCount && i < this._rows.length; i++) {
			const node = this._rows[i];
			if (!node) continue;
			const rowEl = this.rowEls.get(node.id);
			if (!rowEl) continue;
			rowEl.style.top = `${i * rowHeight - drawerTop}px`;
			drawer.appendChild(rowEl);
		}

		this._drawerEl = drawer;

		// Trigger expand on next frame so the browser paints height:0 first.
		const win = this._treeWindow();
		win.requestAnimationFrame(() => {
			if (this._drawerEl) {
				this._drawerEl.style.height = `${fullHeight}px`;
			}
		});

		this._scheduleDrawerCleanup();
	}

	private _scheduleDrawerCleanup(): void {
		if (this._drawerTimer !== null) {
			this._treeWindow().clearTimeout(this._drawerTimer);
		}
		this._drawerTimer = this._treeWindow().setTimeout(() => {
			this._cleanupDrawer();
			this._renderWindow();
		}, 160);
	}

	private _cleanupDrawer(): void {
		if (this._drawerTimer !== null) {
			this._treeWindow().clearTimeout(this._drawerTimer);
			this._drawerTimer = null;
		}
		if (this._drawerEl) {
			// Remove rows from cache so _renderWindow recreates them
			// in _contentEl at their correct absolute positions.
			for (const child of Array.from(this._drawerEl.children)) {
				if (child instanceof HTMLElement && child.dataset.id) {
					this.rowEls.delete(child.dataset.id);
				}
			}
			this._drawerEl.remove();
			this._drawerEl = null;
		}
		this.containerEl.removeClass('vaultman-tree-drawer-animating');
	}

	private _treeWindow(): Window {
		return this.containerEl.ownerDocument?.defaultView ?? window;
	}

	private _ensureScaffold(): void {
		if (this._spacerEl && this.containerEl.contains(this._spacerEl)) return;
		this.containerEl.removeEventListener('scroll', this._onScroll);
		this.containerEl.empty();
		this.rowEls.clear();
		this.stickyRowEls.clear();
		this.containerEl.addClass('vaultman-tree-virtual-viewport');
		this._stickyLayerEl = this.containerEl.createDiv({
			cls: 'vaultman-tree-sticky-layer',
		});
		this._spacerEl = this.containerEl.createDiv({
			cls: 'vaultman-tree-virtual-spacer',
		});
		this._contentEl = this._spacerEl.createDiv({
			cls: 'vaultman-tree-virtual-content',
		});
		if (this._scopePickMode) this._ensureScopePreviewElement();
		this.containerEl.addEventListener('scroll', this._onScroll, {
			passive: true,
		});
		// Bound once with the scaffold: a click that reaches the viewport itself
		// landed on none of the rows, because a row would have handled it.
		this.containerEl.addEventListener('click', this._onViewportClick);
	}

	private readonly _onViewportClick = (event: MouseEvent): void => {
		const target = event.target;
		if (!(target instanceof HTMLElement)) return;
		if (target.closest('.vaultman-tree-row')) return;
		this._opts?.onEmptySpaceClick?.();
	};
	/**
	 * One perf action per gesture, not per event: scroll fires at the panel's
	 * refresh rate, so recording each callback would evict the action ring
	 * buffer before anyone could read it.
	 */
	private _trackScrollGesture(): void {
		if (this._scrollGestureStart === null) {
			this._scrollGestureStart = Date.now();
			this._scrollGestureFrom = this.containerEl.scrollTop;
		}
		if (this._scrollGestureTimer !== null) {
			window.clearTimeout(this._scrollGestureTimer);
		}
		this._scrollGestureTimer = window.setTimeout(() => {
			this._scrollGestureTimer = null;
			const startedAt = this._scrollGestureStart ?? Date.now();
			const from = this._scrollGestureFrom;
			this._scrollGestureStart = null;
			const to = this.containerEl.scrollTop;
			const delta = to - from;
			if (delta === 0) return;
			vaultmanPerfMonitor.recordAction('tree', 'scroll', {
				delta,
				from,
				to,
				// The action's own `at` is when it was recorded, which is after the
				// gesture settled; carry the real start so nobody has to work it out.
				startedAt,
				durationMs: Date.now() - startedAt,
				rows: this._rows.length,
				sticky: this._opts?.stickyParentRows ?? false,
			});
		}, 120);
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
			this._opts.prepareNode?.(row.node);
			const rowEl = this._renderRow(row.node, this._contentEl, this._opts);
			rowEl.addClass('vaultman-tree-row--virtual');
			rowEl.style.top = `${row.top}px`;
		}
		this._renderStickyRows();
		this._focusEditingRow(this._opts);
		if (this._scopePreviewNodeId) {
			this._scheduleScopePreview(this._scopePreviewNodeId);
		}
		vaultmanPerfMonitor.record('tree.window', performance.now() - started, {
			rows: this._rows.length,
			visibleRows: projection.visibleRows.length,
			start: projection.startIndex,
			end: projection.endIndex,
		});
	}

	private removeStaleRows(
		visibleIds: Set<string>,
		rowMap: Map<string, HTMLElement> = this.rowEls,
	): void {
		for (const [id, row] of rowMap) {
			if (visibleIds.has(id)) continue;
			row.remove();
			rowMap.delete(id);
		}
	}

	private _renderStickyRows(): void {
		if (!this._stickyLayerEl || !this._opts?.stickyParentRows) {
			this.removeStaleRows(new Set(), this.stickyRowEls);
			this._syncStickyTwins(new Set());
			return;
		}
		const rowHeight = this.rowHeight();
		this._applyStickyTopOffset();
		const stickyRows = stickyTreeRows(this._rows, {
			rowHeight,
			scrollTop: this.containerEl.scrollTop,
			viewportHeight: this.containerEl.clientHeight,
			maxFraction: this._opts?.stickyMaxFraction,
			parentIndex: this._parentIndex ?? undefined,
			subtreeEnd: this._subtreeEnd ?? undefined,
		});
		const visibleIds = new Set(
			stickyRows.map(({ index }) => this._rows[index]?.id).filter(Boolean),
		);
		this.removeStaleRows(visibleIds, this.stickyRowEls);
		this._syncStickyTwins(visibleIds);
		for (const [slot, sticky] of stickyRows.entries()) {
			const node = this._rows[sticky.index];
			if (!node) continue;
			this._opts.prepareNode?.(node);
			const row = this._renderRow(
				node,
				this._stickyLayerEl,
				this._opts,
				this.stickyRowEls,
			);
			row.addClass('vaultman-tree-row--sticky');
			// Only the row the stack ends on separates itself from the scrolling
			// content below it (the prototype's `.is-stuck`); the ones above it
			// are still headings of the same block.
			row.toggleClass('is-stuck', slot === stickyRows.length - 1);
			row.dataset.sticky = 'true';
			row.style.top = `${sticky.top}px`;
			// The stack steps by `rowHeight`, but a row's box is shorter than
			// that: the remainder is its bottom margin, which inside the sticky
			// layer becomes a slit of scrolling content between two headers.
			// Height comes from the number that decides `top`, so the two
			// cannot drift apart.
			row.style.height = `${rowHeight}px`;
			// A pushed-off row travels up through the slots above it, so the
			// shallower ancestor has to paint over it on the way out.
			row.style.zIndex = `${stickyRows.length - slot}`;
		}
	}


	/** Hide the rows that a sticky header is standing in for, and reveal the
	 * ones it no longer covers. `visibility` rather than `display`: the row must
	 * keep its slot in the virtual list or the spacer stops matching. */
	private _syncStickyTwins(activeIds: Set<string>): void {
		for (const id of this._stickyTwinIds) {
			if (activeIds.has(id)) continue;
			this.rowEls.get(id)?.removeClass('is-sticky-twin');
		}
		for (const id of activeIds) {
			this.rowEls.get(id)?.addClass('is-sticky-twin');
		}
		this._stickyTwinIds = new Set(activeIds);
	}


	/** Park the sticky layer under whatever the layout overlays on top of the
	 * scrollport, instead of at its raw top edge.
	 *
	 * Without this the pinned rows sit behind the nav tools and leave the band
	 * the dev sees between the toolbar and the first sticky row. It shows on
	 * desktop and not on phones because the phone layout overlays nothing, so
	 * an offset of zero happens to be right there and only there.
	 *
	 * Measured rather than wired: the content box already knows where it starts
	 * relative to the scrollport. Read once per sticky render, never per frame.
	 */
	private _applyStickyTopOffset(): void {
		const layer = this._stickyLayerEl;
		if (!layer) return;
		const configured = this._opts?.stickyTopOffset;
		let offset = configured;
		if (offset === undefined) {
			const content = this._contentEl ?? this._spacerEl;
			if (!content) return;
			// `offsetTop` is relative to the scroll container, so it already is
			// the reserved height and needs no rect reads.
			offset = Math.max(0, content.offsetTop);
		}
		const next = `${offset}px`;
		if (layer.style.top !== next) layer.style.top = next;
	}

	private rowSignature(node: TreeNode, opts: TreeViewOptions): string {
		const highlight = this.resolveRowHighlight(node.id, opts);
		const statusDots = this.resolveRowStatusDots(node.id)
			.map((dot) => dot.channel)
			.join(',');
		const cellOrder = opts.cellRenderOrder?.join('>') ?? '';
		const resolvedVisibleCells = this._visibleCellsForNode(node, opts.visibleCells);
		const visibleCells = resolvedVisibleCells
			? Array.from(resolvedVisibleCells).sort().join(',')
			: 'default';
		const counterRangeEditing = this._editingCounterRangeId === node.id;
		const counterRangeEditMode =
			this._editingCounterRange?.id === node.id
				? this._editingCounterRange.mode
				: '';
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
							cell.mixed ? '1' : '0',
						].join(':')
					: cell.kind === 'cell_hover'
						? [
								cell.id,
								cell.kind,
								cell.actions
									.map((action) => `${action.id}:${action.icon}`)
									.join(','),
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
		const bubbleDot = node.bubbleDot
			? `${node.bubbleDot.color}:${node.bubbleDot.sourceCount}`
			: '';
		return [
			`markup:${this._markupVersion}`,
			node.folderColor ?? '',
			bubbleDot,
			node.id,
			node.label,
			node.depth,
			node.cls ?? '',
			node.icon ?? '',
			node.iconColor ?? '',
			node.labelColor ?? '',
			node.typeText ?? '',
			node.mtimeText ?? '',
			node.ctimeText ?? '',
			node.openedText ?? '',
			node.wordCountText ?? '',
			node.tagsText ?? '',
			node.coreCls ?? '',
			node.count ?? '',
			node.children?.length ?? 0,
			node.showCaret ? '1' : '0',
			highlight.hover ? '1' : '0',
			highlight.inclusive ? '1' : '0',
			highlight.exclusive ? '1' : '0',
			highlight.deletion ? '1' : '0',
			this._filterBubbleIds.has(node.id) ? '1' : '0',
			statusDots,
			opts.warningIds?.has(node.id) ? '1' : '0',
			opts.editingId === node.id ? '1' : '0',
			visibleCells,
			counterRangeEditing ? 'counter-range-editing' : '',
			counterRangeEditMode,
			cellOrder,
			opts.caretPosition ?? 'start',
			opts.onSelectionToggle ? 'selection' : '',
			(opts.isNodeSelectable?.(node) ?? true) ? 'selectable' : 'action-only',
			opts.selectionCheckboxPosition ?? 'start',
			badges,
			cells,
		].join('\u001f');
	}

	private _visibleCellsForNode(
		node: TreeNode,
		base: Set<string> | undefined,
	): Set<string> | undefined {
		if (!node.scopeCellToggles) return base;
		const resolved = new Set(base ?? []);
		for (const [id, enabled] of Object.entries(node.scopeCellToggles)) {
			if (enabled) resolved.add(id);
			else resolved.delete(id);
		}
		return resolved;
	}

	/**
	 * BT5-032: the view owns no tooltip text. It only guarantees the row starts
	 * each repaint with none — no hardcoded English, no stale text left on a
	 * recycled row — and leaves the content to the panel's configured hover
	 * builder. An explorer with no builder therefore shows nothing.
	 */
	private applyRowTooltip(row: HTMLElement, text: string): void {
		// Obsidian's native tooltip, not the browser `title` (which double-renders).
		row.removeAttribute('title');
		if (this._opts?.tooltipsEnabled === false) return;
		const placement = resolveTooltipPlacement(
			this._opts?.tooltipPlacement ?? 'right',
			row,
		);
		setTooltip(row, text, {
			placement,
		});
	}

	private applyCellTooltip(
		element: HTMLElement,
		cellId: string,
		opts: TreeViewOptions,
	): void {
		if (opts.tooltipsEnabled === false) {
			element.removeAttribute('title');
			return;
		}
		if (opts.surface) {
			applySharedCellTooltip(
				element,
				opts.surface,
				'tree',
				cellId,
				opts.tooltipPlacement,
			);
		} else {
			element.removeAttribute('title');
		}
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

	private resolveRowHighlight(id: string, opts: TreeViewOptions) {
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
		const selectionCheckbox = row.querySelector<HTMLInputElement>(
			'.vaultman-selection-checkbox',
		);
		if (selectionCheckbox) selectionCheckbox.checked = isSelected;
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

	private _stickyRowsAbove(index: number, rowHeight: number): number {
		if (!this._opts?.stickyParentRows || rowHeight <= 0) return 0;
		const sticky = stickyTreeRows(this._rows, {
			rowHeight,
			scrollTop: index * rowHeight,
			viewportHeight: this.containerEl.clientHeight,
			maxFraction: this._opts?.stickyMaxFraction,
			parentIndex: this._parentIndex ?? undefined,
			subtreeEnd: this._subtreeEnd ?? undefined,
		}).filter((s) => s.index !== index);
		return sticky.length;
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
			const stickyCount = this._stickyRowsAbove(index, rowHeight);
			target = Math.max(0, (index - stickyCount) * rowHeight);
		} else if (block === 'end') {
			target = rowBottom - viewportHeight;
		} else if (block === 'nearest') {
			const stickyCount = this._stickyRowsAbove(index, rowHeight);
			const effectiveTop = currentTop + stickyCount * rowHeight;
			if (rowTop < effectiveTop) {
				target = Math.max(0, (index - stickyCount) * rowHeight);
			} else if (rowBottom > currentBottom) {
				target = rowBottom - viewportHeight;
			}
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

	/**
	 * B-groupbody: el cuerpo del row de grupo responde como una carpeta, EN
	 * EL MOTOR. La capa sticky reutiliza `_renderRow`, asi que la copia
	 * fijada pasa por este mismo camino sin codigo propio. Sin `if (tab)`:
	 * el motor no conoce tabs ni modos; solo el camino.
	 */
	private _activateGroupRow(node: TreeNode, opts: TreeViewOptions): void {
		if (opts.onGroupActivate) opts.onGroupActivate(node.id);
		else opts.onToggle(node.id);
	}

	private _renderRow(
		node: TreeNode,
		parent: HTMLElement,
		opts: TreeViewOptions,
		rowMap: Map<string, HTMLElement> = this.rowEls,
	): HTMLElement {
		const hasChildren = (node.children?.length ?? 0) > 0;
		const isExpanded = opts.expandedIds.has(node.id);
		const highlight = this.resolveRowHighlight(node.id, opts);
		const isActive = highlight.inclusive;
		const isExcluded = highlight.exclusive;
		// BT5-038: a collapsed parent that only HIDES an active filter shows a
		// dot, not the filter decoration itself.
		const resolvedStatusDots = this.resolveRowStatusDots(node.id);
		// A collapsed operation-activity dot already occupies one of the two
		// status slots. Operation/conflict badges remain a separate channel.
		const statusDots = resolvedStatusDots.slice(0, node.bubbleDot ? 1 : 2);
		const hasFilterBubbleDot = statusDots.length > 0;
		const isWarning = opts.warningIds?.has(node.id) ?? false;
		const isEditing = opts.editingId === node.id;
		const isHighlighted = opts.searchHighlightIds?.has(node.id) ?? false;
		const isNodeSelectable = opts.isNodeSelectable?.(node) ?? true;
		const isSelected =
			isNodeSelectable && (opts.selectedIds?.has(node.id) ?? false);
		const visibleCells = this._visibleCellsForNode(node, opts.visibleCells);
		const showCaretCell = visibleCells ? visibleCells.has('caret') : true;
		const showCaret =
			(hasChildren || Boolean(node.showCaret)) &&
			showCaretCell &&
			opts.caretPosition !== 'hidden';
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
		const showOpened = visibleCells ? visibleCells.has('opened') : false;
		const showWords = visibleCells ? visibleCells.has('words') : false;
		const showFileCount = visibleCells ? visibleCells.has('file-count') : false;
		const showSub = visibleCells ? visibleCells.has('sub') : false;
		const showTasks = visibleCells ? visibleCells.has('tasks') : false;
		const showTags = visibleCells ? visibleCells.has('tags') : false;
		const nodeCells = (node.cells ?? []).filter(
			(cell) => !visibleCells || visibleCells.has(cell.id),
		);

		const row =
			rowMap.get(node.id) ??
			parent.createDiv({ cls: 'vaultman-tree-row' });
		// Rows are absolutely positioned, so document order is irrelevant and a
		// re-parent buys nothing. It costs, though: appendChild on an already
		// mounted element detaches and re-attaches it, and doing that between
		// mousedown and mouseup cancels the click. That is why the first click
		// on an explorer whose leaf was not yet active did nothing — activating
		// the leaf scheduled a viewport refresh that churned the row mid-press.
		if (row.parentElement !== parent) parent.appendChild(row);
		row.dataset.id = node.id;
		row.setAttribute('role', 'button');
		row.setAttribute('aria-label', node.label);
		row.tabIndex = 0;
		this.applyDataPath(row, node);
		row.draggable = Boolean(opts.onDragStart);
		const caretPos = opts.caretPosition ?? 'start';
		const indentMode = opts.treeIndentMode ?? 'all';
		const effectiveIndent = node.scopeIndent ?? opts.indent;

		// 1. Depth indentation:
		// When effectiveIndent is false and indentMode is 'all' or 'depth',
		// depth offset is zeroed for non-caret rows (p-nodes keep depth so
		// carets remain at their structural tier).
		const disableDepthIndent =
			effectiveIndent === false &&
			(indentMode === 'all' || indentMode === 'depth') &&
			!showCaret;

		if (disableDepthIndent) {
			row.setCssProps({
				'--depth': '0',
				'--vaultman-tree-indent-unit': '0px',
			});
		} else {
			row.setCssProps({
				'--depth': String(node.depth),
				'--vaultman-tree-indent-unit': '',
			});
		}

		// 2. Start padding (same-level parent indent on the left):
		// Carets removed from start (end or hidden), or indent toggled off
		// with mode 'all' or 'parent' for non-caret rows, removes the 24px start gutter.
		const removeStartParentIndent =
			caretPos === 'end' ||
			caretPos === 'hidden' ||
			(effectiveIndent === false &&
				!showCaret &&
				(indentMode === 'all' || indentMode === 'parent'));

		if (removeStartParentIndent) {
			row.setCssProps({
				'--vaultman-tree-row-padding-start': 'var(--size-4-1)',
			});
		} else {
			row.setCssProps({
				'--vaultman-tree-row-padding-start': '',
			});
		}

		// 3. End padding (same-level parent indent on the right):
		// When carets are placed at the end and cell_caret is active, rows without
		// carets receive end padding so right-side cells align with caret rows.
		if (caretPos === 'end' && showCaretCell && !showCaret) {
			row.setCssProps({
				'--vaultman-tree-row-padding-end':
					'calc(var(--size-4-2, 8px) + var(--vaultman-tree-caret-size, 16px) + var(--size-4-1, 4px))',
			});
		} else {
			row.setCssProps({
				'--vaultman-tree-row-padding-end': '',
			});
		}
		if (node.folderColor) {
			row.style.setProperty('--folder-color', node.folderColor);
		} else {
			row.style.removeProperty?.('--folder-color');
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
			if (node.isGroupHeader === true) {
				this._activateGroupRow(node, opts);
				return;
			}
			opts.onRowClick(node.id, event);
		};
		row.onkeydown = (event) => {
			if (event.target !== row) return;
			if (event.key !== 'Enter' && event.key !== ' ') return;
			event.preventDefault();
			if (node.isGroupHeader === true) {
				this._activateGroupRow(node, opts);
				return;
			}
			opts.onRowClick(node.id, event as unknown as MouseEvent);
		};
		row.ondblclick = opts.onRowDoubleClick || opts.onRecursiveSelect
			? (event) => {
					if (this._recursiveExpandGesture.isActivationSuppressed()) {
						event.preventDefault();
						event.stopPropagation();
						return;
					}
					// A13: dblclick in an editable field only moves the caret.
					if (isEditableDblClickTarget(event.target)) return;
					if (!hasChildren) return;
					const target = event.target instanceof Element ? event.target : null;
					if (target?.closest('.vaultman-selection-checkbox, .cell_checkbox')) {
						opts.onRecursiveSelect?.(node.id);
						return;
					}
					if (
						target?.closest(
							'.vaultman-tree-caret--start, .vaultman-tree-caret--end, .cell_caret',
						)
					) {
						opts.onRowDoubleClick?.(node.id, event);
					}
				}
			: null;
		row.onpointerenter = () => {
			this._hoveredRowId = node.id;
			this._scheduleScopePreview(node.id);
			opts.onRowHover?.(node.id, row);
		};
		row.onpointerleave = () => {
			if (this._hoveredRowId === node.id) this._hoveredRowId = null;
		};
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
		this.applyRowTooltip(row, opts.rowTooltip?.(node) ?? '');
		// A row repainted under the pointer also re-runs the hover hook, so any
		// lazily loaded value (word counts, tasks) upgrades the text in place.
		if (this._hoveredRowId === node.id) {
			this._scheduleScopePreview(node.id);
			opts.onRowHover?.(node.id, row);
		}
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
			row.toggleClass('is-active', this._activeId === node.id);
			return row;
		}
		row.empty();
		row.className = 'vaultman-tree-row';
		row.dataset.renderSignature = signature;
		// The Files explorer colors label and icon together, so a glyph color
		// always arrives as a labelColor there. The panel explorers color the
		// glyph alone — Iconic and the addon icon overrides only ever set
		// iconColor — so keying the tint off the label left every one of them
		// out of it.
		const glyphColor = node.labelColor ?? node.iconColor;
		if (glyphColor) {
			row.addClass('vaultman-glyph-colored');
			row.style.setProperty('--vaultman-glyph-color', glyphColor);
		} else {
			row.removeClass('vaultman-glyph-colored');
			row.style.removeProperty('--vaultman-glyph-color');
		}
		this.applyCoreRowClasses(row, node);
		if (typeof node.cls === 'string' && node.cls.trim()) {
			for (const c of node.cls.trim().split(/\s+/)) row.addClass(c);
		}
		row.toggleClass('is-active', this._activeId === node.id);
		if (isActive) row.addClass('is-active-filter');
		if (isExcluded) row.addClass('is-excluded-filter');
		if (highlight.hover) row.addClass('is-explorer-hover-highlight');
		if (highlight.deletion) row.addClass('is-deletion-highlight');
		if (isWarning) row.addClass('vaultman-badge-warning');
		if (isEditing) row.addClass('is-editing');

		rowMap.set(node.id, row);

		const emitSelectionCheckbox = (position: 'start' | 'end'): void => {
			if (!opts.onSelectionToggle || !isNodeSelectable) return;
			if (visibleCells && !visibleCells.has('checkbox')) return;
			const checkbox = row.createEl('input', {
				type: 'checkbox',
				cls: `metadata-input-checkbox vaultman-selection-checkbox vaultman-selection-checkbox--${position}`,
				attr: { 'aria-label': `Select ${node.label}` },
			});
			checkbox.checked = isSelected;
			// U130-p2: la seleccion se aplica en `click`, que es el unico
			// evento que trae los modificadores (el `change` del checkbox no
			// expone teclas). El `change` que sigue a cada click fisico se
			// consume sin aplicar: sin esta bandera cada click aplicaria dos
			// veces (click+change). El teclado tambien dispara `click` en el
			// checkbox, asi que este camino cubre raton y teclado.
			let selectionAppliedByClick = false;
			checkbox.onclick = (event) => {
				event.stopPropagation();
				// U121-106: soltar tras una pulsacion larga dispara igualmente
				// click+change. Sin esta guarda la seleccion recursiva se
				// desharia acto seguido con el toggle normal.
				if (this._recursiveSelectGesture.isActivationSuppressed()) {
					event.preventDefault();
					checkbox.checked = isSelected;
					selectionAppliedByClick = true;
					return;
				}
				selectionAppliedByClick = true;
				opts.onSelectionToggle?.(node.id, checkbox.checked, event);
			};
			checkbox.onchange = (event) => {
				event.stopPropagation();
				if (selectionAppliedByClick) {
					selectionAppliedByClick = false;
					return;
				}
				if (this._recursiveSelectGesture.isActivationSuppressed()) {
					checkbox.checked = isSelected;
					return;
				}
				opts.onSelectionToggle?.(node.id, checkbox.checked, undefined);
			};
			if (hasChildren && opts.onRecursiveSelect) {
				bindLongPressGesture(checkbox, this._recursiveSelectGesture, () =>
					opts.onRecursiveSelect?.(node.id),
				);
			}
		};
		if ((opts.selectionCheckboxPosition ?? 'start') === 'start') {
			emitSelectionCheckbox('start');
		}

		const emitCaret = (position: 'start' | 'end'): void => {
			if (!showCaret) return;
			const toggleEl = row.createDiv({
				cls: `vaultman-tree-toggle tree-item-icon collapse-icon vaultman-tree-caret--${position}`,
			});
			setIcon(toggleEl, 'right-triangle');
			toggleEl.setAttribute('aria-hidden', 'true');
			if (hasChildren || showCaret) {
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
		};

		if ((opts.caretPosition ?? 'start') === 'start') {
			emitCaret('start');
		}

		this.applyMutableRowState({
			row,
			hasChildren,
			showCaret,
			isExpanded,
			isHighlighted,
			isSelected,
		});

		// BT5-011: one emitter per cell so the activation path and the classic
		// path build byte-identical markup, only in a different order.
		const emitIcon = (parent: HTMLElement): void => {
			if (!node.icon || !showIcon) return;
			const iconSpan = parent.createSpan({ cls: 'vaultman-tree-icon' });
			renderIconValue(iconSpan, node.icon, node.iconColor);
		};
		const emitLabel = (parent: HTMLElement): void => {
			if (!showLabel) return;
			if (opts.renderLabel?.(parent, node)) return;
			const label = parent.createSpan({
				cls: 'vaultman-tree-label',
				text: node.label,
			});
			if (node.labelColor) label.style.color = node.labelColor;
		};
		const emitType = (parent: HTMLElement): void => {
			if (!showType || !node.typeText) return;
			parent.createSpan({
				cls: 'vaultman-tree-type nav-file-tag',
				text: node.typeText,
			});
		};
		// U121-027: the three date cells share one class, so `data-cell` gives
		// each an addressable identity — the prerequisite for patching a single
		// cell's text in place without a render.
		const emitDate = (
			parent: HTMLElement,
			text: string | undefined,
			dataCellId: string,
			tooltipCellId = dataCellId,
		): void => {
			if (!text) return;
			const span = parent.createSpan({
				cls: 'vaultman-tree-date nav-file-tag',
				text,
			});
			span.dataset.cell = dataCellId;
			this.applyCellTooltip(span, tooltipCellId, opts);
		};
		const emitWords = (parent: HTMLElement): void => {
			if (!showWords || !node.wordCountText) return;
			const cell = parent.createSpan({
				cls: 'vaultman-tree-words nav-file-tag',
				text: node.wordCountText,
			});
			this.applyCellTooltip(cell, 'words', opts);
		};
		const emitFileCount = (parent: HTMLElement): void => {
			if (!showFileCount || !node.fileCountText) return;
			const cell = parent.createSpan({
				cls: 'vaultman-tree-file-count nav-file-tag',
				text: node.fileCountText,
			});
			this.applyCellTooltip(cell, 'file-count', opts);
		};
		const emitSub = (parent: HTMLElement): void => {
			if (!showSub || !node.subCountText) return;
			const cell = parent.createSpan({
				cls: 'vaultman-tree-sub-count nav-file-tag',
				text: node.subCountText,
			});
			this.applyCellTooltip(cell, 'sub', opts);
		};
		const emitTasks = (parent: HTMLElement): void => {
			if (!showTasks || !node.tasksText) return;
			const cell = parent.createSpan({
				cls: 'vaultman-tree-tasks nav-file-tag',
				text: node.tasksText,
			});
			this.applyCellTooltip(cell, 'tasks', opts);
		};
		const emitTags = (parent: HTMLElement): void => {
			if (!showTags || !node.tagsText) return;
			const cell = parent.createSpan({
				cls: 'vaultman-tree-tags nav-file-tag',
				text: node.tagsText,
			});
			this.applyCellTooltip(cell, 'tags', opts);
		};
		const emitCount = (parent: HTMLElement): void => {
			if (!showCount || node.count == null || node.count <= 0) return;
			const cell = parent.createSpan({
				cls: 'vaultman-tree-count',
				text: String(node.count),
			});
			this.applyCellTooltip(cell, 'count', opts);
		};
		const cellEmitters: Record<string, (parent: HTMLElement) => void> = {
			icon: emitIcon,
			name: emitLabel,
			text: emitLabel,
			path: emitLabel,
			type: emitType,
			ext: emitType,
			mtime: (parent) =>
				emitDate(parent, showMtime ? node.mtimeText : '', 'mtime'),
			updated: (parent) =>
				emitDate(parent, showMtime ? node.mtimeText : '', 'mtime', 'updated'),
			ctime: (parent) =>
				emitDate(parent, showCtime ? node.ctimeText : '', 'ctime'),
			installed: (parent) =>
				emitDate(parent, showCtime ? node.ctimeText : '', 'ctime', 'installed'),
			opened: (parent) =>
				emitDate(parent, showOpened ? node.openedText : '', 'opened'),
			words: emitWords,
			'file-count': emitFileCount,
			sub: emitSub,
			tasks: emitTasks,
			tags: emitTags,
			count: emitCount,
		};
		// Activation mode lays every configurable cell out as a row sibling, so
		// the label can genuinely sit after a value cell. It stays the flexible
		// element wherever it lands; overflowing cells clip like any toolbar.
		const activationOrder = opts.cellRenderOrder
			? [
					...opts.cellRenderOrder,
					...[...(visibleCells ?? [])].filter(
						(id) => !opts.cellRenderOrder?.includes(id),
					),
				]
			: undefined;
		const usesActivationOrder = Boolean(activationOrder?.length) && !isEditing;
		if (usesActivationOrder) {
			row.addClass('vaultman-tree-row--activation-order');
			const emitted = new Set<(parent: HTMLElement) => void>();
			for (const cellId of activationOrder ?? []) {
				const emit = cellEmitters[cellId];
				// Aliases (name/text/path) share one emitter; never emit twice.
				if (!emit || emitted.has(emit)) continue;
				emitted.add(emit);
				emit(row);
			}
		}

		// Icon
		if (!usesActivationOrder && node.icon && showIcon) {
			const iconSpan = row.createSpan({ cls: 'vaultman-tree-icon' });
			renderIconValue(iconSpan, node.icon, node.iconColor);
		}

		// Label / Input
		if (isEditing && showLabel) {
			const initialValue = opts.getEditingValue
				? opts.getEditingValue(node)
				: (node.label === 'empty' ? '' : node.label);
			const input = row.createEl('input', {
				cls: 'vaultman-tree-input',
				value: initialValue,
			});
			if (opts.getEditingPlaceholder) {
				const placeholder = opts.getEditingPlaceholder(node);
				if (placeholder) input.placeholder = placeholder;
			}
			opts.onAttachInput?.(node, input);

			let isCommitted = false;
			input.addEventListener('click', (e) => e.stopPropagation());
			input.addEventListener('keydown', (e) => {
				if (e.key === 'Enter') {
					if (
						isCommitted ||
						(
							input as HTMLInputElement & {
								_vaultmanCommitted?: boolean;
							}
						)._vaultmanCommitted
					)
						return;
					isCommitted = true;
					opts.onRename?.(node.id, input.value);
				} else if (e.key === 'Escape') {
					if (
						isCommitted ||
						(
							input as HTMLInputElement & {
								_vaultmanCommitted?: boolean;
							}
						)._vaultmanCommitted
					)
						return;
					isCommitted = true;
					opts.onCancelRename?.();
				}
			});
			input.addEventListener('blur', () => {
				if (
					isCommitted ||
					(
						input as HTMLInputElement & {
							_vaultmanCommitted?: boolean;
						}
					)._vaultmanCommitted
				)
					return;
				// Prevent blur from firing if we are already re-rendering
				if (this._opts?.editingId === node.id) {
					isCommitted = true;
					if (opts.onBlurRename) {
						opts.onBlurRename(node.id, input.value);
					} else {
						opts.onCancelRename?.();
					}
				}
			});

			if (opts.onOpenRichRename) {
				const btn = row.createSpan({ cls: 'vaultman-tree-rename-rich-btn clickable-icon', attr: { 'aria-label': 'Open detailed rename' } });
				setIcon(btn, 'lucide-maximize-2');
				btn.addEventListener('mousedown', (e) => e.preventDefault()); // prevent input blur
				btn.addEventListener('click', (e) => {
					e.stopPropagation();
					opts.onOpenRichRename?.(node.id, input.value);
				});
			}
		} else if (showLabel && !usesActivationOrder) {
			if (
				node.counterRange &&
				opts.onCounterRangeCommit &&
				this._editingCounterRange?.id === node.id
			) {
				const range = node.counterRange;
				const mode = this._editingCounterRange?.mode ?? 'adjust';
				const editor = row.createSpan({
					cls: 'vaultman-counter-range-editor',
					attr: { role: 'group', 'aria-label': node.label },
				});
				editor.addEventListener('click', (event) => event.stopPropagation());
				editor.addEventListener('pointerdown', (event) => event.stopPropagation());
				editor.addEventListener('mousedown', (event) => event.stopPropagation());
				const createInput = (value: number, label: string): HTMLInputElement => {
					const domain = node.counterDomain;
					const input = editor.createEl('input', {
						type: 'number',
						value: String(value),
						attr: {
							'aria-label': label,
							min: String(domain?.min ?? 0),
							...(domain ? { max: String(domain.max) } : {}),
							step: '1',
						},
					});
					const updateWidth = (): void => {
						const len = Math.max(5, input.value.length + 2);
						input.style.inlineSize = `${len}ch`;
					};
					updateWidth();
					input.addEventListener('input', updateWidth);
					input.addEventListener('click', (event) => event.stopPropagation());
					return input;
				};
				const loInput = createInput(
					range.lo,
					opts.counterRangeBoundLabel?.('lower') ?? `${node.label} lower bound`,
				);
				editor.createSpan({ cls: 'vaultman-counter-range-separator', text: '–' });
				const hiInput = createInput(
					range.hi,
					opts.counterRangeBoundLabel?.('upper') ?? `${node.label} upper bound`,
				);
				const validateLo = (): void => {
					const value = Number(loInput.value);
					if (mode === 'slice') {
						if (!Number.isFinite(value) || value < node.counterRange!.lo) {
							loInput.classList.add('is-invalid');
							loInput.title = translate('group.counter.slice_under_min');
						} else if (Number.isFinite(Number(hiInput.value)) && value > Number(hiInput.value)) {
							loInput.classList.add('is-invalid');
							loInput.title = translate('group.counter.slice_above_max');
						} else {
							loInput.classList.remove('is-invalid');
							loInput.removeAttribute('title');
						}
					} else {
						const min = node.counterDomain?.min ?? 0;
						if (!Number.isFinite(value) || value < min) {
							loInput.classList.add('is-invalid');
							loInput.title = translate('group.counter.adjust_under_min');
						} else if (Number.isFinite(Number(hiInput.value)) && value > Number(hiInput.value)) {
							loInput.classList.add('is-invalid');
							loInput.title = translate('group.counter.adjust_above_max');
						} else {
							loInput.classList.remove('is-invalid');
							loInput.removeAttribute('title');
						}
					}
				};
				const validateHi = (): void => {
					const value = Number(hiInput.value);
					if (mode === 'slice') {
						if (!Number.isFinite(value) || value > node.counterRange!.hi) {
							hiInput.classList.add('is-invalid');
							hiInput.title = translate('group.counter.slice_above_max');
						} else if (Number.isFinite(Number(loInput.value)) && value < Number(loInput.value)) {
							hiInput.classList.add('is-invalid');
							hiInput.title = translate('group.counter.slice_under_min');
						} else {
							hiInput.classList.remove('is-invalid');
							hiInput.removeAttribute('title');
						}
					} else {
						const max = node.counterDomain?.max;
						if (!Number.isFinite(value) || (max !== undefined && value > max)) {
							hiInput.classList.add('is-invalid');
							hiInput.title = translate('group.counter.adjust_above_max');
						} else if (Number.isFinite(Number(loInput.value)) && value < Number(loInput.value)) {
							hiInput.classList.add('is-invalid');
							hiInput.title = translate('group.counter.adjust_under_min');
						} else {
							hiInput.classList.remove('is-invalid');
							hiInput.removeAttribute('title');
						}
					}
				};
				loInput.addEventListener('input', () => {
					validateLo();
					validateHi();
				});
				hiInput.addEventListener('input', () => {
					validateLo();
					validateHi();
				});
				let done = false;
				const commit = (): void => {
					if (done) return;
					validateLo();
					validateHi();
					if (
						loInput.classList.contains('is-invalid') ||
						hiInput.classList.contains('is-invalid')
					) {
						return;
					}
					const result = validateCounterRangeEdit(
						{ id: range.id, lo: loInput.value, hi: hiInput.value },
						[],
						node.counterDomain,
					);
					if (!result.ok) {
						return;
					}
					const accepted = opts.onCounterRangeCommit?.(node.id, result.range, mode);
					if (accepted === false) return;
					done = true;
					this._editingCounterRange = null;
					this._editingCounterRangeId = null;
					this._renderWindow();
				};
				const cancel = (): void => {
					if (done) return;
					done = true;
					this._editingCounterRange = null;
					this._editingCounterRangeId = null;
					this._renderWindow();
				};
				for (const input of [loInput, hiInput]) {
					input.addEventListener('keydown', (event) => {
						if (event.isComposing) return;
						if (event.key === 'Enter') {
							event.preventDefault();
							commit();
						}
						if (event.key === 'Escape') {
							event.preventDefault();
							cancel();
						}
					});
				}
				editor.addEventListener('focusout', (event) => {
					const related = event.relatedTarget;
					if (related instanceof Node && editor.contains(related)) {
						return;
					}
					queueMicrotask(() => {
						if (!done && !editor.contains(editor.ownerDocument.activeElement)) commit();
					});
				});
				row.createSpan({
					cls: 'vaultman-cell-text-status',
					text: mode === 'slice' ? 'Slice' : 'Adjust',
				});
				return row;
			}
			if (opts.renderLabel?.(row, node)) {
				// Custom renderer emitted the complete label cell.
			} else {
				const label = row.createSpan({
					cls: 'vaultman-tree-label',
					text: node.label,
				});
				if (node.labelColor) label.style.color = node.labelColor;
			}
		}

		if (!usesActivationOrder) emitType(row);

		// Multi-zone Badges container
		if (
			(showMtime && node.mtimeText) ||
			(showCtime && node.ctimeText) ||
			(showOpened && node.openedText) ||
			(showWords && node.wordCountText) ||
			(showFileCount && node.fileCountText) ||
			// U121-100: `sub` faltaba en la guarda, asi que un nodo cuyo unico
			// contenido fuese el contador de hijos ni siquiera creaba la zona.
			(showSub && node.subCountText) ||
			(showTasks && node.tasksText) ||
			(showTags && node.tagsText) ||
			(showCount && node.count != null && node.count > 0) ||
			(node.badges && node.badges.length > 0) ||
			nodeCells.length > 0 ||
			node.bubbleDot ||
			hasFilterBubbleDot
		) {
			const badgeZone = row.createDiv({ cls: 'vaultman-tree-badge-zone' });

			if (!usesActivationOrder) {
				emitDate(
					badgeZone,
					showMtime ? node.mtimeText : '',
					'mtime',
					visibleCells?.has('updated') ? 'updated' : 'mtime',
				);
				emitDate(
					badgeZone,
					showCtime ? node.ctimeText : '',
					'ctime',
					visibleCells?.has('installed') ? 'installed' : 'ctime',
				);
				emitDate(badgeZone, showOpened ? node.openedText : '', 'opened');
				emitWords(badgeZone);
				emitFileCount(badgeZone);
				// U121-100: `emitSub` estaba definido y registrado en el mapa del
				// camino ordenado, pero NADIE lo llamaba en el marcado clasico, que
				// es el que usan propScene y tagScene en arbol.
				emitSub(badgeZone);
				emitTasks(badgeZone);
				emitTags(badgeZone);
			}

			for (const cell of nodeCells) {
				this.renderNodeCell(badgeZone, node.id, cell, opts);
			}

			// BT5-017: one small dot standing in for activity hidden by the
			// collapse. Purely descriptive — never a target, never focusable.
			if (node.bubbleDot) {
				const dotEl = badgeZone.createSpan({
					cls: `vaultman-tree-bubble-dot vaultman-tree-bubble-dot--${node.bubbleDot.color}`,
				});
				const description = opts.bubbleDotLabel?.(node.bubbleDot);
				if (description) {
					const placement = resolveTooltipPlacement(
						opts.tooltipPlacement ?? 'right',
						dotEl,
					);
					setTooltip(dotEl, description, {
						placement,
					});
					dotEl.setAttribute('role', 'img');
					dotEl.setAttribute('aria-label', description);
				}
			}

			// U121-013: collapsed provider state is projected through the same
			// generic channels as row highlight. Status always precedes operation
			// badges and is bounded independently from them.
			for (const dot of statusDots) {
				const dotEl = badgeZone.createSpan({
					cls: `vaultman-tree-bubble-dot vaultman-tree-bubble-dot--${dot.tone}`,
				});
				const description =
					opts.statusDotLabel?.(dot) ?? opts.filterBubbleLabel;
				if (description) {
					dotEl.setAttribute('role', 'img');
					dotEl.setAttribute('aria-label', description);
					const placement = resolveTooltipPlacement(
						opts.tooltipPlacement ?? 'right',
						dotEl,
					);
					setTooltip(dotEl, description, {
						placement,
					});
				}
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
					const badgeHint = badge.tooltip ?? badge.text;
					if (badgeHint) {
						const placement = resolveTooltipPlacement(
							opts.tooltipPlacement ?? 'right',
							bEl,
						);
						setTooltip(bEl, badgeHint, {
							placement,
						});
					}
					if (badge.text && !badge.icon) bEl.setText(badge.text);
					// Double-click to undo this specific queue operation
					const releasesNode =
						badge.releasePath !== undefined && opts.onBadgeRelease !== undefined;
					if (
						badge.queueIndex !== undefined &&
						(opts.onBadgeDoubleClick || releasesNode)
					) {
						const cancelMode = normalizeBadgeCancelClickMode(
							opts.badgeCancelClickMode,
						);
						bEl.addClass('is-undoable');
						bEl.setAttribute(
							'title',
							`${badge.text ?? ''} — ${badgeCancelInteractionLabel(cancelMode)}`,
						);
						attachBadgeCancelInteraction(bEl, cancelMode, () => {
							if (releasesNode) {
								opts.onBadgeRelease!(badge.queueIndex!, badge.releasePath!);
								return;
							}
							opts.onBadgeDoubleClick?.(badge.queueIndex!);
						});
					}
				}
			}

			// Frequency counter second
			if (!usesActivationOrder) emitCount(badgeZone);
		}
		if (opts.selectionCheckboxPosition === 'end') emitSelectionCheckbox('end');
		if (opts.caretPosition === 'end') emitCaret('end');
		const indentAnchor = row.querySelector<HTMLElement>(
			'.vaultman-selection-checkbox--start, .vaultman-tree-icon, .vaultman-tree-label, .vaultman-tree-input',
		);
		if (indentAnchor) {
			const isRtl = this._treeWindow().getComputedStyle(row).direction === 'rtl';
			const start = isRtl
				? row.clientWidth - indentAnchor.offsetLeft - indentAnchor.offsetWidth
				: indentAnchor.offsetLeft;
			row.style.setProperty('--vaultman-tree-guide-start', `${Math.max(0, start)}px`);
		} else {
			row.style.removeProperty('--vaultman-tree-guide-start');
		}

		return row;
	}

	private renderNodeCell(
		parent: HTMLElement,
		nodeId: string,
		cell: TreeNodeCell,
		opts: TreeViewOptions,
	): void {
		if (cell.kind === 'cell_hover') {
			const hoverZone = parent.createDiv({
				cls: 'vaultman-tree-hover-badge-zone',
				attr: { 'aria-label': 'Row actions' },
			});
			for (const action of cell.actions) {
				const actionEl = hoverZone.createEl('button', {
					cls: 'clickable-icon vaultman-cell-hover-action',
					attr: {
						type: 'button',
						'aria-label': action.label,
						title: action.label,
					},
				});
				setIcon(actionEl, action.icon);
				actionEl.onclick = (event) => {
					event.preventDefault();
					event.stopPropagation();
					if (!cell.disabled) {
						opts.onCellClick?.(nodeId, `${cell.id}:${action.id}`, event);
					}
				};
			}
			return;
		}
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
		toggleEl.toggleClass('is-mixed', cell.mixed === true);
			toggleEl.setAttribute('aria-label', cell.label);
			const togglePlacement = resolveTooltipPlacement(
				opts.tooltipPlacement ?? 'right',
				toggleEl,
			);
			setTooltip(toggleEl, cell.label, {
				placement: togglePlacement,
			});
			const input = toggleEl.createEl('input', {
				cls: 'vaultman-addon-toggle-input',
			});
			input.setAttribute('type', 'checkbox');
			input.setAttribute('tabindex', '0');
			input.setAttribute('aria-label', cell.label);
		input.checked = cell.enabled;
		input.disabled = cell.disabled === true;
		input.indeterminate = cell.mixed === true;
			handleClick(toggleEl);
			return;
		}

		if (cell.kind === 'toggle' || cell.appearance === 'badge') {
			const badgeEl = parent.createSpan({
				cls: 'vaultman-badge vaultman-addon-cell',
			});
		badgeEl.addClass('is-solid');
		if (cell.kind === 'toggle' && cell.mixed === true) {
			badgeEl.addClass('is-mixed');
		}
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
			const badgePlacement = resolveTooltipPlacement(
				opts.tooltipPlacement ?? 'right',
				badgeEl,
			);
			setTooltip(badgeEl, cell.label, {
				placement: badgePlacement,
			});
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
		const actionPlacement = resolveTooltipPlacement(
			opts.tooltipPlacement ?? 'right',
			actionEl,
		);
		setTooltip(actionEl, cell.label, {
			placement: actionPlacement,
		});
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
