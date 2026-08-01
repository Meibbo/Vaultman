// src/components/GridView.ts
import { Platform, setIcon, type App, type TFile } from 'obsidian';
import { translate } from '../../i18n/index';
import { buildVirtualTableWindow } from '../../utils/tableVirtualization';
import type { NodeBadge } from '../../types/typeTree';
import {
	compareFilesForExplorer,
	nextExplorerSortDirection,
	normalizeExplorerSortBy,
	sortDirectionIcon,
	type ExplorerFileTimes,
} from '../../logic/logicSort';
import {
	clampFileTableColumnWidth,
	formatFileTableName,
	resolveFileTableLayout,
	type FileTableColumn,
	type FileTableColumnWidths,
	type FileTableLayout,
} from '../../logic/logicTableLayout';
import { vaultmanPerfMonitor } from '../../utils/performanceMonitor';
import { elementContentWidth } from '../../utils/elementDimensions';
import {
	explorerDensityProfile,
	usesMobileExplorerDensity,
} from '../../logic/logicResponsiveLayout';
import type { ResolvedExplorerIcon } from '../../logic/logicFileIcons';
import { renderIconValue } from '../../utils/renderIconValue';

export type SortColumn =
	| 'name'
	| 'props'
	| 'words'
	| 'tasks'
	| 'path'
	| 'mtime'
	| 'ctime'
	| 'ext';
export type SortDirection = 'asc' | 'desc';

const ACTIVE_FILE_CLASSES = [
	'tree-item-self',
	'nav-file-title',
	'tappable',
	'is-clickable',
	'is-active',
] as const;

export interface GridViewCallbacks {
	getFileTimes?: (file: TFile) => ExplorerFileTimes;
	getWordCount?: (file: TFile) => number | null;
	getTaskCount?: (file: TFile) => number | null;
	getBadges?: (file: TFile) => NodeBadge[];
	getFileIcon?: (
		file: TFile,
		defaultIcon: string,
	) => ResolvedExplorerIcon | null;
	getGlyphColor?: (file: TFile, index: number) => string | null;
	onContextMenu: (file: TFile, e: MouseEvent) => void;
	onSelectionChange: (selected: Set<string>) => void;
	onFileClick: (file: TFile, event?: MouseEvent | KeyboardEvent) => void;
	onFileHover?: (file: TFile, element: HTMLElement) => void;
	onSortChange?: (column: SortColumn, direction: SortDirection) => void;
	onDragStart?: (file: TFile, event: DragEvent) => void;
	/**
	 * U121-027: supplied by the explorer so table dates follow the same
	 * relative/specific mode as the tree cells. Absent = the 1.2.0 absolute date.
	 */
	formatTimestamp?: (time: number) => string | undefined;
}

export class GridView {
	private containerEl: HTMLElement;
	private app: App;
	private callbacks: GridViewCallbacks;

	readonly selectedFiles = new Set<string>();
	private displayedFiles: TFile[] = [];
	private sortColumn: SortColumn = 'name';
	private sortDirection: SortDirection = 'asc';
	private headerEl: HTMLElement | null = null;
	private listEl: HTMLElement | null = null;
	private tableEl: HTMLElement | null = null;
	private tbodyEl: HTMLElement | null = null;
	private activePath: string | null = null;
	private rowEls = new Map<string, HTMLElement>();
	private pendingRaf: number | null = null;
	private pendingScrollTimer: number | null = null;
	private totalCount = 0;
	private columnWidths: FileTableColumnWidths = {};
	private readonly overscan = 8;
	private visibleCells = new Set<string>(['name', 'ext', 'path']);
	private readonly onScroll = () => {
		this._syncHeaderScroll();
		this.scheduleWindowRender();
	};

	constructor(
		containerEl: HTMLElement,
		app: App,
		callbacks: GridViewCallbacks,
	) {
		this.containerEl = containerEl;
		this.app = app;
		this.callbacks = callbacks;
	}

	private get rowHeight(): number {
		const body = this.containerEl.ownerDocument.body;
		const isMobile = usesMobileExplorerDensity(
			Platform.isMobile,
			body.classList,
		);
		return explorerDensityProfile(isMobile).tableRowHeight;
	}

	render(files: TFile[], totalCount: number): void {
		this._ensureScaffold();
		this.displayedFiles = this._sortFiles(files);
		this.totalCount = totalCount;
		const layout = this._layout();
		this._renderHeader(files, totalCount, layout);
		this._applyTableDimensions(layout);
		if (this.tableEl) {
			this.tableEl.style.height = `${this.displayedFiles.length * this.rowHeight}px`;
		}
		if (this.tbodyEl) {
			this.tbodyEl.style.height = `${this.displayedFiles.length * this.rowHeight}px`;
		}
		this.cancelScheduledRender();
		this._renderWindow();
	}

	/** Re-measure only the cached table window after its pane becomes visible. */
	refreshViewport(): void {
		this.cancelScheduledRender();
		this._syncHeaderScroll();
		this._renderWindow();
	}

	destroy(): void {
		this.cancelScheduledRender();
		this.listEl?.removeEventListener('scroll', this.onScroll);
		this.containerEl.removeClass('vaultman-files-table-root');
		this.containerEl.empty();
		this.headerEl = null;
		this.listEl = null;
		this.tableEl = null;
		this.tbodyEl = null;
		this.displayedFiles = [];
		this.rowEls.clear();
		this.selectedFiles.clear();
		this.totalCount = 0;
	}

	private _ensureScaffold(): void {
		if (this.listEl && this.tbodyEl && this.containerEl.contains(this.listEl))
			return;

		this.listEl?.removeEventListener('scroll', this.onScroll);
		this.containerEl.empty();
		this.rowEls.clear();
		this.containerEl.addClass('vaultman-files-table-root');

		this.headerEl = this.containerEl.createDiv({
			cls: 'bases-thead vaultman-files-col-header vaultman-files-table-header',
		});

		this.listEl = this.containerEl.createDiv({
			cls: 'bases-table-container node-insert-event vaultman-files-list vaultman-files-table',
		});
		this.tableEl = this.listEl.createDiv({
			cls: 'bases-table vaultman-files-table-virtual-table',
		});
		this.tbodyEl = this.tableEl.createDiv({
			cls: 'bases-tbody vaultman-files-table-virtual-body',
		});
		this.listEl.addEventListener('scroll', this.onScroll, { passive: true });
	}

	private _renderHeader(
		files: TFile[],
		totalCount: number,
		layout: FileTableLayout,
	): void {
		if (!this.headerEl) return;
		this.headerEl.empty();
		const width = `${this.surfaceWidth(layout)}px`;
		this.headerEl.style.width = width;
		const row = this.headerEl.createDiv({
			cls: 'bases-tr vaultman-files-table-header-row',
		});
		row.style.width = width;

		for (const column of layout.columns) {
			if (column.id === 'icon') {
				const cell = row.createDiv({
					cls: 'bases-td vaultman-files-col-icon',
				});
				this._positionCell(cell, column);
				continue;
			}
			if (column.sortColumn) {
				this._createSortHeader(
					row,
					column,
					this._headerLabel(column),
					files,
					totalCount,
				);
			} else {
				this._createStaticHeader(row, column, this._headerLabel(column));
			}
		}
		this._syncHeaderScroll();
	}

	private _createStaticHeader(
		parent: HTMLElement,
		column: FileTableColumn,
		label: string,
	): void {
		const cell = parent.createDiv({
			cls: `bases-td ${column.modClass ?? ''}`.trim(),
		});
		this._positionCell(cell, column);
		if (column.dataProperty) cell.dataset.property = column.dataProperty;
		const header = cell.createDiv({ cls: 'bases-table-header' });
		const headerLabel = header.createDiv({
			cls: 'bases-table-header-label vaultman-col-header',
		});
		headerLabel.createDiv({ cls: 'bases-table-header-icon' });
		headerLabel.createSpan({
			cls: 'bases-table-header-name',
			text: label,
		});
		const resizer = header.createDiv({ cls: 'bases-table-header-resizer' });
		this.attachColumnResizer(resizer, column);
	}

	private _createSortHeader(
		parent: HTMLElement,
		column: FileTableColumn,
		label: string,
		files: TFile[],
		total: number,
	): void {
		const col = column.sortColumn;
		if (!col) return;
		const isActive = this.sortColumn === col;
		const cell = parent.createDiv({
			cls: `bases-td ${column.modClass ?? ''}`.trim(),
		});
		this._positionCell(cell, column);
		if (column.dataProperty) cell.dataset.property = column.dataProperty;
		const header = cell.createDiv({ cls: 'bases-table-header' });
		const btn = header.createDiv({
			cls: `bases-table-header-label vaultman-col-header${isActive ? ' active' : ''}`,
		});
		btn.setAttribute('role', 'button');
		btn.setAttribute('tabindex', '0');
		btn.createDiv({ cls: 'bases-table-header-icon' });
		const name = btn.createSpan({
			cls: 'bases-table-header-name',
			text: label,
		});
		name.setAttribute(
			'data-sort-direction',
			isActive ? this.sortDirection : 'none',
		);
		const sortIcon = btn.createSpan({ cls: 'bases-table-header-sort' });
		if (isActive) {
			setIcon(sortIcon, sortDirectionIcon(this.sortDirection));
		}
		const updateSort = () => {
			this.sortDirection = nextExplorerSortDirection(
				this.sortColumn,
				this.sortDirection,
				col,
			);
			this.sortColumn = col;
			if (this.callbacks.onSortChange) {
				this.callbacks.onSortChange(this.sortColumn, this.sortDirection);
			} else {
				this.render(files, total);
			}
		};
		btn.addEventListener('click', updateSort);
		btn.addEventListener('keydown', (event) => {
			if (event.key !== 'Enter' && event.key !== ' ') return;
			event.preventDefault();
			updateSort();
		});
		const resizer = header.createDiv({ cls: 'bases-table-header-resizer' });
		this.attachColumnResizer(resizer, column);
	}

	setSortColumn(col: SortColumn, dir: SortDirection): void {
		this.sortColumn = normalizeExplorerSortBy(col) as SortColumn;
		this.sortDirection = dir;
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
		const nameEl = this.rowEls
			.get(path)
			?.querySelector<HTMLElement>('.vaultman-file-name');
		if (!nameEl) return;
		for (const className of ACTIVE_FILE_CLASSES) {
			nameEl.toggleClass(className, active);
		}
	}

	setSelectedPaths(paths: ReadonlySet<string>): void {
		if (
			this.selectedFiles.size === paths.size &&
			[...paths].every((path) => this.selectedFiles.has(path))
		) {
			return;
		}
		this.selectedFiles.clear();
		for (const path of paths) this.selectedFiles.add(path);
		this._renderWindow();
	}

	private _layout(): FileTableLayout {
		const dateSortColumn = this.sortColumn === 'ctime' ? 'ctime' : 'mtime';
		return resolveFileTableLayout(
			this.visibleCells,
			dateSortColumn,
			this.columnWidths,
		);
	}

	private attachColumnResizer(
		resizer: HTMLElement,
		column: FileTableColumn,
	): void {
		resizer.onpointerdown = (event) => {
			event.preventDefault();
			event.stopPropagation();
			const startX = event.clientX;
			const startWidth = column.width;
			const ownerWindow = resizer.ownerDocument.defaultView ?? window;
			const ownerBody = resizer.ownerDocument.body;
			ownerBody.classList.add('vaultman-table-resizing');

			const onMove = (moveEvent: PointerEvent) => {
				const nextWidth = clampFileTableColumnWidth(
					column.id,
					startWidth + moveEvent.clientX - startX,
				);
				if (this.columnWidths[column.id] === nextWidth) return;
				this.columnWidths = {
					...this.columnWidths,
					[column.id]: nextWidth,
				};
				const layout = this._layout();
				this._renderHeader(this.displayedFiles, this.totalCount, layout);
				this._applyTableDimensions(layout);
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

	private _applyTableDimensions(layout: FileTableLayout): void {
		const width = `${this.surfaceWidth(layout)}px`;
		if (this.headerEl) this.headerEl.style.width = width;
		if (this.tableEl) this.tableEl.style.width = width;
		if (this.tbodyEl) {
			this.tbodyEl.style.width = width;
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

	private surfaceWidth(layout: FileTableLayout): number {
		const viewportWidth = this.listEl
			? elementContentWidth(this.listEl)
			: this.containerEl.clientWidth;
		return Math.max(layout.totalWidth, viewportWidth);
	}

	private _positionCell(cell: HTMLElement, column: FileTableColumn): void {
		cell.style.insetInlineStart = `${column.left}px`;
		cell.style.width = `${column.width}px`;
	}

	private _renderWindow(): void {
		if (!this.listEl || !this.tbodyEl) return;
		const started = performance.now();
		const projection = buildVirtualTableWindow({
			rows: this.displayedFiles,
			scrollTop: this.listEl.scrollTop,
			viewportHeight: this.listEl.clientHeight,
			rowHeight: this.rowHeight,
			overscan: this.overscan,
		});
		const visiblePaths = new Set(
			projection.visibleRows.map((row) => row.row.path),
		);
		this.removeStaleRows(visiblePaths);
		const layout = this._layout();
		this._applyTableDimensions(layout);
		for (const row of projection.visibleRows) {
			this._renderRow(this.tbodyEl, row.row, row.index, row.top, layout);
		}
		vaultmanPerfMonitor.record(
			'files.table.window',
			performance.now() - started,
			{
				rows: this.displayedFiles.length,
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

	private removeStaleRows(visiblePaths: Set<string>): void {
		for (const [path, row] of this.rowEls) {
			if (visiblePaths.has(path)) continue;
			row.remove();
			this.rowEls.delete(path);
		}
	}

	private rowSignature(
		file: TFile,
		layout: FileTableLayout,
		propCount: number,
		times: ExplorerFileTimes,
		wordCount: number | null,
		badges: NodeBadge[],
		glyphColor: string | null,
	): string {
		const resolvedIcon = this._resolvedFileIcon(file);
		const columns = layout.columns
			.map(
				(column) =>
					`${column.id}:${column.left}:${column.width}:${column.sortColumn ?? ''}`,
			)
			.join('|');
		return [
			file.path,
			file.name,
			file.extension,
			resolvedIcon?.icon ?? '',
			resolvedIcon?.color ?? '',
			glyphColor ?? '',
			file.parent?.path ?? '',
			file.stat.ctime,
			file.stat.mtime,
			times.ctime,
			times.mtime,
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
			this.sortColumn,
			this.selectedFiles.has(file.path) ? '1' : '0',
			columns,
		].join('\u001f');
	}

	private _renderRow(
		parent: HTMLElement,
		file: TFile,
		index: number,
		top: number,
		layout: FileTableLayout,
	): void {
		const fm = this.app.metadataCache.getFileCache(file)?.frontmatter ?? {};
		const propCount = Object.keys(fm).filter((k) => k !== 'position').length;
		const times = this.callbacks.getFileTimes?.(file) ?? file.stat;
		const needsWordCount = layout.columns.some(
			(column) => column.id === 'words',
		);
		const wordCount = needsWordCount
			? (this.callbacks.getWordCount?.(file) ?? null)
			: null;
		const badges = this.callbacks.getBadges?.(file) ?? [];
		const glyphColor = this.callbacks.getGlyphColor?.(file, index) ?? null;
		const signature = this.rowSignature(
			file,
			layout,
			propCount,
			times,
			wordCount,
			badges,
			glyphColor,
		);
		const row =
			this.rowEls.get(file.path) ??
			parent.createDiv({
				cls: 'bases-tr vaultman-file-row vaultman-file-table-row',
			});
		// Same guard as viewTree: rows are recycled and absolutely placed, so a
		// redundant re-parent only serves to cancel a click or hover in flight.
		if (row.parentElement !== parent) parent.appendChild(row);
		this.rowEls.set(file.path, row);
		row.dataset.path = file.path;
		row.draggable = Boolean(this.callbacks.onDragStart);
		row.style.top = `${top}px`;
		row.style.height = `${this.rowHeight}px`;
		row.style.width = `${this.surfaceWidth(layout)}px`;
		row.onpointerenter = () => this.callbacks.onFileHover?.(file, row);
		row.oncontextmenu = (event) => {
			event.preventDefault();
			this.callbacks.onContextMenu(file, event);
		};
		row.ondragstart = (event) => this.callbacks.onDragStart?.(file, event);
		if (row.dataset.renderSignature === signature) {
			return;
		}
		row.empty();
		row.className = 'bases-tr vaultman-file-row vaultman-file-table-row';
		row.dataset.renderSignature = signature;
		row.toggleClass('is-selected', this.selectedFiles.has(file.path));

		for (const column of layout.columns) {
			if (column.id === 'icon') {
				this._renderIconCell(row, column, file, glyphColor);
			} else if (column.id === 'name') {
				this._renderNameCell(row, column, file, badges, glyphColor);
			} else if (column.id === 'count') {
				this._renderTextCell(
					row,
					column,
					String(propCount),
					'vaultman-file-props',
				);
			} else if (column.id === 'words') {
				this._renderTextCell(
					row,
					column,
					wordCount == null ? '' : String(wordCount),
					'vaultman-file-words',
				);
			} else if (column.id === 'ext') {
				this._renderTextCell(
					row,
					column,
					this.visibleExtension(file),
					'vaultman-file-ext',
				);
			} else if (column.id === 'mtime' || column.id === 'ctime') {
				const raw = times[column.id];
				this._renderTextCell(
					row,
					column,
					this.callbacks.formatTimestamp?.(raw) ??
						new Date(raw).toLocaleDateString(),
					'vaultman-file-date',
				);
			} else if (column.id === 'path') {
				this._renderTextCell(
					row,
					column,
					file.parent?.path && file.parent.path !== '' ? file.parent.path : '/',
					'vaultman-file-path',
				);
			}
		}
	}

	private _renderIconCell(
		row: HTMLElement,
		column: FileTableColumn,
		file: TFile,
		glyphColor: string | null,
	): void {
		const cell = row.createDiv({ cls: 'bases-td' });
		this._positionCell(cell, column);
		const resolvedIcon = this._resolvedFileIcon(file);
		if (!resolvedIcon) return;
		const iconEl = cell.createSpan({
			cls: 'bases-table-cell vaultman-file-icon',
		});
		renderIconValue(
			iconEl,
			resolvedIcon.icon,
			resolvedIcon.color ?? glyphColor ?? undefined,
		);
	}

	private _resolvedFileIcon(file: TFile): ResolvedExplorerIcon | null {
		const defaultIcon =
			file.extension === 'base' ? 'lucide-database' : 'lucide-file';
		if (!this.callbacks.getFileIcon) return { icon: defaultIcon };
		return this.callbacks.getFileIcon(file, defaultIcon);
	}

	private _renderNameCell(
		row: HTMLElement,
		column: FileTableColumn,
		file: TFile,
		badges: NodeBadge[],
		glyphColor: string | null,
	): void {
		const cell = row.createDiv({ cls: 'bases-td mod-implicit' });
		this._positionCell(cell, column);
		if (column.dataProperty) cell.dataset.property = column.dataProperty;
		const nameEl = cell.createSpan({
			cls: 'bases-table-cell bases-rendered-value markdown-rendered internal-link vaultman-file-name',
			text: formatFileTableName(file),
		});
		nameEl.dataset.href = file.path;
		nameEl.draggable = true;
		nameEl.addEventListener('dragstart', (event) =>
			this.callbacks.onDragStart?.(file, event),
		);
		if (file.path === this.activePath) {
			for (const className of ACTIVE_FILE_CLASSES) {
				nameEl.addClass(className);
			}
		}
		if (glyphColor) nameEl.style.color = glyphColor;
		this.renderBadges(cell, badges);
		nameEl.addEventListener('click', (event) =>
			this.callbacks.onFileClick(file, event),
		);
		nameEl.addEventListener('auxclick', (event) => {
			if (event.button !== 1) return;
			event.preventDefault();
			this.callbacks.onFileClick(file, event);
		});
	}

	private renderBadges(parent: HTMLElement, badges: NodeBadge[]): void {
		if (badges.length === 0) return;
		const zone = parent.createSpan({
			cls: 'vaultman-tree-badge-zone vaultman-file-table-badge-zone',
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

	private _renderTextCell(
		row: HTMLElement,
		column: FileTableColumn,
		text: string,
		cls: string,
	): void {
		const cell = row.createDiv({
			cls: `bases-td ${column.modClass ?? ''}`.trim(),
		});
		this._positionCell(cell, column);
		if (column.dataProperty) cell.dataset.property = column.dataProperty;
		const valueEl = cell.createSpan({
			cls: `bases-table-cell bases-rendered-value ${cls}`,
			text,
		});
		valueEl.dataset.propertyType = 'text';
		// U121-027: mtime and ctime share `vaultman-file-date`, so the column id
		// is the only identity a targeted cell patch can address.
		valueEl.dataset.cell = column.id;
	}

	private visibleExtension(file: TFile): string {
		return file.extension === 'md' || file.extension === 'markdown'
			? ''
			: file.extension;
	}

	private _headerLabel(column: FileTableColumn): string {
		if (column.id === 'name') return translate('files.col.file_name');
		if (column.id === 'count') return translate('files.col.props');
		if (column.id === 'words') return translate('files.col.words');
		if (column.id === 'ext') return translate('files.col.file_ext');
		if (column.id === 'mtime') return translate('files.col.modified');
		if (column.id === 'ctime') return translate('files.col.created');
		return translate('files.col.file_folder');
	}

	private _sortFiles(files: TFile[]): TFile[] {
		const sorted = [...files];
		sorted.sort((a, b) =>
			compareFilesForExplorer(
				a,
				b,
				this.sortColumn === 'props' ? 'count' : this.sortColumn,
				this.sortDirection,
				{
					countForFile: (file) => {
						const fm =
							this.app.metadataCache.getFileCache(file)?.frontmatter ?? {};
						return Object.keys(fm).filter((k) => k !== 'position').length;
					},
					wordCountForFile: this.callbacks.getWordCount,
					taskCountForFile: this.callbacks.getTaskCount,
					getFileTimes: this.callbacks.getFileTimes,
				},
			),
		);
		return sorted;
	}

	getDisplayedFiles(): readonly TFile[] {
		return this.displayedFiles;
	}

	getSelectedFiles(): TFile[] {
		return this.displayedFiles.filter((file) =>
			this.selectedFiles.has(file.path),
		);
	}

	scrollToPath(path: string, behavior: ScrollBehavior = 'auto'): void {
		const index = this.displayedFiles.findIndex((file) => file.path === path);
		if (index === -1 || !this.listEl) return;
		this.listEl.scrollTo({
			top: Math.max(0, index * this.rowHeight),
			behavior,
		});
		this.scheduleWindowRender();
	}
}
