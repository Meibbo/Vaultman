---
title: "Auditoría: File Transaction Queue (Plan vs Implementación)"
type: audit-report
status: completed
initiative: hardening
parent: "[[docs/work/hardening/index|hardening]]"
created: 2026-05-04T15:45:00
updated: 2026-05-04T15:45:00
tags:
  - agent/audit
  - hardening/logic
  - logic/queue
---

# Auditoría Técnica Profunda: Cola de Transacciones

## 1. Análisis de Contrato: `IOperationQueue`
La implementación en `src/services/serviceQueue.svelte.ts` satisface la interfaz `IOperationQueue` definida en `contracts.ts`, pero con inconsistencias internas.

```typescript
// Línea 51: Implementación del contrato
export class OperationQueueService extends Component implements IOperationQueue {
    // ...
    pending = $state<PendingChange[]>([]); // Rune detectado (L66)
    size = $derived(this.pending.length); // Derived detectado (L69)
}
```

### El Problema de la Reactividad "Zombie"
Aunque existen los runes `pending` y `size`, la lógica de negocio (L130-156) **no los alimenta**.
- **Realidad:** Los cambios se guardan en `this.transactions: Map<string, VirtualFileState>`.
- **Efecto:** El array `pending` permanece en `[]`. La propiedad `size` siempre es `0` para Svelte, obligando a los componentes a usar `subscribe()` manual (L103) para enterarse de cambios en el `Map`.

## 2. Motor de Ejecución: Chunking y Atomización
La ejecución en `execute()` (L442) sigue el plan de performance para evitar el bloqueo del main thread de Obsidian.

```typescript
// L452: Configuración de chunking
const CHUNK = 20;
// ...
if ((i + 1) % CHUNK === 0) {
    await new Promise<void>(r => activeWindow.setTimeout(r, 0)); // Cede el control al UI
}
```

### Garantía de Integridad (vault.process)
Se utiliza `this.app.vault.process` (L488). Esto es crítico porque:
1. Es **atómico**: Obsidian bloquea el archivo durante la escritura.
2. Es **seguro**: Evita colisiones si el usuario edita el archivo manualmente durante la ejecución de la cola.

## 3. Innovación: Re-materialización Quirúrgica
Se detectó una funcionalidad no documentada en el plan original que mejora la estabilidad: `removeOp` (L387).

```typescript
removeOp(path: string, opId: string): void {
    const vfs = this.transactions.get(path);
    // ...
    vfs.fm = { ...vfs.fmInitial }; // Reset al estado inicial del disco
    vfs.body = vfs.bodyInitial;
    vfs.newPath = undefined;
    vfs.ops = filtered; // Filtra la operación cancelada
    for (const op of vfs.ops) op.apply(vfs); // REPLAY del resto de operaciones
    // ...
}
```
**Impacto:** Permite al usuario "deshacer" una acción específica en la cola sin afectar el resto de cambios preparados para ese archivo.

## 4. Inconsistencias de I18n y Placeholders
El código llama a llaves de traducción que fallan en tiempo de ejecución:
- `translate('result.applying')` (L457): Funciona.
- `translate('ops.queue')`: Mencionada en `Agent Memory`, pero **ausente** en la lógica de `serviceQueue`.
- **Regresión:** El componente `explorerQueue.svelte` (L19) usa `v.items.length` de un virtualizador que se alimenta de un `operationsIndex` que a su vez lee de un `serviceQueue` cuyos runes están vacíos. **Círculo vicioso de datos vacíos.**

## 5. Plan de Remediación Técnica
Para alinear la implementación con el **ADR-001** y **ADR-008**:

1. **Sincronización de Runes:** `ingest()` (L190) debe hacer `this.pending.push(change)` además de actualizar el `Map`.
2. **Eliminación de Eventos Manuales:** Quitar `this.events.trigger('changed')` (L121) y dejar que Svelte reaccione al cambio de `pending`.
3. **Corrección de I18n:** Mapear `result.applying`, `result.success` y `result.errors` en `src/index/i18n/lang.ts` para evitar el placeholder `{count} pending`.

## 6. Referencias de Archivos Analizados
- `src/services/serviceQueue.svelte.ts` (L1-536)
- `src/components/explorers/explorerQueue.svelte` (L1-130)
- `contracts.ts` (IOperationQueue definition)
