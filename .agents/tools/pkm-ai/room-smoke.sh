#!/usr/bin/env bash
# room-smoke.sh — puerta de aceptación de agent-room.ts.
#
# Mitad ROJA: las cuatro conductas que exige ADR 0007 (roles + briefing).
# Mitad VERDE: regresión de lo que ya funciona y no se puede romper al implementarlo.
#
# Uso: bash .agents/tools/pkm-ai/room-smoke.sh
# Contrato para quien implemente: ESTE FICHERO NO SE TOCA. Se cambia agent-room.ts
# hasta que salga "TODO VERDE". Un test reescrito por quien escribe el código no es señal.

set -u
ROOT="$(cd "$(dirname "$0")" && pwd)"
ROOM="node $ROOT/agent-room.ts"
STATE="${TMPDIR:-/tmp}/room-smoke-$$"
mkdir -p "$STATE"
trap 'rm -rf "$STATE"' EXIT
R="--state-root $STATE"

PASS=0; FAIL=0
ok()   { PASS=$((PASS+1)); printf '  ok   %s\n' "$1"; }
bad()  { FAIL=$((FAIL+1)); printf '  FAIL %s\n' "$1"; }
check(){ if [ "$1" = "0" ]; then ok "$2"; else bad "$2"; fi; }

echo "== ADR 0007 (deben pasar cuando esté implementado) =="

# A1 — join sin --role debe fallar. Hoy escribe "worker" en silencio y sale 0.
$ROOM agent join --run current --agent smoke-sinrol $R >/dev/null 2>&1
[ $? -ne 0 ] && ok "A1 join sin --role es rechazado" || bad "A1 join sin --role fue aceptado (hoy escribe worker en silencio)"

# A2 — el rol se renderiza en status. Hoy agentTag() lo descarta (agent-room.ts:1301).
$ROOM agent join --run current --agent smoke-sup --role supervisor --stream dev $R >/dev/null 2>&1
$ROOM status --run current $R 2>/dev/null | grep -q "smoke-sup.*supervisor" \
  && ok "A2 status pinta el rol" || bad "A2 status NO pinta el rol"

# A3 — existe el subcomando brief.
$ROOM brief --run current --agent smoke-sup $R >/dev/null 2>&1
check $? "A3 el subcomando brief existe y sale 0"

# A4 — brief lista vivos y NO lista muertos. Se fuerza staleness con --now.
$ROOM agent join --run current --agent smoke-viejo --role worker $R --now 2020-01-01T00:00:00 >/dev/null 2>&1
B="$($ROOM brief --run current --agent smoke-sup $R 2>/dev/null)"
printf '%s' "$B" | grep -q "smoke-sup" && ok "A4a brief lista al agente vivo" || bad "A4a brief no lista al agente vivo"
printf '%s' "$B" | grep -q "smoke-viejo" && bad "A4b brief cuela un agente stale entre los vivos" || ok "A4b brief excluye al agente stale"

# A5 — brief separa las tareas in-progress cuyo dueño está muerto.
T="$($ROOM task add --run current --agent smoke-viejo --title "huerfana" --json $R --now 2020-01-01T00:00:00 2>/dev/null | grep -oE 'task_[0-9]+' | head -1)"
if [ -n "$T" ]; then
  $ROOM task claim  --run current --agent smoke-viejo --task "$T" $R --now 2020-01-01T00:00:00 >/dev/null 2>&1
  $ROOM task status --run current --agent smoke-viejo --task "$T" --status in-progress $R --now 2020-01-01T00:00:00 >/dev/null 2>&1
  $ROOM brief --run current --agent smoke-sup $R 2>/dev/null | grep -qiE "huerfan|orphan" \
    && ok "A5 brief marca la tarea in-progress con dueño muerto" || bad "A5 brief no distingue la tarea huerfana"
else
  bad "A5 no se pudo crear la tarea de prueba"
fi

# A6 — una tarea in-progress SIN dueño tambien es huerfana. Hoy desaparece del brief:
# aliveTasks y orphanTasks exigen owner, asi que la tarea sin owner no cae en ninguna lista.
# No hay ningun caso asi en la run real hoy (verificado 2026-09-01: las 23 in-progress tienen
# dueño). Es un hueco de logica, no un incidente: una tarea en curso que no es de nadie es MAS
# huerfana, no menos, y hoy no sale por ninguna parte.
T3="$($ROOM task add --run current --agent smoke-sup --title "sin-dueno" --json $R 2>/dev/null | grep -oE 'task_[0-9]+' | head -1)"
if [ -n "$T3" ]; then
  $ROOM task status --run current --agent smoke-sup --task "$T3" --status in-progress $R >/dev/null 2>&1
  $ROOM brief --run current --agent smoke-sup $R 2>/dev/null | grep -A5 -iE "huerfan|orphan" | grep -q "$T3" \
    && ok "A6 brief marca como huerfana la tarea in-progress sin dueño" || bad "A6 la tarea in-progress sin dueño se cae del brief"
else
  bad "A6 no se pudo crear la tarea sin dueño"
fi

echo "== Regresión (verde HOY y debe seguir verde) =="

$ROOM agent heartbeat --run current --agent smoke-sup --role supervisor $R >/dev/null 2>&1
check $? "R1 heartbeat"

$ROOM status --run current $R >/dev/null 2>&1
check $? "R2 status"

$ROOM handoff --run current $R >/dev/null 2>&1
check $? "R3 handoff"

T2="$($ROOM task add --run current --agent smoke-sup --title "regresion" --scope src/smoke.ts --json $R 2>/dev/null | grep -oE 'task_[0-9]+' | head -1)"
[ -n "$T2" ] && ok "R4 task add devuelve id" || bad "R4 task add no devolvió id"
$ROOM task claim --run current --agent smoke-sup --task "$T2" $R >/dev/null 2>&1
check $? "R5 task claim"
$ROOM scope conflicts --run current --scope src/smoke.ts $R >/dev/null 2>&1
[ $? -ne 0 ] && ok "R6 scope conflicts detecta el claim" || bad "R6 scope conflicts no detectó el claim"

$ROOM mailbox send --run current --agent smoke-sup --to smoke-viejo --body "hola" $R >/dev/null 2>&1
check $? "R7 mailbox send"
$ROOM mailbox read --run current --agent smoke-viejo $R >/dev/null 2>&1
check $? "R8 mailbox read"

$ROOM agent leave --run current --agent smoke-sup $R >/dev/null 2>&1
check $? "R9 agent leave"

echo
echo "pasan: $PASS   fallan: $FAIL"
[ "$FAIL" -eq 0 ] && { echo "TODO VERDE"; exit 0; } || { echo "PUERTA ROJA"; exit 1; }
