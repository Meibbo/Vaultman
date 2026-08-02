import { describe, expect, it } from 'vitest';

import pageFiltersSource from '../../src/components/pages/pageFilters.svelte?raw';
import {
	advanceTextSearchRun,
	completeTextSearchRun,
	createTextSearchRun,
	pauseTextSearchRun,
	reconcileTextSearchRun,
	sameTextSearchIntent,
	type TextSearchRun,
	type TextSearchSignature,
} from '../../src/logic/logicTextSearchState';

/**
 * The seam between the run state machine and the host effect that drives the
 * adapter. Four builds shipped with a green suite because the pure module and
 * the adapter were each covered alone and every defect lived here, in the
 * Svelte effect that joins them.
 */

function signature(
	overrides: Partial<TextSearchSignature> = {},
): TextSearchSignature {
	return {
		query: 'alpha',
		isRegex: false,
		caseSensitive: false,
		isExclusion: false,
		scopeRevision: 'sig:view:1:edit:1',
		...overrides,
	};
}

/** Every phase that owns a traversal, built the way the host reaches it. */
function runsHoldingATraversal(): Record<string, TextSearchRun> {
	const scanning = advanceTextSearchRun(
		createTextSearchRun(signature(), 'running'),
		15,
	);
	return {
		running: scanning,
		paused: pauseTextSearchRun(scanning),
		completed: completeTextSearchRun(scanning),
	};
}

describe('the host effect cannot be re-entered by its own tail', () => {
	it('reconciles a scope-only move to identity in every phase', () => {
		// The host recomputes `contentSearchScopeRevision` as a side effect of the
		// filter rule this very search publishes. So the effect always re-runs
		// with a moved revision on its own tail, and a non-identity result there
		// is a `$state` write that re-runs the effect that writes again.
		const moved = signature({ scopeRevision: 'sig:view:9:edit:9' });
		for (const [phase, run] of Object.entries(runsHoldingATraversal())) {
			expect(reconcileTextSearchRun(run, moved), phase).toBe(run);
		}
	});

	it('never returns a running run the host would read as unchanged intent', () => {
		// This is the invariant the host depends on: inside `reconciled !== run`,
		// a `running` result always means the user asked for a different search.
		// It is what makes an adapter cancel on a scope-only move impossible, and
		// what makes the `phase === 'running'` arm of that cancel unreachable.
		const moved = signature({ scopeRevision: 'sig:view:9:edit:9' });
		const candidates = [
			moved,
			signature({ query: 'beta' }),
			signature({ caseSensitive: true }),
			signature({ isRegex: true }),
			signature({ isExclusion: true }),
			signature({ query: '' }),
		];

		for (const run of Object.values(runsHoldingATraversal())) {
			for (const next of candidates) {
				const reconciled = reconcileTextSearchRun(run, next);
				if (reconciled === run) continue;
				if (reconciled.phase !== 'running') continue;
				expect(sameTextSearchIntent(run.signature, reconciled.signature)).toBe(
					false,
				);
			}
		}
	});

	it('converges instead of minting a generation per pass', () => {
		// The crash shape: the effect re-runs with a fresh revision each time
		// because the scan it just launched moved the revision again. Ten passes
		// stand in for the eight-deep repeated frame Svelte reported.
		let run = advanceTextSearchRun(
			createTextSearchRun(signature(), 'running'),
			15,
		);
		const first = run;
		for (let pass = 0; pass < 10; pass += 1) {
			run = reconcileTextSearchRun(
				run,
				signature({ scopeRevision: `sig:view:1:edit:${pass}` }),
			);
		}

		expect(run).toBe(first);
		expect(run.generation).toBe(first.generation);
		expect(run.cursor).toBe(15);
	});
});

describe('host guard: the reconcile block in pageFilters', () => {
	const reconcileBlock =
		pageFiltersSource.match(
			/const reconciled = reconcileTextSearchRun\([\s\S]*?const run = reconciled;/,
		)?.[0] ?? '';

	it('reads the block it means to guard', () => {
		expect(reconcileBlock).not.toBe('');
		expect(reconcileBlock).toContain('nativeSearchAdapter.cancel()');
	});

	const launchPreface =
		pageFiltersSource.match(
			/const launchToken = textSearchLaunchToken\(run\);[\s\S]*?const timer = window\.setTimeout\(/,
		)?.[0] ?? '';

	it('reads the launch preface it means to guard', () => {
		expect(launchPreface).not.toBe('');
		expect(launchPreface).toContain('shouldLaunchTextSearch');
	});

	it('does not fold the live preview back into itself before the scan starts', () => {
		// The second loop, and the one that explains why only *resume* crashed.
		// `resumeFrom > 0` took the branch that reads `contentPreviewResult` and
		// writes a fresh object back, inside the effect: the read makes it a
		// dependency and the write invalidates that dependency, so the effect
		// re-enters itself. There is no exit, because the launch token is claimed
		// inside the debounce timer and the effect's teardown clears that timer
		// on every re-run — the scan never starts, so `shouldLaunchTextSearch`
		// never turns false. A first search takes the `resumeFrom === 0` branch,
		// which only writes, never reads, and so never became a dependency.
		expect(launchPreface).not.toMatch(/\.\.\.contentPreviewResult/);
		expect(launchPreface).toContain('untrack(');
	});

	it('keeps the preview on a resume instead of opening an empty frame', () => {
		// Measured on the running plugin, build 95fcf2ff: Resume blanked the Text
		// explorer for ~500 ms — 201 rows and "55166 matches in 419 file(s)" went
		// to 0 rows and "No matches found" at t+80 ms, back at t+600 ms — with a
		// 1794 ms main-thread stall around it.
		//
		// The blank was written here, before the adapter was even called: the
		// empty loading frame was gated on `resumeFrom === 0`, and the native path
		// never advances the cursor, so a resume arrives with `resumeFrom === 0`
		// and wiped the preview. Whether to open empty is a question about the
		// user's intent, which `resuming` answers and a cursor does not.
		expect(launchPreface).not.toMatch(/if\s*\(\s*resumeFrom === 0\s*\)/);
		expect(launchPreface).toMatch(/if\s*\(\s*!?resuming\s*\)/);
	});

	it('resumes through core instead of forcing the local vault walk', () => {
		// `preferLocal` routes past core into `searchLocal`, which reads every
		// remaining file through `cachedRead` on the UI thread. Resume was passing
		// it, and since the native path never advances the cursor, that walk
		// started at index 0 — a full re-read of the vault on every Resume, which
		// is the freeze the dev reported.
		//
		// The reason recorded for it was that core "stops on Obsidian's own
		// snapshot", so re-issuing it would repeat the same short result. Measured
		// on 1.12.3 against the live view, that is not what core does: `getFiles()`
		// kept climbing past 737 files / 4129 matches while `working` stayed true,
		// with 2 rows in the DOM. Core accumulates the whole set and virtualises
		// the rendering. Resume re-issues core and merges onto the retained floor,
		// which is the simulated resume this feature was specified as.
		expect(launchPreface).not.toContain('preferLocal');
		expect(pageFiltersSource).not.toMatch(/preferLocal:\s*resuming/);
		expect(pageFiltersSource).toMatch(/resume:\s*resuming/);
	});

	it('cancels the adapter only when the user asked for a different search', () => {
		// A cancel on a scope-only move is the other half of the loop: it clears
		// the launch token, the next pass relaunches, the scan moves the revision.
		// With reconcile returning identity, `phase === 'running'` here is
		// unreachable — and leaving unreachable churn next to a crash that was
		// shipped four times is how the fifth one happens.
		expect(reconcileBlock).not.toContain("reconciled.phase === 'running'");
		expect(reconcileBlock).toContain('if (intentChanged) {');
	});
});
