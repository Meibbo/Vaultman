---
title: Spec 12 - Interactive Diff Review & Robust VFS
type: implementation-spec
parent: "[[docs/superpowers/specs/2026-05-10-shadcn-tailwind-transition/index|index]]"
created: 2026-05-10
tags:
  - architecture/vfs
  - ui/diff
  - logic/immutability
---

# Spec 12: Interactive Diff Review & Robust VFS

## 1. Objetivo Técnico
Evolucionar el sistema de previsualización de cambios (`serviceDiff.ts`) hacia una herramienta de **Revisión Interactiva** tipo IDE (Cursor/VS Code). El usuario debe poder navegar entre cambios (hunks), aceptar o descartar operaciones individuales y contar con una capa de seguridad (Foul Detection) antes de persistir a disco.

## 2. Mejoras del VFS (Arquitectura de Datos)

### 2.1. Inmutabilidad Estructural
Refactorizar el contrato de `StagedOp` y `VirtualFileState` para evitar mutaciones directas:
- **Cambio:** `apply: (v: VirtualFileState) => void` pasa a ser `apply: (v: VirtualFileState) => VirtualFileState`.
- **Implementación:** Cada operación devuelve un nuevo snapshot usando spread operators o una librería de inmutabilidad ligera. Esto permite el "Undo" granular sin reconstruir desde el inicio.

### 2.2. OpStateMap (Staging Area)
Implementar un mapa reactivo en `OperationQueueService` para gestionar el compromiso del usuario:
- **Estados:** `'pending' | 'accepted' | 'discarded'`.
- Solo las operaciones en estado `'accepted'` (o `'pending'` por defecto) se incluirán en el commit final al disco.

### 2.3. Foul Detection (Pre-commit Safety)
Antes de ejecutar `commitFile(vfs)`, el sistema debe:
- Comparar el `mtime` (timestamp de modificación) actual del archivo en disco con el capturado al momento de la hidratación del VFS.
- Si el archivo cambió externamente, disparar un error de "Cache Outdated" y ofrecer re-hidratar o forzar el cambio.

## 3. UI/UX: Experiencia tipo IDE (Diff View)

### 3.1. Navbar de Aceptación (Review Toolbar)
En la vista de `viewDiff.svelte`, inyectar un navbar persistente con:
- **Botón Discard [Op]:** Envía la señal al VFS para mover el estado a `'discarded'`.
- **Botón Keep [Op]:** Marca como `'accepted'`.
- **Indicador de Navegación:** "Cambio 2 de 5" con flechas para saltar entre `BodyHunks`.

### 3.2. Hunk Navigation
Implementar atajos de teclado y clics en el gutter para:
- Saltar al siguiente bloque de cambio (`ctx -> add/del`).
- Centrar el scroll del diff en el hunk activo.

### 3.3. Faint Mode en Diff
Los colores de fondo de las líneas (`is-add`, `is-del`) deben usar variables de opacidad que se atenúen cuando el panel de Diff pierda el foco, reduciendo la carga visual.

## 4. Definición de Hecho (DoD)
- El VFS no realiza mutaciones directas sobre los objetos de estado inicial.
- El usuario puede descartar una operación específica de un archivo desde el Diff y ver el resultado calculado instantáneamente.
- La ejecución de la cola ignora las operaciones marcadas como `'discarded'`.
- Se detectan cambios externos en el disco antes de sobrescribir archivos (Foul Detection).
