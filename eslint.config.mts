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

const obsidianRulesOff = Object.fromEntries(
	Object.keys(
		(obsidianmd as unknown as { rules?: Record<string, unknown> }).rules ?? {},
	).map((ruleName) => [`obsidianmd/${ruleName}`, 'off' as const]),
);

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
		// Build and release scripts are plain Node ESM and are not in the
		// TypeScript program. Asking the project service for them makes it
		// report a parsing error for a file it was never meant to own, so they
		// are linted without type information rather than not linted at all.
		// This block sits after the Obsidian preset so it is the one that wins.
		files: ['scripts/**/*.mjs'],
		extends: [tseslint.configs.disableTypeChecked],
		languageOptions: {
			parserOptions: {
				projectService: false,
				project: false,
			},
		},
		// The obsidianmd rules describe plugin source. A release script is not
		// a plugin, so they report on code they were never written about.
		rules: obsidianRulesOff,
	},
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
		'.svelte-check',
	]),
);
