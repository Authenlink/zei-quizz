# PLAN — Plateforme e-learning RSE / CSRD / ESG (ZEI Quizz)

## Vue d'ensemble

Application web de type e-learning gamifiée, construite sur la template Next.js existante (App Router, Drizzle ORM, NextAuth v5, shadcn/ui, Tailwind v4). Chaque utilisateur authentifié peut suivre des parcours de formation sur la RSE, la CSRD, l'ESG et les spécificités de ZEI, passer des quiz, et suivre sa progression sur un dashboard personnalisé.

---

## Architecture applicative

```
app/
├── (user)/
│   ├── layout.tsx                ← TocProvider + SidebarProvider + PortalSidebar + TocSidebar
│   ├── portal/                   ← tableau de bord utilisateur
│   │   └── page.tsx
│   ├── learn/                    ← parcours e-learning
│   │   ├── page.tsx              ← catalogue des thèmes
│   │   ├── achievements/         ← galerie des badges
│   │   │   └── page.tsx
│   │   └── [themeSlug]/          ← page thème (sous-thèmes)
│   │       ├── page.tsx
│   │       └── [subthemeSlug]/   ← page sous-thème (modules)
│   │           ├── page.tsx
│   │           └── [moduleSlug]/ ← module : cours + quiz
│   │               └── page.tsx
│   └── agent/                    ← assistant IA
│       └── page.tsx
├── (admin)/
│   ├── layout.tsx                ← TocProvider + SidebarProvider + InternalSidebar + TocSidebar
│   └── dashboard/
│       └── page.tsx
├── api/
│   ├── quiz/                     ← routes API quiz
│   │   ├── themes/route.ts
│   │   ├── themes/[slug]/route.ts
│   │   ├── modules/[id]/route.ts
│   │   └── submit/route.ts       ← enregistrer une tentative
│   ├── progress/
│   │   └── route.ts              ← lecture de la progression
│   └── achievements/
│       └── route.ts
```

---

## Sidebar gauche — Navigation ZEI Quizz

Le fichier `components/shell/portal-sidebar.tsx` est déjà mis à jour avec les items suivants :

| Item | URL | Type |
|---|---|---|
| Tableau de bord | `/portal` | lien simple |
| Formation | `/learn` | section collapsible |
| → RSE | `/learn/rse` | sous-item |
| → CSRD | `/learn/csrd` | sous-item |
| → ESG | `/learn/esg` | sous-item |
| → Obligations 2025-2026 | `/learn/obligations-2025-2026` | sous-item |
| → RSE & Marketing | `/learn/rse-marketing` | sous-item |
| → ZEI & RSE | `/learn/zei-rse` | sous-item |
| Mes badges | `/learn/achievements` | lien simple |
| Assistant IA | `/agent` | lien simple |
| Mon compte | `/portal/profile` | lien simple |

---

## Sidebar droite — Table des matières (ToC)

Le composant `components/shell/toc-sidebar.tsx` (basé sur le bloc `sidebar-14`) est déjà intégré dans les deux layouts. Il affiche dynamiquement les sections de la page courante.

### Comment l'utiliser dans une page

Chaque page de cours **doit** appeler `useSetToc()` avec la liste de ses sections. Les headings HTML doivent avoir des `id` correspondants.

```tsx
import { useSetToc } from "@/hooks/use-toc";

export default function MaPage() {
  useSetToc([
    { id: "intro",        title: "Introduction",     level: 1 },
    { id: "csrd-2025",    title: "CSRD en 2025",     level: 2 },
    { id: "obligations",  title: "Obligations",       level: 2 },
    { id: "quiz",         title: "Quiz",              level: 1 },
  ]);

  return (
    <article>
      <h2 id="intro">Introduction</h2>
      <h3 id="csrd-2025">CSRD en 2025</h3>
      <h3 id="obligations">Obligations</h3>
      <h2 id="quiz">Quiz</h2>
    </article>
  );
}
```

> Pages sans contenu structuré (dashboard, profil, badges…) : passer un tableau vide `[]` ou ne pas appeler `useSetToc` → la ToC affiche "Aucune section sur cette page."

### Structure attendue des sections par type de page

| Type de page | Sections ToC recommandées |
|---|---|
| Page thème (`/learn/rse`) | Un item par sous-thème |
| Page module (cours + quiz) | Un item par leçon + item "Quiz" |
| Page dashboard | Vide (ToC masquée) |
| Page badges | Vide (ToC masquée) |

---

## Schéma de base de données (Drizzle ORM)

### Hiérarchie du contenu

```
quiz_themes
  └── quiz_subthemes
        └── quiz_modules
              ├── quiz_lessons     (contenu cours / fiches réglementaires)
              └── quiz_questions
                    └── quiz_question_options
```

### Suivi utilisateur

```
users
  ├── user_module_progress         (statut + score par module)
  ├── user_quiz_attempts           (chaque tentative de quiz)
  │     └── user_question_answers  (réponse par question)
  └── user_achievements            (badges débloqués)
```

---

### Détail des tables

#### `quiz_themes`
| Colonne | Type | Description |
|---|---|---|
| id | serial PK | |
| slug | text unique | ex: `rse`, `csrd`, `esg`, `zei` |
| title | text | |
| description | text | |
| icon | text | nom icône Lucide |
| color | text | classe Tailwind couleur |
| order | integer | ordre d'affichage |
| isActive | boolean | |
| createdAt / updatedAt | timestamp | |

#### `quiz_subthemes`
| Colonne | Type | Description |
|---|---|---|
| id | serial PK | |
| themeId | FK → quiz_themes | |
| slug | text | |
| title | text | |
| description | text | |
| order | integer | |
| isActive | boolean | |

#### `quiz_modules`
| Colonne | Type | Description |
|---|---|---|
| id | serial PK | |
| subthemeId | FK → quiz_subthemes | |
| slug | text | |
| title | text | |
| description | text | |
| order | integer | |
| estimatedMinutes | integer | durée estimée |
| difficulty | text | `debutant` / `intermediaire` / `avance` |
| isActive | boolean | |

#### `quiz_lessons`
| Colonne | Type | Description |
|---|---|---|
| id | serial PK | |
| moduleId | FK → quiz_modules | |
| title | text | |
| content | jsonb | contenu riche (MDX structuré) |
| type | text | `lesson` / `regulatory_update` / `case_study` / `zei_spotlight` |
| applicableYear | integer | ex: 2025, 2026 |
| companySize | text | `all` / `large` / `sme` |
| order | integer | |

#### `quiz_questions`
| Colonne | Type | Description |
|---|---|---|
| id | serial PK | |
| moduleId | FK → quiz_modules | |
| lessonId | FK → quiz_lessons nullable | |
| question | text | |
| type | text | `mcq` / `true_false` / `ordering` |
| explanation | text | explication après réponse |
| difficulty | text | |
| points | integer | points attribués |
| order | integer | |

#### `quiz_question_options`
| Colonne | Type | Description |
|---|---|---|
| id | serial PK | |
| questionId | FK → quiz_questions | |
| text | text | |
| isCorrect | boolean | |
| order | integer | |

#### `user_module_progress`
| Colonne | Type | Description |
|---|---|---|
| id | serial PK | |
| userId | FK → users | |
| moduleId | FK → quiz_modules | |
| status | text | `not_started` / `in_progress` / `completed` |
| bestScore | integer | meilleur score (0-100) |
| attempts | integer | nombre de tentatives |
| completedAt | timestamp nullable | |
| unique | (userId, moduleId) | |

#### `user_quiz_attempts`
| Colonne | Type | Description |
|---|---|---|
| id | serial PK | |
| userId | FK → users | |
| moduleId | FK → quiz_modules | |
| score | integer | score obtenu (0-100) |
| totalQuestions | integer | |
| correctAnswers | integer | |
| timeTakenSeconds | integer | |
| completedAt | timestamp | |

#### `user_question_answers`
| Colonne | Type | Description |
|---|---|---|
| id | serial PK | |
| attemptId | FK → user_quiz_attempts | |
| questionId | FK → quiz_questions | |
| selectedOptionId | FK → quiz_question_options nullable | |
| isCorrect | boolean | |

#### `user_achievements`
| Colonne | Type | Description |
|---|---|---|
| id | serial PK | |
| userId | FK → users | |
| achievementType | text | ex: `first_quiz`, `theme_rse_complete`, `perfect_score` |
| earnedAt | timestamp | |
| metadata | jsonb | données contextuelles |

---

## Thématiques et sous-thématiques

### Thème 1 — RSE (Responsabilité Sociétale des Entreprises)
- Définitions et fondamentaux
- Les 3 piliers RSE (Environnement, Social, Gouvernance)
- Normes et standards (ISO 26000, GRI, SASB)
- RSE en France : contexte réglementaire
- RSE comme avantage concurrentiel
- ZEI et la RSE (cas pratiques, actions menées)

### Thème 2 — CSRD (Corporate Sustainability Reporting Directive)
- Qu'est-ce que la CSRD ?
- Calendrier d'application (2024 / 2025 / 2026 / 2027)
- Entreprises concernées par taille et secteur
- ESRS (European Sustainability Reporting Standards)
- Double matérialité
- Obligations de reporting : ce que les entreprises doivent publier
- Sanctions et risques de non-conformité
- Opportunités offertes par la CSRD

### Thème 3 — ESG (Environnemental, Social, Gouvernance)
- Pilier E : Bilan carbone, biodiversité, ressources
- Pilier S : Bien-être au travail, diversité, droits humains
- Pilier G : Transparence, éthique, anti-corruption
- Notation ESG : acteurs et méthodologies
- ESG pour les PME vs grandes entreprises
- Investissement durable et ESG

### Thème 4 — Obligations réglementaires entreprises (2025-2026)
- Loi PACTE et entreprise à mission
- DPEF (Déclaration de Performance Extra-Financière)
- Taxonomie européenne (activités durables)
- Plan de vigilance
- Bilan GES obligatoire
- Nouvelles obligations 2025 vs 2026
- Secteurs prioritaires

### Thème 5 — RSE comme atout marketing
- Communication RSE authentique vs greenwashing
- Labels et certifications (B Corp, ISO 14001, etc.)
- RSE et fidélisation client
- RSE et attractivité des talents
- RSE dans les appels d'offres publics
- Storytelling RSE : exemples réussis

### Thème 6 — ZEI : La RSE appliquée
- Mission et valeurs de ZEI
- Actions RSE concrètes de ZEI
- ZEI et l'intérim responsable
- Impact social de ZEI
- Études de cas clients ZEI
- Témoignages et résultats mesurés

---

## Calcul de la progression

- **Progression par module** : `completedLessons / totalLessons × 100` + quiz passé (oui/non)
- **Progression par sous-thème** : moyenne des progressions de ses modules
- **Progression par thème** : moyenne des progressions de ses sous-thèmes
- **Progression globale** : moyenne pondérée de tous les thèmes

---

## Système de gamification

### Badges (achievements)

Catalogue applicatif (`ACHIEVEMENT_CATALOG` dans `lib/achievements/catalog.ts`, **11** entrées) : une ligne par `achievementType` persisté.

| Clé (`achievementType`) | Badge (libellé) | Condition |
|---|---|---|
| `first_quiz` | Premier pas | Au moins un module au statut complété |
| `theme_rse_complete` | Expert RSE | Tous les modules actifs du thème `rse` |
| `theme_csrd_complete` | Expert CSRD | Tous les modules actifs du thème `csrd` |
| `theme_esg_complete` | Expert ESG | Tous les modules actifs du thème `esg` |
| `theme_obligations-2025-2026_complete` | Expert Obligations | Tous les modules du thème obligations 2025-2026 |
| `theme_rse-marketing_complete` | Expert RSE & Marketing | Tous les modules du thème RSE & Marketing |
| `theme_zei-rse_complete` | Expert ZEI & RSE | Tous les modules du thème ZEI & RSE |
| `zei_ambassador` | ZEI Ambassador | Thème `zei-rse` entièrement complété (en plus du badge expert thème) |
| `perfect_score` | Score parfait | 100 % à un quiz (métadonnée `moduleId`) |
| `assidu` | Assidu | 5 modules complétés |
| `platform_complete` | Plateforme complète | Tous les modules de **tous** les thèmes actifs complétés |

La logique d’attribution est centralisée dans `lib/achievements/award.ts` (`checkAndAwardAchievements`), appelée après mise à jour de la progression depuis `POST /api/quiz/submit`.

### Points et niveaux
- Chaque question correcte = points selon la difficulté
- Niveaux : Novice → Initié → Praticien → Expert → Ambassadeur RSE

---

## Dashboard utilisateur (`/learn/dashboard`)

### Sections
1. **Vue globale** : anneau de progression global (Recharts / shadcn Charts)
2. **Par thème** : barres de progression horizontales avec badges
3. **Activité récente** : derniers modules tentés, scores
4. **Badges obtenus** : galerie des achievements
5. **Statistiques** : temps total passé, questions répondues, taux de réussite moyen
6. **Prochaine étape** : module recommandé selon la progression

---

## Composants UI à créer

| Composant | Rôle |
|---|---|
| `ThemeCard` | Carte thème avec progression |
| `ModuleCard` | Carte module avec statut et difficulté |
| `LessonContent` | Affichage contenu MDX riche |
| `RegulatoryBadge` | Indicateur année réglementaire (2025/2026) |
| `QuizQuestion` | Affichage question + options |
| `QuizProgress` | Barre de progression pendant le quiz |
| `QuizResults` | Résumé après quiz (score, explication) |
| `ProgressRing` | Anneau SVG de progression (global) |
| `AchievementCard` | Badge avec description |
| `DifficultyBadge` | Indicateur débutant/intermédiaire/avancé |
| `YearTag` | Tag `2025` / `2026` pour les fiches réglementaires |

---

## Routes API à créer

| Méthode | Route | Rôle |
|---|---|---|
| GET | `/api/quiz/themes` | Liste tous les thèmes actifs |
| GET | `/api/quiz/themes/[slug]` | Thème + sous-thèmes |
| GET | `/api/quiz/modules/[id]` | Module + leçons + questions |
| POST | `/api/quiz/submit` | Soumettre les réponses d'un quiz |
| GET | `/api/progress` | Progression complète de l'utilisateur |
| GET | `/api/progress/[moduleId]` | Progression sur un module |
| GET | `/api/achievements` | Badges de l'utilisateur |

---

## V2 — Knowledge Base ZEI & RAG

À partir de la V2, tous les quizzs et l'assistant IA `/agent` sont alimentés par la documentation officielle de ZEI (PDFs livres blancs + Google Slides). La V1 (sources web publiques) reste la base, mais chaque module est enrichi de callouts "Vu par ZEI" + sources URL publiques.

### Architecture de la Knowledge Base

```
docs/
├── *.pdf                           ← sources brutes ZEI (inchangées)
└── zei-knowledge/                  ← V2 — source de vérité Markdown
    ├── INDEX.md                    ← récap pour Cursor (mapping doc → thème/module)
    ├── csrd/
    │   ├── en-bref-5-csrd.md
    │   └── vsme-langage-commun.md
    ├── esg-collecte/
    │   ├── guide-collecte-esg.md
    │   └── checklist-collecte-esg.md
    ├── rse-performance/
    │   └── rse-2025-performance.md
    └── zei-offre/
        ├── plaquette-synthetique-2026.md
        └── proposition-portalp.md

agent/rag/documents/
└── zei/                            ← copie/symlink de docs/zei-knowledge/<cat>/*.md
    └── (mêmes sous-dossiers, ingérés par scripts/ingest_knowledge.py)
```

### Format frontmatter Markdown

Chaque `.md` ZEI commence par un frontmatter YAML qui sert à la fois à Cursor (lors du reseed) et à l'agent runtime (metadata Qdrant).

```yaml
---
title: "En Bref 5 — CSRD : ce que vous devez comprendre"
source_pdf: "docs/En Bref 5 - CSRD ... Zei.pdf"
source_url: "https://4495458.fs1.hubspotusercontent-na1.net/hubfs/4495458/En%20bref/..."
category: csrd
theme_slugs: [csrd]
applicable_year: 2025
audience: ["dirigeant", "rse-manager"]
priority: high
---
```

Le contenu utilise `#` / `##` / `###` pour profiter du chunking sémantique du pipeline RAG (`MarkdownHeaderTextSplitter`).

### Catalogue documents ZEI (URLs publiques)

Les 7 documents source de la V2 et leurs URLs publiques sont catalogués dans [PROJECTS.md](PROJECTS.md#v2--knowledge-base-zei-en-cours-de-planification). Cette liste est **la** source de vérité pour le champ `source_url` des frontmatters.

### Convention d'enrichissement des quizzs (V2)

Pour chaque leçon impactée par un document ZEI :

1. Ajouter un bloc `{ type: "callout", variant: "tip", title: "Vu par ZEI", text: "..." }` avec un extrait clé.
2. Ajouter dans le bloc existant `{ type: "sources", items: [...] }` une entrée `{ label, url }` où `url` est la **`source_url`** du frontmatter (pas un chemin local).
3. Optionnel : 1-2 questions MCQ supplémentaires basées sur des chiffres / outils / étapes concrètes du guide.

Aucune modification de schéma DB nécessaire — tout passe par les `ContentBlock` déjà supportés par [components/learn/LessonContent.tsx](components/learn/LessonContent.tsx).

### Pipeline RAG (extension Phase 13)

Le script [agent/scripts/ingest_knowledge.py](agent/scripts/ingest_knowledge.py) doit être étendu pour :

- Parser le frontmatter YAML des `.md` (via `python-frontmatter` ou regex).
- Propager `source_url`, `title`, `theme_slugs`, `applicable_year` dans la metadata Qdrant (en plus de `category`, `source`, `chunk_index` actuels).

### Tool agent RAG

Phase 20 ajoute un tool `search_zei_docs` (ou étend [agent/app/tools/rag/search_knowledge.py](agent/app/tools/rag/search_knowledge.py)) qui :

- Filtre `category in ("csrd", "esg-collecte", "rse-performance", "zei-offre")`.
- Retourne les chunks pertinents **avec leur `source_url`** dans le payload.
- Le prompt système ([agent/app/agents/main_prompt.py](agent/app/agents/main_prompt.py)) est mis à jour pour citer la source en fin de réponse au format Markdown link.
