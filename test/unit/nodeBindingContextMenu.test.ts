import { describe, it, expect, vi } from "vitest";
import { registerNodeBindingActions } from "../../src/logic/logicNodeBindingContextMenu";

describe("registerNodeBindingActions", () => {
	it("registers node.binding-note action with contextMenuService", () => {
		let registered: any = null;
		const mockPlugin: any = {
			contextMenuService: {
				registerAction: vi.fn().mockImplementation((action) => {
					registered = action;
				}),
			},
			nodeBindingService: {
				bindOrCreate: vi.fn(),
			},
		};

		registerNodeBindingActions(mockPlugin);
		expect(mockPlugin.contextMenuService.registerAction).toHaveBeenCalled();
		expect(registered.id).toBe("node.binding-note");
		expect(registered.nodeTypes).toContain("tag");
		expect(registered.nodeTypes).toContain("prop");
		expect(registered.nodeTypes).toContain("folder");
		expect(registered.nodeTypes).toContain("file");
	});

	it("invokes bindOrCreate on run with correct kind for tag", async () => {
		let registered: any = null;
		const mockBindOrCreate = vi.fn().mockResolvedValue({ outcome: "opened" });
		const mockPlugin: any = {
			contextMenuService: {
				registerAction: vi.fn().mockImplementation((action) => {
					registered = action;
				}),
			},
			nodeBindingService: {
				bindOrCreate: mockBindOrCreate,
			},
		};

		registerNodeBindingActions(mockPlugin);
		await registered.run({
			nodeType: "tag",
			node: { label: "dev", meta: { tagPath: "dev" } },
		});

		expect(mockBindOrCreate).toHaveBeenCalledWith({
			kind: "tag",
			label: "dev",
			tagPath: "dev",
		});
	});

	it("supports file nodeType and invokes bindOrCreate with file kind", async () => {
		let registered: any = null;
		const mockBindOrCreate = vi.fn().mockResolvedValue({ outcome: "opened" });
		const mockPlugin: any = {
			contextMenuService: {
				registerAction: vi.fn().mockImplementation((action) => {
					registered = action;
				}),
			},
			nodeBindingService: {
				bindOrCreate: mockBindOrCreate,
			},
		};

		registerNodeBindingActions(mockPlugin);
		await registered.run({
			nodeType: "file",
			node: { label: "manual.pdf", id: "docs/manual.pdf", meta: { path: "docs/manual.pdf" } },
		});

		expect(mockBindOrCreate).toHaveBeenCalledWith({
			kind: "file",
			label: "manual.pdf",
			path: "docs/manual.pdf",
		});
	});
});
