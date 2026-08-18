#!/usr/bin/env bash
# Verifica che il codice pushato sul progetto Apps Script (TEST) corrisponda
# esattamente ai sorgenti locali: clasp pull isolato + diff, come richiesto
# da CLAUDE.md prima di ogni consegna. Usa sempre /tmp/sf-scratch/ (convenzione
# di progetto) e lo rimuove a fine verifica, in successo o fallimento.
#
# Uso: bash apps-script/test-harness/verify-test-push.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SRC_DIR="$REPO_ROOT/apps-script/src"
SCRATCH_DIR="/tmp/sf-scratch/clasp-verify"

cleanup() { rm -rf "$SCRATCH_DIR"; }
trap cleanup EXIT

rm -rf "$SCRATCH_DIR"
mkdir -p "$SCRATCH_DIR"
cp "$REPO_ROOT/apps-script/.clasp.json" "$SCRATCH_DIR/.clasp.json"

# rootDir "." invece di "src": il pull isolato scrive nella cartella scratch
# stessa, non dentro apps-script/src (non deve toccare i sorgenti locali).
# sed, non un one-liner Node: un processo Node nativo su Windows non
# traduce i path /tmp/... di Git Bash, sed (strumento MSYS) sì.
sed -i 's/"rootDir": "src"/"rootDir": "."/' "$SCRATCH_DIR/.clasp.json"

( cd "$SCRATCH_DIR" && clasp pull )

DIFF_FOUND=0
for f in ActivityLog Constants Kanban Model Schema Tests Utils; do
  if ! diff -q "$SCRATCH_DIR/$f.js" "$SRC_DIR/$f.gs" > /dev/null 2>&1; then
    echo "DIFFERENZA: $f"
    DIFF_FOUND=1
  fi
done
for f in appsscript.json board.html client.html dashboard.html index.html style.html; do
  if ! diff -q "$SCRATCH_DIR/$f" "$SRC_DIR/$f" > /dev/null 2>&1; then
    echo "DIFFERENZA: $f"
    DIFF_FOUND=1
  fi
done

if [ "$DIFF_FOUND" -eq 0 ]; then
  echo "OK: 13/13 file identici tra TEST e apps-script/src"
  exit 0
fi

echo "ATTENZIONE: differenze trovate tra TEST e apps-script/src"
exit 1
