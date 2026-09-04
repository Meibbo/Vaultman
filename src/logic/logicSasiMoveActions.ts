import type { SasiRegistry } from './logicSasiRegistry';

/**
 * U130-01: las cuatro del move mode. Hoy viven como metodos privados de
 * explorerProps, asi que el panelWidget no puede pintarlas y el futuro
 * layoutBuilder no puede componerlas en macros. Declararlas aqui es lo que las
 * hace listables e invocables desde fuera; el cableado va aparte.
 *
 * Solo `proceed` lleva `mutatesVault`: es la unica que escribe en el vault, y
 * su forma es la del squircle `apply all operations` de queueScene -- un action
 * que invoca N operations sobre el conjunto stageado.
 */
export function registerMoveActions(registry: SasiRegistry): void {
	registry.register({
		id: 'vaultman.move.proceed',
		axis: 'function',
		kind: 'operation',
		labelKey: 'sasi.move.proceed',
		icon: 'lucide-check',
		mutatesVault: true,
		supports: [{ surface: 'panelWidget' }, { surface: 'contextMenu' }],
	});
	registry.register({
		id: 'vaultman.move.cancel',
		axis: 'function',
		kind: 'action',
		labelKey: 'sasi.move.cancel',
		icon: 'lucide-x',
		supports: [{ surface: 'panelWidget' }, { surface: 'contextMenu' }],
	});
	registry.register({
		id: 'vaultman.move.toggleWrite',
		axis: 'function',
		kind: 'action',
		labelKey: 'sasi.move.toggle_write',
		icon: 'lucide-scissors',
		supports: [{ surface: 'searchbox' }],
	});
	registry.register({
		id: 'vaultman.move.toggleOriginDisposition',
		axis: 'function',
		kind: 'action',
		labelKey: 'sasi.move.toggle_origin',
		icon: 'lucide-copy',
		supports: [{ surface: 'searchbox' }],
	});
	registry.register({
		id: 'vaultman.move.toggleMoveKind',
		axis: 'function',
		kind: 'action',
		labelKey: 'sasi.move.toggle_kind',
		icon: 'lucide-arrow-left-right',
		// Es el UNICO control propio de la barra. Proceed y Cancel siguen en el
		// panelWidget: duplicar Proceed aqui daria dos caminos a una escritura
		// de vault y dos sitios que mantener sincronizados.
		supports: [{ surface: 'statusBar' }],
	});
}
