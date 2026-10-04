#!/data/data/com.termux/files/usr/bin/bash
# oc-task.sh <nombre> <workdir> <fichero-prompt>
#
# Lanzador de opencode para el reparto de U130. Mismo contrato que agy-task.sh
# --al que copia las cinco lecciones que costaron caro-- pero con el modelo
# muse-spark-1.3 en vez de gemini.
set -u
NAME=${1:?nombre}; WORKDIR=${2:?workdir}; PROMPT=${3:?prompt}

# Trampa de Termux: el PATH puede empezar por .../glibc/bin, cuyo sh no carga
# (`invalid ELF header`), y tmux hereda ese PATH del cliente.
export PATH=/data/data/com.termux/files/usr/bin:$PATH
export TZ=America/Lima

reject_model() {
  local normalized
  normalized=$(printf '%s' "$1" | tr '[:upper:]' '[:lower:]' | tr -cd '[:alnum:]')
  case "$normalized" in
    *laguna*|*lightning*|*minimax*|*gpt56luna*|*nemotron*|*ultra*|*ling*)
      echo "oc-task: modelo rechazado por decisión permanente del dev: $1" >&2; return 64 ;;
  esac
}
validate_chain() {
  local item
  IFS=',' read -ra items <<< "$1"
  for item in "${items[@]}"; do
    item=$(printf '%s' "$item" | tr -d '[:space:]')
    [ -z "$item" ] || reject_model "$item" || return $?
  done
}
# Validate every direct override before git, opencode, agy, or Codex can run.
for key in OC_MODEL AGY_MODEL CODEX_MODEL; do
  value=${!key:-}; [ -z "$value" ] || reject_model "$value" || exit $?
done
OC_FALLBACK_IS_SET=${OC_FALLBACK_MODEL+x}
USER_OC_FALLBACK=${OC_FALLBACK_MODEL-}
validate_chain "$USER_OC_FALLBACK" || exit $?
RUNNER=${RUNNER:-opencode}
case "$RUNNER" in
  opencode)
    if [ "$OC_FALLBACK_IS_SET" != x ]; then
      OC_FALLBACK_MODEL=
    else
      OC_FALLBACK_MODEL=$USER_OC_FALLBACK
    fi
    MODEL=${OC_MODEL:-opencode/muse-spark-1.3-contributor-free} ;;
  agy) MODEL=${AGY_MODEL:-gemini-3.8-flash-high} ;;
  codex)
    MODEL=${CODEX_MODEL:-gpt-6-luna}
    [ "$MODEL" = gpt-6-luna ] || { echo "oc-task: Codex lane solo admite gpt-6-luna" >&2; exit 64; }
    [ -z "$USER_OC_FALLBACK" ] || { echo "oc-task: Codex lane no permite fallbacks" >&2; exit 64; } ;;
  *) echo "oc-task: RUNNER desconocido: $RUNNER" >&2; exit 64 ;;
esac
reject_model "$MODEL" || exit $?
BRANCH=feat/u130-nodemovemode

cd "$WORKDIR" || exit 1

# --- Liberacion del vault: MECANISMO, no instruccion (dev, 2026-09-06) ---
# "Los vaults mientras no se esten trabajando siempre deben liberarse al
# reparto." Escribirlo en el prompt no basta -- una instruccion no es un
# mecanismo, y un carril que muere por plazo no lee su propio prompt. El trap
# corre pase lo que pase: exito, fallo, plazo agotado o kill.
if [ -n "${OC_VAULT_LANE:-}" ]; then
  trap 'echo "--- liberando vault del carril $OC_VAULT_LANE ---"; \
        "$HOME/bin/weblab-claim-vault" "$OC_VAULT_LANE" --release 2>&1 | tail -1' EXIT INT TERM
fi

# --- m2 es CANONICO (dev, 2026-09-06; antes lo era m1) ---
# El defecto por defecto era `origin` y luego `canon`, que apuntaba al worktree
# de m1 POR SSH. Con cinco carriles arrancando a la vez, cinco `git fetch` por
# ssh contra un movil hacen que sshd rechace conexiones y los cinco mueran con
# "correct access rights and the repository exists" -- que se lee como un
# problema de permisos y no lo es. Ya paso el 2026-09-06.
#
# Ahora el canonico vive en el PROPIO repo de m2, y los worktrees comparten su
# git dir, asi que el defecto es `.`: sin red, sin ssh, instantaneo y sin
# depender de que otro nodo este vivo.
# Fetch obligatorio ANTES de cada tarea. Sin esto dos carriles divergen en
# cuanto tocan el mismo fichero: ya paso una vez.
echo "--- fetch del canonico ---"
# SIN tuberia: `cmd | tail` devuelve el codigo de tail, no el de cmd, y la
# guarda se vuelve decorativa. Ya paso: la divergencia se detecto y la tarea
# arranco igual.
# El remoto del canonico NO es `origin`: en los clones de trabajo `origin` es
# GitHub, y el canonico es el worktree de m1. Se pasa por OC_REMOTE.
REMOTE=${OC_REMOTE:-.}
if ! git fetch "$REMOTE" "$BRANCH" > "${TMPDIR:-/tmp}/octask-fetch.log" 2>&1; then
  tail -3 "${TMPDIR:-/tmp}/octask-fetch.log" >&2
  echo "FETCH FALLO: no arranco la tarea con un arbol posiblemente atrasado" >&2
  exit 75
fi
# El invariante NO es "ff-merge": el agente trabaja en su propia rama de tarea,
# asi que en cuanto commitea deja de poder avanzar en linea recta. Lo que hay
# que exigir es que la punta canonica sea ANCESTRO de HEAD -- o sea, que el
# trabajo esta construido sobre ella y no sobre un arbol atrasado.
#
# La primera version pedia ff-only y paro en seco al encontrar un worktree
# divergido. Paro BIEN --es para lo que esta-- pero el invariante estaba mal
# formulado para una rama de tarea.
if git merge-base --is-ancestor FETCH_HEAD HEAD 2>/dev/null; then
  echo "--- al dia con el canonico ---"
elif git merge --ff-only FETCH_HEAD > "${TMPDIR:-/tmp}/octask-merge.log" 2>&1; then
  echo "--- adelantado al canonico por fast-forward ---"
else
  tail -3 "${TMPDIR:-/tmp}/octask-merge.log" 2>/dev/null >&2
  echo "DIVERGENCIA: la punta canonica no es ancestro y no se puede" >&2
  echo "fast-forward. Eso lo mira un humano: fusionar a ciegas aqui es como" >&2
  echo "se pierde trabajo. Parando." >&2
  exit 75
fi

echo "--- HEAD: $(git log --oneline -1) ---"
echo "=== $NAME · opencode $MODEL · $(date) ==="

# El prompt va por --file, NO como argumento posicional. Un prompt largo
# --16 KB en la primera tarea-- hace que yargs escupa la ayuda y salga con 1,
# sin decir por que: parece que el modelo fallo y en realidad no llego a
# arrancar. Y `--file` es un array, asi que el mensaje necesita el separador
# `--` o se lo come como si fuera otro fichero.
#
# `--auto` es el equivalente de --dangerously-skip-permissions de agy: en una
# ventana de tmux no hay nadie que conteste a un prompt de permisos, asi que
# sin esto la tarea cuelga en cuanto va a ESCRIBIR.
# --- Runtime: opencode (defecto) o agy (Gemini de Antigravity) ---
RUNNER=${RUNNER:-opencode}

# --- Codigo de salida REAL y fallback automatico (dev, 2026-09-06) ---
#
# Dos defectos que obligaban a adivinar y que aqui se cierran de forma
# determinista:
#
# 1. Este script terminaba en `echo "=== EXIT=$? ==="`, asi que SU codigo de
#    salida era el del `echo`: siempre 0. El `.exit` de claude-delegate
#    heredaba ese 0 y un carril muerto se leia como terminado. Ahora el
#    codigo del agente se captura en una variable y el script sale con el.
#
# 2. `opencode run` devuelve 0 aunque el proveedor conteste con un error de
#    cuota: el fallo solo aparece en el texto. Se detecta por CADENA FIJA
#    sobre el log --no por criterio de un modelo-- y se traduce a un codigo
#    propio, 70, para que nadie tenga que interpretar prosa.
#
# Codigos: 0 ok · 70 los dos modelos agotados por el proveedor · 75 guarda del
# canonico · el del agente en cualquier otro caso.
RUN_LOG="${TMPDIR:-/tmp}/octask-${NAME}.out"
if [ "$OC_FALLBACK_IS_SET" = x ]; then
  FALLBACK=$USER_OC_FALLBACK
else
  FALLBACK=
fi

# Cadenas fijas con las que los proveedores anuncian agotamiento. Se comparan
# literalmente: si manana cambian, esto deja de disparar y el carril sale con
# el codigo del agente -- falla hacia el lado ruidoso, no hacia el silencioso.
proveedor_agotado() {
  grep -qiE 'rate.?limit|quota|temporarily rate-limited|Unexpected server error' "$1" 2>/dev/null
}

correr_opencode() {
  local modelo=$1
  echo "=== $NAME · opencode $modelo · $(date) ==="
  opencode run -m "$modelo" --dir "$WORKDIR" --auto --file "$PROMPT" \
    -- "Lee el fichero adjunto y ejecuta la tarea que describe, paso a paso." 2>&1 | tee -a "$RUN_LOG"
  return "${PIPESTATUS[0]}"
}

: > "$RUN_LOG"

if [ "$RUNNER" = "agy" ]; then
  AGY_MODEL=$MODEL
  echo "=== $NAME · agy $AGY_MODEL · $(date) ==="
  export AGY_AUTO_UPDATE=0
  # `--dangerously-skip-permissions`: en headless agy AUTO-DENIEGA las
  # herramientas y aun asi sale con rc=0 y salida vacia.
  # `printf 'n'`: el prompt de actualizacion cuelga el modo -p en tmux.
  printf 'n\n' | agy --dangerously-skip-permissions \
      --model "$AGY_MODEL" \
      --print-timeout "${AGY_TIMEOUT:-45m}" \
      --add-dir "$WORKDIR" \
      -p "$(cat "$PROMPT")" 2>&1 | tee -a "$RUN_LOG"
  RC=${PIPESTATUS[1]}
elif [ "$RUNNER" = "codex" ]; then
  echo "=== $NAME · codex $MODEL · $(date) ==="
  TASK_PROMPT=$(cat "$PROMPT")
  codex exec -m gpt-6-luna --sandbox workspace-write --skip-git-repo-check "$TASK_PROMPT" 2>&1 | tee -a "$RUN_LOG"
  RC=${PIPESTATUS[0]}
else
  FALLBACK=${OC_FALLBACK_MODEL:-}
  correr_opencode "$MODEL"; RC=$?
  if proveedor_agotado "$RUN_LOG"; then
    IFS=',' read -ra CADENA <<< "$FALLBACK"
    for fb in "${CADENA[@]}"; do
      [ -n "$fb" ] || continue
      [ "$fb" = "$MODEL" ] && continue
      echo "=== $NAME · agotado -> siguiente eslabon: $fb ==="
      if [ -n "${LANE_ADMISSION_NAME:-}" ]; then
        if "$HOME/bin/lane" admission-switch "$LANE_ADMISSION_NAME" oc "$fb"; then
          :
        else
          ADMISSION_RC=$?
          RC=$ADMISSION_RC
          break
        fi
      fi
      : > "$RUN_LOG"
      correr_opencode "$fb"; RC=$?
      proveedor_agotado "$RUN_LOG" || break
    done
  fi
fi

if [ "${ADMISSION_RC:-0}" -ne 0 ]; then
  echo "=== EXIT=$ADMISSION_RC ==="
  exit "$ADMISSION_RC"
fi
if proveedor_agotado "$RUN_LOG"; then
  echo "=== $NAME · PROVEEDOR AGOTADO ==="
  echo "=== EXIT=70 ==="
  exit 70
fi
echo "=== EXIT=$RC ==="
exit "$RC"
