# Serveurs MCP du projet

## UNS_MCP (Unstructured)

Serveur MCP pour l'API Unstructured : partition de documents (PDF, Word, etc.), workflows, connecteurs.

### Prérequis

- **uv** : `curl -LsSf https://astral.sh/uv/install.sh | sh`
- Clé API Unstructured : [platform.unstructured.io](https://platform.unstructured.io)

### Configuration

1. Copier le template : `cp .cursor/mcp.json.example .cursor/mcp.json`
2. Remplacer `ta-cle-api-unstructured` par ta clé API (ou `UNS_API_KEY` de ton `.env`)
3. Redémarrer Cursor

### Structure

- `uns-mcp/pyproject.toml` : wrapper avec `unstructured-client` piné (fix VLMModel)
- `scripts/run_uns_mcp.sh` : script de lancement (garantit le bon répertoire de travail)

### Note

Le chemin `scripts/run_uns_mcp.sh` dans la config est relatif au projet. Ouvre le projet depuis sa racine dans Cursor pour que ça fonctionne.
