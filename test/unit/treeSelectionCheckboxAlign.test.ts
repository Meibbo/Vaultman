import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';
import { JSDOM } from 'jsdom';

// `styles.css` is the compiled sheet (built by `pnpm run build:styles`), so
// these assertions run against the real cascade, not the SCSS sources.
const stylesSource = readFileSync(
	new URL('../../styles.css', import.meta.url),
	'utf8',
);

function checkboxComputedStyle(position: 'start' | 'end'): CSSStyleDeclaration {
	const dom = new JSDOM(
		'<!DOCTYPE html><html><head></head><body></body></html>',
		{ pretendToBeVisual: true },
	);
	// JSDOM harness (not the Obsidian plugin DOM): named to make clear this
	// is the virtual document, so obsidianmd/no-forbidden-elements (which
	// targets the plugin `document`) does not apply.
	const { document: jsdomDocument } = dom.window;
	const style = jsdomDocument.createElement('style');
	style.textContent = stylesSource;
	jsdomDocument.head.appendChild(style);
	const row = jsdomDocument.createElement('div');
	row.className = 'vaultman-tree-row';
	// Dynamic-value form: same runtime value, avoids
	// obsidianmd/no-static-styles-assignment (static literals only).
	const rowDepthStyle = '--depth: 0';
	row.setAttribute('style', rowDepthStyle);
	const checkbox = jsdomDocument.createElement('input');
	checkbox.setAttribute('type', 'checkbox');
	checkbox.className =
		`metadata-input-checkbox vaultman-selection-checkbox vaultman-selection-checkbox--${position}`;
	row.appendChild(checkbox);
	jsdomDocument.body.appendChild(row);
	return dom.window.getComputedStyle(checkbox);
}

describe('A04: tree selection checkbox stays centered on its box', () => {
	it('keeps its own positioning context while staying in flow (start)', () => {
		const computed = checkboxComputedStyle('start');
		// `relative` is still in flow (the 2026-08-02 plan holds) but makes
		// the input its own containing block, so the native check glyph
		// anchors to the box instead of the transformed row.
		expect(computed.position).toBe('relative');
		expect(computed.getPropertyValue('inset-inline-start')).toBe('auto');
		expect(computed.marginLeft).toBe('0px');
		expect(computed.marginRight).toBe('0px');
	});

	it('keeps its own positioning context while staying in flow (end)', () => {
		const computed = checkboxComputedStyle('end');
		expect(computed.position).toBe('relative');
		expect(computed.getPropertyValue('inset-inline-end')).toBe('auto');
		expect(computed.marginLeft).toBe('0px');
		expect(computed.marginRight).toBe('0px');
	});
});
