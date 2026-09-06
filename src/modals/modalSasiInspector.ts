import { Modal, type App } from 'obsidian';
import { translate } from '../i18n/index';
import type {
	SasiAxis,
	SasiFunctionKind,
	SasiRegistry,
} from '../logic/logicSasiRegistry';

export interface SasiInspectorEntry {
	id: string;
	labelKey: string;
	icon: string | null;
	kind: SasiFunctionKind | null;
	mutatesVault: boolean;
	surfaces: readonly string[];
	composes: readonly string[];
}

export interface SasiInspectorSection {
	axis: SasiAxis;
	labelKey: string;
	entries: readonly SasiInspectorEntry[];
}

/** El orden del mapa del dev: Providers, Kinds, FUNCTIONS. */
const AXES: readonly { axis: SasiAxis; labelKey: string }[] = [
	{ axis: 'provider', labelKey: 'sasi.inspector.axis.provider' },
	{ axis: 'kind', labelKey: 'sasi.inspector.axis.kind' },
	{ axis: 'function', labelKey: 'sasi.inspector.axis.function' },
];

/**
 * U130-01: el modelo que el modal pinta. Puro a proposito -- el modal no
 * calcula nada, y asi esto se prueba sin DOM y sin Obsidian.
 *
 * Los tres ejes salen SIEMPRE, tambien los vacios: un eje que desaparece no le
 * dice al agente que consulta que existe pero esta sin poblar, que es justo lo
 * que necesita saber para no reinventar un kind que ya existe.
 */
export function buildSasiInspectorModel(
	registry: SasiRegistry,
): readonly SasiInspectorSection[] {
	return AXES.map(({ axis, labelKey }) => ({
		axis,
		labelKey,
		entries: registry.list(axis).map((def) => ({
			id: def.id,
			labelKey: def.labelKey,
			icon: def.icon ?? null,
			kind: def.kind ?? null,
			mutatesVault: def.mutatesVault === true,
			surfaces: def.supports.map((support) => support.surface),
			composes: def.composes ?? [],
		})),
	}));
}

/**
 * WOW: SASI proyectado en un Modal nativo. No se expone en el `providers_menu`
 * del sidebar para no saturar al usuario comun (intent §7.2).
 */
export class SasiInspectorModal extends Modal {
	private readonly registry: SasiRegistry;

	constructor(app: App, registry: SasiRegistry) {
		super(app);
		this.registry = registry;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('vaultman-sasi-inspector');
		contentEl.createEl('h2', { text: translate('sasi.inspector.title') });

		for (const section of buildSasiInspectorModel(this.registry)) {
			contentEl.createEl('h3', { text: translate(section.labelKey) });
			if (section.entries.length === 0) {
				contentEl.createDiv({
					cls: 'vaultman-sasi-inspector-empty',
					text: translate('sasi.inspector.empty'),
				});
				continue;
			}
			const list = contentEl.createEl('ul', {
				cls: 'vaultman-sasi-inspector-list',
			});
			for (const entry of section.entries) {
				const item = list.createEl('li');
				item.createSpan({
					cls: 'vaultman-sasi-inspector-id',
					text: entry.id,
				});
				item.createSpan({
					cls: 'vaultman-sasi-inspector-label',
					text: translate(entry.labelKey),
				});
				if (entry.kind) {
					item.createSpan({
						cls: 'vaultman-sasi-inspector-kind',
						text: entry.kind,
					});
				}
				if (entry.mutatesVault) {
					item.createSpan({
						cls: 'vaultman-sasi-inspector-mutates',
						text: translate('sasi.inspector.mutates_vault'),
					});
				}
				item.createSpan({
					cls: 'vaultman-sasi-inspector-surfaces',
					text: entry.surfaces.join(', '),
				});
			}
		}
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
