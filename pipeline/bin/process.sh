#!/bin/bash
# DSCG pipeline: turns a law course dropped in Google Drive into a fiche (PDF, next to the course)
# and a deck of cards published in the app. When the teacher's documents arrive later in a chapter
# that already has its fiche, the fiche is completed and new cards are appended (existing cards
# never change). Run by the folder watcher (see README.md); safe to run by hand, one run at a time.
#
#   pipeline/bin/process.sh                  process what is pending
#   DSCG_SETTLE=0 pipeline/bin/process.sh    same, without waiting for Drive to settle
#   Tests: DSCG_DRIVE, DSCG_STATE and DSCG_CLAUDE replace the Drive folder, the state folder and
#   the Claude binary; DSCG_NO_PUSH=1 commits without pushing and shows no notification.
#
# Note: replace this file with `mv` (new inode), never edit it in place while a run is going on.

set -uo pipefail

PIPE="$(cd "$(dirname "$0")/.." && pwd)"
REPO="$(dirname "$PIPE")"
STATE="${DSCG_STATE:-$HOME/Library/Application Support/dscg-pipeline}"
mkdir -p "$STATE/logs" "$STATE/work" "$STATE/failed" "$STATE/chapters"
exec >>"$STATE/logs/$(date +%Y-%m).log" 2>&1
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
renice -n 15 -p $$ >/dev/null 2>&1 || true

log() { echo "[$(date '+%F %T')] $*"; }
notify() { [ -n "${DSCG_NO_PUSH:-}" ] && return; osascript -e "display notification \"${2//\"/\'}\" with title \"DSCG Cartes\" subtitle \"${1//\"/\'}\"" >/dev/null 2>&1 || true; }

# One run at a time. A stale lock (older than 4 h) is from a crashed run.
LOCK="$STATE/lock"
if ! mkdir "$LOCK" 2>/dev/null; then
  if [ -n "$(find "$LOCK" -maxdepth 0 -mmin +240 2>/dev/null)" ]; then rmdir "$LOCK" && mkdir "$LOCK"; else exit 0; fi
fi
trap 'rmdir "$LOCK" 2>/dev/null' EXIT

# Let Google Drive finish downloading what was just dropped.
sleep "${DSCG_SETTLE:-60}"

DRIVE="${DSCG_DRIVE:-}"
[ -z "$DRIVE" ] && DRIVE="$(ls -d "$HOME"/Library/CloudStorage/GoogleDrive-*/"Mon Drive"/DSCG "$HOME"/Library/CloudStorage/GoogleDrive-*/"My Drive"/DSCG 2>/dev/null | head -1 || true)"
if [ -z "$DRIVE" ]; then log "Dossier DSCG introuvable dans Google Drive"; exit 0; fi

# Newest Claude Code binary: standalone install first, else the one shipped with the VS Code extension.
find_claude() {
  if [ -x "$HOME/.local/bin/claude" ]; then echo "$HOME/.local/bin/claude"; return; fi
  ls -d "$HOME"/.vscode/extensions/anthropic.claude-code-*/resources/native-binary/claude 2>/dev/null | sort -V | tail -1
}
CLAUDE="${DSCG_CLAUDE:-$(find_claude)}"
if [ -z "$CLAUDE" ]; then log "Claude Code introuvable"; notify "Fiche non générée" "Claude Code est introuvable sur le Mac."; exit 1; fi
CHECK="node $PIPE/tools/check-cards.mjs"
TOOLS="Read,Write,Edit,Glob,Grep,WebSearch,WebFetch,Bash($CHECK:*)"

# UE folders handled automatically: "<Drive folder>|<UE code>".
UES=("UE 1 - droit|UE1")

chapter_number() { echo "$1" | sed -nE 's/.*[Cc]hap(itre)?[ ._-]*0*([0-9]+).*/\2/p' | head -1; }
is_fiche() { case "$(basename "$1")" in "Fiche - Chapitre"*) return 0 ;; *) return 1 ;; esac; }
deck_of() { printf '%s-ch%02d' "$(echo "$1" | tr 'A-Z' 'a-z')" "$2"; }
# "size<TAB>name" for each input PDF: what a chapter was built from.
manifest() { for f in "$@"; do printf '%s\t%s\n' "$(stat -f %z "$f")" "$(basename "$f")"; done | sort; }
signature() { manifest "$@" | shasum | cut -c1-12; }
json_get() { node -e 'const v = require(process.argv[1])[process.argv[2]]; console.log(v ?? "")' "$1" "$2"; }
# Runs a command with a time limit (no `timeout` on macOS).
with_timeout() { perl -e 'alarm shift; exec @ARGV' "$@"; }
# Fills {KEY} placeholders of a prompt file from P_KEY environment variables.
fill() { node -e 'let t = require("fs").readFileSync(process.argv[1], "utf8");
  t = t.replace(/\{([A-Z]+)\}/g, (m, k) => process.env["P_" + k] ?? m); process.stdout.write(t);' "$1"; }

# Copies the text of every PDF into $work/entrees. Sets LIST (names), MAIN (the course), CHARS.
extract_inputs() {
  local work="$1"; shift
  LIST=""; MAIN=""; CHARS=0
  for pdf in "$@"; do
    local name; name="$(basename "$pdf" .pdf)"
    "$PIPE/.build/pdftext" "$pdf" > "$work/entrees/$name.txt" || { log "Lecture impossible : $pdf"; continue; }
    CHARS=$((CHARS + $(wc -c < "$work/entrees/$name.txt")))
    LIST="$LIST, entrees/$name.txt"
    case "$name" in *[Cc]ours*) MAIN="entrees/$name.txt" ;; esac
  done
  LIST="${LIST#, }"
  [ -z "$MAIN" ] && MAIN="${LIST%%,*}"
}

new_work() {
  local work; work="$STATE/work/$(date +%Y%m%d-%H%M%S)-$1"
  mkdir -p "$work/entrees" "$work/modele"
  cp "$PIPE/CONVENTIONS.md" "$work/"
  cp "$PIPE/modele/"* "$work/modele/"
  echo "$work"
}

run_claude() {
  local work="$1" prompt="$2" limit="$3"; shift 3
  log "Claude : $CLAUDE"
  (cd "$work" && with_timeout "$limit" nice -n 15 "$CLAUDE" -p "$prompt" "$@" --permission-mode acceptEdits --allowedTools "$TOOLS" --output-format text >> claude.log 2>&1)
  log "Claude a terminé (code $?)"
}

# Checks the cards, with one correction round. Extra args go to check-cards (e.g. --extends file).
check_cards() {
  local work="$1" deck="$2"; shift 2
  (cd "$work" && $CHECK cartes.json "$deck" "$@" > check.log 2>&1) && return 0
  log "Cartes invalides, correction demandée"
  run_claude "$work" "Le contrôle des cartes a échoué :
$(cat "$work/check.log")
Corrige cartes.json (et meta.json si besoin) jusqu'à ce que « $CHECK cartes.json $deck $* » ne signale plus d'erreur. Ne touche pas aux autres fichiers." 3600 --continue
  (cd "$work" && $CHECK cartes.json "$deck" "$@" > check.log 2>&1)
}

fail() {
  local key="$1" sig="$2" title="$3" text="$4"
  log "Échec : $text"
  echo "$sig" > "$STATE/failed/$key"
  notify "$title" "$text"
}

# Remembers what a chapter was built from, so later documents trigger an update.
save_chapter() {
  local key="$1" folder="$2" deck="$3" cardfile="$4" pdfname="$5" html="$6"; shift 6
  local dir="$STATE/chapters/$key"; mkdir -p "$dir"
  manifest "$@" > "$dir/manifest.tsv"
  [ -n "$html" ] && cp "$html" "$dir/fiche.html"
  printf 'folder=%s\ndeck=%s\ncardfile=%s\npdfname=%s\n' "$folder" "$deck" "$cardfile" "$pdfname" > "$dir/info"
}

publish_cards() {
  local cardfile="$1" message="$2"
  (cd "$REPO" && npm run -s validate:cards && git add "$cardfile" && git commit -q -m "$message" -- "$cardfile" \
    && { [ -n "${DSCG_NO_PUSH:-}" ] || { git pull -q --rebase --autostash && git push -q; }; })
}

process_new() {
  local ue_dir="$1" ue="$2" folder="$3" num="$4"; shift 4
  local pdfs=("$@")
  local key; key="$(echo "$ue-$(basename "$folder")" | tr ' /' '__')"
  local sig; sig="$(signature "${pdfs[@]}")"
  if [ -f "$STATE/failed/$key" ] && [ "$(cat "$STATE/failed/$key")" = "$sig" ]; then return; fi

  local work; work="$(new_work "$key")"
  log "Nouvelle fiche : $(basename "$folder") ($ue) dans $work"
  extract_inputs "$work" "${pdfs[@]}"
  if [ "$CHARS" -lt 3000 ]; then fail "$key" "$sig" "Fiche non générée" "$(basename "$folder") : le PDF ne contient pas de texte lisible (scan ?)."; return; fi

  local deck=""; [ -n "$num" ] && deck="$(deck_of "$ue" "$num")"
  local prompt
  prompt="$(P_UE="$ue" P_NUM="${num:-à déduire du cours}" P_DECK="${deck:-<ue>-chNN, NN = numéro du chapitre sur deux chiffres>}" \
    P_FILES="$LIST" P_MAIN="$MAIN" P_KNOWN="$(cd "$REPO/cards" && ls *.json | sed 's/\.json$//' | tr '\n' ' ')" P_CHECK="$CHECK" \
    fill "$PIPE/PROMPT.md")"
  run_claude "$work" "$prompt" 10800

  if [ ! -s "$work/fiche.html" ] || [ ! -s "$work/cartes.json" ] || [ ! -s "$work/meta.json" ]; then
    fail "$key" "$sig" "Fiche non générée" "$(basename "$folder") : livrables incomplets. Journal : $work"; return
  fi
  local titre slug
  titre="$(json_get "$work/meta.json" titre | tr -d '/:')"
  slug="$(json_get "$work/meta.json" slug | tr -cd 'a-z0-9-')"
  [ -z "$num" ] && num="$(json_get "$work/meta.json" chapitre)"
  deck="$(deck_of "$ue" "$num")"
  if ls "$REPO/cards/$deck"-*.json >/dev/null 2>&1; then
    fail "$key" "$sig" "Fiche non générée" "Chapitre $num : ses cartes existent déjà dans l'app."; return
  fi
  if ! check_cards "$work" "$deck"; then
    fail "$key" "$sig" "Cartes refusées" "Chapitre $num : les cartes ne passent pas le contrôle. Journal : $work"; return
  fi
  grep -q "Ce qui change par rapport au cours" "$work/fiche.html" || log "Attention : synthèse de fin de fiche absente"

  # A course dropped loose in the UE folder gets its chapter folder.
  local dest="$folder"
  if [ "$folder" = "$ue_dir" ]; then
    dest="$(ls -d "$ue_dir"/*/ 2>/dev/null | while read -r d; do [ "$(chapter_number "$(basename "$d")")" = "$num" ] && echo "${d%/}"; done | head -1)"
    [ -z "$dest" ] && dest="$ue_dir/Chap $num - $titre" && mkdir -p "$dest"
    local moved=()
    for pdf in "${pdfs[@]}"; do mv "$pdf" "$dest/" && moved+=("$dest/$(basename "$pdf")"); done
    pdfs=("${moved[@]}")
    key="$(echo "$ue-$(basename "$dest")" | tr ' /' '__')"
  fi

  local pdfname="Fiche - Chapitre $num - $titre.pdf"
  if ! (cd "$PIPE" && node tools/fiche-pdf.cjs "$work/fiche.html" "$work/$pdfname" >> "$work/claude.log" 2>&1); then
    fail "$key" "$sig" "Fiche non générée" "Chapitre $num : le PDF n'a pas pu être créé. Journal : $work"; return
  fi
  cp "$work/$pdfname" "$dest/$pdfname"
  log "Fiche rangée : $dest/$pdfname"

  local cardfile="cards/$deck-$slug.json"
  node -e 'const fs=require("fs");fs.writeFileSync(process.argv[2], JSON.stringify(JSON.parse(fs.readFileSync(process.argv[1],"utf8")), null, 1)+"\n")' "$work/cartes.json" "$REPO/$cardfile"
  local count; count="$(node -e 'console.log(require(process.argv[1]).cards.length)' "$REPO/$cardfile")"
  save_chapter "$key" "$dest" "$deck" "$cardfile" "$pdfname" "$work/fiche.html" "${pdfs[@]}"
  rm -f "$STATE/failed/$key"
  if publish_cards "$cardfile" "Add $deck cards: $titre

Generated by the course pipeline from the chapter $num course."; then
    log "Cartes publiées : $cardfile ($count)"
    notify "Chapitre $num prêt" "Fiche rangée dans le Drive, $count cartes ajoutées à l'app."
  else
    log "Publication des cartes impossible"
    notify "Cartes non publiées" "Chapitre $num : la fiche est dans le Drive, mais les cartes n'ont pas pu être publiées. Journal : $work"
  fi
}

process_update() {
  local ue="$1" folder="$2" key="$3"; shift 3
  local pdfs=("$@")
  local dir="$STATE/chapters/$key"
  local sig; sig="$(signature "${pdfs[@]}")"
  if [ -f "$STATE/failed/$key" ] && [ "$(cat "$STATE/failed/$key")" = "$sig" ]; then return; fi
  # shellcheck disable=SC1091
  local deck cardfile pdfname; deck="$(sed -n 's/^deck=//p' "$dir/info")"; cardfile="$(sed -n 's/^cardfile=//p' "$dir/info")"; pdfname="$(sed -n 's/^pdfname=//p' "$dir/info")"
  if [ ! -s "$dir/fiche.html" ] || [ ! -s "$REPO/$cardfile" ]; then
    log "$(basename "$folder") : nouveaux documents, mais pas de source de fiche ou de cartes pour une mise à jour"
    save_chapter "$key" "$folder" "$deck" "$cardfile" "$pdfname" "" "${pdfs[@]}"
    notify "Mise à jour impossible" "$(basename "$folder") : nouveaux documents détectés, mais la fiche n'a pas été faite par le pipeline."
    return
  fi

  local new=() old=() name
  for pdf in "${pdfs[@]}"; do
    name="$(basename "$pdf")"
    if grep -qxF "$(printf '%s\t%s' "$(stat -f %z "$pdf")" "$name")" "$dir/manifest.tsv"; then old+=("$pdf"); else new+=("$pdf"); fi
  done
  local work; work="$(new_work "$key")"
  log "Mise à jour : $(basename "$folder") ($ue), nouveaux documents : ${new[*]##*/}"
  extract_inputs "$work" "${pdfs[@]}"
  cp "$dir/fiche.html" "$work/fiche-actuelle.html"
  cp "$REPO/$cardfile" "$work/cartes-actuelles.json"
  local num next newlist="" oldlist=""
  num="$(node -e 'console.log(require(process.argv[1]).deck.chapitre)' "$work/cartes-actuelles.json")"
  next="$(node -e 'const d=require(process.argv[1]); const m=Math.max(0,...d.cards.map(c=>+c.id.split("-").pop()||0)); console.log(d.deck.id+"-"+String(m+1).padStart(3,"0"))' "$work/cartes-actuelles.json")"
  for f in "${new[@]}"; do newlist="$newlist, entrees/$(basename "$f" .pdf).txt"; done
  for f in "${old[@]}"; do oldlist="$oldlist, entrees/$(basename "$f" .pdf).txt"; done
  local prompt
  prompt="$(P_UE="$ue" P_NUM="$num" P_DECK="$deck" P_NEW="${newlist#, }" P_OLD="${oldlist#, }" P_NEXT="$next" \
    P_DATE="$(date '+%-d/%m/%Y')" P_CHECK="$CHECK" fill "$PIPE/UPDATE_PROMPT.md")"
  run_claude "$work" "$prompt" 7200

  if [ ! -s "$work/fiche.html" ] || [ ! -s "$work/cartes.json" ]; then
    fail "$key" "$sig" "Mise à jour non faite" "Chapitre $num : livrables incomplets. Journal : $work"; return
  fi
  if ! check_cards "$work" "$deck" --extends cartes-actuelles.json; then
    fail "$key" "$sig" "Mise à jour refusée" "Chapitre $num : les nouvelles cartes ne passent pas le contrôle. Journal : $work"; return
  fi
  if ! (cd "$PIPE" && node tools/fiche-pdf.cjs "$work/fiche.html" "$work/$pdfname" >> "$work/claude.log" 2>&1); then
    fail "$key" "$sig" "Mise à jour non faite" "Chapitre $num : le PDF n'a pas pu être créé. Journal : $work"; return
  fi
  # Same file name: Google Drive keeps the previous fiche in the file's version history.
  cp "$work/$pdfname" "$folder/$pdfname"
  log "Fiche mise à jour : $folder/$pdfname"

  local before after
  before="$(node -e 'console.log(require(process.argv[1]).cards.length)' "$work/cartes-actuelles.json")"
  node -e 'const fs=require("fs");fs.writeFileSync(process.argv[2], JSON.stringify(JSON.parse(fs.readFileSync(process.argv[1],"utf8")), null, 1)+"\n")' "$work/cartes.json" "$REPO/$cardfile"
  after="$(node -e 'console.log(require(process.argv[1]).cards.length)' "$REPO/$cardfile")"
  save_chapter "$key" "$folder" "$deck" "$cardfile" "$pdfname" "$work/fiche.html" "${pdfs[@]}"
  rm -f "$STATE/failed/$key"
  if [ "$after" = "$before" ]; then
    notify "Chapitre $num mis à jour" "Fiche complétée avec les nouveaux documents (pas de nouvelle carte)."
  elif publish_cards "$cardfile" "Add $((after - before)) cards to $deck

Generated by the course pipeline from the teacher's new documents."; then
    log "Cartes ajoutées : $((after - before))"
    notify "Chapitre $num mis à jour" "Fiche complétée, $((after - before)) cartes ajoutées à l'app."
  else
    notify "Cartes non publiées" "Chapitre $num : la fiche est à jour, mais les nouvelles cartes n'ont pas pu être publiées. Journal : $work"
  fi
}

# Chapter with a fiche but no saved state (made before the pipeline, or by an older version):
# remember its current documents as the baseline, and find the fiche source if there is one.
adopt_chapter() {
  local ue="$1" folder="$2" key="$3" num="$4"; shift 4
  local deck cardfile pdfname html=""
  deck="$(deck_of "$ue" "$num")"
  cardfile="$(cd "$REPO" && ls cards/"$deck"-*.json 2>/dev/null | head -1)"
  pdfname="$(cd "$folder" && ls "Fiche - Chapitre"*.pdf 2>/dev/null | head -1)"
  html="$(ls -d "$STATE"/work/*-"$key"/fiche.html 2>/dev/null | sort | tail -1)"
  [ -z "$html" ] && [ -f "$PIPE/modele/fiche-modele-$deck.html" ] && html="$PIPE/modele/fiche-modele-$deck.html"
  save_chapter "$key" "$folder" "$deck" "$cardfile" "$pdfname" "$html" "$@"
  log "$(basename "$folder") : état enregistré (fiche ${html:+source trouvée}${html:-source introuvable})"
}

for entry in "${UES[@]}"; do
  ue_dir="$DRIVE/${entry%%|*}"; ue="${entry##*|}"
  [ -d "$ue_dir" ] || continue

  while IFS= read -r -d '' folder; do
    pdfs=(); has_fiche=0
    for f in "$folder"/*.pdf; do
      [ -e "$f" ] || continue
      if is_fiche "$f"; then has_fiche=1; else pdfs+=("$f"); fi
    done
    [ ${#pdfs[@]} -eq 0 ] && continue
    key="$(echo "$ue-$(basename "$folder")" | tr ' /' '__')"
    num="$(chapter_number "$(basename "$folder")")"
    [ -z "$num" ] && num="$(chapter_number "$(basename "${pdfs[0]}")")"

    if [ "$has_fiche" = 1 ]; then
      if [ ! -f "$STATE/chapters/$key/manifest.tsv" ]; then
        [ -n "$num" ] && adopt_chapter "$ue" "$folder" "$key" "$num" "${pdfs[@]}"
      elif [ "$(manifest "${pdfs[@]}")" != "$(cat "$STATE/chapters/$key/manifest.tsv")" ]; then
        process_update "$ue" "$folder" "$key" "${pdfs[@]}"
      fi
      continue
    fi
    if [ -n "$num" ] && ls "$REPO/cards/$(deck_of "$ue" "$num")"-*.json >/dev/null 2>&1; then
      log "$(basename "$folder") : pas de fiche, mais les cartes du chapitre $num existent déjà. Rien à faire automatiquement."
      continue
    fi
    process_new "$ue_dir" "$ue" "$folder" "$num" "${pdfs[@]}"
  done < <(find "$ue_dir" -mindepth 1 -maxdepth 1 -type d -print0)

  # A course dropped loose in the UE folder.
  for f in "$ue_dir"/*.pdf; do
    [ -e "$f" ] || continue
    process_new "$ue_dir" "$ue" "$ue_dir" "$(chapter_number "$(basename "$f")")" "$f"
  done
done

# Keep a month of working folders (chapter sources are saved separately).
find "$STATE/work" -mindepth 1 -maxdepth 1 -type d -mtime +30 -exec rm -rf {} + 2>/dev/null
exit 0
