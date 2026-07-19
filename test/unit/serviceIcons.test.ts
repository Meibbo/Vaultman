import { describe, expect, it, vi } from 'vitest';

import { IconicService } from '../../src/services/serviceIcons';
import mainSource from '../../src/main.ts?raw';

function fakeApp(data: unknown) {
	return {
		vault: {
			configDir: 'custom-config',
			adapter: {
				read: async () => JSON.stringify(data),
			},
		},
	};
}

async function load(service: IconicService): Promise<void> {
	const loaded = new Promise<void>((resolve) => service.onLoaded(resolve));
	service.onload();
	await loaded;
}

describe('IconicService add-on gate', () => {
	it('threads the saved preference through startup and external settings reloads', () => {
		expect(mainSource).toContain(
			'new IconicService(\n\t\t\tthis.app,\n\t\t\tthis.settings.iconicEnabled !== false',
		);
		expect(mainSource).toContain(
			'this.iconicService?.setEnabled(this.settings.iconicEnabled !== false)',
		);
	});

	it('keeps Iconic enabled by default for existing installations', async () => {
		const service = new IconicService(
			fakeApp({ propertyIcons: { status: { icon: 'circle-check' } } }) as never,
		);
		await load(service);

		expect(service.isEnabled()).toBe(true);
		expect(service.isAvailable()).toBe(true);
		expect(service.getIcon('status')).toEqual({ icon: 'circle-check' });
	});

	it('loads Iconic data while disabled but exposes no icons until enabled', async () => {
		const service = new IconicService(
			fakeApp({
				propertyIcons: { status: { icon: 'circle-check', color: '#0f0' } },
				tagIcons: { project: { icon: 'folder-kanban' } },
			}) as never,
			false,
		);
		await load(service);

		expect(service.isEnabled()).toBe(false);
		expect(service.isAvailable()).toBe(false);
		expect(service.getIcon('status')).toBeNull();
		expect(service.getTagIcon('project')).toBeNull();

		service.setEnabled(true);

		expect(service.isEnabled()).toBe(true);
		expect(service.isAvailable()).toBe(true);
		expect(service.getIcon('status')).toEqual({
			icon: 'circle-check',
			color: '#0f0',
		});
		expect(service.getTagIcon('project')).toEqual({ icon: 'folder-kanban' });
	});

	it('can disable already-loaded icons without discarding cached data', async () => {
		const service = new IconicService(
			fakeApp({ propertyIcons: { status: { icon: 'circle-check' } } }) as never,
		);
		await load(service);

		service.setEnabled(false);
		expect(service.getIcon('status')).toBeNull();

		service.setEnabled(true);
		expect(service.getIcon('status')).toEqual({ icon: 'circle-check' });
	});

	it('loads direct Iconic file and folder icons from its persisted data', async () => {
		const service = new IconicService(
			fakeApp({
				fileIcons: {
					'Notes/Alpha.md': { icon: 'lucide-star', color: '#ffaa00' },
					Archive: { icon: 'lucide-archive' },
				},
			}) as never,
		);
		await load(service);

		expect(service.getFileIcon('Notes/Alpha.md', false)).toEqual({
			icon: 'lucide-star',
			color: '#ffaa00',
		});
		expect(service.getFileIcon('Archive', true)).toEqual({
			icon: 'lucide-archive',
		});
	});

	it('prefers live Iconic rule rulings over persisted direct icons', async () => {
		const app = fakeApp({
			fileIcons: { 'Notes/Alpha.md': { icon: 'lucide-star' } },
		}) as ReturnType<typeof fakeApp> & {
			plugins: { plugins: Record<string, unknown> };
		};
		app.plugins = {
			plugins: {
				iconic: {
					getFileItem: () => ({ icon: 'lucide-star', color: null }),
					ruleManager: {
						checkRuling: () => ({ icon: 'lucide-flame', color: '#f00' }),
					},
				},
			},
		};
		const service = new IconicService(app as never);
		await load(service);

		// Render pass answers from persisted data; the runtime ruling lands
		// after the background pump (BT4-002).
		expect(service.getFileIcon('Notes/Alpha.md', false)).toEqual({
			icon: 'lucide-star',
		});
		for (let i = 0; i < 6; i += 1) {
			await new Promise((resolve) => setTimeout(resolve, 0));
		}
		expect(service.getFileIcon('Notes/Alpha.md', false)).toEqual({
			icon: 'lucide-flame',
			color: '#f00',
		});
	});

	it('prefers live property and tag items over persisted Iconic data', async () => {
		const app = fakeApp({
			propertyIcons: { status: { icon: 'lucide-database' } },
			tagIcons: { project: { icon: 'lucide-folder' } },
		}) as ReturnType<typeof fakeApp> & {
			plugins: { plugins: Record<string, unknown> };
		};
		app.plugins = {
			plugins: {
				iconic: {
					getPropertyItem: () => ({
						icon: 'lucide-circle-check',
						color: '#0f0',
					}),
					getTagItem: () => ({ icon: 'lucide-kanban', color: '#00f' }),
				},
			},
		};
		const service = new IconicService(app as never);
		await load(service);

		service.getIcon('status');
		service.getTagIcon('project');
		for (let i = 0; i < 6; i += 1) {
			await new Promise((resolve) => setTimeout(resolve, 0));
		}
		expect(service.getIcon('status')).toEqual({
			icon: 'lucide-circle-check',
			color: '#0f0',
		});
		expect(service.getTagIcon('project')).toEqual({
			icon: 'lucide-kanban',
			color: '#00f',
		});
	});

	it('opens and refreshes only when an explicit runtime picker is available', async () => {
		const propertyItem = {
			id: 'status',
			name: 'status',
			category: 'property',
			icon: null as string | null,
			color: null as string | null,
		};
		const tagItem = {
			id: 'project',
			name: '#project',
			category: 'tag',
			icon: null as string | null,
			color: null as string | null,
		};
		const openIconPicker = vi.fn(
			(
				_item: unknown,
				_callback: (icon: string | null, color: string | null) => void,
			) => undefined,
		);
		const savePropertyIcon = vi.fn();
		const saveTagIcon = vi.fn();
		const refreshManagers = vi.fn();
		const app = fakeApp({}) as ReturnType<typeof fakeApp> & {
			plugins: { plugins: Record<string, unknown> };
		};
		app.plugins = {
			plugins: {
				iconic: {
					getPropertyItem: () => propertyItem,
					getTagItem: () => tagItem,
					openIconPicker,
					savePropertyIcon,
					saveTagIcon,
					refreshManagers,
				},
			},
		};
		const service = new IconicService(app as never);
		const changed = vi.fn();
		service.onChanged(changed);
		await load(service);

		expect(service.canChangePropertyIcon()).toBe(true);
		expect(service.canChangeTagIcon()).toBe(true);
		expect(service.openPropertyIconPicker('status')).toBe(true);
		expect(openIconPicker).toHaveBeenCalledWith(
			propertyItem,
			expect.any(Function),
		);

		const pickerCallback = openIconPicker.mock.calls[0]?.[1];
		pickerCallback?.('lucide-zap', '#ff0');
		expect(savePropertyIcon).toHaveBeenCalledWith(
			propertyItem,
			'lucide-zap',
			'#ff0',
		);
		expect(refreshManagers).toHaveBeenCalledWith('property');
		expect(service.getIcon('status')).toEqual({
			icon: 'lucide-zap',
			color: '#ff0',
		});
		expect(changed).toHaveBeenCalled();

		service.setEnabled(false);
		expect(service.canChangePropertyIcon()).toBe(false);
		expect(service.openTagIconPicker('project')).toBe(false);
	});

	it('does not advertise change-icon without a callable picker', async () => {
		const app = fakeApp({}) as ReturnType<typeof fakeApp> & {
			plugins: { plugins: Record<string, unknown> };
		};
		app.plugins = {
			plugins: {
				iconic: {
					getPropertyItem: () => ({ id: 'status' }),
					savePropertyIcon: () => {},
				},
			},
		};
		const service = new IconicService(app as never);
		await load(service);

		expect(service.canChangePropertyIcon()).toBe(false);
		expect(service.openPropertyIconPicker('status')).toBe(false);
	});

	it('falls back to persisted icons when optional runtime getters fail', async () => {
		const app = fakeApp({
			propertyIcons: { status: { icon: 'lucide-database' } },
			tagIcons: { '#project': { icon: 'lucide-folder' } },
		}) as ReturnType<typeof fakeApp> & {
			plugins: { plugins: Record<string, unknown> };
		};
		app.plugins = {
			plugins: {
				iconic: {
					getPropertyItem: () => {
						throw new Error('private API changed');
					},
					getTagItem: () => {
						throw new Error('private API changed');
					},
				},
			},
		};
		const service = new IconicService(app as never);
		await load(service);

		expect(service.getIcon('status')).toEqual({ icon: 'lucide-database' });
		expect(service.getTagIcon('project')).toEqual({ icon: 'lucide-folder' });
	});

	it('isolates change subscribers and supports disposal', async () => {
		const service = new IconicService(fakeApp({}) as never);
		const first = vi.fn(() => {
			throw new Error('stale panel');
		});
		const second = vi.fn();
		service.onChanged(first);
		const disposeSecond = service.onChanged(second);
		await load(service);

		expect(() => service.setEnabled(false)).not.toThrow();
		expect(first).toHaveBeenCalledOnce();
		expect(second).toHaveBeenCalledOnce();

		disposeSecond();
		service.setEnabled(true);
		expect(first).toHaveBeenCalledTimes(2);
		expect(second).toHaveBeenCalledOnce();
	});
});

describe('IconicService deferred runtime resolution (BT4-002)', () => {
	const settle = async () => {
		for (let i = 0; i < 6; i += 1) {
			await new Promise((resolve) => setTimeout(resolve, 0));
		}
	};

	it('keeps render passes off the runtime and upgrades the cache in background', async () => {
		const getTagItem = vi.fn(() => ({ icon: 'lucide-kanban', color: '#00f' }));
		const app = fakeApp({
			tagIcons: { project: { icon: 'lucide-folder' } },
		}) as ReturnType<typeof fakeApp> & {
			plugins: { plugins: Record<string, unknown> };
		};
		app.plugins = { plugins: { iconic: { getTagItem } } };
		const service = new IconicService(app as never);
		await load(service);
		const changed = vi.fn();
		service.onChanged(changed);

		// Render pass: persisted answer, zero synchronous runtime work.
		expect(service.getTagIcon('project')).toEqual({
			icon: 'lucide-folder',
		});
		expect(getTagItem).not.toHaveBeenCalled();

		await settle();
		// Background pump upgraded the cache and notified exactly once.
		expect(getTagItem).toHaveBeenCalled();
		expect(changed).toHaveBeenCalledTimes(1);
		const callsAfterPump = getTagItem.mock.calls.length;
		expect(service.getTagIcon('project')).toEqual({
			icon: 'lucide-kanban',
			color: '#00f',
		});
		expect(getTagItem.mock.calls.length).toBe(callsAfterPump);
	});

	it('resolves runtime misses once without notifying', async () => {
		const getTagItem = vi.fn(() => null);
		const app = fakeApp({}) as ReturnType<typeof fakeApp> & {
			plugins: { plugins: Record<string, unknown> };
		};
		app.plugins = { plugins: { iconic: { getTagItem } } };
		const service = new IconicService(app as never);
		await load(service);
		const changed = vi.fn();
		service.onChanged(changed);

		expect(service.getTagIcon('missing')).toBeNull();
		await settle();
		expect(changed).not.toHaveBeenCalled();
		const callsAfterPump = getTagItem.mock.calls.length;
		expect(service.getTagIcon('missing')).toBeNull();
		await settle();
		expect(getTagItem.mock.calls.length).toBe(callsAfterPump);
	});

	it('lets a consumer unsubscribe a pending onLoaded callback', async () => {
		const failingApp = {
			vault: {
				configDir: 'custom-config',
				adapter: {
					read: async () => {
						throw new Error('no iconic data');
					},
				},
			},
		};
		const service = new IconicService(failingApp as never);
		const kept = vi.fn();
		const dropped = vi.fn();
		service.onLoaded(kept);
		const unsubscribe = service.onLoaded(dropped);
		unsubscribe();
		service.onload();
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(kept).toHaveBeenCalledTimes(1);
		expect(dropped).not.toHaveBeenCalled();
	});
});

describe('external Iconic data watch (BT4-024)', () => {
	it('reloads and notifies when data.json changes on disk', async () => {
		let payload = { tagIcons: { project: { icon: 'lucide-folder' } } };
		let mtime = 100;
		const app = {
			vault: {
				configDir: 'cfg',
				adapter: {
					read: async () => JSON.stringify(payload),
					stat: async () => ({ mtime }),
				},
			},
		};
		const service = new IconicService(app as never);
		await load(service);
		const changed = vi.fn();
		service.onChanged(changed);
		const sync = (
			service as unknown as { _syncExternalData(): Promise<void> }
		)._syncExternalData.bind(service);

		// Baseline was seeded at load; an unchanged mtime is a no-op.
		await sync();
		expect(changed).not.toHaveBeenCalled();

		payload = { tagIcons: { project: { icon: 'lucide-flame' } } };
		mtime = 200;
		await sync();
		expect(changed).toHaveBeenCalledTimes(1);
		expect(service.getTagIcon('project')).toEqual({ icon: 'lucide-flame' });
	});
});

describe('raw-event driven external sync (BT4-030)', () => {
	it('subscribes to the vault raw event for the iconic data path', async () => {
		let rawHandler: ((path: string) => void) | null = null;
		let payload = { tagIcons: { project: { icon: 'lucide-folder' } } };
		let mtime = 100;
		const app = {
			vault: {
				configDir: 'cfg',
				adapter: {
					read: async () => JSON.stringify(payload),
					stat: async () => ({ mtime }),
				},
				on: (name: string, cb: (path: string) => void) => {
					if (name === 'raw') rawHandler = cb;
					return { unref: () => {} };
				},
			},
		};
		const service = new IconicService(app as never);
		service.onload();
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(rawHandler).not.toBeNull();

		// Baseline observation.
		await (
			service as unknown as { _syncExternalData(): Promise<void> }
		)._syncExternalData();

		const changed = vi.fn();
		service.onChanged(changed);
		payload = { tagIcons: { project: { icon: 'lucide-flame' } } };
		mtime = 200;
		rawHandler!('cfg/plugins/iconic/data.json');
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(changed).toHaveBeenCalledTimes(1);
		expect(service.getTagIcon('project')).toEqual({ icon: 'lucide-flame' });
	});
});
