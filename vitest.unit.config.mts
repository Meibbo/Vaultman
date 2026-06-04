import { defineConfig } from 'vitest/config';

export default defineConfig({
	resolve: {
		alias: {
			obsidian: new URL('./test/obsidian-stub.ts', import.meta.url).pathname,
		},
	},
	test: {
		environment: 'node',
		fileParallelism: false,
		include: ['test/unit/**/*.test.ts'],
	},
});
