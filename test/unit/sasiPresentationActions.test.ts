import { expect, it } from 'vitest';
import { createVaultmanSasi } from '../../src/logic/logicSasiBootstrap';

it('indexes presentation actions without publishing premature scoped UI or commands', () => {
	const { registry } = createVaultmanSasi();
	const ids = ['provided', 'lowercase', 'titlecase', 'uppercase'].map(mode => `vaultman.scene.text-case.${mode}`);
	for (const boundary of ['tree', 'toolbar', 'container', 'menu']) {
		for (const mode of ['compatible', 'locked']) ids.push(`vaultman.scene.native-compat.${boundary}.${mode}`);
	}
	for (const id of ids) {
		const resolved = registry.resolve(id);
		expect(resolved.def?.kind).toBe('action');
		expect(resolved.def?.supports).toEqual([]);
		expect(resolved.def?.availability?.reason?.code).toBe('scope-addressing-deferred');
		expect(resolved.available).toBe(false);
		expect(registry.listCommands().some(command => command.composes?.includes(id))).toBe(false);
	}
});
