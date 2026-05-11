import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import ViewDiff from '../../src/components/views/viewDiff.svelte';
import { VfsChain } from '../../src/services/serviceVfsChain';
import type {
	ImmutableStagedOp,
	ImmutableVirtualFileState,
} from '../../src/types/typeVfsImmutable';

function mkVfs(path = 'a.md'): ImmutableVirtualFileState {
	return {
		file: { path } as never,
		originalPath: path,
		fm: {},
		body: 'initial',
		ops: [],
		fmInitial: {},
		bodyInitial: 'initial',
		bodyLoaded: true,
	};
}

const setBody = (id: string, body: string): ImmutableStagedOp => ({
	id,
	kind: 'body-set',
	action: 'set-body',
	details: `set ${body}`,
	apply: (vfs) => ({ ...vfs, body }),
});

describe('viewDiff chain mode', () => {
	let host: HTMLDivElement;
	let app: ReturnType<typeof mount> | null = null;

	beforeEach(() => {
		host = document.createElement('div');
		document.body.appendChild(host);
	});

	afterEach(() => {
		if (app) void unmount(app);
		host.remove();
	});

	function render(props: Record<string, unknown>) {
		app = mount(ViewDiff as unknown as Component<Record<string, unknown>>, {
			target: host,
			props: {
				queueService: { transactions: new Map() },
				...props,
			},
		});
		flushSync();
	}

	it('renders snapshot diffs from immutable VFS chains', () => {
		const chain = new VfsChain(mkVfs('a.md'));
		chain.appendOp(setBody('op1', 'first'));

		render({
			chains: new Map([['a.md', chain]]),
			activePath: 'a.md',
			activeIndex: 1,
			mode: 'snapshot-focused',
		});

		expect(host.querySelector('.vm-diff-navbar')).toBeTruthy();
		expect(host.textContent).toContain('a.md');
		expect(host.textContent).toContain('first');
		expect(host.textContent).not.toContain('No changes');
	});

	it('updates the rendered snapshot diff when the navbar navigates', () => {
		const chain = new VfsChain(mkVfs('a.md'));
		chain.appendOp(setBody('op1', 'first'));
		chain.appendOp(setBody('op2', 'second'));

		render({
			chains: new Map([['a.md', chain]]),
			activePath: 'a.md',
			activeIndex: 1,
			mode: 'snapshot-focused',
		});
		expect(host.textContent).toContain('first');

		host.querySelector<HTMLButtonElement>('[data-vm-nav="next-change"]')!.click();
		flushSync();

		expect(host.textContent).toContain('second');
	});
});
