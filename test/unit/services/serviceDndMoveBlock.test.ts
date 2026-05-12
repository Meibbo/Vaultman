import { describe, expect, it, vi } from 'vitest';
import { App } from 'obsidian';
import {
	buildMoveBlockOps,
	createDndService,
	stageMoveBlockIntoChains,
	type DndSubject,
} from '../../../src/services/serviceDnd';
import {
	createDndKitProviderHandlers,
	dndKitId,
	type DndKitEntityData,
} from '../../../src/services/serviceDndSvelteAdapter';
import { OperationQueueService } from '../../../src/services/serviceQueue.svelte';
import type { ImmutableVirtualFileState } from '../../../src/types/typeVfsImmutable';

function mkVfs(path: string, body: string): ImmutableVirtualFileState {
	return {
		file: { path } as never,
		originalPath: path,
		fm: {},
		body,
		ops: [],
		fmInitial: {},
		bodyInitial: body,
		bodyLoaded: true,
	};
}

function fakeApp(): App {
	return {} as unknown as App;
}

describe('buildMoveBlockOps', () => {
	it('removes the block line from source and appends it to target', () => {
		const from = mkVfs('a.md', 'line0\n^myblock\nline2');
		const to = mkVfs('b.md', 'target');

		const { fromOp, toOp } = buildMoveBlockOps({
			fromVfs: from,
			toVfs: to,
			blockId: 'myblock',
			blockLine: 1,
		});

		expect(fromOp.apply(from).body).toBe('line0\nline2');
		expect(toOp.apply(to).body).toBe('target\n^myblock');
	});

	it('stages source extraction and target insertion into queue chains', () => {
		const queue = new OperationQueueService(fakeApp());
		const from = mkVfs('a.md', 'line0\nmove me ^myblock\nline2');
		const to = mkVfs('b.md', 'target');

		const result = stageMoveBlockIntoChains({
			queue,
			fromVfs: from,
			toVfs: to,
			blockId: 'myblock',
		});

		expect(result.fromOp.kind).toBe('block-extract');
		expect(result.toOp.kind).toBe('block-insert');
		expect(queue.getChain('a.md')?.head.body).toBe('line0\nline2');
		expect(queue.getChain('b.md')?.head.body).toBe('target\nmove me ^myblock');
		expect(queue.getChain('a.md')?.ops.map((op) => op.id)).toEqual(['move-block-from-myblock']);
		expect(queue.getChain('b.md')?.ops.map((op) => op.id)).toEqual(['move-block-to-myblock']);
		expect(from.body).toBe('line0\nmove me ^myblock\nline2');
		expect(to.body).toBe('target');
	});

	it('stages an adopted-block drop from the Svelte DnD adapter payload', () => {
		const queue = new OperationQueueService(fakeApp());
		const from = mkVfs('a.md', 'line0\nmove me ^myblock\nline2');
		const to = mkVfs('b.md', 'target');
		const onMoveBlockStaged = vi.fn();
		const source = {
			explorerId: 'outline',
			kind: 'node',
			id: 'a.md::L1::block',
			label: '^myblock',
			data: { kind: 'adopted-block', fromVfs: from, blockId: 'myblock' },
		} as const;
		const target = {
			explorerId: 'files',
			kind: 'node',
			id: 'b.md',
			label: 'b.md',
			accepts: ['move'],
			data: { kind: 'note', toVfs: to },
		} as const;
		const dnd = createDndService();
		const handlers = createDndKitProviderHandlers(dnd, {
			moveBlockQueue: queue,
			onMoveBlockStaged,
		});

		handlers.onDragStart(kitEvent({ source: kitEntity(source, 'source') }));
		handlers.onDragEnd(kitEvent({ source: kitEntity(source, 'source'), target: kitEntity(target, 'target') }));

		expect(queue.getChain('a.md')?.head.body).toBe('line0\nline2');
		expect(queue.getChain('b.md')?.head.body).toBe('target\nmove me ^myblock');
		expect(onMoveBlockStaged).toHaveBeenCalledOnce();
	});
});

function kitEntity(
	subject: DndSubject,
	role: DndKitEntityData['role'],
	data: DndKitEntityData = { role, subject },
) {
	return {
		id: dndKitId(subject),
		data,
	};
}

function kitEvent({
	source,
	target = null,
	canceled = false,
}: {
	source: ReturnType<typeof kitEntity> | null;
	target?: ReturnType<typeof kitEntity> | null;
	canceled?: boolean;
}) {
	return {
		canceled,
		operation: {
			source,
			target,
		},
	} as never;
}
