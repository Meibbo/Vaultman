import { setIcon, type TFile } from 'obsidian';
import { formatFileTableName } from '../../logic/logicTableLayout';
import type { NodeBadge } from '../../types/typeTree';
import { buildVirtualGridWindow } from '../../utils/gridVirtualization';
import { vaultmanPerfMonitor } from '../../utils/performanceMonitor';

export interface FilesGridViewCallbacks {
	onContextMenu: (file: TFile, event: MouseEvent) => void;
	onSelectionChange: (selected: Set<string>) => void;
	onFileClick: (file: TFile) => void;
	onDragStart?: (file: TFile, event: DragEvent) => void;
	getBadges?: (file: TFile) => NodeBadge[];
	getPropCount?: (file: TFile) => number;
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
	private readonly minCardWidth = 112;
	private readonly gap = 8;
	private readonly rowHeight = 92;
	private readonly overscanRows = 4;
	private readonly onScroll = () => this.scheduleWindowRender();

	constructor(containerEl: HTMLElement, callbacks: FilesGridViewCallbacks) {
		this.containerEl = containerEl;
		this.callbacks = callbacks;
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
	}

	setVisibleCells(cells: Set<string>): void {
		this.visibleCells = new Set(cells);
	}

	setActivePath(path: string | null): void {
		this.activePath = path;
	}

	getSelectedFiles(): TFile[] {
		return this.files.filter((file) => this.selectedFiles.has(file.path));
	}

	scrollToPath(path: string): void {
		if (!this.scrollEl) return;
		const metrics = this.metrics();
		const index = this.files.findIndex((file) => file.path === path);
		if (index === -1) return;
		const rowNumber = Math.floor(index / metrics.columnCount);
		this.scrollEl.scrollTop = Math.max(0, rowNumber * this.rowHeight);
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
			this.scrollEl?.clientWidth ?? this.containerEl.clientWidth,
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
		const projection = buildVirtualGridWindow({
			rows: this.files,
			scrollTop: this.scrollEl.scrollTop,
			viewportHeight: this.scrollEl.clientHeight,
			rowHeight: this.rowHeight,
			columnCount: metrics.columnCount,
			overscanRows: this.overscanRows,
		});
		this.spacerEl.style.height = `${projection.totalHeight}px`;
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
		const signature = [
			file.path,
			file.name,
			file.extension,
			this.activePath === file.path ? '1' : '0',
			this.selectedFiles.has(file.path) ? '1' : '0',
			Array.from(this.visibleCells).sort().join(','),
			propCount,
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
		this.contentEl.appendChild(card);
		this.rowEls.set(file.path, card);
		card.dataset.path = file.path;
		card.draggable = Boolean(this.callbacks.onDragStart);
		card.style.top = `${position.top + this.gap}px`;
		card.style.left = `${position.left}px`;
		card.style.width = `${position.width}px`;
		card.oncontextmenu = (event) => {
			event.preventDefault();
			this.callbacks.onContextMenu(file, event);
		};
		card.ondragstart = (event) => this.callbacks.onDragStart?.(file, event);
		card.onclick = (event) => {
			if (event.ctrlKey || event.metaKey) {
				this.toggleSelection(file.path);
				return;
			}
			this.callbacks.onFileClick(file);
		};
		card.onkeydown = (event) => {
			if (event.key !== 'Enter' && event.key !== ' ') return;
			event.preventDefault();
			this.callbacks.onFileClick(file);
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

		if (this.visibleCells.has('icon')) {
			const iconEl = card.createDiv({ cls: 'vaultman-files-grid-card-icon' });
			setIcon(iconEl, this.iconForFile(file));
		}
		if (this.visibleCells.has('name')) {
			card.createDiv({
				cls: 'vaultman-files-grid-card-name',
				text: formatFileTableName(file),
			});
		}
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
		this.renderBadges(card, badges);
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

	private toggleSelection(path: string): void {
		if (this.selectedFiles.has(path)) this.selectedFiles.delete(path);
		else this.selectedFiles.add(path);
		this.callbacks.onSelectionChange(new Set(this.selectedFiles));
		this.renderWindow();
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
}
