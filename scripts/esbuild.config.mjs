import esbuild from "esbuild";
import process from "process";
import { builtinModules as builtins } from "module";
import esbuildSvelte from "esbuild-svelte";
import { sveltePreprocess } from "svelte-preprocess";
import { sassPlugin } from "esbuild-sass-plugin";

const prod = process.argv[2] === "production";

const context = await esbuild.context({
	entryPoints: {
		main: "src/main.ts",
		styles: "src/main.scss",
	},
	bundle: true,
	external: [
		"obsidian",
		"electron",
		"@codemirror/autocomplete",
		"@codemirror/collab",
		"@codemirror/commands",
		"@codemirror/language",
		"@codemirror/lint",
		"@codemirror/search",
		"@codemirror/state",
		"@codemirror/view",
		"@lezer/common",
		"@lezer/highlight",
		"@lezer/lr",
		...builtins,
	],
	format: "cjs",
	target: "es2022",
	logLevel: "info",
	sourcemap: prod ? false : "inline",
	treeShaking: true,
	minify: prod,
	outdir: "./",
	plugins: [
		esbuildSvelte({
			compilerOptions: {
				css: "injected",
			},
			preprocess: sveltePreprocess(),
			filterWarnings: (w) => !w.code.startsWith('a11y_') && w.code !== 'non_reactive_update',
		}),
		sassPlugin(),
	],
});

if (prod) {
	await context.rebuild();
	process.exit(0);
} else {
	await context.watch();
}
