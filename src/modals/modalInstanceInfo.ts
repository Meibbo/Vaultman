import { Modal, Notice, Platform, type App } from 'obsidian';
import { isMobile } from '../platform/platformProfile';
import { translate } from '../i18n/index';
import type {
	SceneConfig,
	SceneDefinitionId,
	WorkspaceInstanceId,
	WorkspaceInstanceRecord,
} from '../types/typeInstance';
import type { SceneConfigPort } from '../logic/logicSceneConfigPort';
import {
	applySceneConfigPath,
	formatSceneConfigFieldLabel,
	parseSceneConfigEditorInput,
	sceneConfigEditableFields,
	sceneConfigEditorKind,
	sceneConfigEditorOptions,
	type SceneConfigEditableField,
} from '../logic/logicSceneConfigEditor';
import {
	NATIVE_COMPAT_BOUNDARIES,
	type NativeCompatMode,
} from '../logic/logicNativeTreeCompat';

type OverrideTarget =
	| { kind: 'instance' }
	| { kind: 'scene'; scene: SceneDefinitionId };

const SCENES_WITH_TREE_COMPAT: readonly SceneDefinitionId[] = [
	'files', 'props', 'tags',
];

const NATIVE_COMPAT_MODES = ['inherit', 'compatible', 'locked'] as const;

export interface InstanceInfoSceneEntry {
	scene: string;
	active: boolean;
	overrides: SceneConfig;
	overrideKeys: readonly string[];
}

export interface InstanceInfoModel {
	id: WorkspaceInstanceId;
	cell_name?: string;
	createdAt: number;
	lastActiveAt: number;
	revision: number;
	tombstoned: boolean;
	activeScene: string | null;
	surfacePosition: 'left-sidebar' | 'right-sidebar' | 'main-leaf';
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
	const self = { ...record.self };
	return {
		id: record.id,
		cell_name: record.cell_name ?? record.customName,
		createdAt: record.createdAt,
		lastActiveAt: record.lastActiveAt,
		revision: record.revision,
		tombstoned: record.tombstoned,
		activeScene,
		surfacePosition: record.surfacePosition ?? 'main-leaf',
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
	private readonly onRenameInstance?: (id: string, name: string) => void | Promise<void>;
	private readonly onMoveSurface?: (
		id: string,
		surface: 'left-sidebar' | 'right-sidebar' | 'main-leaf',
	) => void | Promise<void>;
	private readonly onSplitInstance?: (id: string) => void | Promise<void>;
	private readonly sceneConfigPort?: SceneConfigPort;
	private readonly overrideLayers = new Map<string, SceneConfig>();
	private pendingPersist: Promise<void> = Promise.resolve();
	private lastActiveValueEl?: HTMLElement;

	constructor(
		app: App,
		record: WorkspaceInstanceRecord,
		records: readonly WorkspaceInstanceRecord[] = [record],
		onSwitchInstance?: (id: string) => void,
		onRenameInstance?: (id: string, name: string) => void | Promise<void>,
		onMoveSurface?: (
			id: string,
			surface: 'left-sidebar' | 'right-sidebar' | 'main-leaf',
		) => void | Promise<void>,
		onSplitInstance?: (id: string) => void | Promise<void>,
		sceneConfigPort?: SceneConfigPort,
	) {
		super(app);
		this.record = record;
		this.records = records;
		this.onSwitchInstance = onSwitchInstance;
		this.onRenameInstance = onRenameInstance;
		this.onMoveSurface = onMoveSurface;
		this.onSplitInstance = onSplitInstance;
		this.sceneConfigPort = sceneConfigPort;
		this.overrideLayers.set('instance', { ...record.self });
		for (const [scene, config] of Object.entries(record.scenes ?? {})) {
			if (config) this.overrideLayers.set(`scene:${scene}`, { ...config });
		}
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

		meta.createEl('dt', { text: translate('toolbar.instance_info.cell_name') });
		const nameDd = meta.createEl('dd', { cls: 'vaultman-instance-info-name-cell' });
		const nameInput = nameDd.createEl('input', {
			type: 'text',
			value: model.cell_name ?? '',
			cls: 'vaultman-instance-info-name-input',
			placeholder: translate('toolbar.instance_info.cell_name_placeholder'),
		});
		nameInput.addEventListener('change', () => {
			void this.onRenameInstance?.(model.id, nameInput.value);
		});

		row('toolbar.instance_info.revision', String(model.revision));
		if (model.tombstoned) row('toolbar.instance_info.tombstoned', '✓');
		this.renderInstanceSwitcher(contentEl, model.id);

		contentEl.createEl('h3', { text: translate('toolbar.instance_info.self') });
		this.renderInstanceProperties(contentEl, model);
		contentEl.createEl('h4', { text: translate('toolbar.instance_info.self_config') });
		this.renderOverrides(contentEl, model.self, model.selfOverrideKeys, { kind: 'instance' });

		contentEl.createEl('h3', {
			text: translate('toolbar.instance_info.scenes'),
		});
		const sceneIds = new Set<string>([
			...SCENES_WITH_TREE_COMPAT,
			...model.scenes.map((scene) => scene.scene),
		]);
		const orderedScenes = [
			...SCENE_ORDER.filter((scene) => sceneIds.has(scene)),
			...Array.from(sceneIds).filter((scene) => !SCENE_ORDER.includes(scene)).sort(),
		];
		for (const sceneId of orderedScenes) {
			const scene = model.scenes.find((candidate) => candidate.scene === sceneId);
			const sceneTarget = sceneId as SceneDefinitionId;
			const overrides = scene?.overrides ??
				this.sceneConfigPort?.readSceneOverrides?.(sceneTarget) ?? {};
			const overrideKeys = scene?.overrideKeys ?? Object.keys(overrides).sort();
			contentEl.createEl('h4', {
				text: scene?.active
					? `${sceneId} · ${translate('toolbar.instance_info.active_scene')}`
					: sceneId,
			});
			this.renderOverrides(
				contentEl,
				overrides,
				overrideKeys,
				{ kind: 'scene', scene: sceneTarget },
			);
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
				text: record.cell_name ? `${record.cell_name} (${record.id})` : record.id,
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

	private renderInstanceProperties(
		contentEl: HTMLElement,
		model: InstanceInfoModel,
	): void {
		const meta = contentEl.createEl('dl', {
			cls: 'vaultman-instance-info-meta vaultman-instance-info-instance-fields',
		});
		const row = (labelKey: string, value: string): HTMLElement => {
			meta.createEl('dt', { text: translate(labelKey) });
			return meta.createEl('dd', { text: value });
		};
		row('toolbar.instance_info.active_scene', model.activeScene ?? '—');

		meta.createEl('dt', { text: translate('toolbar.instance_info.surface_position') });
		const surfaceDd = meta.createEl('dd', { cls: 'vaultman-instance-info-surface-cell' });
		const surfaceSelect = surfaceDd.createEl('select', {
			cls: 'dropdown vaultman-instance-info-surface-select',
			attr: { 'aria-label': translate('toolbar.instance_info.surface_position') },
		});
		const surfaceOptions: Array<{
			id: NonNullable<WorkspaceInstanceRecord['surfacePosition']>;
			labelKey: string;
		}> = [
			{ id: 'left-sidebar', labelKey: 'toolbar.instance_info.surface_left' },
			{ id: 'main-leaf', labelKey: 'toolbar.instance_info.surface_main' },
			{ id: 'right-sidebar', labelKey: 'toolbar.instance_info.surface_right' },
		];
		for (const optDef of surfaceOptions) {
			const option = surfaceSelect.createEl('option', {
				value: optDef.id,
				text: translate(optDef.labelKey),
			});
			option.selected = optDef.id === model.surfacePosition;
		}
		surfaceSelect.addEventListener('change', async () => {
			const target = surfaceSelect.value as NonNullable<WorkspaceInstanceRecord['surfacePosition']>;
			if (target === model.surfacePosition) return;
			await this.onMoveSurface?.(model.id, target);
			this.close();
		});

		row('toolbar.instance_info.created', new Date(model.createdAt).toLocaleString());
		this.lastActiveValueEl = row(
			'toolbar.instance_info.updated',
			new Date(model.lastActiveAt).toLocaleString(),
		);

		if (Platform.isMobile || isMobile(contentEl.ownerDocument)) {
			meta.createEl('dt', { text: translate('toolbar.instance_info.split') });
			const splitDd = meta.createEl('dd', { cls: 'vaultman-instance-info-split-cell' });
			const splitBtn = splitDd.createEl('button', {
				cls: 'mod-cta vaultman-instance-info-split-btn',
				text: translate('toolbar.instance_info.create_split'),
			});
			splitBtn.addEventListener('click', async () => {
				await this.onSplitInstance?.(model.id);
				this.close();
			});
		}
	}

	private renderOverrides(
		contentEl: HTMLElement,
		overrides: SceneConfig,
		keys: readonly string[],
		target: OverrideTarget,
	): void {
		const editable = new Set<string>(sceneConfigEditableFields());
		const ordinaryKeys = keys.filter((key) => key !== 'nativeCompat');
		const hasNativeCompatControl =
			keys.includes('nativeCompat') ||
			(target.kind === 'scene' && SCENES_WITH_TREE_COMPAT.includes(target.scene));
		if (ordinaryKeys.length === 0 && !hasNativeCompatControl) {
			contentEl.createDiv({
				cls: 'vaultman-instance-info-empty',
				text: translate('toolbar.instance_info.empty'),
			});
		}

		const fields = contentEl.createDiv({ cls: 'vaultman-instance-info-fields' });
		for (const key of ordinaryKeys) {
			if (!editable.has(key)) {
				const unknown = fields.createDiv({ cls: 'vaultman-instance-info-unknown' });
				unknown.createEl('strong', { text: key });
				unknown.createEl('pre', { text: JSON.stringify((overrides as Record<string, unknown>)[key], null, 2) });
				continue;
			}
			this.renderConfigField(
				fields,
				key as SceneConfigEditableField,
				(overrides as Record<string, unknown>)[key],
				target,
			);
		}
		if (hasNativeCompatControl) {
			this.renderNativeCompatControls(fields, overrides, target);
		}
	}

	private renderConfigField(
		parent: HTMLElement,
		field: SceneConfigEditableField,
		value: unknown,
		target: OverrideTarget,
	): void {
		const fieldRow = parent.createDiv({ cls: 'vaultman-instance-info-field' });
		const labelText = this.fieldLabel(field);
		const id = `vm-instance-info-${this.targetKey(target)}-${field}`;
		const label = fieldRow.createEl('label', { text: labelText, attr: { for: id } });
		const valueHost = fieldRow.createDiv({ cls: 'vaultman-instance-info-field-control' });
		const kind = sceneConfigEditorKind(field);
		if (kind === 'boolean') {
			const checkboxLabel = valueHost.createEl('label', { cls: 'vaultman-instance-info-checkbox' });
			const input = checkboxLabel.createEl('input', { type: 'checkbox', attr: { id } });
			input.checked = value === true;
			checkboxLabel.appendText(labelText);
			label.remove();
			input.addEventListener('change', () => {
				this.saveFieldValue(target, field, input.checked);
			});
		} else if (kind === 'enum') {
			const select = valueHost.createEl('select', {
				cls: 'dropdown',
				attr: { id, 'aria-label': labelText },
			});
			const options = sceneConfigEditorOptions(field, target.kind === 'scene' ? target.scene : undefined);
			if (typeof value === 'string' && !options.includes(value)) {
				select.createEl('option', { value, text: `${value} (${translate('toolbar.instance_info.legacy_value')})` });
			}
			for (const optionValue of options) {
				select.createEl('option', {
					value: optionValue,
					text: this.enumLabel(field, optionValue),
				});
			}
			select.value = typeof value === 'string' ? value : '';
			select.addEventListener('change', () => this.saveFieldValue(target, field, select.value));
		} else {
			const textarea = valueHost.createEl('textarea', {
				cls: 'vaultman-instance-info-json-input',
				attr: { id, 'aria-label': labelText, spellcheck: 'false' },
			});
			textarea.value = JSON.stringify(value, null, 2);
			const error = valueHost.createDiv({
				cls: 'vaultman-instance-info-field-error',
				attr: { role: 'alert', 'aria-live': 'polite' },
			});
			textarea.addEventListener('change', () => {
				const parsed = parseSceneConfigEditorInput(
					field,
					textarea.value,
					target.kind === 'scene' ? target.scene : undefined,
					target.kind === 'scene' ? this.sceneConfigPort?.read(target.scene).viewMode : undefined,
				);
				if (!parsed.ok) {
					error.textContent = translate(
						parsed.reason === 'invalid-json'
							? 'toolbar.instance_info.invalid_json'
							: 'toolbar.instance_info.incompatible_value',
					);
					textarea.setAttribute('aria-invalid', 'true');
					return;
				}
				error.textContent = '';
				textarea.removeAttribute('aria-invalid');
				this.saveFieldValue(target, field, parsed.value);
			});
		}

		const reset = valueHost.createEl('button', {
			cls: 'clickable-icon vaultman-instance-info-reset',
			text: '↺',
			attr: { type: 'button', 'aria-label': `${translate('toolbar.instance_info.reset')} ${labelText}` },
		});
		reset.addEventListener('click', () => {
			const next = applySceneConfigPath(this.currentLayer(target), [field], undefined);
			this.persistLayer(target, next);
			fieldRow.remove();
		});
	}

	private renderNativeCompatControls(
		parent: HTMLElement,
		layer: SceneConfig,
		target: OverrideTarget,
	): void {
		const policy = layer.nativeCompat ?? {};
		const boundaries = NATIVE_COMPAT_BOUNDARIES.filter(
			(boundary) =>
				(boundary === 'tree' && target.kind === 'scene' && SCENES_WITH_TREE_COMPAT.includes(target.scene)) ||
				policy[boundary] !== undefined,
		);
		if (boundaries.length === 0) return;

		const heading = parent.createDiv({ cls: 'vaultman-instance-info-field' });
		heading.createEl('div', {
			cls: 'vaultman-instance-info-field-label',
			text: translate('toolbar.instance_info.native_compat'),
		});
		const controls = heading.createDiv({ cls: 'vaultman-instance-info-native-controls' });
		for (const boundary of boundaries) {
			const control = controls.createDiv({ cls: 'vaultman-instance-info-native-control' });
			const labelText = translate(`sasi.presentation.${boundary}.compatible`).replace(/:\s*.*/, '');
			const id = `vm-instance-info-${this.targetKey(target)}-native-${boundary}`;
			control.createEl('label', { text: labelText, attr: { for: id } });
			const select = control.createEl('select', {
				cls: 'dropdown',
				attr: { id, 'aria-label': labelText },
			});
			for (const mode of NATIVE_COMPAT_MODES) {
				select.createEl('option', {
					value: mode,
					text: translate(`toolbar.instance_info.compat.${mode}`),
				});
			}
			select.value = policy[boundary] ?? 'inherit';
			select.addEventListener('change', () => {
				const mode = select.value as (typeof NATIVE_COMPAT_MODES)[number];
				if (!NATIVE_COMPAT_MODES.includes(mode)) {
					select.value = policy[boundary] ?? 'inherit';
					return;
				}
				const next = applySceneConfigPath(
					this.currentLayer(target),
					['nativeCompat', boundary],
					mode === 'inherit' ? undefined : (mode as NativeCompatMode),
				);
				this.persistLayer(target, next);
			});
		}
	}

	private saveFieldValue(
		target: OverrideTarget,
		field: SceneConfigEditableField,
		value: unknown,
	): void {
		const result = parseSceneConfigEditorInput(
			field,
			sceneConfigEditorKind(field) === 'boolean' ? String(value) :
				sceneConfigEditorKind(field) === 'enum' ? String(value) : JSON.stringify(value),
			target.kind === 'scene' ? target.scene : undefined,
			target.kind === 'scene' ? this.sceneConfigPort?.read(target.scene).viewMode : undefined,
		);
		if (!result.ok) {
			new Notice(translate('toolbar.instance_info.incompatible_value'));
			return;
		}
		const next = applySceneConfigPath(this.currentLayer(target), [field], result.value);
		this.persistLayer(target, next);
	}

	private persistLayer(target: OverrideTarget, next: SceneConfig): void {
		const key = this.targetKey(target);
		this.overrideLayers.set(key, next);
		this.pendingPersist = this.pendingPersist
			.then(async () => {
				if (!this.sceneConfigPort) return;
				if (target.kind === 'instance') {
					await this.sceneConfigPort.proposeSelfConfig?.(next);
				} else {
					await this.sceneConfigPort.proposeSceneOverrides?.(target.scene, next);
				}
				if (this.lastActiveValueEl) {
					this.lastActiveValueEl.textContent = new Date().toLocaleString();
				}
			})
			.catch((error: unknown) => {
				new Notice(String(error instanceof Error ? error.message : error));
			});
	}

	private currentLayer(target: OverrideTarget): SceneConfig {
		return this.overrideLayers.get(this.targetKey(target)) ?? {};
	}

	private targetKey(target: OverrideTarget): string {
		return target.kind === 'instance' ? 'instance' : `scene:${target.scene}`;
	}

	private fieldLabel(field: string): string {
		const key = `toolbar.instance_info.field.${field}`;
		const translated = translate(key);
		return translated === key ? formatSceneConfigFieldLabel(field) : translated;
	}

	private enumLabel(field: SceneConfigEditableField, value: string): string {
		const knownKeys: Partial<Record<SceneConfigEditableField, string>> = {
			viewMode: 'viewmode.mode',
			interactionMode: 'interaction.mode',
			taskCellDisplayMode: 'settings.task_cell_display_mode',
			sceneLabelMode: 'toolbar.instance_info.mode',
			autoRevealMode: 'toolbar.instance_info.mode',
			createActionsPlacement: 'toolbar.instance_info.create_actions_placement',
			showOptionsOverride: 'viewmenu.options',
		};
		const base = knownKeys[field];
		const key = base ? `${base}.${value}` : '';
		const translated = key ? translate(key) : key;
		return translated && translated !== key ? translated : value;
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
