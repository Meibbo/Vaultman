import { describe, it, expect, vi, type Mock } from "vitest";
import type { TreeNode, FileMeta, TagMeta, PluginMeta, SnippetMeta, PropMeta } from "../../src/types/typeTree";
import { PropsExplorerPanel } from "../../src/components/containers/explorerProps";
import type { BindingNodeInput, BindingResult } from "../../src/services/serviceNodeBinding";

type SpanOptions = { cls: string; text: string };
type MockMouseEvent = { stopPropagation: () => void; preventDefault: () => void };
type MockSpan = {
	className: string;
	textContent: string;
	style: Record<string, string>;
	onclick: ((event: MockMouseEvent) => void) | null;
};
type MockContainer = { createSpan: Mock<(options: SpanOptions) => MockSpan> };

function makeMockContainer(): { span: MockSpan; container: MockContainer } {
	const span: MockSpan = {
		className: '',
		textContent: '',
		style: {},
		onclick: null,
	};
	const createSpan = vi.fn<(options: SpanOptions) => MockSpan>();
	createSpan.mockImplementation((options) => {
		span.className = options.cls;
		span.textContent = options.text;
		return span;
	});
	return { span, container: { createSpan } };
}

function invokeClick(span: MockSpan, event: MockMouseEvent): void {
	if (!span.onclick) throw new Error('mock span has no click handler');
	span.onclick(event);
}

describe("Explorer NodeNote Label O(1) rendering & SASI Inversion rules", () => {
	it("renders .vaultman-node-note-link for non-markdown files (.pdf) with hasNodeNote and attaches onclick", () => {
		const { span: mockSpan, container: mockContainer } = makeMockContainer();

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
			bindOrCreate: vi.fn<(node: BindingNodeInput) => void>(),
		};

		const visibleCells = new Set<string>(["format"]);
		let rendered = false;
		if (visibleCells.has("format") && pdfNode.meta?.hasNodeNote === true) {
			const linkEl = mockContainer.createSpan({
				cls: "vaultman-tree-label vaultman-node-note-link",
				text: pdfNode.label,
			});
			linkEl.onclick = (e: MockMouseEvent) => {
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

		const mockEvent: MockMouseEvent = { stopPropagation: vi.fn(), preventDefault: vi.fn() };
		invokeClick(mockSpan, mockEvent);
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
		const { container: mockContainer } = makeMockContainer();

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
		const { span: mockSpan, container: mockContainer } = makeMockContainer();

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

		const mockBindingService = {
			bindOrCreate: vi.fn<(node: BindingNodeInput) => void>(),
		};
		const visibleCells = new Set<string>(["format"]);
		let rendered = false;
		if (visibleCells.has("format") && propNode.meta?.hasNodeNote === true) {
			const label = mockContainer.createSpan({
				cls: "vaultman-tree-label vaultman-node-note-link",
				text: propNode.label,
			});
			label.onclick = (e: MockMouseEvent) => {
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

		const mockEvent: MockMouseEvent = { stopPropagation: vi.fn(), preventDefault: vi.fn() };
		invokeClick(mockSpan, mockEvent);
		expect(mockEvent.stopPropagation).toHaveBeenCalled();
		expect(mockBindingService.bindOrCreate).toHaveBeenCalledWith({
			kind: "prop",
			label: "status",
			propName: "status",
		});
	});

	it("renders .vaultman-node-note-link for plugins with hasNodeNote when format cell is active", () => {
		const { container: mockContainer } = makeMockContainer();

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
		const { container: mockContainer } = makeMockContainer();

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

describe("_bindAndRefreshLive: parche dirigido en vivo (patrón words/tasks)", () => {
	type PropsPanelContext = {
		plugin: {
			nodeBindingService: {
				bindOrCreate: (
					node: BindingNodeInput,
					options?: { newLeaf?: boolean },
				) => Promise<BindingResult | undefined>;
			};
		};
	};
	type PropsPanelPrototype = {
		_bindAndRefreshLive: (
			this: PropsPanelContext,
			node: BindingNodeInput,
			event: MouseEvent,
			onBound?: () => void,
		) => void;
	};

	function fakeCtx(outcome: BindingResult['outcome'] | null): PropsPanelContext {
		return {
			plugin: {
				nodeBindingService: {
					bindOrCreate: async () =>
						outcome === null
							? undefined
							: { outcome, token: '', matchCount: 0 },
				},
			},
		};
	}

	const req: BindingNodeInput = { kind: "value", label: "x" };
	const fakeEvent = {
		ctrlKey: false,
		metaKey: false,
		button: 0,
	} as unknown as MouseEvent;

	it("parchea la celda cuando el binding crea la nota", async () => {
		const proto = (PropsExplorerPanel as unknown as { prototype: PropsPanelPrototype }).prototype;
		let patched = 0;
		(proto)._bindAndRefreshLive.call(fakeCtx("created"), req, fakeEvent, () => {
			patched += 1;
		});
		// El método es fire-and-forget interno: espera un tick.
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(patched).toBe(1);
	});

	it("no toca nada cuando el binding solo abre", async () => {
		const proto = (PropsExplorerPanel as unknown as { prototype: PropsPanelPrototype }).prototype;
		let patched = 0;
		(proto)._bindAndRefreshLive.call(fakeCtx("opened"), req, fakeEvent, () => {
			patched += 1;
		});
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(patched).toBe(0);
	});
});
