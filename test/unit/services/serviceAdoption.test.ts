import { describe, expect, it } from 'vitest';
import { AdoptionService } from '../../../src/services/serviceAdoption.svelte';
import type { AdoptedNode } from '../../../src/types/typeAdoptedNode';

function mkNode(kind: AdoptedNode['kind'], children: AdoptedNode[] = []): AdoptedNode {
	return {
		id: kind,
		parentPath: 'p',
		file: {} as never,
		kind,
		label: kind,
		depth: 0,
		line: 0,
		children,
	};
}

describe('AdoptionService', () => {
	it('returns [] when disabled', () => {
		const svc = new AdoptionService();
		expect(svc.filterChildren([mkNode('header')])).toEqual([]);
	});

	it('passes headers when enabled and adoptHeaders is true', () => {
		const svc = new AdoptionService();
		svc.enabled = true;
		const out = svc.filterChildren([mkNode('header'), mkNode('task'), mkNode('block')]);
		expect(out.map((n) => n.kind)).toEqual(['header']);
	});

	it('passes tasks when adoptTasks is on, skips blocks when adoptBlocks is off', () => {
		const svc = new AdoptionService();
		svc.enabled = true;
		svc.adoptTasks = true;
		const out = svc.filterChildren([mkNode('header'), mkNode('task'), mkNode('block')]);
		expect(out.map((n) => n.kind)).toEqual(['header', 'task']);
	});

	it('recurses into headers, filtering nested children', () => {
		const svc = new AdoptionService();
		svc.enabled = true;
		svc.adoptTasks = true;
		const tree = [mkNode('header', [mkNode('task'), mkNode('block')])];
		const out = svc.filterChildren(tree);
		expect(out[0].children.map((n) => n.kind)).toEqual(['task']);
	});
});
