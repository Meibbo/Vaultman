import tseslint from 'typescript-eslint';
import obsidianmd from 'eslint-plugin-obsidianmd';
import globals from 'globals';
import { globalIgnores } from 'eslint/config';

type FlatConfig = {
	files?: unknown;
	rules?: Record<string, unknown>;
	[key: string]: unknown;
};

const obsidianRecommended = (
	obsidianmd as { configs: { recommended: FlatConfig[] } }
).configs.recommended.map((config) => {
	const hasGlobalObsidianRules =
		config.files === undefined &&
		Object.keys(config.rules ?? {}).some((ruleName) =>
			ruleName.startsWith('obsidianmd/'),
		);

	return hasGlobalObsidianRules
		? {
				...config,
				files: ['**/*.ts', '**/*.tsx'],
			}
		: config;
});

export default tseslint.config(
	{
		linterOptions: {
			reportUnusedDisableDirectives: 'off',
		},
		languageOptions: {
			globals: {
				...globals.browser,
				activeDocument: 'readonly',
			},
			parserOptions: {
				projectService: {
					allowDefaultProject: [
						'eslint.config.mts',
						'manifest.json',
						'svelte.config.js',
						'vitest.unit.config.mts',
						'wdio.conf.mts',
						'stylelint.config.mjs',
					],
				},
				tsconfigRootDir: import.meta.dirname,
				extraFileExtensions: ['.json'],
			},
		},
	},
	{
		files: ['scripts/**/*.mjs', '*.mjs', '*.mts'],
		languageOptions: {
			globals: {
				...globals.node,
			},
		},
	},
	...obsidianRecommended,
	{
		files: ['test/**/*.ts', 'test/**/*.mts', 'wdio.conf.mts'],
		rules: {
			'obsidianmd/no-nodejs-modules': 'off',
			'@typescript-eslint/unbound-method': 'off',
			'eslint-comments/no-restricted-disable': 'off',
			'eslint-comments/disable-enable-pair': 'off',
		},
		languageOptions: {
			globals: {
				...globals.node,
			},
		},
	},
	globalIgnores([
		'node_modules',
		'dist',
		'obsidian-sample-plugin',
		'esbuild.config.mjs',
		'eslint.config.js',
		'version-bump.mjs',
		'versions.json',
		'main.js',
		'coverage',
		'.obsidian',
		'.worktrees',
		'.claude',
		'.agents',
	]),
);
