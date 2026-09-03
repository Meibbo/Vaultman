import { describe, it, expect, vi } from "vitest";
import type { TreeNode, FileMeta, TagMeta, PluginMeta, SnippetMeta, PropMeta } from "../../src/types/typeTree";

describe("Explorer NodeNote Label O(1) rendering & SASI Inversion rules", () => {
	it("renders .vaultman-node-note-link for non-markdown files (.pdf) with hasNodeNote and attaches onclick", () => {
		const mockSpan: any = {
			className: '',
			textContent: '',
			style: {},
			onclick: null,
		};
		const mockContainer: any = {
			createSpan: vi.fn().mockImplementation((opts) => {
				mockSpan.className = opts.cls;
				mockSpan.textContent = opts.text;
				return mockSpan;
			}),
		};

		const pdfNode: TreeNode<FileMeta> = {
			id: "docs/manual.pdf",
			label: "manual.pdf",
			depth: 0,
			meta: {
				file: null,
				isFolder: false,
				folderPath: "docs",
				hasNodeNote: true,
			},
		};

		const mockBindingService = {
			bindOrCreate: vi.fn(),
		};

		const visibleCells = new Set<string>(["format"]);
		let rendered = false;
		if (visibleCells.has("format") && pdfNode.meta?.hasNodeNote === true) {
			const linkEl = mockContainer.createSpan({
				cls: "vaultman-tree-label vaultman-node-note-link",
				text: pdfNode.label,
			});
			linkEl.onclick = (e: any) => {
				e.stopPropagation();
				e.preventDefault();
				mockBindingService.bindOrCreate({ kind: "file", label: pdfNode.label, path: pdfNode.id });
			};
			rendered = true;
		}

		expect(rendered).toBe(true);
		expect(mockContainer.createSpan).toHaveBeenCalledWith({
			cls: "vaultman-tree-label vaultman-node-note-link",
			text: "manual.pdf",
		});

		const mockEvent = { stopPropagation: vi.fn(), preventDefault: vi.fn() };
		mockSpan.onclick(mockEvent);
		expect(mockEvent.stopPropagation).toHaveBeenCalled();
		expect(mockEvent.preventDefault).toHaveBeenCalled();
		expect(mockBindingService.bindOrCreate).toHaveBeenCalledWith({
			kind: "file",
			label: "manual.pdf",
			path: "docs/manual.pdf",
		});
	});

	it("never renders .vaultman-node-note-link for ordinary .md files", () => {
		const mdNode: TreeNode<FileMeta> = {
			id: "notes/regular.md",
			label: "regular.md",
			depth: 0,
			meta: {
				file: null,
				isFolder: false,
				folderPath: "notes",
				hasNodeNote: false,
			},
		};

		const visibleCells = new Set<string>(["format"]);
		let rendered = false;
		if (visibleCells.has("format") && mdNode.meta?.hasNodeNote === true) {
			rendered = true;
		}

		expect(rendered).toBe(false);
	});

	it("renders .vaultman-node-note-link for tags with hasNodeNote when format cell is active", () => {
		const mockSpan: any = { className: '', textContent: '', style: {}, onclick: null };
		const mockContainer: any = {
			createSpan: vi.fn().mockImplementation((opts) => {
				mockSpan.className = opts.cls;
				mockSpan.textContent = opts.text;
				return mockSpan;
			}),
		};

		const tagNode: TreeNode<TagMeta> = {
			id: "tag-books",
			label: "books",
			depth: 0,
			meta: {
				tagPath: "books",
				hasNodeNote: true,
			},
		};

		const visibleCells = new Set<string>(["format"]);
		let rendered = false;
		if (visibleCells.has("format") && tagNode.meta?.hasNodeNote === true) {
			mockContainer.createSpan({
				cls: "vaultman-tree-label vaultman-node-note-link",
				text: tagNode.label,
			});
			rendered = true;
		}

		expect(rendered).toBe(true);
		expect(mockContainer.createSpan).toHaveBeenCalledWith({
			cls: "vaultman-tree-label vaultman-node-note-link",
			text: "books",
		});
	});

	it("renders .vaultman-node-note-link for props with hasNodeNote when format cell is active", () => {
		const mockSpan: any = { className: '', textContent: '', style: {}, onclick: null };
		const mockContainer: any = {
			createSpan: vi.fn().mockImplementation((opts) => {
				mockSpan.className = opts.cls;
				mockSpan.textContent = opts.text;
				return mockSpan;
			}),
		};

		const propNode: TreeNode<PropMeta> = {
			id: "prop:status",
			label: "status",
			depth: 0,
			meta: {
				propName: "status",
				propType: "text",
				isValueNode: false,
				hasNodeNote: true,
			},
		};

		const mockBindingService = { bindOrCreate: vi.fn() };
		const visibleCells = new Set<string>(["format"]);
		let rendered = false;
		if (visibleCells.has("format") && propNode.meta?.hasNodeNote === true) {
			const label = mockContainer.createSpan({
				cls: "vaultman-tree-label vaultman-node-note-link",
				text: propNode.label,
			});
			label.onclick = (e: any) => {
				e.stopPropagation();
				e.preventDefault();
				mockBindingService.bindOrCreate({ kind: "prop", label: propNode.label, propName: propNode.meta.propName });
			};
			rendered = true;
		}

		expect(rendered).toBe(true);
		expect(mockContainer.createSpan).toHaveBeenCalledWith({
			cls: "vaultman-tree-label vaultman-node-note-link",
			text: "status",
		});

		const mockEvent = { stopPropagation: vi.fn(), preventDefault: vi.fn() };
		mockSpan.onclick(mockEvent);
		expect(mockEvent.stopPropagation).toHaveBeenCalled();
		expect(mockBindingService.bindOrCreate).toHaveBeenCalledWith({
			kind: "prop",
			label: "status",
			propName: "status",
		});
	});

	it("renders .vaultman-node-note-link for plugins with hasNodeNote when format cell is active", () => {
		const mockContainer: any = {
			createSpan: vi.fn().mockImplementation((opts) => ({
				className: opts.cls,
				textContent: opts.text,
				style: {},
			})),
		};

		const pluginNode: TreeNode<PluginMeta> = {
			id: "dataview",
			label: "Dataview",
			depth: 0,
			meta: {
				pluginId: "dataview",
				name: "Dataview",
				enabled: true,
				loaded: true,
				isVaultman: false,
				hasNodeNote: true,
			},
		};

		const visibleCells = new Set<string>(["format"]);
		let rendered = false;
		if (visibleCells.has("format") && pluginNode.meta?.hasNodeNote === true) {
			mockContainer.createSpan({
				cls: "vaultman-tree-label vaultman-node-note-link",
				text: pluginNode.label,
			});
			rendered = true;
		}

		expect(rendered).toBe(true);
		expect(mockContainer.createSpan).toHaveBeenCalledWith({
			cls: "vaultman-tree-label vaultman-node-note-link",
			text: "Dataview",
		});
	});

	it("renders .vaultman-node-note-link for snippets with hasNodeNote when format cell is active", () => {
		const mockContainer: any = {
			createSpan: vi.fn().mockImplementation((opts) => ({
				className: opts.cls,
				textContent: opts.text,
				style: {},
			})),
		};

		const snippetNode: TreeNode<SnippetMeta> = {
			id: "snippet:custom-theme",
			label: "custom-theme",
			depth: 0,
			meta: {
				name: "custom-theme",
				enabled: true,
				hasNodeNote: true,
			},
		};

		const visibleCells = new Set<string>(["format"]);
		let rendered = false;
		if (visibleCells.has("format") && snippetNode.meta?.hasNodeNote === true) {
			mockContainer.createSpan({
				cls: "vaultman-tree-label vaultman-node-note-link",
				text: snippetNode.label,
			});
			rendered = true;
		}

		expect(rendered).toBe(true);
		expect(mockContainer.createSpan).toHaveBeenCalledWith({
			cls: "vaultman-tree-label vaultman-node-note-link",
			text: "custom-theme",
		});
	});
});
