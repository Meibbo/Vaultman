---
title: Revisión adversarial de la estrategia anti-compactación pre-v1.2.0
type: agent-session
status: active
lifecycle: active
parent: "[[docs/work/pkm-ai/index|pkm-ai]]"
created: 2026-07-28T19:20:00
updated: 2026-07-28T19:20:00
created_by: codex-gpt5-20260728
updated_by: codex-gpt5-20260728
tags:
  - agent/session
  - initiative/pkm-ai
  - pkm-ai/context
  - pkm-ai/adversarial
---

# Revisión adversarial de la estrategia anti-compactación

## Alcance

Evaluar la estrategia observada en la tarea Codex del 2026-07-22 antes de diseñar una skill para agentes con ventanas de contexto cortas. Este registro no es la skill ni una spec aprobada.

Fuentes principales:

- [[docs/sessions/2026-07-22-codex-gpt5-root|shard original]].
- Rollout local de la tarea, con cinco eventos `context_compacted`.
- Checkpoint documental `7bb8823b`.
- [[docs/work/pkm-ai/adr/0002-memory-lifecycle-states|ADR 0002]].
- [[docs/work/pkm-ai/adr/0003-coordination-shared-brain|ADR 0003]].
- [[docs/work/pkm-ai/adr/0004-runtime-startup-mandatory-protocol|ADR 0004]].
- [[docs/work/pkm-ai/research/2026-07-10-adversarial-harness-research/index|harness adversarial]].

## Veredicto adversarial

La estrategia fue eficaz como recuperación artesanal de una sesión concreta, pero todavía no constituye un protocolo seguro y económico para agentes de contexto corto. Su éxito dependió de cuatro condiciones accidentales:

1. el dev detectó y corrigió la primera falta de persistencia;
2. el agente tuvo tiempo de producir documentación extensa antes del siguiente corte;
3. el mismo worktree y el commit local siguieron disponibles;
4. Claude heredó un estado físico relativamente limpio.

Una skill que copie el comportamiento literalmente podría producir más documentación, más compactaciones y una falsa sensación de continuidad.

## Riesgos críticos

### R1 — Una skill no observa el porcentaje real de contexto

El modelo puede recibir una estimación del usuario o del runtime, pero no tiene una API portable que garantice el porcentaje restante. Una skill manual puede disciplinar un checkpoint; no puede prometer interceptar la compactación.

**Consecuencia:** el checkpoint puede empezar demasiado tarde y ser interrumpido por la compactación que intentaba prevenir.

### R2 — Ventana de fallo entre mutación y checkpoint

El patrón observado documentaba después del commit o del gate. Si la compactación, cancelación, crash o rate limit ocurre entre el cambio y el registro, producto y memoria divergen. BT5-054 terminó exactamente en este borde.

**Necesidad futura:** protocolo write-ahead para intención + protocolo post-write para resultado; no basta un único checkpoint al final.

### R3 — Recuperación no equivale a corrección

Una memoria durable puede preservar una hipótesis equivocada con más autoridad que el chat efímero. Los primeros veredictos sobre self-disable y scrollbar fueron corregidos por el dev después de haberse investigado.

**Necesidad futura:** cada hecho debe distinguir `observed`, `inferred`, `user-corrected`, `verified` y `superseded`, con evidencia y fecha.

### R4 — Múltiples fuentes de verdad pueden divergir

Shard, session-log, issue, plan, agent-room task, Git commit y worktree contienen proyecciones distintas. El método original no definió una precedencia formal entre ellas.

**Necesidad futura:** un recovery capsule canónico y pequeño debe apuntar al detalle; no duplicar el estado activo en todas las superficies.

### R5 — El append-only log se vuelve ilegible para el agente corto

El shard original creció a 711 líneas. Conservó fidelidad, pero obliga a un agente nuevo a gastar gran parte de su ventana antes de actuar.

**Necesidad futura:** separar:

- cápsula activa acotada;
- ledger append-only de eventos;
- fuentes exhaustivas shardeadas;
- material superseded fuera de la ruta caliente.

### R6 — La recuperación depende del filesystem local

Los agent docs no se empujan a origin. Un clone distinto, cleanup de worktrees, GC de commits locales, mirror defectuoso o cambio de máquina puede perder el checkpoint aunque Git de producto sobreviva.

**Necesidad futura:** declarar el dominio de durabilidad real y comprobar que cada artefacto referenciado existe antes de prometer handoff.

### R7 — Stale retrieval produce una reanudación falsa

Durante esta revisión, `query-docs.ts` devolvió cero resultados y avisó que 983 docs eran posteriores al índice. Una skill que dependa de retrieval-first puede no recuperar el checkpoint más nuevo.

**Necesidad futura:** fallback determinista por path/manifest y freshness check;
retrieval semántico no puede ser la única ruta de recuperación.

### R8 — Rate limit y terminación no son compactación

La quinta compactación ocurrió con el límite semanal al 100%, y la tarea acabó BT5-054 sin cierre completo. El protocolo debe cubrir:

- compactación automática;
- cancelación del usuario;
- tool timeout;
- crash;
- rate limit;
- cierre del proceso;
- cambio de agente o máquina.

Una skill llamada “anti-compactación” demasiado estrecha omitiría la mitad del problema: continuidad ante terminaciones no limpias.

### R9 — Git no captura todo el estado operativo

Un commit no conserva procesos vivos, tool calls en vuelo, output no leído, stashes, archivos ignorados, configuración externa, estado de Obsidian ni resultados HITL.

**Necesidad futura:** inventario de estado no-Git y clasificación `recoverable/re-run/needs-user/irrecoverable`.

### R10 — Known-red puede normalizar regresiones reales

El método preservó correctamente un baseline rojo ajeno, pero repetir “único fallo conocido” puede convertir un error cambiante en excepción permanente.

**Necesidad futura:** fingerprint del diagnóstico, command, commit y conteo; si cambia cualquiera, deja de ser el mismo baseline.

## Riesgos altos

### R11 — Prompt literal como vector de secretos e instrucciones hostiles

Copiar todo literalmente puede persistir tokens, correos, rutas privadas, contenido sensible o prompt injection. Un agente posterior puede tratar texto del usuario o de una fuente externa como instrucciones vigentes.

**Necesidad futura:** redacción explícita, provenance y separación visual/mecánica entre datos citados e instrucciones activas.

### R12 — Checkpoint storm

Un agente corto puede compactar más veces; si cada compactación genera miles de líneas y suites completas, el propio mecanismo aumenta consumo, latencia y probabilidad de otra compactación.

**Necesidad futura:** niveles:

- micro-snapshot barato;
- checkpoint de slice;
- handoff completo;
- archive/close.

No ejecutar el nivel máximo en cada señal.

### R13 — Commit por slice puede ser una frontera artificial

Refactors de seams compartidos no siempre admiten un commit verde pequeño.
Forzar commits puede dejar APIs intermedias falsas; no hacerlos puede perder recuperabilidad.

**Necesidad futura:** soporte para checkpoints no-commit con patch, diff, tests rojos esperados y rollback explícito.

### R14 — Paralelismo invalida la cápsula

Otro agente puede cambiar el HEAD, issue, plan o archivo compartido después del checkpoint. El agent-room es turn-granular y las leases expiran.

**Necesidad futura:** cápsula con `generated_at`, HEAD, worktree, task claim, scope, mailbox cursor y freshness predicate. Si no coincide al reanudar, se reconcilia; no se ejecuta directamente.

### R15 — Checkpoint falso o incompleto

Un agente puede declarar “persistido” sin comprobar que el archivo existe, parsea, está enlazado o contiene los campos necesarios.

**Necesidad futura:** verificador mecánico y cold-resume test, no autoafirmación.

### R16 — Portabilidad entre agentes y superficies

Claude hooks, Codex compaction events, Gemini context y agentes terminales no ofrecen las mismas señales. Una skill portable no debe asumir hooks de Claude ni el rollout interno de Codex.

**Necesidad futura:** núcleo agnóstico + adaptadores opcionales de runtime.

## Frentes no previstos

1. **Cold-resume evaluation:** un agente sin transcript debe poder responder, dentro de un presupuesto de tokens, qué hacer, qué no tocar, qué está rojo y cómo verificarlo.
2. **Memory integrity:** hash o fingerprint de cápsula, fuentes y HEAD para detectar stale/tampering.
3. **Instruction safety:** documentos recuperados son datos no confiables hasta validar provenance y prioridad.
4. **Token budget:** cada cápsula necesita un máximo explícito; conservar detalle no significa cargarlo todo.
5. **Supersession semantics:** las correcciones del dev deben invalidar conclusiones previas sin borrar su historia.
6. **External-state ledger:** smokes, UI, runtime, servicios y herramientas en vuelo.
7. **Recovery ownership:** quién puede continuar, quién debe preguntar y cuándo un estado exige al dev.
8. **Failure injection tests:** compactar/cancelar deliberadamente antes del patch, durante el patch, después del test y antes del commit.
9. **Idempotencia:** invocar dos veces el checkpoint no debe duplicar eventos, issues ni commits.
10. **Garbage collection:** snapshots viejos no pueden competir para siempre con el activo.

## Calidad que se perdería al copiar la estrategia sin cambios

- Menor velocidad por documentación excesiva.
- Menor claridad por duplicación entre seis superficies.
- Menor seguridad por captura literal sin redacción.
- Menor portabilidad por depender de Git local y hooks específicos.
- Menor capacidad de agentes cortos si el recovery packet crece sin límite.
- Mayor confianza injustificada si “checkpoint existente” se confunde con “checkpoint válido y fresco”.

## Gates que la futura propuesta deberá satisfacer

1. Sobrevive a terminación limpia y no limpia.
2. Puede recuperarse sin transcript.
3. Distingue hechos, hipótesis, decisiones y superseded.
4. Tiene un paquete activo acotado por tokens.
5. Verifica HEAD, worktree, dirty state y estado externo.
6. No persiste secretos ni trata citas como instrucciones.
7. Funciona manualmente sin hooks; hooks sólo mejoran el trigger.
8. No requiere commit verde cuando la unidad todavía está roja.
9. Convive con agent-room y scope claims.
10. Incluye una prueba de recuperación en frío.

## Decisión de alcance pendiente

Definir si el entregable será:

- sólo una skill manual portable;
- skill manual más hooks/adaptadores opcionales;
- un protocolo PKM-AI obligatorio con skill como interfaz.

Esta decisión cambia materialmente la arquitectura y debe resolverse antes de proponer el diseño.

## Corrección adversarial: conciencia multiagente

El dev eligió la tercera opción: protocolo PKM-AI obligatorio con la skill como interfaz. También señaló una omisión material de esta investigación: mientras se analizaba `query-docs` como dependencia, `claude-opus-5` ya estaba auditando y reparando esa herramienta en el mismo workspace.

### Evidencia viva del 2026-07-28

- `task_053`, **PKM-AI retrieval audit F1-F3**, fue creado por `claude-opus-5`, permanece `in-progress` y tiene una claim vigente.
- El worktree contiene cambios suyos en `query-docs.ts`, `lib/frontmatter.mjs`, `check-doc-health.ts` y sus tests.
- Su auditoría documenta como prioridades la guarda de staleness, la normalización de estados y la descubribilidad obligatoria de `query-docs`.
- La tarea reclamada tiene `scope: []`; por tanto, la claim no declara los archivos que está modificando y no puede prevenir colisiones por scope.
- El `status.json` del agente seguía diciendo `active`, pero su heartbeat ya era stale; la tarea y los cambios de worktree eran señales más recientes.
- `agent-room status/dashboard` carga todos los agentes y todas las tareas del run, incluidas claims expiradas y tareas `in-progress` históricas. El snapshot JSON completo superó miles de líneas y una consulta llegó a timeout.

### R17 — Presencia no equivale a actividad

Un agente puede tener heartbeat stale y a la vez una task claim vigente o cambios recientes en el worktree. Tomar sólo `status.json` produce falsos negativos; tomar sólo `status: active` produce falsos positivos.

**Necesidad futura:** liveness compuesta con heartbeat, claim, último evento y dirty overlap, mostrando incertidumbre cuando las señales discrepan.

### R18 — Registro completo no equivale a conciencia situacional

La sala conserva la información, pero el consumidor recibe demasiada historia sin filtrar. Para un agente corto, un dashboard de miles de líneas es operacionalmente equivalente a no tener dashboard.

**Necesidad futura:** snapshot acotado y orientado a la tarea: agentes realmente vivos, claims no expiradas, scopes solapados, eventos recientes, mailbox no leído y cambios dirty relevantes. El historial completo queda detrás de enlaces.

### R19 — Claim sin scope no protege el trabajo

`task_053` demuestra que el protocolo permite reclamar trabajo sin declarar ningún scope, aunque se editen varios archivos compartidos.

**Necesidad futura:** una tarea mutante no puede pasar a `in-progress` sin al menos un scope o una excepción explícita y auditable. Antes de cada mutación se revalida el overlap contra worktree y claims.

### R20 — Retrieval y coordinación son capas distintas

`query-docs` recupera memoria documental; `agent-room` representa trabajo vivo.
Consultar sólo el índice puede devolver la arquitectura correcta pero ignorar que otro agente la está cambiando en ese instante. Consultar sólo la sala puede omitir decisiones durables.

**Necesidad futura:** orden obligatorio de recuperación:

1. situational snapshot vivo;
2. fingerprint del worktree y ownership;
3. retrieval documental con freshness guard;
4. reconciliación de contradicciones;
5. recién entonces, ejecución.

### R21 — El protocolo actual depende de disciplina no verificada

El bootloader manda join, heartbeat, mailbox y retrieval, pero no prueba que el agente haya adquirido una visión actual antes de actuar. Tampoco exige task claim para toda mutación ni scopes no vacíos.

**Necesidad futura:** gates mecánicos, no sólo instrucciones: preflight machine-readable, códigos de salida y evidencia incluida en la cápsula.

### R22 — El propio control plane compite por contexto

Comandos lentos o verbosos consumen tiempo y ventana antes de comenzar el trabajo real. La degradación observada en `status/dashboard` es parte del problema anti-compactación, no una preocupación separada.

**Necesidad futura:** presupuesto de latencia, líneas y tokens para cada preflight; salida resumida por defecto y `--full` sólo bajo demanda.

## Consecuencia para la opción elegida

La skill no debe ser la memoria primaria ni un checklist narrativo. Debe ser la interfaz humana de un protocolo obligatorio que produzca y verifique un **recovery/coordination capsule** canónico. La cápsula debe fusionar estado vivo de `agent-room`, dirty state y memoria recuperada por `query-docs`, sin atribuir certeza cuando esas fuentes discrepan.
