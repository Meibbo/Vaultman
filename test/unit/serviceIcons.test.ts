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
