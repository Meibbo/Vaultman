import { describe, expect, it } from 'vitest';
// eslint-disable-next-line import/no-nodejs-modules -- source guard reads the runner script in Vitest's Node environment.
import { readFileSync } from 'node:fs';

const source = readFileSync(
	new URL('../../../scripts/run-explorer-scroll-smoke.mjs', import.meta.url),
	'utf8',
);

describe('explorer scroll smoke runner script', () => {
	it('checks for an existing scroll target before running the toggle open command', () => {
		const targetCheckIndex = source.indexOf('scrollTargetAlreadyOpen');
		const frameCheckIndex = source.indexOf('vaultmanFrameAlreadyOpen');
		const switchIndex = source.indexOf('ensureScrollTargetOpen');
		const openCommandIndex = source.indexOf(
			"runChecked('obsidian', [vaultArg(), 'command', 'id=vaultman:open'",
		);

		expect(targetCheckIndex).toBeGreaterThan(0);
		expect(frameCheckIndex).toBeGreaterThan(targetCheckIndex);
		expect(openCommandIndex).toBeGreaterThan(frameCheckIndex);
		expect(switchIndex).toBeGreaterThan(openCommandIndex);
		expect(source).toContain('Vaultman Explorer scroll target already open');
		expect(source).toContain('Switching Vaultman Explorer to requested view');
		expect(source).toContain('buildViewSwitchCode');
		expect(source).toContain('{ printOutput: false }');
		expect(source).toContain('--strict-idle-ms');
		expect(source).toContain('strictIdleMs');
		expect(source).toContain('--vault=VAULT');
		expect(source).toContain('vaultArg()');
		expect(source).toContain('--surface=current|files');
		expect(source).toContain('buildExplorerSurfaceCode');
		expect(source).toContain('activeScrollTargetPresent');
		expect(source).toContain('p95Delay=');
		expect(source).toContain('delayHist=');
		expect(source).toContain("['jump', 'smooth', 'monitor', 'thumb']");
		expect(source).toContain('runThumbDragSmoke');
		expect(source).toContain('Input.dispatchMouseEvent');
		expect(source).toContain('__vaultmanThumbScrollSmoke');
		expect(source).toContain('.vaultman-tree-virtual-viewport');
		expect(source).not.toContain("['command', 'id=vaultman:open', `vault=${VAULT}`]");
	});
});
