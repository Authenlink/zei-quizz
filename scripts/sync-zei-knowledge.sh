#!/usr/bin/env bash
# Sync de la knowledge base ZEI vers le RAG runtime de l'agent (Phase 13 V2).
#
# Source : docs/zei-knowledge/<category>/*.md
# Cible  : agent/rag/documents/zei/<category>/*.md
#
# - Idempotent : rsync --delete aligne strictement la cible sur la source.
# - Cross-platform (rsync standard, pas de symlink).
# - N'embarque pas INDEX.md ni .tmp/ : seuls les .md des 4 sous-dossiers sont copiés.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="${ROOT}/docs/zei-knowledge"
DST="${ROOT}/agent/rag/documents/zei"

CATEGORIES=("csrd" "esg-collecte" "rse-performance" "zei-offre")

if ! command -v rsync >/dev/null 2>&1; then
  echo "Erreur : rsync est requis mais introuvable dans le PATH." >&2
  exit 1
fi

if [[ ! -d "${SRC}" ]]; then
  echo "Erreur : source introuvable -> ${SRC}" >&2
  exit 1
fi

mkdir -p "${DST}"

total=0
for cat in "${CATEGORIES[@]}"; do
  src_cat="${SRC}/${cat}"
  dst_cat="${DST}/${cat}"

  if [[ ! -d "${src_cat}" ]]; then
    echo "  [skip] ${cat} (source absente : ${src_cat})"
    continue
  fi

  mkdir -p "${dst_cat}"
  rsync -a --delete \
    --include='*.md' \
    --exclude='*' \
    "${src_cat}/" "${dst_cat}/"

  count=$(find "${dst_cat}" -maxdepth 1 -type f -name '*.md' | wc -l | tr -d ' ')
  total=$((total + count))
  echo "  ${cat}: ${count} fichier(s) -> ${dst_cat}"
done

echo ""
echo "Sync termine : ${total} fichier(s) .md dans ${DST}"
