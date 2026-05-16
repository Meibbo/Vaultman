import { spawnSync } from 'node:child_process';

const severityRank = new Map([
	['info', 0],
	['low', 1],
	['moderate', 2],
	['high', 3],
	['critical', 4],
]);

const options = parseOptions(process.argv.slice(2));
const auditArgs = ['audit', '--json'];

if (options.scope === 'prod') {
	auditArgs.push('--prod');
} else if (options.scope === 'dev') {
	auditArgs.push('--dev');
} else {
	fail(`Unknown audit scope "${options.scope}". Use "prod" or "dev".`);
}

const command = process.platform === 'win32' ? 'cmd.exe' : 'pnpm';
const commandArgs = process.platform === 'win32' ? ['/d', '/s', '/c', 'pnpm', ...auditArgs] : auditArgs;
const result = spawnSync(command, commandArgs, {
	encoding: 'utf8',
});

const stdout = result.stdout ?? '';
const stderr = result.stderr ?? '';

if (!stdout.trim()) {
	process.stderr.write(stderr);
	if (result.error) {
		console.error(result.error.message);
	}
	process.exit(result.status ?? 1);
}

const report = parseAuditReport(stdout);
const advisories = Object.values(report.advisories ?? {});
const reportThreshold = rank(options.reportLevel);
const failThreshold = rank(options.failLevel);
const visibleAdvisories = advisories
	.filter((advisory) => rank(advisory.severity) >= reportThreshold)
	.sort((left, right) => rank(right.severity) - rank(left.severity) || left.module_name.localeCompare(right.module_name));
const failingAdvisories = advisories.filter((advisory) => rank(advisory.severity) >= failThreshold);

printSummary(report, options.scope);

if (visibleAdvisories.length > 0) {
	console.log(`\n${options.scope} advisories at ${options.reportLevel}+ threshold:`);
	for (const advisory of visibleAdvisories) {
		const patched = advisory.patched_versions ? ` patched: ${advisory.patched_versions}` : '';
		console.log(`- ${advisory.severity}: ${advisory.module_name} ${advisory.github_advisory_id}${patched}`);
		console.log(`  ${advisory.title}`);
	}
}

if (failingAdvisories.length > 0) {
	console.error(`\n${options.scope} audit failed: ${failingAdvisories.length} advisories at ${options.failLevel}+ threshold.`);
	process.exit(1);
}

console.log(`${options.scope} audit passed: no advisories at ${options.failLevel}+ threshold.`);

function parseOptions(args) {
	const parsed = {
		failLevel: 'high',
		reportLevel: 'moderate',
		scope: 'prod',
	};

	for (const arg of args) {
		const [key, value] = arg.replace(/^--/, '').split('=');
		if (key === 'scope' && value) parsed.scope = value;
		if (key === 'fail-level' && value) parsed.failLevel = value;
		if (key === 'report-level' && value) parsed.reportLevel = value;
	}

	return parsed;
}

function parseAuditReport(output) {
	try {
		return JSON.parse(output);
	} catch (error) {
		process.stderr.write(output);
		fail(`Unable to parse pnpm audit JSON: ${error.message}`);
	}
}

function printSummary(report, scope) {
	const vulnerabilities = report.metadata?.vulnerabilities ?? {};
	const summary = ['info', 'low', 'moderate', 'high', 'critical']
		.map((severity) => `${severity}:${vulnerabilities[severity] ?? 0}`)
		.join(' ');
	console.log(`${scope} audit summary: ${summary}`);
}

function rank(severity) {
	const value = severityRank.get(severity);
	if (value === undefined) fail(`Unknown severity "${severity}".`);
	return value;
}

function fail(message) {
	console.error(message);
	process.exit(1);
}
