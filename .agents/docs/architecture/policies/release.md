---
title: Policy — release channels, betas y promoción (alpha/beta/stable)
type: policy
status: active
parent: "[[docs/architecture/policies/docs|policies]]"
created: 2026-07-14T00:00:00
created_by: claude-fable-5
tags:
  - agent/policy
  - release/discipline
  - release/beta-channel
---

# Release Policy — canales, betas y promoción

Operacionaliza [[docs/work/hardening/research/2026-05-27-version-streams-distillation/index|version-streams]] (que supersedió ADR 0006) y cierra los ítems 3/4/7 de [[docs/work/publish/index|publish]].
Fuentes del research 2026-07-13: semver.org 2.0.0 · keepachangelog.com 1.1.0 · dora.dev (small batches) · BRAT dev guide (TfTHacker) · docs.obsidian.md (Manifest/Versions/ guidelines/mobile) · Fowler (strangler fig, feature parity, parallel run) · Spolsky · Caudill (6 rewrites). Contexto histórico: 1.1.1 y 1.1.6 salieron stable-directo SIN gate beta (session-log 2026-06-09/2026-06-23); el ciclo beta real se usó en 1.1.0 (beta.2/4 + relabel post mobile-break). Esta policy convierte ese gate en norma.

## Canales

| Canal | Branch | Label | Propósito | Distribución |
|---|---|---|---|---|
| alpha (canary) | `sandbox` | `X.Y.0-alpha.N` | Demostrativo de una línea futura de Vaultman; **extremadamente inestable**; trabajo descartable/convertible/absorbible por otros streams; testeo de interacción de cosas nuevas. Puede preceder betas, minors o majors si el dev lo decide | GitHub **pre-release** + BRAT opt-in. NUNCA store |
| beta | `dev` | `X.Y.0-beta.N` | Validación real pre-stable: **mobile en device real**, instalaciones limpias (experiencia de usuario nuevo), upgrade-path | GitHub pre-release + BRAT |
| stable | `main` | `X.Y.Z` | Usuarios reales; curado | Community store + GitHub Release |

Reglas de label (D-PSS-7 + semver 11.4): prerelease ordena ASCII → `alpha < beta < rc`;
**"canary" NUNCA como label** (ordenaría sobre alpha/beta y BRAT-latest instala el semver más alto). Canal = metadato (patrón Chrome); el orden lo da el número.

## Versionado de línea

- MINOR (`1.2.0`, `1.3.0`…) = features backward-compatible — la línea 1.x **sigue viva** con feature-minors mientras 2.0 madura (enmienda D4 2026-07-14; strangler-fig).
- PATCH = hotfix. MAJOR (`2.0.0`) = incompatibilidades reales (schema settings/datos).
- **No hard-sunset** de 1.x al aterrizar 2.0 (ventana parcheada; lección Basecamp).
- Batch pequeño como principio (DORA): serie de incrementos releasables, no drops gigantes. Métrica personal ligera: % de releases que necesitaron hotfix + tiempo hasta ese hotfix. No perseguir benchmarks enterprise (Goodhart).

### Desviaciones autorizadas del dev (registro fechado)

Excepciones concedidas explícitamente por el dev a las reglas de arriba. **Una desviación registrada NO crea norma**: el default sigue siendo la regla, y cada nueva excepción se anota aquí con fecha y razón. Si una desviación se repite, deja de ser excepción y toca re-abrir la regla en grill.

| Fecha | Desviación | Razón dada por el dev | Alcance |
|---|---|---|---|
| 2026-07-29 | **`1.2.1` sale como update ACUMULATIVA** (features + bugfixes), no como hotfix. Por `PATCH = hotfix` + "1.x sigue con feature-minors", la forma fiel a esta policy sería `1.3.0`. | Hay ~30 issues de rendimiento y UX que vienen de fallos del último release que no se resolvieron a tiempo o son problemas de raíz; el dev los quiere fuera ya, y las líneas grandes (absorción de sandbox, proto-design) van después. | Solo `1.2.1`. El dev anticipa que **probablemente no sea la última vez**; si vuelve a ocurrir, promover la excepción a regla en vez de acumular filas aquí. |

Consecuencias operativas de una acumulativa, para el agente que la publique: las release notes son de grado feature (no "hotfix"), el checklist de validación es el de un minor (clean-install + upgrade-path + mobile real), y el caveat BRAT del item 8 del runbook aplica igual.

## Runbook beta → stable (por cada minor/major)

1. Sync: FF/rebase `dev` sobre `origin/main`; verificar cero AI-files en el diff a publicar.
2. Bump: `manifest.json` + `package.json` = `X.Y.0-beta.N` (tag == manifest.version == nombre del release — lo exigen Obsidian y BRAT; `manifest-beta.json` está DEPRECADO).
3. Gates locales: `pnpm run verify` + `pnpm run security:audit` (high+) verdes.
4. Tag `X.Y.0-beta.N` → `release.yml` de `dev` detecta el guion y publica GitHub **pre-release** (`--prerelease --latest=false`) con main.js/manifest/styles(/SHA256SUMS/ sbom según workflow).
5. Validación beta (checklist mínimo):
   - **Mobile device real vía BRAT** (Capacitor/touch/safe-areas/perf). La lane emulada (`app.emulateMobile(true)` directo o plugin `advanced-debug-mode` en plugin-dev; los agentes la manejan vía obsidian-cli eval) sirve SOLO para iterar UI/ramas `isMobile` — prohibido contarla como cobertura móvil.
   - **Clean-install**: vault fresco sin `data.json` → first-run, defaults sanos, onboarding; y **upgrade-path**: data.json de la stable previa → migración de settings sin pérdida.
   - `dev:errors` limpio + smokes de la feature.
6. Iterar `beta.N+1` con fixes (los cambios de la beta se acumulan en el CHANGELOG bajo la versión objetivo, patrón Unreleased→release).
7. Promoción stable: PR `dev → main` (paths-filter guard de AI files + CI/CodeQL/ Scorecard verdes) → tag `X.Y.0` (release-please o tag manual patrón 1.1.6 — decidir por release) → GitHub Release estable.
8. Post-release: `versions.json`/`minAppVersion` correctos (apps viejas reciben el último build compatible; subir minAppVersion SOLO si se usó API nueva) · changelog promovido · **cierre de beta**: los usuarios BRAT en `-beta.N` NO auto-saltan al stable → publicar patch `X.Y.1` temprano o instruir switch-back/remove en el release note de la beta final.

## Rollback / YANKED

Build malo publicado: marcar `[YANKED]` en el CHANGELOG + editar el GitHub release (pre-release/nota), y publicar versión superior de recuperación. Contemplar SIEMPRE el caveat BRAT anterior al planear la recuperación. Prohibido borrar tags/releases sin instrucción explícita del dev (policy git).

## Alphas (sandbox) — guardas

- `X.Y.0-alpha.N` + GitHub pre-release + BRAT opt-in; jamás store; jamás auto-update de usuarios stable. La línea puede ser un minor futuro (`1.3.0-alpha.N`) o un major (`2.0.0-alpha.N`), pero no puede retroceder a alpha después de que el mismo core haya alcanzado beta/RC/stable.
- Aviso obligatorio en release notes: "inestable / demostrativo / sin garantía de migración / descartable" (patrón Factorio experimental + Obsidian early-access).
- CI verde también para el canal alpha antes de distribuir (publish item 3).
- Plan de salida: quien esté en alpha necesita ruta documentada hacia beta/stable (mismo caveat BRAT).

## CHANGELOG

Keep a Changelog 1.1.0: sección `Unreleased` + categorías `Added/Changed/Deprecated/ Removed/Fixed/Security` + `[YANKED]`; un solo CHANGELOG.md, las entradas de alpha/beta se acumulan bajo su versión objetivo; declarar adherencia a SemVer.

Los cambios pendientes se capturan como fragments públicos en `changes/X.Y/*.md`, con categoría y `reviewed: true`. Alpha/beta renderizan acumulativamente solo los fragments de su línea; stable los compila en la sección definitiva de `CHANGELOG.md` y los consume. Esto permite parches `1.2.x` en `main` mientras `dev` valida `1.3.0-beta.N` y `sandbox` experimenta otra línea, sin mezclar notas ni crear conflictos sobre un único `Unreleased`.

## Automatización local

Comando canónico desde la branch del canal:

```bash
pnpm release -- <canal> <línea>
pnpm release -- <versión-exacta>
```

Ejemplos: `stable 1.2`, `beta 1.3`, `alpha 2.0`, o `1.3.0-beta.4`. La resolución compara tags por línea, no contra un máximo global: `1.2.2` sigue siendo un patch válido aunque exista `1.3.0-beta.3`. Una versión explícita nunca se reescribe silenciosamente; si no es superior dentro de su tren, el comando aborta y muestra la siguiente sugerida.

El flujo exige branch/canal correcto, worktree limpio y sincronizado, cero AI files en el diff público, notes revisadas y ausencia del tag/release remoto. Luego alinea `package.json`/`manifest.json`/`versions.json`, actualiza CHANGELOG y release notes, ejecuta verify+audit+build, crea el commit, sube la branch/tag, espera `release.yml` y verifica canal y assets. Opciones: `--dry-run`, `--prepare-only`, `--yes`.

## Rewrite 2.0 en paralelo (guardas de convivencia)

- Feature-parity ledger vivo (ya instituido, D3) — los minors 1.x se registran al ocurrir.
- Parallel-run sobre el mismo vault antes de migrar usuarios 1.x→2.0.
- Shapes gemelos para features que nacen en 1.x (contratos con nombres canon del goal stream) — port = move, no reshape.
