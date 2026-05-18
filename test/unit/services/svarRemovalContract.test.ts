import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../../..');

function readRepoFile(path: string): string {
	return readFileSync(resolve(root, path), 'utf8');
}

describe('SVAR removal contract', () => {
	it('does not ship the SVAR filemanager package or transitive SVAR lock entries', () => {
		const packageJson = JSON.parse(readRepoFile('package.json')) as {
			dependencies?: Record<string, string>;
			devDependencies?: Record<string, string>;
		};
		const allDependencies = {
			...packageJson.dependencies,
			...packageJson.devDependencies,
		};

		expect(allDependencies).not.toHaveProperty('@svar-ui/svelte-filemanager');
		expect(readRepoFile('pnpm-lock.yaml')).not.toContain('@svar-ui/');
	});

	it('removes active SVAR view, command, and view-mode paths', () => {
		for (const removedFile of [
			'src/components/views/ViewSvarFileManager.svelte',
			'src/types/typeSvarLeaf.ts',
		]) {
			expect(existsSync(resolve(root, removedFile))).toBe(false);
		}

		const activeSourceFiles = [
			'src/main.ts',
			'src/services/serviceCommands.ts',
			'src/types/typeViews.ts',
			'src/index/i18n/en.ts',
			'src/components/containers/panelExplorer.svelte',
			'src/components/layout/overlays/overlayViewMenu.svelte',
		];

		for (const path of activeSourceFiles) {
			const source = readRepoFile(path);
			expect(source, path).not.toMatch(/svar/i);
			expect(source, path).not.toContain('vaultman-svar-filemanager');
			expect(source, path).not.toContain('open-svar-filemanager');
		}
	});
});
