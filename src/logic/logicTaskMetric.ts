/** The two user-facing presentations of a task cell. */
export type TaskCellDisplayMode = 'pending' | 'done-total';

export const DEFAULT_TASK_CELL_DISPLAY_MODE: TaskCellDisplayMode = 'done-total';

export interface TaskMetricInput {
	completed: number;
	total: number;
}

export interface ResolvedTaskMetric {
	completed: number;
	total: number;
	pending: number;
}

function finiteNonNegative(value: number): number | null {
	return Number.isFinite(value) && value >= 0 ? Math.floor(value) : null;
}

/** Resolve cache/task payloads into one canonical metric. */
export function resolveTaskMetric(
	input: TaskMetricInput,
): ResolvedTaskMetric | null {
	const completed = finiteNonNegative(input.completed);
	const total = finiteNonNegative(input.total);
	if (completed === null || total === null || completed > total) return null;
	return { completed, total, pending: total - completed };
}

/** The grouping metric is always pending, regardless of cell presentation. */
export function resolveTaskGroupingMetric(
	input: TaskMetricInput | number | string | null | undefined,
): number | null {
	if (typeof input === 'number') return finiteNonNegative(input);
	if (typeof input === 'string') {
		if (/^\d+$/.test(input.trim())) return finiteNonNegative(Number(input.trim()));
		const match = /^(\d+)\/(\d+)$/.exec(input.trim());
		if (!match) return null;
		return resolveTaskMetric({ completed: Number(match[1]), total: Number(match[2]) })?.pending ?? null;
	}
	if (!input) return null;
	return resolveTaskMetric(input)?.pending ?? null;
}

/** Render the cell without changing the grouping metric. */
export function resolveTaskCellText(
	input: TaskMetricInput,
	mode: TaskCellDisplayMode = DEFAULT_TASK_CELL_DISPLAY_MODE,
): string | null {
	const metric = resolveTaskMetric(input);
	if (!metric) return null;
	return mode === 'pending'
		? String(metric.pending)
		: `${metric.completed}/${metric.total}`;
}

export function normalizeTaskCellDisplayMode(
	value: unknown,
): TaskCellDisplayMode {
	return value === 'pending' ? 'pending' : DEFAULT_TASK_CELL_DISPLAY_MODE;
}

/**
 * Read legacy settings without making the UI know about migration details.
 * `undefined` means the pre-toggle default (done/total), while an explicit
 * pending/display value is accepted for settings written by early builds.
 */
export function migrateTaskCellDisplayMode(
	value: unknown,
): TaskCellDisplayMode {
	if (value === 'pending' || value === 'done-total') return value;
	if (typeof value === 'object' && value !== null) {
		const raw = value as { taskCellMode?: unknown; tasksMode?: unknown };
		return normalizeTaskCellDisplayMode(raw.taskCellMode ?? raw.tasksMode);
	}
	return DEFAULT_TASK_CELL_DISPLAY_MODE;
}

// Short aliases keep the resolver easy to discover at call sites.
export const pendingTasks = resolveTaskGroupingMetric;
export const taskGroupingMetric = resolveTaskGroupingMetric;
