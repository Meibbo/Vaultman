import { describe, it, expect, vi } from 'vitest';
import {
	findFirstFileSceneLeaf,
	flashFolderRow,
	handleBreadcrumbFileSceneClick,
	isPlainPrimaryClick,
	BREADCRUMB_FLASH_CLASS,
	BREADCRUMB_FLASH_MS,
} from '../../src/services/serviceBreadcrumbFileScene';

function mockElement(
	opts: {
		classes?: string[];
		attributes?: Record<string, string>;
		dataset?: Record<string, string | undefined>;
		textContent?: string;
	} = {},
) {
	const classes = new Set(opts.classes ?? []);
	const attributes = { ...(opts.attributes ?? {}) };
	const dataset = { ...(opts.dataset ?? {}) };
	const el: any = {
		classList: { contains: (cls: string) => classes.has(cls) },
		dataset,
		textContent: opts.textContent ?? '',
		getAttribute: (attr: string) => attributes[attr] ?? null,
		closest: function (selector: string) {
			const parts = selector.split(',').map((s: string) => s.trim());
			for (const part of parts) {
				if (
					part === '.view-header-breadcrumb' &&
					classes.has('view-header-breadcrumb')
				)
					return this;
				if (
					part === '.view-header-title-parent' &&
					classes.has('view-header-title-parent')
				)
					return this;
			}
			return null;
		},
		querySelectorAll: () => [],
		preventDefault: vi.fn(),
		stopImmediatePropagation: vi.fn(),
	};
	return el;
}

function mockRow(path: string) {
	return {
		getAttribute: (attr: string) => (attr === 'data-path' ? path : null),
		classList: { add: vi.fn(), remove: vi.fn() },
		win: { setTimeout: (fn: () => void) => fn() },
	};
}

function mockLeaf(opts: { scene?: string; revealed?: boolean } = {}) {
	const view: any = {
		getActiveScene: vi.fn(() => opts.scene ?? 'props'),
		revealFolderInFileScene: vi.fn(() => opts.revealed ?? true),
	};
	return {
		view,
		containerEl: { querySelector: vi.fn(() => null) },
	};
}

function mockApp(leaves: any[]) {
	return {
		workspace: {
			getLeavesOfType: vi.fn(() => leaves),
			revealLeaf: vi.fn(),
			setActiveLeaf: vi.fn(),
		},
		vault: { getFolderByPath: vi.fn((p: string) => ({ path: p })) },
	} as any;
}

function plainClick(target: any) {
	return {
		target,
		button: 0,
		ctrlKey: false,
		metaKey: false,
		altKey: false,
		shiftKey: false,
		preventDefault: vi.fn(),
		stopImmediatePropagation: vi.fn(),
	} as any;
}

describe('breadcrumb → fileScene intercept (task_113)', () => {
	it('plain primary click on a breadcrumb resolves folder and suppresses native', () => {
		const crumb = mockElement({
			classes: ['view-header-breadcrumb'],
			attributes: { 'data-path': 'Notas/Diario' },
			textContent: 'Diario',
		});
		const leaf = mockLeaf({ scene: 'files' });
		const app = mockApp([leaf]);
		const handled = handleBreadcrumbFileSceneClick(plainClick(crumb), {
			app,
			frameType: 'vaultman-frame',
		});
		expect(handled).toBe(true);
		expect(leaf.view.revealFolderInFileScene).toHaveBeenCalledWith(
			'Notas/Diario',
		);
		expect(app.workspace.revealLeaf).toHaveBeenCalledWith(leaf);
		expect(app.workspace.setActiveLeaf).toHaveBeenCalledWith(leaf, {
			focus: true,
		});
	});

	it('modifier click is left alone for the binding service', () => {
		const crumb = mockElement({
			classes: ['view-header-breadcrumb'],
			attributes: { 'data-path': 'Notas' },
		});
		const leaf = mockLeaf({ scene: 'files' });
		const app = mockApp([leaf]);
		const event = { ...plainClick(crumb), ctrlKey: true };
		expect(
			handleBreadcrumbFileSceneClick(event, {
				app,
				frameType: 'vaultman-frame',
			}),
		).toBe(false);
		expect(event.preventDefault).not.toHaveBeenCalled();
		expect(leaf.view.revealFolderInFileScene).not.toHaveBeenCalled();
	});

	it('does not hijack when no fileScene instance exists', () => {
		const crumb = mockElement({
			classes: ['view-header-breadcrumb'],
			attributes: { 'data-path': 'Notas' },
		});
		const leaf = mockLeaf({ scene: 'props' });
		const app = mockApp([leaf]);
		const event = plainClick(crumb);
		expect(
			handleBreadcrumbFileSceneClick(event, {
				app,
				frameType: 'vaultman-frame',
			}),
		).toBe(false);
		expect(event.preventDefault).not.toHaveBeenCalled();
	});

	it('ignores non-breadcrumb elements', () => {
		const other = mockElement({ classes: ['nav-folder-title'] });
		const app = mockApp([mockLeaf({ scene: 'files' })]);
		expect(
			handleBreadcrumbFileSceneClick(plainClick(other), {
				app,
				frameType: 'vaultman-frame',
			}),
		).toBe(false);
	});

	it('findFirstFileSceneLeaf skips instances without fileScene', () => {
		const a = { view: mockLeaf({ scene: 'props' }).view };
		const b = { view: mockLeaf({ scene: 'files' }).view };
		expect(findFirstFileSceneLeaf([a, b] as any)).toBe(b);
		expect(findFirstFileSceneLeaf([a] as any)).toBe(null);
	});

	it('isPlainPrimaryClick gates modifiers and aux buttons', () => {
		const base = plainClick(mockElement());
		expect(isPlainPrimaryClick(base)).toBe(true);
		expect(isPlainPrimaryClick({ ...base, button: 1 })).toBe(false);
		expect(isPlainPrimaryClick({ ...base, altKey: true })).toBe(false);
	});

	it('flashFolderRow adds and removes the flash class on the folder row', () => {
		const row = mockRow('Notas/Diario');
		const container = { querySelector: vi.fn(() => row) };
		expect(flashFolderRow(container as any, 'Notas/Diario')).toBe(true);
		expect(row.classList.add).toHaveBeenCalledWith(BREADCRUMB_FLASH_CLASS);
		expect(row.classList.remove).toHaveBeenCalledWith(BREADCRUMB_FLASH_CLASS);
		expect(BREADCRUMB_FLASH_MS).toBe(750);
	});
});

describe('task_113 adversarial: sin clicks muertos', () => {
	it('flashea aunque reveal reporte false', () => {
		const crumb = mockElement({
			classes: ['view-header-breadcrumb'],
			attributes: { 'data-path': 'Notas' },
			textContent: 'Notas',
		});
		const row = mockRow('Notas');
		const leaf = {
			view: {
				getActiveScene: () => 'files',
				revealFolderInFileScene: vi.fn(() => false),
			},
			containerEl: { querySelector: vi.fn(() => row) },
		};
		const app = mockApp([leaf]);
		const event = plainClick(crumb);
		expect(
			handleBreadcrumbFileSceneClick(event, {
				app,
				frameType: 'vaultman-frame',
			}),
		).toBe(true);
		expect(event.preventDefault).toHaveBeenCalled();
		expect(row.classList.add).toHaveBeenCalledWith(BREADCRUMB_FLASH_CLASS);
	});
});
