// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { FoulDetectionService } from '../../../src/services/serviceFoulDetection.svelte';

describe('FoulDetectionService', () => {
	let svc: FoulDetectionService;

	beforeEach(() => {
		svc = new FoulDetectionService();
		svc.enabled = true;
	});

	it('records portal-misplaced fouls', () => {
		svc.recordPortalFoul('portal-misplaced');
		expect(svc.fouls.length).toBe(1);
		expect(svc.fouls[0].kind).toBe('portal-misplaced');
	});

	it('does nothing when disabled', () => {
		svc.enabled = false;
		svc.recordPortalFoul('portal-misplaced');
		expect(svc.fouls.length).toBe(0);
	});

	it('records dom-mimicry foul when Thin + native lacks .nav-file children', () => {
		const root = document.createElement('div');
		root.classList.add('vm-root', 'vm-mode-thin', 'vm-id-native');
		const explorer = document.createElement('div');
		explorer.setAttribute('data-vm-explorer', 'files');
		root.appendChild(explorer);
		document.body.appendChild(root);
		svc.checkDomMimicry(root);
		const m = svc.fouls.find((f) => f.kind === 'dom-mimicry');
		expect(m).toBeDefined();
		root.remove();
	});

	it('skips dom-mimicry check when mode is not thin', () => {
		const root = document.createElement('div');
		root.classList.add('vm-root', 'vm-mode-balanced', 'vm-id-native');
		const explorer = document.createElement('div');
		explorer.setAttribute('data-vm-explorer', 'files');
		root.appendChild(explorer);
		document.body.appendChild(root);
		svc.checkDomMimicry(root);
		expect(svc.fouls.find((f) => f.kind === 'dom-mimicry')).toBeUndefined();
		root.remove();
	});

	it('reset clears the fouls list', () => {
		svc.recordPortalFoul('portal-misplaced');
		svc.reset();
		expect(svc.fouls.length).toBe(0);
	});
});
