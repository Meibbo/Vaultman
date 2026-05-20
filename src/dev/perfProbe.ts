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
	'explorer-scroll-burst-live',
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
export type PerfScrollBurstView = 'auto' | 'tree' | 'list' | 'table' | 'grid' | 'cards';
export type PerfScrollBurstPattern = 'jump' | 'smooth' | 'monitor';

export interface PerfScenarioOptions {
	query?: string;
	steps?: number;
	view?: PerfScrollBurstView;
	pattern?: PerfScrollBurstPattern;
	jumps?: number;
	scrollStepPx?: number;
	visualDelayMs?: number;
	overlay?: boolean;
	strictFlicker?: boolean;
}

export interface PerfScrollBurstSample {
	jumpIndex: number;
	targetRatio: number;
	scrollTop: number;
	scrollHeight: number;
	clientHeight: number;
	renderedRowCount: number;
	visibleRowCount: number;
	textPresent: boolean;
	viewportGapPx: number;
	blank: boolean;
	blankDurationMs: number;
	eventLoopDelayMs: number;
	flickerRowCount: number;
	flickerRows?: string[];
	firstRowId?: string;
	lastRowId?: string;
}

export interface PerfScrollBurstReport {
	requestedView: PerfScrollBurstView;
	view: Exclude<PerfScrollBurstView, 'auto'>;
	pattern: PerfScrollBurstPattern;
	jumpCount: number;
	samples: PerfScrollBurstSample[];
	blankFrameCount: number;
	blankWindowOver100ms: number;
	blankWindowOver250ms: number;
	maxBlankDurationMs: number;
	maxViewportGapPx: number;
	maxEventLoopDelayMs: number;
	longAnimationFrameCount: number;
	maxLongAnimationFrameMs: number;
	longTaskCount: number;
	maxLongTaskMs: number;
	strictFlicker: boolean;
	flickerFrameCount: number;
	maxFlickerRowCount: number;
	passed: boolean;
	reason?: string;
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
	scrollBurst?: PerfScrollBurstReport;
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
const LONG_FRAME_THRESHOLD_MS = 50;
const SCROLL_BURST_RATIOS = [0, 0.5, 1, 0.25, 0.75] as const;
const SCROLL_BURST_DEFAULT_JUMPS = 100;
const SCROLL_BURST_DEFAULT_VISUAL_DELAY_MS = 16;
const SCROLL_BURST_BLANK_FAIL_MS = 100;
const SCROLL_BURST_HARD_BLANK_FAIL_MS = 250;
const SCROLL_BURST_TARGET_WAIT_MS = 2_000;
const SCROLL_BURST_TARGET_POLL_MS = 16;
const SCROLL_BURST_FRAME_FALLBACK_MS = 50;
const SCROLL_BURST_STRICT_IDLE_MS = 128;
const SCROLL_BURST_DEFAULT_STEP_PX = 18;

interface ScrollBurstTarget {
	view: Exclude<PerfScrollBurstView, 'auto'>;
	element: HTMLElement;
	rowSelector: string;
	textSelector: string;
	flickerSelectors: Record<string, string>;
}

interface RowChildSignature {
	total: number;
	counts: Record<string, number>;
}

interface ScrollPerformanceObserverStats {
	longAnimationFrameCount: number;
	maxLongAnimationFrameMs: number;
	longTaskCount: number;
	maxLongTaskMs: number;
}

interface ScrollPerformanceObserverHandle {
	read(): ScrollPerformanceObserverStats;
	disconnect(): void;
}

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

async function waitForEventLoopSettled(
	doc: Document | undefined,
	clock: () => number,
	minTicks = 2,
): Promise<{ longFrameCount: number; maxLongFrameMs: number | undefined }> {
	const win = doc?.defaultView;
	let longFrameCount = 0;
	let maxLongFrameMs: number | undefined;
	let previous = clock();
	for (let i = 0; i < minTicks; i += 1) {
		if (!win?.setTimeout) await Promise.resolve();
		else await new Promise<void>((resolve) => win.setTimeout(resolve, 0));
		const now = clock();
		const elapsed = now - previous;
		if (elapsed > LONG_FRAME_THRESHOLD_MS) {
			longFrameCount += 1;
			maxLongFrameMs = Math.max(maxLongFrameMs ?? 0, elapsed);
		}
		previous = now;
	}
	return { longFrameCount, maxLongFrameMs };
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

function jumpScrollElement(element: HTMLElement, targetRatio = 1): void {
	const maxScroll = Math.max(0, element.scrollHeight - element.clientHeight);
	const ratio = Number.isFinite(targetRatio) ? Math.max(0, Math.min(1, targetRatio)) : 1;
	const target = maxScroll > 0 ? Math.round(maxScroll * ratio) : element.clientHeight || 32;
	element.scrollTop = target;
	element.dispatchEvent(new Event('scroll', { bubbles: true }));
}

function smoothScrollElement(
	element: HTMLElement,
	stepPx: number,
	direction: 1 | -1,
): 1 | -1 {
	const maxScroll = Math.max(0, element.scrollHeight - element.clientHeight);
	const boundedStep = Math.max(1, Math.round(Math.abs(stepPx)));
	let nextDirection = direction;
	if (element.scrollTop >= maxScroll) nextDirection = -1;
	if (element.scrollTop <= 0) nextDirection = 1;
	element.scrollTop = Math.max(0, Math.min(maxScroll, element.scrollTop + nextDirection * boundedStep));
	element.dispatchEvent(new Event('scroll', { bubbles: true }));
	if (element.scrollTop >= maxScroll) return -1;
	if (element.scrollTop <= 0) return 1;
	return nextDirection;
}

function delay(doc: Document | undefined, ms: number): Promise<void> {
	if (ms <= 0) return Promise.resolve();
	const win = doc?.defaultView;
	if (!win?.setTimeout) {
		return Promise.resolve();
	}
	return new Promise((resolve) => win.setTimeout(resolve, ms));
}

function documentIsHidden(doc: Document | undefined): boolean {
	const visibilityState = doc?.visibilityState as string | undefined;
	return doc?.hidden === true || visibilityState === 'hidden' || visibilityState === 'prerender';
}

function visualDelay(doc: Document | undefined, ms: number): Promise<void> {
	if (documentIsHidden(doc)) return Promise.resolve();
	return delay(doc, ms);
}

function normalizeScrollPattern(pattern: unknown): PerfScrollBurstPattern {
	if (pattern === 'smooth' || pattern === 'monitor') return pattern;
	return 'jump';
}

async function nextPaintAndTick(doc: Document | undefined): Promise<void> {
	if (documentIsHidden(doc)) {
		await Promise.resolve();
		await Promise.resolve();
		return;
	}
	const win = doc?.defaultView;
	if (win?.requestAnimationFrame) {
		await new Promise<void>((resolve) => {
			let settled = false;
			let timeoutId: number | undefined;
			const finish = () => {
				if (settled) return;
				settled = true;
				if (timeoutId !== undefined) win.clearTimeout(timeoutId);
				resolve();
			};
			timeoutId = win.setTimeout(finish, SCROLL_BURST_FRAME_FALLBACK_MS);
			win.requestAnimationFrame(() => finish());
		});
	} else if (win?.setTimeout) {
		await new Promise<void>((resolve) => win.setTimeout(resolve, 0));
	} else {
		await Promise.resolve();
	}

	if (win?.setTimeout) {
		await new Promise<void>((resolve) => win.setTimeout(resolve, 0));
	} else {
		await Promise.resolve();
	}
}

function scrollBurstTargets(doc: Document): ScrollBurstTarget[] {
	const target = (
		view: Exclude<PerfScrollBurstView, 'auto'>,
		selector: string,
		rowSelector: string,
		textSelector: string,
		flickerSelectors: Record<string, string>,
	): ScrollBurstTarget | null => {
		const element = doc.querySelector<HTMLElement>(selector);
		return element ? { view, element, rowSelector, textSelector, flickerSelectors } : null;
	};

	return [
		target(
			'tree',
			'.vm-tree-virtual-outer',
			'.vm-tree-virtual-row:not([data-sticky="true"])',
			'.vm-tree-label, .vm-tree-field, .vm-tree-count, .vm-tree-virtual-row',
			{
				icon: '.vm-tree-icon',
				label: '.vm-tree-label',
				field: '.vm-tree-field',
				count: '.vm-tree-count',
				badge: '.vm-tree-badge-zone .vm-badge, .vm-tree-overlay-badge-zone .vm-badge',
			},
		),
		target(
			'list',
			'.vm-view-list',
			'.vm-view-list-row[data-id], .vm-view-list-row',
			'.vm-view-list-label, .vm-view-list-detail, .vm-view-list-row',
			{
				icon: '.vm-view-list-icon',
				label: '.vm-view-list-label',
				detail: '.vm-view-list-detail',
				badge: '.vm-view-list-badges .vm-badge',
				action: '.vm-view-list-actions button',
			},
		),
		target(
			'table',
			'.vm-node-table',
			'.vm-node-table-row[data-id], .vm-node-table-row',
			'.vm-node-table-primary, .vm-node-table-cell, .vm-node-table-row',
			{
				icon: '.vm-node-table-icon',
				label: '.vm-node-table-primary',
				cell: '.vm-node-table-cell',
				badge: '.vm-node-table-badge-zone .vm-badge',
			},
		),
		target(
			'grid',
			'.vm-node-grid',
			'.vm-node-grid-tile[data-id], .vm-node-grid-row',
			'.vm-node-grid-label, .vm-node-grid-field, .vm-node-grid-tile',
			{
				icon: '.vm-node-grid-icon',
				label: '.vm-node-grid-label',
				field: '.vm-node-grid-field',
				badge: '.vm-node-grid-badge-zone .vm-badge, .vm-node-grid-hover-badge-zone .vm-badge',
				toggle: '.vm-node-grid-toggle',
			},
		),
		target(
			'cards',
			'.vm-node-cards',
			'.vm-node-card[data-id], .vm-node-card-row',
			'.vm-node-card-field, .vm-node-card',
			{
				cover: '.vm-node-card-cover',
				icon: '.vm-node-card-icon',
				field: '.vm-node-card-field',
				badge: '.vm-node-card-badge-zone .vm-badge',
			},
		),
	].filter((item): item is ScrollBurstTarget => item !== null);
}

function resolveScrollBurstTarget(
	doc: Document | undefined,
	requestedView: PerfScrollBurstView,
): ScrollBurstTarget | null {
	if (!doc) return null;
	const targets = scrollBurstTargets(doc);
	if (requestedView !== 'auto') {
		return targets.find((target) => target.view === requestedView) ?? null;
	}
	return (
		targets.find((target) => target.element.clientHeight > 0) ??
		targets.find((target) => target.element.scrollHeight > 0) ??
		targets[0] ??
		null
	);
}

async function waitForScrollBurstTarget(
	doc: Document | undefined,
	requestedView: PerfScrollBurstView,
	clock: () => number,
): Promise<ScrollBurstTarget | null> {
	if (!doc) return null;
	let target = resolveScrollBurstTarget(doc, requestedView);
	const deadline = clock() + SCROLL_BURST_TARGET_WAIT_MS;
	while (!target && clock() < deadline) {
		await delay(doc, SCROLL_BURST_TARGET_POLL_MS);
		target = resolveScrollBurstTarget(doc, requestedView);
	}
	return target;
}

function rowTextPresent(rows: readonly HTMLElement[], textSelector: string): boolean {
	return rows.some((row) => {
		const textTarget = row.matches(textSelector)
			? row
			: row.querySelector<HTMLElement>(textSelector);
		return Boolean(textTarget?.textContent?.trim());
	});
}

function hasMeasurableRect(rect: DOMRect): boolean {
	return (
		rect.width !== 0 ||
		rect.height !== 0 ||
		rect.top !== 0 ||
		rect.bottom !== 0 ||
		rect.left !== 0 ||
		rect.right !== 0
	);
}

function rowIntersectsViewport(row: HTMLElement, viewport: DOMRect): boolean {
	const rect = row.getBoundingClientRect();
	return rect.bottom > viewport.top + 1 && rect.top < viewport.bottom - 1;
}

function rowsInViewport(
	target: ScrollBurstTarget,
	rows: readonly HTMLElement[],
): readonly HTMLElement[] {
	if (rows.length === 0) return [];
	const viewport = target.element.getBoundingClientRect();
	const hasViewportGeometry =
		target.element.clientHeight > 0 || target.element.clientWidth > 0 || hasMeasurableRect(viewport);
	const hasRowGeometry = rows.some((row) => hasMeasurableRect(row.getBoundingClientRect()));
	if (!hasViewportGeometry || !hasRowGeometry) return rows;
	return rows.filter((row) => rowIntersectsViewport(row, viewport));
}

function viewportGapPx(target: ScrollBurstTarget, rows: readonly HTMLElement[]): number {
	const viewport = target.element.getBoundingClientRect();
	const hasViewportGeometry =
		target.element.clientHeight > 0 || target.element.clientWidth > 0 || hasMeasurableRect(viewport);
	const hasRowGeometry = rows.some((row) => hasMeasurableRect(row.getBoundingClientRect()));
	if (!hasViewportGeometry || !hasRowGeometry) return 0;
	const visibleRows = rowsInViewport(target, rows);
	if (visibleRows.length === 0) {
		return Math.max(0, target.element.clientHeight || viewport.height || 0);
	}
	const first = visibleRows[0].getBoundingClientRect();
	const last = visibleRows.at(-1)?.getBoundingClientRect() ?? first;
	return Math.max(0, first.top - viewport.top, viewport.bottom - last.bottom);
}

function createScrollPerformanceObserver(
	doc: Document | undefined,
): ScrollPerformanceObserverHandle {
	const win = doc?.defaultView;
	const PerformanceObserverCtor = win?.PerformanceObserver;
	const observers: PerformanceObserver[] = [];
	const stats: ScrollPerformanceObserverStats = {
		longAnimationFrameCount: 0,
		maxLongAnimationFrameMs: 0,
		longTaskCount: 0,
		maxLongTaskMs: 0,
	};
	const observe = (
		entryType: string,
		onEntry: (entry: PerformanceEntry) => void,
	): void => {
		if (!PerformanceObserverCtor) return;
		if (!PerformanceObserverCtor.supportedEntryTypes.includes(entryType)) return;
		try {
			const observer = new PerformanceObserverCtor((list) => {
				for (const entry of list.getEntries()) onEntry(entry);
			});
			observer.observe({ type: entryType, buffered: false });
			observers.push(observer);
		} catch {
			// Older Electron builds may advertise an entry type but reject it at observe time.
		}
	};

	observe('long-animation-frame', (entry) => {
		stats.longAnimationFrameCount += 1;
		stats.maxLongAnimationFrameMs = Math.max(stats.maxLongAnimationFrameMs, entry.duration);
	});
	observe('longtask', (entry) => {
		stats.longTaskCount += 1;
		stats.maxLongTaskMs = Math.max(stats.maxLongTaskMs, entry.duration);
	});

	return {
		read: () => ({ ...stats }),
		disconnect: () => observers.forEach((observer) => observer.disconnect()),
	};
}

function rowId(row: HTMLElement | undefined): string | undefined {
	return row?.dataset.id ?? row?.dataset.nodeId ?? row?.dataset.callbackId;
}

function rowChildSignatures(
	rows: readonly HTMLElement[],
	target: ScrollBurstTarget,
): Map<string, RowChildSignature> {
	const signatures = new Map<string, RowChildSignature>();
	rows.forEach((row, index) => {
		const id = rowId(row) ?? `row:${index}`;
		const counts: Record<string, number> = {};
		for (const [key, selector] of Object.entries(target.flickerSelectors)) {
			counts[key] = row.querySelectorAll(selector).length;
		}
		signatures.set(id, {
			total: Object.values(counts).reduce((sum, count) => sum + count, 0),
			counts,
		});
	});
	return signatures;
}

function flickeringRows(
	stable: ReadonlyMap<string, RowChildSignature>,
	active: ReadonlyMap<string, RowChildSignature>,
): string[] {
	const rows: string[] = [];
	for (const [id, expected] of stable) {
		if (expected.total === 0) continue;
		const actual = active.get(id);
		if (!actual) continue;
		const missing = Object.entries(expected.counts).find(
			([key, count]) => count > (actual.counts[key] ?? 0),
		);
		if (missing) rows.push(`${id}:${missing[0]}:${missing[1]}>${actual.counts[missing[0]] ?? 0}`);
	}
	return rows;
}

function upsertScrollSmokeOverlay(doc: Document, report: PerfScrollBurstReport): void {
	const overlay =
		doc.querySelector<HTMLElement>('.vm-scroll-smoke-overlay') ?? doc.createElement('div');
	if (!overlay.isConnected) {
		overlay.className = 'vm-scroll-smoke-overlay';
		overlay.setAttribute('role', 'status');
		doc.body.appendChild(overlay);
	}
	overlay.textContent = `Vaultman scroll smoke ${report.view}/${report.pattern}: ${
		report.passed ? 'PASS' : 'FAIL'
	} samples=${report.samples.length}/${report.jumpCount} blanks=${
		report.blankFrameCount
	} maxBlank=${Math.round(report.maxBlankDurationMs)}ms maxViewportGap=${Math.round(
		report.maxViewportGapPx,
	)}px maxDelay=${Math.round(report.maxEventLoopDelayMs)}ms LoAF=${
		report.longAnimationFrameCount
	}/${Math.round(report.maxLongAnimationFrameMs)}ms longtask=${report.longTaskCount}/${Math.round(
		report.maxLongTaskMs,
	)}ms flicker=${report.flickerFrameCount}`;
}

async function runExplorerScrollBurst(
	doc: Document | undefined,
	clock: () => number,
	options: PerfScenarioOptions,
): Promise<PerfScrollBurstReport> {
	const requestedView = options.view ?? 'auto';
	const target = await waitForScrollBurstTarget(doc, requestedView, clock);
	if (!doc || !target) {
		const view = requestedView === 'auto' ? 'tree' : requestedView;
		return {
			requestedView,
			view,
			pattern: normalizeScrollPattern(options.pattern),
			jumpCount: 0,
			samples: [],
			blankFrameCount: 1,
			blankWindowOver100ms: 1,
			blankWindowOver250ms: 1,
			maxBlankDurationMs: SCROLL_BURST_HARD_BLANK_FAIL_MS,
			maxViewportGapPx: 0,
			maxEventLoopDelayMs: 0,
			longAnimationFrameCount: 0,
			maxLongAnimationFrameMs: 0,
			longTaskCount: 0,
			maxLongTaskMs: 0,
			strictFlicker: options.strictFlicker === true,
			flickerFrameCount: 0,
			maxFlickerRowCount: 0,
			passed: false,
			reason: 'scroll target not found',
		};
	}

	const jumpCount = Math.max(1, Math.floor(options.jumps ?? SCROLL_BURST_DEFAULT_JUMPS));
	const pattern = normalizeScrollPattern(options.pattern);
	const scrollStepPx = Math.max(
		1,
		Math.floor(Math.abs(options.scrollStepPx ?? SCROLL_BURST_DEFAULT_STEP_PX)),
	);
	const visualDelayMs = Math.max(
		0,
		Math.floor(options.visualDelayMs ?? SCROLL_BURST_DEFAULT_VISUAL_DELAY_MS),
	);
	const samples: PerfScrollBurstSample[] = [];
	let blankStart: number | null = null;
	let maxEventLoopDelayMs = 0;
	let smoothDirection: 1 | -1 = 1;
	const strictFlicker = options.strictFlicker === true;
	const performanceObserver = strictFlicker ? null : createScrollPerformanceObserver(doc);

	for (let jumpIndex = 0; jumpIndex < jumpCount; jumpIndex += 1) {
		const ratio = SCROLL_BURST_RATIOS[jumpIndex % SCROLL_BURST_RATIOS.length];
		let stableSignatures: Map<string, RowChildSignature> | null = null;
		let before = clock();
		if (strictFlicker) {
			if (pattern === 'monitor') {
				// Monitor mode intentionally samples the viewport without synthetic scrolling.
			} else if (pattern === 'smooth') {
				smoothDirection = smoothScrollElement(target.element, scrollStepPx, smoothDirection);
			} else {
				jumpScrollElement(target.element, ratio);
			}
			await nextPaintAndTick(doc);
			await delay(doc, SCROLL_BURST_STRICT_IDLE_MS);
			await nextPaintAndTick(doc);
			stableSignatures = rowChildSignatures(
				[...target.element.querySelectorAll<HTMLElement>(target.rowSelector)],
				target,
			);
			before = clock();
			target.element.dispatchEvent(new Event('scroll', { bubbles: true }));
		} else {
			if (pattern === 'monitor') {
				// Monitor mode intentionally samples the viewport without synthetic scrolling.
			} else if (pattern === 'smooth') {
				smoothDirection = smoothScrollElement(target.element, scrollStepPx, smoothDirection);
			} else {
				jumpScrollElement(target.element, ratio);
			}
		}
		await nextPaintAndTick(doc);
		const after = clock();
		maxEventLoopDelayMs = Math.max(maxEventLoopDelayMs, after - before);

		const rows = [...target.element.querySelectorAll<HTMLElement>(target.rowSelector)];
		const visibleRows = rowsInViewport(target, rows);
		const visibleRowCount = visibleRows.length;
		const textPresent = rowTextPresent(visibleRows, target.textSelector);
		const visibleGapPx = viewportGapPx(target, rows);
		const blank = visibleRowCount === 0 || !textPresent;
		const flickerRows = stableSignatures
			? flickeringRows(stableSignatures, rowChildSignatures(rows, target))
			: [];
		if (blank && blankStart === null) blankStart = before;
		if (!blank) blankStart = null;
		const blankDurationMs = blank ? Math.max(0, after - (blankStart ?? before)) : 0;

		samples.push({
			jumpIndex,
			targetRatio: ratio,
			scrollTop: target.element.scrollTop,
			scrollHeight: target.element.scrollHeight,
			clientHeight: target.element.clientHeight,
			renderedRowCount: rows.length,
			visibleRowCount,
			textPresent,
			viewportGapPx: visibleGapPx,
			blank,
			blankDurationMs,
			eventLoopDelayMs: after - before,
			flickerRowCount: flickerRows.length,
			flickerRows: flickerRows.length > 0 ? flickerRows.slice(0, 12) : undefined,
			firstRowId: rowId(visibleRows[0]),
			lastRowId: rowId(visibleRows.at(-1)),
		});

		const partialReport = buildScrollBurstReport(
			requestedView,
			target.view,
			pattern,
			jumpCount,
			samples,
			strictFlicker,
			performanceObserver?.read(),
		);
		if (options.overlay !== false) upsertScrollSmokeOverlay(doc, partialReport);
		await visualDelay(doc, visualDelayMs);
	}

	const report = buildScrollBurstReport(
		requestedView,
		target.view,
		pattern,
		jumpCount,
		samples,
		strictFlicker,
		performanceObserver?.read(),
	);
	performanceObserver?.disconnect();
	report.maxEventLoopDelayMs = Math.max(report.maxEventLoopDelayMs, maxEventLoopDelayMs);
	if (options.overlay !== false) upsertScrollSmokeOverlay(doc, report);
	return report;
}

function buildScrollBurstReport(
	requestedView: PerfScrollBurstView,
	view: Exclude<PerfScrollBurstView, 'auto'>,
	pattern: PerfScrollBurstPattern,
	jumpCount: number,
	samples: readonly PerfScrollBurstSample[],
	strictFlicker = false,
	observerStats: ScrollPerformanceObserverStats = {
		longAnimationFrameCount: 0,
		maxLongAnimationFrameMs: 0,
		longTaskCount: 0,
		maxLongTaskMs: 0,
	},
): PerfScrollBurstReport {
	const blankFrameCount = samples.filter((sample) => sample.blank).length;
	const blankWindowOver100ms = samples.filter(
		(sample) => sample.blankDurationMs > SCROLL_BURST_BLANK_FAIL_MS,
	).length;
	const blankWindowOver250ms = samples.filter(
		(sample) => sample.blankDurationMs > SCROLL_BURST_HARD_BLANK_FAIL_MS,
	).length;
	const maxBlankDurationMs = Math.max(0, ...samples.map((sample) => sample.blankDurationMs));
	const maxViewportGapPx = Math.max(0, ...samples.map((sample) => sample.viewportGapPx));
	const maxEventLoopDelayMs = Math.max(0, ...samples.map((sample) => sample.eventLoopDelayMs));
	const flickerFrameCount = samples.filter((sample) => sample.flickerRowCount > 0).length;
	const maxFlickerRowCount = Math.max(0, ...samples.map((sample) => sample.flickerRowCount));
	return {
		requestedView,
		view,
		pattern,
		jumpCount,
		samples: [...samples],
		blankFrameCount,
		blankWindowOver100ms,
		blankWindowOver250ms,
		maxBlankDurationMs,
		maxViewportGapPx,
		maxEventLoopDelayMs,
		longAnimationFrameCount: observerStats.longAnimationFrameCount,
		maxLongAnimationFrameMs: observerStats.maxLongAnimationFrameMs,
		longTaskCount: observerStats.longTaskCount,
		maxLongTaskMs: observerStats.maxLongTaskMs,
		strictFlicker,
		flickerFrameCount,
		maxFlickerRowCount,
		passed:
			blankFrameCount === 0 &&
			blankWindowOver100ms === 0 &&
			blankWindowOver250ms === 0 &&
			(!strictFlicker || flickerFrameCount === 0),
	};
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
	let longFrameCount: number | undefined;
	let maxLongFrameMs: number | undefined;
	let scrollBurst: PerfScrollBurstReport | undefined;

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
		longFrameCount = undefined;
		maxLongFrameMs = undefined;
		scrollBurst = undefined;
	}

	function snapshot(): PerfProbeSnapshot {
		return {
			startedAt,
			endedAt: now(),
			counters,
			timings,
			longFrameCount,
			maxLongFrameMs,
			heapDeltaBytes: undefined,
			scrollBurst,
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
			} else if (name === 'tree-scroll') {
				const outer = doc?.querySelector<HTMLElement>('.vm-tree-virtual-outer');
				if (outer) scrollElement(outer, options.steps ?? 8);
			} else if (name === 'files-tree-10k-scroll-jump') {
				const outer = doc?.querySelector<HTMLElement>('.vm-tree-virtual-outer');
				if (outer) jumpScrollElement(outer);
			} else if (name === 'files-tree-50k-scroll-jump') {
				const outer = doc?.querySelector<HTMLElement>('.vm-tree-virtual-outer');
				if (outer) jumpScrollElement(outer);
			} else if (name === 'files-list-10k-scroll-jump') {
				const outer = doc?.querySelector<HTMLElement>('.vm-view-list');
				if (outer) jumpScrollElement(outer);
			} else if (name === 'explorer-scroll-burst-live') {
				scrollBurst = await runExplorerScrollBurst(doc, now, options);
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

			if (name !== 'explorer-scroll-burst-live') {
				const loop = await waitForEventLoopSettled(doc, now, 2);
				if (loop.longFrameCount > 0) {
					longFrameCount = (longFrameCount ?? 0) + loop.longFrameCount;
					maxLongFrameMs = Math.max(maxLongFrameMs ?? 0, loop.maxLongFrameMs ?? 0);
				}
			}
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
