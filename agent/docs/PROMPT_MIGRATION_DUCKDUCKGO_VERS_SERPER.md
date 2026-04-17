# Prompt : Migration DuckDuckGo → Serper

> **Objectif** : Donner ce prompt à une session IA pour migrer le tool de recherche web de DuckDuckGo vers Serper, en respectant la documentation LangChain et les conventions du projet.

---

## Contexte

Le projet utilise actuellement **DuckDuckGo** pour la recherche web via `app/tools/utils/web_search_tool.py`. La clé API Serper est déjà configurée dans le fichier `.env` (variable `SERPER_API_KEY`).

Références à consulter :
- **Projet** : `docs/langchain_guide.md` — section 3.6 "Agent complet" (lignes ~1440-1470) décrit le pattern `web_search_tool` avec `StructuredTool`, schéma `SearchInput`, et recommande Tavily/Serper en production
- **Serper + LangChain** : https://python.langchain.com/docs/integrations/providers/google_serper — `GoogleSerperAPIWrapper` et tools `GoogleSerperRun` / `GoogleSerperResults` dans `langchain_community.tools.google_serper`
- **Serper API** : https://serper.dev — clé API via `SERPER_API_KEY` en variable d'environnement

---

## Tâche à réaliser

### 1. Modifier `app/tools/utils/web_search_tool.py`

- **Remplacer** l'implémentation DuckDuckGo par Serper via LangChain
- **Conserver** :
  - Le même pattern : `StructuredTool` (ou équivalent) exporté sous le nom `web_search_tool`
  - Un schéma d'entrée avec un champ `query` (comme `WebSearchInput`)
  - Une description claire pour le LLM : recherche web pour actualité, contexte marché, infos non couvertes par les outils projets
- **Utiliser** soit :
  - `GoogleSerperAPIWrapper` de `langchain_community.utilities.google_serper` avec une fonction wrapper qui formate les résultats de façon lisible (titre, extrait, lien) — comme l'actuel DuckDuckGo
  - soit le tool `GoogleSerperRun` de `langchain_community.tools.google_serper` si son format de sortie convient
- **Charger** `SERPER_API_KEY` depuis `os.environ` ou `app.core.config` (ajouter la variable dans config si nécessaire)
- **Paramètres Serper utiles** : `k` (nombre de résultats, ex. 5 pour rester cohérent avec l'actuel), `hl` (langue, ex. `"fr"` pour le français)

### 2. Mettre à jour la configuration

- **`app/core/config.py`** : ajouter `SERPER_API_KEY = os.getenv("SERPER_API_KEY")`
- **`.env.example`** : ajouter une ligne documentant la variable :
  ```
  # === Web search (Serper) ===
  # SERPER_API_KEY=...  # Obtenir sur https://serper.dev
  ```

### 3. Mettre à jour les dépendances

- **`requirements.txt`** : supprimer `duckduckgo-search>=6.0.0` (Serper est inclus dans `langchain-community`, pas de package additionnel requis)

### 4. Mettre à jour les prompts de l'agent

- **`app/agents/business/prompt.py`** : remplacer toutes les occurrences de `duckduckgo_search` par le **nom exact** du tool Serper (vérifier le `name` du tool après migration — probablement `google_serper` ou `serper_search` selon l'implémentation LangChain)

### 5. Vérifier les autres références

- **`app/tools/utils/__init__.py`** : pas de changement nécessaire si `web_search_tool` reste l'export
- **`app/agents/business/agent.py`** : pas de changement si l'import reste `from app.tools.utils.web_search_tool import web_search_tool`
- **`scripts/test_tools_quick.py`** : mettre à jour le commentaire qui mentionne "duckduckgo" pour indiquer Serper
- **`docs/PLAN_TEMPLATE_CLEANUP.md`** : si pertinent, mettre à jour la mention du web_search_tool

---

## Contraintes

- Ne pas casser l'interface publique : `web_search_tool` doit rester importable et utilisable comme avant
- Gérer les erreurs (API indisponible, clé manquante) de façon gracieuse — retourner un message explicite plutôt que de faire planter l'agent
- Si `SERPER_API_KEY` est vide ou absente, lever une erreur explicite au chargement du module ou au premier appel (pour faciliter le debug en dev)

---

## Validation

Après migration, vérifier que :
1. L'agent business peut toujours répondre à une question du type "Quelle est l'actualité du marché immobilier ?" en utilisant le tool de recherche web
2. Le script `scripts/test_tools_quick.py` fonctionne (ou l'adapter si nécessaire)
3. Aucune référence à DuckDuckGo ne reste dans le code (sauf éventuellement en commentaire de migration)

---

## Fichiers impactés (résumé)

| Fichier | Action |
|---------|--------|
| `app/tools/utils/web_search_tool.py` | Réécrire avec Serper |
| `app/core/config.py` | Ajouter `SERPER_API_KEY` |
| `.env.example` | Documenter `SERPER_API_KEY` |
| `requirements.txt` | Supprimer `duckduckgo-search` |
| `app/agents/business/prompt.py` | Remplacer `duckduckgo_search` par le nom du tool Serper |
| `scripts/test_tools_quick.py` | Mettre à jour les commentaires |
