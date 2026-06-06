import type { App, TFile, WorkspaceLeaf } from 'obsidian';
import type { ContentPreviewResult, ContentSnippet } from '../types/typeUI';

type SearchOffset = [number, number];

interface NativeSearchResult {
	content?: string;
	result?: {
		content?: SearchOffset[];
	};
}

interface NativeSearchDom {
	getFiles(): TFile[];
	getResult(file: TFile): NativeSearchResult | null;
}

interface NativeSearchView {
	dom?: NativeSearchDom;
	getQuery?(): string;
	setQuery(query: string): void;
	startSearch(): void;
	stopSearch?(): void;
	setMatchingCase?(enabled: boolean): void;
}

interface SearchApp extends App {
	commands?: {
		executeCommandById(id: string): void;
	};
	workspace: App['workspace'] & {
		getLeavesOfType(type: string): WorkspaceLeaf[];
	};
}

export interface NativeSearchInput {
	file: TFile;
	content: string;
	offsets: SearchOffset[];
}

export interface NativeSearchOptions {
	query: string;
	isRegex: boolean;
	caseSensitive: boolean;
	scopeFiles: TFile[];
	onUpdate(result: ContentPreviewResult): void;
}

const MAX_FILES = 10;
const MAX_SNIPPETS = 3;
const CONTEXT = 40;
const LOCAL_UPDATE_INTERVAL = 12;

function offsetToPosition(
	content: string,
	offset: number,
): { line: number; ch: number } {
	const before = content.slice(0, offset).split('\n');
	return {
		line: before.length - 1,
		ch: before[before.length - 1]?.length ?? 0,
	};
}

function buildSnippet(
	content: string,
	start: number,
	end: number,
): ContentSnippet {
	const position = offsetToPosition(content, start);
	return {
		before: content.slice(Math.max(0, start - CONTEXT), start),
		match: content.slice(start, end),
		after: content.slice(end, end + CONTEXT),
		line: position.line,
		ch: position.ch,
	};
}

export function toNativeSearchQuery(query: string, isRegex: boolean): string {
	if (!isRegex) return query;
	const trimmed = query.trim();
	if (trimmed.startsWith('/') && trimmed.endsWith('/')) return trimmed;
	return `/${query}/`;
}

export function buildNativeSearchPreview(
	inputs: NativeSearchInput[],
	isLoading = false,
): ContentPreviewResult {
	let totalMatches = 0;
	let matchFileCount = 0;
	const matchedFiles: TFile[] = [];
	const files: ContentPreviewResult['files'] = [];

	for (const input of inputs) {
		if (input.offsets.length === 0) continue;
		matchFileCount += 1;
		matchedFiles.push(input.file);
		totalMatches += input.offsets.length;
		if (files.length >= MAX_FILES) continue;
		files.push({
			file: input.file,
			matchCount: input.offsets.length,
			snippets: input.offsets
				.slice(0, MAX_SNIPPETS)
				.map(([start, end]) => buildSnippet(input.content, start, end)),
		});
	}

	return {
		totalMatches,
		files,
		matchedFiles,
		moreFiles: Math.max(0, matchFileCount - files.length),
		isLoading,
	};
}

export function findContentOffsets(
	content: string,
	query: string,
	isRegex: boolean,
	caseSensitive: boolean,
): SearchOffset[] {
	if (!query) return [];
	const pattern = isRegex
		? query
		: query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const flags = `g${caseSensitive ? '' : 'i'}`;
	const regex = new RegExp(pattern, flags);
	const offsets: SearchOffset[] = [];
	let match: RegExpExecArray | null;
	while ((match = regex.exec(content)) !== null) {
		const start = match.index;
		const end = start + match[0].length;
		offsets.push([start, end]);
		if (match[0].length === 0) regex.lastIndex += 1;
	}
	return offsets;
}

export class NativeSearchAdapter {
	private app: SearchApp;
	private activeRun = 0;
	private preservedView: NativeSearchView | null = null;
	private preservedQuery: string | null = null;

	constructor(app: App) {
		this.app = app as SearchApp;
	}

	cancel(): void {
		this.activeRun += 1;
	}

	destroy(): void {
		this.cancel();
		if (this.preservedView && this.preservedQuery !== null) {
			this.preservedView.setQuery(this.preservedQuery);
			this.preservedView.startSearch();
		}
		this.preservedView = null;
		this.preservedQuery = null;
	}

	async search(options: NativeSearchOptions): Promise<void> {
		const run = (this.activeRun += 1);
		const view = await this.getSearchView();
		if (!view) {
			await this.searchLocal(options, run);
			return;
		}

		if (!this.preservedView) {
			this.preservedView = view;
			this.preservedQuery = view.getQuery?.() ?? '';
		}

		view.setMatchingCase?.(options.caseSensitive);
		view.setQuery(toNativeSearchQuery(options.query, options.isRegex));
		view.startSearch();

		const scopePaths = new Set(options.scopeFiles.map((file) => file.path));
		let lastResult = buildNativeSearchPreview([], true);
		options.onUpdate(lastResult);

		for (let attempt = 0; attempt < 8; attempt += 1) {
			await new Promise((resolve) => window.setTimeout(resolve, 150));
			if (run !== this.activeRun) return;
			lastResult = buildNativeSearchPreview(
				this.collectResults(view, scopePaths),
				true,
			);
			options.onUpdate(lastResult);
		}

		if (run !== this.activeRun) return;
		options.onUpdate({ ...lastResult, isLoading: false });
	}

	private async searchLocal(
		options: NativeSearchOptions,
		run: number,
	): Promise<void> {
		const inputs: NativeSearchInput[] = [];
		options.onUpdate(buildNativeSearchPreview(inputs, true));

		for (let index = 0; index < options.scopeFiles.length; index += 1) {
			if (run !== this.activeRun) return;
			const file = options.scopeFiles[index];
			let content = '';
			try {
				content = await this.app.vault.cachedRead(file);
			} catch {
				continue;
			}
			const offsets = findContentOffsets(
				content,
				options.query,
				options.isRegex,
				options.caseSensitive,
			);
			if (offsets.length > 0) {
				inputs.push({ file, content, offsets });
			}
			if (index % LOCAL_UPDATE_INTERVAL === 0) {
				options.onUpdate(buildNativeSearchPreview(inputs, true));
				await new Promise((resolve) => window.setTimeout(resolve, 0));
			}
		}

		if (run !== this.activeRun) return;
		options.onUpdate(buildNativeSearchPreview(inputs, false));
	}

	private collectResults(
		view: NativeSearchView,
		scopePaths: Set<string>,
	): NativeSearchInput[] {
		const files = view.dom?.getFiles() ?? [];
		const inputs: NativeSearchInput[] = [];
		for (const file of files) {
			if (!scopePaths.has(file.path)) continue;
			const result = view.dom?.getResult(file);
			const content = result?.content;
			const offsets = result?.result?.content;
			if (!content || !Array.isArray(offsets)) continue;
			inputs.push({ file, content, offsets });
		}
		return inputs;
	}

	private async getSearchView(): Promise<NativeSearchView | null> {
		const existing = this.findSearchView();
		if (existing) return existing;

		this.app.commands?.executeCommandById('global-search:open');
		await new Promise((resolve) => window.setTimeout(resolve, 100));
		return this.findSearchView();
	}

	private findSearchView(): NativeSearchView | null {
		const leaf = this.app.workspace.getLeavesOfType('search')?.[0];
		const view = leaf?.view as Partial<NativeSearchView> | undefined;
		if (
			typeof view?.setQuery !== 'function' ||
			typeof view.startSearch !== 'function'
		) {
			return null;
		}
		return view as NativeSearchView;
	}
}
