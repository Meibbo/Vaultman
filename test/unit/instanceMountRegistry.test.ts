import { describe, expect, it } from 'vitest';
import { InstanceMountRegistry } from '../../src/logic/logicInstanceMountRegistry';

type FakeLeaf = { readonly id: string };

describe('InstanceMountRegistry', () => {
	it('reserves one instance and leaf synchronously, then fences stale release', () => {
		const registry = new InstanceMountRegistry<FakeLeaf>();
		const firstLeaf = { id: 'leaf-a' };
		const successorLeaf = { id: 'leaf-b' };

		const first = registry.reserve('vm-a', firstLeaf, { kind: 'main', leaf: firstLeaf });
		expect(first.ok).toBe(true);
		if (!first.ok) return;
		registry.release(first.lease);
		const successor = registry.reserve('vm-a', successorLeaf, {
			kind: 'main',
			leaf: successorLeaf,
		});
		expect(successor.ok).toBe(true);
		if (!successor.ok) return;

		expect(registry.release(first.lease)).toBe(false);
		expect(registry.get('vm-a')).toEqual(successor.lease);
		expect(registry.getByLeaf(successorLeaf)).toEqual(successor.lease);
	});

	it('rejects a duplicate owner but makes the same reservation idempotent', () => {
		const registry = new InstanceMountRegistry<FakeLeaf>();
		const leaf = { id: 'leaf-a' };

		const first = registry.reserve('vm-a', leaf, { kind: 'main', leaf });
		const same = registry.reserve('vm-a', leaf, { kind: 'main', leaf });
		const other = registry.reserve('vm-b', leaf, { kind: 'main', leaf });

		expect(first.ok).toBe(true);
		expect(same).toEqual(first);
		expect(other).toEqual({ ok: false, reason: 'leaf-owned', ownerId: 'vm-a' });
	});

	it('readdresses the live leaf without changing its fencing token', () => {
		const registry = new InstanceMountRegistry<FakeLeaf>();
		const firstLeaf = { id: 'leaf-a' };
		const movedLeaf = { id: 'leaf-b' };
		const first = registry.adopt('vm-a', firstLeaf, { kind: 'main', leaf: firstLeaf });
		expect(first.ok).toBe(true);
		if (!first.ok) return;

		expect(
			registry.readdress(first.lease, { kind: 'sidebar', edge: 'end', leaf: movedLeaf }),
		).toBe(true);
		const current = registry.get('vm-a');
		expect(current?.token).toBe(first.lease.token);
		expect(current?.address).toEqual({ kind: 'sidebar', edge: 'end', leaf: movedLeaf });
		expect(registry.getByLeaf(firstLeaf)).toBeUndefined();
		expect(registry.getByLeaf(movedLeaf)?.token).toBe(first.lease.token);
	});

	it('releases the current reverse ownership when closing with the original readdressed lease', () => {
		const registry = new InstanceMountRegistry<FakeLeaf>();
		const oldLeaf = { id: 'old' };
		const movedLeaf = { id: 'moved' };
		const first = registry.reserve('vm-a', oldLeaf, { kind: 'main', leaf: oldLeaf });
		if (!first.ok) throw new Error('fixture reservation failed');
		registry.readdress(first.lease, { kind: 'sidebar', edge: 'start', leaf: movedLeaf });

		expect(registry.release(first.lease)).toBe(true);
		expect(registry.get('vm-a')).toBeUndefined();
		expect(registry.getByLeaf(movedLeaf)).toBeUndefined();
		expect(registry.reserve('vm-b', movedLeaf, { kind: 'main', leaf: movedLeaf }).ok).toBe(true);
	});
});
