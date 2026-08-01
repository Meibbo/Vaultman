import type { App, TFile, WorkspaceLeaf } from 'obsidian';
import type { ContentPreviewResult, ContentSnippet } from '../types/typeUI';
import { snippetContextRadius } from '../logic/logicSnippetContext';
import { isContentSearchableFile } from '../logic/logicContentSearch';

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
	getMatchCount?(): number;
	/**
	 * Core's own "still searching" flag, verified live on Obsidian 1.12.3
	 * (`app.workspace.getLeavesOfType('search')[0].view.dom.working`). Asking it
	 * replaces the guesswork that used to decide when a search had finished —
	 * heuristics that called a search done while core was still finding matches,
	 * which is why a common query reported a fraction of Core's count.
	 */
	working?: boolean;
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
	/**
	 * U121-017: index into `scopeFiles` to continue from. A resumed scan skips
	 * the native poll phase — Obsidian's search view has no cursor, so polling
	 * it again would restart the very traversal we are resuming.
	 */
	resumeFrom?: number;
	/** Matches already accumulated by the paused run, keyed by path on merge. */
	seedInputs?: NativeSearchInput[];
	/** Reports the next unscanned index so the host can persist the cursor. */
	onProgress?(nextIndex: number): void;
	/**
	 * The caller is continuing a paused run rather than starting one. Stated,
	 * not inferred from `resumeFrom`: the native path never calls `onProgress`,
	 * so a scan that went through core leaves the cursor at 0 and a resume
	 * arrives indistinguishable from a fresh search. Seeding the first frame off
	 * `resumeFrom > 0` is what blanked every Text node on Resume.
	 */
	resume?: boolean;
	/**
	 * Force the local traversal even when core's search view is available.
	 *
	 * This is the fallback for a vault where core search cannot serve us, not
	 * the resume path. Resume used to set it, on the recorded grounds that core
	 * "stops on Obsidian's own snapshot" so re-issuing it would repeat the same
	 * short result. Measured against the live view on 1.12.3, core does not stop
	 * short: `getFiles()` climbed past 737 files / 4129 matches with `working`
	 * still true and two rows in the DOM. Core accumulates the full set and
	 * virtualises its own rendering. What stopped short was our poll heuristic
	 * and the `MAX_FILES` cap, both since removed.
	 */
	preferLocal?: boolean;
}

// U121-019 #51: `MAX_FILES = 200` and `MAX_SNIPPETS = 3` used to live here.
// They truncated the *results* — past the two-hundredth file there was nothing
// to find, and a file's fourth match did not exist — while standing in for a
// virtualiser we do not have on this branch. The results are now complete and
// the document is bounded by a render window instead (logicContentRenderWindow),
// which only delays rows rather than losing matches.
//
// The old fixed context is level 0 of the ladder in `logicSnippetContext`, so
// the default slice is unchanged and the wider levels are new reach.
const LOCAL_UPDATE_INTERVAL = 12;
const NATIVE_POLL_INTERVAL = 150;
const MAX_NATIVE_ATTEMPTS = 180;
const MIN_NATIVE_ATTEMPTS = 12;
const MIN_LARGE_NATIVE_ATTEMPTS = 150;
const MIN_NATIVE_STABLE_ATTEMPTS = 3;
const LARGE_NATIVE_MATCH_THRESHOLD = 50;
const LOCAL_RECONCILE_NATIVE_FILE_LIMIT = 40;

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
	contextRadius: number = snippetContextRadius(0),
): ContentSnippet {
	const position = offsetToPosition(content, start);
	return {
		before: content.slice(Math.max(0, start - contextRadius), start),
		match: content.slice(start, end),
		after: content.slice(end, end + contextRadius),
		line: position.line,
		ch: position.ch,
	};
}

function countInputOffsets(inputs: NativeSearchInput[]): number {
	return inputs.reduce((sum, input) => sum + input.offsets.length, 0);
}

export function toNativeSearchQuery(query: string, isRegex: boolean): string {
	if (!isRegex) return query;
	const trimmed = query.trim();
	if (trimmed.startsWith('/') && trimmed.endsWith('/')) return trimmed;
	return `/${query}/`;
}

export interface NativeSearchPreviewOptions {
	/**
	 * Context level per file path, for the nodes the user has opened up. Absent
	 * paths stay at level 0 — the slice the fixed `CONTEXT` used to cut.
	 */
	contextLevelByPath?: ReadonlyMap<string, number>;
}

export function buildNativeSearchPreview(
	inputs: NativeSearchInput[],
	isLoading = false,
	totalMatchesOverride?: number,
	options: NativeSearchPreviewOptions = {},
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
		// No cap, in either direction: every matching file gets an entry and every
		// match gets a snippet.
		const contextRadius = snippetContextRadius(
			options.contextLevelByPath?.get(input.file.path) ?? 0,
		);
		files.push({
			file: input.file,
			matchCount: input.offsets.length,
			snippets: input.offsets.map(([start, end]) =>
				buildSnippet(input.content, start, end, contextRadius),
			),
		});
	}

	return {
		totalMatches:
			typeof totalMatchesOverride === 'number' &&
			totalMatchesOverride > totalMatches
				? totalMatchesOverride
				: totalMatches,
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
	/** Matches produced so far, kept across a pause so a resume can seed them. */
	private retained: NativeSearchInput[] = [];
	/** The core view we last told to search, so `cancel()` can stop it. */
	private activeView: NativeSearchView | null = null;

	constructor(app: App) {
		this.app = app as SearchApp;
	}

	cancel(): void {
		this.activeRun += 1;
		// Stopping our poll loop is not stopping the search. `startSearch()` was
		// issued against Obsidian's own view and nothing ever called
		// `stopSearch()`, so core kept scanning in the background after a pause —
		// which is why the match count kept climbing while the UI said "paused",
		// and part of why the whole app crawled.
		this.activeView?.stopSearch?.();
		this.activeView = null;
	}

	/** Everything the current traversal has matched. Survives `cancel()`. */
	retainedInputs(): NativeSearchInput[] {
		return this.retained;
	}

	/** Drop accumulated matches when the query or mode makes them invalid. */
	resetRetained(): void {
		this.retained = [];
	}

	/**
	 * Fold a fresh snapshot onto the retained one, keyed by path so a match is
	 * never counted twice. The retained entry wins only when the incoming
	 * snapshot has not reached that file yet, so the projected count is
	 * monotone: it may grow, never shrink.
	 */
	private mergeRetained(incoming: NativeSearchInput[]): NativeSearchInput[] {
		if (this.retained.length === 0) return incoming;
		const byPath = new Map(
			this.retained.map((input) => [input.file.path, input]),
		);
		for (const input of incoming) byPath.set(input.file.path, input);
		return [...byPath.values()];
	}

	destroy(): void {
		this.cancel();
		this.retained = [];
		if (this.preservedView && this.preservedQuery !== null) {
			this.preservedView.setQuery(this.preservedQuery);
			this.preservedView.startSearch();
		}
		this.preservedView = null;
		this.preservedQuery = null;
	}

	async search(options: NativeSearchOptions): Promise<void> {
		const run = (this.activeRun += 1);
		const view = this.findSearchView();
		// A resume no longer walks the vault locally. That path read every file
		// through `cachedRead` on the UI thread, which is what froze and crashed
		// the app on resume. Core is re-issued instead and its results merge onto
		// the retained floor, so the traversal cost stays inside core's own
		// indexed search. Local remains the fallback for a vault where core
		// search is unavailable, and for an explicit `preferLocal` caller.
		if (!view || options.preferLocal) {
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
		this.activeView = view;

		const scopePaths = new Set(options.scopeFiles.map((file) => file.path));
		let latestNativeInputs: NativeSearchInput[] = [];
		let bestNativeInputs: NativeSearchInput[] = [];
		let bestNativeScore = -1;
		let lastSnapshotKey = '';
		let stableSnapshots = 0;
		let coreIdlePolls = 0;
		// A resume repaints the retained snapshot first. Core restarts its own
		// scan internally — it has no cursor to hand us — but the user never sees
		// a reset, because the retained matches stay on screen as the floor and
		// incoming results merge into them. That is the whole trick: the resume
		// is simulated, and it is indistinguishable as long as the count never
		// goes backwards.
		options.onUpdate(buildNativeSearchPreview(this.mergeRetained([]), true));

		for (let attempt = 0; attempt < MAX_NATIVE_ATTEMPTS; attempt += 1) {
			await new Promise((resolve) =>
				window.setTimeout(resolve, NATIVE_POLL_INTERVAL),
			);
			if (run !== this.activeRun) return;
			const attemptInputs = this.collectResults(view, scopePaths);
			const nativeMatchCount = view.dom?.getMatchCount?.();
			const totalOffsets = countInputOffsets(attemptInputs);
			const snapshotKey = `${attemptInputs.length}:${totalOffsets}:${nativeMatchCount ?? 'unknown'}`;
			if (attemptInputs.length > 0) {
				latestNativeInputs = attemptInputs;
				// Accumulate, do not replace. Assigning the raw snapshot here used
				// to clobber the retained floor one statement before `mergeRetained`
				// read it, which silently reduced the merge to a no-op and made a
				// resume look exactly like a restart.
				this.retained = this.mergeRetained(attemptInputs);
			}
			const nativeScore = nativeMatchCount ?? totalOffsets;
			if (attemptInputs.length > 0 && nativeScore >= bestNativeScore) {
				bestNativeInputs = attemptInputs;
				bestNativeScore = nativeScore;
			}
			options.onUpdate(
				buildNativeSearchPreview(this.mergeRetained(attemptInputs), true),
			);

			// Core tells us whether it is still working. Ask it instead of
			// guessing: the old heuristics ended the poll on a momentary plateau,
			// so a common query settled at a fraction of Core's real count and
			// then announced itself as finished.
			const working = view.dom?.working;
			if (working === false) {
				coreIdlePolls += 1;
				// One extra poll after core goes idle, so the last batch it
				// rendered is collected before we stop looking.
				if (coreIdlePolls >= MIN_NATIVE_STABLE_ATTEMPTS) break;
			} else if (working === true) {
				coreIdlePolls = 0;
			} else {
				// `working` is absent on this build: fall back to the previous
				// stability heuristic rather than polling to the hard cap.
				if (
					attempt + 1 >= MIN_NATIVE_ATTEMPTS &&
					attemptInputs.length === 0 &&
					(nativeMatchCount === undefined || nativeMatchCount === 0)
				) {
					break;
				}
				if (snapshotKey === lastSnapshotKey && attemptInputs.length > 0) {
					stableSnapshots += 1;
				} else {
					lastSnapshotKey = snapshotKey;
					stableSnapshots = attemptInputs.length > 0 ? 1 : 0;
				}
				const requiredAttempts =
					bestNativeScore >= LARGE_NATIVE_MATCH_THRESHOLD
						? MIN_LARGE_NATIVE_ATTEMPTS
						: MIN_NATIVE_ATTEMPTS;
				if (
					attempt + 1 >= requiredAttempts &&
					stableSnapshots >= MIN_NATIVE_STABLE_ATTEMPTS
				) {
					break;
				}
			}
		}

		if (run !== this.activeRun) return;
		const finalNativeInputs = this.collectResults(view, scopePaths);
		const finalNativeScore =
			view.dom?.getMatchCount?.() ?? countInputOffsets(finalNativeInputs);
		const nativeInputs =
			finalNativeInputs.length > 0 && finalNativeScore >= bestNativeScore
				? finalNativeInputs
				: bestNativeInputs.length > 0
					? bestNativeInputs
					: latestNativeInputs;
		const nativeMatchCount = view.dom?.getMatchCount?.();
		if (
			nativeInputs.length > 0 &&
			(nativeInputs.length > LOCAL_RECONCILE_NATIVE_FILE_LIMIT ||
				(typeof nativeMatchCount === 'number' &&
					nativeMatchCount >= LARGE_NATIVE_MATCH_THRESHOLD))
		) {
			// Skipping the local reconcile is only sound now that core told us it
			// finished: this snapshot is its whole answer, not a plateau.
			this.retained = this.mergeRetained(nativeInputs);
			options.onUpdate(
				buildNativeSearchPreview(this.retained, false, nativeMatchCount),
			);
			return;
		}
		const mergedInputs = await this.collectLocalResults(
			options,
			run,
			nativeInputs,
			true,
		);
		if (run !== this.activeRun) return;
		options.onUpdate(buildNativeSearchPreview(mergedInputs, false));
	}

	private async searchLocal(
		options: NativeSearchOptions,
		run: number,
	): Promise<void> {
		// A resumed scan must repaint what it already has, not an empty frame.
		// `seedInputs` is the caller-supplied floor, but the host does not pass
		// one — it relies on the adapter's own retained set, which
		// `collectLocalResults` only folds in further down. So the first frame of
		// every Resume was empty: the explorer blanked every Text node and then
		// rebuilt them from a floor thousands of files deep, which is the hang on
		// Resume. `resumeFrom` is what separates the two cases; a scan from zero
		// still opens empty, so a new query cannot show the old one's results.
		const seeds =
			options.seedInputs ??
			(options.resume || (options.resumeFrom ?? 0) > 0 ? this.retained : []);
		options.onUpdate(buildNativeSearchPreview(seeds, true));
		const inputs = await this.collectLocalResults(options, run, seeds, true);
		if (run !== this.activeRun) return;
		options.onUpdate(buildNativeSearchPreview(inputs, false));
	}

	private async collectLocalResults(
		options: NativeSearchOptions,
		run: number,
		initialInputs: NativeSearchInput[],
		emitPartial: boolean,
	): Promise<NativeSearchInput[]> {
		const inputsByPath = new Map(
			initialInputs.map((input) => [input.file.path, { ...input }]),
		);
		// Keyed by path, so a seeded resume can never duplicate a match that the
		// paused half of the traversal already produced (BT4-019 keeps holding:
		// local offsets stay authoritative over any native snapshot).
		for (const seed of options.seedInputs ?? []) {
			if (!inputsByPath.has(seed.file.path)) {
				inputsByPath.set(seed.file.path, { ...seed });
			}
		}
		if (
			(options.resume || (options.resumeFrom ?? 0) > 0) &&
			!options.seedInputs
		) {
			for (const seed of this.retained) {
				if (!inputsByPath.has(seed.file.path)) {
					inputsByPath.set(seed.file.path, { ...seed });
				}
			}
		}
		const start = Math.max(
			0,
			Math.min(options.resumeFrom ?? 0, options.scopeFiles.length),
		);
		for (let index = start; index < options.scopeFiles.length; index += 1) {
			if (run !== this.activeRun) return [...inputsByPath.values()];
			options.onProgress?.(index);
			const file = options.scopeFiles[index];
			if (!isContentSearchableFile(file)) continue;
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
				// Local offsets over the raw file are authoritative: native
				// snapshots use their own content basis, so merging the two
				// coordinate systems duplicated the same match (BT4-019).
				inputsByPath.set(file.path, { file, content, offsets });
			}
			if (emitPartial && index % LOCAL_UPDATE_INTERVAL === 0) {
				this.retained = [...inputsByPath.values()];
				options.onUpdate(buildNativeSearchPreview(this.retained, true));
				await new Promise((resolve) => window.setTimeout(resolve, 0));
			}
		}
		options.onProgress?.(options.scopeFiles.length);
		this.retained = [...inputsByPath.values()];
		return this.retained;
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
