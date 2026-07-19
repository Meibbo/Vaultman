const VERSION_PATTERN =
	/^(\d+)\.(\d+)\.(\d+)(?:-(alpha|beta|rc)\.(\d+))?$/;

const CHANNEL_BRANCHES = Object.freeze({
	alpha: 'sandbox',
	beta: 'dev',
	stable: 'main',
});

const CHANGELOG_CATEGORIES = Object.freeze([
	'Added',
	'Changed',
	'Deprecated',
	'Removed',
	'Fixed',
	'Security',
]);

export function parseVersion(version) {
	const match = VERSION_PATTERN.exec(version);
	if (!match) {
		throw new Error(`Invalid SemVer release version: ${version}`);
	}

	return {
		raw: version,
		major: Number(match[1]),
		minor: Number(match[2]),
		patch: Number(match[3]),
		channel: match[4] ?? 'stable',
		prereleaseNumber: match[5] === undefined ? null : Number(match[5]),
	};
}

export function releaseBulletinAnchor(version) {
	const parsed = parseVersion(version.trim());
	return `v${parsed.raw.toLowerCase().replace(/[^a-z0-9]+/gu, '-')}`;
}

function escapeRegExp(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

function githubHeadingAnchor(heading) {
	return heading
		.trim()
		.toLowerCase()
		.replace(/[^\p{L}\p{N}\s-]/gu, '')
		.replace(/\s/gu, '-');
}

function bulletinSection(bulletin, version) {
	const anchor = releaseBulletinAnchor(version);
	const markerPattern = new RegExp(
		`<a\\s+id=["']${escapeRegExp(anchor)}["']\\s*><\\/a>`,
		'iu',
	);
	const marker = markerPattern.exec(bulletin);
	if (!marker) {
		throw new Error(
			`Release bulletin is missing the exact anchor ${anchor} for ${version}.`,
		);
	}
	const afterMarker = bulletin.slice((marker.index ?? 0) + marker[0].length);
	const nextMarker = /<a\s+id=["'][^"']+["']\s*><\/a>/iu.exec(afterMarker);
	return {
		anchor,
		section:
			nextMarker === null
				? afterMarker
				: afterMarker.slice(0, nextMarker.index),
	};
}

function isMutableGithubMediaTarget(target) {
	return (
		/^https:\/\/github\.com\/Meibbo\/Vaultman\/(?:blob|raw)\/(?:main|dev|sandbox)(?:\/|$)/iu.test(
			target,
		) ||
		/^https:\/\/raw\.githubusercontent\.com\/Meibbo\/Vaultman\/(?:main|dev|sandbox)(?:\/|$)/iu.test(
			target,
		)
	);
}

export function validateReleaseBulletin({ bulletin, changelog, version }) {
	const { anchor, section } = bulletinSection(bulletin, version);
	const headingPattern = new RegExp(
		`^##\\s+${escapeRegExp(version)}(?:\\s|$)`,
		'mu',
	);
	if (!headingPattern.test(section)) {
		throw new Error(`Release bulletin anchor ${anchor} has no ${version} heading.`);
	}
	if (!/<!--\s*reviewed:\s*true\s*-->/iu.test(section)) {
		throw new Error(
			`Release bulletin section ${version} must declare <!-- reviewed: true -->.`,
		);
	}
	const changelogHeading = new RegExp(
		`^##\\s+(\\[${escapeRegExp(version)}\\](?:\\s+-\\s+[^\\r\\n]+)?)\\s*$`,
		'mu',
	).exec(changelog)?.[1];
	if (!changelogHeading) {
		throw new Error(`CHANGELOG is missing the target release ${version}.`);
	}
	const expectedChangelogTarget = `../CHANGELOG.md#${githubHeadingAnchor(changelogHeading)}`;

	const relativeTargets = [];
	const markdownTargetPattern =
		/(!?)\[([^\]]*)\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/gu;
	for (const match of section.matchAll(markdownTargetPattern)) {
		const isImage = match[1] === '!';
		const alt = match[2].trim();
		const target = match[3].trim();
		if (isImage && !alt) {
			throw new Error(`Release bulletin ${version} has an image without alt text.`);
		}
		if (/^https?:\/\//iu.test(target)) {
			if (isImage && isMutableGithubMediaTarget(target)) {
				throw new Error(
					`Release bulletin ${version} uses GitHub media from a mutable branch: ${target}`,
				);
			}
			continue;
		}
		if (target.startsWith('#') || /^(?:mailto|obsidian):/iu.test(target)) {
			continue;
		}
		if (target.startsWith('/')) {
			throw new Error(
				`Release bulletin ${version} target must be repository-relative: ${target}`,
			);
		}
		relativeTargets.push(target);
	}

	if (
		!relativeTargets.some((target) =>
			/^\.\.\/CHANGELOG\.md#[^\s]+$/u.test(target),
		)
	) {
		throw new Error(
			`Release bulletin ${version} must link to ../CHANGELOG.md#<release-anchor>.`,
		);
	}
	if (!relativeTargets.includes(expectedChangelogTarget)) {
		throw new Error(
			`Release bulletin ${version} must use the exact CHANGELOG anchor ${expectedChangelogTarget}.`,
		);
	}

	return { anchor, relativeTargets };
}

export function branchForChannel(channel) {
	const branch = CHANNEL_BRANCHES[channel];
	if (!branch) {
		throw new Error(`Unsupported release channel: ${channel}`);
	}
	return branch;
}

function normalizeLine(line) {
	const match = /^(\d+)\.(\d+)(?:\.0)?$/.exec(line);
	if (!match) {
		throw new Error(`Invalid release line: ${line}. Expected X.Y or X.Y.0.`);
	}
	return {
		major: Number(match[1]),
		minor: Number(match[2]),
		line: `${Number(match[1])}.${Number(match[2])}`,
	};
}

function parseKnownTags(tags) {
	return [...new Set(tags)]
		.map((tag) => {
			try {
				return parseVersion(tag);
			} catch {
				return null;
			}
		})
		.filter((version) => version !== null);
}

function compareParsedVersions(left, right) {
	for (const key of ['major', 'minor', 'patch']) {
		if (left[key] !== right[key]) return left[key] - right[key];
	}
	const rank = { alpha: 0, beta: 1, rc: 2, stable: 3 };
	if (rank[left.channel] !== rank[right.channel]) {
		return rank[left.channel] - rank[right.channel];
	}
	return (left.prereleaseNumber ?? 0) - (right.prereleaseNumber ?? 0);
}

function isSameLine(version, line) {
	return version.major === line.major && version.minor === line.minor;
}

function isSameCore(version, line) {
	return isSameLine(version, line) && version.patch === 0;
}

function assertLineIsNotBehindStable(line, versions) {
	const laterStable = versions.find(
		(version) =>
			version.channel === 'stable' &&
			(version.major > line.major ||
				(version.major === line.major && version.minor > line.minor)),
	);
	if (laterStable) {
		throw new Error(
			`Stable ${laterStable.raw} is already published; ${line.line}.x requires an explicit maintenance branch.`,
		);
	}
}

export function resolveVersion({ channel, line: lineInput, tags }) {
	branchForChannel(channel);
	const line = normalizeLine(lineInput);
	const versions = parseKnownTags(tags);
	assertLineIsNotBehindStable(line, versions);

	if (channel === 'stable') {
		const stablePatches = versions
			.filter(
				(version) => version.channel === 'stable' && isSameLine(version, line),
			)
			.map((version) => version.patch);
		const patch = stablePatches.length === 0 ? 0 : Math.max(...stablePatches) + 1;
		return `${line.line}.${patch}`;
	}

	const coreVersions = versions.filter((version) => isSameCore(version, line));
	if (channel === 'alpha') {
		const reached = ['stable', 'rc', 'beta'].find((candidate) =>
			coreVersions.some((version) => version.channel === candidate),
		);
		if (reached) {
			throw new Error(`${line.line}.0 already reached ${reached}; alpha would regress.`);
		}
	}

	if (channel === 'beta') {
		const reached = ['stable', 'rc'].find((candidate) =>
			coreVersions.some((version) => version.channel === candidate),
		);
		if (reached) {
			throw new Error(`${line.line}.0 already reached ${reached}; beta would regress.`);
		}
	}

	const existingNumbers = coreVersions
		.filter((version) => version.channel === channel)
		.map((version) => version.prereleaseNumber ?? 0);
	const nextNumber =
		existingNumbers.length === 0 ? 1 : Math.max(...existingNumbers) + 1;
	return `${line.line}.0-${channel}.${nextNumber}`;
}

export function validateExplicitVersion({ version, tags }) {
	const parsed = parseVersion(version);
	if (parsed.channel === 'rc') {
		throw new Error('RC publication is not configured; use alpha, beta, or stable.');
	}

	const line = `${parsed.major}.${parsed.minor}`;
	const suggested = resolveVersion({ channel: parsed.channel, line, tags });
	const known = parseKnownTags(tags);
	const sameChannel = known.filter(
		(candidate) =>
			candidate.channel === parsed.channel &&
			candidate.major === parsed.major &&
			candidate.minor === parsed.minor &&
			(parsed.channel === 'stable' || candidate.patch === parsed.patch),
	);

	let isHigher;
	if (parsed.channel === 'stable') {
		const highestPatch = Math.max(-1, ...sameChannel.map((item) => item.patch));
		isHigher = parsed.patch > highestPatch;
	} else {
		const highestPrerelease = Math.max(
			0,
			...sameChannel.map((item) => item.prereleaseNumber ?? 0),
		);
		isHigher =
			parsed.patch === 0 &&
			(parsed.prereleaseNumber ?? 0) > highestPrerelease;
	}

	if (!isHigher || known.some((candidate) => candidate.raw === version)) {
		throw new Error(
			`Release version ${version} is not newer in its train. Suggested version: ${suggested}`,
		);
	}

	return {
		version,
		channel: parsed.channel,
		line,
		branch: branchForChannel(parsed.channel),
		suggested,
	};
}

export function resolveReleaseRequest(request, tags) {
	if (request.length === 1 && VERSION_PATTERN.test(request[0])) {
		return validateExplicitVersion({ version: request[0], tags });
	}
	if (request.length !== 2) {
		throw new Error(
			'Expected an exact version or a channel and line, for example: beta 1.3',
		);
	}
	const [channel, line] = request;
	const version = resolveVersion({ channel, line, tags });
	return {
		version,
		channel,
		line: normalizeLine(line).line,
		branch: branchForChannel(channel),
		suggested: version,
	};
}

export function previousVersionForRelease(version, tags) {
	const target = parseVersion(version);
	const versions = parseKnownTags(tags).filter(
		(candidate) => compareParsedVersions(candidate, target) < 0,
	);
	let candidates;

	if (target.channel === 'stable' && target.patch > 0) {
		candidates = versions.filter(
			(candidate) =>
				candidate.channel === 'stable' &&
				candidate.major === target.major &&
				candidate.minor === target.minor,
		);
	} else if (target.patch === 0) {
		candidates = versions.filter(
			(candidate) =>
				candidate.major === target.major &&
				candidate.minor === target.minor &&
				candidate.patch === 0,
		);
	} else {
		candidates = [];
	}

	if (candidates.length === 0) {
		candidates = versions.filter((candidate) => candidate.channel === 'stable');
	}
	return candidates.toSorted(compareParsedVersions).at(-1)?.raw ?? null;
}

export function parseChangeFragment(source, content) {
	const normalizedSource = source.replaceAll('\\', '/');
	const pathMatch = /(?:^|\/)changes\/(\d+\.\d+)\/[^/]+\.md$/.exec(
		normalizedSource,
	);
	if (!pathMatch) {
		throw new Error(`Invalid change fragment path: ${source}`);
	}

	const frontmatterMatch = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]+)$/.exec(
		content.trim(),
	);
	if (!frontmatterMatch) {
		throw new Error(`Change fragment ${source} requires YAML frontmatter.`);
	}

	const metadata = Object.fromEntries(
		frontmatterMatch[1]
			.split(/\r?\n/u)
			.map((line) => line.split(/:\s*/u, 2))
			.filter(([key, value]) => key && value),
	);
	if (!CHANGELOG_CATEGORIES.includes(metadata.type)) {
		throw new Error(
			`Unsupported changelog category in ${source}: ${metadata.type ?? '(missing)'}`,
		);
	}
	if (metadata.reviewed !== 'true') {
		throw new Error(`Change fragment ${source} must declare reviewed: true.`);
	}

	const text = frontmatterMatch[2].trim();
	if (!text) {
		throw new Error(`Change fragment ${source} has no release-note text.`);
	}

	return {
		line: pathMatch[1],
		type: metadata.type,
		reviewed: true,
		text,
		source: normalizedSource,
	};
}

export function selectChangeFragments(fragments, lineInput) {
	const { line } = normalizeLine(lineInput);
	return fragments
		.filter((fragment) => fragment.line === line && fragment.reviewed)
		.toSorted((left, right) => left.source.localeCompare(right.source));
}

export function renderReleaseNotes(fragments, version) {
	if (fragments.length === 0) {
		throw new Error(`No reviewed change fragments found for ${version}.`);
	}

	const sections = CHANGELOG_CATEGORIES.map((type) => {
		const entries = fragments
			.filter((fragment) => fragment.type === type)
			.map((fragment) => `- ${fragment.text}`);
		return entries.length === 0 ? null : `## ${type}\n\n${entries.join('\n')}`;
	}).filter(Boolean);

	const warning =
		parseVersion(version).channel === 'alpha'
			? '> **Warning:** This alpha is extremely unstable and demonstrative. It has no migration guarantee and may be discarded or replaced.\n\n'
			: '';
	return `${warning}${sections.join('\n\n')}\n`;
}

export function insertChangelogRelease(
	changelog,
	version,
	date,
	releaseNotes,
) {
	if (changelog.includes(`## [${version}]`)) {
		throw new Error(`CHANGELOG already contains ${version}.`);
	}
	const unreleasedHeading = '## [Unreleased]';
	const unreleasedIndex = changelog.indexOf(unreleasedHeading);
	if (unreleasedIndex < 0) {
		throw new Error('CHANGELOG is missing an [Unreleased] heading.');
	}

	const nextReleaseIndex = changelog.indexOf('\n## [', unreleasedIndex + 1);
	const insertionIndex = nextReleaseIndex < 0 ? changelog.length : nextReleaseIndex + 1;
	const body = releaseNotes
		.replace(/^# [^\r\n]+\r?\n+/u, '')
		.replace(/^## /gmu, '### ')
		.trim();
	const section = `## [${version}] - ${date}\n\n${body}\n\n`;

	return `${changelog.slice(0, insertionIndex)}${section}${changelog.slice(insertionIndex)}`;
}

export function updateChangelogLinks(
	changelog,
	{ version, previousVersion, repositoryUrl },
) {
	if (!previousVersion) {
		throw new Error(`Cannot create a comparison link for the first release ${version}.`);
	}
	const baseUrl = repositoryUrl.replace(/\/$/u, '');
	const unreleased = `[Unreleased]: ${baseUrl}/compare/${version}...HEAD`;
	const release = `[${version}]: ${baseUrl}/compare/${previousVersion}...${version}`;
	const unreleasedPattern = /^\[Unreleased\]:.*$/mu;
	let updated = unreleasedPattern.test(changelog)
		? changelog.replace(unreleasedPattern, unreleased)
		: `${changelog.trimEnd()}\n${unreleased}`;
	if (!new RegExp(`^\\[${version.replaceAll('.', '\\.')}\\]:`, 'mu').test(updated)) {
		updated = `${updated.trimEnd()}\n${release}\n`;
	}
	return updated;
}

export function applyVersionMetadata({
	packageJson,
	manifest,
	versions,
	version,
}) {
	parseVersion(version);
	if (!manifest.minAppVersion) {
		throw new Error('manifest.json is missing minAppVersion.');
	}
	return {
		packageJson: { ...packageJson, version },
		manifest: { ...manifest, version },
		versions: { ...versions, [version]: manifest.minAppVersion },
	};
}
