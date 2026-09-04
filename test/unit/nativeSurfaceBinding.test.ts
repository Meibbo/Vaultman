import { describe, it, expect, vi } from "vitest";
import {
	decorateBoundBreadcrumbs,
	handleInternalNodeNoteHover,
	resolveBreadcrumbFolderPath,
	resolveNativeBindingTarget,
	handleNativeBindingClick,
	handleNativeBindingHover,
	NATIVE_SURFACE_HOVER_SOURCE,
} from "../../src/services/serviceNativeSurfaceBinding";

function mockElement(opts: {
	classes?: string[];
	attributes?: Record<string, string>;
	dataset?: Record<string, string>;
	textContent?: string;
	parent?: any;
	children?: any[];
} = {}) {
	const classes = new Set(opts.classes ?? []);
	const attributes = { ...(opts.attributes ?? {}) };
	const dataset = { ...(opts.dataset ?? {}) };
	const textContent = opts.textContent ?? "";
	const children = opts.children ?? [];

	const el: any = {
		className: Array.from(classes).join(" "),
		classList: {
			contains: (cls: string) => classes.has(cls),
		},
		dataset,
		textContent,
		parent: opts.parent ?? null,
		getAttribute: (attr: string) => attributes[attr] ?? null,
		closest: function (selector: string) {
			const parts = selector.split(",").map((s: string) => s.trim());
			for (const part of parts) {
				if (
					part.includes('[data-type="vaultman-frame"]') ||
					part.includes('[data-type="vaultman-view"]')
				) {
					if (
						classes.has("workspace-leaf-content") &&
						(attributes["data-type"] === "vaultman-frame" ||
							attributes["data-type"] === "vaultman-view")
					) {
						return this;
					}
					continue;
				}
				if (part.startsWith(".")) {
					const className = part.slice(1).split("[")[0].split(":")[0];
					if (classes.has(className)) return this;
				}
				if (part.includes("[data-path]") && attributes["data-path"] !== undefined) return this;
				if (part.includes("[href]") && attributes["href"] !== undefined) return this;
				if (part.includes("[data-snippet-name]") && dataset.snippetName !== undefined) return this;
				if (part.includes("[data-plugin-id]") && dataset.pluginId !== undefined) return this;
				if (part.includes("a.tag") && classes.has("tag")) return this;
			}
			if (this.parent) return this.parent.closest(selector);
			return null;
		},
		querySelectorAll: (selector: string) => {
			if (selector.includes("view-header-breadcrumb")) return children;
			return [];
		},
		querySelector: () => null,
	};

	for (const child of children) {
		child.parent = el;
	}
	return el;
}

describe("resolveBreadcrumbFolderPath", () => {
	it("resolves slice path based on breadcrumb index in view-header-title-parent", () => {
		const b1 = mockElement({ classes: ["view-header-breadcrumb"], textContent: "Projects" });
		const b2 = mockElement({ classes: ["view-header-breadcrumb"], textContent: "2026" });
		void mockElement({
			classes: ["view-header-title-parent"],
			children: [b1, b2],
		});

		const mockApp: any = {
			workspace: {
				getActiveFile: () => ({
					parent: { path: "Projects/2026" },
				}),
			},
		};

		expect(resolveBreadcrumbFolderPath(b1, mockApp)).toBe("Projects");
		expect(resolveBreadcrumbFolderPath(b2, mockApp)).toBe("Projects/2026");
	});
});

describe("resolveNativeBindingTarget", () => {
	it("resolves breadcrumb element to folder target", () => {
		const b1 = mockElement({ classes: ["view-header-breadcrumb"], textContent: "Docs" });
		void mockElement({
			classes: ["view-header-title-parent"],
			children: [b1],
		});

		const mockApp: any = {
			workspace: {
				getActiveFile: () => ({
					parent: { path: "Docs" },
				}),
			},
		};

		const target = resolveNativeBindingTarget(b1, mockApp);
		expect(target).not.toBeNull();
		expect(target?.node.kind).toBe("folder");
		expect(target?.node.path).toBe("Docs");
		expect(target?.isBreadcrumb).toBe(true);
	});

	it("resolves tag element from cm-hashtag", () => {
		const span = mockElement({
			classes: ["cm-hashtag"],
			textContent: "#work/urgent",
		});

		const target = resolveNativeBindingTarget(span);
		expect(target).not.toBeNull();
		expect(target?.node.kind).toBe("tag");
		expect(target?.node.label).toBe("work/urgent");
	});

	it("ignores clicks originating inside Vaultman internal views", () => {
		const row = mockElement({ classes: ["vaultman-tree-row"] });
		const innerSpan = mockElement({ classes: ["cm-hashtag"], parent: row, textContent: "#tag" });

		const target = resolveNativeBindingTarget(innerSpan);
		expect(target).toBeNull();
	});
});

describe("handleNativeBindingClick with WIR routing", () => {
	it("executes reveal-in-vaultman on alt click for breadcrumbs (primary plain never hijacks)", async () => {
		const b = mockElement({ classes: ["view-header-breadcrumb"], textContent: "Inbox" });
		void mockElement({ classes: ["view-header-title-parent"], children: [b] });

		const mockReveal = vi.fn().mockResolvedValue(true);
		const mockBindOrCreate = vi.fn();
		const mockApp: any = {
			workspace: {
				getActiveFile: () => ({ parent: { path: "Inbox" } }),
			},
		};

		const event = {
			target: b,
			ctrlKey: false,
			metaKey: false,
			altKey: true,
			button: 0,
			preventDefault: vi.fn(),
			stopImmediatePropagation: vi.fn(),
		} as unknown as MouseEvent;

		const handled = await handleNativeBindingClick(event, {
			bindingService: { bindOrCreate: mockBindOrCreate },
			settings: {
				nativeSurfaceClickPrimary: "reveal-in-vaultman",
				nativeSurfaceClickAlt: "reveal-in-vaultman",
				nativeSurfaceClickMod: "open-node-note-new-tab",
			},
			revealInVaultman: mockReveal,
			app: mockApp,
		});

		expect(handled).toBe(true);
		expect(mockReveal).toHaveBeenCalledWith(expect.objectContaining({ kind: "folder", path: "Inbox" }));
		expect(mockBindOrCreate).not.toHaveBeenCalled();
		expect(event.preventDefault).toHaveBeenCalled();
	});

	it("executes searchInVaultman when alt action is search-selection (primary plain never hijacks)", async () => {
		const span = mockElement({ classes: ["cm-hashtag"], textContent: "#research" });
		const mockSearch = vi.fn();

		const event = {
			target: span,
			ctrlKey: false,
			metaKey: false,
			altKey: true,
			button: 0,
			preventDefault: vi.fn(),
			stopImmediatePropagation: vi.fn(),
		} as unknown as MouseEvent;

		const handled = await handleNativeBindingClick(event, {
			bindingService: { bindOrCreate: vi.fn() },
			settings: {
				nativeSurfaceClickPrimary: "search-selection",
				nativeSurfaceClickAlt: "search-selection",
				nativeSurfaceClickMod: "open-node-note-new-tab",
			},
			searchInVaultman: mockSearch,
		});

		expect(handled).toBe(true);
		expect(mockSearch).toHaveBeenCalledWith("research");
		expect(event.preventDefault).toHaveBeenCalled();
	});
});

describe("task_108 surface-guard negativos (primario llano nunca suprime)", () => {
	function plainPrimary(target: any) {
		return {
			target,
			ctrlKey: false,
			metaKey: false,
			altKey: false,
			button: 0,
			preventDefault: vi.fn(),
			stopImmediatePropagation: vi.fn(),
		} as unknown as MouseEvent;
	}

	const defaultSettings = {
		nativeSurfaceClickPrimary: "reveal-in-vaultman" as const,
		nativeSurfaceClickAlt: "open-node-note-same-tab" as const,
		nativeSurfaceClickMod: "open-node-note-new-tab" as const,
	};

	it("P1: fila [data-plugin-id] de settings no resuelve ni suprime", async () => {
		const row = mockElement({ dataset: { pluginId: "some-plugin" } });
		expect(resolveNativeBindingTarget(row)).toBeNull();

		const event = plainPrimary(row);
		const handled = await handleNativeBindingClick(event, {
			bindingService: { bindOrCreate: vi.fn() },
			settings: defaultSettings,
			revealInVaultman: vi.fn().mockResolvedValue(true),
		});

		expect(handled).toBe(false);
		expect(event.preventDefault).not.toHaveBeenCalled();
		expect(event.stopImmediatePropagation).not.toHaveBeenCalled();
	});

	it("primario llano sobre tag allowlistada no suprime", async () => {
		const span = mockElement({ classes: ["cm-hashtag"], textContent: "#research" });
		const event = plainPrimary(span);
		const handled = await handleNativeBindingClick(event, {
			bindingService: { bindOrCreate: vi.fn() },
			settings: defaultSettings,
			revealInVaultman: vi.fn().mockResolvedValue(true),
		});

		expect(handled).toBe(false);
		expect(event.preventDefault).not.toHaveBeenCalled();
	});

	it("tag dentro de .modal-container no resuelve (exclusion expresa)", () => {
		const modal = mockElement({ classes: ["modal-container"] });
		const inner = mockElement({ classes: ["cm-hashtag"], parent: modal, textContent: "#research" });

		expect(resolveNativeBindingTarget(inner)).toBeNull();
	});

	it("superficie desconocida conserva nativo", async () => {
		const unknown = mockElement({ classes: ["random-unknown"], textContent: "x" });
		expect(resolveNativeBindingTarget(unknown)).toBeNull();

		const event = plainPrimary(unknown);
		const handled = await handleNativeBindingClick(event, {
			bindingService: { bindOrCreate: vi.fn() },
			settings: defaultSettings,
		});

		expect(handled).toBe(false);
		expect(event.preventDefault).not.toHaveBeenCalled();
	});
});

describe("ISSUE 2: breadcrumb con nota bindeada lleva vaultman-node-note-link", () => {
	function breadcrumbEl() {
		const added: string[] = [];
		const el: any = {
			dataset: {},
			textContent: "Projects",
			getAttribute: (attr: string) => (attr === "data-path" ? "Projects" : null),
			classList: {
				contains: () => false,
				add: (cls: string) => { added.push(cls); },
			},
			closest: (selector: string) => {
				if (selector.includes("view-header-breadcrumb")) return el;
				return null;
			},
			querySelectorAll: () => [],
			querySelector: () => null,
			added,
		};
		return el;
	}

	function folderApp(files: any[], aliases: unknown = {}) {
		return {
			vault: { getMarkdownFiles: () => files },
			metadataCache: { getFileCache: () => ({ frontmatter: { aliases } }) },
		} as any;
	}

	it("anade la clase cuando existe el C-node del folder", () => {
		const el = breadcrumbEl();
		const target = resolveNativeBindingTarget(el, folderApp([{ path: "Projects/Projects.md" }]));
		expect(target?.node.kind).toBe("folder");
		expect(el.added).toContain("vaultman-node-note-link");
	});

	it("anade la clase cuando hay nota por alias del folder", () => {
		const el = breadcrumbEl();
		const target = resolveNativeBindingTarget(el, folderApp([{ path: "Notes/X.md" }], ["Projects"]));
		expect(target).not.toBeNull();
		expect(el.added).toContain("vaultman-node-note-link");
	});

	it("no decora sin nota bindeada ni sin app", () => {
		const el = breadcrumbEl();
		const target = resolveNativeBindingTarget(el, folderApp([]));
		expect(target?.node.kind).toBe("folder");
		expect(el.added).not.toContain("vaultman-node-note-link");

		const el2 = breadcrumbEl();
		resolveNativeBindingTarget(el2);
		expect(el2.added).not.toContain("vaultman-node-note-link");
	});
});

describe("ISSUE 2: decorateBoundBreadcrumbs proactivo al render", () => {
	function crumbEl(path: string, added: string[]) {
		const el: any = {
			dataset: {},
			textContent: path,
			getAttribute: (attr: string) => (attr === "data-path" ? path : null),
			classList: {
				contains: () => false,
				add: (cls: string) => { added.push(cls); },
			},
			closest: (selector: string) => {
				if (selector.includes("view-header-breadcrumb")) return el;
				return null;
			},
			querySelectorAll: () => [],
			querySelector: () => null,
		};
		return el;
	}

	function fakeDoc(crumbs: any[]) {
		return { querySelectorAll: (sel: string) => (sel === ".view-header-breadcrumb" ? crumbs : []) } as any;
	}

	function folderApp(files: any[], aliases: unknown = {}) {
		return {
			vault: { getMarkdownFiles: () => files },
			metadataCache: { getFileCache: () => ({ frontmatter: { aliases } }) },
		} as any;
	}

	it("decora todos los breadcrumbs bindeados sin esperar click", () => {
		const addedBound: string[] = [];
		const addedPlain: string[] = [];
		const doc = fakeDoc([crumbEl("Projects", addedBound), crumbEl("Inbox", addedPlain)]);
		decorateBoundBreadcrumbs(doc, folderApp([{ path: "Projects/Projects.md" }]));
		expect(addedBound).toContain("vaultman-node-note-link");
		expect(addedPlain).not.toContain("vaultman-node-note-link");
	});

	it("no hace nada sin doc ni sin app", () => {
		expect(() => decorateBoundBreadcrumbs(undefined, folderApp([]))).not.toThrow();
		expect(() => decorateBoundBreadcrumbs(fakeDoc([]))).not.toThrow();
	});
});

describe("handleNativeBindingHover", () => {
	it("triggers hover-link on native tag when bound note exists", () => {
		const span = mockElement({ classes: ["cm-hashtag"], textContent: "#books" });
		const mockTrigger = vi.fn();
		const mockFile = { path: "Notes/Books.md" };

		const mockApp: any = {
			vault: {
				getMarkdownFiles: () => [mockFile],
			},
			metadataCache: {
				getFileCache: () => ({ frontmatter: { aliases: ["#books"] } }),
			},
			workspace: {
				trigger: mockTrigger,
			},
		};

		const event = { target: span, ctrlKey: true, metaKey: false } as unknown as MouseEvent;
		const handled = handleNativeBindingHover(event, { app: mockApp });

		expect(handled).toBe(true);
		expect(mockTrigger).toHaveBeenCalledWith("hover-link", expect.objectContaining({
			source: NATIVE_SURFACE_HOVER_SOURCE,
			linktext: "Notes/Books.md",
		}));
	});

	it("ISSUE 3: plain mouseover sin ctrl/meta no dispara preview", () => {
		const span = mockElement({ classes: ["cm-hashtag"], textContent: "#books" });
		const mockTrigger = vi.fn();
		const mockApp: any = {
			vault: { getMarkdownFiles: () => [{ path: "Notes/Books.md" }] },
			metadataCache: {
				getFileCache: () => ({ frontmatter: { aliases: ["#books"] } }),
			},
			workspace: { trigger: mockTrigger },
		};

		const event = {
			target: span,
			ctrlKey: false,
			metaKey: false,
			altKey: false,
		} as unknown as MouseEvent;
		expect(handleNativeBindingHover(event, { app: mockApp })).toBe(false);
		expect(mockTrigger).not.toHaveBeenCalled();
	});

	it("ISSUE 3: ctrl+hover y meta+hover si disparan preview", () => {
		const span = mockElement({ classes: ["cm-hashtag"], textContent: "#books" });
		const mockTrigger = vi.fn();
		const mockApp: any = {
			vault: { getMarkdownFiles: () => [{ path: "Notes/Books.md" }] },
			metadataCache: {
				getFileCache: () => ({ frontmatter: { aliases: ["#books"] } }),
			},
			workspace: { trigger: mockTrigger },
		};

		const ctrlEvent = { target: span, ctrlKey: true, metaKey: false } as unknown as MouseEvent;
		expect(handleNativeBindingHover(ctrlEvent, { app: mockApp })).toBe(true);
		const metaEvent = { target: span, ctrlKey: false, metaKey: true } as unknown as MouseEvent;
		expect(handleNativeBindingHover(metaEvent, { app: mockApp })).toBe(true);
		expect(mockTrigger).toHaveBeenCalledTimes(2);
	});

	it("ISSUE 3: ctrl+hover sobre fila de archivo dispara preview del propio archivo", () => {
		const row = mockElement({
			classes: ["nav-file-title"],
			attributes: { "data-path": "Notes/A.md" },
			textContent: "A",
		});
		const mockTrigger = vi.fn();
		const mockApp: any = {
			vault: { getMarkdownFiles: () => [{ path: "Notes/A.md" }] },
			metadataCache: { getFileCache: () => ({}) },
			workspace: { trigger: mockTrigger },
		};

		const event = { target: row, ctrlKey: true, metaKey: false } as unknown as MouseEvent;
		expect(handleNativeBindingHover(event, { app: mockApp })).toBe(true);
		expect(mockTrigger).toHaveBeenCalledWith("hover-link", expect.objectContaining({
			linktext: "Notes/A.md",
		}));
	});

	it("ISSUE 3: hover sobre archivo desconocido o llano no dispara", () => {
		const row = mockElement({
			classes: ["nav-file-title"],
			attributes: { "data-path": "Notes/A.md" },
			textContent: "A",
		});
		const mockTrigger = vi.fn();
		const mockApp: any = {
			vault: { getMarkdownFiles: () => [] },
			metadataCache: { getFileCache: () => ({}) },
			workspace: { trigger: mockTrigger },
		};

		const unknownEvent = { target: row, ctrlKey: true, metaKey: false } as unknown as MouseEvent;
		expect(handleNativeBindingHover(unknownEvent, { app: mockApp })).toBe(false);
		const plainEvent = { target: row, ctrlKey: false, metaKey: false } as unknown as MouseEvent;
		expect(handleNativeBindingHover(plainEvent, { app: mockApp })).toBe(false);
		expect(mockTrigger).not.toHaveBeenCalled();
	});

	it("ISSUE 3: file hover usa lookup directo sin indice de markdown", () => {
		const row = mockElement({
			classes: ["nav-file-title"],
			attributes: { "data-path": "Notes/A.md" },
			textContent: "A",
		});
		const mockTrigger = vi.fn();
		const mockApp: any = {
			vault: {
				getMarkdownFiles: () => [],
				getAbstractFileByPath: (p: string) => (p === "Notes/A.md" ? { path: p } : null),
			},
			metadataCache: { getFileCache: () => ({}) },
			workspace: { trigger: mockTrigger },
		};

		const event = { target: row, ctrlKey: true, metaKey: false } as unknown as MouseEvent;
		expect(handleNativeBindingHover(event, { app: mockApp })).toBe(true);
		expect(mockTrigger).toHaveBeenCalledWith("hover-link", expect.objectContaining({
			linktext: "Notes/A.md",
		}));
	});

	it("ISSUE 3: file hover ignora carpetas en lookup directo", () => {
		const row = mockElement({
			classes: ["nav-file-title"],
			attributes: { "data-path": "Notes" },
			textContent: "Notes",
		});
		const mockTrigger = vi.fn();
		const mockApp: any = {
			vault: {
				getMarkdownFiles: () => [],
				getAbstractFileByPath: (p: string) => (p === "Notes" ? { path: p, children: [] } : null),
			},
			metadataCache: { getFileCache: () => ({}) },
			workspace: { trigger: mockTrigger },
		};

		const event = { target: row, ctrlKey: true, metaKey: false } as unknown as MouseEvent;
		expect(handleNativeBindingHover(event, { app: mockApp })).toBe(false);
		expect(mockTrigger).not.toHaveBeenCalled();
	});
});

describe("hover interno en nn-links (solo preview, jamás suprime)", () => {
	function nnEl(opts: { classes?: string[]; attributes?: Record<string, string>; textContent?: string; parent?: any } = {}) {
		return mockElement({
			classes: ["vaultman-node-note-link", ...(opts.classes ?? [])],
			attributes: opts.attributes,
			textContent: opts.textContent ?? "",
			parent: opts.parent,
		});
	}

	function hoverApp(files: any[] = [], fileCache: any = {}) {
		return {
			vault: { getMarkdownFiles: () => files },
			metadataCache: { getFileCache: () => ({ frontmatter: fileCache }) },
			workspace: { trigger: vi.fn() },
		} as any;
	}

	it("anchor con href resuelto dispara preview del destino", () => {
		const el = nnEl({ classes: ["internal-link"], attributes: { href: "Ideas" }, textContent: "Ideas" });
		const app = hoverApp();
		app.metadataCache = { getFirstLinkpathDest: () => ({ path: "Notes/Ideas.md" }) };

		const event = { target: el, ctrlKey: true, metaKey: false } as unknown as MouseEvent;
		expect(handleInternalNodeNoteHover(event, { app })).toBe(true);
		expect(app.workspace.trigger).toHaveBeenCalledWith("hover-link", expect.objectContaining({
			linktext: "Notes/Ideas.md",
		}));
	});

	it("anchor externo o sin destino no dispara", () => {
		const el = nnEl({ classes: ["external-link"], attributes: { href: "https://example.com" }, textContent: "x" });
		const app = hoverApp();
		app.metadataCache = { getFirstLinkpathDest: () => null };

		const event = { target: el, ctrlKey: true, metaKey: false } as unknown as MouseEvent;
		expect(handleInternalNodeNoteHover(event, { app })).toBe(false);
		expect(app.workspace.trigger).not.toHaveBeenCalled();
	});

	it("fila de archivo con nota por alias dispara preview", () => {
		const rowParent = mockElement({ classes: ["vaultman-file-row"], attributes: { "data-path": "docs/manual.pdf" } });
		const el = nnEl({ textContent: "manual.pdf", parent: rowParent });
		const app = hoverApp([{ path: "Notes/Manual.md" }], { aliases: ["docs/manual.pdf"] });

		const event = { target: el, ctrlKey: true, metaKey: false } as unknown as MouseEvent;
		expect(handleInternalNodeNoteHover(event, { app })).toBe(true);
		expect(app.workspace.trigger).toHaveBeenCalledWith("hover-link", expect.objectContaining({
			linktext: "Notes/Manual.md",
		}));
	});

	it("texto con alias dispara preview; sin alias, sin ctrl o sin nn no dispara", () => {
		const el = nnEl({ textContent: "Projects" });
		const app = hoverApp([{ path: "Notes/P.md" }], { aliases: ["Projects"] });

		const event = { target: el, ctrlKey: true, metaKey: false } as unknown as MouseEvent;
		expect(handleInternalNodeNoteHover(event, { app })).toBe(true);

		const lonely = nnEl({ textContent: "Nadie" });
		expect(handleInternalNodeNoteHover({ target: lonely, ctrlKey: true, metaKey: false } as unknown as MouseEvent, { app })).toBe(false);

		expect(handleInternalNodeNoteHover({ target: el, ctrlKey: false, metaKey: false } as unknown as MouseEvent, { app })).toBe(false);

		const plain = mockElement({ classes: ["random"], textContent: "Projects" });
		expect(handleInternalNodeNoteHover({ target: plain, ctrlKey: true, metaKey: false } as unknown as MouseEvent, { app })).toBe(false);
	});

	it("superficie nativa la cubre el handler nativo (sin doble preview)", () => {
		const added: string[] = [];
		const el: any = {
			dataset: {},
			textContent: "Projects",
			getAttribute: (attr: string) => (attr === "data-path" ? "Projects" : null),
			classList: { contains: () => false, add: (cls: string) => { added.push(cls); } },
			closest: (selector: string) => {
				if (selector.includes("view-header-breadcrumb")) return el;
				if (selector.includes("vaultman-node-note-link")) return el;
				return null;
			},
			querySelectorAll: () => [],
			querySelector: () => null,
		};
		const app = {
			vault: { getMarkdownFiles: () => [{ path: "Projects/Projects.md" }] },
			metadataCache: { getFileCache: () => ({}) },
			workspace: { trigger: vi.fn() },
		} as any;

		const event = { target: el, ctrlKey: true, metaKey: false } as unknown as MouseEvent;
		expect(handleInternalNodeNoteHover(event, { app })).toBe(false);
		expect(app.workspace.trigger).not.toHaveBeenCalled();
	});

	it("anchor internal-link en vista vaultman dispara preview del destino", () => {
		const view = mockElement({
			classes: ["workspace-leaf-content"],
			attributes: { "data-type": "vaultman-view" },
		});
		const anchor = mockElement({
			classes: ["internal-link"],
			attributes: { href: "Ideas" },
			textContent: "Ideas",
			parent: view,
		});
		const app = {
			vault: { getMarkdownFiles: () => [] },
			metadataCache: {
				getFileCache: () => ({}),
				getFirstLinkpathDest: () => ({ path: "Notes/Ideas.md" }),
			},
			workspace: { trigger: vi.fn() },
		} as any;

		const event = { target: anchor, ctrlKey: true, metaKey: false } as unknown as MouseEvent;
		expect(handleInternalNodeNoteHover(event, { app })).toBe(true);
		expect(app.workspace.trigger).toHaveBeenCalledWith("hover-link", expect.objectContaining({
			linktext: "Notes/Ideas.md",
		}));
	});

	it("anchor sin destino o fuera de vistas vaultman no dispara", () => {
		const view = mockElement({
			classes: ["workspace-leaf-content"],
			attributes: { "data-type": "vaultman-view" },
		});
		const dangling = mockElement({
			classes: ["internal-link"],
			attributes: { href: "Falta" },
			textContent: "Falta",
			parent: view,
		});
		const outside = mockElement({
			classes: ["internal-link"],
			attributes: { href: "Ideas" },
			textContent: "Ideas",
		});
		const app = {
			vault: { getMarkdownFiles: () => [] },
			metadataCache: {
				getFileCache: () => ({}),
				getFirstLinkpathDest: (target: string) =>
					target === "Ideas" ? { path: "Notes/Ideas.md" } : null,
			},
			workspace: { trigger: vi.fn() },
		} as any;

		expect(handleInternalNodeNoteHover(
			{ target: dangling, ctrlKey: true, metaKey: false } as unknown as MouseEvent, { app },
		)).toBe(false);
		expect(handleInternalNodeNoteHover(
			{ target: outside, ctrlKey: true, metaKey: false } as unknown as MouseEvent, { app },
		)).toBe(false);
		expect(app.workspace.trigger).not.toHaveBeenCalled();
	});
});
