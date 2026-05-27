// src/components/GridView.ts
import type { App, TFile } from 'obsidian';
import { translate } from '../../i18n/index';

export type SortColumn = 'name' | 'props' | 'path' | 'date';
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
	private headerCheckbox: HTMLInputElement | null = null;

	private readonly RENDER_LIMIT = 200;
	private showAll = false;

	constructor(containerEl: HTMLElement, app: App, callbacks: GridViewCallbacks) {
		this.containerEl = containerEl;
		this.app = app;
		this.callbacks = callbacks;
	}

	render(files: TFile[], totalCount: number): void {
		this.containerEl.empty();

		// Header row
		const headerEl = this.containerEl.createDiv({ cls: 'vaultman-files-header' });
		headerEl.createSpan({
			cls: 'vaultman-files-count',
			text: translate('files.count', { filtered: files.length, total: totalCount }),
		});

		// Column headers
		const colHeader = this.containerEl.createDiv({ cls: 'vaultman-files-col-header' });
		this.headerCheckbox = colHeader.createEl('input', {
			cls: 'vaultman-file-checkbox',
			attr: { type: 'checkbox' },
		});
		this.headerCheckbox.addEventListener('change', () => {
			if (this.headerCheckbox!.checked) {
				for (const f of this.displayedFiles) this.selectedFiles.add(f.path);
			} else {
				for (const f of this.displayedFiles) this.selectedFiles.delete(f.path);
			}
			this._updateList(files, totalCount);
			this.callbacks.onSelectionChange(this.selectedFiles);
		});

		this._createSortHeader(colHeader, 'name', translate('files.col.name'), files, totalCount);
		this._createSortHeader(colHeader, 'props', translate('files.col.props'), files, totalCount);
		this._createSortHeader(colHeader, 'path', translate('files.col.path'), files, totalCount);

		this.containerEl.createDiv({ cls: 'vaultman-files-list' });
		this._updateList(files, totalCount);
	}

	private _createSortHeader(parent: HTMLElement, col: SortColumn, label: string, files: TFile[], total: number): void {
		const isActive = this.sortColumn === col;
		const arrow = isActive ? (this.sortDirection === 'asc' ? ' ↑' : ' ↓') : '';
		const btn = parent.createEl('button', {
			cls: `vaultman-col-header${isActive ? ' active' : ''}`,
			text: label + arrow,
		});
		btn.addEventListener('click', () => {
			if (this.sortColumn === col) {
				this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
			} else {
				this.sortColumn = col;
				this.sortDirection = 'asc';
			}
			this.render(files, total);
		});
	}

	setSortColumn(col: SortColumn, dir: SortDirection): void {
		this.sortColumn = col;
		this.sortDirection = dir;
	}

	private _updateList(files: TFile[], _total: number): void {
		const listEl = this.containerEl.querySelector('.vaultman-files-list');
		if (!listEl) return;
		listEl.empty();

		const sorted = this._sortFiles(files);
		this.displayedFiles = sorted;

		const limit = this.showAll ? sorted.length : Math.min(sorted.length, this.RENDER_LIMIT);
		for (let i = 0; i < limit; i++) {
			this._renderRow(listEl as HTMLElement, sorted[i]);
		}

		if (!this.showAll && sorted.length > this.RENDER_LIMIT) {
			(listEl as HTMLElement).createEl('button', {
				cls: 'vaultman-btn-small vaultman-show-more',
				text: `Show all ${sorted.length} files…`,
			}).addEventListener('click', () => {
				this.showAll = true;
				this._updateList(files, _total);
			});
		}

		this._syncHeaderCheckbox();
	}

	private _renderRow(parent: HTMLElement, file: TFile): void {
		const row = parent.createDiv({ cls: 'vaultman-file-row' });

		const cb = row.createEl('input', { cls: 'vaultman-file-checkbox', attr: { type: 'checkbox' } });
		cb.checked = this.selectedFiles.has(file.path);
		cb.addEventListener('change', () => {
			if (cb.checked) this.selectedFiles.add(file.path);
			else this.selectedFiles.delete(file.path);
			this._syncHeaderCheckbox();
			this.callbacks.onSelectionChange(this.selectedFiles);
		});

		const nameEl = row.createSpan({ cls: 'vaultman-file-name', text: file.basename });
		nameEl.addEventListener('click', () => this.callbacks.onFileClick(file));

		const fm = this.app.metadataCache.getFileCache(file)?.frontmatter ?? {};
		const propCount = Object.keys(fm).filter(k => k !== 'position').length;
		row.createSpan({ cls: 'vaultman-file-props', text: String(propCount) });
		row.createSpan({ cls: 'vaultman-file-path', text: file.parent?.path ?? '' });

		row.addEventListener('contextmenu', (e) => {
			e.preventDefault();
			this.callbacks.onContextMenu(file, e);
		});
	}

	private _sortFiles(files: TFile[]): TFile[] {
		const sorted = [...files];
		const dir = this.sortDirection === 'asc' ? 1 : -1;
		sorted.sort((a, b) => {
			if (this.sortColumn === 'name') return dir * a.basename.localeCompare(b.basename);
			if (this.sortColumn === 'path') return dir * (a.parent?.path ?? '').localeCompare(b.parent?.path ?? '');
			if (this.sortColumn === 'date') return dir * (a.stat.mtime - b.stat.mtime);
			const aFm = this.app.metadataCache.getFileCache(a)?.frontmatter ?? {};
			const bFm = this.app.metadataCache.getFileCache(b)?.frontmatter ?? {};
			const aC = Object.keys(aFm).filter(k => k !== 'position').length;
			const bC = Object.keys(bFm).filter(k => k !== 'position').length;
			return dir * (aC - bC);
		});
		return sorted;
	}

	private _syncHeaderCheckbox(): void {
		if (!this.headerCheckbox) return;
		const total = this.displayedFiles.length;
		if (total === 0) { this.headerCheckbox.checked = false; this.headerCheckbox.indeterminate = false; return; }
		const sel = this.displayedFiles.filter(f => this.selectedFiles.has(f.path)).length;
		this.headerCheckbox.checked = sel === total;
		this.headerCheckbox.indeterminate = sel > 0 && sel < total;
	}

	getSelectedFiles(): TFile[] {
		return this.displayedFiles.filter(f => this.selectedFiles.has(f.path));
	}
}
