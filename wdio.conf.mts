import path from 'node:path';
import { env } from 'node:process';
import { parseObsidianVersions } from 'wdio-obsidian-service';

const cacheDir = path.resolve('.obsidian-cache');
const desktopVersions = await parseObsidianVersions(
	env.OBSIDIAN_VERSIONS ?? 'latest/latest',
	{ cacheDir },
);

export const config: WebdriverIO.Config = {
	runner: 'local',
	framework: 'mocha',
	specs: ['./test/e2e/**/*.e2e.ts'],
	maxInstances: Number(env.WDIO_MAX_INSTANCES || 1),
	capabilities: desktopVersions.map<WebdriverIO.Capabilities>(([appVersion, installerVersion]) => ({
		browserName: 'obsidian',
		'wdio:obsidianOptions': {
			appVersion,
			installerVersion,
			plugins: ['.'],
			vault: 'test/vaults/e2e',
		},
	})),
	services: ['obsidian'],
	reporters: ['obsidian'],
	mochaOpts: {
		ui: 'bdd',
		timeout: 60_000,
	},
	waitforInterval: 250,
	waitforTimeout: 10_000,
	logLevel: 'warn',
	cacheDir,
	injectGlobals: false,
};
