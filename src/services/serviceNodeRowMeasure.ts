import type { TextMeasureService, TextMeasureStyle } from './serviceTextMeasure';

export interface NodeRowMeasureInput {
	id: string;
	text: string;
	width: number;
	minHeight: number;
	paddingBlock: number;
	style: TextMeasureStyle;
	revision: string;
}

export class NodeRowMeasureService {
	private cache = new Map<string, number>();

	constructor(private readonly text: TextMeasureService) {}

	measure(input: NodeRowMeasureInput): number {
		const width = Math.max(1, Math.round(input.width));
		const key = [
			input.revision,
			input.id,
			width,
			input.text,
			input.style.font,
			input.style.lineHeight,
			input.style.letterSpacing ?? 0,
			input.style.whiteSpace ?? 'normal',
			input.style.wordBreak ?? 'normal',
		].join('\u0001');
		const cached = this.cache.get(key);
		if (cached !== undefined) return cached;
		const measured = this.text.measure(input.text, input.style, width);
		const height = Math.max(input.minHeight, measured.height + input.paddingBlock);
		this.cache.set(key, height);
		return height;
	}

	clear(): void {
		this.cache.clear();
		this.text.clear();
	}
}
