// src/components/UnifiedTreeView.ts
import { Platform, setIcon, setTooltip } from 'obsidian';
import type { TooltipPlacement } from 'obsidian';
import { translate } from '../../i18n/index';
import { bindTreeKeyboardBoundary } from '../../logic/logicTreeKeyboardBoundary';
import { flatTreeLabelTarget } from '../../logic/logicTreeFlatLabel';
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
	buildVariableTreeWindow,
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
	applyTextCase,
	resolveTextCase,
	projectTextCaseElement,
	type TextCaseOption,
} from '../../logic/logicTextCaseProjection';
import {
	NATIVE_TREE_PROFILES,
	resolveNativeCompatMode,
	type NativeCompatPolicy,
	type NativeSceneId,
} from '../../logic/logicNativeTreeCompat';
import {
	handleTreeKeyboardKey,
	isEditableKeyboardTarget,
	type TreeKeyboardCallbacks,
	type TreeKeyboardExtensions,
	type TreeKeyboardModifiers,
	type TreeKeyboardRow,
	type TreeKeyboardState,
} from '../../logic/logicTreeKeyboard';
import {
	nextLetterTarget,
	isLetterJumpKey,
	rowOrderFingerprint,
	runNavcoKeyOverrides,
	shouldLetterJump,
	type NavcoPort,
	type TreeLetterCursor,
} from '../../logic/logicTreeNavigation';
import {
	readObserverEntryHeight,
	TreeHeightIndex,
} from '../../logic/logicTreeHeightIndex';
import { onBridgeGeometryInvalidated } from '../../services/serviceNativeBridge';
import { getNativeRootNthTokens } from '../../logic/logicNativeVirtualSelectors';
import type { ExplorerCellMounts } from '../../services/serviceExplorerCellMounts';
import { hasNativeFolderIdentity, syncNativeTreeIndentation } from '../../logic/logicNativeTreeGeometry';
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

export function setRowCssProps(
	row: HTMLElement,
	props: Record<string, string>,
): void {
	if (
		typeof (row as { setCssProps?: (props: Record<string, string>) => void })
			.setCssProps === 'function'
	) {
		(row as { setCssProps: (props: Record<string, string>) => void }).setCssProps(
			props,
		);
	} else {
		for (const [key, value] of Object.entries(props)) {
			if (value) {
				row.style.setProperty(key, value);
			} else {
				row.style.removeProperty(key);
			}
		}
	}
}

export interface TreeViewOptions {
	/** Public provider contributions, consumed independently of row signatures. */
	cellContributions?: ExplorerCellMounts;
	contributedIconScope?: 'all' | 'files' | 'folders' | 'custom';
	nativeRootOrdinal?: (path: string) => number | undefined;
	nativeRootColors?: ReadonlyMap<string, string>;
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
	/**
	 * U130 native polish: homologous native scene for this tree (`files`,
	 * `tags`, `props`, `snippets`, `plugins`). Absent/null = unbridged
	 * (e.g. `content`, which has no native counterpart): no native classes
	 * are emitted and no data-type is ever forged.
	 */
	nativeScene?: NativeSceneId | null;
	/**
	 * U130 native polish: per-boundary compatible/locked policy. Only the
	 * `tree` boundary is read here; toolbar/container/menu are applied by
	 * their own hosts from the same object. Absent = all compatible.
	 */
	nativeCompat?: NativeCompatPolicy;
	/**
	 * U130 native polish: resolved per-cell display case (scene + global
	 * already merged by the container). Display only: labels are transformed
	 * at emit time, identities/inputs never.
	 */
	textCase?: Readonly<Record<string, TextCaseOption>>;
	/** Owner-local extra key bindings for this tree instance. */
	keyboardExtensions?: TreeKeyboardExtensions;
	/**
	 * U130 tree Navco port: smallest typed key/action override seam.
	 * `keyOverrides` run BEFORE `keyboardExtensions` (and native); `true`
	 * consumes. `letterJump` gates printable glyphs on the scene's EFFECTIVE
	 * sibling sort (name asc/desc only). Absent = exact native behavior.
	 */
	navco?: NavcoPort;
	/**
	 * Enter/Space activation with real modifier flags. Absent falls back to
	 * `onRowClick(id)` with NO event — a KeyboardEvent is never cast to a
	 * MouseEvent.
	 */
	onKeyboardActivate?: (id: string, modifiers: TreeKeyboardModifiers) => void;
	/** Shift+Up/Down additive range. Absent = focus moves, selection untouched. */
	onRangeSelect?: (anchorId: string, focusId: string) => void;
	/** Shift+Up/Down native additive selection step (previous + current). */
	onAdditiveSelect?: (previousId: string, currentId: string) => void;
	/** Escape. Absent = release DOM focus. Returns false if nothing was selected. */
	onClearSelection?: () => boolean | void;
	/** F2. The scene's own rename affordance. */
	onRenameRequest?: (id: string) => void;
	/** Whether rename is available for this row. Absent = unavailable. */
	canRenameNode?: (id: string) => boolean;
	/** Delete (Win/Linux) or Mod+Backspace (macOS) deletion request. */
	onDeleteRequest?: (id: string) => void;
	/** ArrowLeft on root-level file: collapse all folders. */
	onCollapseAll?: () => void;
	/** Mod+ArrowDown/Up: open file in background without moving active focus. */
	onModStepOpen?: (id: string) => void;
	/** Visual indicator whether a node is in cut state (.is-cut class). */
	isItemCut?: (id: string) => boolean;
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
	private readonly _markupVersion = 3;
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
	private _scopePreviewDepthBounds = new Map<
		number,
		{ first: number; last: number }
	>();
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
	private _nativeRootOrdinals = new Map<string, number>();
	private _activeId: string | null = null;
	private readonly _overscan = 24;
	/**
	 * U130 native polish: shared variable-height index. The estimate is the
	 * density row height; mounted slots report real entry heights through
	 * one ResizeObserver. Every geometry consumer (window, spacer, reveal,
	 * sticky, scope preview, drawer) reads this same index.
	 */
	private readonly _heightIndex = new TreeHeightIndex(27);
	private _geometryUnsubscribe: (() => void) | null = null;
	private _rowObserver: ResizeObserver | null = null;
	private _containerWidth = 0;
	private _keyboard: TreeKeyboardState = { rows: [], focusedId: null, anchorId: null };
	/** Owner-local letter-jump cursor (previous jump for first/next/wrap). */
	private _letterPrevious: TreeLetterCursor | null = null;
	/** Scope+order fingerprint the cursor was produced for; change resets it. */
	private _letterScopeFp: string | null = null;
	private _letterOrderFp: string | null = null;
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
		const leadingSlots = opts.nativeScene ? NATIVE_TREE_PROFILES[opts.nativeScene].rootLeadingSlots ?? 0 : 0;
		const nativeRoots = opts.nodes.filter(node => {
			const path = this.nodeDataPath(node);
			return !path || !path.includes('/');
		});
		this._nativeRootOrdinals = new Map(nativeRoots.map((node, index) => [this.nodeDataPath(node) ?? node.id, index + 1 + leadingSlots]));
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
		const anchor = this._heightIndex.anchorForOffset(scrollTop);
		this._heightIndex.setEstimate(this.rowHeight());
		const modelStarted = performance.now();
		const flattened = flattenVisibleTreeWithChain(
			opts.nodes,
			opts.expandedIds,
		);
		this._rows = flattened.rows;
		this._heightIndex.setRows(this._rows.map((row) => row.id));
		this._rebuildScopePreviewIndex();
		this._parentIndex = flattened.parentIndex;
		this._subtreeEnd = flattened.subtreeEnd;
		this._indexById = this._buildIndex(this._rows);
		this._ensureScaffold();
		this._applyNativeTreeCompat();
		this._syncKeyboardModel();
		if (this._spacerEl) {
		this._spacerEl.style.height = `${this._heightIndex.totalHeight()}px`;
		}
		const restoredAnchor = anchor
			? this._heightIndex.offsetForAnchor(anchor)
			: null;
		this.containerEl.scrollTop = Math.min(
			restoredAnchor ?? scrollTop,
			Math.max(
				0,
				this._heightIndex.totalHeight() - this.containerEl.clientHeight,
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
		for (const rows of [this.rowEls, this.stickyRowEls]) {
			for (const [nodeId, active] of [[previousId, false], [id, true]] as const) {
				if (!nodeId) continue;
				const row = rows.get(nodeId);
				row?.toggleClass('is-active', active);
				row?.querySelector<HTMLElement>('.vaultman-tree-self')?.toggleClass('is-active', active);
			}
		}
	}

	get focusedId(): string | null {
		return this._keyboard.focusedId;
	}

	setFocusedId(id: string | null, reveal = true): void {
		const prevId = this._keyboard.focusedId;
		this._keyboard = { ...this._keyboard, focusedId: id, anchorId: id };
		// Manual focus moves break the letter-jump chain; the letter path
		// assigns `_letterPrevious` after focusing, so this reset is safe.
		this._letterPrevious = null;
		this._letterScopeFp = null;
		for (const rows of [this.rowEls, this.stickyRowEls]) {
			for (const [nodeId, focused] of [[prevId, false], [id, true]] as const) {
				if (!nodeId) continue;
				const row = rows.get(nodeId);
				row?.toggleClass('has-focus', focused);
				row?.querySelector<HTMLElement>('.vaultman-tree-self')?.toggleClass('has-focus', focused);
			}
		}
		if (id && reveal) {
			this.scrollToId(id, 'nearest', 'auto');
		}
	}

	destroy(): void {
		this._keyboardBoundaryOff?.();
		this._keyboardBoundaryOff = null;
		for (const row of [...this.rowEls.values(), ...this.stickyRowEls.values()]) this._opts?.cellContributions?.unbind(row);
		this._recursiveExpandGesture.cancel();
		this.setScopePickMode(null);
		this._geometryUnsubscribe?.();
		this._geometryUnsubscribe = null;
		this._rowObserver?.disconnect();
		this._rowObserver = null;
		this.containerEl.removeEventListener('keydown', this._onTreeKeyDown);
		this.containerEl.removeEventListener('focusin', this._onTreeFocusIn);
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
		this._scopePreviewDepthBounds.clear();
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
		if (this._scopePreviewDepthBounds.size === 0 && this._rows.length > 0) {
			this._rebuildScopePreviewIndex();
		}
		const contentEl =
			this._contentEl ??
			this.containerEl.querySelector<HTMLElement>(
				'.vaultman-tree-virtual-content',
			);
		const overlay = this._ensureScopePreviewElement();
		if (!mode || !nodeId || !this._rows.length || !contentEl) {
			this._clearScopePreview();
			return;
		}
		const hoveredIndex =
			this._indexById.get(nodeId) ??
			-1;
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
		const rowHeight = this._heightIndex.getEstimate();
		const viewportHeight = this.containerEl.clientHeight;
		const scrollTop = this.containerEl.scrollTop;
		const firstVisible = this._heightIndex.indexForOffset(scrollTop);
		const visibleStartIndex = Math.max(0, firstVisible - this._overscan);
		let lastVisible = firstVisible;
		while (
			lastVisible + 1 < this._rows.length &&
			this._heightIndex.topForIndex(lastVisible + 1) < scrollTop + viewportHeight
		) {
			lastVisible += 1;
		}
		const visibleEndIndex = Math.min(
			this._rows.length,
			lastVisible + 1 + this._overscan,
		);
		const geometry = scopePreviewGeometry({
			rows: [],
			rowCount: this._rows.length,
			rowAt: (index) => this._scopePreviewRowAt(index),
			parentIndex: this._parentIndex ?? [],
			subtreeEnd: this._subtreeEnd ?? [],
			hoveredIndex,
			mode,
			rowHeight,
			scrollTop,
			viewportHeight,
			contentWidth: this.containerEl.clientWidth,
			rowInset,
			rowPaddingStart,
			leafRowPaddingStart,
			indentUnit,
			indentEnabled: this._opts?.indent !== false,
			fullWidthRows: this._opts?.nativeScene === 'files' && this._nativeTreeEnabled(),
			levelBounds: this._scopePreviewDepthBounds,
			visibleStartIndex,
			visibleEndIndex,
			topAt: (index) => this._heightIndex.topForIndex(index),
			heightAt: (index) => this._heightIndex.heightForIndex(index),
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
		return mode === 'parent' || mode === 'level' || mode === 'drill'
			? mode
			: this._scopePickMode;
	}

	private _rebuildScopePreviewIndex(): void {
		this._scopePreviewDepthBounds.clear();
		for (let index = 0; index < this._rows.length; index += 1) {
			const depth = this._rows[index]?.depth;
			if (depth === undefined) continue;
			const bounds = this._scopePreviewDepthBounds.get(depth);
			if (bounds) bounds.last = index;
			else this._scopePreviewDepthBounds.set(depth, { first: index, last: index });
		}
	}

	private _scopePreviewRowAt(index: number): ScopePreviewRow | undefined {
		const node = this._rows[index];
		if (!node) return undefined;
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
		const anchor = this._heightIndex.anchorForOffset(this.containerEl.scrollTop);
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

		this._heightIndex.setRows(this._rows.map((row) => row.id));
		this._syncKeyboardModel();
		if (this._spacerEl) {
			this._spacerEl.style.height = `${this._heightIndex.totalHeight()}px`;
		}
		const restoredAnchor = anchor
			? this._heightIndex.offsetForAnchor(anchor)
			: null;
		this.containerEl.scrollTop = Math.min(
			restoredAnchor ?? this.containerEl.scrollTop,
			Math.max(
				0,
				this._heightIndex.totalHeight() - this.containerEl.clientHeight,
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
		const rowHeight = this._heightIndex.getEstimate();
		if (rowHeight <= 0) return;
		const survivors = stickyTreeRows(this._rows, {
			rowHeight,
			scrollTop: this._heightIndex.topForIndex(index),
			viewportHeight: this.containerEl.clientHeight,
			maxFraction: this._opts?.stickyMaxFraction,
			parentIndex: this._parentIndex ?? undefined,
			subtreeEnd: this._subtreeEnd ?? undefined,
			variable: this._heightIndex,
		}).filter((sticky) => sticky.index !== index);
		const stackHeight = survivors.reduce(
			(acc, sticky) => acc + this._heightIndex.heightForIndex(sticky.index),
			0,
		);
		this.containerEl.scrollTop = Math.max(
			0,
			this._heightIndex.topForIndex(index) - stackHeight,
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

		for (const node of removedNodes) {
			this._indexById.delete(node.id);
			this._heightIndex.deleteKey(node.id);
		}
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
		if (changed && this._opts?.expansionAnimation) {
			this._startStructureAnimation();
			this.containerEl.addClass('vaultman-tree-drawer-animating');
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

		const drawerTop = this._heightIndex.topForIndex(rootIdx + 1);
		const fullHeight =
			this._heightIndex.topForIndex(
				Math.min(this._rows.length, rootIdx + 1 + insertedCount),
			) - drawerTop;

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
			rowEl.style.top = `${this._heightIndex.topForIndex(i) - drawerTop}px`;
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
					this._unobserveRow(child);
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
		if (this._spacerEl && this.containerEl.contains(this._spacerEl)) {
			this._ensureRowObserver();
			return;
		}
		this.containerEl.removeEventListener('scroll', this._onScroll);
		for (const row of this.rowEls.values()) this._unobserveRow(row);
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
		// U130 native polish: one owner-local keyboard boundary for this tree
		// instance. Container-level, never document-global.
		this.containerEl.addEventListener('keydown', this._onTreeKeyDown);
		this._keyboardBoundaryOff = bindTreeKeyboardBoundary(this.containerEl, event => this._onTreeKeyDown(event, true));
		this.containerEl.addEventListener('focusin', this._onTreeFocusIn);
		this._containerWidth = this.containerEl.clientWidth;
		this._ensureRowObserver();
		// Theme/font changes arrive through the bridge rebuild, not scroll.
		if (!this._geometryUnsubscribe) {
			const doc = this.containerEl.ownerDocument;
			if (doc) {
				this._geometryUnsubscribe = onBridgeGeometryInvalidated(doc, () => {
					this.invalidateRowGeometry();
				});
			}
		}
	}

	/**
	 * U130 native polish: a single ResizeObserver for mounted geometry only.
	 * Row slots report their grouped entry heights (no per-row sync reads);
	 * the container itself reports width changes, which invalidate cached
	 * geometry while keeping the anchor node and its viewport position.
	 */
	private _ensureRowObserver(): void {
		if (this._rowObserver) return;
		if (typeof ResizeObserver === 'undefined') return;
		const observer = new ResizeObserver((entries) => {
			const anchor = this._heightIndex.anchorForOffset(this.containerEl.scrollTop);
			let geometryMoved = false;
			for (const entry of entries) {
				const target = entry.target;
				if (
					!(target instanceof HTMLElement) ||
					target.ownerDocument !== this.containerEl.ownerDocument ||
					!target.isConnected
				) {
					observer.unobserve(target);
					continue;
				}
				if (target === this.containerEl) {
					this._handleContainerResize();
					continue;
				}
				const key = target.dataset.id;
				if (!key) continue;
				if (this._heightIndex.setMeasured(key, readObserverEntryHeight(entry))) {
					geometryMoved = true;
				}
			}
			if (geometryMoved) {
				if (anchor) {
					const restored = this._heightIndex.offsetForAnchor(anchor);
					if (restored !== null) this.containerEl.scrollTop = restored;
				}
				if (this._spacerEl) {
					this._spacerEl.style.height = `${this._heightIndex.totalHeight()}px`;
				}
				this._scheduleWindowRender();
			}
		});
		this._rowObserver = observer;
		observer.observe(this.containerEl);
	}

	private _observeRow(rowEl: HTMLElement): void {
		if (!this._nativeTreeEnabled()) {
			this._unobserveRow(rowEl);
			return;
		}
		this._rowObserver?.observe(rowEl, { box: 'border-box' });
	}

	private _invalidateRowMeasurements(): void {
		this._heightIndex.invalidateAll();
		// A cache reset needs fresh entries even when natural sizes are unchanged.
		for (const row of this.rowEls.values()) {
			this._unobserveRow(row);
			this._observeRow(row);
		}
	}

	private _unobserveRow(rowEl: HTMLElement): void {
		this._rowObserver?.unobserve(rowEl);
	}

	private _handleContainerResize(): void {
		const width = this.containerEl.clientWidth;
		if (width === this._containerWidth) return;
		// Width reflows wrapping/padding: drop cached heights but keep the
		// anchor node exactly where the viewport points.
		const anchor = this._heightIndex.anchorForOffset(this.containerEl.scrollTop);
		this._containerWidth = width;
		this._invalidateRowMeasurements();
		if (anchor) {
			const restored = this._heightIndex.offsetForAnchor(anchor);
			if (restored !== null) this.containerEl.scrollTop = restored;
		}
		if (this._spacerEl) {
			this._spacerEl.style.height = `${this._heightIndex.totalHeight()}px`;
		}
		this._scheduleWindowRender();
	}

	/** Invalidate cached row geometry, e.g. after a theme/font change. */
	invalidateRowGeometry(): void {
		syncNativeTreeIndentation(this.containerEl, this._opts?.nativeScene === 'files' && this._nativeTreeEnabled());
		const anchor = this._heightIndex.anchorForOffset(this.containerEl.scrollTop);
		this._heightIndex.setEstimate(this.rowHeight());
		this._invalidateRowMeasurements();
		if (anchor) {
			const restored = this._heightIndex.offsetForAnchor(anchor);
			if (restored !== null) this.containerEl.scrollTop = restored;
		}
		if (this._spacerEl) {
			this._spacerEl.style.height = `${this._heightIndex.totalHeight()}px`;
		}
		this._cancelWindowRender();
		this._renderWindow();
	}

	private readonly _onViewportClick = (event: MouseEvent): void => {
		const target = event.target;
		if (!(target instanceof HTMLElement)) return;
		if (target.closest('.vaultman-tree-row')) return;
		this._opts?.onEmptySpaceClick?.();
	};

	/**
	 * U130 native polish: homologous container anatomy. Compatible scenes
	 * expose the native container class so unchanged themes/snippets match;
	 * locked scenes (or scenes with no native counterpart) expose none. The
	 * workspace `data-type` is never touched.
	 */
	private _applyNativeTreeCompat(): void {
		const scene = this._opts?.nativeScene ?? null;
		if (scene) this.containerEl.dataset.vaultmanNativeScene = scene;
		else delete this.containerEl.dataset.vaultmanNativeScene;
		const mode = resolveNativeCompatMode('tree', undefined, this._opts?.nativeCompat);
		if (this.containerEl.classList.contains('vaultman-native-tree-compat') !== Boolean(scene && mode === 'compatible')) {
			// Locked keeps the shipped density pitch, including its row gap.
			this._invalidateRowMeasurements();
		}
		const previous = this.containerEl.dataset.vaultmanNativeContainer;
		if (previous) {
			this.containerEl.removeClass(previous);
			delete this.containerEl.dataset.vaultmanNativeContainer;
		}
		this.containerEl.removeClass('vaultman-native-tree-compat');
		this.containerEl.removeClass('vaultman-native-tree-locked');
		// The scrollport doubles as the tab container: paint the independent
		// container boundary here too, from the same effective policy.
		const containerMode = resolveNativeCompatMode(
			'container',
			undefined,
			this._opts?.nativeCompat,
		);
		this.containerEl.classList.remove('vaultman-native-container-compat');
		this.containerEl.classList.remove('vaultman-native-container-locked');
		this.containerEl.classList.add(`vaultman-native-container-${containerMode === 'compatible' ? 'compat' : 'locked'}`);
		if (!scene || mode !== 'compatible') {
			this.containerEl.addClass('vaultman-native-tree-locked');
			syncNativeTreeIndentation(this.containerEl, false);
			return;
		}
		const profile = NATIVE_TREE_PROFILES[scene];
		this.containerEl.addClass('vaultman-native-tree-compat');
		this.containerEl.addClass(profile.container);
		this.containerEl.dataset.vaultmanNativeContainer = profile.container;
		syncNativeTreeIndentation(this.containerEl, scene === 'files');
	}

	/** Whether this tree emits native row/self/label classes. */
	private _nativeTreeEnabled(): boolean {
		if (!this._opts?.nativeScene) return false;
		return (
			resolveNativeCompatMode('tree', undefined, this._opts?.nativeCompat) ===
			'compatible'
		);
	}

	private _profileForNode(node: TreeNode): {
		row: readonly string[];
		self: readonly string[];
	} | null {
		const scene = this._opts?.nativeScene;
		if (!scene || !this._nativeTreeEnabled()) return null;
		const profile = NATIVE_TREE_PROFILES[scene];
		const isParent = Boolean(node.children?.length || node.showCaret || (scene === 'files' && hasNativeFolderIdentity(node.meta)));
		return isParent
			? { row: profile.parentRow, self: profile.parentSelf }
			: { row: profile.leafRow, self: profile.leafSelf };
	}

	private _labelInnerClasses(node: TreeNode): string[] {
		const scene = this._opts?.nativeScene;
		if (!scene || !this._nativeTreeEnabled()) return [];
		const profile = NATIVE_TREE_PROFILES[scene];
		return [...(node.children?.length || node.showCaret || (scene === 'files' && hasNativeFolderIdentity(node.meta))
			? profile.parentLabelInner ?? profile.labelInner : profile.labelInner)];
	}

	/** Display case for a label cell. Identities and inputs never pass here. */
	private _displayLabel(label: string, cellId: string): string {
		const mode = resolveTextCase(cellId, undefined, this._opts?.textCase);
		return applyTextCase(label, mode);
	}

	private _keyboardBoundaryOff: (() => void) | null = null;
	private _syncKeyboardModel(): void {
		const expanded = this._opts?.expandedIds;
		this._keyboard = {
			rows: this._rows.map((node) => ({
				id: node.id,
				depth: node.depth,
				hasChildren: Boolean(node.children?.length || node.showCaret),
				isExpanded: expanded?.has(node.id) ?? false,
			})),
			focusedId:
				this._keyboard.focusedId !== null &&
				this._indexById.has(this._keyboard.focusedId)
					? this._keyboard.focusedId
					: null,
			anchorId:
				this._keyboard.anchorId !== null &&
				this._indexById.has(this._keyboard.anchorId)
					? this._keyboard.anchorId
					: null,
		};
		// Member-order changes break the letter-jump chain (the shared jump
		// helper also restarts on changed member order via previous.memberIds).
		const orderFp = rowOrderFingerprint(this._keyboard.rows);
		if (this._letterOrderFp !== null && this._letterOrderFp !== orderFp) {
			this._letterPrevious = null;
			this._letterScopeFp = null;
		}
		this._letterOrderFp = orderFp;
		if (this._keyboard.focusedId === null) {
			this._letterPrevious = null;
			this._letterScopeFp = null;
		}
	}

	private readonly _onTreeFocusIn = (event: FocusEvent): void => {
		const target = event.target;
		if (!(target instanceof HTMLElement)) return;
		const row = target.closest('.vaultman-tree-row');
		const id = row instanceof HTMLElement ? row.dataset.id : undefined;
		if (!id || !this._indexById.has(id)) return;
		this._keyboard = { ...this._keyboard, focusedId: id, anchorId: id };
		// Manual DOM focus breaks the letter-jump chain.
		this._letterPrevious = null;
		this._letterScopeFp = null;
	};

	private _keyboardCallbacks(): TreeKeyboardCallbacks {
		return {
			onFocus: (id) => {
				// Native navigation blurs DOM focus; logical focus survives recycling.
				const doc = this.containerEl.ownerDocument;
				const active = doc?.activeElement;
				if (active && active !== doc.body && !isEditableKeyboardTarget(active, null) && 'blur' in active && typeof active.blur === 'function') {
					active.blur();
				}
				doc?.getSelection()?.removeAllRanges();
				this.setFocusedId(id);
			},
			onToggleExpand: (id) => {
				this._opts?.onToggle(id);
			},
			onActivate: (id, modifiers) => {
				const node = this._rows[this._indexById.get(id) ?? -1];
				if (this._opts?.onKeyboardActivate) {
					this._opts.onKeyboardActivate(id, modifiers);
					return;
				}
				if (node?.isGroupHeader === true) {
					this._activateGroupRow(node, this._opts as TreeViewOptions);
					return;
				}
				// No cast: a keyboard activation is not a pointer event.
				this._opts?.onRowClick(id);
			},
			onRangeSelect: (anchorId, focusId) => {
				if (this._opts?.onRangeSelect) {
					this._opts.onRangeSelect(anchorId, focusId);
					return;
				}
				this._keyboardCallbacks().onFocus(focusId);
			},
			onAdditiveSelect: (prevId, currId) => {
				if (this._opts?.onAdditiveSelect) {
					this._opts.onAdditiveSelect(prevId, currId);
					return;
				}
				this._opts?.onRangeSelect?.(prevId, currId);
			},
			onClearSelection: () => {
				if (this._opts?.onClearSelection) {
					return this._opts.onClearSelection();
				}
				const active = this.containerEl.ownerDocument?.activeElement;
				if (active instanceof HTMLElement) active.blur();
				return false;
			},
			onRename: (id) => {
				this._opts?.onRenameRequest?.(id);
			},
			canRename: (id) => this._opts?.canRenameNode?.(id) === true,
			onDelete: (id) => {
				this._opts?.onDeleteRequest?.(id);
			},
			onCollapseAll: () => {
				this._opts?.onCollapseAll?.();
			},
			onModStepOpen: (id) => {
				this._opts?.onModStepOpen?.(id);
			},
		};
	};

	private readonly _onTreeKeyDown = (event: KeyboardEvent, fromScope = false): boolean => {
		if (!this._opts || event.isComposing || (!fromScope && event.defaultPrevented)) return false;
		// Sticky twins duplicate mounted ids; the event's own row disambiguates.
		// Duck-typed (no `instanceof HTMLElement`): the engine also runs
		// under test doubles without DOM globals.
		const maybeClosest = event.target as unknown as {
			closest?: (selector: string) => HTMLElement | null;
		} | null;
		const rowEl =
			maybeClosest !== null &&
			typeof maybeClosest === 'object' &&
			typeof maybeClosest.closest === 'function'
				? maybeClosest.closest('.vaultman-tree-row')
				: null;
		if (isEditableKeyboardTarget(event.target, rowEl)) return false;
		const modelRows: readonly TreeKeyboardRow[] = this._keyboard.rows.length
			? this._keyboard.rows
			: this._rows.map((node) => ({
					id: node.id,
					depth: node.depth,
					hasChildren: Boolean(node.children?.length || node.showCaret),
					isExpanded: this._opts?.expandedIds.has(node.id) ?? false,
				}));
		let focusedId = this._keyboard.focusedId;
		if (focusedId === null && rowEl?.dataset.id) {
			focusedId = rowEl.dataset.id;
		}
		// U130 Navco: typed override seam runs BEFORE legacy extensions and
		// native. `true` consumes with action context; `false` falls through.
		// Native stays the default when no port is wired.
		if (this._opts.navco?.keyOverrides) {
			const consumed = runNavcoKeyOverrides(
				this._opts.navco.keyOverrides,
				event,
				{ focusedId, rows: modelRows },
			);
			if (consumed) {
				event.preventDefault();
				event.stopPropagation();
				this._letterPrevious = null;
				this._letterScopeFp = null;
				return true;
			}
		}
		const { handled, next } = handleTreeKeyboardKey(
			event,
			{ rows: modelRows, focusedId, anchorId: this._keyboard.anchorId },
			this._keyboardCallbacks(),
			this._opts.keyboardExtensions,
			{ isMacOS: Platform.isMacOS },
		);
		if (handled) {
			event.preventDefault();
			event.stopPropagation();
			// Expansion callbacks may have synchronously rebuilt the visible model.
			this._keyboard = { ...next, rows: this._keyboard.rows };
			// Native navigation breaks the letter-jump chain (letters never
			// reach native: the allowlist rejects them).
			this._letterPrevious = null;
			this._letterScopeFp = null;
		}
		if (handled) return true;
		return this._onTreeLetterJump(event, modelRows, focusedId);
	};

	/**
	 * U130 Navco letter jump: printable glyphs cycle within the focused
	 * sibling level ONLY when the scene's EFFECTIVE sort there is name
	 * asc/desc. Non-name levels, no-match glyphs and editable targets bubble.
	 * Focus moves through the existing reveal path (selection untouched) so
	 * virtualization and sticky copies keep working.
	 */
	private _onTreeLetterJump(
		event: KeyboardEvent,
		modelRows: readonly TreeKeyboardRow[],
		focusedId: string | null,
	): boolean {
		const port = this._opts?.navco?.letterJump;
		if (!port) return false;
		if (!isLetterJumpKey(event)) return false;
		const focusedIndex = focusedId === null ? 0 : modelRows.findIndex((row) => row.id === focusedId);
		if (focusedIndex < 0) return false;
		const focusedRow = modelRows[focusedIndex];
		if (!focusedRow) return false;
		const scope = port.resolveScope(focusedRow.id, focusedRow.depth);
		const sort = port.sortOf(scope);
		if (!shouldLetterJump(sort.sortBy)) return false;
		const scopeFp = `${scope.parentId ?? ''} level:${scope.level} sort:${sort.sortBy}:${sort.direction}`;
		const previous = this._letterScopeFp === scopeFp ? this._letterPrevious : null;
		const cursor = nextLetterTarget({ key: event.key, rows: modelRows, focusedIndex,
			labelOf: port.labelOf, sortBy: sort.sortBy, jump: port.jump, previous });
		if (!cursor) return false;
		// Reveal/focus path only: no selection mutation from letter navigation.
		this._keyboardCallbacks().onFocus(cursor.targetId);
		this._letterPrevious = cursor;
		this._letterScopeFp = scopeFp;
		event.preventDefault();
		event.stopPropagation();
		return true;
	}
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
		const treeWindow = this._treeWindow();
		const run = () => {
			this._cancelWindowRender();
			this._renderWindow();
		};
		this._pendingRaf = treeWindow.requestAnimationFrame(run);
		this._pendingScrollTimer = treeWindow.setTimeout(run, 32);
	}

	private _cancelWindowRender(): void {
		const treeWindow = this._treeWindow();
		if (this._pendingRaf !== null) {
			treeWindow.cancelAnimationFrame(this._pendingRaf);
		}
		if (this._pendingScrollTimer !== null) {
			treeWindow.clearTimeout(this._pendingScrollTimer);
		}
		this._pendingRaf = null;
		this._pendingScrollTimer = null;
	}

	private _hasVisibleRenderedRows(): boolean {
		// The virtual window owns the mounted set. Do not force layout on every
		// scroll just to rediscover whether that set intersects the viewport.
		return this.rowEls.size > 0;
	}

	private _renderWindow(): void {
		if (!this._opts || !this._contentEl) return;
		const started = performance.now();
		const scrollTop = this.containerEl.scrollTop;
		const viewportHeight = this.containerEl.clientHeight;
		const rowHeight = this._heightIndex.getEstimate();
		if (this._opts.stickyParentRows) this._applyStickyTopOffset();
		// U130 native polish: variable-height window over the shared index.
		// Offscreen rows keep estimates; mounted slots report real heights.
		const projection = buildVariableTreeWindow({
			rows: this._rows,
			geometry: this._heightIndex,
			scrollTop,
			viewportHeight,
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
			// Measured heights position rows; they must not pin their natural size.
			rowEl.style.removeProperty('height');
			this._observeRow(rowEl);
		}
		this._renderStickyRows(scrollTop, viewportHeight, rowHeight);
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
			if (rowMap === this.rowEls) this._unobserveRow(row);
			this._opts?.cellContributions?.unbind(row);
			row.remove();
			rowMap.delete(id);
		}
	}

	private _renderStickyRows(scrollTop: number, viewportHeight: number, rowHeight: number): void {
		if (!this._stickyLayerEl || !this._opts?.stickyParentRows) {
			if (this._contentEl) this._contentEl.style.clipPath = '';
			this.removeStaleRows(new Set(), this.stickyRowEls);
			this._syncStickyTwins(new Set());
			return;
		}
		const stickyRows = stickyTreeRows(this._rows, {
			rowHeight,
			scrollTop,
			viewportHeight,
			maxFraction: this._opts?.stickyMaxFraction,
			parentIndex: this._parentIndex ?? undefined,
			subtreeEnd: this._subtreeEnd ?? undefined,
			// U130 native polish: header tops and push-off edges agree with
			// the same measured index the window and reveal math read.
			variable: this._heightIndex,
		});
		const visibleIds = new Set(
			stickyRows.map(({ index }) => this._rows[index]?.id).filter(Boolean),
		);
		this.removeStaleRows(visibleIds, this.stickyRowEls);
		this._syncStickyTwins(visibleIds);
		if (this._contentEl) {
			const covered = stickyRows.reduce((bottom, sticky) => Math.max(bottom,
				sticky.top + this._heightIndex.heightForIndex(sticky.index)), 0);
			// Cut only scrolling rows out of the stack's band. The original
			// container/theme background remains visible behind transparent headers.
			this._contentEl.style.clipPath = covered > 0 && this._nativeTreeEnabled()
				? `inset(${scrollTop + covered}px 0 0)` : '';
		}
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
			// Do not pin an intrinsic height on the sticky clone. Native/theme CSS
			// must remain free to change its box; the index only positions slots.
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
	 * relative to the scrollport. Read before the window's row writes so the
	 * measurement cannot flush the partially rendered virtual window.
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
			node.flatParentLabel ?? '',
			node.flatOwnLabel ?? '',
			opts.nativeRootColors?.get(node.flatParentLabel?.split('/')[0] ?? '') ?? '',
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
			opts.nativeScene ?? '',
			opts.nativeCompat?.tree ?? '',
			opts.textCase ? JSON.stringify(opts.textCase) : '',
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
		projectTextCaseElement(element, opts.textCase?.[cellId] ?? 'provided');
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
		row.toggleClass('is-collapsed', this._nativeTreeEnabled() && (hasChildren || showCaret) && !isExpanded);
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
			// Legacy providers put native self classes on the old flat row.
			// The homologous profile now owns them on the inner decoration box.
			if (this._opts?.nativeScene && ['tree-item-self', 'nav-file-title', 'nav-folder-title'].includes(className)) continue;
			if (className) row.addClass(className);
		}
	}

	/** Stacked header height above `index` (0 when sticky is off). */
	private _stickyHeightAbove(index: number): number {
		if (!this._opts?.stickyParentRows) return 0;
		const rowHeight = this._heightIndex.getEstimate();
		if (rowHeight <= 0) return 0;
		const sticky = stickyTreeRows(this._rows, {
			rowHeight,
			scrollTop: this._heightIndex.topForIndex(index),
			viewportHeight: this.containerEl.clientHeight,
			maxFraction: this._opts?.stickyMaxFraction,
			parentIndex: this._parentIndex ?? undefined,
			subtreeEnd: this._subtreeEnd ?? undefined,
			variable: this._heightIndex,
		}).filter((s) => s.index !== index);
		return sticky.reduce(
			(acc, s) => acc + this._heightIndex.heightForIndex(s.index),
			0,
		);
	}

	private _scrollTopForIndex(
		index: number,
		block: ScrollLogicalPosition,
	): number {
		const rowHeight = this._heightIndex.heightForIndex(index);
		const rowTop = this._heightIndex.topForIndex(index);
		const rowBottom = rowTop + rowHeight;
		const viewportHeight = this.containerEl.clientHeight;
		const currentTop = this.containerEl.scrollTop;
		const currentBottom = currentTop + viewportHeight;
		let target = currentTop;
		if (block === 'start') {
			target = Math.max(0, rowTop - this._stickyHeightAbove(index));
		} else if (block === 'end') {
			target = rowBottom - viewportHeight;
		} else if (block === 'nearest') {
			const effectiveTop = currentTop + this._stickyHeightAbove(index);
			if (rowTop < effectiveTop) {
				target = Math.max(0, rowTop - this._stickyHeightAbove(index));
			} else if (rowBottom > currentBottom) {
				target = rowBottom - viewportHeight;
			}
		} else {
			target = rowTop - viewportHeight / 2 + rowHeight / 2;
		}
		const maxScroll = Math.max(
			0,
			this._heightIndex.totalHeight() - viewportHeight,
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
		const showContributedIcon = showIcon &&
			(opts.contributedIconScope === 'files' ? !hasNativeFolderIdentity(node.meta) :
				opts.contributedIconScope === 'folders' ? hasNativeFolderIdentity(node.meta) : true);
		const contributionVisibility = { icons: showContributedIcon, addons: !visibleCells || visibleCells.has('addons') };
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
			(cell) =>
				!visibleCells || visibleCells.has(cell.id) || cell.id === 'cell_update',
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
		this.applyDataPath(row, node);
		if (opts.nativeScene === 'files' && this._nativeTreeEnabled()) {
			const index = this._indexById.get(node.id);
			let rootIndex = index;
			while (rootIndex !== undefined && (this._parentIndex?.[rootIndex] ?? -1) >= 0) {
				rootIndex = this._parentIndex?.[rootIndex];
			}
			const rootNode = rootIndex === undefined ? undefined : this._rows[rootIndex];
			const rootPath = row.dataset.path?.split('/')[0];
			const ordinal = opts.nativeRootOrdinal?.(rootPath ?? '') ?? this._nativeRootOrdinals.get(rootPath ?? (rootNode ? this.nodeDataPath(rootNode) ?? rootNode.id : ''));
			const tokens = ordinal !== undefined
				? getNativeRootNthTokens(this.containerEl.ownerDocument, ordinal) : '';
			const root = String(row.dataset.path ? row.dataset.path === rootPath : index !== undefined && index === rootIndex);
			if (row.dataset.vaultmanNativeRoot !== root) row.dataset.vaultmanNativeRoot = root;
			if (row.dataset.vaultmanNativeRootNth !== tokens) row.dataset.vaultmanNativeRootNth = tokens;
		} else {
			delete row.dataset.vaultmanNativeRoot;
			delete row.dataset.vaultmanNativeRootNth;
		}
		row.setAttribute('role', 'button');
		row.setAttribute('aria-label', node.label);
		row.draggable = Boolean(opts.onDragStart) && opts.editingId == null;
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
			setRowCssProps(row, {
				'--depth': '0',
				'--vaultman-tree-indent-unit': '0px',
			});
		} else {
			setRowCssProps(row, {
				'--depth': String(node.depth),
				'--vaultman-tree-indent-unit': '',
			});
		}

		// 2. Start padding (same-level parent indent on the left):
		// Carets removed from start (end or hidden), or indent toggled off
		// with mode 'all' or 'parent' for non-caret rows, removes the 24px start gutter.
		const removeStartParentIndent =
			!showCaretCell ||
			caretPos === 'end' ||
			caretPos === 'hidden' ||
			(effectiveIndent === false &&
				!showCaret &&
				(indentMode === 'all' || indentMode === 'parent'));

		if (removeStartParentIndent) {
			setRowCssProps(row, {
				'--vaultman-tree-row-padding-start': 'var(--size-4-1)',
				'--vaultman-native-row-padding-start': 'var(--size-4-1)',
			});
		} else {
			setRowCssProps(row, {
				'--vaultman-tree-row-padding-start': '',
				'--vaultman-native-row-padding-start': '',
			});
		}

		// 3. End padding (same-level parent indent on the right):
		// When carets are placed at the end and cell_caret is active, rows without
		// carets receive end padding so right-side cells align with caret rows.
		if (caretPos === 'end' && showCaretCell && !showCaret) {
			setRowCssProps(row, {
				'--vaultman-tree-row-padding-end':
					'calc(var(--size-4-2, 8px) + var(--vaultman-tree-caret-size, 16px) + var(--size-4-1, 4px))',
			});
		} else {
			setRowCssProps(row, {
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
			this.setFocusedId(node.id, false);
			if (node.isGroupHeader === true) {
				this._activateGroupRow(node, opts);
				return;
			}
			opts.onRowClick(node.id, event);
		};
		// U130 native polish: keyboard lives on the owner-local container
		// boundary (`_onTreeKeyDown`), which owns Up/Down/Shift/Left/Right/
		// Enter/Space/Escape/F2 plus the extension seam. A per-row keydown
		// would double-handle every keystroke and has no range context.
		// A KeyboardEvent is never cast to a MouseEvent on any path.
		row.onkeydown = null;
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
					const target =
						typeof Element !== 'undefined' && event.target instanceof Element
							? event.target
							: typeof (event.target as { closest?: unknown })?.closest === 'function'
								? (event.target as unknown as Element)
								: null;
					if (target?.closest?.('.vaultman-selection-checkbox, .cell_checkbox')) {
						opts.onRecursiveSelect?.(node.id);
						return;
					}
					if (
						target?.closest?.(
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
			if (event.defaultPrevented) row.removeClass('is-being-dragged');
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
			// U130 native polish: rows painted before the slot/self split
			// have no self; the markup version bump repaints them below.
			const fastSelf = row.querySelector<HTMLElement>(
				':scope > .vaultman-tree-self',
			);
			fastSelf?.toggleClass('is-active', this._activeId === node.id);
			fastSelf?.toggleClass('is-selected', isSelected);
			fastSelf?.toggleClass('is-editing', opts.editingId === node.id);
			fastSelf?.toggleClass('is-being-renamed', this._nativeTreeEnabled() && opts.editingId === node.id);
			const focused = this._keyboard.focusedId === node.id;
			const cut = opts.isItemCut?.(node.id) === true;
			row.toggleClass('has-focus', focused);
			row.toggleClass('is-cut', cut);
			fastSelf?.toggleClass('has-focus', focused);
			fastSelf?.toggleClass('is-cut', cut);
			opts.cellContributions?.bind(row, this._nativeTreeEnabled(), contributionVisibility);
			return row;
		}
		row.empty();
		row.className = 'vaultman-tree-row';
		// U130 native polish: the slot owns absolute position and observer
		// geometry only. Homologous native row classes land here so
		// descendant selectors match; decoration lives on the inner self.
		const nativeProfile = this._profileForNode(node);
		if (nativeProfile) {
			for (const cls of nativeProfile.row) row.addClass(cls);
		}
		row.dataset.renderSignature = signature;
		// Inner native decoration container: `tree-item-self` + the scene
		// profile, so unchanged themes/snippets match and their `::before`
		// active decoration has a free pseudo-element on both levels.
		const self = row.createDiv({ cls: 'vaultman-tree-self' });
		if (nativeProfile) {
			for (const cls of nativeProfile.self) self.addClass(cls);
		}
		// Ancestry guides are a structural element, never a native row
		// pseudo-element, so native `::before` decorations survive.
		const guides = row.createSpan({ cls: 'vaultman-tree-guides' });
		guides.setAttribute('aria-hidden', 'true');
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
		row.toggleClass('is-collapsed', Boolean(nativeProfile) && (hasChildren || showCaret) && !isExpanded);
		if (isActive) row.addClass('is-active-filter');
		if (isExcluded) row.addClass('is-excluded-filter');
		if (highlight.hover) row.addClass('is-explorer-hover-highlight');
		if (highlight.deletion) row.addClass('is-deletion-highlight');
		if (isWarning) row.addClass('vaultman-badge-warning');
		if (isEditing) row.addClass('is-editing');
		// Mirror interaction states onto the native self so theme selectors
		// like `.tree-item-self.is-active` match without Vaultman prefixes.
		self.toggleClass('is-active', this._activeId === node.id);
		self.toggleClass('is-selected', isSelected);
		self.toggleClass('is-editing', isEditing);
		self.toggleClass('is-being-renamed', Boolean(nativeProfile) && isEditing);
		self.toggleClass('mod-collapsible', showCaret);
		const isFocused = this._keyboard.focusedId === node.id;
		row.toggleClass('has-focus', isFocused);
		self.toggleClass('has-focus', isFocused);
		const isCut = opts.isItemCut?.(node.id) === true;
		row.toggleClass('is-cut', isCut);
		self.toggleClass('is-cut', isCut);

		rowMap.set(node.id, row);

		const emitSelectionCheckbox = (position: 'start' | 'end'): void => {
			if (!opts.onSelectionToggle || !isNodeSelectable) return;
			if (visibleCells && !visibleCells.has('checkbox')) return;
			const checkbox = self.createEl('input', {
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
			const toggleEl = self.createDiv({
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
		const emitLabel = (parent: HTMLElement, cellId = 'text'): void => {
			if (!showLabel) return;
			const target = flatTreeLabelTarget(parent, node);
			const host = target.host;
			if (host !== parent) {
				host.toggleClass('vaultman-tree-flat-file', opts.nativeScene === 'files' && !hasNativeFolderIdentity(node.meta));
				const context = host.querySelector<HTMLElement>('.vaultman-tree-flat-parent');
				if (context) {
					const color = this._nativeTreeEnabled() ? opts.nativeRootColors?.get(node.flatParentLabel?.split('/')[0] ?? '') : undefined;
					if (color) context.style.color = color;
					context.dataset.cell = opts.nativeScene === 'files' ? 'path' : 'parent';
					projectTextCaseElement(context, resolveTextCase(context.dataset.cell, undefined, opts.textCase));
				}
			}
			const mode = resolveTextCase(host !== parent && (cellId === 'path' || cellId === 'parent') ? 'name' : cellId, undefined, opts.textCase);
			if (opts.renderLabel?.(host, target.node)) {
				// Scene-owned markup: adopt the inner native classes on its
				// label spans and project display case over text nodes only.
				// Markup, actions and inputs survive; aria/input keep the
				// provided spelling.
				const inner = this._labelInnerClasses(node);
				if (inner.length > 0 || mode !== 'provided') {
					for (const el of host.querySelectorAll(
						':scope > span.vaultman-tree-label',
					)) {
						if (!(el instanceof HTMLElement)) continue;
						for (const cls of inner) el.addClass(cls);
						projectTextCaseElement(el, mode);
					}
				}
				return;
			}
			// Inner native label classes free `::before` for the native
			// active decoration; text-case is display-only (aria/input keep
			// the provided spelling).
			const label = host.createSpan({
				cls: ['vaultman-tree-label', ...this._labelInnerClasses(node)].join(' '),
				text: applyTextCase(target.node.label, mode),
			});
			if (node.labelColor) label.style.color = node.labelColor;
		};
		const emitType = (parent: HTMLElement, cellId = visibleCells?.has('ext') ? 'ext' : 'type'): void => {
			if (!showType || !node.typeText) return;
			parent.createSpan({
				cls: 'vaultman-tree-type nav-file-tag',
				text: this._displayLabel(node.typeText, cellId),
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
		const cellEmitters: Record<string, (parent: HTMLElement, cellId?: string) => void> = {
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
			const emitted = new Set<(parent: HTMLElement, cellId?: string) => void>();
			for (const cellId of activationOrder ?? []) {
				const emit = cellEmitters[cellId];
				// Aliases (name/text/path) share one emitter; never emit twice.
				if (!emit || emitted.has(emit)) continue;
				emitted.add(emit);
				emit(self, cellId);
			}
		}

		// Icon
		if (!usesActivationOrder && node.icon && showIcon) {
			const iconSpan = self.createSpan({ cls: 'vaultman-tree-icon' });
			renderIconValue(iconSpan, node.icon, node.iconColor);
		}

		// Label / Input
		if (isEditing && showLabel) {
			const initialValue = opts.getEditingValue
				? opts.getEditingValue(node)
				: (node.label === 'empty' ? '' : node.label);
			const input = self.createEl('input', {
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
				const btn = self.createSpan({ cls: 'vaultman-tree-rename-rich-btn clickable-icon', attr: { 'aria-label': 'Open detailed rename' } });
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
				const editor = self.createSpan({
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
				self.createSpan({
					cls: 'vaultman-cell-text-status',
					text: mode === 'slice' ? 'Slice' : 'Adjust',
				});
				return row;
			}
			emitLabel(self, visibleCells?.has('name') ? 'name' : visibleCells?.has('path') ? 'path' : 'text');
		}

		if (!usesActivationOrder) emitType(self);

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
			const badgeZone = self.createDiv({ cls: 'vaultman-tree-badge-zone' });

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
		// Guides belong to ancestor lanes, not the current label's offset.
		// The shared logical-inset CSS tracks those lanes without measuring
		// each partially built row (and forcing layout between DOM writes).
		row.style.removeProperty('--vaultman-tree-guide-start');

		opts.cellContributions?.bind(row, this._nativeTreeEnabled(), contributionVisibility);
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
			toggleEl.toggleClass('is-busy', cell.busy === true);
			if (cell.busy === true) toggleEl.setAttribute('aria-busy', 'true');
			if (cell.busy === true) {
				const spinner = toggleEl.createSpan({ cls: 'vaultman-addon-cell-spinner' });
				setIcon(spinner, 'lucide-loader-circle');
			}
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
		badgeEl.toggleClass('is-busy', cell.busy === true);
		if (cell.busy === true) badgeEl.setAttribute('aria-busy', 'true');
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
			badgeEl.setAttribute('aria-label', cell.label);
			badgeEl.setAttribute('role', 'button');
			badgeEl.setAttribute('tabindex', cell.disabled ? '-1' : '0');
			badgeEl.setAttribute('aria-disabled', String(cell.disabled === true));
			badgeEl.onkeydown = (event) => {
				if (event.key === 'Enter' || event.key === ' ') {
					event.preventDefault();
					badgeEl.click();
				}
			};
			setIcon(
				iconEl,
				cell.busy === true
					? 'lucide-loader-circle'
					: cell.kind === 'toggle'
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
