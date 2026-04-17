# Guide projet — Template Agent IA LangChain

Ce document décrit ce que vous devez renseigner pour créer votre projet à partir de cette template.

---

## 1. Informations à définir

Remplissez les sections suivantes selon votre contexte métier.

### Nom du projet

Exemple : *Agent IA Service Client [VotrePlateforme]*

### Objectif principal

- Chat conversationnel simple ?
- Agent avec outils (query Database, RAG) ?
- Output structuré (JSON) ou message texte ?

### Utilisateurs cibles

Qui utilise l'agent ? (service client, investisseurs, support, etc.)

---

## 2. Cas d'usage

- [ ] Chat conversationnel simple
- [ ] Agent avec outils (query Database, RAG)
- [ ] Output structuré JSON (schéma défini à l'avance)
- [ ] Output message texte (comportement par défaut de la template)

---

## 3. Données et intégrations

### Sources de données

- **Base de données** : PostgreSQL — quelles tables ? (ex. `customers`, `properties`, `wallet_transactions`)
- **RAG** : base documentaire — quelles collections Qdrant ? (ex. `bricks_docs`, `bricks_helpdesk`)
- **API externe** : URL, authentification ?

### Catégories de données

Si output JSON structuré, listez les catégories (ex. `projects`, `referral`, `documents`, etc.) et créez `docs/API_DOCS/DATA_API_REFERENCE.md` avec le schéma.

---

## 4. Format de sortie API

### Message texte (template par défaut)

L'API retourne `{"message": "..."}`. Aucune modification nécessaire.

### JSON structuré

Si vous avez besoin d'un objet JSON avec des catégories prédéfinies :

1. Définir le schéma dans `app/models/schemas/agent_output.py`
2. Adapter les prompts (`main_prompt.py`, `prompt.py`) pour demander un JSON
3. Réactiver la validation dans `app/api/routes/agents.py` avec `AgentOutput.model_validate(parsed)`
4. Créer `docs/API_DOCS/DATA_API_REFERENCE.md` comme source de vérité

---

## 5. Préférences techniques

- **Provider LLM** : OpenAI (défaut) | Anthropic | Mistral | Google
- **Modèle** : gpt-4o (ou autre)
- **Streaming** : oui / non
- **Mémoire** : checkpointer activé pour les utilisateurs authentifiés (déjà configuré)

---

## 6. Glossaire / termes métier

| Terme | Définition |
|-------|------------|
| ... | À compléter selon votre domaine |

---

## 7. Documents de référence à créer

| Document | Usage |
|----------|-------|
| `docs/API_DOCS/DATA.md` | Liste des outils, paramètres, requêtes SQL (si output JSON) |
| `docs/API_DOCS/DATA_API_REFERENCE.md` | Schéma JSON complet par catégorie (si output JSON) |

---

## 8. Prochaines étapes

1. Renseigner ce fichier `PROJECT.md`
2. Adapter les tools dans `app/tools/` (ajouter, modifier, supprimer)
3. Adapter les prompts dans `app/agents/`
4. Mettre à jour le README avec les spécificités de votre projet
5. Créer les documents RAG dans `rag/documents/` et lancer les scripts d'ingestion
