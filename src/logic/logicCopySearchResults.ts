import type { TFile } from 'obsidian';

/**
 * U121-019 #51 — "Copy search results", reproduced rather than delegated.
 *
 * Core ships this affordance as `SearchView.onCopyResultsClick`, which opens
 * `new CopySearchResultsModal(app, this.dom)`. The modal reads **core's own**
 * result DOM, so calling it from here copied whatever core's search view
 * happened to hold — nothing, once our scan had stopped core's search, and in
 * any case never our scope. A Vaultman text search is a query plus a folder,
 * filters and has/hasn't; core's result set knows none of that.
 *
 * So the format is copied and the source is ours. Read off core's own builder
 * in `Desktop/obsidian-web-lab/obsidian/app.js`: a list of file links, one per
 * line, and never the match text.
 */

export type CopyLinkStyle = 'none' | 'wikilink' | 'markdown';
export type CopyListStyle = 'none' | 'dash' | 'asterisk' | 'number';

export interface CopyResultsOptions {
	showFullPath: boolean;
	linkStyle: CopyLinkStyle;
	listStyle: CopyListStyle;
}

export const DEFAULT_COPY_RESULTS_OPTIONS: CopyResultsOptions = {
	showFullPath: false,
	linkStyle: 'none',
	listStyle: 'none',
};

function shownName(file: TFile, showFullPath: boolean): string {
	return showFullPath ? file.path : file.basename;
}

function applyLinkStyle(
	file: TFile,
	name: string,
	linkStyle: CopyLinkStyle,
): string {
	if (linkStyle === 'wikilink') return `[[${name}]]`;
	// Core labels the markdown link with `basename` while the target follows the
	// path toggle. Kept as core has it, quirk included.
	if (linkStyle === 'markdown') return `[${file.basename}](${name})`;
	return name;
}

function applyListStyle(
	entry: string,
	index: number,
	listStyle: CopyListStyle,
): string {
	if (listStyle === 'dash') return `- ${entry}`;
	if (listStyle === 'asterisk') return `* ${entry}`;
	if (listStyle === 'number') return `${index + 1}. ${entry}`;
	return entry;
}

/** The clipboard text for `files`, in core's format. No cap. */
export function formatCopiedSearchResults(
	files: TFile[],
	options: CopyResultsOptions,
): string {
	return files
		.map((file, index) => {
			const name = shownName(file, options.showFullPath);
			const linked = applyLinkStyle(file, name, options.linkStyle);
			return applyListStyle(linked, index, options.listStyle);
		})
		.join('\n');
}
