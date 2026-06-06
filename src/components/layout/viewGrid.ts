// src/components/GridView.ts
import { setIcon, type App, type TFile } from 'obsidian';
import { translate } from '../../i18n/index';
import { buildVirtualTableWindow } from '../../utils/tableVirtualization';

export type SortColumn = 'name' | 'props' | 'path' | 'date' | 'ext';
export type SortDirection = 'asc' | 'desc';

export interface GridViewCallbacks {
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
	private readonly rowHeight = 30;
	private readonly overscan = 8;
	private visibleCells = new Set<string>([
		'name',
		'ext',
		'path',
	]);
	private readonly onScroll = () => this._renderWindow();

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
		this._renderHeader(files, totalCount);
		this.displayedFiles = this._sortFiles(files);
		if (this.tableEl) {
			this.tableEl.style.height = `${this.displayedFiles.length * this.rowHeight}px`;
		}
		if (this.tbodyEl) {
			this.tbodyEl.style.height = `${this.displayedFiles.length * this.rowHeight}px`;
		}
		this._renderWindow();
	}

	private _ensureScaffold(): void {
		if (this.listEl && this.tbodyEl && this.containerEl.contains(this.listEl))
			return;

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

	private _renderHeader(files: TFile[], totalCount: number): void {
		if (!this.headerEl) return;
		this.headerEl.empty();
		const row = this.headerEl.createDiv({
			cls: 'bases-tr vaultman-files-table-header-row',
		});
		row.style.gridTemplateColumns = this._gridColumns();

		if (this.visibleCells.has('icon')) {
			row.createDiv({ cls: 'bases-td vaultman-files-col-icon' });
		}
		if (this.visibleCells.has('name')) {
			this._createSortHeader(
				row,
				'name',
				translate('files.col.file_name'),
				files,
				totalCount,
				'mod-implicit',
				'file.name',
			);
		}
		if (this.visibleCells.has('count')) {
			this._createSortHeader(
				row,
				'props',
				translate('files.col.props'),
				files,
				totalCount,
				'',
				'vaultman.props',
			);
		}
		if (this.visibleCells.has('ext')) {
			this._createSortHeader(
				row,
				'ext',
				translate('files.col.file_ext'),
				files,
				totalCount,
				'mod-implicit',
				'file.ext',
			);
		}
		if (this.visibleCells.has('date')) {
			this._createSortHeader(
				row,
				'date',
				translate('files.col.date'),
				files,
				totalCount,
				'',
				'file.mtime',
			);
		}
		if (this.visibleCells.has('path')) {
			this._createSortHeader(
				row,
				'path',
				translate('files.col.file_folder'),
				files,
				totalCount,
				'mod-implicit',
				'file.folder',
			);
		}
	}

	private _createSortHeader(
		parent: HTMLElement,
		col: SortColumn,
		label: string,
		files: TFile[],
		total: number,
		modClass = '',
		dataProperty = '',
	): void {
		const isActive = this.sortColumn === col;
		const cell = parent.createDiv({
			cls: `bases-td ${modClass}`.trim(),
		});
		if (dataProperty) cell.dataset.property = dataProperty;
		const header = cell.createDiv({ cls: 'bases-table-header' });
		const btn = header.createEl('button', {
			cls: `bases-table-header-label vaultman-col-header${isActive ? ' active' : ''}`,
		});
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
				this.sortDirection === 'asc'
					? 'lucide-arrow-up'
					: 'lucide-arrow-down',
			);
		}
		btn.addEventListener('click', () => {
			if (this.sortColumn === col) {
				this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
			} else {
				this.sortColumn = col;
				this.sortDirection = 'asc';
			}
			this.render(files, total);
		});
		header.createDiv({ cls: 'bases-table-header-resizer' });
	}

	setSortColumn(col: SortColumn, dir: SortDirection): void {
		this.sortColumn = col;
		this.sortDirection = dir;
	}

	setVisibleCells(cells: Set<string>): void {
		this.visibleCells = new Set(cells);
	}

	setActivePath(path: string | null): void {
		this.activePath = path;
	}

	private _gridColumns(): string {
		const columns: string[] = [];
		if (this.visibleCells.has('icon')) columns.push('26px');
		if (this.visibleCells.has('name')) columns.push('minmax(180px, 1fr)');
		if (this.visibleCells.has('count')) columns.push('68px');
		if (this.visibleCells.has('ext')) columns.push('68px');
		if (this.visibleCells.has('date')) columns.push('96px');
		if (this.visibleCells.has('path')) columns.push('minmax(120px, 0.8fr)');
		return columns.join(' ');
	}

	private _renderWindow(): void {
		if (!this.listEl || !this.tbodyEl) return;
		const projection = buildVirtualTableWindow({
			rows: this.displayedFiles,
			scrollTop: this.listEl.scrollTop,
			viewportHeight: this.listEl.clientHeight,
			rowHeight: this.rowHeight,
			overscan: this.overscan,
		});
		this.tbodyEl.empty();
		for (const row of projection.visibleRows) {
			this._renderRow(this.tbodyEl, row.row, row.top);
		}
	}

	private _renderRow(parent: HTMLElement, file: TFile, top: number): void {
		const row = parent.createDiv({
			cls: 'bases-tr vaultman-file-row vaultman-file-table-row',
		});
		row.dataset.path = file.path;
		row.style.gridTemplateColumns = this._gridColumns();
		row.style.top = `${top}px`;
		row.style.height = `${this.rowHeight}px`;

		if (this.visibleCells.has('icon')) {
			const cell = row.createDiv({ cls: 'bases-td' });
			const iconEl = cell.createSpan({
				cls: 'bases-table-cell vaultman-file-icon',
			});
			setIcon(iconEl, 'lucide-file');
		}
		if (this.visibleCells.has('name')) {
			const cell = row.createDiv({ cls: 'bases-td mod-implicit' });
			cell.dataset.property = 'file.name';
			const nameEl = cell.createSpan({
				cls: 'bases-table-cell bases-rendered-value markdown-rendered internal-link vaultman-file-name',
				text: file.basename,
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

		const fm = this.app.metadataCache.getFileCache(file)?.frontmatter ?? {};
		const propCount = Object.keys(fm).filter((k) => k !== 'position').length;
		if (this.visibleCells.has('count')) {
			this._renderTextCell(
				row,
				String(propCount),
				'vaultman-file-props',
				'vaultman.props',
			);
		}
		if (this.visibleCells.has('ext')) {
			this._renderTextCell(
				row,
				file.extension,
				'vaultman-file-ext',
				'file.ext',
			);
		}
		if (this.visibleCells.has('date')) {
			this._renderTextCell(
				row,
				new Date(file.stat.mtime).toLocaleDateString(),
				'vaultman-file-date',
				'file.mtime',
			);
		}
		if (this.visibleCells.has('path')) {
			this._renderTextCell(
				row,
				file.parent?.path ?? '',
				'vaultman-file-path',
				'file.folder',
			);
		}

		row.addEventListener('contextmenu', (event) => {
			event.preventDefault();
			this.callbacks.onContextMenu(file, event);
		});
	}

	private _renderTextCell(
		row: HTMLElement,
		text: string,
		cls: string,
		dataProperty = '',
	): void {
		const cell = row.createDiv({ cls: 'bases-td' });
		if (dataProperty) cell.dataset.property = dataProperty;
		const valueEl = cell.createSpan({
			cls: `bases-table-cell bases-rendered-value ${cls}`,
			text,
		});
		valueEl.dataset.propertyType = 'text';
	}

	private _sortFiles(files: TFile[]): TFile[] {
		const sorted = [...files];
		const dir = this.sortDirection === 'asc' ? 1 : -1;
		sorted.sort((a, b) => {
			if (this.sortColumn === 'name')
				return dir * a.basename.localeCompare(b.basename);
			if (this.sortColumn === 'path')
				return dir * (a.parent?.path ?? '').localeCompare(b.parent?.path ?? '');
			if (this.sortColumn === 'date')
				return dir * (a.stat.mtime - b.stat.mtime);
			if (this.sortColumn === 'ext')
				return dir * a.extension.localeCompare(b.extension);
			const aFm = this.app.metadataCache.getFileCache(a)?.frontmatter ?? {};
			const bFm = this.app.metadataCache.getFileCache(b)?.frontmatter ?? {};
			const aC = Object.keys(aFm).filter((k) => k !== 'position').length;
			const bC = Object.keys(bFm).filter((k) => k !== 'position').length;
			return dir * (aC - bC);
		});
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
		this._renderWindow();
	}
}
