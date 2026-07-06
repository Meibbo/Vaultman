import type { ViewLayers, ViewTextRange } from '../types/typeViews';

export function highlightsFromViewLayers(layers: ViewLayers): ViewTextRange[] | undefined {
	const ranges = [
		...(layers.highlights?.query ?? []),
		...(layers.highlights?.filter ?? []),
		...(layers.highlights?.warning ?? []),
	];
	if (ranges.length === 0) return undefined;
	const seen = new Set<string>();
	return ranges
		.sort((a, b) => a.start - b.start || a.end - b.end)
		.filter((range) => {
			const key = `${range.start}:${range.end}`;
			if (seen.has(key)) return false;
			seen.add(key);
			return true;
		});
}

export function withViewStateClasses(
	current: string | undefined,
	layers: ViewLayers,
	options: { deletedClass?: string } = {},
): string {
	let next = current ?? '';
	if (layers.state?.activeFilter) next = addClass(next, 'is-active-filter');
	if (layers.state?.selected) next = addClass(next, 'is-selected');
	if (layers.state?.focused) next = addClass(next, 'is-focused');
	if (layers.state?.deleted && options.deletedClass) next = addClass(next, options.deletedClass);
	if (layers.state?.warning) next = addClass(next, 'vm-badge-warning');
	return next;
}

function addClass(current: string, name: string): string {
	if (current.split(/\s+/).includes(name)) return current;
	return `${current} ${name}`.trim();
}
