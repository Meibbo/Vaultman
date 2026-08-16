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

/**
 * Correlates fps samples with recorded actions into one readable narrative:
 * a stable stretch, the gesture that disturbed it, and the stable stretch
 * after. The HUD shows the live numbers; this is what you paste into an issue.
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
		lines.push(
			`${stamp(sample.at)}  ${action.name} ${String(detail.delta)}px in ` +
				`${String(detail.durationMs)}ms${suffix} -> ${sample.fps} fps`,
		);
	}

	const worst = samples.reduce(
		(low, sample) => (sample.fps < low ? sample.fps : low),
		samples[0].fps,
	);
	lines.push(`worst ${worst} fps`);
	return lines.join('\n');
}
