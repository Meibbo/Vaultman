// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { App, EventRef, Menu, Plugin } from 'obsidian';
import { PlatformAdapterRegistry } from '../../../src/platform/fragilityRegistry';
import {
	FileMenuDelegationAdapter,
	type FileMenuDelegationDelegate,
} from '../../../src/platform/adapters/fileMenuDelegationAdapter';
import type { PlatformAdapterContext } from '../../../src/platform/platformAdapter';

type FileMenuListener = (menu: Menu, file: unknown, source?: string) => void;

interface WorkspaceHarness {
	workspace: {
		on: ReturnType<typeof vi.fn>;
		offref: ReturnType<typeof vi.fn>;
		emitFileMenu(menu?: Menu, file?: unknown, source?: string): void;
		listenerCount(): number;
	};
}

function makeWorkspaceHarness(): WorkspaceHarness {
	const listeners = new Set<FileMenuListener>();
	const refs = new Map<EventRef, FileMenuListener>();
	const workspace = {
		on: vi.fn((event: string, listener: FileMenuListener) => {
			if (event !== 'file-menu') throw new Error(`unexpected event ${event}`);
			const ref = { event, listener } as unknown as EventRef;
			listeners.add(listener);
			refs.set(ref, listener);
			return ref;
		}),
		offref: vi.fn((ref: EventRef) => {
			const listener = refs.get(ref);
			if (listener) listeners.delete(listener);
			refs.delete(ref);
		}),
		emitFileMenu(menu = {} as Menu, file: unknown = { path: 'Notes/A.md' }, source?: string) {
			for (const listener of [...listeners]) {
				listener(menu, file, source);
			}
		},
		listenerCount() {
			return listeners.size;
		},
	};
	return { workspace };
}

function makeCtx(workspace = makeWorkspaceHarness().workspace): PlatformAdapterContext {
	return {
		app: { workspace } as unknown as App,
		plugin: {} as Plugin,
		doc: document,
	};
}

beforeEach(() => {
	vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('FileMenuDelegationAdapter — probe + registry behavior', () => {
	it('probe-fail disables the adapter through the registry and leaves no file-menu listener', async () => {
		const workspace = { offref: vi.fn() };
		const delegate = vi.fn();
		const adapter = new FileMenuDelegationAdapter({ delegateFileMenu: delegate });
		const registry = new PlatformAdapterRegistry().add(adapter);

		const status = await registry.activate(makeCtx(workspace as never));
		await registry.deactivate();

		expect(status).toEqual([
			{
				id: 'file-menu-delegation',
				enabled: false,
				reason: "app.workspace.on('file-menu') is not available",
			},
		]);
		expect(delegate).not.toHaveBeenCalled();
	});
});

describe('FileMenuDelegationAdapter — apply/revert lifecycle', () => {
	it('delegates file-menu events and reverts without listener residue', () => {
		const { workspace } = makeWorkspaceHarness();
		const delegate = vi.fn<FileMenuDelegationDelegate>();
		const adapter = new FileMenuDelegationAdapter({ delegateFileMenu: delegate });
		adapter.apply(makeCtx(workspace));

		const menu = {} as Menu;
		const file = { path: 'Notes/A.md' };
		workspace.emitFileMenu(menu, file, 'more-options');
		expect(delegate).toHaveBeenCalledWith(menu, file, 'more-options');
		expect(workspace.listenerCount()).toBe(1);

		adapter.revert();
		adapter.revert();
		expect(workspace.offref).toHaveBeenCalledOnce();
		expect(workspace.listenerCount()).toBe(0);

		workspace.emitFileMenu(menu, file, 'file-menu');
		expect(delegate).toHaveBeenCalledOnce();
	});

	it('suppresses reentrant file-menu delegation and resets after the outer call', () => {
		const { workspace } = makeWorkspaceHarness();
		const delegate = vi.fn<FileMenuDelegationDelegate>(() => {
			workspace.emitFileMenu({} as Menu, { path: 'Notes/B.md' }, 'file-menu');
		});
		const adapter = new FileMenuDelegationAdapter({ delegateFileMenu: delegate });
		adapter.apply(makeCtx(workspace));

		workspace.emitFileMenu({} as Menu, { path: 'Notes/A.md' }, 'file-menu');
		expect(delegate).toHaveBeenCalledOnce();

		delegate.mockImplementation(() => {});
		workspace.emitFileMenu({} as Menu, { path: 'Notes/C.md' }, 'file-menu');
		expect(delegate).toHaveBeenCalledTimes(2);
	});
});

describe('FileMenuDelegationAdapter — fragility record', () => {
	it('declares file-menu private event assumptions, mobile behavior, and the curation seam', () => {
		const adapter = new FileMenuDelegationAdapter({ delegateFileMenu: vi.fn() });

		expect(adapter.id).toBe('file-menu-delegation');
		expect(adapter.fragility.privateSymbols).toEqual(
			expect.arrayContaining(["app.workspace.on('file-menu')", 'app.workspace.offref(EventRef)']),
		);
		expect(adapter.fragility.selectorSources).toEqual([]);
		expect(adapter.fragility.obsidianAssumptions).toEqual(
			expect.arrayContaining([
				expect.stringContaining('source === "more-options"'),
				expect.stringContaining('_removeNativeFileMoveActions'),
			]),
		);
		expect(adapter.fragility.mobile.supported).toBe('degraded');
		expect(adapter.fragility.mobile.notes).toContain('more-options');
	});
});
