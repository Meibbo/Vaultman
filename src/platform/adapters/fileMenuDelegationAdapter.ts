import type { EventRef, Menu } from 'obsidian';
import type {
	CapabilityResult,
	FragilityRecord,
	PlatformAdapter,
	PlatformAdapterContext,
} from '../platformAdapter';

export const FILE_MENU_DELEGATION_EVENT = 'file-menu';

export type FileMenuDelegationDelegate = (
	menu: Menu,
	file: unknown,
	source?: string,
) => void;

export interface FileMenuDelegationAdapterOptions {
	delegateFileMenu: FileMenuDelegationDelegate;
	enabled?: () => boolean;
}

type FileMenuListener = (menu: Menu, file: unknown, source?: string) => void;

interface WorkspaceFileMenuApi {
	on(event: typeof FILE_MENU_DELEGATION_EVENT, listener: FileMenuListener): EventRef;
	offref(ref: EventRef): void;
}

const FRAGILITY: FragilityRecord = {
	id: 'file-menu-delegation',
	title: 'File menu delegation',
	summary:
		'Delegates Obsidian native file-menu events into Vaultman context-menu actions ' +
		'through an injected ContextMenuService seam. Native menu curation is outside ' +
		'this adapter.',
	privateSymbols: ["app.workspace.on('file-menu')", 'app.workspace.offref(EventRef)'],
	selectorSources: [],
	obsidianAssumptions: [
		'Obsidian workspace emits file-menu with (menu, file, source)',
		'source === "more-options" identifies the more-options surface; other sources are file-menu',
		'Reentrant file-menu emissions during delegation must be suppressed by the adapter',
		'Native menu curation (_removeNativeFileMoveActions) is lane D and is not implemented here',
	],
	fallback:
		'Vaultman does not inject its file-menu actions through the native file-menu event. Panel/editor menus keep their existing routes.',
	mobile: {
		supported: 'degraded',
		notes:
			'Desktop file-menu depends on right-click/native explorer menus. Mobile may expose more-options, but support depends on Obsidian emitting the same file-menu event.',
	},
};

export class FileMenuDelegationAdapter implements PlatformAdapter {
	readonly id = FRAGILITY.id;
	readonly fragility = FRAGILITY;

	private readonly delegateFileMenu: FileMenuDelegationDelegate;
	private readonly enabled: () => boolean;
	private workspace?: WorkspaceFileMenuApi;
	private eventRef?: EventRef;
	private isDelegating = false;

	constructor(options: FileMenuDelegationAdapterOptions) {
		this.delegateFileMenu = options.delegateFileMenu;
		this.enabled = options.enabled ?? (() => true);
	}

	probe(ctx: PlatformAdapterContext): CapabilityResult {
		try {
			if (typeof this.delegateFileMenu !== 'function') {
				return { ok: false, reason: 'delegateFileMenu route is not available' };
			}
			const workspace = workspaceWithFileMenu(ctx);
			if (typeof workspace.on !== 'function') {
				return { ok: false, reason: "app.workspace.on('file-menu') is not available" };
			}
			if (typeof workspace.offref !== 'function') {
				return { ok: false, reason: 'app.workspace.offref is not available' };
			}
		} catch (error) {
			return { ok: false, reason: `probe failed: ${errorMessage(error)}` };
		}
		return { ok: true };
	}

	apply(ctx: PlatformAdapterContext): void {
		const capability = this.probe(ctx);
		if (!capability.ok) {
			throw new Error(capability.reason);
		}
		this.revert();

		const workspace = requireWorkspaceFileMenuApi(ctx);
		const listener: FileMenuListener = (menu, file, source) => {
			if (!this.enabled()) return;
			if (this.isDelegating) return;
			this.isDelegating = true;
			try {
				this.delegateFileMenu(menu, file, source);
			} finally {
				this.isDelegating = false;
			}
		};

		this.workspace = workspace;
		this.eventRef = workspace.on(FILE_MENU_DELEGATION_EVENT, listener);
	}

	revert(): void {
		const workspace = this.workspace;
		const eventRef = this.eventRef;
		this.workspace = undefined;
		this.eventRef = undefined;
		this.isDelegating = false;
		if (workspace && eventRef) {
			workspace.offref(eventRef);
		}
	}

	get applied(): boolean {
		return this.eventRef !== undefined;
	}
}

function workspaceWithFileMenu(ctx: PlatformAdapterContext): Partial<WorkspaceFileMenuApi> {
	const workspace = (ctx.app as { workspace?: unknown }).workspace;
	if (!workspace || typeof workspace !== 'object') return {};
	return workspace as Partial<WorkspaceFileMenuApi>;
}

function requireWorkspaceFileMenuApi(ctx: PlatformAdapterContext): WorkspaceFileMenuApi {
	const workspace = workspaceWithFileMenu(ctx);
	if (typeof workspace.on !== 'function' || typeof workspace.offref !== 'function') {
		throw new Error('app.workspace file-menu API is not available');
	}
	return workspace as WorkspaceFileMenuApi;
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
