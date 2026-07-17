export const LONG_PRESS_DELAY_MS = 500;
export const LONG_PRESS_MOVE_TOLERANCE_PX = 8;
const ACTIVATION_SUPPRESSION_MS = 600;

export interface LongPressPointerPosition {
	pointerId: number;
	clientX: number;
	clientY: number;
}

export interface LongPressPointerStart extends LongPressPointerPosition {
	button: number;
	isPrimary: boolean;
}

export interface LongPressScheduler {
	setTimeout(callback: () => void, delayMs: number): number;
	clearTimeout(id: number): void;
	now(): number;
}

const browserScheduler: LongPressScheduler = {
	setTimeout: (callback, delayMs) => window.setTimeout(callback, delayMs),
	clearTimeout: (id) => window.clearTimeout(id),
	now: () => Date.now(),
};

/**
 * Small pointer recognizer shared by virtualized row renderers. It owns only one
 * active pointer, cancels on travel, and suppresses the synthetic click/context
 * activation that browsers dispatch after a completed long press.
 */
export class LongPressGesture {
	private timerId: number | null = null;
	private pointerId: number | null = null;
	private originX = 0;
	private originY = 0;
	private suppressActivationUntil = 0;
	private readonly scheduler: LongPressScheduler;
	private readonly delayMs: number;
	private readonly moveTolerancePx: number;

	constructor(
		scheduler: LongPressScheduler = browserScheduler,
		delayMs = LONG_PRESS_DELAY_MS,
		moveTolerancePx = LONG_PRESS_MOVE_TOLERANCE_PX,
	) {
		this.scheduler = scheduler;
		this.delayMs = delayMs;
		this.moveTolerancePx = moveTolerancePx;
	}

	start(input: LongPressPointerStart, onLongPress: () => void): boolean {
		this.cancelPending();
		this.pointerId = null;
		if (input.button !== 0 || !input.isPrimary) return false;

		this.pointerId = input.pointerId;
		this.originX = input.clientX;
		this.originY = input.clientY;
		this.timerId = this.scheduler.setTimeout(() => {
			this.timerId = null;
			if (this.pointerId !== input.pointerId) return;
			this.suppressActivationUntil =
				this.scheduler.now() + ACTIVATION_SUPPRESSION_MS;
			onLongPress();
		}, this.delayMs);
		return true;
	}

	move(input: LongPressPointerPosition): void {
		if (input.pointerId !== this.pointerId || this.timerId === null) return;
		const travelled = Math.hypot(
			input.clientX - this.originX,
			input.clientY - this.originY,
		);
		if (travelled > this.moveTolerancePx) this.cancel();
	}

	end(pointerId: number): void {
		if (pointerId === this.pointerId) this.cancel();
	}

	cancel(): void {
		this.cancelPending();
		this.pointerId = null;
	}

	isActivationSuppressed(): boolean {
		return this.scheduler.now() < this.suppressActivationUntil;
	}

	isTrackingPointer(): boolean {
		return this.pointerId !== null;
	}

	private cancelPending(): void {
		if (this.timerId === null) return;
		this.scheduler.clearTimeout(this.timerId);
		this.timerId = null;
	}
}

const LONG_PRESS_IGNORED_TARGETS =
	'input, textarea, select, [contenteditable="true"], .vaultman-badge';

/** Replace pointer handlers on a recycled row without accumulating listeners. */
export function bindLongPressGesture(
	element: HTMLElement,
	gesture: LongPressGesture,
	onLongPress?: () => void,
): void {
	element.onpointerdown = (event) => {
		const target = event.target as Element | null;
		if (!onLongPress || target?.closest?.(LONG_PRESS_IGNORED_TARGETS)) {
			gesture.cancel();
			return;
		}
		gesture.start(event, onLongPress);
	};
	element.onpointermove = (event) => gesture.move(event);
	element.onpointerup = (event) => gesture.end(event.pointerId);
	element.onpointercancel = (event) => gesture.end(event.pointerId);
	element.onpointerleave = (event) => gesture.end(event.pointerId);
}
