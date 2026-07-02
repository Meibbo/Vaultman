---
title: PAI-005 — Icon packs como assets (registro DEFER)
type: issue
status: deferred
parent: "[[docs/work/hardening/issues/proto-absorption-icons/index|PAI index]]"
created: 2026-07-02T13:30:00
updated: 2026-07-02T13:30:00
created_by: claude-fable-5
tags:
  - agent/issue
  - umbrella-v2/absorption
  - explorer/icons
---

# PAI-005 — Icon packs como assets (DEFER — registro, no accionable)

**Tag: DEFER** · **Nivel: N4 (flag, lane C)** · No se ejecuta en esta wave.

## Qué queda registrado

Pack registry (lucide/adwaita/papirus/reversal/emoji) · remote packs por URL · import
freedesktop (`index.theme`+SVGs, opendesktop) · almacén + caché de packs. Ledger 06
tabla "Icon packs": SOLO-PROTO RESHAPE o `(sin evidencia)` DEFER; adwaita hardcoded en
proto; sin caché de failed URLs.

## Por qué DEFER

N4 en la pirámide (nada de N4 entra a gate 2.0.0 — solo flag) · requiere disciplina de
tooling (assets/almacén/caché = decisión de librerías) · el umbrella lo tiene como open
explícito (icon packs importables, lane C).

## Al activarse

Input directo = spec v5-era
[[docs/work/hardening/specs/2026-05-25-explorer-icon-pack-cache/index|Explorer Icon Pack Cache]]
(descriptor-model cacheable, 3 shards) — RE-VALIDAR contra el canon actual (D-PSS storage
classes + asset-refs por id del V.D shard §PSS-export) antes de implementar. La cadena de
resolución de PAI-001 ya reserva el slot `pack:` (PAI-002), así que activar packs NO
reabre el resolver.
