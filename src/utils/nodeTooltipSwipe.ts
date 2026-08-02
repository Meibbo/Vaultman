import { setTooltip } from 'obsidian';
import { NodeSwipeRecognizer } from '../logic/logicNodeSwipe';

export function bindNodeTooltipSwipe(
	element: HTMLElement,
	getTooltipText: () => string,
): () => void {
	const recognizer = new NodeSwipeRecognizer();

	const handlePointerDown = (e: PointerEvent) => {
		if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
		recognizer.start(e.clientX, e.clientY, e.target as Element);
	};

	const handlePointerMove = (e: PointerEvent) => {
		if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return;
		const state = recognizer.move(e.clientX, e.clientY);
		if (state === 'recognized') {
			const text = getTooltipText();
			if (text) {
				setTooltip(element, text);
			}
		}
	};

	const handlePointerUp = () => {
		recognizer.cancel();
	};

	element.addEventListener('pointerdown', handlePointerDown);
	element.addEventListener('pointermove', handlePointerMove);
	element.addEventListener('pointerup', handlePointerUp);
	element.addEventListener('pointercancel', handlePointerUp);

	return () => {
		element.removeEventListener('pointerdown', handlePointerDown);
		element.removeEventListener('pointermove', handlePointerMove);
		element.removeEventListener('pointerup', handlePointerUp);
		element.removeEventListener('pointercancel', handlePointerUp);
	};
}
