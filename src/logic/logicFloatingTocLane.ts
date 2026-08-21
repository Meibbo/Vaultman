export type FloatingTocPosition = 'right' | 'left' | 'top' | 'bottom';

export interface FloatingTocLaneInput {
	visible: boolean;
	position: FloatingTocPosition;
	hideScrollbar: boolean;
	reserveLane: boolean;
	plainStyle: boolean;
	stickyActions?: boolean;
	mobile: boolean;
}

export interface FloatingTocLaneLayout {
	hideScrollbar: boolean;
	gutterPosition: 'right' | 'left' | null;
	reserveExplicitLane: boolean;
	contentGutterPx: number;
	railScrollbarOffsetPx: number;
}

function railFootprintPx(plainStyle: boolean, mobile: boolean): number {
	if (mobile) return plainStyle ? 28 : 30;
	return plainStyle ? 20 : 22;
}

export function resolveFloatingTocLaneLayout(
	input: FloatingTocLaneInput,
): FloatingTocLaneLayout {
	if (!input.visible) {
		return {
			hideScrollbar: false,
			gutterPosition: null,
			reserveExplicitLane: false,
			contentGutterPx: 0,
			railScrollbarOffsetPx: 0,
		};
	}

	const verticalPosition: 'right' | 'left' | null =
		input.position === 'right' || input.position === 'left'
			? input.position
			: null;
	const hideScrollbar = input.hideScrollbar;
	const gutterPosition =
		verticalPosition !== null && (hideScrollbar || input.reserveLane)
			? verticalPosition
			: null;
	const reserveExplicitLane =
		gutterPosition !== null && input.reserveLane && !hideScrollbar;

	return {
		hideScrollbar,
		gutterPosition,
		reserveExplicitLane,
		contentGutterPx:
			gutterPosition === null
				? 0
				: railFootprintPx(input.plainStyle, input.mobile),
		railScrollbarOffsetPx:
			reserveExplicitLane && input.position === 'right' ? 14 : 0,
	};
}
