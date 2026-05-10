import { describe, expect, it } from 'vitest';
import { ServiceCache } from '../../../src/services/serviceCache';

describe('ServiceCache', () => {
	it('returns cached values only when the fingerprint still matches', () => {
		const cache = new ServiceCache<string, string[]>({ maxEntries: 3 });

		cache.set('needle', ['a.md:1'], 'vault-a');

		expect(cache.get('needle', 'vault-a')).toEqual(['a.md:1']);
		expect(cache.get('needle', 'vault-b')).toBeUndefined();
	});

	it('evicts the least recently used entry when capacity is exceeded', () => {
		const cache = new ServiceCache<string, number>({ maxEntries: 2 });

		cache.set('a', 1, 'same');
		cache.set('b', 2, 'same');
		expect(cache.get('a', 'same')).toBe(1);
		cache.set('c', 3, 'same');

		expect(cache.get('a', 'same')).toBe(1);
		expect(cache.get('b', 'same')).toBeUndefined();
		expect(cache.get('c', 'same')).toBe(3);
	});
});
