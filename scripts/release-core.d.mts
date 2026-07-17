export type ReleaseChannel = 'alpha' | 'beta' | 'stable';

export interface ParsedVersion {
	raw: string;
	major: number;
	minor: number;
	patch: number;
	channel: ReleaseChannel | 'rc';
	prereleaseNumber: number | null;
}

export interface ReleaseTarget {
	version: string;
	channel: ReleaseChannel;
	line: string;
	branch: 'sandbox' | 'dev' | 'main';
	suggested: string;
}

export interface ChangeFragment {
	line: string;
	type: 'Added' | 'Changed' | 'Deprecated' | 'Removed' | 'Fixed' | 'Security';
	reviewed: true;
	text: string;
	source: string;
}

export interface PackageMetadata extends Record<string, unknown> {
	version: string;
}

export interface ManifestMetadata extends Record<string, unknown> {
	version: string;
	minAppVersion: string;
}

export function parseVersion(version: string): ParsedVersion;
export function branchForChannel(
	channel: ReleaseChannel,
): 'sandbox' | 'dev' | 'main';
export function resolveVersion(input: {
	channel: ReleaseChannel;
	line: string;
	tags: string[];
}): string;
export function validateExplicitVersion(input: {
	version: string;
	tags: string[];
}): ReleaseTarget;
export function resolveReleaseRequest(
	request: string[],
	tags: string[],
): ReleaseTarget;
export function previousVersionForRelease(
	version: string,
	tags: string[],
): string | null;
export function parseChangeFragment(
	source: string,
	content: string,
): ChangeFragment;
export function selectChangeFragments(
	fragments: ChangeFragment[],
	line: string,
): ChangeFragment[];
export function renderReleaseNotes(
	fragments: ChangeFragment[],
	version: string,
): string;
export function insertChangelogRelease(
	changelog: string,
	version: string,
	date: string,
	releaseNotes: string,
): string;
export function updateChangelogLinks(
	changelog: string,
	input: {
		version: string;
		previousVersion: string | null;
		repositoryUrl: string;
	},
): string;
export function applyVersionMetadata(input: {
	packageJson: PackageMetadata;
	manifest: ManifestMetadata;
	versions: Record<string, string>;
	version: string;
}): {
	packageJson: PackageMetadata;
	manifest: ManifestMetadata;
	versions: Record<string, string>;
};
