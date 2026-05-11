// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
	PortalFoulError,
	resolvePortalTarget,
} from '../../../src/services/servicePortalResolver';

describe('resolvePortalTarget', () => {
	it('returns the .vm-root inside the active document', () => {
		const doc = document.implementation.createHTMLDocument('w');
		const root = doc.createElement('div');
		root.classList.add('vm-root');
		doc.body.appendChild(root);
		const target = resolvePortalTarget({ activeDocument: doc });
		expect(target).toBe(root);
	});

	it('returns the body if no .vm-root present, and reports a portal foul', () => {
		const doc = document.implementation.createHTMLDocument('w');
		const fouls: string[] = [];
		const target = resolvePortalTarget({
			activeDocument: doc,
			onFoul: (kind) => fouls.push(kind),
		});
		expect(target).toBe(doc.body);
		expect(fouls).toContain('portal-misplaced');
	});

	it('throws PortalFoulError when strict=true and expected != active', () => {
		const docA = document.implementation.createHTMLDocument('a');
		const docB = document.implementation.createHTMLDocument('b');
		const rootA = docA.createElement('div');
		rootA.classList.add('vm-root');
		docA.body.appendChild(rootA);
		expect(() =>
			resolvePortalTarget({
				activeDocument: docB,
				expectedDocument: docA,
				strict: true,
			}),
		).toThrow(PortalFoulError);
	});

	it('reports cross-window foul (no throw) when strict=false', () => {
		const docA = document.implementation.createHTMLDocument('a');
		const docB = document.implementation.createHTMLDocument('b');
		const rootB = docB.createElement('div');
		rootB.classList.add('vm-root');
		docB.body.appendChild(rootB);
		const fouls: string[] = [];
		const target = resolvePortalTarget({
			activeDocument: docB,
			expectedDocument: docA,
			onFoul: (kind) => fouls.push(kind),
		});
		expect(target).toBe(rootB);
		expect(fouls).toContain('portal-cross-window');
	});
});
