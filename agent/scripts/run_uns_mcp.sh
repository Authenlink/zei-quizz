#!/usr/bin/env bash
# Lance le serveur MCP Unstructured depuis le projet.
# Utilisé par .cursor/mcp.json pour garantir que le cwd est correct.
cd "$(dirname "$0")/.."
exec uv run --directory mcp-servers/uns-mcp uns_mcp
