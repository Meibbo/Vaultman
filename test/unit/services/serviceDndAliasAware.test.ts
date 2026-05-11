import { describe, expect, it } from 'vitest';
import {
	formatDropPayload,
	resolveDropEffect,
} from '../../../src/services/serviceDndAliasAware';

describe('serviceDndAliasAware', () => {
	it('plain drag of a file into editor inserts [[link]]', () => {
		const text = formatDropPayload({
			source: { kind: 'file', label: 'Note A' },
			modifiers: { alt: false, shift: false, ctrl: false, meta: false },
		});
		expect(text).toBe('[[Note A]]');
	});

	it('Shift+drag of a file inserts ![[embed]]', () => {
		const text = formatDropPayload({
			source: { kind: 'file', label: 'Note A' },
			modifiers: { alt: false, shift: true, ctrl: false, meta: false },
		});
		expect(text).toBe('![[Note A]]');
	});

	it('drag of a tag inserts #tag', () => {
		const text = formatDropPayload({
			source: { kind: 'tag', label: 'projects' },
			modifiers: { alt: false, shift: false, ctrl: false, meta: false },
		});
		expect(text).toBe('#projects');
	});

	it('drag of a snippet inserts $name', () => {
		const text = formatDropPayload({
			source: { kind: 'snippet', label: 'mytheme.css' },
			modifiers: { alt: false, shift: false, ctrl: false, meta: false },
		});
		expect(text).toBe('$mytheme');
	});

	it('drag of a plugin inserts %id', () => {
		const text = formatDropPayload({
			source: { kind: 'plugin', label: 'vaultman' },
			modifiers: { alt: false, shift: false, ctrl: false, meta: false },
		});
		expect(text).toBe('%vaultman');
	});

	it('property drop on note resolves to inject-frontmatter', () => {
		const effect = resolveDropEffect({
			source: { kind: 'property', label: '[priority]' },
			target: { kind: 'note', path: 'X.md' },
		});
		expect(effect.kind).toBe('inject-frontmatter');
		if (effect.kind === 'inject-frontmatter') {
			expect(effect.property).toBe('priority');
			expect(effect.targetPath).toBe('X.md');
		}
	});

	it('adopted-block drop on note resolves to move-block', () => {
		const effect = resolveDropEffect({
			source: {
				kind: 'adopted-block',
				label: '^ref',
				parentPath: 'A.md',
				blockId: 'ref',
			},
			target: { kind: 'note', path: 'B.md' },
		});
		expect(effect.kind).toBe('move-block');
		if (effect.kind === 'move-block') {
			expect(effect.fromPath).toBe('A.md');
			expect(effect.toPath).toBe('B.md');
			expect(effect.blockId).toBe('ref');
		}
	});

	it('file drop on editor resolves to insert-text', () => {
		const effect = resolveDropEffect({
			source: { kind: 'file', label: 'Note' },
			target: { kind: 'editor' },
		});
		expect(effect.kind).toBe('insert-text');
		if (effect.kind === 'insert-text') {
			expect(effect.text).toBe('[[Note]]');
		}
	});
});
