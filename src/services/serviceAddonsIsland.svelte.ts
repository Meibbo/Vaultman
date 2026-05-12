export type AddonsPane = 'stats' | 'markdown';

export interface AddonsQuickSwitcherFile {
	path: string;
}

export interface AddonsQuickSwitcherApp {
	commands?: {
		executeCommandById?: (commandId: string) => unknown;
	};
	workspace?: {
		getActiveFile?: () => AddonsQuickSwitcherFile | null;
		on?: (
			name: string,
			cb: (file?: AddonsQuickSwitcherFile | null) => void,
		) => { off?: () => void } | undefined;
	};
}

export interface AddonsQuickSwitcherOptions {
	commandIds?: readonly string[];
	selectionTimeoutMs?: number;
}

export interface AddonsQuickSwitcherResult {
	commandId: string | null;
	notePath: string | null;
}

const DEFAULT_QUICK_SWITCHER_COMMANDS = ['switcher:open', 'quick-switcher:open'] as const;

export class AddonsIslandService {
	activePane = $state<AddonsPane>('stats');
	notePath = $state<string | null>(null);
	pendingQuickSwitcher = $state(false);
	quickSwitcherError = $state<string | null>(null);

	openNote(path: string): void {
		this.notePath = path;
		this.activePane = 'markdown';
		this.quickSwitcherError = null;
	}

	showStats(): void {
		this.activePane = 'stats';
		this.notePath = null;
	}

	async openQuickSwitcher(
		app: AddonsQuickSwitcherApp,
		options: AddonsQuickSwitcherOptions = {},
	): Promise<AddonsQuickSwitcherResult> {
		this.pendingQuickSwitcher = true;
		this.quickSwitcherError = null;
		try {
			const commandId = await executeQuickSwitcherCommand(
				app,
				options.commandIds ?? DEFAULT_QUICK_SWITCHER_COMMANDS,
			);
			const file = await waitForQuickSwitcherSelection(app, options.selectionTimeoutMs ?? 2500);
			const notePath = file?.path ?? null;
			if (notePath) this.openNote(notePath);
			return { commandId, notePath };
		} catch (error) {
			this.quickSwitcherError = error instanceof Error ? error.message : String(error);
			return { commandId: null, notePath: null };
		} finally {
			this.pendingQuickSwitcher = false;
		}
	}
}

async function executeQuickSwitcherCommand(
	app: AddonsQuickSwitcherApp,
	commandIds: readonly string[],
): Promise<string | null> {
	const execute = app.commands?.executeCommandById;
	if (!execute) throw new Error('Quick Switcher command API is unavailable.');
	for (const commandId of commandIds) {
		try {
			const result = await execute(commandId);
			if (result !== false) return commandId;
		} catch {
			// Try the next known command id; Obsidian has used both ids across versions.
		}
	}
	throw new Error(`Unable to launch Quick Switcher with ${commandIds.join(', ')}.`);
}

function waitForQuickSwitcherSelection(
	app: AddonsQuickSwitcherApp,
	selectionTimeoutMs: number,
): Promise<AddonsQuickSwitcherFile | null> {
	const workspace = app.workspace;
	if (!workspace) return Promise.resolve(null);
	return new Promise((resolve) => {
		let resolved = false;
		let timeoutId: ReturnType<typeof setTimeout> | undefined;
		let off: (() => void) | undefined;
		const finish = (file?: AddonsQuickSwitcherFile | null) => {
			if (resolved) return;
			resolved = true;
			if (timeoutId) clearTimeout(timeoutId);
			off?.();
			const active = file ?? workspace.getActiveFile?.() ?? null;
			resolve(active);
		};
		const ref = workspace.on?.('file-open', finish);
		off = ref?.off;
		if (!ref) {
			queueMicrotask(() => finish());
			return;
		}
		timeoutId = setTimeout(() => finish(), selectionTimeoutMs);
	});
}
