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
): number {
	if (
		!Number.isFinite(pointerPosition) ||
		!Number.isFinite(firstNodeCenter) ||
		!Number.isFinite(lastNodeCenter)
	) {
		return 0;
	}

	const start = Math.min(firstNodeCenter, lastNodeCenter);
	const end = Math.max(firstNodeCenter, lastNodeCenter);
	if (pointerPosition < start) return pointerPosition - start;
	if (pointerPosition > end) return pointerPosition - end;
	return 0;
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
