import { describe, it, expect, vi } from "vitest";
import { TFile, type App } from "obsidian";
import {
	NodeBindingService,
	computeAliasToken,
	extractWikilinkTarget,
	aliasesContain,
	quoteYamlValue,
} from "../../src/services/serviceNodeBinding";

describe("extractWikilinkTarget", () => {
	it("extracts target from [[Target|Alias]] and [[Target]]", () => {
		expect(extractWikilinkTarget("[[Project Alpha|Alpha]]")).toBe("Project Alpha");
		expect(extractWikilinkTarget("[[Project Alpha]]")).toBe("Project Alpha");
		expect(extractWikilinkTarget("Not a wikilink")).toBeNull();
	});
});

describe("computeAliasToken", () => {
	it("formats prop token as [propname]", () => {
		expect(computeAliasToken({ kind: "prop", label: "status" })).toBe("[status]");
		expect(computeAliasToken({ kind: "prop", label: "status", propName: "author" })).toBe("[author]");
	});

	it("formats tag token as #tagname without duplicate hash", () => {
		expect(computeAliasToken({ kind: "tag", label: "books" })).toBe("#books");
		expect(computeAliasToken({ kind: "tag", label: "#books" })).toBe("#books");
		expect(computeAliasToken({ kind: "tag", label: "nested", tagPath: "nested/sub" })).toBe("#nested/sub");
	});

	it("formats snippet token as $snippetname", () => {
		expect(computeAliasToken({ kind: "snippet", label: "custom-cards" })).toBe("$custom-cards");
	});

	it("formats plugin token as %pluginid", () => {
		expect(computeAliasToken({ kind: "plugin", label: "Dataview", pluginId: "dataview" })).toBe("%dataview");
	});

	it("returns path for file and folder nodes", () => {
		expect(computeAliasToken({ kind: "file", label: "manual.pdf", path: "docs/manual.pdf" })).toBe("docs/manual.pdf");
		expect(computeAliasToken({ kind: "folder", label: "Projects", path: "Work/Projects" })).toBe("Work/Projects");
	});
});

describe("aliasesContain", () => {
	it("matches exact string alias or in array", () => {
		expect(aliasesContain("my-alias", "my-alias")).toBe(true);
		expect(aliasesContain(["#tag", "[prop]", "$snip"], "#tag")).toBe(true);
		expect(aliasesContain(null, "#tag")).toBe(false);
	});
});

describe("quoteYamlValue", () => {
	it("quotes tokens with yaml-special characters", () => {
		expect(quoteYamlValue("#tag")).toBe("'#tag'");
		expect(quoteYamlValue("[prop]")).toBe("'[prop]'");
		expect(quoteYamlValue("$snippet")).toBe("'$snippet'");
		expect(quoteYamlValue("%plugin")).toBe("'%plugin'");
	});
});

describe("Folder Node-Notes hierarchy in NodeBindingService", () => {
	it("1. Opens C-Node (folder/folder.md) when it exists in disk", async () => {
		const cNodeFile = new (TFile as any)();
		cNodeFile.path = "Projects/Projects.md";

		const mockOpenFile = vi.fn().mockResolvedValue(undefined);
		const mockApp = {
			vault: {
				getAbstractFileByPath: vi.fn().mockImplementation((path: string) => {
					if (path === "Projects/Projects.md") return cNodeFile;
					return null;
				}),
				getMarkdownFiles: vi.fn().mockReturnValue([]),
			},
			workspace: {
				getLeaf: vi.fn().mockReturnValue({ openFile: mockOpenFile }),
			},
		} as unknown as App;

		const service = new NodeBindingService({ app: mockApp });
		const result = await service.bindOrCreate({ kind: "folder", label: "Projects", path: "Projects" });

		expect(result.outcome).toBe("opened");
		expect(result.filePath).toBe("Projects/Projects.md");
		expect(mockOpenFile).toHaveBeenCalledWith(cNodeFile);
	});

	it("2. Opens matching alias note when C-Node does not exist", async () => {
		const aliasFile = new (TFile as any)();
		aliasFile.path = "Overview/Projects Index.md";

		const mockOpenFile = vi.fn().mockResolvedValue(undefined);
		const mockApp = {
			vault: {
				getAbstractFileByPath: vi.fn().mockReturnValue(null),
				getMarkdownFiles: vi.fn().mockReturnValue([aliasFile]),
			},
			metadataCache: {
				getFileCache: vi.fn().mockReturnValue({
					frontmatter: { aliases: ["Projects"] },
				}),
			},
			workspace: {
				getLeaf: vi.fn().mockReturnValue({ openFile: mockOpenFile }),
			},
		} as unknown as App;

		const service = new NodeBindingService({ app: mockApp });
		const result = await service.bindOrCreate({ kind: "folder", label: "Projects", path: "Projects" });

		expect(result.outcome).toBe("opened");
		expect(result.filePath).toBe("Overview/Projects Index.md");
		expect(mockOpenFile).toHaveBeenCalledWith(aliasFile);
	});

	it("3. Creates C-Node (folder/folder.md) when no C-Node or alias match exists", async () => {
		const createdFile = new (TFile as any)();
		createdFile.path = "Projects/Projects.md";

		const mockCreate = vi.fn().mockResolvedValue(createdFile);
		const mockOpenFile = vi.fn().mockResolvedValue(undefined);
		const mockApp = {
			vault: {
				getAbstractFileByPath: vi.fn().mockReturnValue(null),
				getMarkdownFiles: vi.fn().mockReturnValue([]),
				create: mockCreate,
			},
			workspace: {
				getLeaf: vi.fn().mockReturnValue({ openFile: mockOpenFile }),
			},
		} as unknown as App;

		const service = new NodeBindingService({ app: mockApp });
		const result = await service.bindOrCreate({ kind: "folder", label: "Projects", path: "Projects" });

		expect(result.outcome).toBe("created");
		expect(result.filePath).toBe("Projects/Projects.md");
		expect(mockCreate).toHaveBeenCalledWith("Projects/Projects.md", expect.stringContaining("Projects"));
	});
});

describe("Wikilink & Adoption in NodeBindingService", () => {
	it("resolves [[Target|Alias]] property directly via getFirstLinkpathDest", async () => {
		const targetFile = new (TFile as any)();
		targetFile.path = "Notes/TargetNote.md";

		const mockOpenFile = vi.fn().mockResolvedValue(undefined);
		const mockApp = {
			metadataCache: {
				getFirstLinkpathDest: vi.fn().mockReturnValue(targetFile),
			},
			workspace: {
				getLeaf: vi.fn().mockReturnValue({ openFile: mockOpenFile }),
			},
		} as unknown as App;

		const service = new NodeBindingService({ app: mockApp });
		const result = await service.bindOrCreate({ kind: "value", label: "[[TargetNote|Alias]]" });

		expect(result.outcome).toBe("opened");
		expect(result.filePath).toBe("Notes/TargetNote.md");
		expect(mockOpenFile).toHaveBeenCalledWith(targetFile);
	});

	it("adopts existing file on disk and updates frontmatter with processFrontMatter", async () => {
		const existingFile = new (TFile as any)();
		existingFile.path = "custom-snippet.md";

		const mockOpenFile = vi.fn().mockResolvedValue(undefined);
		const mockProcessFrontMatter = vi.fn().mockImplementation(async (_file, cb) => {
			const fm = { aliases: [] };
			cb(fm);
			expect(fm.aliases).toContain("$custom-snippet");
		});

		const mockApp = {
			vault: {
				getMarkdownFiles: vi.fn().mockReturnValue([]),
				getAbstractFileByPath: vi.fn().mockReturnValue(existingFile),
			},
			fileManager: {
				getNewFileParent: vi.fn().mockReturnValue({ path: "" }),
				processFrontMatter: mockProcessFrontMatter,
			},
			workspace: {
				getLeaf: vi.fn().mockReturnValue({ openFile: mockOpenFile }),
			},
		} as unknown as App;

		const service = new NodeBindingService({ app: mockApp });
		const result = await service.bindOrCreate({ kind: "snippet", label: "custom-snippet" });

		expect(result.outcome).toBe("adopted");
		expect(result.filePath).toBe("custom-snippet.md");
		expect(mockProcessFrontMatter).toHaveBeenCalled();
	});

	it("crea nota desde valor wikilink sin brackets en filename ni alias", async () => {
		const mockOpenFile = vi.fn().mockResolvedValue(undefined);
		const mockCreate = vi.fn().mockImplementation(async (path: string) => ({ path }));
		const mockApp = {
			metadataCache: {
				getFirstLinkpathDest: vi.fn().mockReturnValue(null),
				getFileCache: vi.fn().mockReturnValue({}),
			},
			vault: {
				getMarkdownFiles: vi.fn().mockReturnValue([]),
				getAbstractFileByPath: vi.fn().mockReturnValue(null),
				create: mockCreate,
			},
			fileManager: {
				getNewFileParent: vi.fn().mockReturnValue({ path: "" }),
			},
			workspace: {
				getLeaf: vi.fn().mockReturnValue({ openFile: mockOpenFile }),
			},
		} as unknown as App;

		const service = new NodeBindingService({ app: mockApp });
		const result = await service.bindOrCreate({ kind: "value", label: "[[Nueva]]" });

		expect(result.outcome).toBe("created");
		expect(result.filePath).toBe("Nueva.md");
		expect(result.token).toBe("Nueva");
		expect(mockCreate).toHaveBeenCalledWith("Nueva.md", expect.not.stringContaining("[[Nueva]]"));
	});
});
