import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const scriptPath = fileURLToPath(
	new URL('../../../scripts/run-explorer-scroll-smoke.mjs', import.meta.url),
);

describe('explorer scroll smoke runner script', () => {
	it('checks for an existing scroll target before running the toggle open command', () => {
		const source = readFileSync(scriptPath, 'utf8');
		const targetCheckIndex = source.indexOf('scrollTargetAlreadyOpen');
		const frameCheckIndex = source.indexOf('vaultmanFrameAlreadyOpen');
		const openCommandIndex = source.indexOf(
			"runChecked('obsidian', [`vault=${VAULT}`, 'command', 'id=vaultman:open'",
		);

		expect(targetCheckIndex).toBeGreaterThan(0);
		expect(frameCheckIndex).toBeGreaterThan(targetCheckIndex);
		expect(openCommandIndex).toBeGreaterThan(frameCheckIndex);
		expect(source).toContain('Vaultman Explorer scroll target already open');
		expect(source).toContain('{ printOutput: false }');
		expect(source).toContain('--strict-idle-ms');
		expect(source).toContain('strictIdleMs');
		expect(source).not.toContain("['command', 'id=vaultman:open', `vault=${VAULT}`]");
	});
});
