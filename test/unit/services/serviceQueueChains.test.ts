import { describe, expect, it } from 'vitest';
import { App } from 'obsidian';
import { OperationQueueService } from '../../../src/services/serviceQueue.svelte';
import type {
	ImmutableStagedOp,
	ImmutableVirtualFileState,
} from '../../../src/types/typeVfsImmutable';

function mkVfs(path = 'a.md'): ImmutableVirtualFileState {
	return {
		file: { path } as never,
		originalPath: path,
		fm: {},
		body: '',
		ops: [],
		fmInitial: {},
		bodyInitial: '',
		bodyLoaded: true,
	};
}

const setBody = (id: string, body: string): ImmutableStagedOp => ({
	id,
	kind: 'body-set',
	action: 'set-body',
	details: `→ ${body}`,
	apply: (vfs) => ({ ...vfs, body }),
});

function fakeApp(): App {
	return {} as unknown as App;
}

describe('OperationQueueService — chain mode (additive)', () => {
	it('openChain stores a chain at the path', () => {
		const svc = new OperationQueueService(fakeApp());
		svc.openChain('a.md', mkVfs('a.md'));
		expect(svc.getChain('a.md')).toBeDefined();
	});

	it('openChain is idempotent', () => {
		const svc = new OperationQueueService(fakeApp());
		const first = svc.openChain('a.md', mkVfs('a.md'));
		const second = svc.openChain('a.md', mkVfs('a.md'));
		expect(first).toBe(second);
	});

	it('stageImmutableOp appends to chain without mutating the previous head', () => {
		const svc = new OperationQueueService(fakeApp());
		const initial = mkVfs('a.md');
		const chain = svc.openChain('a.md', initial);
		const headBefore = chain.head;
		svc.stageImmutableOp('a.md', setBody('op1', 'x'));
		expect(chain.head.body).toBe('x');
		expect(headBefore.body).toBe('');
		expect(chain.head).not.toBe(headBefore);
	});

	it('throws when staging to a path without an open chain', () => {
		const svc = new OperationQueueService(fakeApp());
		expect(() => svc.stageImmutableOp('a.md', setBody('op1', 'x'))).toThrow();
	});

	it('chains coexist with transactions (no cross-mutation)', () => {
		const svc = new OperationQueueService(fakeApp());
		svc.openChain('a.md', mkVfs('a.md'));
		svc.stageImmutableOp('a.md', setBody('op1', 'x'));
		expect(svc.chains.size).toBe(1);
		expect(svc.transactions.size).toBe(0);
	});

	it('clearChain removes only the named chain', () => {
		const svc = new OperationQueueService(fakeApp());
		svc.openChain('a.md', mkVfs('a.md'));
		svc.openChain('b.md', mkVfs('b.md'));
		svc.clearChain('a.md');
		expect(svc.chains.has('a.md')).toBe(false);
		expect(svc.chains.has('b.md')).toBe(true);
	});

	it('clearAllChains wipes all chains, leaves transactions alone', () => {
		const svc = new OperationQueueService(fakeApp());
		svc.openChain('a.md', mkVfs('a.md'));
		svc.openChain('b.md', mkVfs('b.md'));
		svc.clearAllChains();
		expect(svc.chains.size).toBe(0);
	});
});
