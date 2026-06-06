// src/components/GridView.ts
import { setIcon, type App, type TFile } from 'obsidian';
import { translate } from '../../i18n/index';
import { buildVirtualTableWindow } from '../../utils/tableVirtualization';
import {
	compareFilesForExplorer,
	normalizeExplorerSortBy,
	type ExplorerFileTimes,
} from '../../logic/logicSort';
import {
	formatFileTableName,
	resolveFileTableLayout,
	type FileTableColumn,
	type FileTableLayout,
} from '../../logic/logicTableLayout';
import { vaultmanPerfMonitor } from '../../utils/performanceMonitor';

export type SortColumn = 'name' | 'props' | 'path' | 'mtime' | 'ctime' | 'ext';
export type SortDirection = 'asc' | 'desc';

export interface GridViewCallbacks {
	getFileTimes?: (file: TFile) => ExplorerFileTimes;
	onContextMenu: (file: TFile, e: MouseEvent) => void;
	onSelectionChange: (selected: Set<string>) => void;
	onFileClick: (file: TFile) => void;
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
	private pendingRaf: number | null = null;
	private pendingScrollTimer: number | null = null;
	private readonly rowHeight = 30;
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

	render(files: TFile[], totalCount: number): void {
		this._ensureScaffold();
		this.displayedFiles = this._sortFiles(files);
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
		this.selectedFiles.clear();
	}

	private _ensureScaffold(): void {
		if (this.listEl && this.tbodyEl && this.containerEl.contains(this.listEl))
			return;

		this.listEl?.removeEventListener('scroll', this.onScroll);
		this.containerEl.empty();
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
		this.headerEl.style.width = `${layout.totalWidth}px`;
		const row = this.headerEl.createDiv({
			cls: 'bases-tr vaultman-files-table-header-row',
		});
		row.style.width = `${layout.totalWidth}px`;

		for (const column of layout.columns) {
			if (column.id === 'icon') {
				const cell = row.createDiv({
					cls: 'bases-td vaultman-files-col-icon',
				});
				this._positionCell(cell, column);
				continue;
			}
			this._createSortHeader(
				row,
				column,
				this._headerLabel(column),
				files,
				totalCount,
			);
		}
		this._syncHeaderScroll();
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
			setIcon(
				sortIcon,
				this.sortDirection === 'asc' ? 'lucide-arrow-up' : 'lucide-arrow-down',
			);
		}
		const updateSort = () => {
			if (this.sortColumn === col) {
				this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
			} else {
				this.sortColumn = col;
				this.sortDirection = 'asc';
			}
			this.render(files, total);
		};
		btn.addEventListener('click', updateSort);
		btn.addEventListener('keydown', (event) => {
			if (event.key !== 'Enter' && event.key !== ' ') return;
			event.preventDefault();
			updateSort();
		});
		header.createDiv({ cls: 'bases-table-header-resizer' });
	}

	setSortColumn(col: SortColumn, dir: SortDirection): void {
		this.sortColumn = normalizeExplorerSortBy(col) as SortColumn;
		this.sortDirection = dir;
	}

	setVisibleCells(cells: Set<string>): void {
		this.visibleCells = new Set(cells);
	}

	setActivePath(path: string | null): void {
		this.activePath = path;
	}

	private _layout(): FileTableLayout {
		const dateSortColumn = this.sortColumn === 'ctime' ? 'ctime' : 'mtime';
		return resolveFileTableLayout(this.visibleCells, dateSortColumn);
	}

	private _applyTableDimensions(layout: FileTableLayout): void {
		const width = `${layout.totalWidth}px`;
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
		this.tbodyEl.empty();
		const layout = this._layout();
		this._applyTableDimensions(layout);
		for (const row of projection.visibleRows) {
			this._renderRow(this.tbodyEl, row.row, row.top, layout);
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

	private _renderRow(
		parent: HTMLElement,
		file: TFile,
		top: number,
		layout: FileTableLayout,
	): void {
		const row = parent.createDiv({
			cls: 'bases-tr vaultman-file-row vaultman-file-table-row',
		});
		row.dataset.path = file.path;
		row.style.top = `${top}px`;
		row.style.height = `${this.rowHeight}px`;
		row.style.width = `${layout.totalWidth}px`;

		const fm = this.app.metadataCache.getFileCache(file)?.frontmatter ?? {};
		const propCount = Object.keys(fm).filter((k) => k !== 'position').length;

		for (const column of layout.columns) {
			if (column.id === 'icon') {
				this._renderIconCell(row, column, file);
			} else if (column.id === 'name') {
				this._renderNameCell(row, column, file);
			} else if (column.id === 'count') {
				this._renderTextCell(
					row,
					column,
					String(propCount),
					'vaultman-file-props',
				);
			} else if (column.id === 'ext') {
				this._renderTextCell(row, column, file.extension, 'vaultman-file-ext');
			} else if (column.id === 'date') {
				const times = this.callbacks.getFileTimes?.(file) ?? file.stat;
				this._renderTextCell(
					row,
					column,
					new Date(
						this.sortColumn === 'ctime' ? times.ctime : times.mtime,
					).toLocaleDateString(),
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

		row.addEventListener('contextmenu', (event) => {
			event.preventDefault();
			this.callbacks.onContextMenu(file, event);
		});
	}

	private _renderIconCell(
		row: HTMLElement,
		column: FileTableColumn,
		file: TFile,
	): void {
		const cell = row.createDiv({ cls: 'bases-td' });
		this._positionCell(cell, column);
		const iconEl = cell.createSpan({
			cls: 'bases-table-cell vaultman-file-icon',
		});
		setIcon(
			iconEl,
			file.extension === 'base' ? 'lucide-database' : 'lucide-file',
		);
	}

	private _renderNameCell(
		row: HTMLElement,
		column: FileTableColumn,
		file: TFile,
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
		if (file.path === this.activePath) {
			for (const className of [
				'tree-item-self',
				'nav-file-title',
				'tappable',
				'is-clickable',
				'is-active',
			]) {
				nameEl.addClass(className);
			}
		}
		nameEl.addEventListener('click', () => this.callbacks.onFileClick(file));
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
	}

	private _headerLabel(column: FileTableColumn): string {
		if (column.id === 'name') return translate('files.col.file_name');
		if (column.id === 'count') return translate('files.col.props');
		if (column.id === 'ext') return translate('files.col.file_ext');
		if (column.id === 'date') {
			return translate(
				column.sortColumn === 'ctime'
					? 'files.col.created'
					: 'files.col.modified',
			);
		}
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
					getFileTimes: this.callbacks.getFileTimes,
				},
			),
		);
		return sorted;
	}

	getSelectedFiles(): TFile[] {
		return this.displayedFiles.filter((file) =>
			this.selectedFiles.has(file.path),
		);
	}

	scrollToPath(path: string): void {
		const index = this.displayedFiles.findIndex((file) => file.path === path);
		if (index === -1 || !this.listEl) return;
		this.listEl.scrollTop = Math.max(0, index * this.rowHeight);
		this.scheduleWindowRender();
	}
}
