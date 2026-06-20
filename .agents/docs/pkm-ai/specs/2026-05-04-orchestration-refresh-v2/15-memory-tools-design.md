---
title: Memory and Tools Design
type: spec-slice
status: draft
initiative: pkm-ai
parent: "[[docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh-v2/index|pkm-ai]]"
created: 2026-05-05T21:38:00
updated: 2026-05-05T21:38:00
tags:
  - agent/spec
  - memory
  - architecture
---

# Memory And Tools Design

Esta especificación detalla la implementación del sistema híbrido de memoria a corto/largo plazo y la delegación de análisis pesado a la PC mediante nuevas _tools_.

## 1. Arquitectura Híbrida de Memoria

Hemos adoptado una combinación del **Enfoque A (Archivo basado en Shards)** y el **Enfoque B (Graph-Based Indexer)**. 

### Archivo Persistente (Enfoque A)
El contexto activo del agente (la "Memoria de Trabajo") debe mantenerse pequeño. Cuando un ciclo termina o el contexto crece demasiado, el agente delegará el almacenamiento usando herramientas de compresión.
- **Carpeta de Archivo:** `docs/archive/` (o un subdirectorio dedicado `memory/`).
- **Mecanismo:** El agente genera un resumen técnico, y usa una tool para guardar el detalle extenso en un _shard_ Markdown estático. 
- **Recuperación:** La herramienta de búsqueda incluirá estos manifiestos para restaurar el contexto solo cuando sea relevante.

### Graph Indexer (Enfoque B)
En lugar de que el agente gaste _tokens_ abriendo múltiples archivos para entender cómo se conectan (ej. leyendo `import`s manualmente), la PC construirá un mapa de relaciones estructurales.
- **Mecanismo:** Un script analizará las dependencias de TypeScript/Svelte en Vaultman.
- **Consulta:** El agente podrá pedir: *"Devuélveme el sub-grafo de componentes afectados si modifico `ViewList`"*.

---

## 2. Nuevas Tools de Delegación a la PC

Para mejorar los resultados y liberar la carga cognitiva del agente, se implementarán los siguientes scripts (`.mjs`) dentro de `tools/pkm-ai/` o `tools/dev/`:

1. **Análisis de Memoria (`manage-memory.mjs`):**
   - **Propósito:** Permite al agente archivar proactivamente (escribir a _cold storage_) o buscar recuerdos específicos sin necesidad de leer todos los _shards_.
   - **Acciones:** `archive`, `retrieve`, `summarize_active`.

2. **Análisis de Código AST (`analyze-code.mjs`):**
   - **Propósito:** Extrae interfaces, firmas de funciones y props de Svelte/TS sin que el agente lea el archivo completo.
   - **Ventaja:** Ideal para explorar contratos de componentes grandes como `frameVaultman.svelte`.

3. **Análisis de Grafos (`traverse-graph.mjs`):**
   - **Propósito:** Genera y consulta el árbol de dependencias (`import`/`export`) y estructura de carpetas.

4. **Análisis de Logs (`analyze-logs.mjs`):**
   - **Propósito:** Parsea de forma inteligente los errores del terminal de Obsidian (`obsidian dev:errors`) o salidas de Vitest, agrupando _stack traces_ repetidos y devolviendo solo el origen del fallo.

5. **Análisis de Métricas (`analyze-metrics.mjs`):**
   - **Propósito:** Lee `metrics/pkm-ai.jsonl` y reporta tendencias (ej. alertas de salud documental, recurrencia de bugs).

## 3. Flujo de Trabajo (Data Flow)

1. **Inicio de Sesión:** El agente lee `start.md` y `status.md`.
2. **Contexto Pasado:** Si la tarea requiere decisiones anteriores, invoca `manage-memory.mjs retrieve`.
3. **Exploración:** En lugar de `view_file` en archivos gigantes, usa `analyze-code.mjs` y `traverse-graph.mjs`.
4. **Cierre:** Al finalizar la iteración, el agente invoca `manage-memory.mjs archive` para dejar documentado su trabajo antes de salir.
