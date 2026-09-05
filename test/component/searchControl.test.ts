import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import SearchControl from '../../src/components/layout/searchControl.svelte';
import type { SasiNode } from '../../src/services/serviceSasiProvider';

/**
 * U130-05b: el searchbox MONTADO.
 *
 * El criterio de aceptacion de esta unidad es "no cambia nada", y eso solo se
 * puede afirmar sobre el DOM que sale. Los guards de fuente que quedan miran
 * cosas que no se ven en el DOM (un `<button` crudo en la plantilla, una clase
 * por indice); estas miran el resultado.
 */
const NODES: Record<string, SasiNode> = {
	'vaultman.search.cycleCategory': {
		id: 'vaultman.search.cycleCategory',
		labelKey: 'filter.category.all_props',
		icon: 'lucide-search',
		kind: 'action',
	},
	'vaultman.search.createTarget': {
		id: 'vaultman.search.createTarget',
		labelKey: 'filter.create',
		icon: 'lucide-plus',
		kind: 'action',
	},
};

describe('searchControl montado', () => {
	let target: HTMLElement;
	let instance: ReturnType<typeof mount> | null = null;

	const icon = (el: HTMLElement, name: string) => {
		el.setAttribute('data-icon', name);
		return {
			update(next: string) {
				el.setAttribute('data-icon', next);
			},
		};
	};

	const render = (props: Record<string, unknown> = {}) => {
		instance = mount(SearchControl, {
			target,
			props: {
				value: '',
				placeholder: 'Search',
				onValueChange: () => {},
				resolve: (id: string) => NODES[id] ?? null,
				translate: (key: string) => `T(${key})`,
				icon,
				...props,
			},
		});
		flushSync();
		return target;
	};

	const reset = () => {
		if (instance) {
			void unmount(instance);
			instance = null;
		}
		target.innerHTML = '';
	};

	beforeEach(() => {
		target = document.createElement('div');
		document.body.appendChild(target);
	});

	afterEach(() => {
		reset();
		target.remove();
	});

	it('sin reparto no pinta decorador: Snippets y Plugins salen vacios', () => {
		const el = render({ trailingActionIds: [] });
		expect(el.querySelector('.vaultman-filters-search-decorator')).toBeNull();
	});

	it('pinta una celda por id, en el orden del reparto', () => {
		const el = render({
			trailingActionIds: [
				'vaultman.search.cycleCategory',
				'vaultman.search.createTarget',
			],
		});
		const cells = el.querySelectorAll(
			'.vaultman-filters-search-decorator .vaultman-action-cell',
		);
		expect(cells).toHaveLength(2);
		expect(cells[0].getAttribute('data-icon')).toBe('lucide-search');
		expect(cells[1].getAttribute('data-icon')).toBe('lucide-plus');
	});

	it('las celdas viven DENTRO del root de busqueda, no en su propia fila', () => {
		// La Task 2.1 de U121 pedia esto y sus guards nunca lo afirmaron:
		// estuvieron verdes doce horas mientras las celdas caian a otra linea.
		const el = render({ trailingActionIds: ['vaultman.search.cycleCategory'] });
		const root = el.querySelector('.search-input-container') as HTMLElement;
		const cell = el.querySelector('.vaultman-action-cell') as HTMLElement;
		expect(root.contains(cell)).toBe(true);
	});

	it('usa el slot decorador de Core, y solo uno', () => {
		const el = render({ trailingActionIds: ['vaultman.search.cycleCategory'] });
		expect(el.querySelectorAll('.input-right-decorator')).toHaveLength(1);
	});

	it('no queda ni un boton crudo en el decorador', () => {
		const el = render({
			trailingActionIds: [
				'vaultman.search.cycleCategory',
				'vaultman.search.createTarget',
			],
		});
		const decorator = el.querySelector('.vaultman-filters-search-decorator')!;
		const plain = Array.from(decorator.querySelectorAll('button')).filter(
			(b) => !b.classList.contains('vaultman-action-cell'),
		);
		expect(plain).toHaveLength(0);
		expect(decorator.querySelector('.vaultman-filters-search-mode')).toBeNull();
		expect(decorator.querySelector('.vaultman-filters-search-create')).toBeNull();
	});

	it('invoca por actionId, no por indice', () => {
		// La clase por indice (`i === 0`) era lo que ataba el significado de un
		// control a su POSICION en la lista.
		const onInvoke = vi.fn();
		const el = render({
			trailingActionIds: [
				'vaultman.search.cycleCategory',
				'vaultman.search.createTarget',
			],
			onInvoke,
		});
		el.querySelectorAll<HTMLButtonElement>('.vaultman-action-cell')[1].click();
		expect(onInvoke).toHaveBeenCalledWith('vaultman.search.createTarget');
	});

	it('el toggleState solo alcanza a los ids que lo declaran', () => {
		const el = render({
			trailingActionIds: [
				'vaultman.search.cycleCategory',
				'vaultman.search.createTarget',
			],
			toggleState: { 'vaultman.search.cycleCategory': true },
		});
		const cells = el.querySelectorAll('.vaultman-action-cell');
		expect(cells[0].getAttribute('aria-pressed')).toBe('true');
		expect(cells[1].getAttribute('aria-pressed')).toBeNull();
	});

	it('un id sin cara se pinta deshabilitado y VISIBLE, no se descarta', () => {
		const el = render({ trailingActionIds: ['vaultman.move.retirada'] });
		const cell = el.querySelector<HTMLButtonElement>('.vaultman-action-cell');
		expect(cell).not.toBeNull();
		expect(cell!.disabled).toBe(true);
	});

	it('el boton de limpiar de Core sigue vivo y sigue siendo el suyo', () => {
		// `.vaultman-filters-search-clear` no se renderizo nunca; la regla que lo
		// nombraba no casaba con nada en el movil.
		const el = render({ value: 'x' });
		expect(el.querySelector('.search-input-clear-button')).not.toBeNull();
		expect(el.querySelector('.vaultman-filters-search-clear')).toBeNull();
	});

	it('las tres variantes visten el pill distinto', () => {
		for (const [variant, cls] of [
			['inline', 'vaultman-filters-header-search-pill--inline'],
			['phone', 'vaultman-filters-header-search-pill--phone'],
			['row', 'vaultman-filters-header-search-pill--row'],
		] as const) {
			const el = render({ variant });
			expect(el.querySelector(`.${cls}`), variant).not.toBeNull();
			reset();
		}
	});

	it('solo hay UN input de busqueda y ningun segundo lupa', () => {
		const el = render({ trailingActionIds: ['vaultman.search.cycleCategory'] });
		expect(el.querySelectorAll('input')).toHaveLength(1);
		expect(el.querySelector('.search-input-icon')).toBeNull();
	});
});
