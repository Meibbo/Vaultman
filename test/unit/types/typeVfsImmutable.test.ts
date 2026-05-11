import { describe, expect, it } from 'vitest';
import {
	freezeVfs,
	isFrozenVfs,
	type ImmutableVirtualFileState,
} from '../../../src/types/typeVfsImmutable';

function mkVfs(): ImmutableVirtualFileState {
	return {
		file: {} as never,
		originalPath: 'a.md',
		fm: { a: 1 },
		body: 'x',
		ops: [],
		fmInitial: { a: 1 },
		bodyInitial: 'x',
		bodyLoaded: true,
	};
}

describe('typeVfsImmutable', () => {
	it('freezeVfs deeply freezes fm', () => {
		const frozen = freezeVfs(mkVfs());
		expect(isFrozenVfs(frozen)).toBe(true);
		expect(() => {
			(frozen.fm as Record<string, unknown>).a = 2;
		}).toThrow(TypeError);
	});

	it('isFrozenVfs returns false for non-frozen objects', () => {
		expect(isFrozenVfs(mkVfs())).toBe(false);
	});

	it('freezeVfs prevents top-level field reassignment', () => {
		const frozen = freezeVfs(mkVfs());
		expect(() => {
			(frozen as unknown as { body: string }).body = 'y';
		}).toThrow(TypeError);
	});

	it('freezeVfs prevents ops array mutation', () => {
		const frozen = freezeVfs(mkVfs());
		expect(() => {
			(frozen.ops as unknown as { push: (op: unknown) => void }).push({});
		}).toThrow(TypeError);
	});

	it('freezeVfs deeply freezes nested frontmatter values', () => {
		const frozen = freezeVfs({
			...mkVfs(),
			fm: { nested: { a: 1 } },
			fmInitial: { nested: { a: 1 } },
		});

		expect(() => {
			(
				(frozen.fm as Record<string, unknown>).nested as Record<string, unknown>
			).a = 2;
		}).toThrow(TypeError);
		expect(() => {
			(
				(frozen.fmInitial as Record<string, unknown>).nested as Record<string, unknown>
			).a = 2;
		}).toThrow(TypeError);
	});
});
