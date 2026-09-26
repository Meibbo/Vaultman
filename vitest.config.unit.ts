import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		fileParallelism: false,
		environment: 'node',
		include: ['test/unit/**/*.test.ts'],
		testTimeout: 60_000,
		hookTimeout: 60_000,
	},
});