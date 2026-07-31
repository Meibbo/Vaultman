/** U121-016 / U121-017 — Text search lifecycle.
 *
 * Before this module the Text tab re-derived everything from loose booleans in
 * `pageFilters`, so every re-evaluation of the search effect looked identical to
 * "start a new search": returning from another provider tab wiped the partial
 * results, and resuming a paused scan restarted the traversal from the first
 * file (the BT4-018 note said so outright).
 *
 * The run below is the single source of truth for *which* search is on screen
 * (`signature`), *what it is doing* (`phase`), and *where the traversal stands*
 * (`cursor`). It is pure: no Obsidian, no Svelte, no timers. The component maps
 * the phase onto the adapter; `generation` is the token it uses to guarantee one
 * scan per user intent.
 */

export interface TextSearchSignature {
	query: string;
	isRegex: boolean;
	caseSensitive: boolean;
	isExclusion: boolean;
	/**
	 * Changed by the host when the scope file set changes underneath a run.
	 * The host's revision is an opaque token (today a string built from the
	 * scope), so this compares by equality and never by ordering.
	 */
	scopeRevision: string | number;
}

export type TextSearchPhase = 'idle' | 'running' | 'paused' | 'completed';

export interface TextSearchRun {
	signature: TextSearchSignature;
	phase: TextSearchPhase;
	/** Highest scope index consumed so far; the resume point. */
	cursor: number;
	/** Index the next scan starts from. Equals `cursor`, or 0 after a restart. */
	resumeFrom: number;
	/** Increments once per intent that requires a fresh traversal. */
	generation: number;
}

export type TextSearchIntent = 'pause' | 'resume' | 'restart';

export interface TextSearchControl {
	intent: TextSearchIntent;
	icon: string;
	labelKey: string;
	ariaKey: string;
	disabled: boolean;
}

export function sameTextSearchSignature(
	a: TextSearchSignature,
	b: TextSearchSignature,
): boolean {
	// `isExclusion` is not compared here either: it never changes the traversal,
	// only how the finished rule is handed to the other providers. The host
	// re-applies the rule on its own when the toggle moves.
	return (
		a.query === b.query &&
		a.isRegex === b.isRegex &&
		a.caseSensitive === b.caseSensitive &&
		a.scopeRevision === b.scopeRevision
	);
}

/**
 * What the user asked for, ignoring the scope revision. Used to tell a real
 * intent change (invalidate everything) from the host's own scope churn.
 */
export function sameTextSearchIntent(
	a: TextSearchSignature,
	b: TextSearchSignature,
): boolean {
	// `isExclusion` is deliberately absent. Has/Hasn't does not change which
	// files match the query — it changes how the resulting rule is applied to
	// the other providers. Treating it as an intent change re-scanned from zero
	// and emptied the Text nodes on every toggle.
	return (
		a.query === b.query &&
		a.isRegex === b.isRegex &&
		a.caseSensitive === b.caseSensitive
	);
}

export function createTextSearchRun(
	signature: TextSearchSignature,
	phase: TextSearchPhase = 'idle',
	generation = 0,
): TextSearchRun {
	return { signature, phase, cursor: 0, resumeFrom: 0, generation };
}

/** True while the host should be feeding the adapter. */
export function textSearchShouldScan(run: TextSearchRun): boolean {
	return run.phase === 'running';
}

/** Record traversal progress. Never rewinds: partial updates can arrive late. */
export function advanceTextSearchRun(
	run: TextSearchRun,
	cursor: number,
): TextSearchRun {
	if (cursor <= run.cursor) return run;
	return { ...run, cursor, resumeFrom: cursor };
}

export function pauseTextSearchRun(run: TextSearchRun): TextSearchRun {
	if (run.phase !== 'running') return run;
	return { ...run, phase: 'paused' };
}

/** Resume is not a new search: same generation, same cursor. */
export function resumeTextSearchRun(run: TextSearchRun): TextSearchRun {
	if (run.phase !== 'paused') return run;
	// Already-running is returned by identity above, for the same reason
	// `completeTextSearchRun` does: a repeated transition must not write state.
	return { ...run, phase: 'running', resumeFrom: run.cursor };
}

export function completeTextSearchRun(run: TextSearchRun): TextSearchRun {
	if (run.phase === 'idle') return run;
	// Identity when already completed. A copy is a `$state` write, the write
	// re-runs the host effect, and the effect settles the run again — Svelte
	// killed that with `effect_update_depth_exceeded`, which is the crash the
	// dev saw on resume. Every transition here must be a no-op on repeat.
	if (run.phase === 'completed') return run;
	return { ...run, phase: 'completed' };
}

/**
 * Settle a scan that stopped emitting.
 *
 * `exhausted` says whether the traversal actually consumed the scope. The
 * native fast path returns Obsidian's own snapshot without walking the scope
 * locally, and on large result sets that snapshot stops well short of the real
 * count — searching a single common letter finished at a third of what Core
 * reported. Calling that "completed" put a Restart control on a search that had
 * not finished, so a short scan settles as **paused** instead: the cursor is
 * intact and Resume carries it to the end through the local pass.
 */
export function settleTextSearchRun(
	run: TextSearchRun,
	exhausted: boolean,
): TextSearchRun {
	return exhausted ? completeTextSearchRun(run) : pauseTextSearchRun(run);
}

/** Restart is a new traversal of the same query — one generation, cursor 0. */
export function restartTextSearchRun(run: TextSearchRun): TextSearchRun {
	return {
		...run,
		phase: 'running',
		cursor: 0,
		resumeFrom: 0,
		generation: run.generation + 1,
	};
}

/**
 * Fold the current descriptor into the run.
 *
 * Same signature -> the run is returned **by identity**, so a provider switch,
 * a re-render, or any unrelated effect re-run cannot restart a scan or discard
 * a cursor. Different signature -> the old traversal is incompatible and is
 * replaced by a fresh running run (or an idle one when the query empties).
 */
export function reconcileTextSearchRun(
	run: TextSearchRun,
	signature: TextSearchSignature,
): TextSearchRun {
	if (sameTextSearchSignature(run.signature, signature)) return run;
	if (signature.query.trim().length === 0) {
		return createTextSearchRun(signature, 'idle', run.generation + 1);
	}
	if (sameTextSearchIntent(run.signature, signature)) {
		// Scope-only move. The host recomputes its scope revision as a side
		// effect of the filter update this very search performs, so this fires
		// on our own tail. It must never wake a paused run, re-open a completed
		// one, or re-mint one already scanning — that is churn, not a user
		// asking for something else.
		//
		// Returned **by identity**, not as a copy carrying the new revision: a
		// copy is a state write, the write re-runs the host effect, the effect
		// re-applies the filter rule, and that moves the revision again. That
		// loop froze the app on pause, and on `running` it ran away outright —
		// each pass minted `generation + 1`, which relaunched the scan, which
		// moved the revision, until Svelte raised
		// `effect_update_depth_exceeded`. Resume is the transition that returns
		// a run to `running` with scope and filter already applied, so the churn
		// was immediate there and absent on a first search.
		//
		// A run holding a traversal has no use for a newer scope anyway: the
		// scan reads its scope files at launch, and a user who genuinely wants
		// the new scope searched has Restart. Only `idle` carries no traversal,
		// and an idle run with a query is not reachable here — the empty-query
		// branch above owns that case.
		return run;
	}
	return createTextSearchRun(signature, 'running', run.generation + 1);
}

/**
 * The one toolbar control, derived from the phase — the completed state is the
 * reason this is not a boolean: it reads "Restart search", not "Resume".
 */
export function textSearchControl(
	run: TextSearchRun,
	hasQuery: boolean,
): TextSearchControl {
	if (run.phase === 'completed') {
		return {
			intent: 'restart',
			icon: 'lucide-rotate-ccw',
			labelKey: 'content.restart_search',
			ariaKey: 'content.restart_search',
			disabled: !hasQuery,
		};
	}
	if (run.phase === 'paused') {
		return {
			intent: 'resume',
			icon: 'lucide-play',
			labelKey: 'content.resume_search',
			ariaKey: 'content.resume_search',
			disabled: !hasQuery,
		};
	}
	return {
		intent: 'pause',
		icon: 'lucide-pause',
		labelKey: 'content.pause_search',
		ariaKey: 'content.pause_search',
		disabled: !hasQuery,
	};
}

/**
 * Identity of one traversal attempt: same generation AND same starting point.
 * A resume keeps the generation but moves the start, so it is a new attempt.
 */
export function textSearchLaunchToken(run: TextSearchRun): string {
	return `${run.generation}:${run.resumeFrom}`;
}

/**
 * Whether the host should launch a scan now.
 *
 * `inFlightToken` is the token of the scan **actually running** — not of the one
 * merely scheduled. That distinction is the whole point: the launch is debounced,
 * and if this returned false for a scheduled-but-not-started scan, an effect
 * re-run inside the debounce window would cancel the pending timer and then
 * decline to reschedule it, leaving a search that never starts.
 */
export function shouldLaunchTextSearch(
	run: TextSearchRun,
	inFlightToken: string,
): boolean {
	if (!textSearchShouldScan(run)) return false;
	return inFlightToken !== textSearchLaunchToken(run);
}

/** Apply the control's intent. Kept here so the host has no phase branching. */
export function applyTextSearchIntent(
	run: TextSearchRun,
	intent: TextSearchIntent,
): TextSearchRun {
	if (intent === 'pause') return pauseTextSearchRun(run);
	if (intent === 'resume') return resumeTextSearchRun(run);
	return restartTextSearchRun(run);
}
