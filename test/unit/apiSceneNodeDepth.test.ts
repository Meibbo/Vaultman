import { describe, expect, it } from 'vitest';
import { buildApiSceneNodes } from '../../src/logic/logicApiSceneNodes';
import { projectApiSceneTree } from '../../src/logic/logicApiSceneTree';
import { createSasiRegistry } from '../../src/logic/logicSasiRegistry';

describe('ApiScene node depths and single indent lines', () => {
	it('builds raw top-level kind nodes at depth 0 so grouped rows do not double indent', () => {
		const registry = createSasiRegistry();
		const nodes = buildApiSceneNodes(registry, undefined, undefined, {});

		const actionCell = nodes.find((n) => n.id === 'sasi:kind:cells:action');
		expect(actionCell).toBeDefined();
		expect(actionCell?.depth).toBe(0);

		const toggleCell = nodes.find((n) => n.id === 'sasi:kind:cells:toggle');
		expect(toggleCell).toBeDefined();
		expect(toggleCell?.depth).toBe(0);

		const filesNode = nodes.find((n) => n.id === 'sasi:kind:nodes:files');
		expect(filesNode).toBeDefined();
		expect(filesNode?.depth).toBe(0);
		expect(filesNode?.children?.[0]?.depth).toBe(1);

		const valuesNode = nodes.find((n) => n.id === 'sasi:kind:nodes:values');
		expect(valuesNode).toBeDefined();
		expect(valuesNode?.depth).toBe(0);
		expect(valuesNode?.children?.[0]?.depth).toBe(1);
	});

	it('ensures direct children under Kinds group header have depth 1 (single guide line)', () => {
		const registry = createSasiRegistry();
		const rawNodes = buildApiSceneNodes(registry, undefined, undefined, {});
		const projected = projectApiSceneTree(rawNodes);

		const kindsHeader = projected.find((n) => n.id === 'sasi.group.kind');
		expect(kindsHeader).toBeDefined();
		expect(kindsHeader?.depth).toBe(0);

		const childAction = kindsHeader?.children?.find(
			(c) => c.id === 'sasi:kind:cells:action' || c.label === 'action',
		);
		expect(childAction).toBeDefined();
		// Must be depth 1 so CSS .vaultman-tree-guides calculates width: 16px (1 single line)
		expect(childAction?.depth).toBe(1);
	});
});
