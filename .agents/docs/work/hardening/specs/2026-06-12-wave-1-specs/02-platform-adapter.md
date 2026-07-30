---
title: Wave 1 spec — PlatformAdapter + Fragility Registry (lane B)
type: spec-shard
status: draft
parent: "[[docs/work/hardening/specs/2026-06-12-wave-1-specs/index|Wave 1 specs]]"
created: 2026-06-12T00:00:00
updated: 2026-06-12T00:00:00
created_by: claude-fable-5
updated_by: claude-fable-5
tags:
  - agent/spec
  - umbrella-v2/wave-1
  - lane/platform-adapter
---

# Spec — PlatformAdapter + Fragility Registry

**Lane B · paralelizable · worktree `umbrella-v2/wave-1-pa` desde sandbox HEAD.
Implementa ADR 0004; desbloquea SF/menu-curator/iconize/ForeignEmbed.**

## 1. Objetivo

Toda dependencia de API privada/no-documentada de Obsidian, monkey-patch o scraping de DOM vive en UN adapter nombrado con probe + fallback + revert, enumerado en un Fragility Registry. Robustez de **MyWorkspace** (prioridad alpha) depende de esto: el control del workspace UI es la zona más frágil del producto.

## 2. Alcance

1. **Contrato `PlatformAdapter`** (tipo + base): `{id, probe(): CapabilityResult, apply(), revert(), fallback, fragility: FragilityRecord}`. `revert` integrado al camino `serviceUnload` (ADR 0004 + ADR 0011: módulos detachables lo reusan).
2. **Fragility Registry**: enumeración central; cada record = selector sources, asunciones de versión Obsidian, fallback, **comportamiento en mobile**. En load:
   probes corren; probe fallido auto-deshabilita la feature SIN crash y queda visible (log + futuro config-export).
3. **Migración de los frágiles existentes** (del ledger, ordenados por valor alpha):
   - `NativeSearchAdapter` (D-C-1: queda como engine del alpha — es scraping de DOM del Core Search, EL caso de uso ejemplar del registry; detrás del seam `SearchEngine` que define el tracer).
   - Consolidación de los **dos caminos de native binding** (ledger 09 §3.4:
     NativeSurfaceBindingService vs click interceptor viejo) → un solo camino vía adapter.
   - Adapter Core Bases multi-select — **resolver primero la verificación pendiente** (ledger 09 §9: SDF-016 lo declara landed; cluster 07 no lo halló en código).
   - Delegación `file-menu` nativa + supresión de reentrada (stable, cluster 07).
4. **Platform gate / mobile** (ledger 09 §6): el registry incluye la dimensión plataforma — `is-phone`/`isMobile` detection util documentado y testeado (cierra el gap working-memory). Criterio de salida del gate para alpha: inventario de features hover-only/desktop-only completo; decisión `isDesktopOnly` informada con datos (la decisión final la toma el dev con el inventario — D abierta §8.7 del ledger 09).
5. **T.G shape-tests**: tests que afirman los símbolos privados usados; fallo = señal de bump de `minAppVersion`.

## 3. Fuera de alcance

- Floating tiles/hover-editor patches (SF, wave posterior — pero el contrato debe soportarlos), iconize-absorb, menu-curator completo (lane D futura; solo la delegación file-menu existente se adapta), fix funcional de features mobile (solo inventario + gate).

## 4. Decisiones y evidencia que consume

- ADR 0004 (contrato) · ADR 0011 (serviceUnload/registry compartido) · D-PSS-2 (índice de clases nativas vs `app.css` del web-lab vive en el Fragility Registry).
- Ledger cluster 07 (bindings duals, file-menu, discrepancia Bases adapter) · cluster 08 Tabla 7 (mobile) · 09 §3.4/§6/§9.
- Pre-reads del implementador: ADR 0004 · delta-matrix §028 · dev-glossary (Adapter/PlatformAdapter) · obsidian-web-lab (referencia de DOM nativo).

## 5. Criterios de aceptación

1. Contrato tipado + ≥3 adapters reales migrados (native search, native binding consolidado, file-menu) cada uno con probe/fallback/revert + test.
2. Registry enumerable en runtime (estructura consultable; base del futuro config-export) con TODOS los campos del ADR incluyendo mobile behavior.
3. Probe fallido simulado en test → feature deshabilitada, plugin carga limpio.
4. `serviceUnload`-revert verificado por test (apply → revert → DOM/estado limpio).
5. Shape-tests T.G corriendo en la suite normal.
6. Inventario plataforma entregado como doc corto en la umbrella (input de la decisión dev `isDesktopOnly`).
7. `pnpm run check`/`lint`/`verify` + smoke `plugin-dev` con `dev:errors` limpio.

## 6. Riesgos

- La consolidación de native binding puede tocar providers (frontera con Q4) → coordinar archivos; si hay overlap real, la parte provider espera a que Q4 aterrice.
- Verificación Bases-adapter puede revelar que el doc sobre-declaró → registrar en ledger y des-priorizar ese adapter sin bloquear el lane.
