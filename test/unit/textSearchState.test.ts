import { describe, expect, it } from 'vitest';

import {
	advanceTextSearchRun,
	completeTextSearchRun,
	createTextSearchRun,
	pauseTextSearchRun,
	reconcileTextSearchRun,
	restartTextSearchRun,
	resumeTextSearchRun,
	sameTextSearchIntent,
	sameTextSearchSignature,
	settleTextSearchRun,
	shouldLaunchTextSearch,
	textSearchControl,
	textSearchLaunchToken,
	textSearchShouldScan,
	type TextSearchSignature,
} from '../../src/logic/logicTextSearchState';

function signature(
	overrides: Partial<TextSearchSignature> = {},
): TextSearchSignature {
	return {
		query: 'alpha',
		isRegex: false,
		caseSensitive: false,
		isExclusion: false,
		scopeRevision: 1,
		...overrides,
	};
}

describe('transitions are idempotent by identity', () => {
	// The crash on resume was Svelte's `effect_update_depth_exceeded`. A
	// transition that returned a fresh object on repeat kept writing `$state`,
	// and each write re-ran the effect that settled the run. Once applied, a
	// transition must be a no-op by identity or the host loops forever.
	it('returns the same object when a transition is repeated', () => {
		const base = createTextSearchRun(signature(), 'running');

		const completed = completeTextSearchRun(base);
		expect(completeTextSearchRun(completed)).toBe(completed);

		const paused = pauseTextSearchRun(base);
		expect(pauseTextSearchRun(paused)).toBe(paused);

		const resumed = resumeTextSearchRun(paused);
		expect(resumeTextSearchRun(resumed)).toBe(resumed);

		expect(advanceTextSearchRun(base, 0)).toBe(base);
		expect(settleTextSearchRun(completed, true)).toBe(completed);
	});
});

describe('text search signature', () => {
	it('treats identical descriptors as the same search', () => {
		expect(sameTextSearchSignature(signature(), signature())).toBe(true);
	});

	it('separates a different query, mode, or scope revision', () => {
		expect(
			sameTextSearchSignature(signature(), signature({ query: 'beta' })),
		).toBe(false);
		expect(
			sameTextSearchSignature(signature(), signature({ isRegex: true })),
		).toBe(false);
		expect(
			sameTextSearchSignature(signature(), signature({ caseSensitive: true })),
		).toBe(false);
		expect(
			sameTextSearchSignature(signature(), signature({ scopeRevision: 2 })),
		).toBe(false);
	});

	it('does not separate on the exclusion toggle', () => {
		// Has/Hasn't decides how the finished rule reaches the other providers.
		// It matches the same files either way, so it must not restart anything.
		expect(
			sameTextSearchSignature(signature(), signature({ isExclusion: true })),
		).toBe(true);
		expect(
			sameTextSearchIntent(signature(), signature({ isExclusion: true })),
		).toBe(true);
	});
});

describe('pause keeps the traversal cursor', () => {
	it('stops scanning without discarding the cursor', () => {
		const running = advanceTextSearchRun(
			createTextSearchRun(signature(), 'running'),
			42,
		);
		const paused = pauseTextSearchRun(running);

		expect(paused.phase).toBe('paused');
		expect(paused.cursor).toBe(42);
		expect(textSearchShouldScan(paused)).toBe(false);
	});

	it('resumes from the saved cursor instead of restarting', () => {
		const paused = pauseTextSearchRun(
			advanceTextSearchRun(createTextSearchRun(signature(), 'running'), 42),
		);
		const resumed = resumeTextSearchRun(paused);

		expect(resumed.phase).toBe('running');
		expect(resumed.cursor).toBe(42);
		expect(resumed.resumeFrom).toBe(42);
		expect(textSearchShouldScan(resumed)).toBe(true);
	});

	it('does not spend a new generation on resume', () => {
		const paused = pauseTextSearchRun(
			createTextSearchRun(signature(), 'running'),
		);
		expect(resumeTextSearchRun(paused).generation).toBe(paused.generation);
	});
});

describe('completed search exposes restart', () => {
	it('restart clears traversal state exactly once', () => {
		const completed = completeTextSearchRun(
			advanceTextSearchRun(createTextSearchRun(signature(), 'running'), 88),
		);
		expect(completed.phase).toBe('completed');
		expect(completed.cursor).toBe(88);

		const restarted = restartTextSearchRun(completed);
		expect(restarted.phase).toBe('running');
		expect(restarted.cursor).toBe(0);
		expect(restarted.resumeFrom).toBe(0);
		expect(restarted.generation).toBe(completed.generation + 1);

		// Restarting the already-restarted run must not spend a second
		// generation for the same user action.
		expect(restartTextSearchRun(restarted).generation).toBe(
			restarted.generation + 1,
		);
	});

	it('names the control by phase with icon, tooltip and aria label', () => {
		const idle = createTextSearchRun(signature(), 'idle');
		const running = createTextSearchRun(signature(), 'running');
		const paused = pauseTextSearchRun(running);
		const completed = completeTextSearchRun(running);

		expect(textSearchControl(running, true)).toMatchObject({
			intent: 'pause',
			icon: 'lucide-pause',
			labelKey: 'content.pause_search',
			ariaKey: 'content.pause_search',
			disabled: false,
		});
		expect(textSearchControl(paused, true)).toMatchObject({
			intent: 'resume',
			icon: 'lucide-play',
			labelKey: 'content.resume_search',
			ariaKey: 'content.resume_search',
		});
		expect(textSearchControl(completed, true)).toMatchObject({
			intent: 'restart',
			icon: 'lucide-rotate-ccw',
			labelKey: 'content.restart_search',
			ariaKey: 'content.restart_search',
		});
		expect(textSearchControl(idle, false).disabled).toBe(true);
	});
});

describe('query changes invalidate incompatible state', () => {
	it('drops a paused run when the query changes', () => {
		const paused = pauseTextSearchRun(
			advanceTextSearchRun(createTextSearchRun(signature(), 'running'), 30),
		);
		const next = reconcileTextSearchRun(paused, signature({ query: 'beta' }));

		expect(next.phase).toBe('running');
		expect(next.cursor).toBe(0);
		expect(next.resumeFrom).toBe(0);
		expect(next.signature.query).toBe('beta');
		expect(next.generation).toBe(paused.generation + 1);
	});

	it('drops a completed run when the matching mode changes', () => {
		const completed = completeTextSearchRun(
			advanceTextSearchRun(createTextSearchRun(signature(), 'running'), 30),
		);
		const next = reconcileTextSearchRun(
			completed,
			signature({ caseSensitive: true }),
		);

		expect(next.phase).toBe('running');
		expect(next.cursor).toBe(0);
	});

	it('keeps paused and completed runs across an unrelated re-evaluation', () => {
		const paused = pauseTextSearchRun(
			advanceTextSearchRun(createTextSearchRun(signature(), 'running'), 30),
		);
		const same = reconcileTextSearchRun(paused, signature());

		// This is the provider-switch case: returning to the Text tab must not
		// restart a paused scan or wipe its cursor.
		expect(same).toBe(paused);
		expect(same.cursor).toBe(30);
		expect(same.generation).toBe(paused.generation);
	});

	it('keeps a completed run when returning with the same signature', () => {
		const completed = completeTextSearchRun(
			advanceTextSearchRun(createTextSearchRun(signature(), 'running'), 77),
		);
		const same = reconcileTextSearchRun(completed, signature());

		expect(same).toBe(completed);
		expect(textSearchShouldScan(same)).toBe(false);
	});

	it('keeps a running run resuming from its cursor, not from zero', () => {
		const running = advanceTextSearchRun(
			createTextSearchRun(signature(), 'running'),
			12,
		);
		const same = reconcileTextSearchRun(running, signature());

		expect(same).toBe(running);
		expect(same.resumeFrom).toBe(12);
	});

	it('goes idle when the query empties', () => {
		const running = advanceTextSearchRun(
			createTextSearchRun(signature(), 'running'),
			12,
		);
		const cleared = reconcileTextSearchRun(running, signature({ query: '' }));

		expect(cleared.phase).toBe('idle');
		expect(cleared.cursor).toBe(0);
		expect(textSearchShouldScan(cleared)).toBe(false);
	});
});

describe("has/hasn't is not a new search", () => {
	it('keeps the traversal when only the exclusion toggle moves', () => {
		// Has/Hasn't changes how the resulting rule is applied to the other
		// providers, not which files match. Treating it as an intent change
		// re-scanned from zero and emptied the Text nodes on every toggle.
		const running = advanceTextSearchRun(
			createTextSearchRun(signature(), 'running'),
			40,
		);
		const toggled = reconcileTextSearchRun(
			running,
			signature({ isExclusion: true }),
		);

		expect(toggled).toBe(running);
		expect(toggled.cursor).toBe(40);
	});

	it('keeps a completed run when the exclusion toggle moves', () => {
		const completed = completeTextSearchRun(
			createTextSearchRun(signature(), 'running'),
		);
		expect(
			reconcileTextSearchRun(completed, signature({ isExclusion: true })),
		).toBe(completed);
	});
});

describe('settling a scan that stopped short', () => {
	it('completes only when the traversal consumed the scope', () => {
		const run = advanceTextSearchRun(
			createTextSearchRun(signature(), 'running'),
			120,
		);
		expect(settleTextSearchRun(run, true).phase).toBe('completed');
		expect(textSearchControl(settleTextSearchRun(run, true), true).intent).toBe(
			'restart',
		);
	});

	it('settles as paused when the scan stopped short, keeping the cursor', () => {
		// The native fast path returns Obsidian's snapshot without walking the
		// scope, and on a common query that snapshot lands far below the real
		// count. Restart on an unfinished search is a lie; Resume is the truth.
		const run = advanceTextSearchRun(
			createTextSearchRun(signature(), 'running'),
			0,
		);
		const settled = settleTextSearchRun(run, false);

		expect(settled.phase).toBe('paused');
		expect(settled.cursor).toBe(0);
		expect(textSearchControl(settled, true).intent).toBe('resume');
	});
});

describe('launch decision (regression: search never started)', () => {
	it('keeps asking to launch until a scan is actually in flight', () => {
		const run = createTextSearchRun(signature(), 'running');
		const token = textSearchLaunchToken(run);

		// The launch is debounced. Until the scan really starts, every
		// re-evaluation must still ask for it — otherwise an effect re-run inside
		// the debounce window cancels the pending timer and never reschedules,
		// and the search silently never runs.
		expect(shouldLaunchTextSearch(run, '')).toBe(true);
		expect(shouldLaunchTextSearch(run, '')).toBe(true);
		expect(shouldLaunchTextSearch(run, token)).toBe(false);
	});

	it('asks again after a resume, because the start point moved', () => {
		// Model the host: the token is claimed when the scan starts, so it holds
		// the start point of *that* attempt, not wherever the cursor later got to.
		const started = createTextSearchRun(signature(), 'running');
		const inFlight = textSearchLaunchToken(started);
		expect(inFlight).toBe('0:0');

		const paused = pauseTextSearchRun(advanceTextSearchRun(started, 25));
		const resumed = resumeTextSearchRun(paused);

		expect(textSearchLaunchToken(resumed)).toBe('0:25');
		expect(shouldLaunchTextSearch(resumed, inFlight)).toBe(true);
	});

	it('still relaunches when the user pauses before any progress', () => {
		// Cursor never moved, so the token is unchanged — pause/resume would be a
		// no-op if the host did not release the in-flight token on pause. It does,
		// and this pins that contract.
		const started = createTextSearchRun(signature(), 'running');
		const inFlight = textSearchLaunchToken(started);
		const resumed = resumeTextSearchRun(pauseTextSearchRun(started));

		expect(textSearchLaunchToken(resumed)).toBe(inFlight);
		expect(shouldLaunchTextSearch(resumed, inFlight)).toBe(false);
		expect(shouldLaunchTextSearch(resumed, '')).toBe(true);
	});

	it('never launches for a phase that is not scanning', () => {
		const run = createTextSearchRun(signature(), 'running');
		expect(shouldLaunchTextSearch(pauseTextSearchRun(run), '')).toBe(false);
		expect(shouldLaunchTextSearch(completeTextSearchRun(run), '')).toBe(false);
		expect(
			shouldLaunchTextSearch(createTextSearchRun(signature(), 'idle'), ''),
		).toBe(false);
	});
});

describe('scope revision does not invalidate the query state', () => {
	it('returns a frozen run by identity, so the host performs no state write', () => {
		// A copy here is a state write; the write re-runs the host effect, which
		// re-applies the filter rule, which moves the scope revision again. That
		// loop froze the app on pause.
		const paused = pauseTextSearchRun(
			advanceTextSearchRun(createTextSearchRun(signature(), 'running'), 15),
		);
		const moved = signature({ scopeRevision: 'sig:view:9:edit:9' });

		expect(reconcileTextSearchRun(paused, moved)).toBe(paused);

		const completed = completeTextSearchRun(
			advanceTextSearchRun(createTextSearchRun(signature(), 'running'), 15),
		);
		expect(reconcileTextSearchRun(completed, moved)).toBe(completed);
	});

	it('returns a running run by identity too, so a scan in flight is not re-minted', () => {
		// This is the resume crash. A scan already in flight applies its filter
		// rule, the host recomputes the scope revision off that very update, the
		// effect re-runs with a moved revision — and a `running` run used to fall
		// through to a fresh object with `generation + 1`. That is a `$state`
		// write, the write re-runs the effect, the effect relaunches the scan, the
		// scan moves the revision again: `effect_update_depth_exceeded`.
		//
		// Resume is exactly the transition that returns a run to `running` with
		// scope and filter *already applied*, which is why it crashed there and
		// not on a first search. A scope-only move must be inert for every phase
		// that owns a traversal.
		const running = advanceTextSearchRun(
			createTextSearchRun(signature(), 'running'),
			15,
		);
		const moved = signature({ scopeRevision: 'sig:view:1:edit:2' });

		expect(reconcileTextSearchRun(running, moved)).toBe(running);
		expect(reconcileTextSearchRun(running, moved).generation).toBe(
			running.generation,
		);
		expect(reconcileTextSearchRun(running, moved).cursor).toBe(15);
	});

	it('does not mint a new generation across repeated scope revisions', () => {
		// The loop needed two passes to run away: pass one mints generation + 1,
		// pass two mints another off the run pass one produced. Feeding two
		// distinct revisions in sequence is the smallest shape of the crash.
		const first = advanceTextSearchRun(
			createTextSearchRun(signature(), 'running'),
			15,
		);
		const second = reconcileTextSearchRun(
			first,
			signature({ scopeRevision: 'sig:view:1:edit:2' }),
		);
		const third = reconcileTextSearchRun(
			second,
			signature({ scopeRevision: 'sig:view:1:edit:3' }),
		);

		expect(third.generation).toBe(first.generation);
		expect(third).toBe(first);
	});
});

describe('no double execution', () => {
	it('a run that is already scanning does not re-enter on re-evaluation', () => {
		const running = createTextSearchRun(signature(), 'running');
		const again = reconcileTextSearchRun(running, signature());

		expect(again.generation).toBe(running.generation);
		expect(again).toBe(running);
	});

	it('advance never moves the cursor backwards', () => {
		const running = advanceTextSearchRun(
			createTextSearchRun(signature(), 'running'),
			50,
		);
		expect(advanceTextSearchRun(running, 20).cursor).toBe(50);
		expect(advanceTextSearchRun(running, 51).cursor).toBe(51);
	});
});
