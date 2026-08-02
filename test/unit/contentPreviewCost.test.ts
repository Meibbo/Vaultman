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
	it('does not discard snippets a row has already paid to build', () => {
		// This used to compare a cold build against warm ones, because the memo's
		// job was to avoid rebuilding 65000 snippets per poll. Snippets are lazy
		// now, so a publish builds none of them and that ratio measures noise.
		//
		// What the memo still has to guarantee is this: a poll over an unchanged
		// file returns the same entry, so the snippets a visible row already built
		// survive rather than being rebuilt on the next of the 150ms publishes.
		const inputs = realisticLoad();
		const cache = createContentPreviewCache();

		const first = buildNativeSearchPreview(inputs, true, undefined, { cache });
		const rendered = first.files[0]?.snippets;
		expect(rendered).toBeDefined();

		const second = buildNativeSearchPreview(inputs, true, undefined, { cache });

		expect(second.files[0]?.snippets).toBe(rendered);
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

describe('snippets are built when a row is read, not when a search publishes', () => {
	function sectionLoad(): NativeSearchInput[] {
		const section = 'lorem ipsum dolor sit amet consectetur '.repeat(120);
		const content = section.repeat(20);
		return Array.from({ length: 100 }, (_, f) => ({
			file: file(`n${f}.md`),
			content,
			offsets: Array.from(
				{ length: 200 },
				(_, m) => [m * 400, m * 400 + 5] as [number, number],
			),
		}));
	}

	const sections = Array.from({ length: 20 }, (_, i) => ({
		position: {
			start: { offset: i * 4680 },
			end: { offset: (i + 1) * 4680 },
		},
	}));

	it('materialises nothing for a file nobody scrolls to', () => {
		// With extra context on, a slice grows to its whole section. Building that
		// for every match in the model was 280 MB of strings on a 60000-match
		// query: the app locked when the switch went on and stayed slow until it
		// went off. The render window only ever shows a couple of thousand rows.
		const inputs = sectionLoad();
		const published = buildNativeSearchPreview(inputs, true, undefined, {
			cache: createContentPreviewCache(),
			extraContext: true,
			fileCache: () => ({ sections }),
		});

		const publishCost = millis(() => {
			buildNativeSearchPreview(inputs, true, undefined, {
				cache: createContentPreviewCache(),
				extraContext: true,
				fileCache: () => ({ sections }),
			});
		});
		const readCost = millis(() => {
			void published.files[0]?.snippets.length;
		});

		// Publishing the whole set must be cheaper than reading one file's rows.
		expect(publishCost).toBeLessThan(Math.max(readCost * 4, 40));
		expect(published.files).toHaveLength(inputs.length);
		expect(published.files[0]?.matchCount).toBe(200);
	});

	it('builds a file’s snippets once, however often the row is read', () => {
		const published = buildNativeSearchPreview(sectionLoad(), true, undefined, {
			cache: createContentPreviewCache(),
		});
		const first = published.files[0]?.snippets;
		expect(published.files[0]?.snippets).toBe(first);
	});

	it('clamps a structural slice to core’s own per-side budget', () => {
		// Core can afford an unbounded section because it only materialises rows in
		// view; we materialise whatever is read, so a section-sized slice needs the
		// same 1000-character budget core uses for its line walk.
		const published = buildNativeSearchPreview(sectionLoad(), true, undefined, {
			cache: createContentPreviewCache(),
			extraContext: true,
			fileCache: () => ({ sections }),
		});
		const snippet = published.files[0]?.snippets[0];
		expect(snippet?.before.length).toBeLessThanOrEqual(1000);
		expect(snippet?.after.length).toBeLessThanOrEqual(1000);
	});
});
