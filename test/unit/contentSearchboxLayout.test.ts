import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import tabContentSource from '../../src/components/pages/tabContent.svelte?raw';

/**
 * U130 A19: the Text explorer's find/replace boxes must not shift on the
 * first keystroke, and caret + underline must own the whole width. The
 * stylesheet is the contract: one padding for the input regardless of
 * emptiness, the underline from edge to edge, the glyph inside the
 * placeholder overlay rather than a gutter of its own. Reads the compiled
 * sheet, so run `pnpm run build:styles` first.
 */
const styles = readFileSync(new URL('../../styles.css', import.meta.url), 'utf8');

function rule(selector: string): string {
	const at = styles.indexOf(`${selector} {`);
	expect(at, `rule ${selector}`).toBeGreaterThan(-1);
	return styles.slice(at, styles.indexOf('}', at));
}

describe('A19 content searchbox: zero layout shift, full-width caret and underline', () => {
	it('the input padding does not depend on :placeholder-shown', () => {
		const inset = rule('.vaultman-content-search-container').match(
			/--vaultman-content-input-inset:\s*([^;]+);/,
		)?.[1];
		expect(inset).toBeTruthy();
		// The old gutter switch: a :has(:not(:placeholder-shown)) rule that
		// rewrote the padding variable. Its absence is the whole fix.
		expect(styles).not.toMatch(
			/\.vaultman-content-search-container:has\([^)]*:not\(:placeholder-shown\)[^{]*\{\s*--vaultman-content-input-(gutter|inset)/,
		);
		expect(styles).not.toContain('--vaultman-content-input-gutter');
		expect(rule('.vaultman-content-search-container .vaultman-content-input')).toContain(
			'padding-inline-start: var(--vaultman-content-input-inset)',
		);
	});

	it('the underline spans the whole box, empty or not', () => {
		const after = rule('.vaultman-content-search-container::after');
		expect(after).toContain('inset-inline-start: 0');
		expect(after).toContain('inset-inline-end: 0');
	});

	it('the glyph lives inside the placeholder overlay, not in a gutter of its own', () => {
		const icon = rule('.vaultman-content-input-icon');
		expect(icon).not.toContain('position: absolute');
		const overlay = rule('.vaultman-content-input-placeholder');
		expect(overlay).toContain('pointer-events: none');
		expect(overlay).toContain('inset-inline-start: var(--vaultman-content-input-inset)');
		// The overlay hides with the text, in place of the old icon fade.
		expect(styles).toMatch(
			/\.vaultman-content-search-container:has\([^)]*:not\(:placeholder-shown\)\)\s*\.vaultman-content-input-placeholder\s*\{\s*display:\s*none/,
		);
	});

	it('both inputs keep a blank native placeholder and carry the text in the overlay', () => {
		const inputs = tabContentSource.match(/class="vaultman-search-input vaultman-content-input"[\s\S]*?\/>/g) ?? [];
		expect(inputs).toHaveLength(2);
		for (const input of inputs) {
			expect(input).toContain('placeholder=" "');
			expect(input).toMatch(/aria-label=\{translate\('content\.(find|replace)_placeholder'\)\}/);
		}
		expect(tabContentSource.match(/vaultman-content-input-placeholder-text/g)).toHaveLength(2);
	});
});
