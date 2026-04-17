#!/usr/bin/env sh
# Crée / met à jour les tables Drizzle (Next.js) dans la base pointée par DATABASE_URL.
# Prérequis : fichier .env à la racine avec DATABASE_URL (drizzle.config.ts charge .env).
#
# Usage (depuis la racine du repo) :
#   chmod +x scripts/setup-database.sh
#   ./scripts/setup-database.sh
#
# Équivalent npm/pnpm :
#   pnpm setup:db

set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm est requis (ou lance manuellement : npx drizzle-kit push avec DATABASE_URL)."
  exit 1
fi

pnpm exec drizzle-kit push

echo ""
echo "OK — schéma Drizzle appliqué (users, sessions, assistant_conversations, …)."
echo "Pour les tables du checkpointer LangGraph (agent Python), démarre l’API FastAPI"
echo "une fois : elles sont créées au démarrage (setup du saver Postgres)."
