import { Modal, type App } from 'obsidian';
import { translate } from '../i18n/index';
import type {
	SceneConfig,
	WorkspaceInstanceId,
	WorkspaceInstanceRecord,
} from '../types/typeInstance';

export interface InstanceInfoSceneEntry {
	scene: string;
	active: boolean;
	overrides: SceneConfig;
	overrideKeys: readonly string[];
}

export interface InstanceInfoModel {
	id: WorkspaceInstanceId;
	createdAt: number;
	lastActiveAt: number;
	revision: number;
	tombstoned: boolean;
	activeScene: string | null;
	self: SceneConfig & { surfacePosition?: WorkspaceInstanceRecord['surfacePosition'] };
	selfOverrideKeys: readonly string[];
	scenes: readonly InstanceInfoSceneEntry[];
}

/** Canonical scene order; unknown scenes append sorted. */
const SCENE_ORDER = ['files', 'props', 'tags', 'snippets', 'plugins'];

/**
 * U130 polishing: the model the instance-info modal paints. Pure on
 * purpose — the modal computes nothing, so this tests without DOM or
 * Obsidian. Shows what THIS instance overrides: identity, revision data,
 * the instance layer and one entry per stored scene (active flagged).
 */
export function buildInstanceInfoModel(
	record: WorkspaceInstanceRecord,
): InstanceInfoModel {
	const activeScene = record.activeScene ?? null;
	const stored = Object.keys(record.scenes ?? {});
	const ordered = [
		...SCENE_ORDER.filter((scene) => stored.includes(scene)),
		...stored.filter((scene) => !SCENE_ORDER.includes(scene)).sort(),
	];
	const self = {
		...record.self,
		...(record.surfacePosition ? { surfacePosition: record.surfacePosition } : {}),
	};
	return {
		id: record.id,
		createdAt: record.createdAt,
		lastActiveAt: record.lastActiveAt,
		revision: record.revision,
		tombstoned: record.tombstoned,
		activeScene,
		self,
		selfOverrideKeys: Object.keys(self).sort(),
		scenes: ordered.map((scene) => {
			const overrides =
				(record.scenes as Record<string, SceneConfig>)[scene] ?? {};
			return {
				scene,
				active: activeScene === scene,
				overrides,
				overrideKeys: Object.keys(overrides).sort(),
			};
		}),
	};
}

/**
 * U130 polishing: the per-toolbar `info` option — the whole record of one
 * instance (id, revision data, instance overrides, per-scene overrides)
 * in a native Modal. Click behavior elsewhere is untouched.
 */
export class InstanceInfoModal extends Modal {
	private readonly record: WorkspaceInstanceRecord;
	private readonly records: readonly WorkspaceInstanceRecord[];
	private readonly onSwitchInstance?: (id: string) => void;

	constructor(
		app: App,
		record: WorkspaceInstanceRecord,
		records: readonly WorkspaceInstanceRecord[] = [record],
		onSwitchInstance?: (id: string) => void,
	) {
		super(app);
		this.record = record;
		this.records = records;
		this.onSwitchInstance = onSwitchInstance;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('vaultman-instance-info');
		const model = buildInstanceInfoModel(this.record);
		contentEl.createEl('h2', { text: translate('toolbar.instance_info') });

		const meta = contentEl.createEl('dl', {
			cls: 'vaultman-instance-info-meta',
		});
		const row = (labelKey: string, value: string): void => {
			meta.createEl('dt', { text: translate(labelKey) });
			meta.createEl('dd', { text: value });
		};
		row('toolbar.instance_info.id', model.id);
		row('toolbar.instance_info.revision', String(model.revision));
		row(
			'toolbar.instance_info.active_scene',
			model.activeScene ?? '—',
		);
		row(
			'toolbar.instance_info.created',
			new Date(model.createdAt).toLocaleString(),
		);
		row(
			'toolbar.instance_info.updated',
			new Date(model.lastActiveAt).toLocaleString(),
		);
		if (model.tombstoned) row('toolbar.instance_info.tombstoned', '✓');
		this.renderInstanceSwitcher(contentEl, model.id);

		contentEl.createEl('h3', { text: translate('toolbar.instance_info.self') });
		this.renderOverrides(contentEl, model.self, model.selfOverrideKeys);

		contentEl.createEl('h3', {
			text: translate('toolbar.instance_info.scenes'),
		});
		if (model.scenes.length === 0) {
			contentEl.createDiv({
				cls: 'vaultman-instance-info-empty',
				text: translate('toolbar.instance_info.empty'),
			});
		}
		for (const scene of model.scenes) {
			contentEl.createEl('h4', {
				text: scene.active
					? `${scene.scene} · ${translate('toolbar.instance_info.active_scene')}`
					: scene.scene,
			});
			this.renderOverrides(contentEl, scene.overrides, scene.overrideKeys);
		}
	}

	private renderInstanceSwitcher(contentEl: HTMLElement, currentId: string): void {
		const alternatives = this.records.filter(
			(record) => !record.tombstoned && record.id !== currentId,
		);
		contentEl.createEl('h3', {
			text: translate('toolbar.instance_info.switch_heading'),
		});
		if (alternatives.length === 0) {
			contentEl.createDiv({
				cls: 'vaultman-instance-info-empty',
				text: translate('toolbar.instance_info.switch_empty'),
			});
			return;
		}
		const controls = contentEl.createDiv({
			cls: 'vaultman-instance-info-switcher',
		});
		const select = controls.createEl('select', {
			attr: { 'aria-label': translate('toolbar.instance_info.switch_heading') },
		});
		for (const record of alternatives) {
			select.createEl('option', {
				text: record.id,
				attr: { value: record.id },
			});
		}
		controls.createEl('button', {
			text: translate('toolbar.instance_info.switch_action'),
		}).addEventListener('click', () => {
			const nextId = select.value;
			if (!nextId || !alternatives.some((record) => record.id === nextId)) return;
			this.onSwitchInstance?.(nextId);
			this.close();
		});
	}

	private renderOverrides(
		contentEl: HTMLElement,
		overrides: SceneConfig,
		keys: readonly string[],
	): void {
		if (keys.length === 0) {
			contentEl.createDiv({
				cls: 'vaultman-instance-info-empty',
				text: translate('toolbar.instance_info.empty'),
			});
			return;
		}
		contentEl.createEl('pre', {
			cls: 'vaultman-instance-info-overrides',
			text: JSON.stringify(overrides, null, 2),
		});
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
