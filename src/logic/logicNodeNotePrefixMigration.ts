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
	const affixes: Array<[string, string, string, string]> = [
		[oldP.tagPrefix, oldP.tagSuffix, newP.tagPrefix, newP.tagSuffix],
		[oldP.snippetPrefix, oldP.snippetSuffix, newP.snippetPrefix, newP.snippetSuffix],
		[oldP.pluginPrefix, oldP.pluginSuffix, newP.pluginPrefix, newP.pluginSuffix],
		[oldP.groupPrefix, oldP.groupSuffix, newP.groupPrefix, newP.groupSuffix],
		[oldP.folderPrefix, oldP.folderSuffix, newP.folderPrefix, newP.folderSuffix],
		[oldP.filePrefix, oldP.fileSuffix, newP.filePrefix, newP.fileSuffix],
	];
	for (const [oldHead, oldTail, newHead, newTail] of affixes) {
		if (
			(oldHead !== "" || oldTail !== "") &&
			alias.startsWith(oldHead) &&
			alias.endsWith(oldTail) &&
			alias.length > oldHead.length + oldTail.length
		) {
			const inner = alias.slice(oldHead.length, alias.length - oldTail.length || undefined);
			const next = newHead + inner + newTail;
			if (next !== alias) return next;
		}
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
