#!/data/data/com.termux/files/usr/bin/bash
# Isolated lane admission and task-runtime regression suite; all CLIs are mocks.
set -euo pipefail
REAL_HOME=${HOME:?}
SUITE=$(mktemp -d "${TMPDIR:-/tmp}/lane-regression.XXXXXX")
trap 'rm -rf "$SUITE"' EXIT INT TERM
H=$SUITE/home; BIN=$SUITE/mockbin
mkdir -p "$H/bin" "$H/wt" "$H/dotfiles/bin" "$H/.cache/claude-delegate" \
  "$H/.cache/pkm-ai/delegates" "$BIN" "$SUITE/work/a/src" "$SUITE/work/b/src" \
  "$SUITE/work/c/src" "$SUITE/work/d/src" "$SUITE/evidence"
cp "$REAL_HOME/bin/lane" "$H/bin/lane"
cp "$REAL_HOME/wt/lane-run.sh" "$H/wt/lane-run.sh"
cp "$REAL_HOME/wt/oc-task.sh" "$H/wt/oc-task.sh"
# oc-task deliberately puts Termux's system PATH first; redirect that prefix
# inside this disposable fixture so the git shim, never real git, is selected.
sed -i "s|/data/data/com.termux/files/usr/bin:\$PATH|$BIN:\$PATH|" "$H/wt/oc-task.sh"
chmod +x "$H/bin/lane" "$H/wt/lane-run.sh" "$H/wt/oc-task.sh"
export SUITE HOME="$H" PATH="$BIN:$PATH" CALLS="$SUITE/evidence/canonical.calls" \
  LAUNCH_META="$SUITE/evidence/launch.meta" MODEL_CALLS="$SUITE/evidence/model.calls" GIT_CALLS="$SUITE/evidence/git.calls" \
  CODEX_RC=0 AGY_RC=0 OC_RC=0 TMPDIR="$SUITE/tmp"
mkdir -p "$TMPDIR"

cat > "$BIN/tmux-usage-overlay" <<'MOCK'
#!/bin/sh
printf '%s\n' '{"providers":[{"id":"zen","availability":"available"},{"id":"openrouter","remaining":10},{"id":"openai","limits":[{"left":5}]},{"id":"antigravity","limits":[{"label":"Gemini","left":5}]}]}'
MOCK
cat > "$BIN/tmux" <<'MOCK'
#!/bin/sh
if [ "$1" = list-panes ]; then
  [ ! -f "$SUITE/evidence/panes" ] || cat "$SUITE/evidence/panes"
  exit 0
fi
exit 0
MOCK
cat > "$BIN/git" <<'MOCK'
#!/bin/sh
printf 'git %s\n' "$*" >> "$GIT_CALLS"
case "$1" in fetch|merge|merge-base|log) exit 0;; status) exit 0;; worktree) exit 0;; *) exit 0;; esac
MOCK
cat > "$BIN/opencode" <<'MOCK'
#!/bin/sh
printf 'opencode cwd=%s argv=%s\n' "$PWD" "$*" >> "$MODEL_CALLS"
echo "${OC_OUTPUT:-mock opencode}"
exit "${OC_RC:-0}"
MOCK
cat > "$BIN/agy" <<'MOCK'
#!/bin/sh
printf 'agy cwd=%s argv=%s\n' "$PWD" "$*" >> "$MODEL_CALLS"
echo "mock agy"
exit "${AGY_RC:-0}"
MOCK
cat > "$BIN/codex" <<'MOCK'
#!/bin/sh
printf 'codex cwd=%s argv=%s\n' "$PWD" "$*" >> "$MODEL_CALLS"
printf '%s\n' "$*" > "$SUITE/evidence/codex.argv"
exit "${CODEX_RC:-0}"
MOCK
cat > "$H/bin/pkmai-delegate" <<'MOCK'
#!/bin/sh
case "$1" in check|stop) exit 0;; *) exit 90;; esac
MOCK
cat > "$H/bin/weblab-claim-vault" <<'MOCK'
#!/bin/sh
printf '%s %s\n' "$*" >> "$SUITE/evidence/vault.calls"
[ "${2:-}" = --release ] && exit 0
printf 'mock-vault\n'
MOCK
cat > "$H/dotfiles/bin/claude-delegate" <<'MOCK'
#!/data/data/com.termux/files/usr/bin/bash
set -e
[ "${1:-}" = --detach ] && shift
name=$1; shift
printf '%s\n' "$name" >> "$CALLS"
printf '%s\n' "$*" >> "$LAUNCH_META"
printf 'harness=%s provider=%s model=%s\n' "$PKMAI_DELEGATE_HARNESS" "$PKMAI_DELEGATE_PROVIDER" "$PKMAI_DELEGATE_MODEL" >> "$LAUNCH_META"
sleep 0.12
id="test_${name}_$$_${RANDOM}"
jq -n --arg id "$id" --arg n "$name" --arg p "$PKMAI_DELEGATE_PROVIDER" \
  --arg m "$PKMAI_DELEGATE_MODEL" --arg w "$PWD" \
  '{attemptId:$id,name:$n,provider:$p,model:$m,workdir:$w,tmuxPane:"%88",state:"running",startedAt:"test"}' \
  > "$HOME/.cache/pkm-ai/delegates/$id.json"
: > "$HOME/.cache/pkm-ai/delegates/$id.log"
printf '%%88|%s\n' "$id" >> "$SUITE/evidence/panes"
printf '%s\n' "$id"
MOCK
chmod +x "$BIN/"* "$H/bin/pkmai-delegate" "$H/bin/weblab-claim-vault" "$H/dotfiles/bin/claude-delegate"
printf 'mock prompt text\n' > "$SUITE/prompt.md"
fail() { echo "FAIL: $*" >&2; exit 1; }
assert_rc() { local expected=$1 got=0; shift; "$@" >"$SUITE/out" 2>"$SUITE/err" || got=$?; [ "$got" = "$expected" ] || { cat "$SUITE/out" "$SUITE/err" >&2; fail "expected rc=$expected got=$got: $*"; }; }
write_conf() { cat > "$H/wt/lane-pools.conf"; }

# Red reproductions: each unsafe input currently presented to the gate must fail
# before the canonical (mocked) launcher records any invocation.
for bad in 'opencode/nemotron-3.5-lightning-free' 'openrouter/laguna-s-2.1:free' \
  'openrouter/minimax' 'openrouter/minimax-m3' 'openrouter/minimax_m3' \
  'openrouter/minimax/m3:free' 'openrouter/mini-max/m3:free' \
  'openai/gpt-5.6-luna' 'openai/GPT5.6Luna' \
  'opencode/nemotron-3-ultra-free' 'openrouter/nvidia/nemotron-3-ultra-550b-a55b:free' \
  'openrouter/NEMOTRON-3-ULTRA-550B' 'opencode/Nemotron-3-Ultra-Free' \
  'openrouter/inclusionai/ling-3.0-flash-fin:free' 'openrouter/inclusionai/ling-3.0-flash-sante:free' \
  'openrouter/LING-3.0-Flash-Fin:free' 'opencode/ling-3.0-test:free'; do
  : > "$CALLS"
  write_conf <<CONF
bad|oc|$bad|
CONF
  assert_rc 64 "$H/bin/lane" run bad "$SUITE/work/a" "$SUITE/prompt.md" --pool bad
  [ ! -s "$CALLS" ] || fail "forbidden primary reached launcher: $bad"
  write_conf <<CONF
bad|oc|opencode/muse-spark-1.3-contributor-free|$bad
CONF
  assert_rc 64 "$H/bin/lane" run bad "$SUITE/work/a" "$SUITE/prompt.md" --pool bad
  [ ! -s "$CALLS" ] || fail "forbidden fallback reached launcher: $bad"
done
write_conf <<'CONF'
ok|oc|opencode/muse-spark-1.3-contributor-free|
CONF
for var in OC_MODEL AGY_MODEL CODEX_MODEL; do
  : > "$CALLS"
  if [ "$var" = OC_MODEL ]; then assert_rc 64 env "$var=openrouter/laguna-x" "$H/bin/lane" run x "$SUITE/work/a" "$SUITE/prompt.md" --pool ok
  elif [ "$var" = AGY_MODEL ]; then assert_rc 64 env "$var=mini-max/m3" "$H/bin/lane" run x "$SUITE/work/a" "$SUITE/prompt.md" --pool ok
  else assert_rc 64 env "$var=gpt-5.6-luna" "$H/bin/lane" run x "$SUITE/work/a" "$SUITE/prompt.md" --pool ok; fi
  [ ! -s "$CALLS" ] || fail "$var forbidden override reached launcher"
done

# Production config contract preserves Muse/Gemini routes and Codex-only Luna.
cp "$REAL_HOME/wt/lane-pools.conf" "$H/wt/lane-pools.conf"
assert_rc 0 "$H/bin/lane" config-check
assert_rc 0 "$H/bin/lane" pools
grep -F '0/2' "$SUITE/out" >/dev/null || fail 'pools omitted live upstream count/capacity'
grep -Fx 'muse13|oc|opencode/muse-spark-1.3-contributor-free|' "$H/wt/lane-pools.conf" >/dev/null || fail 'Muse route changed'
grep -Fx 'antigravity|agy|gemini-3.8-flash-high|' "$H/wt/lane-pools.conf" >/dev/null || fail 'Gemini route changed'
grep -Fx 'luna|codex|gpt-6-luna|' "$H/wt/lane-pools.conf" >/dev/null || fail 'Luna route/fallback contract changed'
! grep -q '^minimax|' "$H/wt/lane-pools.conf" || fail 'retired minimax pool remains'
! grep -qiE 'nemotron|ultra|ling' <(grep -v '^[[:space:]]*#\|^[[:space:]]*$' "$H/wt/lane-pools.conf") || fail 'retired Ultra/Ling route remains (policy 2026-10-04)'
[ "$(grep -c -v '^[[:space:]]*#\|^[[:space:]]*$' "$H/wt/lane-pools.conf")" = 3 ] || fail 'registry must hold exactly three approved rows'
cat > "$H/wt/lane-pools.conf" <<'CONF'
luna|codex|gpt-6-luna|
CONF
: > "$LAUNCH_META"
"$H/bin/lane" run luna-check "$SUITE/work/c" "$SUITE/prompt.md" --pool luna >/dev/null
grep -F 'RUNNER=codex CODEX_MODEL=gpt-6-luna' "$LAUNCH_META" >/dev/null || fail 'Luna lane did not select native Codex'
grep -F 'harness=codex' "$LAUNCH_META" >/dev/null || fail 'Luna passport did not select Codex harness'
cat > "$H/wt/lane-pools.conf" <<'CONF'
alias|oc|opencode/muse-spark-1.3-contributor-free|
CONF
RUNNER=opencode "$H/bin/lane" run alias-runtime "$SUITE/work/d" "$SUITE/prompt.md" --pool alias >/dev/null
grep -F 'RUNNER=opencode OC_MODEL=opencode/muse-spark-1.3-contributor-free' "$LAUNCH_META" >/dev/null || fail 'opencode alias did not normalize to oc'
# Start admission cases from clean isolated passport/cache state.
rm -f "$H/.cache/claude-delegate/"* "$H/.cache/pkm-ai/delegates/"* "$CALLS" "$LAUNCH_META"
cat > "$H/wt/lane-pools.conf" <<'CONF'
zen|oc|opencode/muse-spark-1.3-contributor-free|
zen2|oc|opencode/muse-spark-1.3-contributor-free|
openrouter|oc|openrouter/mock-cap-a:free|
openrouter2|oc|openrouter/mock-cap-b:free|
CONF
: > "$CALLS"
"$H/bin/lane" run zen-one "$SUITE/work/a" "$SUITE/prompt.md" --pool zen >/dev/null
"$H/bin/lane" run zen-two "$SUITE/work/b" "$SUITE/prompt.md" --pool zen2 >/dev/null
"$H/bin/lane" status > "$SUITE/status.out"
grep -F 'upstream 2/2' "$SUITE/status.out" >/dev/null || fail 'status omitted actual shared upstream count'
assert_rc 3 "$H/bin/lane" run zen-three "$SUITE/work/c" "$SUITE/prompt.md" --pool zen --shared-pool
[ "$(wc -l < "$CALLS" | tr -d ' ')" = 2 ] || fail 'zen alias cap did not admit exactly two'
"$H/bin/lane" run router-one "$SUITE/work/c" "$SUITE/prompt.md" --pool openrouter >/dev/null
"$H/bin/lane" run router-two "$SUITE/work/d" "$SUITE/prompt.md" --pool openrouter2 >/dev/null
assert_rc 3 "$H/bin/lane" run router-three "$SUITE/work/c" "$SUITE/prompt.md" --pool openrouter --shared-pool
assert_rc 3 "$H/bin/lane" run same-worktree "$SUITE/work/a" "$SUITE/prompt.md" --pool openrouter

# Direct passports count by upstream account even without any lane cache row.
rm -f "$H/.cache/pkm-ai/delegates/"*.json "$H/.cache/claude-delegate/"* "$CALLS"
cat > "$H/wt/lane-pools.conf" <<'CONF'
openrouter|oc|openrouter/mock-cap-a:free|
openrouter2|oc|openrouter/mock-cap-b:free|
CONF
for i in 1 2; do jq -n --arg i "$i" '{attemptId:("direct"+$i),provider:"openrouter",model:"direct",workdir:("direct"+$i),tmuxPane:("%9"+$i),state:"running"}' > "$H/.cache/pkm-ai/delegates/direct$i.json"; done
printf '%s\n' '%91|direct1' '%92|direct2' > "$SUITE/evidence/panes"
"$H/bin/lane" pools > "$SUITE/direct-pools.out"
grep -F '2/2' "$SUITE/direct-pools.out" >/dev/null || { cat "$SUITE/direct-pools.out" >&2; cat "$SUITE/evidence/panes" >&2; jq -c '.' "$H/.cache/pkm-ai/delegates/"*.json >&2; fail 'live direct pane/passport census failed'; }
assert_rc 3 "$H/bin/lane" run direct-cap "$SUITE/work/c" "$SUITE/prompt.md" --pool openrouter
[ ! -s "$CALLS" ] || fail 'direct passports were not included in provider count'
rm -f "$H/.cache/pkm-ai/delegates/direct2.json"
printf '%s\n' '%91|direct1' > "$SUITE/evidence/panes"
assert_rc 0 "$H/bin/lane" run stale-passport-ignored "$SUITE/work/c" "$SUITE/prompt.md" --pool openrouter
rm -f "$H/.cache/pkm-ai/delegates/stale-passport-ignored"*.json "$H/.cache/claude-delegate/"* "$CALLS"
jq -n '{attemptId:"stale-no-pane",provider:"openrouter",model:"direct",workdir:"stale",state:"running"}' > "$H/.cache/pkm-ai/delegates/stale.json"
jq -n '{attemptId:"stale-no-pane-2",provider:"openrouter",model:"direct",workdir:"stale2",state:"running"}' > "$H/.cache/pkm-ai/delegates/stale2.json"
: > "$SUITE/evidence/panes"
assert_rc 0 "$H/bin/lane" run stale-only "$SUITE/work/c" "$SUITE/prompt.md" --pool openrouter
# A dead reservation with a reused lane name but another provider cannot hide
# a live direct passport from the canonical provider census.
rm -f "$H/.cache/pkm-ai/delegates/"*.json "$H/.cache/claude-delegate/"*
for i in 1 2; do jq -n --arg i "$i" '{attemptId:("direct"+$i),provider:"openrouter",model:"direct",workdir:("direct"+$i),tmuxPane:("%9"+$i),state:"running"}' > "$H/.cache/pkm-ai/delegates/direct$i.json"; done
jq -n '{attemptId:"shared-attempt",name:"shared-name",provider:"openrouter",model:"direct",workdir:"shared",tmuxPane:"%93",state:"running"}' > "$H/.cache/pkm-ai/delegates/shared.json"
printf '%s\n' '%91|direct1' '%92|direct2' '%93|shared-attempt' > "$SUITE/evidence/panes"
printf 'zen|99999999||%s\n' "$SUITE/work/a" > "$H/.cache/claude-delegate/shared-name.reservation"
assert_rc 3 "$H/bin/lane" run stale-reservation-dedup "$SUITE/work/c" "$SUITE/prompt.md" --pool openrouter
rm -f "$H/.cache/pkm-ai/delegates/shared.json" "$H/.cache/claude-delegate/shared-name.reservation"
printf '%s\n' '%91|direct1' '%92|direct2' > "$SUITE/evidence/panes"
printf 'zen|%s||%s\n' "$$" "$SUITE/work/c" > "$H/.cache/claude-delegate/switcher.reservation"
assert_rc 70 "$H/bin/lane" admission-switch switcher oc openrouter/mock-cap-a:free
rm -f "$H/.cache/pkm-ai/delegates/direct2.json"
assert_rc 0 "$H/bin/lane" admission-switch switcher oc openrouter/mock-cap-a:free
grep -q '^openrouter|' "$H/.cache/claude-delegate/switcher.reservation" || fail 'fallback admission did not atomically switch upstream reservation'

# Fallback admission consults the provider overlay even when the route stays
# within one upstream provider; no CLI invocation may precede a denied gate.
cat > "$H/bin/pkmai-delegate" <<'MOCK'
#!/bin/sh
[ "${OVERLAY_DENY:-0}" = 0 ] && exit 0
exit 70
MOCK
chmod +x "$H/bin/pkmai-delegate"
cat > "$H/wt/lane-pools.conf" <<'CONF'
zen|oc|opencode/muse-spark-1.3-contributor-free|opencode/muse-spark-1.3-contributor-free
CONF
: > "$MODEL_CALLS"; : > "$GIT_CALLS"
printf 'zen|%s||%s\n' "$$" "$SUITE/work/a" > "$H/.cache/claude-delegate/denied.reservation"
OVERLAY_DENY=1 RUNNER=opencode OC_MODEL=opencode/muse-spark-1.3-contributor-free \
  OC_FALLBACK_MODEL=openrouter/mock-fb-denied:free LANE_ADMISSION_NAME=denied \
  OC_OUTPUT='quota exhausted' "$H/wt/oc-task.sh" denied "$SUITE/work/a" "$SUITE/prompt.md" >/dev/null 2>&1 && fail 'overlay denial did not propagate'
rc=$?; [ "$rc" = 70 ] || fail "overlay denial rc expected 70, got $rc"
[ "$(wc -l < "$MODEL_CALLS" | tr -d ' ')" = 1 ] || { cat "$MODEL_CALLS" >&2; cat "$GIT_CALLS" >&2; fail 'unavailable fallback provider was invoked'; }
cat > "$H/bin/pkmai-delegate" <<'MOCK'
#!/bin/sh
case "$1" in check|stop) exit 0;; *) exit 90;; esac
MOCK
chmod +x "$H/bin/pkmai-delegate"
rm -f "$H/.cache/claude-delegate/denied.reservation"

# Provider mapping errors retain rc 64 after primary quota output and do not
# get rewritten as the generic provider-exhaustion rc 70.
printf 'zen|%s||%s\n' "$$" "$SUITE/work/a" > "$H/.cache/claude-delegate/bad-fallback.reservation"
: > "$MODEL_CALLS"
RUNNER=opencode OC_MODEL=opencode/muse-spark-1.3-contributor-free \
  OC_FALLBACK_MODEL=unknown/model LANE_ADMISSION_NAME=bad-fallback \
  OC_OUTPUT='quota exhausted' "$H/wt/oc-task.sh" bad-fallback "$SUITE/work/a" "$SUITE/prompt.md" >/dev/null 2>&1 && fail 'malformed fallback mapping did not fail'
rc=$?; [ "$rc" = 64 ] || fail "malformed fallback rc expected 64, got $rc"
[ "$(wc -l < "$MODEL_CALLS" | tr -d ' ')" = 1 ] || fail 'malformed fallback invoked another model'
rm -f "$H/.cache/claude-delegate/bad-fallback.reservation"

# Concurrent attempts serialize reservations: exactly two of three are launched.
rm -f "$H/.cache/pkm-ai/delegates/"*.json "$H/.cache/claude-delegate/"* "$CALLS"
cat > "$H/wt/lane-pools.conf" <<'CONF'
zen|oc|opencode/muse-spark-1.3-contributor-free|
zen2|oc|opencode/muse-spark-1.3-contributor-free|
zen3|oc|opencode/muse-spark-1.3-contributor-free|
CONF
pids=()
for pair in 'c1 a' 'c2 b' 'c3 c'; do set -- $pair; "$H/bin/lane" run "$1" "$SUITE/work/$2" "$SUITE/prompt.md" --pool zen >"$SUITE/evidence/$1.out" 2>&1 & pids+=("$!"); done
for pid in "${pids[@]}"; do wait "$pid" || true; done
[ "$(wc -l < "$CALLS" | tr -d ' ')" = 2 ] || { cat "$CALLS"; cat "$SUITE/evidence/"c?.out; jq -c '.' "$H/.cache/pkm-ai/delegates/"*.json; find "$H/.cache" -maxdepth 3 -type f -print; fail 'atomic reservations did not limit concurrent admissions to two'; }

# Distinct provider aliases still cannot race into one shared worktree.
rm -f "$H/.cache/pkm-ai/delegates/"*.json "$H/.cache/claude-delegate/"* "$CALLS"
cat > "$H/wt/lane-pools.conf" <<'CONF'
zen|oc|opencode/muse-spark-1.3-contributor-free|
openrouter|oc|openrouter/mock-cap-a:free|
CONF
"$H/bin/lane" run same-a "$SUITE/work/a" "$SUITE/prompt.md" --pool zen >/dev/null 2>&1 & p1=$!
"$H/bin/lane" run same-b "$SUITE/work/a" "$SUITE/prompt.md" --pool openrouter >/dev/null 2>&1 & p2=$!
wait "$p1" || true; wait "$p2" || true
[ "$(wc -l < "$CALLS" | tr -d ' ')" = 1 ] || fail 'concurrent distinct-provider worktree exclusivity failed'

# Codex invocation keeps cwd, exact model, prompt, and failing exit status.
: > "$GIT_CALLS"; : > "$MODEL_CALLS"
CODEX_RC=23 RUNNER=codex CODEX_MODEL=gpt-6-luna "$H/wt/oc-task.sh" codex "$SUITE/work/a" "$SUITE/prompt.md" >/dev/null 2>&1 && fail 'Codex nonzero status was swallowed'
rc=$?; [ "$rc" = 23 ] || fail "Codex rc propagation expected 23, got $rc"
grep -F "codex cwd=$SUITE/work/a argv=exec -m gpt-6-luna --sandbox workspace-write --skip-git-repo-check mock prompt text" "$MODEL_CALLS" >/dev/null || fail 'Codex argv/cwd/prompt/sandbox mismatch'
: > "$MODEL_CALLS"
AGY_RC=19 RUNNER=agy AGY_MODEL=gemini-3.8-flash-high "$H/wt/oc-task.sh" agy "$SUITE/work/a" "$SUITE/prompt.md" >/dev/null 2>&1 && fail 'agy nonzero status was swallowed'
rc=$?; [ "$rc" = 19 ] || fail "agy rc propagation expected 19, got $rc"

# OpenCode quota exhaustion still advances every configured fallback and exits 70.
: > "$MODEL_CALLS"
OC_OUTPUT='quota exhausted' OC_RC=0 RUNNER=opencode \
  OC_MODEL=opencode/muse-spark-1.3-contributor-free \
  OC_FALLBACK_MODEL=openrouter/mock-fb-a:free,openrouter/mock-fb-b:free \
  "$H/wt/oc-task.sh" fallback "$SUITE/work/a" "$SUITE/prompt.md" >/dev/null 2>&1 && fail 'quota exhaustion did not return 70'
rc=$?; [ "$rc" = 70 ] || fail "fallback quota rc expected 70, got $rc"
[ "$(wc -l < "$MODEL_CALLS" | tr -d ' ')" = 3 ] || fail 'fallback chain did not invoke primary and both mock fallbacks'

# An explicitly empty fallback list disables fallback; it must not inherit the default chain.
: > "$MODEL_CALLS"
OC_OUTPUT='quota exhausted' OC_RC=0 RUNNER=opencode \
  OC_MODEL=opencode/muse-spark-1.3-contributor-free OC_FALLBACK_MODEL= \
  "$H/wt/oc-task.sh" empty-fallback "$SUITE/work/a" "$SUITE/prompt.md" >/dev/null 2>&1 && fail 'quota exhaustion did not return 70 with empty fallback'
rc=$?; [ "$rc" = 70 ] || fail "empty fallback primary rc expected 70, got $rc"
[ "$(wc -l < "$MODEL_CALLS" | tr -d ' ')" = 1 ] || fail 'empty fallback unexpectedly invoked a default model'

# An unset fallback list also means zero extra attempts (policy 2026-10-04:
# no implicit Ultra/Ling default chain may be inherited).
: > "$MODEL_CALLS"
OC_OUTPUT='quota exhausted' OC_RC=0 RUNNER=opencode \
  OC_MODEL=opencode/muse-spark-1.3-contributor-free \
  env -u OC_FALLBACK_MODEL "$H/wt/oc-task.sh" unset-fallback "$SUITE/work/a" "$SUITE/prompt.md" >/dev/null 2>&1 && fail 'quota exhaustion did not return 70 with unset fallback'
rc=$?; [ "$rc" = 70 ] || fail "unset fallback primary rc expected 70, got $rc"
[ "$(wc -l < "$MODEL_CALLS" | tr -d ' ')" = 1 ] || fail 'unset fallback unexpectedly invoked a default model'

# Vault allocation is released on a failing Codex exit through the preserved trap.
: > "$SUITE/evidence/vault.calls"
CODEX_RC=23 RUNNER=codex OC_VAULT_LANE=mock-lane \
  "$H/wt/oc-task.sh" vault "$SUITE/work/a" "$SUITE/prompt.md" >/dev/null 2>&1 || true
grep -F 'mock-lane --release' "$SUITE/evidence/vault.calls" >/dev/null || fail 'vault release trap did not run'

# Direct override validation occurs before git/model runtime invocation.
: > "$GIT_CALLS"; : > "$MODEL_CALLS"
: > "$GIT_CALLS"; : > "$MODEL_CALLS"
assert_rc 64 env RUNNER=unknown "$H/wt/oc-task.sh" bad-runtime "$SUITE/work/a" "$SUITE/prompt.md"
[ ! -s "$GIT_CALLS" ] && [ ! -s "$MODEL_CALLS" ] || fail 'invalid runtime override started a CLI'
for assignment in 'OC_MODEL=openrouter/laguna-direct' 'AGY_MODEL=nemotron_3_5_lightning' \
  'CODEX_MODEL=GPT5.6Luna' 'OC_FALLBACK_MODEL=openrouter/mini-max/m3:free' \
  'OC_MODEL=opencode/nemotron-3-ultra-free' 'OC_MODEL=openrouter/nvidia/nemotron-3-ultra-550b-a55b:free' \
  'OC_MODEL=openrouter/inclusionai/ling-3.0-flash-fin:free' 'OC_MODEL=openrouter/inclusionai/ling-3.0-flash-sante:free' \
  'OC_FALLBACK_MODEL=opencode/nemotron-3-ultra-free' 'OC_FALLBACK_MODEL=openrouter/inclusionai/ling-3.0-flash-fin:free' \
  'AGY_MODEL=nemotron-3-ultra-free' 'CODEX_MODEL=openrouter/inclusionai/ling-3.0-flash-fin:free'; do
  : > "$GIT_CALLS"; : > "$MODEL_CALLS"
  assert_rc 64 env "$assignment" "$H/wt/oc-task.sh" reject "$SUITE/work/a" "$SUITE/prompt.md"
[ ! -s "$GIT_CALLS" ] && [ ! -s "$MODEL_CALLS" ] || fail "forbidden override started a CLI: $assignment"
done

# A completed attempt's stale reservation is pruned; a live retry on that
# worktree remains exclusive through its canonical passport/pane identity.
rm -f "$H/.cache/pkm-ai/delegates/"*.json "$H/.cache/claude-delegate/"* "$CALLS"
cat > "$H/wt/lane-pools.conf" <<'CONF'
zen|oc|opencode/muse-spark-1.3-contributor-free|
CONF
printf 'zen|99999999||%s\n' "$SUITE/work/a" > "$H/.cache/claude-delegate/finished.reservation"
assert_rc 0 "$H/bin/lane" run retry-finished "$SUITE/work/a" "$SUITE/prompt.md" --pool zen
[ ! -e "$H/.cache/claude-delegate/finished.reservation" ] || fail 'dead reservation was not pruned'
assert_rc 3 "$H/bin/lane" run retry-live "$SUITE/work/a" "$SUITE/prompt.md" --pool zen

# Snapshot reaping is disabled: an old sentinel remains byte-identical.
printf 'do not reap\n' > "$TMPDIR/lane-sentinel.sh"; chmod 400 "$TMPDIR/lane-sentinel.sh"
touch -d '2 days ago' "$TMPDIR/lane-sentinel.sh"
CODEX_RC=0 RUNNER=codex "$H/wt/lane-run.sh" snap "$SUITE/work/a" "$SUITE/prompt.md" >/dev/null 2>&1
[ "$(cat "$TMPDIR/lane-sentinel.sh")" = 'do not reap' ] || fail 'lane-run removed an existing snapshot'
shopt -s nullglob
snapshots=("$TMPDIR"/lane-snap-*.sh)
[ "${#snapshots[@]}" -gt 0 ] || fail 'immutable lane snapshot was not retained'

! grep -q 'worktree add' "$GIT_CALLS" 2>/dev/null || fail 'regression suite created a worktree'
echo 'lane-pool-regression: PASS (all model CLIs mocked; no provider calls or worktrees)'
