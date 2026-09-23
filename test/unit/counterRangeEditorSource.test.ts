import { describe, expect, it } from 'vitest';
import viewTreeSource from '../../src/components/layout/viewTree.ts?raw';

describe('U130 — counter range header editor', () => {
	it('renders two numeric inputs around an immutable separator', () => {
		expect(viewTreeSource).toContain('beginCounterRangeEdit(id: string)');
		expect(viewTreeSource).toContain('this._editingCounterRangeId === node.id');
		expect(viewTreeSource).toContain("cls: 'vaultman-counter-range-editor'");
		expect(viewTreeSource).toContain("type: 'number'");
		expect(viewTreeSource).toContain(
			"cls: 'vaultman-counter-range-separator', text: '–'",
		);
		expect(viewTreeSource).not.toContain(
			"createInput('–'",
		);
		expect(viewTreeSource).toContain("min: String(domain?.min ?? 0)");
		expect(viewTreeSource).toContain("max: String(domain.max)");
	});

	it('commits on Enter/blur, cancels on Escape and ignores IME composition', () => {
		expect(viewTreeSource).toContain('if (event.isComposing) return;');
		expect(viewTreeSource).toMatch(/if \(event\.key === 'Enter'\)[\s\S]*?commit\(\);/);
		expect(viewTreeSource).toMatch(/if \(event\.key === 'Escape'\)[\s\S]*?cancel\(\);/);
		expect(viewTreeSource).toContain("editor.addEventListener('focusout'");
	});
});
