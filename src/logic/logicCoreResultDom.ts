import type { TFile } from 'obsidian';

import type { NativeSearchInput } from '../services/serviceNativeSearchAdapter';

/**
 * U121-019 #51 — feeding Obsidian's own search result DOM.
 *
 * Pure: no Obsidian call, no DOM. The service performs the calls this module
 * decides on.
 *
 * Why core's DOM at all: our `MAX_FILES = 200` and `MAX_SNIPPETS = 3` were
 * never core's limits. Measured live on 1.12.3, `dom.getFiles()` held 737 files
 * / 4129 matches with **two** rows in the document — core keeps the whole set
 * and renders a window of it through its own `infinityScroll`. Rendering our
 * own list meant re-earning that, so the caps stood in for a virtualiser we do
 * not have on this branch. Handing the results to core's DOM removes both the
 * caps and the reason they existed.
 */

/** The result object core's own matcher produces — probed live, nothing else. */
export interface CoreSearchResult {
	content: [number, number][];
}

export interface CoreResultEntry {
	file: TFile;
	result: CoreSearchResult;
	content: string;
}

export interface CoreResultUpdatePlan {
	/** Files to hand to `dom.addResult`, in order. */
	add: CoreResultEntry[];
	/** Files to hand to `dom.removeResult`. */
	remove: TFile[];
}

/**
 * Our offsets are already core's shape, so this is a rename rather than a
 * transformation — and deliberately keeps **every** match.
 */
export function toCoreSearchResult(input: NativeSearchInput): CoreSearchResult {
	return { content: input.offsets };
}

function offsetsKey(offsets: [number, number][]): string {
	return offsets.map(([from, to]) => `${from}:${to}`).join(',');
}

/**
 * Diff the previous published set against the next one.
 *
 * `addResult` *replaces* an item, so re-adding an unchanged file would rebuild
 * its row. A scan publishes many updates per second, and a rebuilt row loses
 * the expansion the user opened — so an untouched file must not appear in
 * `add`. A file that stopped matching, or whose matches emptied, is removed
 * rather than left showing a stale count.
 *
 * No cap: that is the point of the change.
 */
export function planCoreResultUpdate(
	previous: NativeSearchInput[],
	next: NativeSearchInput[],
): CoreResultUpdatePlan {
	const previousByPath = new Map(
		previous
			.filter((input) => input.offsets.length > 0)
			.map((input) => [input.file.path, input]),
	);

	const add: CoreResultEntry[] = [];
	const keptPaths = new Set<string>();

	for (const input of next) {
		if (input.offsets.length === 0) continue;
		keptPaths.add(input.file.path);
		const before = previousByPath.get(input.file.path);
		if (before && offsetsKey(before.offsets) === offsetsKey(input.offsets)) {
			continue;
		}
		add.push({
			file: input.file,
			result: toCoreSearchResult(input),
			content: input.content,
		});
	}

	const remove: TFile[] = [];
	for (const [path, input] of previousByPath) {
		if (!keptPaths.has(path)) remove.push(input.file);
	}

	return { add, remove };
}
