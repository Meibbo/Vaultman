import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const scss = readFileSync(resolve('src/styles/_elastic.scss'), 'utf8');

describe('_elastic.scss variable downgrade', () => {
	it('declares --vm-accent that maps to var(--text-accent)', () => {
		expect(scss).toMatch(/--vm-accent\s*:\s*var\(--text-accent\)/);
	});

	it('downgrades --vm-accent to var(--text-faint) when .vm-faint is set', () => {
		expect(scss).toMatch(/\.vm-faint[\s\S]*--vm-accent\s*:\s*var\(--text-faint\)/);
	});

	it('sets --vm-transition to 0ms when .vm-reduced-motion is set', () => {
		expect(scss).toMatch(/\.vm-reduced-motion[\s\S]*--vm-transition\s*:\s*0ms/);
	});

	it('declares the identity-scoped accent table', () => {
		expect(scss).toMatch(/\.vm-id-native/);
		expect(scss).toMatch(/\.vm-id-bases/);
		expect(scss).toMatch(/\.vm-id-outline/);
		expect(scss).toMatch(/\.vm-id-bookmarks/);
	});

	it('marks foul-detected nodes', () => {
		expect(scss).toMatch(/\.vm-foul-detect.*data-vm-foul/);
	});
});
