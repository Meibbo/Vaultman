/** Scrub-intent thresholds (D25): a quick tap must jump without deforming
 * the rail; deformation engages on press-hold or deliberate movement. */
export const NIAGARA_ENGAGE_HOLD_MS = 450;
export const NIAGARA_ENGAGE_MOVE_PX = 8;

export interface NiagaraNodeTransform {
	scale: number;
	perpendicular: number;
	spread: number;
}

export type NiagaraTrackTargetKind = 'action' | 'group';

export type NiagaraActionId = 'close' | 'toggle-kind' | 'drill' | 'back';

export interface NiagaraActionAvailability {
	kindToggle: boolean;
	drill: boolean;
	scoped: boolean;
}

export type NiagaraTrackTarget =
	| { kind: 'action'; actionIndex: number }
	| { kind: 'group'; groupIndex: number };

export function niagaraActionOrder({
	kindToggle,
	drill,
	scoped,
}: NiagaraActionAvailability): NiagaraActionId[] {
	const actions: NiagaraActionId[] = ['close'];
	if (kindToggle) actions.push('toggle-kind');
	if (drill) actions.push('drill');
	if (scoped) actions.push('back');
	return actions;
}

export function niagaraSigma(nodeCount: number): number {
	const safeNodeCount = Number.isFinite(nodeCount) ? Math.max(1, nodeCount) : 1;
	return Math.min(7, Math.max(3, safeNodeCount * 0.28));
}

export function niagaraGaussian(distance: number, sigma: number): number {
	if (!Number.isFinite(distance) || !Number.isFinite(sigma) || sigma <= 0)
		return 0;
	return Math.exp(-(distance * distance) / (2 * sigma * sigma));
}

export function niagaraNodeTransform(
	distance: number,
	nodeCount: number,
	direction: number,
	perpendicularPull: number,
): NiagaraNodeTransform {
	const gaussian = niagaraGaussian(distance, niagaraSigma(nodeCount));
	return {
		scale: 1 + 0.5 * gaussian,
		perpendicular: direction * Math.max(0, perpendicularPull) * gaussian,
		spread: 7 * Math.tanh(distance / 1.5) * gaussian,
	};
}

export function niagaraTrackShift(
	pointerPosition: number,
	firstNodeCenter: number,
	lastNodeCenter: number,
	currentShift = 0,
): number {
	if (
		!Number.isFinite(pointerPosition) ||
		!Number.isFinite(firstNodeCenter) ||
		!Number.isFinite(lastNodeCenter) ||
		!Number.isFinite(currentShift)
	) {
		return 0;
	}

	const start = Math.min(firstNodeCenter, lastNodeCenter) + currentShift;
	const end = Math.max(firstNodeCenter, lastNodeCenter) + currentShift;
	if (pointerPosition < start) return currentShift + pointerPosition - start;
	if (pointerPosition > end) return currentShift + pointerPosition - end;
	return currentShift;
}

/** Clamp the perpendicular overdrive so the rail body never leaves the
 * frame (D41 case 1 — the proto bounded this implicitly via its preview
 * monitor frame; the port must bound it explicitly). */
export function niagaraClampOverdrive(over: number, room: number): number {
	if (!Number.isFinite(over) || !Number.isFinite(room)) return 0;
	return Math.max(0, Math.min(over, Math.max(0, room)));
}

/** Clamp an along-axis shift to the room left inside the frame
 * (D41 case 2 — mirror of the proto's `room` cap). */
export function niagaraClampShiftToRoom(
	shift: number,
	minShift: number,
	maxShift: number,
): number {
	if (
		!Number.isFinite(shift) ||
		!Number.isFinite(minShift) ||
		!Number.isFinite(maxShift)
	) {
		return 0;
	}
	const lo = Math.min(minShift, maxShift);
	const hi = Math.max(minShift, maxShift);
	return Math.min(hi, Math.max(lo, shift));
}

export function niagaraClampToFrame(
	pointerPosition: number,
	frameStart: number,
	frameEnd: number,
): number {
	if (
		!Number.isFinite(pointerPosition) ||
		!Number.isFinite(frameStart) ||
		!Number.isFinite(frameEnd)
	) {
		return 0;
	}
	const start = Math.min(frameStart, frameEnd);
	const end = Math.max(frameStart, frameEnd);
	return Math.max(start, Math.min(pointerPosition, end));
}

export function niagaraTrackTarget(
	trackIndex: number,
	actionCount: number,
	groupCount: number,
): NiagaraTrackTarget | null {
	if (!Number.isInteger(trackIndex) || trackIndex < 0) return null;
	const safeActionCount = Number.isFinite(actionCount)
		? Math.max(0, Math.floor(actionCount))
		: 0;
	const safeGroupCount = Number.isFinite(groupCount)
		? Math.max(0, Math.floor(groupCount))
		: 0;
	if (trackIndex < safeActionCount) {
		return { kind: 'action', actionIndex: trackIndex };
	}
	const groupIndex = trackIndex - safeActionCount;
	return groupIndex < safeGroupCount ? { kind: 'group', groupIndex } : null;
}

export function shouldSuppressNiagaraClick(
	gestureMoved: boolean,
	engaged: boolean,
	downTargetKind: NiagaraTrackTargetKind | null,
): boolean {
	return gestureMoved || engaged || downTargetKind === 'group';
}
