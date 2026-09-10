import type { NodeNotePrefixes } from '../services/serviceNodeBinding';

export interface AliasMigrationInput {
	path: string;
	aliases: string[];
}

export interface AliasMigrationPlan {
	filePath: string;
	oldAlias: string;
	newAlias: string;
}

function mapAlias(alias: string, oldP: NodeNotePrefixes, newP: NodeNotePrefixes): string | null {
	if (
		oldP.propPrefix !== '' &&
		oldP.propSuffix !== '' &&
		alias.startsWith(oldP.propPrefix) &&
		alias.endsWith(oldP.propSuffix) &&
		alias.length > oldP.propPrefix.length + oldP.propSuffix.length
	) {
		const inner = alias.slice(oldP.propPrefix.length, alias.length - oldP.propSuffix.length);
		const next = newP.propPrefix + inner + newP.propSuffix;
		return next === alias ? null : next;
	}
	const heads: Array<[string, string]> = [
		[oldP.tagPrefix, newP.tagPrefix],
		[oldP.snippetPrefix, newP.snippetPrefix],
		[oldP.pluginPrefix, newP.pluginPrefix],
	];
	for (const [oldHead, newHead] of heads) {
		if (oldHead !== '' && alias.startsWith(oldHead) && alias.length > oldHead.length) {
			const next = newHead + alias.slice(oldHead.length);
			if (next !== alias) return next;
		}
	}
	return null;
}

/**
 * Planifica staged operations de rename de aliases al cambiar prefijos:
 * solo aliases con afijos viejos se reescriben a los nuevos; los pelados
 * valen en ambas configuraciones y se dejan quietos.
 */
export function planAliasPrefixMigration(
	files: AliasMigrationInput[],
	oldP: NodeNotePrefixes,
	newP: NodeNotePrefixes,
): AliasMigrationPlan[] {
	const plans: AliasMigrationPlan[] = [];
	for (const file of files) {
		const seen = new Set<string>();
		for (const alias of file.aliases) {
			if (seen.has(alias)) continue;
			seen.add(alias);
			const next = mapAlias(alias, oldP, newP);
			if (next !== null) {
				plans.push({ filePath: file.path, oldAlias: alias, newAlias: next });
			}
		}
	}
	return plans;
}
