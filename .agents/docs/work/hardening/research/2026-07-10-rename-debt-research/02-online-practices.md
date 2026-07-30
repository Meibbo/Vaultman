---
title: Rename-debt research — shard 02 (prácticas online, con fuente)
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

# Shard 02 — Prácticas establecidas (online), extracción completa

6 prácticas. 5 queries WebSearch (ubiquitous language DDD · rename/codemod monorepo Google Meta · semantic drift vocabulary · vocabulary-first refactoring · shim/alias strategy) + 2 WebFetch completos (Fowler codemods, Thoughtworks). 2 WebFetch fallaron en origen (NDepend 403, Webflow header-overflow) — citadas desde snippet de búsqueda, fuente sigue siendo válida. Vínculo con el [[docs/work/hardening/research/2026-07-10-rename-debt-research/index|index]]: sección (c).

## 1. Ubiquitous Language vive EN el código

Fuente: [Martin Fowler — bliki: Ubiquitous Language](https://martinfowler.com/bliki/UbiquitousLanguage.html) (+ corpus DDD general vía búsqueda: Qlerify, Agile Alliance, ddd-practitioners.com).

Eric Evans (DDD): el vocabulario compartido entre devs y dominio debe reflejarse DIRECTAMENTE en clases/métodos/variables del código — no es solo terminología de doc. Riesgo documentado: el vocabulario técnico "se filtra" fuera de sus límites razonables y termina dominando conversaciones de diseño hasta alienar a quien no es técnico. **Mapeo a Vaultman:** el glossary.md/dev-glossary.md ya existen y se actualizan (panelWidget/Overlay hoy) — la práctica que falta es que el update del glosario y el update del código pasen JUNTOS, no el glosario primero y el código "cuando toque" (exactamente lo que separa la fila 4 y 6 del shard 01: decidido hoy, ejecución en una slice futura sin fecha).

## 2. Automatizar el chequeo de conformidad contra el glosario

Fuente: [NDepend — Checking DDD Ubiquitous Language with NDepend](https://blog.ndepend.com/checking-ddd-ubiquitous-language-with-ndepend/) (vía snippet de búsqueda — WebFetch directo devolvió 403).

Desde NDepend 2018.1 existe una regla default que valida que TODO elemento de código en el namespace del dominio (clases, enums, structs, interfaces, métodos, propiedades, campos) use solo términos de una lista de vocabulario aprobada. **Generalización barata sin comprar NDepend:** un grep de identificadores nuevos (nombres de archivo/clase/interface top-level) contra los términos de `glossary.md`/`dev-glossary.md` antes de mergear — suficiente para atrapar el caso `typeActionRouting` vs `InputRouter` (regla 5 de la policy draft del index).

## 3. Codemods: transforms pequeños, testeados, secuenciados

Fuente: [Martin Fowler — Refactoring with Codemods to Automate API Changes](https://martinfowler.com/articles/codemods-api-refactoring.html) (WebFetch completo).

Técnicas concretas extraídas:
- **Composición:** descomponer una transformación compleja en codemods pequeños e independientes, cada uno testeado por separado — evita fallas en cascada.
- **Orden de pipeline:** limpieza dependiente DESPUÉS del cambio primario (ej. quitar un toggle → limpiar imports no usados → quitar funciones muertas), no todo junto.
- **TDD del propio codemod:** casos positivos (qué debe cambiar) Y negativos (qué NO debe tocar) escritos ANTES de correr el transform.
- **Análisis de grafo de fuente primero:** buscar el uso real en el repo (incluye imports con alias) antes de automatizar — informa la cobertura de test.
- **Comentario en vez de fuerza:** si un call-site no se puede transformar con confianza, insertar un TODO en vez de arriesgar una transformación incorrecta.
- **Estandarizar estilo ANTES:** un linter que reduce variaciones de código hace el transform más simple.
- **Revisión post-transform completa:** tests funcionales + review del PR + commits incrementales normales, no un solo mega-commit ciego.

**Mapeo a Vaultman:** la fila 4 del shard 01 (7 archivos `providers/explorer*` + interfaz + 8 call-sites de `getTree()`) es exactamente el tamaño donde un codemod (ts-morph / jscodeshift sobre TS) paga más que un rename manual — mecánico, alto blast-radius, bajo riesgo semántico.

## 4. Grep de blast-radius y estandarización antes del rename mecánico

Fuente: [Webflow — Codemods and large-scale refactors at Webflow](https://webflow.com/blog/codemods-and-large-scale-refactors-at-webflow) (vía snippet de búsqueda — WebFetch directo falló, header overflow del origen).

Codemods usan manipulación de AST para aplicar cambios consistentes a través de cientos o miles de componentes; el valor está en la consistencia, no solo en la velocidad — reduce el error humano que aparece cuando el mismo rename se hace a mano en 50 sitios distintos.
**Mapeo directo:** el hallazgo destacado de este research (shard 01 §5, los 6 shims de `components/containers/explorer*` fuera del radar de Slice 0) es precisamente el escenario que un grep de blast-radius completo — no solo de la carpeta que se toca — hubiera atrapado antes de que el plan se escribiera.

## 5. Semantic drift: 3 etapas, tratar el vocabulario como observable

Fuente: [Thoughtworks — Semantic drift and semantic integrity: Stewarding meaning in the age of AI](https://www.thoughtworks.com/insights/blog/data-strategy/semantic-drift-stewarding-meaning-ai) (WebFetch completo).

Define semantic drift como "la distancia de alineación que crece entre la ejecución de un sistema y su intención de negocio". Tres etapas del deterioro:
1. **Overloading** — reutilizar un campo/nombre existente para evitar un cambio de schema;
   un solo nombre termina cargando significados no relacionados (caso `typeActionRouting`:
   nombre de 2026-05-20 reutilizado conceptualmente hasta que el grill de hoy lo separó en dos tiers reales).
2. **Dilución de contexto** — la intención original se pierde cuando la información cruza equipos/agentes que usan el mismo término para conceptos distintos.
3. **Pérdida de conocimiento** — el entendimiento institucional se desvanece cuando la documentación deja de reflejar las reglas reales (caso `proto-v6`/`proto-v12`, shard 01 §7 — research escrito contra un baseline que ya no era canon).

Mecanismo recomendado: **observabilidad semántica** — instrumentar el modelo de dominio como telemetría viva en vez de documentación estática, para poder medir automáticamente cuándo un cambio de código se desalinea del vocabulario declarado. Cita central: *"Si perdemos control del lenguaje, perdemos control del significado que representa."*

## 6. Shim como chokepoint único con dueño, no patrón disperso

Fuentes: [freeCodeCamp — How to Manage Code Dependencies by Shimming Your Abstractions](https://www.freecodecamp.org/news/manage-code-dependencies-by-shimming-your-abstractions/) · [Redux Toolkit — Migrating to RTK 2.0 and Redux 5.0](https://redux-toolkit.js.org/usage/migrating-rtk-2) (vía snippet de búsqueda).

La estrategia: aislar una dependencia/nombre detrás de UN módulo wrapper referenciado en un solo lugar (el shim), de forma que un cambio futuro solo toque ese punto — evita el "efecto dominó" de cambios dispersos por todo el codebase. El patrón mínimo de alias-de-migración de Redux Toolkit (`import { legacy_createStore as createStore } from 'redux'`) muestra la forma más barata: el nombre viejo queda explícitamente marcado como legacy en el punto de import, no escondido. **Contraste con Vaultman:** los 6 shims de `components/containers/explorer*` NO son un chokepoint único — son 6 archivos separados, cada uno silencioso (sin marca `legacy`/`deprecated`, sin dueño registrado), que es exactamente el patrón que esta práctica desaconseja. La regla 4 de la policy draft (dueño + trigger de expiración) apunta a cerrar esta brecha.
