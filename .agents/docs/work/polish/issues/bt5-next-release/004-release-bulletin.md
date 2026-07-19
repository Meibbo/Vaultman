---
title: BT5-004 — Aviso in-app y boletín público acumulativo
type: issue
status: pending
lifecycle: active
priority: P1-release-gate
execution: HITL
parent: "[[docs/work/polish/issues/bt5-next-release/index|BT5]]"
created: 2026-07-19T08:02:57
updated: 2026-07-19T12:43:51
created_by: codex-gpt-5
updated_by: codex-gpt-5
tags: [agent/issue, initiative/polish, release/bt5, release-policy]
---

# BT5-004 — Aviso in-app y boletín público acumulativo

## Parent

[[docs/work/polish/issues/bt5-next-release/index|BT5 next release train]].

## What to build

Reemplazar el modal beta.2 hardcoded por un aviso no bloqueante, breve y localizado que
se muestra como máximo una vez por versión instalada. Su CTA abre en el navegador un
único documento público acumulativo, propuesto como `docs/whats-new.md`, y el boletín
permanece disponible mediante comando o Settings después de descartar el aviso.

El documento vive en el repositorio y es la superficie editorial que el dev puede
configurar manualmente: título, introducción breve, 3–5 highlights orientados al
beneficio, orden, imágenes mediante rutas relativas del repo y enlace al changelog
técnico. Las entradas nuevas van primero y cada release conserva un anchor explícito y
estable. El plugin no empaqueta ni descarga el cuerpo o las imágenes del boletín; solo
abre una URL confiable cuando el usuario lo solicita.

Los fragments siguen siendo la fuente técnica del changelog. El boletín es una síntesis
editorial deliberadamente concisa, no una copia automática de esos fragments. Para una
stable minor o major se escribe un resumen del valor acumulado desde la stable anterior;
las entradas de sus betas continúan en el documento como historial, pero no se
concatenan dentro de la sección stable.

## Decisions locked

- **Delivery:** prompt/notice no bloqueante; no modal autoabierto.
- **Autoría:** un Markdown público acumulativo, newest-first, editable a mano y con anchor
  explícito por versión.
- **Media:** imágenes y otros documentos se enlazan con rutas relativas del repositorio
  para que GitHub los resuelva en el mismo ref que el boletín.
- **Detalle:** la sección enlaza al changelog de la misma versión; no lo reproduce.
- **Bundle y privacidad:** no se añaden assets de boletín a `main.js`, `manifest.json` o
  `styles.css`, ni se hace fetch remoto antes de que el usuario pulse el CTA.
- **Reapertura:** el aviso se descarta, pero el enlace permanece accesible manualmente.

## URL policy locked

El dev aprobó fijar cada aviso al tag instalado:
`https://github.com/Meibbo/Vaultman/blob/<tag>/docs/whats-new.md#<anchor>`.
Texto, imágenes relativas y changelog corresponden así exactamente al binario. Una errata
publicada se corrige en una release posterior; no se mueve el tag ni se redirige el aviso
de versiones antiguas hacia una rama mutable.

La implementación debe derivar versión, tag y anchor desde `plugin.manifest.version`; no
puede existir otra constante de versión hardcoded. El preflight valida el archivo, la
sección de la versión candidata, el anchor, los enlaces relativos y el enlace al changelog
en el commit que se va a etiquetar. Si se elige el tag, el workflow comprueba además la URL
publicada después de crear el release.

## Critique

Este diseño reduce ruido y carga del release, permite una presentación visual sin inflar el
plugin y evita mostrar información técnica que la mayoría verá una sola vez. También
conserva la autoría humana: los fragments pueden sugerir materia prima, pero no deben
publicar copy sin revisión.

Lo que se pierde frente a un boletín renderizado dentro de Vaultman es lectura offline,
continuidad visual dentro de la app y control total del renderer. GitHub bloqueado, sin red
o un fallo de `openExternal` deja el boletín inaccesible; el aviso debe fallar sin afectar el
arranque y permitir reintentar o copiar la URL. No se deben cargar imágenes
`raw.githubusercontent.com` dentro del plugin: eso reintroduciría tráfico remoto y riesgo de
privacidad sin acción explícita.

Un único documento crecerá indefinidamente. Newest-first, tabla de contenido y anchors
estables lo mantienen navegable al inicio; si deja de serlo, `docs/whats-new.md` puede
convertirse en índice de documentos versionados sin cambiar su URL base. Mover o renombrar
anchors históricos sería una regresión de compatibilidad. La automatización debe comprobar
enlaces y presencia de la sección, pero no puede decidir si el copy es atractivo: ese gate
sigue siendo HITL.

La URL fijada al tag prioriza reproducibilidad sobre correcciones retroactivas; la rama del
canal hace el trade-off inverso. Ninguna estrategia ofrece ambas propiedades. También se
debe limitar el CTA al repositorio oficial por HTTPS y nunca aceptar una URL arbitraria
proveniente de contenido de release.

## Acceptance criteria

- [x] El aviso no bloqueante se muestra como máximo una vez por versión, puede descartarse
      y el enlace sigue disponible manualmente.
- [x] Versión, tag y anchor se derivan de `plugin.manifest.version`; no queda una constante
      equivalente a `CURRENT_UPDATES_VERSION`.
- [x] El CTA solo abre por acción explícita una URL HTTPS permitida del repositorio oficial;
      no hay fetch remoto durante startup ni al mostrar el aviso.
- [x] Sin red o ante fallo de apertura, Vaultman continúa cargando y permite reintentar
      o copiar la URL.
- [x] `docs/whats-new.md` conserva historial newest-first, un anchor estable por versión,
      imágenes con alt+rutas relativas y enlace al changelog correspondiente.
- [x] El dev puede editar el boletín y añadir imágenes sin tocar la lógica del plugin ni los
      tres assets del release.
- [ ] El dev aprueba el copy editorial final; el changelog contiene el detalle
      técnico y los fragments no se publican automáticamente como copy editorial.
- [x] La policy exige que Stable reciba una síntesis editorial desde la stable anterior, no una repetición
      literal de cada beta, patch o fragment.
- [x] Preflight aborta si falta la sección candidata, su anchor, reviewed-state, changelog o
      un target relativo; existe preview/dry-run antes del commit/tag.
- [x] La policy y sus pruebas cubren canales, versionado por manifest, migración del estado
      `lastSeen` y reapertura manual.
- [ ] Si se aprueba URL por tag, el workflow verifica tras publicar que URL y anchor sean
      accesibles; un fallo se reporta como release incompleto.

## Blocked by

None — delivery no bloqueante, documento público acumulativo y URL fijada al tag están
aprobados. El copy concreto de cada release conserva revisión editorial HITL.

## Implementation checkpoint

Implementado y commiteado en `14de6fbb`. El aviso automático es un Notice once-per-version;
el comando manual abre un modal local conciso. Ambos derivan la URL exacta del manifest y
solo abren GitHub tras acción explícita. `docs/whats-new.md` contiene el draft beta.4 y una
plantilla editorial. El release preflight valida anchor, heading, reviewed marker, target
exacto de CHANGELOG, alt text, media relativa existente y ausencia de media GitHub en ramas
mutables; la verificación remota posterior comprueba el documento en el tag publicado.

Smoke en `plugin-dev`: el comando mostró `Vaultman Updates · 1.2.0-beta.4` y las acciones
What's new, Copy bulletin link y Got it, sin abrir red y sin errores. Quedan HITL la
aprobación del copy definitivo y, necesariamente, el check post-publicación del próximo tag.
