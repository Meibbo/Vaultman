import {
	getActivePerfProbe,
	type PerfProbeMetricInput,
} from '../dev/perfProbe';

export function measureSceneSync<T>(
	name: string,
	input: PerfProbeMetricInput | undefined,
	operation: () => T,
): T {
	const probe = getActivePerfProbe();
	return probe ? probe.measure(name, input, operation) : operation();
}

export async function measureSceneAsync<T>(
	name: string,
	input: PerfProbeMetricInput | undefined,
	operation: () => Promise<T>,
): Promise<T> {
	const probe = getActivePerfProbe();
	return probe ? probe.measureAsync(name, input, operation) : operation();
}
