import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { flushSync, mount, unmount, type Component } from 'svelte';
import ViewDiffNavbar from '../../src/components/views/viewDiffNavbar.svelte';
import { ThemeService } from '../../src/services/serviceTheme.svelte';
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
		body: '',
		ops: [],
		fmInitial: {},
		bodyInitial: '',
		bodyLoaded: true,
	};
}

const op = (id: string, body: string): ImmutableStagedOp => ({
	id,
	kind: 'body-set',
	action: 'set-body',
	details: `-> ${body}`,
	apply: (vfs) => ({ ...vfs, body }),
});

function chain(path: string, bodies: string[]): VfsChain {
	const out = new VfsChain(mkVfs(path));
	for (const [index, body] of bodies.entries()) out.appendOp(op(`${path}:${index}`, body));
	return out;
}

describe('viewDiffNavbar', () => {
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
		app = mount(ViewDiffNavbar as unknown as Component<Record<string, unknown>>, {
			target: host,
			props: {
				themeService: new ThemeService(),
				...props,
			},
		});
		flushSync();
	}

	it('renders one pill per file with snapshots', () => {
		render({
			chains: new Map([
				['a.md', chain('a.md', ['x'])],
				['b.md', chain('b.md', ['y'])],
				['unchanged.md', new VfsChain(mkVfs('unchanged.md'))],
			]),
		});

		const pills = Array.from(host.querySelectorAll('[data-vm-file-pill]'));
		expect(pills.map((pill) => pill.textContent)).toEqual(['a.md', 'b.md']);
	});

	it('emits navigate with the next snapshot index', () => {
		let received: { path: string; index: number } | null = null;
		render({
			chains: new Map([['a.md', chain('a.md', ['x', 'y'])]]),
			activePath: 'a.md',
			activeIndex: 1,
			onNavigate: (event: { path: string; index: number }) => {
				received = event;
			},
		});

		host.querySelector<HTMLButtonElement>('[data-vm-nav="next-change"]')!.click();

		expect(received).toEqual({ path: 'a.md', index: 2 });
	});

	it('next-file navigates to the next path with snapshots', () => {
		let received: { path: string; index: number } | null = null;
		render({
			chains: new Map([
				['a.md', chain('a.md', ['x'])],
				['b.md', chain('b.md', ['y'])],
			]),
			activePath: 'a.md',
			activeIndex: 1,
			onNavigate: (event: { path: string; index: number }) => {
				received = event;
			},
		});

		host.querySelector<HTMLButtonElement>('[data-vm-nav="next-file"]')!.click();

		expect(received).toEqual({ path: 'b.md', index: 1 });
	});

	it('routes Alt+] keydown through next-change navigation', () => {
		let received: { path: string; index: number } | null = null;
		render({
			chains: new Map([['a.md', chain('a.md', ['x', 'y'])]]),
			activePath: 'a.md',
			activeIndex: 1,
			onNavigate: (event: { path: string; index: number }) => {
				received = event;
			},
		});

		host.querySelector<HTMLElement>('.vm-diff-navbar')!.dispatchEvent(
			new KeyboardEvent('keydown', { key: ']', altKey: true, bubbles: true }),
		);

		expect(received).toEqual({ path: 'a.md', index: 2 });
	});

	it('routes Ctrl+Alt+] keydown through next-file navigation', () => {
		let received: { path: string; index: number } | null = null;
		render({
			chains: new Map([
				['a.md', chain('a.md', ['x'])],
				['b.md', chain('b.md', ['y'])],
			]),
			activePath: 'a.md',
			activeIndex: 1,
			onNavigate: (event: { path: string; index: number }) => {
				received = event;
			},
		});

		host.querySelector<HTMLElement>('.vm-diff-navbar')!.dispatchEvent(
			new KeyboardEvent('keydown', {
				key: ']',
				altKey: true,
				ctrlKey: true,
				bubbles: true,
			}),
		);

		expect(received).toEqual({ path: 'b.md', index: 1 });
	});
});
