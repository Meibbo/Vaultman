import type {
	VaultmanPerfAction,
	VaultmanPerfSample,
} from './performanceMonitor';

export interface PerfTimelineInput {
	samples: VaultmanPerfSample[];
	actions: VaultmanPerfAction[];
}

/** Half a sampling interval: how close an action must be to own a sample. */
const ACTION_WINDOW_MS = 500;

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

	const lines: string[] = [];
	for (const sample of samples) {
		const action = actions.find(
			(candidate) => Math.abs(candidate.at - sample.at) < ACTION_WINDOW_MS,
		);
		if (!action) {
			lines.push(`${stamp(sample.at)}  stable ${sample.fps} fps`);
			continue;
		}
		const detail = action.detail ?? {};
		const parts: string[] = [];
		if (typeof detail.rows === 'number') parts.push(`rows ${detail.rows}`);
		if (typeof detail.sticky === 'boolean') {
			parts.push(`sticky ${detail.sticky ? 'on' : 'off'}`);
		}
		const suffix = parts.length > 0 ? ` (${parts.join(', ')})` : '';

		const span = gestureSpan(action);
		const inSpan = samples.filter(
			(candidate) => candidate.at >= span.from && candidate.at <= span.to,
		);
		// A gesture shorter than the sampling interval can span no sample at
		// all; the one it was aligned to is still the best evidence there is.
		const covered = inSpan.length > 0 ? inSpan : [sample];
		const gestureWorst = covered.reduce(
			(low, candidate) => (candidate.fps < low ? candidate.fps : low),
			covered[0].fps,
		);

		lines.push(
			`${stamp(sample.at)}  ${action.name} ${String(detail.delta)}px in ` +
				`${String(detail.durationMs)}ms${suffix} -> ${sample.fps} fps` +
				` · worst ${gestureWorst} fps`,
		);
	}

	const overall = samples.reduce(
		(low, sample) => (sample.fps < low ? sample.fps : low),
		samples[0].fps,
	);
	lines.push(`worst overall ${overall} fps`);
	return lines.join('\n');
}
