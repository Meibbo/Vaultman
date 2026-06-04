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
					],
				},
				tsconfigRootDir: import.meta.dirname,
				extraFileExtensions: ['.json'],
			},
		},
	},
	{
		files: ['scripts/**/*.mjs', '*.mjs'],
		languageOptions: {
			globals: {
				...globals.node,
			},
		},
	},
	...obsidianRecommended,
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
	]),
);
