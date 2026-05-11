---
title: Performance Spec 04 - GPU-Accelerated Positioning
type: optimization-spec
status: active
created: 2026-05-10
tags:
  - performance/rendering
  - css/hardware-acceleration
---

# Performance Spec 04: GPU-Accelerated Positioning

## 1. Problema Actual
`ViewNodeTable` usa `top: var(--vm-node-table-y)`. Cambiar la propiedad `top` fuerza un "Layout Recalculation" completo del contenedor, lo que causa el "jittering" (temblor) al hacer scroll rápido en Obsidian.

## 2. Solución: translate3d (Pattern Robo de Obsidian Core)
Mover el posicionamiento de las filas virtuales a la GPU.

### Contrato de Implementación:
```css
.vm-node-table-row {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  /* Forzamos el uso de la GPU */
  transform: translate3d(0, var(--vm-node-table-y), 0);
  will-change: transform;
}
```

## 3. Beneficios
- **Nitidez:** El scroll se vuelve "nítido" al delegar el movimiento al motor de composición de hardware de Electron.
- **FPS:** Mantenimiento de 60fps constantes independientemente de la complejidad de la fila.
