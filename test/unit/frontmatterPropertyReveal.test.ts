import { describe, expect, it, vi } from 'vitest';

import {
	isCurrentFilePropertyRevealEligible,
	revealNativeFrontmatterProperty,
	routeVaultmanCurrentFileProperty,
} from '../../src/services/serviceFrontmatterPropertyReveal';

describe('current-file property reveal eligibility', () => {
	it('rejects a reveal pinned to another note (anchor pinned a otra ruta => cero jump/highlight)', () => {
		expect(
			isCurrentFilePropertyRevealEligible(
				{
					revealActive: true,
					scene_prop_reveal: true,
					revealAnchor: 'pinned',
					revealAnchorPath: 'notes/other.md',
					currentFilePath: 'notes/current.md',
				},
				'notes/current.md',
			),
		).toBe(false);
	});

	it('rejects a scene without reveal (instancia sin scene_prop_reveal => cero jump/highlight)', () => {
		expect(
			isCurrentFilePropertyRevealEligible(
				{
					revealActive: false,
					scene_prop_reveal: false,
					revealAnchor: 'current-file',
					revealAnchorPath: null,
					currentFilePath: 'notes/current.md',
				},
				'notes/current.md',
			),
		).toBe(false);

		expect(
			isCurrentFilePropertyRevealEligible(
				{
					revealAnchor: 'current-file',
					revealAnchorPath: null,
					currentFilePath: 'notes/current.md',
				},
				'notes/current.md',
			),
		).toBe(false);
	});

	it('accepts only the effective current-file anchor for the active note', () => {
		expect(
			isCurrentFilePropertyRevealEligible(
				{
					revealActive: true,
					scene_prop_reveal: true,
					revealAnchor: undefined,
					revealAnchorPath: null,
					currentFilePath: 'notes/current.md',
				},
				'notes/current.md',
			),
		).toBe(true);
	});
});

describe('Vaultman current-file property fan-out', () => {
	it('routes exactly once to each of two eligible instance identities (dos instancias elegibles del current file => ambas reciben exactamente un reveal)', () => {
		const first = vi.fn().mockReturnValue(true);
		const duplicate = vi.fn().mockReturnValue(true);
		const second = vi.fn().mockReturnValue(true);
		const count = routeVaultmanCurrentFileProperty(
			[
				{ view: { workspaceInstanceId: 'vm-1', revealCurrentFileProperty: first } },
				{ view: { workspaceInstanceId: 'vm-1', revealCurrentFileProperty: duplicate } },
				{ view: { workspaceInstanceId: 'vm-2', revealCurrentFileProperty: second } },
			],
			{ filePath: 'notes/current.md', propertyName: 'tags' },
		);

		expect(count).toBe(2);
		expect(first).toHaveBeenCalledOnce();
		expect(second).toHaveBeenCalledOnce();
		expect(duplicate).not.toHaveBeenCalled();
	});

	it('no usar document.querySelector para revelar filas virtualizadas de Vaultman', () => {
		const docSpy = vi.fn();
		// eslint-disable-next-line obsidianmd/no-global-this -- the test installs a document mock on globalThis
		const g = globalThis as { document?: unknown };
		const prev = g.document;
		g.document = { querySelector: docSpy };

		try {
			const target = vi.fn().mockReturnValue(true);
			const count = routeVaultmanCurrentFileProperty(
				[{ view: { workspaceInstanceId: 'vm-1', revealCurrentFileProperty: target } }],
				{ filePath: 'notes/current.md', propertyName: 'tags' },
			);

			expect(count).toBe(1);
			expect(target).toHaveBeenCalledOnce();
			expect(docSpy).not.toHaveBeenCalled();
		} finally {
			if (prev === undefined) {
				delete g.document;
			} else {
				g.document = prev;
			}
		}
	});

	it('counts neither pinned/no-reveal rejections nor malformed leaves', () => {
		const pinned = vi.fn().mockReturnValue(false);
		const noReveal = vi.fn().mockReturnValue(false);
		const count = routeVaultmanCurrentFileProperty(
			[
				{ view: { workspaceInstanceId: 'pinned', revealCurrentFileProperty: pinned } },
				{ view: { workspaceInstanceId: 'off', revealCurrentFileProperty: noReveal } },
				{ view: {} },
			],
			{ filePath: 'notes/current.md', propertyName: 'tags' },
		);

		expect(count).toBe(0);
		expect(pinned).toHaveBeenCalledOnce();
		expect(noReveal).toHaveBeenCalledOnce();
	});
});

describe('native Show properties in document reveal', () => {
	it('scrolls and highlights the tags row in Visible mode', async () => {
		const remove = vi.fn();
		const row = {
			scrollIntoView: vi.fn(),
			classList: { add: vi.fn(), remove },
			ownerDocument: { defaultView: { setTimeout: (fn: () => void) => (fn(), 1) } },
		};
		const leaf = {
			view: {
				file: { path: 'notes/current.md' },
				getMode: () => 'source',
				containerEl: { querySelector: vi.fn(() => row) },
			},
			getViewState: () => ({ state: { file: 'notes/current.md', mode: 'source', source: false } }),
		};
		const app = {
			vault: { getConfig: () => 'visible' },
			workspace: {
				getLeavesOfType: () => [leaf],
				getActiveViewOfType: () => leaf.view,
			},
		};

		await expect(
			revealNativeFrontmatterProperty(app as never, { path: 'notes/current.md' } as never, 'tags'),
		).resolves.toBe(true);
		expect(row.scrollIntoView).toHaveBeenCalledOnce();
		expect(row.classList.add).toHaveBeenCalledOnce();
		expect(remove).toHaveBeenCalledOnce();
	});

	it('uses the editor offset and match state in Source mode', async () => {
		const editor = {
			offsetToPos: vi.fn(() => ({ line: 1, ch: 0 })),
			setCursor: vi.fn(),
			scrollIntoView: vi.fn(),
		};
		const view = {
			file: { path: 'notes/current.md' },
			getMode: () => 'source',
			editor,
			containerEl: { querySelector: vi.fn(() => null) },
		};
		const leaf = {
			view,
			getViewState: () => ({ state: { file: 'notes/current.md', mode: 'source', source: false } }),
			openFile: vi.fn().mockResolvedValue(undefined),
		};
		const app = {
			vault: { getConfig: () => 'source' },
			workspace: {
				getLeavesOfType: () => [leaf],
				getActiveViewOfType: () => view,
				setActiveLeaf: vi.fn(),
				getLeaf: vi.fn(() => leaf),
			},
		};

		await expect(
			revealNativeFrontmatterProperty(
				app as never,
				{ path: 'notes/current.md' } as never,
				'tags',
				{ offset: 4, content: '---\ntags: [a]\n---', range: [4, 8] },
			),
		).resolves.toBe(true);
		expect(leaf.openFile).toHaveBeenCalledOnce();
		const openArgs = leaf.openFile.mock.calls[0];
		expect(openArgs?.[1]).toHaveProperty('eState');
		expect(editor.setCursor).toHaveBeenCalledOnce();
	});

	it('does not jump when Properties in document is Hidden', async () => {
		const querySelector = vi.fn(() => null);
		const leaf = {
			view: {
				file: { path: 'notes/current.md' },
				getMode: () => 'source',
				containerEl: { querySelector },
			},
			getViewState: () => ({
				state: { file: 'notes/current.md', mode: 'source', source: false },
			}),
			openFile: vi.fn(),
		};
		const app = {
			vault: { getConfig: () => 'hidden' },
			workspace: {
				getLeavesOfType: () => [leaf],
				getActiveViewOfType: () => leaf.view,
			},
		};

		await expect(
			revealNativeFrontmatterProperty(
				app as never,
				{ path: 'notes/current.md' } as never,
				'tags',
				{ offset: 4, content: '---\ntags: [a]\n---', range: [4, 8] },
			),
		).resolves.toBe(false);
		expect(querySelector).not.toHaveBeenCalled();
		expect(leaf.openFile).not.toHaveBeenCalled();
	});

	it('does not throw when the native property surface is absent', async () => {
		const leaf = {
			view: {
				file: { path: 'notes/current.md' },
				getMode: () => 'preview',
				containerEl: { querySelector: vi.fn(() => null) },
			},
			getViewState: () => ({ state: { file: 'notes/current.md', mode: 'preview' } }),
		};
		const app = {
			workspace: {
				getLeavesOfType: () => [leaf],
				getActiveViewOfType: () => leaf.view,
			},
		};

		await expect(
			revealNativeFrontmatterProperty(app as never, { path: 'notes/current.md' } as never, 'tags'),
		).resolves.toBe(false);
	});
});

describe('A10 — plan de reveal expande antes de resaltar', () => {
	it('expande is-collapsed y luego resalta la fila', async () => {
		let collapsed = true;
		const containerRemove = vi.fn();
		const rowAdd = vi.fn();
		const rowRemove = vi.fn();

		const row = {
			scrollIntoView: vi.fn(),
			classList: { add: rowAdd, remove: rowRemove },
			ownerDocument: { defaultView: { setTimeout: (fn: () => void) => (fn(), 1) } },
		};

		const container = {
			classList: {
				contains: (cls: string) => cls === 'is-collapsed' && collapsed,
				remove: (cls: string) => {
					if (cls === 'is-collapsed') collapsed = false;
					containerRemove(cls);
				},
			},
			querySelector: vi.fn(() => ({ click: vi.fn() })),
		};

		const querySelector = vi.fn((selector: string) => {
			if (selector === '.metadata-container') return container;
			if (selector === '.metadata-property[data-property-key="tags"]') {
				return collapsed ? null : row;
			}
			return null;
		});

		const root = { querySelector };
		const leaf = { view: { containerEl: root, file: { path: 'notes/current.md' } } };
		const app = {
			vault: { getConfig: () => 'visible' },
			workspace: {
				getLeavesOfType: () => [leaf],
				getActiveViewOfType: () => leaf.view,
			},
		};

		const result = await revealNativeFrontmatterProperty(
			app as never,
			{ path: 'notes/current.md' } as never,
			'tags',
		);

		expect(result).toBe(true);
		expect(containerRemove).toHaveBeenCalledWith('is-collapsed');
		expect(rowAdd).toHaveBeenCalledWith('is-flashing');
	});

	it('no toca el toggle si el bloque ya está expandido', async () => {
		const containerRemove = vi.fn();
		const rowAdd = vi.fn();

		const row = {
			scrollIntoView: vi.fn(),
			classList: { add: rowAdd, remove: vi.fn() },
			ownerDocument: { defaultView: { setTimeout: (fn: () => void) => (fn(), 1) } },
		};

		const container = {
			classList: { contains: () => false, remove: containerRemove },
			querySelector: vi.fn(() => ({ click: vi.fn() })),
		};

		const querySelector = vi.fn((selector: string) => {
			if (selector === '.metadata-container') return container;
			if (selector === '.metadata-property[data-property-key="tags"]') return row;
			return null;
		});

		const root = { querySelector };
		const leaf = { view: { containerEl: root, file: { path: 'notes/current.md' } } };
		const app = {
			vault: { getConfig: () => 'visible' },
			workspace: {
				getLeavesOfType: () => [leaf],
				getActiveViewOfType: () => leaf.view,
			},
		};

		const result = await revealNativeFrontmatterProperty(
			app as never,
			{ path: 'notes/current.md' } as never,
			'tags',
		);

		expect(result).toBe(true);
		expect(containerRemove).not.toHaveBeenCalled();
		expect(rowAdd).toHaveBeenCalledWith('is-flashing');
	});
});

describe('A11 — Visible resalta la pill del valor', () => {
	it('flashea SOLO la pill que coincide con el valor', async () => {
		const pillAAdd = vi.fn();
		const pillBAdd = vi.fn();
		const pillCAdd = vi.fn();
		const rowAdd = vi.fn();

		const pillA = {
			classList: { add: pillAAdd, remove: vi.fn() },
			querySelector: vi.fn(() => ({ textContent: 'a' })),
		};
		const pillB = {
			classList: { add: pillBAdd, remove: vi.fn() },
			querySelector: vi.fn(() => ({ textContent: 'b' })),
		};
		const pillC = {
			classList: { add: pillCAdd, remove: vi.fn() },
			querySelector: vi.fn(() => ({ textContent: 'c' })),
		};

		const row = {
			scrollIntoView: vi.fn(),
			classList: { add: rowAdd, remove: vi.fn() },
			ownerDocument: { defaultView: { setTimeout: (fn: () => void) => (fn(), 1) } },
			querySelectorAll: vi.fn(() => [pillA, pillB, pillC]),
		};

		const querySelector = vi.fn((selector: string) => {
			if (selector === '.metadata-container') return null;
			if (selector === '.metadata-property[data-property-key="tags"]') return row;
			return null;
		});

		const root = { querySelector };
		const leaf = { view: { containerEl: root, file: { path: 'notes/current.md' } } };
		const app = {
			vault: { getConfig: () => 'visible' },
			workspace: {
				getLeavesOfType: () => [leaf],
				getActiveViewOfType: () => leaf.view,
			},
		};

		const result = await revealNativeFrontmatterProperty(
			app as never,
			{ path: 'notes/current.md' } as never,
			'tags',
			undefined,
			'b',
		);

		expect(result).toBe(true);
		expect(pillAAdd).not.toHaveBeenCalled();
		expect(pillBAdd).toHaveBeenCalledWith('is-flashing');
		expect(pillCAdd).not.toHaveBeenCalled();
		expect(rowAdd).not.toHaveBeenCalled();
	});

	it('sin valor flashea la fila (comportamiento por defecto)', async () => {
		const rowAdd = vi.fn();

		const row = {
			scrollIntoView: vi.fn(),
			classList: { add: rowAdd, remove: vi.fn() },
			ownerDocument: { defaultView: { setTimeout: (fn: () => void) => (fn(), 1) } },
			querySelectorAll: vi.fn(() => []),
		};

		const querySelector = vi.fn((selector: string) => {
			if (selector === '.metadata-container') return null;
			if (selector === '.metadata-property[data-property-key="tags"]') return row;
			return null;
		});

		const root = { querySelector };
		const leaf = { view: { containerEl: root, file: { path: 'notes/current.md' } } };
		const app = {
			vault: { getConfig: () => 'visible' },
			workspace: {
				getLeavesOfType: () => [leaf],
				getActiveViewOfType: () => leaf.view,
			},
		};

		const result = await revealNativeFrontmatterProperty(
			app as never,
			{ path: 'notes/current.md' } as never,
			'tags',
		);

		expect(result).toBe(true);
		expect(rowAdd).toHaveBeenCalledWith('is-flashing');
	});
});
