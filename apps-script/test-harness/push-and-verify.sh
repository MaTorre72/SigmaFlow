#!/usr/bin/env bash
# Combina i due passi che CLAUDE.md richiede prima di ogni consegna sul
# progetto TEST: push + verifica isolata (clasp pull + diff). Fallisce
# (exit non-zero) se il push non risulta identico ai sorgenti locali.
#
# Uso: bash apps-script/test-harness/push-and-verify.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

( cd "$REPO_ROOT/apps-script" && clasp push --force )
bash "$REPO_ROOT/apps-script/test-harness/verify-test-push.sh"
