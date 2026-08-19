import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const stylesSource = readFileSync(
	new URL('../../styles.css', import.meta.url),
	'utf8',
).replace(/\r\n/g, '\n');

describe('toolbar peek CSS source guards', () => {
	it('paints an opaque environment background on the peeking navbar', () => {
		const peekBlock =
			stylesSource.match(
				/\.vaultman-toolbar-slot\.is-hidden-mode\.is-peeking \.vaultman-navbar-filters\s*\{[\s\S]*?\n\}/,
			)?.[0] ?? '';

		expect(peekBlock).toContain('background-color: var(--background-secondary)');
	});

	it('switches the peeking navbar background to primary in the main area', () => {
		const mainAreaBlock =
			stylesSource.match(
				/\.workspace-split\.mod-root\s+\.vaultman-toolbar-slot\.is-hidden-mode\.is-peeking\s+\.vaultman-navbar-filters\s*\{[\s\S]*?\n\}/,
			)?.[0] ?? '';

		expect(mainAreaBlock).toContain('background-color: var(--background-primary)');
	});

	it('paints a background on hovered toolbar nodes while peeking', () => {
		const peekHoverBlock =
			stylesSource.match(
				/\.vaultman-toolbar-slot\.is-hidden-mode\.is-peeking [\s\S]*?\.vaultman-nav-page-icon:hover\s*\{[\s\S]*?\n\}/,
			)?.[0] ?? '';

		expect(peekHoverBlock).toMatch(/background(?:-color)?\s*:/);
	});
});
