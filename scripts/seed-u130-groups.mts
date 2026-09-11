#!/usr/bin/env node
/**
 * U130-SEED: siembra grupos custom con miembros reales en un vault de prueba.
 *
 * Escribe (upsert idempotente) un SavedLayout con `groupMemberships` en el
 * `data.json` del plugin dentro del vault que se le pasa por `--vault`:
 *
 *   node scripts/seed-u130-groups.mts --vault plugin-dev [--layout <nombre>]
 *
 * Contrato (src/types/typeSettings.ts:45-58):
 * - SOLO grupos custom. Los presets se computan por predicado en memoria y no
 *   tocan settings: no se siembra ningun preset.
 * - Las URNs se construyen con `formatMembershipUrn` de
 *   src/logic/logicMembershipUrn.ts (importado, no copiado): no se inventa el
 *   formato a ojo ni se escribe a mano.
 * - Anidacion: los dos grupos son custom, luego `canNest` (logicNodeGroup) los
 *   deja anidarse entre si; el hijo es subconjunto del padre. SavedLayout hoy
 *   solo persiste `groupMemberships` (resolveCustomGroups deriva parentId null),
 *   asi que la anidacion vive como subconjunto + veredicto canNest, no como
 *   parentId persistido.
 *
 * Reproducible: correrlo dos veces deja el mismo estado (upsert por nombre de
 * layout, sin duplicar). No toca la logica de proyeccion ni enciende nada.
 */

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
	formatMembershipUrn,
	parseMembershipUrn,
} from '../src/logic/logicMembershipUrn.ts';
import { canNest } from '../src/logic/logicNodeGroup.ts';

const LAYOUT_DEFAULT = 'u130-seed-groups';
const GROUP_PADRE = 'u130-seed-padre';
const GROUP_HIJO = 'u130-seed-hijo';

/** Miembro semilla: kind + ruta relativa al vault + etiqueta visible. */
interface SeedMember {
	kind: 'file' | 'folder';
	canonicalId: string;
	displayLabel: string;
}

/**
 * Descubre miembros reales en el vault destino, en orden estable para que
 * dos corridas siembren lo mismo (idempotencia):
 * - ficheros: todos los `*.md` bajo el vault (recursivo, sin dotfiles),
 *   ordenados lexicograficamente por ruta relativa con separador `/`.
 * - carpetas: todos los directorios (recursivos, sin dotfiles), ordenados
 *   igual.
 * - padre: [fichero[0], fichero[1], carpeta[0] (o fichero[2] si no hay)].
 * - hijo: [fichero[0] (SOLAPE con el padre), fichero[2] (o carpeta[0])].
 * El hijo queda como subconjunto conceptual del padre via el solape.
 */
function discoverMembers(vaultRoot: string): { padre: SeedMember[]; hijo: SeedMember[] } {
	const files: string[] = [];
	const dirs: string[] = [];
	const walk = (abs: string, rel: string): void => {
		const entries = readdirSync(abs, { withFileTypes: true }).sort((a, b) =>
			a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
		);
		for (const e of entries) {
			if (e.name.startsWith('.')) continue;
			const childAbs = path.join(abs, e.name);
			const childRel = rel ? `${rel}/${e.name}` : e.name;
			if (e.isDirectory()) {
				dirs.push(childRel);
				walk(childAbs, childRel);
			} else if (e.isFile() && e.name.endsWith('.md')) {
				files.push(childRel);
			}
		}
	};
	walk(vaultRoot, '');
	files.sort();
	dirs.sort();
	if (files.length < 2)
		throw new Error(
			`Vault sin suficientes ficheros .md para sembrar (encontrados: ${files.length})`,
		);
	const base = (rel: string): string => rel.split('/').pop() ?? rel;
	const fileMember = (id: string): SeedMember => ({
		kind: 'file',
		canonicalId: id,
		displayLabel: base(id),
	});
	const folderMember = (id: string): SeedMember => ({
		kind: 'folder',
		canonicalId: id,
		displayLabel: base(id),
	});
	const overlap = fileMember(files[0]);
	const second = fileMember(files[1]);
	const third = files[2] !== undefined ? fileMember(files[2]) : null;
	const firstDir = dirs[0] !== undefined ? folderMember(dirs[0]) : null;
	// Padre: dos ficheros + una carpeta (o tercer fichero si no hay carpetas).
	const padre: SeedMember[] = [overlap, second, firstDir ?? third!];
	// Hijo: solapa con el padre en files[0] + un miembro propio distinto.
	const propio: SeedMember | null = third ?? firstDir;
	if (!propio)
		throw new Error('Vault sin suficientes miembros distintos para el hijo');
	const hijo: SeedMember[] = [overlap, propio];
	return { padre, hijo };
}

function parseArgs(argv: string[]): {
	vault: string;
	layout: string;
	pluginDir: string;
} {
	let vault = 'plugin-dev';
	let layout = LAYOUT_DEFAULT;
	let pluginDir = '';
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === '--vault' && i + 1 < argv.length) vault = argv[++i].trim();
		else if (arg.startsWith('--vault=')) vault = arg.slice('--vault='.length).trim();
		else if (arg === '--layout' && i + 1 < argv.length) layout = argv[++i].trim();
		else if (arg.startsWith('--layout=')) layout = arg.slice('--layout='.length).trim();
		else if (arg === '--plugin-dir' && i + 1 < argv.length)
			pluginDir = argv[++i].trim();
		else if (arg.startsWith('--plugin-dir='))
			pluginDir = arg.slice('--plugin-dir='.length).trim();
		else if (arg === '-h' || arg === '--help') {
			console.log(
				'node scripts/seed-u130-groups.mts --vault <vault> [--layout <nombre>] [--plugin-dir <dir>]',
			);
			process.exit(0);
		} else throw new Error(`Argumento desconocido: ${arg}`);
	}
	if (!vault) throw new Error('--vault no puede estar vacio');
	if (!layout) throw new Error('--layout no puede estar vacio');
	const resolved =
		pluginDir ||
		process.env.VAULTMAN_TARGET ||
		path.join(os.homedir(), 'storage/shared/Documents', vault, '.obsidian/plugins/vaultman');
	return {
		vault,
		layout,
		pluginDir: resolved.startsWith('~/')
			? path.join(os.homedir(), resolved.slice(2))
			: resolved,
	};
}

function main(): void {
	const { vault, layout, pluginDir } = parseArgs(process.argv.slice(2));
	const dataPath = path.join(pluginDir, 'data.json');
	if (!existsSync(dataPath))
		throw new Error(`No existe ${dataPath}: vault o plugin desconocidos (vault=${vault})`);
	const vaultRoot = path.resolve(pluginDir, '..', '..', '..');

	// Descubrimiento portable: los miembros se eligen de ESE vault, en orden
	// estable (idempotente). Nada hardcodeado a otro vault.
	const { padre: MIEMBROS_PADRE, hijo: MIEMBROS_HIJO } = discoverMembers(vaultRoot);

	// 1. Los miembros tienen que existir DE VERDAD en ESE vault. Si no, se falla
	// en vez de sembrar fantasmas (que caerian a Ghost Slot).
	for (const m of [...MIEMBROS_PADRE, ...MIEMBROS_HIJO]) {
		const abs = path.join(vaultRoot, m.canonicalId);
		if (!existsSync(abs))
			throw new Error(`Miembro inexistente en ${vault}: ${m.canonicalId}`);
		const st = statSync(abs);
		if (m.kind === 'folder' && !st.isDirectory())
			throw new Error(`Se esperaba carpeta: ${m.canonicalId}`);
		if (m.kind === 'file' && !st.isFile())
			throw new Error(`Se esperaba fichero: ${m.canonicalId}`);
	}

	// 2. URNs con LA funcion del modulo, no a mano.
	const urnsPadre = MIEMBROS_PADRE.map((m) =>
		formatMembershipUrn({ providerId: 'files', kind: m.kind, canonicalId: m.canonicalId, displayLabel: m.displayLabel }),
	);
	const urnsHijo = MIEMBROS_HIJO.map((m) =>
		formatMembershipUrn({ providerId: 'files', kind: m.kind, canonicalId: m.canonicalId, displayLabel: m.displayLabel }),
	);
	for (const urn of [...urnsPadre, ...urnsHijo]) {
		if (!parseMembershipUrn(urn)) throw new Error(`URN invalida recien construida: ${urn}`);
	}

	// 3. Anidacion permitida: custom bajo custom (un preset seria terminal).
	const verdict = canNest(
		[
			{ id: GROUP_PADRE, flavor: 'custom', label: GROUP_PADRE, parentId: null, scope: 'all' },
			{ id: GROUP_HIJO, flavor: 'custom', label: GROUP_HIJO, parentId: GROUP_PADRE, scope: 'all' },
		],
		GROUP_HIJO,
		GROUP_PADRE,
	);
	if (!verdict.ok)
		throw new Error(`La anidacion semilla no pasa canNest: ${JSON.stringify(verdict)}`);

	// 4. Upsert idempotente del layout: reemplaza por nombre, no duplica.
	const raw = readFileSync(dataPath, 'utf8');
	const data = JSON.parse(raw) as { savedLayouts?: unknown };
	if (!Array.isArray(data.savedLayouts)) data.savedLayouts = [];
	const layouts = data.savedLayouts as Record<string, unknown>[];
	const memberships: Record<string, readonly string[]> = {
		[GROUP_PADRE]: urnsPadre,
		[GROUP_HIJO]: urnsHijo,
	};
	const existing = layouts.findIndex((l) => l?.name === layout);
	const seed = {
		name: layout,
		summary: 'U130-SEED: dos grupos custom anidados con miembros reales',
		config: existing >= 0 ? (layouts[existing].config ?? {}) : {},
		groupMemberships: memberships,
	};
	if (existing >= 0) layouts[existing] = { ...layouts[existing], ...seed };
	else layouts.push(seed);
	writeFileSync(dataPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');

	console.log(`vault: ${vault}`);
	console.log(`data.json: ${dataPath}`);
	console.log(`layout: ${layout} (${existing >= 0 ? 'reemplazado' : 'nuevo'})`);
	console.log(`${GROUP_PADRE}: ${urnsPadre.length} miembros`);
	for (const u of urnsPadre) console.log(`  - ${u}`);
	console.log(`${GROUP_HIJO}: ${urnsHijo.length} miembros (anida bajo ${GROUP_PADRE})`);
	for (const u of urnsHijo) console.log(`  - ${u}`);
	console.log(`canNest(hijo -> padre): ${JSON.stringify(verdict)}`);
}

main();
