/**
 * Spec 08 §4: the "Want to hide this preset?" row. Clicking a row arms it
 * (its content becomes hide / delete / cancel); with no answer for
 * `timeoutMs` it disarms itself. Pure: the timer is injected so tests and
 * popout windows control it.
 */
export interface ConfirmRowTimer {
	set(callback: () => void, ms: number): unknown;
	clear(handle: unknown): void;
}

export const CONFIRM_ROW_TIMEOUT_MS = 4000;

export interface ConfirmRow {
	/** The row currently asking, or null. */
	armedId(): string | null;
	/** Arm `id`; arming the armed row keeps it armed and restarts the clock. */
	arm(id: string): void;
	disarm(): void;
}

export function createConfirmRow(
	timer: ConfirmRowTimer,
	onChange: (armedId: string | null) => void,
	timeoutMs = CONFIRM_ROW_TIMEOUT_MS,
): ConfirmRow {
	let armed: string | null = null;
	let handle: unknown = null;
	const stop = () => {
		if (handle !== null) timer.clear(handle);
		handle = null;
	};
	const disarm = () => {
		stop();
		if (armed === null) return;
		armed = null;
		onChange(null);
	};
	return {
		armedId: () => armed,
		arm(id) {
			stop();
			const changed = armed !== id;
			armed = id;
			handle = timer.set(disarm, timeoutMs);
			if (changed) onChange(id);
		},
		disarm,
	};
}
