export interface PerfProbeMetricInput {
	nodes?: number;
	rows?: number;
	visibleRows?: number;
	files?: number;
	operations?: number;
	filters?: number;
}

export interface PerfProbeCounter {
	count: number;
	totalNodes: number;
	totalRows: number;
	totalVisibleRows: number;
	totalFiles: number;
	totalOperations: number;
	totalFilters: number;
}

export interface PerfProbeTiming extends PerfProbeCounter {
	totalMs: number;
	maxMs: number;
}

export const PERF_SCENARIO_NAMES = [
	'filters-search',
	'tree-scroll',
	'filter-select',
	'operation-badges',
	'files-list-10k-scroll-jump',
	'files-tree-10k-scroll-jump',
	'files-tree-50k-scroll-jump',
	'projection-50k-build-or-refresh',
	'projection-100k-proof',
	'view-menu-element-toggle',
	'view-mode-native-preset-restore',
	'tree-box-selection',
	'tree-filtered-highlight',
	'node-media-descriptor-build',
	'node-media-hidden-cost',
	'node-media-visible-subscribe',
] as const;

export type PerfScenarioName = (typeof PERF_SCENARIO_NAMES)[number];

export interface PerfScenarioOptions {
	query?: string;
	steps?: number;
}

export interface PerfProbeSnapshot {
	scenario?: string;
	startedAt: number;
	endedAt: number;
	counters: Record<string, PerfProbeCounter>;
	timings: Record<string, PerfProbeTiming>;
	longFrameCount?: number;
	maxLongFrameMs?: number;
	heapDeltaBytes?: number;
}

export interface PerfProbeApi {
	count(name: string, input?: PerfProbeMetricInput): void;
	measure<T>(name: string, input: PerfProbeMetricInput | undefined, fn: () => T): T;
	measureAsync<T>(
		name: string,
		input: PerfProbeMetricInput | undefined,
		fn: () => Promise<T>,
	): Promise<T>;
	reset(): void;
	snapshot(): PerfProbeSnapshot;
	run(name: PerfScenarioName, options?: PerfScenarioOptions): Promise<PerfProbeSnapshot>;
}

export interface PerfProbeOptions {
	now: () => number;
	doc?: Document;
}

export interface PerfProbe {
	api: PerfProbeApi;
	count(name: string, input?: PerfProbeMetricInput): void;
	measure<T>(name: string, input: PerfProbeMetricInput | undefined, fn: () => T): T;
	reset(): void;
	snapshot(): PerfProbeSnapshot;
	installGlobal(target: { __vaultmanPerfProbe?: unknown }): () => void;
}

let activePerfProbe: PerfProbeApi | undefined;

export function setActivePerfProbe(probe: PerfProbeApi): void {
	activePerfProbe = probe;
}

export function clearActivePerfProbe(): void {
	activePerfProbe = undefined;
}

export function getActivePerfProbe(): PerfProbeApi | undefined {
	return activePerfProbe;
}

function createCounter(): PerfProbeCounter {
	return {
		count: 0,
		totalNodes: 0,
		totalRows: 0,
		totalVisibleRows: 0,
		totalFiles: 0,
		totalOperations: 0,
		totalFilters: 0,
	};
}

function addMetricInput(target: PerfProbeCounter, input?: PerfProbeMetricInput): void {
	target.count += 1;
	target.totalNodes += input?.nodes ?? 0;
	target.totalRows += input?.rows ?? 0;
	target.totalVisibleRows += input?.visibleRows ?? 0;
	target.totalFiles += input?.files ?? 0;
	target.totalOperations += input?.operations ?? 0;
	target.totalFilters += input?.filters ?? 0;
}

async function waitFrames(doc: Document | undefined, count = 2): Promise<void> {
	const win = doc?.defaultView;
	for (let i = 0; i < count; i += 1) {
		if (!win) {
			await Promise.resolve();
			continue;
		}
		await new Promise<void>((resolve) => {
			let finished = false;
			const finish = () => {
				if (finished) return;
				finished = true;
				resolve();
			};
			if (win.requestAnimationFrame) {
				win.requestAnimationFrame(finish);
			}
			win.setTimeout(finish, 50);
		});
	}
}

function inputText(input: HTMLInputElement, value: string): void {
	const win = input.ownerDocument.defaultView;
	input.value = value;
	const EventConstructor = win?.InputEvent ?? InputEvent;
	input.dispatchEvent(
		new EventConstructor('input', { bubbles: true, inputType: 'insertText', data: value }),
	);
}

function clickElement(element: HTMLElement): void {
	const win = element.ownerDocument.defaultView;
	const EventConstructor = win?.MouseEvent ?? MouseEvent;
	element.dispatchEvent(new EventConstructor('click', { bubbles: true, cancelable: true }));
}

function scrollElement(element: HTMLElement, steps: number): void {
	const boundedSteps = Math.max(1, steps);
	const maxScroll = Math.max(0, element.scrollHeight - element.clientHeight);
	const increment = maxScroll > 0 ? maxScroll / boundedSteps : element.clientHeight || 32;
	for (let i = 1; i <= boundedSteps; i += 1) {
		element.scrollTop = Math.round(increment * i);
		element.dispatchEvent(new Event('scroll', { bubbles: true }));
	}
}

function dragBoxSelection(element: HTMLElement): void {
	const win = element.ownerDocument.defaultView;
	const EventConstructor = win?.PointerEvent ?? win?.MouseEvent ?? MouseEvent;
	const rect = element.getBoundingClientRect();
	const startX = rect.left + 8;
	const startY = rect.top + 8;
	const endX = rect.left + Math.max(48, Math.min(rect.width || 160, 160));
	const endY = rect.top + Math.max(48, Math.min(rect.height || 160, 160));

	element.dispatchEvent(
		new EventConstructor('pointerdown', {
			bubbles: true,
			cancelable: true,
			clientX: startX,
			clientY: startY,
		}),
	);
	element.dispatchEvent(
		new EventConstructor('pointermove', {
			bubbles: true,
			cancelable: true,
			clientX: endX,
			clientY: endY,
		}),
	);
	element.dispatchEvent(
		new EventConstructor('pointerup', {
			bubbles: true,
			cancelable: true,
			clientX: endX,
			clientY: endY,
		}),
	);
}

function scenarioMetricInput(name: PerfScenarioName): PerfProbeMetricInput | undefined {
	if (name === 'files-list-10k-scroll-jump') {
		return { nodes: 10_000, rows: 10_000, visibleRows: 64, files: 10_000 };
	}
	if (name === 'files-tree-10k-scroll-jump') {
		return { nodes: 10_000, rows: 10_000, visibleRows: 64, files: 10_000 };
	}
	if (name === 'files-tree-50k-scroll-jump') {
		return { nodes: 50_000, rows: 50_000, visibleRows: 64, files: 50_000 };
	}
	if (name === 'projection-50k-build-or-refresh') {
		return { nodes: 50_000, rows: 50_000, files: 50_000 };
	}
	if (name === 'projection-100k-proof') {
		return { nodes: 100_000, rows: 100_000, files: 100_000 };
	}
	if (name === 'node-media-descriptor-build' || name === 'node-media-hidden-cost') {
		return { nodes: 10_000, rows: 10_000, files: 10_000 };
	}
	if (name === 'node-media-visible-subscribe') {
		return { nodes: 10_000, rows: 10_000, visibleRows: 64, files: 10_000 };
	}
	return undefined;
}

export function createPerfProbe({ now, doc }: PerfProbeOptions): PerfProbe {
	let startedAt = now();
	let counters: Record<string, PerfProbeCounter> = {};
	let timings: Record<string, PerfProbeTiming> = {};

	function count(name: string, input?: PerfProbeMetricInput): void {
		counters[name] ??= createCounter();
		addMetricInput(counters[name], input);
	}

	function measure<T>(name: string, input: PerfProbeMetricInput | undefined, fn: () => T): T {
		const start = now();
		const result = fn();
		const duration = now() - start;
		timings[name] ??= {
			...createCounter(),
			totalMs: 0,
			maxMs: 0,
		};
		addMetricInput(timings[name], input);
		timings[name].totalMs += duration;
		timings[name].maxMs = Math.max(timings[name].maxMs, duration);
		return result;
	}

	async function measureAsync<T>(
		name: string,
		input: PerfProbeMetricInput | undefined,
		fn: () => Promise<T>,
	): Promise<T> {
		const start = now();
		try {
			return await fn();
		} finally {
			const duration = now() - start;
			timings[name] ??= {
				...createCounter(),
				totalMs: 0,
				maxMs: 0,
			};
			addMetricInput(timings[name], input);
			timings[name].totalMs += duration;
			timings[name].maxMs = Math.max(timings[name].maxMs, duration);
		}
	}

	function reset(): void {
		startedAt = now();
		counters = {};
		timings = {};
	}

	function snapshot(): PerfProbeSnapshot {
		return {
			startedAt,
			endedAt: now(),
			counters,
			timings,
			longFrameCount: undefined,
			maxLongFrameMs: undefined,
			heapDeltaBytes: undefined,
		};
	}

	async function run(
		name: PerfScenarioName,
		options: PerfScenarioOptions = {},
	): Promise<PerfProbeSnapshot> {
		reset();
		const scenarioInput = scenarioMetricInput(name);
		count(`scenario.${name}`, scenarioInput);

		await measureAsync(`scenario.${name}.duration`, scenarioInput, async () => {
			if (name === 'filters-search') {
				const input = doc?.querySelector<HTMLInputElement>('.vm-filters-search-input');
				if (input) inputText(input, options.query ?? 'status');
			} else if (name === 'tree-scroll' || name === 'files-tree-10k-scroll-jump') {
				const outer = doc?.querySelector<HTMLElement>('.vm-tree-virtual-outer');
				if (outer) scrollElement(outer, options.steps ?? 8);
			} else if (name === 'files-tree-50k-scroll-jump') {
				const outer = doc?.querySelector<HTMLElement>('.vm-tree-virtual-outer');
				if (outer) scrollElement(outer, options.steps ?? 16);
			} else if (name === 'files-list-10k-scroll-jump') {
				const outer = doc?.querySelector<HTMLElement>('.vm-view-list');
				if (outer) scrollElement(outer, options.steps ?? 8);
			} else if (name === 'filter-select') {
				const row = doc?.querySelector<HTMLElement>('.vm-tree-virtual-row');
				if (row) clickElement(row);
			} else if (name === 'operation-badges') {
				const badge = doc?.querySelector<HTMLElement>('.vm-badge.is-undoable, .vm-badge');
				if (badge) clickElement(badge);
			} else if (name === 'view-menu-element-toggle') {
				const toggle = doc?.querySelector<HTMLElement>(
					'[data-node-field], [data-testid="view-menu-element-toggle"], .vm-view-menu [role="checkbox"]',
				);
				if (toggle) clickElement(toggle);
			} else if (name === 'view-mode-native-preset-restore') {
				const preset = doc?.querySelector<HTMLElement>(
					'[data-vm-view-preset="native"], [data-testid="view-mode-native-preset"], .vm-view-mode-native-preset',
				);
				if (preset) clickElement(preset);
			} else if (name === 'tree-box-selection') {
				const outer = doc?.querySelector<HTMLElement>('.vm-tree-virtual-outer');
				if (outer) dragBoxSelection(outer);
			} else if (name === 'tree-filtered-highlight') {
				const highlighted = doc?.querySelectorAll(
					'.vm-tree-row-surface.is-active-filter, .is-active-filter .vm-tree-row-surface',
				);
				count('scenario.tree-filtered-highlight.matches', { rows: highlighted?.length ?? 0 });
			}

			await waitFrames(doc, 2);
		});
		return { ...snapshot(), scenario: name };
	}

	const api: PerfProbeApi = {
		count,
		measure,
		measureAsync,
		reset,
		snapshot,
		run,
	};

	function installGlobal(target: { __vaultmanPerfProbe?: unknown }): () => void {
		const hadPrevious = Object.prototype.hasOwnProperty.call(target, '__vaultmanPerfProbe');
		const previous = target.__vaultmanPerfProbe;
		target.__vaultmanPerfProbe = api;
		setActivePerfProbe(api);

		return () => {
			if (activePerfProbe === api) {
				clearActivePerfProbe();
			}
			if (hadPrevious) {
				target.__vaultmanPerfProbe = previous;
				return;
			}
			delete target.__vaultmanPerfProbe;
		};
	}

	return {
		api,
		count,
		measure,
		reset,
		snapshot,
		installGlobal,
	};
}
