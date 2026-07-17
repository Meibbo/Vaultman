import { describe, expect, it } from 'vitest';

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
});
