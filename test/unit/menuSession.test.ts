import { describe, expect, it } from 'vitest';
import { MenuSession, type NativeMenuHandle } from '../../src/logic/logicMenuSession';

class MockMenu implements NativeMenuHandle {
	isOpen = true;
	private hideCallbacks: (() => void)[] = [];

	hide(): void {
		if (!this.isOpen) return;
		this.isOpen = false;
		for (const cb of this.hideCallbacks) cb();
	}

	onHide(callback: () => void): void {
		this.hideCallbacks.push(callback);
	}
}

describe('MenuSession lifecycle and single-menu enforcement', () => {
	it('toggles menu closed when called with the same owner key and generation', () => {
		const session = new MenuSession();
		const owner = { key: 'tabs', generation: 1 };
		let menu = new MockMenu();

		session.toggle(owner, () => {
			menu = new MockMenu();
			return menu;
		});
		expect(menu.isOpen).toBe(true);

		// Toggle same owner should close it
		session.toggle(owner, () => new MockMenu());
		expect(menu.isOpen).toBe(false);
	});

	it('replaces open menu when a different owner key or generation calls toggle or replace', () => {
		const session = new MenuSession();
		const ownerA = { key: 'tabs', generation: 1 };
		const ownerB = { key: 'sort', generation: 1 };

		let menuA = new MockMenu();
		session.toggle(ownerA, () => {
			menuA = new MockMenu();
			return menuA;
		});
		expect(menuA.isOpen).toBe(true);

		let menuB = new MockMenu();
		session.toggle(ownerB, () => {
			menuB = new MockMenu();
			return menuB;
		});

		expect(menuA.isOpen).toBe(false);
		expect(menuB.isOpen).toBe(true);
	});

	it('closes open menu when closeGeneration is called for current generation or destroy occurs', () => {
		const session = new MenuSession();
		const owner = { key: 'view', generation: 2 };

		let menu = new MockMenu();
		session.replace(owner, () => {
			menu = new MockMenu();
			return menu;
		});

		session.closeGeneration(2);
		expect(menu.isOpen).toBe(false);

		let menu2 = new MockMenu();
		session.replace({ key: 'view', generation: 3 }, () => {
			menu2 = new MockMenu();
			return menu2;
		});

		session.close();
		expect(menu2.isOpen).toBe(false);
	});

	it('clears session on outside hide without closing replacement menu', () => {
		const session = new MenuSession();
		const ownerA = { key: 'tabs', generation: 1 };
		const ownerB = { key: 'sort', generation: 1 };

		let menuA = new MockMenu();
		session.replace(ownerA, () => {
			menuA = new MockMenu();
			return menuA;
		});

		let menuB = new MockMenu();
		session.replace(ownerB, () => {
			menuB = new MockMenu();
			return menuB;
		});

		// Outside hide of menuA (which was already closed by replace) should not touch menuB
		menuA.hide();
		expect(menuB.isOpen).toBe(true);
	});
});
