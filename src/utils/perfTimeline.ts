import type {
	VaultmanPerfAction,
	VaultmanPerfSample,
} from './performanceMonitor';

export interface PerfTimelineInput {
	samples: VaultmanPerfSample[];
	actions: VaultmanPerfAction[];
}

function num(value: unknown): number | null {
	return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * When a gesture ran. `action.at` is the moment the monitor recorded it, which
 * for a coalesced gesture is after it settled, so a gesture that carries its
 * own `startedAt` is believed over the record time.
 */
function gestureSpan(action: VaultmanPerfAction): { from: number; to: number } {
	const detail = action.detail ?? {};
	const from = num(detail.startedAt) ?? action.at;
	const duration = num(detail.durationMs) ?? 0;
	return { from, to: from + duration };
}

/**
 * The sample each action belongs to: the nearest one in time.
 *
 * A fixed tolerance cannot work here. The sampler runs every 2s, so any window
 * narrower than half that drops actions silently -- and one wide enough to
 * catch them all would let a single action claim two samples. Nearest-wins
 * places every action exactly once, however the two rates drift.
 */
function actionsBySample(
	samples: VaultmanPerfSample[],
	actions: VaultmanPerfAction[],
): Map<number, VaultmanPerfAction[]> {
	const grouped = new Map<number, VaultmanPerfAction[]>();
	for (const action of actions) {
		let nearest = 0;
		let best = Number.POSITIVE_INFINITY;
		for (let i = 0; i < samples.length; i += 1) {
			const distance = Math.abs(samples[i].at - action.at);
			if (distance < best) {
				best = distance;
				nearest = i;
			}
		}
		const bucket = grouped.get(nearest);
		if (bucket) bucket.push(action);
		else grouped.set(nearest, [action]);
	}
	return grouped;
}

function describeGesture(
	action: VaultmanPerfAction,
	samples: VaultmanPerfSample[],
	aligned: VaultmanPerfSample,
): string {
	const detail = action.detail ?? {};
	const parts: string[] = [];
	if (typeof detail.rows === 'number') parts.push(`rows ${detail.rows}`);
	if (typeof detail.sticky === 'boolean') {
		parts.push(`sticky ${detail.sticky ? 'on' : 'off'}`);
	}
	const suffix = parts.length > 0 ? ` (${parts.join(', ')})` : '';

	// Not every action is a gesture: `render` and `render.metadata` carry no
	// displacement, and printing "undefinedpx in undefinedms" for them makes the
	// dump useless exactly where it is meant to be pasted -- into an issue.
	const delta = num(detail.delta);
	const durationMs = num(detail.durationMs);
	const movement =
		delta !== null && durationMs !== null
			? ` ${Math.round(delta)}px in ${durationMs}ms`
			: '';

	const span = gestureSpan(action);
	const covered = samples.filter(
		(candidate) => candidate.at >= span.from && candidate.at <= span.to,
	);
	// A gesture shorter than the sampling interval can span no sample at all;
	// the one it was aligned to is still the best evidence there is.
	const window = covered.length > 0 ? covered : [aligned];
	const worst = window.reduce(
		(low, candidate) => (candidate.fps < low ? candidate.fps : low),
		window[0].fps,
	);

	return (
		`${action.name}${movement}${suffix} -> ${aligned.fps} fps` +
		` · worst ${worst} fps`
	);
}

/**
 * Correlates fps samples with recorded actions into one readable narrative:
 * a stable stretch, the gesture that disturbed it, and the stable stretch
 * after. The HUD shows the live numbers; this is what you paste into an issue.
 *
 * Each gesture reports the worst fps reached inside its OWN span, so a run
 * with several gestures says which one hurt rather than blaming them all for
 * the deepest dip.
 */
export function formatPerfTimeline(input: PerfTimelineInput): string {
	// The monitor hands out ring buffers, whose order is an implementation
	// detail; the narrative is only readable oldest-first.
	const samples = [...input.samples].sort((a, b) => a.at - b.at);
	const actions = [...input.actions].sort((a, b) => a.at - b.at);
	if (samples.length === 0) return 'no samples';
	const origin = samples[0].at;
	const stamp = (at: number) => `+${((at - origin) / 1000).toFixed(1)}s`;

	const grouped = actionsBySample(samples, actions);
	const lines: string[] = [];
	for (let i = 0; i < samples.length; i += 1) {
		const sample = samples[i];
		const here = grouped.get(i);
		if (!here) {
			lines.push(`${stamp(sample.at)}  stable ${sample.fps} fps`);
			continue;
		}
		for (const action of here) {
			lines.push(
				`${stamp(sample.at)}  ${describeGesture(action, samples, sample)}`,
			);
		}
	}

	const overall = samples.reduce(
		(low, sample) => (sample.fps < low ? sample.fps : low),
		samples[0].fps,
	);
	lines.push(`worst overall ${overall} fps`);
	return lines.join('\n');
}
