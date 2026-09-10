import { describe, it, expect, vi } from "vitest";
import type { VaultmanPlugin } from "../../src/main";
import type { ActionDef, MenuCtx } from "../../src/types/typeCMenu";
import { registerNodeBindingActions } from "../../src/logic/logicNodeBindingContextMenu";

type BindOrCreate = (node: { kind: string; label: string; path?: string }) => Promise<{ outcome: string }>;
type TestPlugin = {
	contextMenuService: { registerAction: (action: ActionDef) => void };
	nodeBindingService: { bindOrCreate: BindOrCreate };
};

function makePlugin() {
	let registered: ActionDef | undefined;
	const bindOrCreate = vi.fn<BindOrCreate>().mockResolvedValue({ outcome: "opened" });
	const plugin: TestPlugin = {
		contextMenuService: {
			registerAction: vi.fn<(action: ActionDef) => void>((action) => {
				registered = action;
			}),
		},
		nodeBindingService: { bindOrCreate },
	};
	return {
		plugin: plugin as unknown as VaultmanPlugin,
		registerAction: plugin.contextMenuService.registerAction,
		bindOrCreate,
		action: () => {
			if (!registered) throw new Error("node binding action was not registered");
			return registered;
		},
	};
}

function context(
	nodeType: MenuCtx["nodeType"],
	label: string,
	meta: Record<string, string>,
): MenuCtx {
	return {
		nodeType,
		node: { id: label, label, depth: 0, meta },
		surface: "panel",
	};
}

describe("registerNodeBindingActions", () => {
	it("registers node.binding-note action with contextMenuService", () => {
		const { plugin, registerAction, action } = makePlugin();

		registerNodeBindingActions(plugin);
		expect(registerAction).toHaveBeenCalled();
		expect(action().id).toBe("node.binding-note");
		expect(action().nodeTypes).toContain("tag");
		expect(action().nodeTypes).toContain("prop");
		expect(action().nodeTypes).toContain("folder");
		expect(action().nodeTypes).toContain("file");
	});

	it("invokes bindOrCreate on run with correct kind for tag", async () => {
		const { plugin, bindOrCreate, action } = makePlugin();

		registerNodeBindingActions(plugin);
		await action().run(context("tag", "dev", { tagPath: "dev" }));

		expect(bindOrCreate).toHaveBeenCalledWith({
			kind: "tag",
			label: "dev",
			tagPath: "dev",
		});
	});

	it("supports file nodeType and invokes bindOrCreate with file kind", async () => {
		const { plugin, bindOrCreate, action } = makePlugin();

		registerNodeBindingActions(plugin);
		await action().run(context("file", "manual.pdf", { path: "docs/manual.pdf" }));

		expect(bindOrCreate).toHaveBeenCalledWith({
			kind: "file",
			label: "manual.pdf",
			path: "docs/manual.pdf",
		});
	});
});
