---
title: Agent Memory Systems Research
type: research
status: active
initiative: pkm-ai
parent: "[[docs/work/pkm-ai/index|pkm-ai]]"
created: 2026-05-05T21:20:00
updated: 2026-05-05T21:20:00
tags:
  - agent/research
  - memory
  - architecture
---

# Agent Memory Systems Research

Este documento resume la investigación sobre arquitecturas modernas de memoria para agentes LLM, con foco en **sistemas de memoria a corto y largo plazo**, **GraphRAG** (recorrido de grafos) y el patrón de **archivar en lugar de borrar**. 

Esta investigación busca expandir el alcance de [[docs/work/pkm-ai/specs/2026-05-04-orchestration-refresh-v2/10-tools-indexing|Tools And Indexing]], donde actualmente dependemos de scripts locales (`query-docs.mjs`, `index-docs.mjs`) para que la PC asuma la carga de indexación.

---

## 1. Arquitectura de Memoria en Capas (Tiered Memory)

Los agentes de nivel de producción no guardan todo en el *context window*. Funcionan como un sistema operativo que pagina la memoria entre RAM y Disco Duro.

> [!info] Las 3 Capas de Memoria
> 1. **Memoria de Trabajo (Working Memory):** Es el *context window* actual. Rápido, efímero, pero muy limitado en tokens. Solo contiene la sesión activa y el razonamiento intermedio.
> 2. **Memoria a Corto Plazo / Episódica (Buffer):** Guarda las interacciones recientes. Cuando se llena, en lugar de borrar, el sistema **resume** el contenido y lo pasa al archivo profundo, manteniendo solo el resumen en contexto.
> 3. **Memoria a Largo Plazo (Archival Memory):** Almacenamiento persistente (como JSON, bases de datos vectoriales o grafos). Información inmutable a la que el agente no accede directamente a menos que use una _tool_ para buscar.

## 2. El Paradigma "Archivar vs Borrar"

Borrar contexto genera *amnesia catastrófica* (el agente olvida decisiones pasadas o preferencias clave del usuario).

> [!tip] Implementación de Archivo
> En lugar de ejecutar `delete`, se usa un enfoque de "Decaimiento por Fuerza" (Strength-Based Decay) y "Autogestión":
> - **Compresión Activa:** El agente detecta que la sesión es larga, genera un resumen de alto nivel de lo discutido y guarda la transcripción completa (o el detalle técnico crudo) en un archivo muerto.
> - **Nuevas Tools Propuestas:**
>   - `archive_memory(topic_id, summary, raw_content)`: Herramienta que el agente invoca para delegar a la PC la compresión y guardado de datos inactivos.
>   - `move_to_cold_storage(file_path)`: Saca de la memoria activa un documento y lo indexa para recuperarlo luego si es necesario.

## 3. Recorrido Eficiente del Sistema: GraphRAG

El RAG tradicional (búsqueda semántica plana) falla cuando se necesita un razonamiento de *múltiples saltos* (conectar el concepto A con el concepto C a través de B).

**GraphRAG** soluciona esto almacenando el conocimiento como nodos (entidades) y aristas (relaciones).
1. Permite al agente recorrer visualmente y lógicamente cómo un componente afecta a otro (ej. `serviceViews.ts` -> `viewList.svelte`).
2. Se alinea perfectamente con la *Fase 2 de Indexación* de Vaultman (import/export graph, file map, test map).

---

## 4. Opciones de Arquitectura para PKM-AI (Vaultman)

Para mejorar cómo PKM-AI maneja el estado sin saturar la ventana de chat, propongo **3 enfoques distintos**. 

> [!question] ¿Qué enfoque resuena más contigo? (Ver "Preguntas" al final)

### Enfoque A: Memoria basada en Shards y Manifiestos (Evolución Natural)
- **Concepto:** Continuar la filosofía actual de `10-tools-indexing.md` pero automatizando el archivo.
- **Mecanismo:** Crear herramientas NodeJS (`archive-context.mjs`) que el agente llame cuando la memoria a corto plazo supere X líneas. El script compacta el historial en un *shard* (ej. `01-history-archived.md`) y deja un manifiesto.
- **Ventaja:** Cero dependencias externas. 100% en el file system local.

### Enfoque B: Graph-Based Memory Indexer (Delegación a la PC)
- **Concepto:** Construir un script que analice las notas de Vaultman y genere un JSON de relaciones (Grafo). 
- **Mecanismo:** El agente obtiene una herramienta `traverse_graph(node_id, depth)`. En lugar de hacer RAG de texto, pide a la PC que devuelva "todos los archivos conectados a serviceViews".
- **Ventaja:** Releva muchísimo trabajo a la PC. El agente nunca se pierde buscando en directorios a ciegas.

### Enfoque C: OS-Level Paging (Estilo MemGPT)
- **Concepto:** El agente maneja *bloques de memoria explícitos* en su System Prompt (Core Memory) e invoca herramientas constantemente para leer/escribir en *Archival Memory*.
- **Mecanismo:** Cada vez que el agente aprende algo importante (ej. "Al usuario le gustan las respuestas en markdown"), usa `core_memory_append()`.
- **Ventaja:** Autonomía total del agente sobre su memoria, pero mayor consumo de tokens en llamadas a herramientas.

---

## 5. Próximos Pasos (Preguntas Clarificatorias)

Para continuar con el flujo de *Brainstorming*, por favor lee este documento y respóndeme las siguientes preguntas:

1. **Sobre el Archivo:** ¿Prefieres el **Enfoque A** (Automatizar la compresión y guardado en archivos Markdown estáticos) o te llama más la atención el **Enfoque C** (Darle al agente herramientas para que edite su propia "Memoria Core" vs "Archivo")?
2. **Sobre el Recorrido (GraphRAG):** ¿Consideras que vale la pena invertir en el **Enfoque B** para que la PC genere un grafo de tu código/notas y el agente lo consulte, o empezamos con algo más simple basado en la jerarquía de carpetas actual?
3. **Nuevas Tools:** Mencionaste crear *nuevas tools para relevar más trabajo a la PC*. ¿Tienes en mente herramientas de análisis de código (AST), análisis de logs, o puramente enfocadas en buscar texto comprimido en el *Vault*?

> **Nota:** Conforme acordemos el diseño, escribiremos el *Design Doc* final y pasaremos a la planificación.
