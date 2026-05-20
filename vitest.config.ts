import { defineConfig } from 'vitest/config';
import { existsSync } from 'node:fs';
import { dirname, join, parse, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { svelte } from '@sveltejs/vite-plugin-svelte';

const obsidianMockPath = fileURLToPath(
	new URL('./test/helpers/obsidian-mocks.ts', import.meta.url),
);
const notebookNavigatorRoot = findNotebookNavigatorRoot();
const notebookNavigatorComparisonTest =
	'test/unit/performance/explorerNotebookNavigatorComparison.test.ts';

function findNotebookNavigatorRoot(): string | undefined {
	const envRoot = process.env.VM_NOTEBOOK_NAVIGATOR_ROOT;
	const candidates = [
		...(envRoot ? [envRoot] : []),
		...notebookNavigatorSiblingCandidates(process.cwd()),
		...notebookNavigatorSiblingCandidates(fileURLToPath(new URL('.', import.meta.url))),
	];

	for (const candidate of new Set(candidates)) {
		if (existsSync(join(candidate, 'src/hooks/listPaneData/listItems.ts'))) {
			return candidate;
		}
	}
}

function notebookNavigatorSiblingCandidates(start: string): string[] {
	const candidates: string[] = [];
	let current = resolve(start);
	const root = parse(current).root;

	while (true) {
		candidates.push(resolve(current, '..', 'notebook-navigator'));
		if (current === root) break;
		current = dirname(current);
	}

	return candidates;
}

export default defineConfig({
	test: {
		projects: [
			{
				extends: true,
				test: {
					name: 'integration',
					fileParallelism: false,
					environment: 'node',
					include: ['test/integration/**/*.test.ts'],
					setupFiles: ['test/integration/setup.ts'],
					globalSetup: ['obsidian-integration-testing/vitest-global-setup'],
					testTimeout: 60_000,
					hookTimeout: 60_000,
				},
			},
			{
				extends: true,
				plugins: [svelte()],
				resolve: {
					conditions: ['browser'],
				},
				test: {
					name: 'component',
					environment: 'jsdom',
					include: ['test/component/**/*.test.ts'],
					alias: {
						obsidian: obsidianMockPath,
					},
				},
			},
			{
				extends: true,
				plugins: [svelte()],
				test: {
					name: 'unit',
					environment: 'node',
					include: ['test/unit/**/*.test.ts'],
					exclude: notebookNavigatorRoot ? [] : [notebookNavigatorComparisonTest],
					alias: {
						...(notebookNavigatorRoot ? { '@notebook-navigator': notebookNavigatorRoot } : {}),
						obsidian: obsidianMockPath,
					},
				},
			},
		],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html'],
			include: ['src/utils/**', 'src/logic/**', 'src/services/**'],
			exclude: [
				'**/*-WIP*',
				'**/*_WIP*',
				'**/*.svelte',
				'src/services/serviceLayout-WIP.svelte.ts',
				'src/services/serviceStats-WIP.svelte.ts',
				'src/services/serviceDecorate_WIP.ts',
			],
			thresholds: {
				lines: 60,
				functions: 65,
				branches: 55,
				statements: 60,
			},
		},
	},
});
