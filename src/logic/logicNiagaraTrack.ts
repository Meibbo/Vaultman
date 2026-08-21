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

/**
 * U121-082: how far the bell reaches, in nodes.
 *
 * It used to widen with the list up to 7, and at that width the TENTH
 * neighbour still carried 36% of the peak -- `exp(-10²/(2·7²))` -- so a long
 * index moved almost as one piece. Capped at 3.2 the tenth node keeps 0.8%
 * (`exp(-10²/(2·3.2²))`), which reads as untouched, while the nodes beside the
 * epicentre keep their curve. Narrower AND taller is what makes the nudge read
 * as a nudge; the height lives in `NIAGARA_PULL_GAIN`.
 */
export function niagaraSigma(nodeCount: number): number {
	const safeNodeCount = Number.isFinite(nodeCount) ? Math.max(1, nodeCount) : 1;
	return Math.min(3.2, Math.max(3, safeNodeCount * 0.28));
}

export function niagaraGaussian(distance: number, sigma: number): number {
	if (!Number.isFinite(distance) || !Number.isFinite(sigma) || sigma <= 0)
		return 0;
	return Math.exp(-(distance * distance) / (2 * sigma * sigma));
}

/**
 * U121-082: the held node travels twice the separation it used to.
 *
 * The gain belongs here and not inside `niagaraPullSplit`, whose cap decides
 * how much of the raw gesture becomes bell versus rail-body -- a different
 * question. `spread` is untouched on purpose: it is zero at the epicentre, so
 * the horizontal component widens the curve without moving the held node
 * closer to or further from the finger.
 */
const NIAGARA_PULL_GAIN = 2;

export function niagaraNodeTransform(
	distance: number,
	nodeCount: number,
	direction: number,
	perpendicularPull: number,
): NiagaraNodeTransform {
	const gaussian = niagaraGaussian(distance, niagaraSigma(nodeCount));
	return {
		scale: 1 + 0.5 * gaussian,
		perpendicular:
			direction * Math.max(0, perpendicularPull) * NIAGARA_PULL_GAIN * gaussian,
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

/** Far-side wall for the perpendicular rail displacement (BT4-017/D44).
 * Derived from proto-v13's frame-room idiom (explorer.jsx L165-167:
 * `want = max(0, min(raw, room))` with the 8px frame inset); v13 itself
 * bounds `perpOver` only via its demo monitor frame, so the plugin must
 * clamp it explicitly against the real host. */
export function niagaraClampOverdrive(over: number, room: number): number {
	if (!Number.isFinite(over) || !Number.isFinite(room)) return 0;
	return Math.max(0, Math.min(over, Math.max(0, room)));
}

/** Split the raw perpendicular pull into bell amplitude and rail-body
 * displacement (D45 stretch): displacement mode keeps the proto split
 * (bell up to `cap`, excess drags the body, walled by `room`); stretch
 * mode anchors the body and lets the bell absorb the excess up to the
 * same wall — the viscous/plasticine feel. */
export function niagaraPullSplit(
	raw: number,
	cap: number,
	room: number,
	stretch: boolean,
): { pull: number; over: number } {
	const safeRaw =
		Number.isFinite(raw) && raw > 0 ? raw : 0;
	const safeCap = Number.isFinite(cap) && cap > 0 ? cap : 0;
	const excess = niagaraClampOverdrive(safeRaw - safeCap, room);
	if (stretch) return { pull: Math.min(safeRaw, safeCap + excess), over: 0 };
	return { pull: Math.min(safeRaw, safeCap), over: excess };
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
