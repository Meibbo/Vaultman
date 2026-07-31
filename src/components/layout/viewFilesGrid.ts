import { Platform, setIcon, type TFile } from 'obsidian';
import { formatFileTableName } from '../../logic/logicTableLayout';
import type { ExplorerFileTimes } from '../../logic/logicSort';
import type { NodeBadge } from '../../types/typeTree';
import { buildAnchoredGridWindow } from '../../utils/gridVirtualization';
import { vaultmanPerfMonitor } from '../../utils/performanceMonitor';
import { elementContentWidth } from '../../utils/elementDimensions';
import {
	explorerDensityProfile,
	gridMetaSampleValues,
	gridRowHeightFor,
	hasGridMetaCells,
	usesMobileExplorerDensity,
} from '../../logic/logicResponsiveLayout';
import type { ResolvedExplorerIcon } from '../../logic/logicFileIcons';
import { renderIconValue } from '../../utils/renderIconValue';

export interface FilesGridViewCallbacks {
	onContextMenu: (file: TFile, event: MouseEvent) => void;
	onSelectionChange: (selected: Set<string>) => void;
	onFileClick: (file: TFile, event?: MouseEvent | KeyboardEvent) => void;
	onFileHover?: (file: TFile, element: HTMLElement) => void;
	onDragStart?: (file: TFile, event: DragEvent) => void;
	getBadges?: (file: TFile) => NodeBadge[];
	getFileIcon?: (
		file: TFile,
		defaultIcon: string,
	) => ResolvedExplorerIcon | null;
	getPropCount?: (file: TFile) => number;
	getFileTimes?: (file: TFile) => ExplorerFileTimes;
	getWordCount?: (file: TFile) => number | null;
	/**
	 * U121-027: supplied by the explorer so card dates follow the same
	 * relative/specific mode as the tree cells. Absent = the 1.2.0 absolute date.
	 */
	formatTimestamp?: (time: number) => string | undefined;
}

export class FilesGridView {
	private readonly containerEl: HTMLElement;
	private readonly callbacks: FilesGridViewCallbacks;
	private scrollEl: HTMLElement | null = null;
	private spacerEl: HTMLElement | null = null;
	private contentEl: HTMLElement | null = null;
	private resizeObserver: ResizeObserver | null = null;
	private files: TFile[] = [];
	private rowEls = new Map<string, HTMLElement>();
	private selectedFiles = new Set<string>();
	private visibleCells = new Set<string>(['icon', 'name', 'count', 'ext']);
	private activePath: string | null = null;
	private pendingRaf: number | null = null;
	private pendingScrollTimer: number | null = null;
	private measuredRowHeight: number | null = null;
	private measureSignature = '';
	private lastRowHeight: number | null = null;
	private readonly gap = 8;
	private readonly overscanRows = 4;
	private readonly onScroll = () => this.scheduleWindowRender();

	constructor(containerEl: HTMLElement, callbacks: FilesGridViewCallbacks) {
		this.containerEl = containerEl;
		this.callbacks = callbacks;
	}

	private get densityProfile() {
		const body = this.containerEl.ownerDocument.body;
		const isMobile = usesMobileExplorerDensity(
			Platform.isMobile,
			body.classList,
		);
		return explorerDensityProfile(isMobile);
	}

	private get minCardWidth(): number {
		return this.densityProfile.gridMinCardWidth;
	}

	private get hasMetaCells(): boolean {
		return hasGridMetaCells(this.visibleCells);
	}

	private get rowHeight(): number {
		// BT5-016: cards grow/shrink with their content (compact without meta
		// cells, wrapped meta rows with many). The probe measurement is the
		// authoritative slot; the density estimate is the pre-measure fallback.
		return (
			this.measuredRowHeight ??
			gridRowHeightFor(this.densityProfile, this.hasMetaCells)
		);
	}

	/**
	 * Measure the real card height for the current cell configuration by
	 * rendering one hidden probe card with worst-case content (BT5-016). This
	 * keeps the uniform virtual slot in sync with wrapped metadata rows on any
	 * card width/density instead of trusting a fixed constant.
	 */
	private measureCardRowHeight(cardWidth: number): void {
		if (!this.contentEl) return;
		const profile = this.densityProfile;
		const samples = gridMetaSampleValues(this.visibleCells);
		const signature = [
			cardWidth,
			profile.gridRowHeight,
			this.visibleCells.has('icon') ? '1' : '0',
			this.visibleCells.has('name') ? '1' : '0',
			samples.join(','),
		].join('|');
		if (signature === this.measureSignature) return;

		const probe = this.contentEl.createDiv({
			cls: 'vaultman-files-grid-card vaultman-files-grid-card-probe',
		});
		probe.toggleClass('vaultman-files-grid-card--compact', !this.hasMetaCells);
		probe.style.width = `${cardWidth}px`;
		if (this.visibleCells.has('icon')) {
			const iconEl = probe.createDiv({ cls: 'vaultman-files-grid-card-icon' });
			iconEl.style.height = `${profile.gridRowHeight >= 100 ? 22 : 18}px`;
		}
		if (this.visibleCells.has('name')) {
			probe.createDiv({
				cls: 'vaultman-files-grid-card-name',
				text: 'Sample',
			});
		}
		if (samples.length > 0) {
			const metaRow = probe.createDiv({ cls: 'vaultman-files-grid-card-meta' });
			for (const sample of samples) {
				metaRow.createSpan({ cls: 'nav-file-tag', text: sample });
			}
		}
		const measured = probe.offsetHeight;
		probe.remove();
		if (!measured) return;
		this.measureSignature = signature;
		this.measuredRowHeight = measured + this.gap;
	}

	render(files: TFile[]): void {
		this.files = files;
		this.ensureScaffold();
		this.cancelScheduledRender();
		this.renderWindow();
	}

	destroy(): void {
		this.cancelScheduledRender();
		this.resizeObserver?.disconnect();
		this.resizeObserver = null;
		this.scrollEl?.removeEventListener('scroll', this.onScroll);
		this.containerEl.removeClass('vaultman-files-grid-root');
		this.containerEl.empty();
		this.scrollEl = null;
		this.spacerEl = null;
		this.contentEl = null;
		this.files = [];
		this.rowEls.clear();
		this.selectedFiles.clear();
		this.measuredRowHeight = null;
		this.measureSignature = '';
		this.lastRowHeight = null;
	}

	setVisibleCells(cells: Set<string>): void {
		this.visibleCells = new Set(cells);
	}

	setActivePath(path: string | null): void {
		if (this.activePath === path) return;
		const previousPath = this.activePath;
		this.activePath = path;
		this.setRenderedPathActive(previousPath, false);
		this.setRenderedPathActive(path, true);
	}

	private setRenderedPathActive(path: string | null, active: boolean): void {
		if (!path) return;
		this.rowEls.get(path)?.toggleClass('is-active', active);
	}

	setSelectedPaths(paths: ReadonlySet<string>): void {
		if (
			this.selectedFiles.size === paths.size &&
			[...paths].every((path) => this.selectedFiles.has(path))
		) {
			return;
		}
		this.selectedFiles = new Set(paths);
		this.renderWindow();
	}

	getSelectedFiles(): TFile[] {
		return this.files.filter((file) => this.selectedFiles.has(file.path));
	}

	/** Re-project after a hidden pane becomes visible (hidden probes measure 0). */
	refreshViewport(): void {
		this.cancelScheduledRender();
		this.measureSignature = '';
		this.renderWindow();
	}

	scrollToPath(path: string, behavior: ScrollBehavior = 'auto'): void {
		if (!this.scrollEl) return;
		const metrics = this.metrics();
		const index = this.files.findIndex((file) => file.path === path);
		if (index === -1) return;
		const rowNumber = Math.floor(index / metrics.columnCount);
		this.scrollEl.scrollTo({
			top: Math.max(0, rowNumber * this.rowHeight),
			behavior,
		});
		this.scheduleWindowRender();
	}

	private ensureScaffold(): void {
		if (
			this.scrollEl &&
			this.contentEl &&
			this.containerEl.contains(this.scrollEl)
		)
			return;

		this.resizeObserver?.disconnect();
		this.scrollEl?.removeEventListener('scroll', this.onScroll);
		this.containerEl.empty();
		this.rowEls.clear();
		this.containerEl.addClass('vaultman-files-grid-root');
		this.scrollEl = this.containerEl.createDiv({
			cls: 'vaultman-files-grid-scroll',
		});
		this.spacerEl = this.scrollEl.createDiv({
			cls: 'vaultman-files-grid-spacer',
		});
		this.contentEl = this.spacerEl.createDiv({
			cls: 'vaultman-files-grid-content',
		});
		this.scrollEl.addEventListener('scroll', this.onScroll, { passive: true });
		if (typeof ResizeObserver !== 'undefined') {
			this.resizeObserver = new ResizeObserver(() =>
				this.scheduleWindowRender(),
			);
			this.resizeObserver.observe(this.scrollEl);
		}
	}

	private metrics(): { columnCount: number; cardWidth: number } {
		const width = Math.max(
			this.minCardWidth,
			this.scrollEl
				? elementContentWidth(this.scrollEl)
				: this.containerEl.clientWidth,
		);
		const columnCount = Math.max(
			1,
			Math.floor((width + this.gap) / (this.minCardWidth + this.gap)),
		);
		const cardWidth = Math.max(
			this.minCardWidth,
			Math.floor((width - this.gap * (columnCount + 1)) / columnCount),
		);
		return { columnCount, cardWidth };
	}

	private renderWindow(): void {
		if (!this.scrollEl || !this.spacerEl || !this.contentEl) return;
		const started = performance.now();
		const metrics = this.metrics();
		this.measureCardRowHeight(metrics.cardWidth);
		const rowHeight = this.rowHeight;
		// BT5-016 repair: when the slot height changes (meta cells toggled),
		// keep the first visible row anchored under the new geometry. The
		// spacer MUST grow before the anchored scrollTop is applied, otherwise
		// the browser clamps the target against the old, shorter content.
		const anchored = buildAnchoredGridWindow({
			rows: this.files,
			scrollTop: this.scrollEl.scrollTop,
			previousRowHeight: this.lastRowHeight,
			viewportHeight: this.scrollEl.clientHeight,
			rowHeight,
			columnCount: metrics.columnCount,
			overscanRows: this.overscanRows,
		});
		this.lastRowHeight = rowHeight;
		this.spacerEl.style.height = `${anchored.spacerHeight}px`;
		if (this.scrollEl.scrollTop !== anchored.scrollTop) {
			this.scrollEl.scrollTop = anchored.scrollTop;
		}
		const projection = anchored.window;
		const visiblePaths = new Set(
			projection.visibleRows.map((row) => row.row.path),
		);
		this.removeStaleCards(visiblePaths);
		for (const item of projection.visibleRows) {
			this.renderCard(item.row, {
				top: item.top,
				left: this.gap + item.column * (metrics.cardWidth + this.gap),
				width: metrics.cardWidth,
			});
		}
		vaultmanPerfMonitor.record(
			'files.grid.window',
			performance.now() - started,
			{
				rows: this.files.length,
				visibleRows: projection.visibleRows.length,
				start: projection.startRow,
				end: projection.endRow,
				columns: metrics.columnCount,
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
			this.renderWindow();
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

	private removeStaleCards(visiblePaths: Set<string>): void {
		for (const [path, card] of this.rowEls) {
			if (visiblePaths.has(path)) continue;
			card.remove();
			this.rowEls.delete(path);
		}
	}

	private renderCard(
		file: TFile,
		position: { top: number; left: number; width: number },
	): void {
		if (!this.contentEl) return;
		const propCount = this.callbacks.getPropCount?.(file) ?? 0;
		const badges = this.callbacks.getBadges?.(file) ?? [];
		const times = this.callbacks.getFileTimes?.(file) ?? file.stat;
		const showWords = this.visibleCells.has('words');
		const wordCount = showWords
			? (this.callbacks.getWordCount?.(file) ?? null)
			: null;
		const resolvedIcon =
			this.visibleCells.has('icon') || this.visibleCells.has('name')
				? this.resolvedIconForFile(file)
				: null;
		const signature = [
			file.path,
			file.name,
			file.extension,
			resolvedIcon?.icon ?? '',
			resolvedIcon?.color ?? '',
			times.mtime,
			times.ctime,
			this.selectedFiles.has(file.path) ? '1' : '0',
			Array.from(this.visibleCells).sort().join(','),
			propCount,
			wordCount ?? '',
			badges
				.map((badge) =>
					[
						badge.text ?? '',
						badge.icon ?? '',
						badge.color ?? '',
						badge.solid ? '1' : '0',
						badge.queueIndex ?? '',
					].join(':'),
				)
				.join('|'),
		].join('\u001f');
		const card =
			this.rowEls.get(file.path) ??
			this.contentEl.createDiv({ cls: 'vaultman-files-grid-card' });
		// Same guard as viewTree: rows are recycled and absolutely placed, so a
		// redundant re-parent only serves to cancel a click or hover in flight.
		if (card.parentElement !== this.contentEl) this.contentEl.appendChild(card);
		this.rowEls.set(file.path, card);
		card.dataset.path = file.path;
		card.draggable = Boolean(this.callbacks.onDragStart);
		card.style.top = `${position.top + this.gap}px`;
		card.style.left = `${position.left}px`;
		card.style.width = `${position.width}px`;
		card.onpointerenter = () => this.callbacks.onFileHover?.(file, card);
		card.oncontextmenu = (event) => {
			event.preventDefault();
			this.callbacks.onContextMenu(file, event);
		};
		card.ondragstart = (event) => this.callbacks.onDragStart?.(file, event);
		card.onclick = (event) => {
			this.callbacks.onFileClick(file, event);
		};
		card.onauxclick = (event) => {
			if (event.button !== 1) return;
			event.preventDefault();
			this.callbacks.onFileClick(file, event);
		};
		card.onkeydown = (event) => {
			if (event.key !== 'Enter' && event.key !== ' ') return;
			event.preventDefault();
			this.callbacks.onFileClick(file, event);
		};
		if (card.dataset.renderSignature === signature) return;
		card.empty();
		card.className = 'vaultman-files-grid-card';
		card.dataset.renderSignature = signature;
		card.setAttribute('role', 'button');
		card.setAttribute('tabindex', '0');
		card.setAttribute('aria-label', file.path);
		card.toggleClass('is-selected', this.selectedFiles.has(file.path));
		card.toggleClass('is-active', this.activePath === file.path);
		// BT5-016: no active meta cells → the card keeps only its content
		// height instead of reserving the empty metadata box.
		card.toggleClass('vaultman-files-grid-card--compact', !this.hasMetaCells);

		if (this.visibleCells.has('icon') && resolvedIcon) {
			const iconEl = card.createDiv({ cls: 'vaultman-files-grid-card-icon' });
			renderIconValue(iconEl, resolvedIcon.icon, resolvedIcon.color);
		}
		if (this.visibleCells.has('name')) {
			const name = card.createDiv({
				cls: 'vaultman-files-grid-card-name',
				text: formatFileTableName(file),
			});
			if (resolvedIcon?.color) name.style.color = resolvedIcon.color;
		}
		if (this.hasMetaCells) {
			const metaRow = card.createDiv({ cls: 'vaultman-files-grid-card-meta' });
			if (this.visibleCells.has('ext') && this.visibleExtension(file)) {
				metaRow.createSpan({
					cls: 'nav-file-tag vaultman-files-grid-card-ext',
					text: this.visibleExtension(file),
				});
			}
			if (this.visibleCells.has('count') && propCount > 0) {
				metaRow.createSpan({
					cls: 'vaultman-tree-count',
					text: String(propCount),
				});
			}
			if (showWords && wordCount !== null) {
				metaRow.createSpan({
					cls: 'nav-file-tag vaultman-files-grid-card-words',
					text: String(wordCount),
				});
			}
			if (this.visibleCells.has('mtime')) {
				this.renderDateCell(metaRow, times.mtime, 'mtime');
			}
			if (this.visibleCells.has('ctime')) {
				this.renderDateCell(metaRow, times.ctime, 'ctime');
			}
		}
		this.renderBadges(card, badges);
	}

	private renderDateCell(
		parent: HTMLElement,
		time: number,
		cellId: string,
	): void {
		if (!Number.isFinite(time) || time <= 0) return;
		const text =
			this.callbacks.formatTimestamp?.(time) ?? new Date(time).toLocaleDateString();
		if (!text) return;
		// U121-027: both date cells share the class; `data-cell` is the identity
		// the targeted patch pipeline addresses.
		const span = parent.createSpan({
			cls: 'nav-file-tag vaultman-files-grid-card-date',
			text,
		});
		span.dataset.cell = cellId;
	}

	private renderBadges(parent: HTMLElement, badges: NodeBadge[]): void {
		if (badges.length === 0) return;
		const zone = parent.createDiv({
			cls: 'vaultman-tree-badge-zone vaultman-card-badge-zone',
		});
		for (const badge of badges) {
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
		}
	}

	private visibleExtension(file: TFile): string {
		return file.extension === 'md' || file.extension === 'markdown'
			? ''
			: file.extension;
	}

	private iconForFile(file: TFile): string {
		if (file.extension === 'base') return 'lucide-database';
		if (file.extension === 'canvas') return 'lucide-layout';
		if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(file.extension))
			return 'lucide-image';
		if (['pdf'].includes(file.extension)) return 'lucide-file-text';
		return 'lucide-file';
	}

	private resolvedIconForFile(file: TFile): ResolvedExplorerIcon | null {
		const defaultIcon = this.iconForFile(file);
		if (!this.callbacks.getFileIcon) return { icon: defaultIcon };
		return this.callbacks.getFileIcon(file, defaultIcon);
	}
}
