---
title: Research — deuda de renombre/vocabulario diferido (patrón "rename-debt")
type: research
status: active
parent: "[[docs/work/hardening/index|hardening]]"
created: 2026-07-10T00:00:00
updated: 2026-07-10T00:00:00
created_by: claude-sonnet-rename-research
updated_by: claude-sonnet-rename-research
tags:
  - agent/research
  - initiative/hardening
  - rename-debt
---

# Research — Deuda de renombre/vocabulario diferido

> Pedido dev (gravedad ALTA, `pendientes.md` §4): el patrón "rename/alineación de
> vocabulario diferida" ralentiza y degrada el proyecto. Este research junta evidencia
> interna (git + session-log + código) y externa (prácticas establecidas) y cierra con una
> policy DRAFT — el dev la revisa antes de que sea norma. Ningún código ni doc existente fue
> tocado; solo archivos nuevos bajo esta carpeta.

## Método

- **Interno:** `git log -S`/`--grep`/`-- <path>` sobre commits reales (fechas exactas, no
  estimadas) + grep dirigido de `session-log.md` (1072 líneas) + lectura de `pendientes.md`,
  el dossier semilla, y `plans/2026-07-06-pd-panel-scene-decomposition/02-nib-slices.md` (el
  grill NIB cerró HOY, 2026-07-10 — literalmente mientras se escribía este research) +
  verificación directa de archivos fuente (`Read`/`Glob` acotados a `src/providers`,
  `src/components/containers`, `src/types` — nested worktrees evitados con paths
  específicos).
- **Online:** 5 WebSearch + 2 WebFetch completos (Fowler codemods, Thoughtworks semantic
  drift); 3 fuentes más citadas desde snippet de búsqueda (NDepend, Fowler bliki, Webflow —
  2 WebFetch fallaron 403/parse-error de origen, la fuente sigue siendo válida y citable).

## Hallazgo destacado (no estaba en ningún doc previo)

`src/components/containers/explorer{Files,Props,Tags,Content,Snippets,Plugins}.ts` son
**6 shims de 2 líneas** que re-exportan literal desde `../../providers/explorerX`
(verificado leyendo los 6 — mismo patrón exacto, ej. `export { explorerProps } from
'../../providers/explorerProps'`). El plan de HOY (`02-nib-slices.md` Slice 0) renombra
`providers/explorer*`→`providers/provider*` pero **no menciona estos 6 shims**, ni en Slice
0 ni en el shim-collapse del 2026-07-06 (ese collapse solo cubrió `logicsFiles`/
`utilViewLayers`/`utilBadgeBubbling`). Si Slice 0 se ejecuta tal cual, los 6 shims quedan
con import paths rotos. Ver tabla fila 5 y shard 01 §5.

## (a) Instancias internas — ventana de drift

| # | Rename | Nació | Detectado/decidido | Ejecutado | Ventana | Costo |
|---|--------|-------|---------------------|-----------|---------|-------|
| 1 | `logicsFiles`→`logicFiles` | 2026-06-13 (`69f33d9`) | mismo día (flag Lane A: "renombre fuera de mi dominio") | 2026-07-06 (`1409e31`) | **23 días** | shim bloqueó cleanup; coordinador asumió el rename que el lane original no pudo |
| 2 | `ExplorerViewMode` enum flat → `(engine,mode)` resuelto | ~2026-05-08/18 | 2026-06-13 (Lane C señala arquitectura incorrecta) | PARCIAL: bridge 2026-07-05 (`eb6d9f7`); retiro total (task B3, 24 callers) sigue abierto | **≥27 días y sigue abierto** | 24 call-sites a migrar; deuda crece mientras el enum sigue siendo interfaz externa |
| 3 | `typeActionRouting`→`typeInputRouting` (vs runtime `InputRouter`) | tipo nace 2026-05-20; `InputRouter` nace 2026-07-06 | mismatch detectado ~2026-07-06/09, decidido 2026-07-10 (NIB D-NIB-6) | NO ejecutado (Slice 0) | **51 días** sin alinear el tipo a ningún vocabulario de routing; **4 días** desde que apareció el nombre gemelo hasta la decisión | dos vocabularios de "routing" coexistiendo |
| 4 | NIB Slice 0 batch: `providers/explorer*`→`provider*` (7 archivos) · `ExplorerProvider`→`ProviderContract` · `getTree()`→`getNodes()` (≥8 archivos) | 2026-05-08 (`59336c9`, "moved explorers as providers") | dossier lo nombra "mayor deuda técnica"; decidido NIB 2026-07-10 | NO ejecutado | **63 días** y contando | god-object percibido; blast radius grande — el tipo de rename que este research existe para que no se vuelva a diferir |
| 5 | `components/containers/explorer*` (6 shims) — **sin dueño, hallazgo de este research** | preexistentes (ya vivían en 2026-06-15) | flagged 2026-06-15 (mismo follow-up de cierre-Q4 que sí cerró `logicsFiles`/`utilViewLayers`/`utilBadgeBubbling` el 2026-07-06) | NO colapsado — quedó fuera del shim-collapse del 2026-07-06 (2 de 3 ítems hermanos sí se cerraron) y **ausente también del plan de hoy** | **≥25 días desde que se decidió colapsarlo** | si Slice 0 corre sin tocarlos, rompe 6 import paths en silencio |
| 6 | `panelData`→`panelWidget` | concepto nace 2026-05-27 (doc de grill arquitectura) | vivía como placeholder en `typePanelScene.ts` (2026-07-06); renombrado 2026-07-10 (NIB D-NIB-3) | Decidido, NO ejecutado en código (unión + usos) | **44 días como concepto, 0 días como código roto** | bajo — atrapado antes de anidarse en implementación real |
| 7 | `proto-v6` (stale) vs `proto-v12` (canon) | proto-v6 referenciado como canon en umbrella 2026-05-19 | corregido 2026-06-05 (shard 04 rewrite) + 2026-06-10 (roadmap-dispatch fix) tras confirmar junction de Downloads; incidente relacionado 2026-07-02 | mayormente resuelto — pero **recurrente**: Lane B4 (2026-07-09) encontró 4 anotaciones de canon MÁS desalineadas | patrón recurrente, no evento cerrado | research/specs escritos contra baseline incorrecta = retrabajo de shards de cientos de líneas |

Detalle narrativo + citas (hash/línea) por instancia:
[[docs/work/hardening/research/2026-07-10-rename-debt-research/01-internal-instances-and-debt-catalog|shard 01]].

## (b) Catálogo de deuda vigente (priorizada)

- **P0 — riesgo activo:** fila 5 (shims `components/containers/explorer*`) —
  recomendado incluirlos en el mismo commit que Slice 0, no después.
- **P1 — decidido, listo para ejecutar (Slice 0, mecánico, 1 commit):** fila 3 + fila 4
  completas, más `serviceWorkspaceInputRouter`→`serviceWorkspaceActionRouter`.
- **P2 — decidido, requiere juicio (Slice 0.5):** extraer provider puro de
  `explorerActiveFilters.svelte` y `explorerQueue.svelte` (mezclan provider+render).
- **P3 — en curso, bloqueado en cola externa:** fila 2 (`ExplorerViewMode` task B3, Codex
  "sin tokens hasta 2026-07-10" — hoy).
- **P4 — staleness de docs, mismo patrón, menor urgencia:** `tooling-libraries.md` L42
  ("Table engine spec" contradice canon Table=Geometry) · 3 copias-conflicto
  `explorer-model (conflict 2026-05-26...)` · gap de glosario Symbiont/ComposedViews ·
  `viewComposer` vs `viewScene` sin reconciliar.

Catálogo completo con estado por ítem: shard 01 §"Catálogo vigente".

## (c) Prácticas online (4-6, con fuente)

1. **Ubiquitous Language vive EN el código, no al lado** — nombres de clase/método/variable
   deben reflejar el vocabulario compartido; cuando el vocabulario cambia, el código cambia
   en la misma unidad de trabajo. [Fowler — Ubiquitous Language](https://martinfowler.com/bliki/UbiquitousLanguage.html)
2. **Automatizar el chequeo de conformidad contra el glosario** — NDepend valida que
   clases/enums/interfaces/métodos/propiedades usen solo términos de una lista de
   vocabulario aprobada; generaliza a un grep barato de identificadores nuevos contra
   `glossary.md` en pre-merge. [NDepend — Checking DDD Ubiquitous Language](https://blog.ndepend.com/checking-ddd-ubiquitous-language-with-ndepend/)
3. **Codemods: transforms pequeños, testeados, secuenciados** — descomponer el rename en
   pasos independientes con casos positivos/negativos escritos ANTES de correr el
   transform; buscar usos reales (imports con alias incluidos) antes de automatizar;
   insertar TODO en vez de forzar una transformación insegura. [Fowler — Refactoring with Codemods](https://martinfowler.com/articles/codemods-api-refactoring.html)
4. **Estandarizar estilo ANTES del rename mecánico** — reduce variaciones que rompen el
   codemod; revisar el diff generado, no solo confiar en la herramienta. [Webflow — Codemods and large-scale refactors](https://webflow.com/blog/codemods-and-large-scale-refactors-at-webflow)
5. **El semantic drift tiene 3 etapas** (overload de un nombre existente → dilución de
   contexto entre equipos/docs → pérdida de conocimiento) — tratar el vocabulario del
   dominio como observable/vivo, no como documentación estática que nadie relee. [Thoughtworks — Semantic drift and semantic integrity](https://www.thoughtworks.com/insights/blog/data-strategy/semantic-drift-stewarding-meaning-ai)
6. **Shim = UN chokepoint explícito con dueño, no un patrón disperso** — aislar el nombre
   viejo en un solo módulo wrapper con owner/expiry asignado; el patrón `legacy_x as x` de
   Redux Toolkit es el ejemplo mínimo. [freeCodeCamp — Shimming Your Abstractions](https://www.freecodecamp.org/news/manage-code-dependencies-by-shimming-your-abstractions/) · [Redux Toolkit — Migrating to RTK 2.0](https://redux-toolkit.js.org/usage/migrating-rtk-2)

Notas de extracción completas: [[docs/work/hardening/research/2026-07-10-rename-debt-research/02-online-practices|shard 02]].

## (d) Policy DRAFT anti-drift (borrador — el dev decide, NO es norma aplicada)

Extiende, no reemplaza, los locks ya dev-aprobados de HOY en `02-nib-slices.md`:
**D-NIB-6** ("vocabulario se alinea JUNTO y PRIMERO, por zona activa con catálogo — no
big-bang repo-wide") y **D-NIB-8** ("disciplina de refactor post-wave = RECOMENDACIÓN, no
norma"). Esta policy no contradice esos locks; los hace operativos.

1. **Mismo-commit-familia:** un rename decidido para la zona activa aterriza en el mismo
   commit o cadena de commits inmediata del trabajo que lo motivó — nunca "después".
2. **Catálogo público obligatorio para lo diferido:** todo rename decidido pero NO
   ejecutado de inmediato gana una línea en `pendientes.md` (o sucesor): nombre viejo→
   nuevo, fecha decidida, dueño de ejecución, razón de bloqueo. Ninguna decisión muere solo
   en el chat (ya se practica bien en NIB — mantenerlo).
3. **Blast-radius antes de llamar "mecánico" a un rename:** grep del nombre viejo en TODO
   el worktree activo, no solo en la carpeta que se está tocando — el hallazgo de este
   research (fila 5, 6 shims fuera del radar de Slice 0) es evidencia directa de por qué.
4. **Shim con dueño + trigger de expiración**, no solo con fecha de nacimiento: cualquier
   alias/shim registra en el catálogo quién lo colapsa y CUÁNDO (próximo touch del módulo,
   o fecha de revisión) — no un "luego" abierto.
5. **Gate de nombre nuevo:** antes de mergear un símbolo nuevo, grep contra `glossary.md`/
   `dev-glossary.md` + grep de mismo-basename en otras carpetas de capa (el caso
   `explorerFiles.ts` viviendo a la vez en `providers/` y `components/containers/` prueba
   que colisiones de basename entre capas pasan desapercibidas hoy).
6. **Decisión con checklist de ejecución en el mismo doc:** cuando un rename se decide en
   grill/spec, el mismo doc lleva el checklist de ejecución (patrón que `02-nib-slices.md`
   YA hace bien — Slice 0/0.5/1 — mantenerlo como plantilla).
7. **Barrido de staleness acoplado a trabajo que ya toca la zona**, no como evento
   dedicado — el precedente Lane B4 (2026-07-09, canon-stale corregido dentro de un barrido
   de pendientes más amplio) funcionó; no requiere ceremonia nueva.
8. **Segundo nombre = señal de alarma:** cuando un agente introduce un seam nuevo (p.ej.
   `InputRouter`) junto a un contrato existente de dominio similar (`typeActionRouting`),
   lo señala en el MISMO session-log entry de introducción — no hace falta arreglarlo ahí,
   pero acorta el tiempo-a-detección (en fila 3 el choque se detectó recién cuando otro
   agente tropezó con él, 51 días después del nombre original).

## Links

[[docs/work/hardening/research/2026-07-10-structural-refactor-dossier|dossier semilla]] ·
[[docs/current/pendientes|pendientes]] §4 (ítem que originó este research) ·
[[docs/work/hardening/plans/2026-07-06-pd-panel-scene-decomposition/02-nib-slices|NIB slices]]
(D-NIB-6/8 + Slice 0/0.5) · [[docs/architecture/glossary|glossary]] (panelWidget/Overlay
2026-07-10) · shards:
[[docs/work/hardening/research/2026-07-10-rename-debt-research/01-internal-instances-and-debt-catalog|01 instancias+catálogo]] ·
[[docs/work/hardening/research/2026-07-10-rename-debt-research/02-online-practices|02 prácticas online]].
