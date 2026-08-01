import { describe, expect, it } from 'vitest';
import type { TFile } from 'obsidian';

import {
	buildNativeSearchPreview,
	createContentPreviewCache,
	type NativeSearchInput,
} from '../../src/services/serviceNativeSearchAdapter';

/**
 * A deterministic stand-in for the pane measurement.
 *
 * Frame timing inside Obsidian turned out to be unusable as evidence: rAF is
 * frozen while the window is occluded, so the same build measured 17ms and
 * 560ms at the median depending on whether anything was covering the window.
 * The cost of the work itself does not depend on what is on screen, so that is
 * what is pinned here.
 *
 * Shape of the real load, measured live on `plugin-dev` for the query "a":
 * ~500 files, ~65000 matches, republished every 150ms while the scan runs.
 */

function file(path: string): TFile {
	const name = path.split('/').pop() ?? path;
	return {
		basename: name.replace(/\.md$/, ''),
		extension: 'md',
		name,
		parent: null,
		path,
		stat: { ctime: 0, mtime: 0, size: 0 },
		vault: {} as TFile['vault'],
	} satisfies TFile;
}

/** 500 files, 130 matches each, spread through a 40k-character note. */
function realisticLoad(): NativeSearchInput[] {
	const content = 'lorem ipsum dolor sit amet '.repeat(1500);
	return Array.from({ length: 500 }, (_, f) => ({
		file: file(`notes/${f}.md`),
		content,
		offsets: Array.from(
			{ length: 130 },
			(_, m) => [m * 300, m * 300 + 5] as [number, number],
		),
	}));
}

function millis(run: () => void): number {
	const started = performance.now();
	run();
	return performance.now() - started;
}

describe('what a poll costs at the scale the pane actually reaches', () => {
	it('rebuilds an unchanged result set far faster than it built it', () => {
		// The scan republishes every 150ms. Without the memo every poll rebuilt
		// all 65000 snippets; with it, a poll where nothing moved does no snippet
		// work at all. The ratio is what matters, not the absolute figures, so
		// this is pinned loosely enough to survive a slow machine.
		const inputs = realisticLoad();
		const cache = createContentPreviewCache();

		const cold = millis(() => {
			buildNativeSearchPreview(inputs, true, undefined, { cache });
		});
		const warm = millis(() => {
			for (let i = 0; i < 5; i += 1) {
				buildNativeSearchPreview(inputs, true, undefined, { cache });
			}
		});

		expect(warm / 5).toBeLessThan(cold / 4);
	});

	it('returns every unchanged file by identity, so no row re-renders', () => {
		// This is the half that the frame timing was really about: a fresh entry
		// object makes Svelte re-render that file's rows even when nothing about
		// it changed, and the pane holds thousands of them.
		const inputs = realisticLoad();
		const cache = createContentPreviewCache();

		const first = buildNativeSearchPreview(inputs, true, undefined, { cache });
		const second = buildNativeSearchPreview(inputs, true, undefined, { cache });

		const reused = second.files.filter(
			(entry, index) => entry === first.files[index],
		);
		expect(reused).toHaveLength(inputs.length);
	});

	it('pays only for the file that gained a match', () => {
		const inputs = realisticLoad();
		const cache = createContentPreviewCache();
		buildNativeSearchPreview(inputs, true, undefined, { cache });

		const grown = inputs.map((input, index) =>
			index === 250
				? { ...input, offsets: [...input.offsets, [60_000, 60_005] as [number, number]] }
				: input,
		);
		const next = buildNativeSearchPreview(grown, true, undefined, { cache });

		const rebuilt = next.files.filter(
			(entry, index) => entry !== buildIdentityAt(cache, index, next),
		);
		// Exactly one entry differs from the previous publish.
		expect(next.files[250]?.matchCount).toBe(131);
		expect(rebuilt.length).toBeLessThanOrEqual(1);
	});
});

/** Identity of the entry the cache is currently holding for `index`. */
function buildIdentityAt(
	cache: ReturnType<typeof createContentPreviewCache>,
	index: number,
	published: ReturnType<typeof buildNativeSearchPreview>,
): unknown {
	const path = published.files[index]?.file.path;
	if (!path) return undefined;
	return cache.get(path)?.entry;
}
