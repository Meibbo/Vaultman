import { describe, it, expect, vi } from 'vitest';
import { TFile, type App } from 'obsidian';
import {
	NodeBindingService,
	computeAliasToken,
	extractWikilinkTarget,
	aliasesContain,
} from '../../src/services/serviceNodeBinding';
import {
	handleNativeBindingClick,
	resolveNativeBindingTarget,
} from '../../src/services/serviceNativeSurfaceBinding';

describe('Adversarial Stress: Folder Node-Notes Resolution Priority', () => {
	it('P1: Prioritizes direct C-Node child match (folder/folder.md) over global alias scan', async () => {
		const mockCNode = { path: '+/+.md' } as TFile;
		const mockOpenFile = vi.fn().mockResolvedValue(undefined);
		const mockApp = {
			vault: {
				getAbstractFileByPath: vi.fn().mockImplementation((p: string) => (p === '+/+.md' ? mockCNode : null)),
				getMarkdownFiles: vi.fn().mockReturnValue([{ path: 'OtherNote.md' }]),
			},
			metadataCache: {
				getFileCache: vi.fn().mockReturnValue({ frontmatter: { aliases: ['+'] } }),
			},
			workspace: {
				getLeaf: vi.fn().mockReturnValue({ openFile: mockOpenFile }),
			},
		} as unknown as App;

		const service = new NodeBindingService({ app: mockApp });
		const result = await service.bindOrCreate({ kind: 'folder', label: '+', path: '+' });

		expect(result.outcome).toBe('opened');
		expect(result.filePath).toBe('+/+.md');
		expect(mockOpenFile).toHaveBeenCalledWith(mockCNode);
	});

	it('P2: Falls back to aliases match when direct C-Node does not exist', async () => {
		const mockAliasNote = { path: 'FolderIndex.md' } as TFile;
		const mockOpenFile = vi.fn().mockResolvedValue(undefined);
		const mockApp = {
			vault: {
				getAbstractFileByPath: vi.fn().mockReturnValue(null),
				getMarkdownFiles: vi.fn().mockReturnValue([mockAliasNote]),
			},
			metadataCache: {
				getFileCache: vi.fn().mockReturnValue({ frontmatter: { aliases: ['Projects/2026'] } }),
			},
			workspace: {
				getLeaf: vi.fn().mockReturnValue({ openFile: mockOpenFile }),
			},
		} as unknown as App;

		const service = new NodeBindingService({ app: mockApp });
		const result = await service.bindOrCreate({ kind: 'folder', label: '2026', path: 'Projects/2026' });

		expect(result.outcome).toBe('opened');
		expect(result.filePath).toBe('FolderIndex.md');
		expect(mockOpenFile).toHaveBeenCalledWith(mockAliasNote);
	});

	it('P3: Creates C-Node inside folder (folder/folder.md) with canonical aliases when 0 matches exist', async () => {
		const mockCreatedNote = { path: 'Archive/2025/2025.md' } as TFile;
		const mockCreate = vi.fn().mockResolvedValue(mockCreatedNote);
		const mockOpenFile = vi.fn().mockResolvedValue(undefined);
		const mockApp = {
			vault: {
				getAbstractFileByPath: vi.fn().mockReturnValue(null),
				getMarkdownFiles: vi.fn().mockReturnValue([]),
				create: mockCreate,
			},
			metadataCache: {
				getFileCache: vi.fn().mockReturnValue({}),
			},
			workspace: {
				getLeaf: vi.fn().mockReturnValue({ openFile: mockOpenFile }),
			},
		} as unknown as App;

		const service = new NodeBindingService({ app: mockApp });
		const result = await service.bindOrCreate({ kind: 'folder', label: '2025', path: 'Archive/2025' });

		expect(result.outcome).toBe('created');
		expect(result.filePath).toBe('Archive/2025/2025.md');
		expect(mockCreate).toHaveBeenCalledWith('Archive/2025/2025.md', expect.stringContaining('Archive/2025'));
	});
});

describe('Adversarial Stress: Non-Markdown Files & Wikilinks', () => {
	it('Non-markdown file (.pdf) matches note with aliases: ["manual.pdf"]', () => {
		const token = computeAliasToken({ kind: 'file', label: 'manual.pdf', path: 'manual.pdf' });
		expect(token).toBe('manual.pdf');
		expect(aliasesContain(['manual.pdf', 'docs'], token)).toBe(true);
	});

	it('Extracts target note from complex wikilinks', () => {
		expect(extractWikilinkTarget('[[User Manual]]')).toBe('User Manual');
		expect(extractWikilinkTarget('[[User Manual|Custom Label]]')).toBe('User Manual');
		expect(extractWikilinkTarget('[[Notes/Guide|Read Here]]')).toBe('Notes/Guide');
		expect(extractWikilinkTarget('plain string without links')).toBeNull();
	});

	it('Adopts existing note on collision and safely injects alias via processFrontMatter', async () => {
		const existingFile = { path: 'Dataview.md' } as TFile;
		const mockProcessFm = vi.fn().mockImplementation((_, callback) => {
			const fm: any = { aliases: ['other'] };
			callback(fm);
			expect(fm.aliases).toEqual(['other', '%dataview']);
		});
		const mockOpenFile = vi.fn().mockResolvedValue(undefined);
		const mockApp = {
			vault: {
				getAbstractFileByPath: vi.fn().mockImplementation((p: string) => (p === 'Dataview.md' ? existingFile : null)),
				getMarkdownFiles: vi.fn().mockReturnValue([existingFile]),
			},
			fileManager: {
				getNewFileParent: vi.fn().mockReturnValue({ path: '' }),
				processFrontMatter: mockProcessFm,
			},
			metadataCache: {
				getFileCache: vi.fn().mockReturnValue({ frontmatter: { aliases: ['other'] } }),
			},
			workspace: {
				getLeaf: vi.fn().mockReturnValue({ openFile: mockOpenFile }),
			},
		} as unknown as App;

		const service = new NodeBindingService({ app: mockApp });
		const result = await service.bindOrCreate({ kind: 'plugin', label: 'Dataview', pluginId: 'dataview' });

		expect(result.outcome).toBe('adopted');
		expect(result.filePath).toBe('Dataview.md');
		expect(mockProcessFm).toHaveBeenCalled();
		expect(mockOpenFile).toHaveBeenCalledWith(existingFile);
	});
});

describe('Adversarial Stress: WIR Modifiers & Capture Interception', () => {
	it('Routes alt click on breadcrumb to reveal-in-vaultman and stops propagation (primary plain never hijacks, task_108)', async () => {
		const mockReveal = vi.fn().mockResolvedValue(true);
		const mockBindOrCreate = vi.fn();
		const span = {
			classList: { contains: (c: string) => c === 'view-header-breadcrumb' },
			textContent: 'Projects',
			closest: (s: string) => (s.includes('view-header-breadcrumb') ? span : null),
		} as any;

		const event = {
			target: span,
			button: 0,
			ctrlKey: false,
			metaKey: false,
			altKey: true,
			preventDefault: vi.fn(),
			stopImmediatePropagation: vi.fn(),
		} as unknown as MouseEvent;

		const handled = await handleNativeBindingClick(event, {
			bindingService: { bindOrCreate: mockBindOrCreate } as any,
			settings: {
				nativeSurfaceClickPrimary: 'reveal-in-vaultman',
				nativeSurfaceClickAlt: 'reveal-in-vaultman',
				nativeSurfaceClickMod: 'open-node-note-new-tab',
			},
			revealInVaultman: mockReveal,
			app: {} as any,
		});

		expect(handled).toBe(true);
		expect(event.preventDefault).toHaveBeenCalled();
		expect(event.stopImmediatePropagation).toHaveBeenCalled();
		expect(mockReveal).toHaveBeenCalledWith(expect.objectContaining({ kind: 'folder', label: 'Projects' }));
		expect(mockBindOrCreate).not.toHaveBeenCalled();
	});

	it('Routes Mod+Click on breadcrumb to open-node-note-new-tab', async () => {
		const mockReveal = vi.fn();
		const mockBindOrCreate = vi.fn().mockResolvedValue({ outcome: 'opened' });
		const span = {
			classList: { contains: (c: string) => c === 'view-header-breadcrumb' },
			textContent: 'Projects',
			closest: (s: string) => (s.includes('view-header-breadcrumb') ? span : null),
		} as any;

		const event = {
			target: span,
			button: 0,
			ctrlKey: true,
			metaKey: false,
			altKey: false,
			preventDefault: vi.fn(),
			stopImmediatePropagation: vi.fn(),
		} as unknown as MouseEvent;

		const handled = await handleNativeBindingClick(event, {
			bindingService: { bindOrCreate: mockBindOrCreate } as any,
			settings: {
				nativeSurfaceClickPrimary: 'reveal-in-vaultman',
				nativeSurfaceClickAlt: 'open-node-note-same-tab',
				nativeSurfaceClickMod: 'open-node-note-new-tab',
			},
			revealInVaultman: mockReveal,
			app: {} as any,
		});

		expect(handled).toBe(true);
		expect(mockBindOrCreate).toHaveBeenCalledWith(
			expect.objectContaining({ kind: 'folder', label: 'Projects' }),
			{ newLeaf: true }
		);
		expect(mockReveal).not.toHaveBeenCalled();
	});
});

describe('Adversarial Stress: WIR Isolation & Vaultman Internal Surfaces', () => {
	it('Rejects and ignores events originating inside Vaultman internal views/tree rows', async () => {
		const vaultmanRow = {
			closest: (sel: string) => {
				if (sel.includes(".vaultman-tree-row") || sel.includes("data-type=\"vaultman-frame\"")) return vaultmanRow;
				return null;
			},
			getAttribute: (attr: string) => (attr === "data-path" ? "Projects/2026" : null),
			dataset: { path: "Projects/2026" },
		} as any;

		const target = resolveNativeBindingTarget(vaultmanRow);
		expect(target).toBeNull();

		const event = {
			target: vaultmanRow,
			button: 0,
			preventDefault: vi.fn(),
			stopImmediatePropagation: vi.fn(),
		} as unknown as MouseEvent;

		const handled = await handleNativeBindingClick(event, {
			bindingService: { bindOrCreate: vi.fn() } as any,
			settings: {
				nativeSurfaceClickPrimary: 'open-node-note-same-tab',
				nativeSurfaceClickAlt: 'open-node-note-same-tab',
				nativeSurfaceClickMod: 'open-node-note-new-tab',
			},
			app: {} as any,
		});

		expect(handled).toBe(false);
		expect(event.preventDefault).not.toHaveBeenCalled();
		expect(event.stopImmediatePropagation).not.toHaveBeenCalled();
	});
});
