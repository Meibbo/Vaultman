import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import CellAction from '../../src/components/cells/cellAction.svelte';
import type { SasiNode } from '../../src/services/serviceSasiProvider';

/**
 * U130-05: la celda de accion, MONTADA.
 *
 * Sustituye a los guards de fuente de `cellActionSource.test.ts`, que solo
 * miraban strings del `.svelte`. Un test de fuente lo satisface un stub; este
 * pinta el componente y mira el DOM que sale.
 */
describe('cellAction montada', () => {
	let target: HTMLElement;
	let instance: ReturnType<typeof mount> | null = null;

	const node: SasiNode = {
		id: 'vaultman.move.toggleWrite',
		labelKey: 'sasi.move.toggle_write',
		icon: 'lucide-scissors',
		kind: 'action',
	};

	const translate = (key: string) => `T(${key})`;
	// `use:icon` es una accion de Svelte: recibe el elemento y el nombre.
	const icon = (el: HTMLElement, name: string) => {
		el.setAttribute('data-icon', name);
		return {
			update(next: string) {
				el.setAttribute('data-icon', next);
			},
		};
	};

	const render = (props: Record<string, unknown>) => {
		instance = mount(CellAction, {
			target,
			props: {
				actionId: node.id,
				resolve: () => node,
				icon,
				translate,
				...props,
			},
		});
		flushSync();
		return target.querySelector('button') as HTMLButtonElement;
	};

	beforeEach(() => {
		target = document.createElement('div');
		document.body.appendChild(target);
	});

	afterEach(() => {
		if (instance) {
			void unmount(instance);
			instance = null;
		}
		target.remove();
	});

	it('resuelve etiqueta e icono por actionId contra SASI', () => {
		const resolve = vi.fn(() => node);
		const button = render({ resolve });
		expect(resolve).toHaveBeenCalledWith('vaultman.move.toggleWrite');
		expect(button.getAttribute('aria-label')).toBe('T(sasi.move.toggle_write)');
		expect(button.getAttribute('data-icon')).toBe('lucide-scissors');
	});

	it('lleva el selector namespaced', () => {
		// Sin namespace, temas como Minimal o AnuPpuccin pisan los estilos y el
		// usuario ve las variantes de Style Settings sin efecto.
		expect(render({}).classList.contains('vaultman-action-cell')).toBe(true);
	});

	it('el placement es un slot, no una identidad', () => {
		// ADR 0005: la celda es LA MISMA en el badge y en el inline.
		const badge = render({ placement: 'badge' });
		expect(badge.classList.contains('vaultman-action-cell--badge')).toBe(true);
		expect(badge.classList.contains('vaultman-action-cell--inline')).toBe(false);
	});

	it('la misma celda en los dos placements invoca EL MISMO action', () => {
		const onInvoke = vi.fn();
		render({ placement: 'badge', onInvoke }).click();
		if (instance) {
			void unmount(instance);
			instance = null;
		}
		render({ placement: 'inline', onInvoke }).click();
		expect(onInvoke).toHaveBeenCalledTimes(2);
		expect(onInvoke.mock.calls.every(([id]) => id === node.id)).toBe(true);
	});

	it('una accion retirada se pinta DESHABILITADA y VISIBLE, no se oculta', () => {
		// Contrato de degradacion de logicCommandActions: un hueco con nombre es
		// informacion; desaparecer sin avisar es lo que hace irreparable el error.
		const button = render({ resolve: () => null });
		expect(button).not.toBeNull();
		expect(button.disabled).toBe(true);
		expect(button.classList.contains('is-unavailable')).toBe(true);
	});

	it('una accion retirada no dispara aunque se pulse', () => {
		const onInvoke = vi.fn();
		render({ resolve: () => null, onInvoke }).click();
		expect(onInvoke).not.toHaveBeenCalled();
	});

	it('el toggle refleja el estado sin logica propia del componente', () => {
		expect(render({ toggle: { on: true } }).getAttribute('aria-pressed')).toBe(
			'true',
		);
		if (instance) {
			void unmount(instance);
			instance = null;
		}
		expect(render({ toggle: { on: false } }).getAttribute('aria-pressed')).toBe(
			'false',
		);
	});

	it('sin toggle no miente con aria-pressed', () => {
		// Categoria y crear no son toggles: darles aria-pressed diria que lo son.
		expect(render({}).getAttribute('aria-pressed')).toBeNull();
	});

	it('el marcado NO cambia al alternar el toggle: la puerta contra el jitter', () => {
		// Un icono que cambia de tamano al alternar mueve el resto del searchbox
		// y el usuario pierde el sitio donde iba a pulsar.
		const off = render({ toggle: { on: false } }).outerHTML;
		if (instance) {
			void unmount(instance);
			instance = null;
		}
		const on = render({ toggle: { on: true } }).outerHTML;
		// Se normaliza el espaciado ademas de quitar los dos atributos de estado:
		// lo que se afirma es que no aparece ni desaparece ningun ELEMENTO ni
		// ninguna dimension, no que el string sea identico byte a byte.
		const strip = (html: string) =>
			html
				.replace(/aria-pressed="[^"]*"/, '')
				.replace(/\bis-active\b/, '')
				.replace(/\s+/g, ' ')
				.replace(/\s+"/g, '"');
		expect(strip(on)).toBe(strip(off));
	});
});
