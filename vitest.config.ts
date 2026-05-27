import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		fileParallelism: false,
		environment: 'node',
		include: ['test/integration/**/*.test.ts'],
		globalSetup: ['obsidian-integration-testing/vitest-global-setup'],
		testTimeout: 60_000,
		hookTimeout: 60_000,
	},
});
