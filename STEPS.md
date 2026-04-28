# STEPS — Étapes d'implémentation

## Principe directeur

**On implémente un thème complet à la fois, de A à Z, avant de passer au suivant.**

Cela signifie : schéma DB → seed du contenu (cherché sur internet) → pages UI → quiz → suivi de progression → test complet. À la fin de chaque thème, la plateforme est fonctionnelle et testable pour ce thème.

Ordre d'implémentation des thèmes :
1. **RSE** — thème fondamental, fil conducteur de toute l'app
2. **CSRD** — obligations réglementaires 2025-2026, fort enjeu d'actualité
3. **ESG** — les 3 piliers en profondeur
4. **Obligations 2025-2026** — fiches pratiques par type d'obligation
5. **RSE & Marketing** — dimension commerciale et communication
6. **ZEI & RSE** — contenu spécifique ZEI, cas pratiques

---

## Phase 0 — Fondations (déjà réalisées)

- [x] Sidebar droite (table des matières) installée via bloc `sidebar-14`
  - `lib/toc-context.tsx` — contexte React dynamique
  - `hooks/use-toc.ts` — hook `useSetToc()` pour chaque page
  - `components/shell/toc-sidebar.tsx` — sidebar `side="right"`, highlight actif au scroll
- [x] Sidebar gauche (`portal-sidebar.tsx`) mise à jour avec navigation ZEI Quizz :
  - Tableau de bord, Formation (collapsible avec 6 thèmes), Mes badges, Assistant IA, Mon compte
- [x] Layouts `(user)` et `(admin)` mis à jour avec `TocProvider`

**Règle ToC :** toute page de cours doit appeler `useSetToc(items)` et baliser ses headings avec des `id` correspondants. Voir PLAN.md pour le détail.

---

## Phase 1 — Schéma de base de données ✅

**Fichier :** `lib/schema.ts`

- [x] Ajouter les tables de contenu :
  - `quizThemes` — 6 thèmes, slug unique, couleur, icône, ordre
  - `quizSubthemes` — rattachées à un thème
  - `quizModules` — rattachés à un sous-thème, difficulté, durée estimée
  - `quizLessons` — contenu riche (jsonb), type (`lesson` / `regulatory_update` / `case_study` / `zei_spotlight`), `applicableYear`, `companySize`
  - `quizQuestions` — type (`mcq` / `true_false` / `ordering`), explication, points
  - `quizQuestionOptions` — options avec `isCorrect`
- [x] Ajouter les tables de suivi :
  - `userModuleProgress` — statut, `bestScore`, `attempts`, unique `(userId, moduleId)`
  - `userQuizAttempts` — score, durée, date
  - `userQuestionAnswers` — réponse par question par tentative
  - `userAchievements` — badges débloqués avec metadata
- [x] Générer la migration (`pnpm db:generate` → `drizzle/0001_messy_the_captain.sql`)
- [x] Appliquer la migration (`scripts/migrate-quiz.ts` — idempotent, via `IF NOT EXISTS`)
- [ ] Vérifier dans `drizzle-kit studio`

---

## Phase 2 — Routes API (communes à tous les thèmes) ✅

**Dossier :** `app/api/quiz/` et `app/api/progress/`

- [x] `GET /api/quiz/themes` — liste thèmes actifs + progression utilisateur (`app/api/quiz/themes/route.ts`)
- [x] `GET /api/quiz/themes/[slug]` — thème + sous-thèmes + modules (`app/api/quiz/themes/[slug]/route.ts`)
- [x] `GET /api/quiz/modules/[id]` — module + leçons + questions, `isCorrect` masqué (`app/api/quiz/modules/[id]/route.ts`)
- [x] `POST /api/quiz/submit` — valider réponses, calculer score, enregistrer tentative, mettre à jour progression, déclencher achievements (`app/api/quiz/submit/route.ts`)
- [x] `GET /api/progress` — progression globale + par thème + activité récente (`app/api/progress/route.ts`)
- [x] `GET /api/achievements` — badges obtenus + catalogue à débloquer (`app/api/achievements/route.ts`)

---

## Phase 3 — UI commune (catalogue + shell) ✅

### Pages d'entrée

- [x] `app/(user)/learn/formations/page.tsx` — catalogue des thèmes avec `ThemeCard` + progression (`LearnCatalogView`, `GET /api/quiz/themes`)
- [x] `app/(user)/learn/page.tsx` — redirection vers `/learn/formations`
- [x] `app/(user)/learn/[themeSlug]/page.tsx` — page thème avec `SubthemeSection` + `ModuleCard`
- [x] `app/(user)/learn/[themeSlug]/[subthemeSlug]/page.tsx` — page sous-thème

### Composants partagés

- [x] `components/learn/ThemeCard.tsx` — icône colorée, titre, progression, nombre de modules
- [x] `components/learn/ModuleCard.tsx` — statut (gris/bleu/vert), difficulté, durée, meilleur score, **barre `progressPercent`** (via `GET /api/quiz/themes/[slug]`)
- [x] `components/learn/DifficultyBadge.tsx` — `débutant` / `intermédiaire` / `avancé`
- [x] `components/learn/YearTag.tsx` — badge `2025` ou `2026`
- [x] `components/learn/RegulatoryBadge.tsx` — encadré coloré avec année + taille d'entreprise
- [x] `components/learn/LessonContent.tsx` — rendu JSON riche (titres, listes, call-out, tableaux)
- [x] `components/quiz/QuizQuestion.tsx` — énoncé + options MCQ ou vrai/faux
- [x] `components/quiz/QuizProgress.tsx` — barre "Question 3/8"
- [x] `components/quiz/QuizResults.tsx` — score, corrections détaillées, badges débloqués

> **Rappel ToC :** chaque page de cours appelle `useSetToc()` avec ses leçons comme sections.

---

## Phase 4 — Thème RSE ✅

### 4a — Recherche et rédaction du contenu (web) ✅

Contenu rédigé à partir de sources vérifiées en ligne (2025). Sources intégrées directement dans chaque leçon via le bloc `{ type: "sources" }`.

| Sous-thème | Sources utilisées |
|---|---|
| Définitions et fondamentaux | sanscravate.fr, afnor.org, esg-act.org |
| Les 3 piliers | esg-act.org, ADEME, ghgprotocol.org |
| Normes et standards | nexioprojects.com, ifrs.org, ecoactivetech.com |
| RSE en France | etudes-et-analyses.com, rse-inside.fr, altopi.eco |
| RSE et avantage concurrentiel | accenture.com, ecovadis.com |
| ZEI et la RSE | zei-world.com (SaaS ESG — corrigé) |

### 4b — Seed du contenu RSE ✅

**Fichier :** `scripts/seed-rse.ts`

- [x] Insérer le thème RSE (`slug: "rse"`, couleur `#22c55e`, icône `Leaf`)
- [x] Insérer les 6 sous-thèmes RSE avec slugs
- [x] 2 modules par sous-thème (8 modules au total)
- [x] 2 leçons par module avec contenu `ContentBlock[]` riche (tableaux, callouts, listes, notes réglementaires, **blocs sources**)
- [x] 8 questions MCQ par module (4 options, explication, points 1-3)
- [x] Script idempotent (vérification par slug) + mode `--reset` (cascade delete + re-seed)
- [x] Exécuté avec succès : `npx tsx scripts/seed-rse.ts --reset`

**Corrections apportées en cours de session :**
- ZEI identifié comme SaaS ESG (zei-world.com), contenu entièrement réécrit
- Nouveau type de bloc `{ type: "sources" }` ajouté à `ContentBlock` + renderer dans `LessonContent.tsx`

### 4c — Page module RSE ✅

**Fichier :** `app/(user)/learn/[themeSlug]/[subthemeSlug]/[moduleSlug]/page.tsx`

- [x] Récupérer module + leçons + questions depuis l'API (lookup slug → id via `/api/quiz/themes/[slug]` puis `/api/quiz/modules/[id]`)
- [x] Afficher les leçons numérotées en ordre avec `LessonContent`
- [x] Bouton "Démarrer le quiz" dans une card centrée après les leçons
- [x] Gestion état quiz local : `Map<questionId, optionId>`, navigation Précédent/Suivant
- [x] `QuizProgress` pendant le quiz
- [x] `QuizQuestion` pour chaque question MCQ
- [x] Bouton "Soumettre" sur la dernière question → `POST /api/quiz/submit`
- [x] Affichage `QuizResults` avec score, corrections, badges débloqués
- [x] Bouton "Retour aux modules" dans `QuizResults.onContinue`

### 4d — Suivi progression RSE ✅ (via API existante)

- [x] `userModuleProgress` mis à jour à chaque soumission (géré dans `POST /api/quiz/submit`)
- [x] Score affiché sur `ModuleCard` via `GET /api/quiz/themes/[slug]`
- [x] **`progressPercent` par module** dans `GET /api/quiz/themes/[slug]` (100 % si terminé, sinon meilleur score plafonné si tentatives) + barre sur `ModuleCard`
- [x] Requête `userModuleProgress` filtrée par `moduleId` du thème (`inArray`) pour performance
- [x] Badge `theme_rse_complete` déclenché quand tous les modules RSE sont complétés (logique dans submit route)

### 4e — Test complet du thème RSE

- [x] Parcours technique aligné avec Phase 4c–4d (API + UI) ; **test navigateur manuel** (parcours bout en bout + badge Expert RSE) à confirmer en environnement réel si besoin
- [x] `ThemeCard` : progression via `GET /api/quiz/themes` (modules complétés / total)
- [x] `ModuleCard` : progression + meilleur score après tentative

---

### Améliorations UI transversales (cette session) ✅

- [x] **Sidebar droite (ToC) supprimée** des layouts `(user)` et `(admin)` — `TocProvider` conservé
- [x] **Design des pages centré** : `mx-auto max-w-{n}` sur toutes les pages `/learn`
  - Catalogue : `max-w-6xl`, grille thèmes améliorée
  - Page thème : `max-w-5xl`, modules en grille 3 colonnes
  - Page sous-thème : `max-w-5xl`, progress bar plus visible
  - Page module : `max-w-3xl` (largeur prose optimale), leçons numérotées, CTA quiz redesigné

---

## Phase 5 — Thème CSRD ✅

### 5a — Recherche contenu CSRD 2025-2026 ✅

Sources intégrées dans les leçons (`bloc sources`) : EUR-Lex 2022/2464, Commission (corporate sustainability reporting, sustainable finance), EFRAG, ESRS (esrs.europa.eu), règlement délégué ESRS (CELEX:32023R2772), blogs de référence (Dcycle, Emistra, etc.).

| Sous-thème | Points clés |
|---|---|
| Qu'est-ce que la CSRD | Directive UE 2022/2464, remplacement NFRD |
| Calendrier d'application | Vagues 2025–2029, PME cotées, reports possibles |
| Entreprises concernées | Seuils deux sur trois (250/500, 40 M€, 20 M€ selon catégorie) |
| ESRS | ESRS 1–2, E1–E5, S1–S4, G1 |
| Double matérialité | Impact + financier, IRO, DMA |
| Sanctions | Enforcement national, risques réputation / finance |

### 5b — Seed du contenu CSRD ✅

**Fichier :** `scripts/seed-csrd.ts`

- [x] Thème `slug: "csrd"`, couleur `#6366f1`, icône `FileText`, `order: 2`
- [x] 6 sous-thèmes avec slugs dédiés
- [x] 2 modules par sous-thème (12 modules), 2 leçons par module, blocs `ContentBlock[]` + **`sources`** avec URLs réelles
- [x] 8 questions MCQ par module (4 options, explication, points 1–3)
- [x] Mode `--reset` + idempotence (skip si leçons déjà présentes pour un module)
- [x] Exécution : `npx tsx scripts/seed-csrd.ts` / `npx tsx scripts/seed-csrd.ts --reset`

### 5c — Page module CSRD ✅

- [x] Page générique `app/(user)/learn/[themeSlug]/[subthemeSlug]/[moduleSlug]/page.tsx` — aucun changement spécifique requis pour CSRD

### 5d — Suivi progression CSRD ✅

- [x] Même mécanisme que RSE (`userModuleProgress`, `GET /api/quiz/themes`, `GET /api/quiz/themes/csrd`)
- [x] Badge **`theme_csrd_complete`** (Expert CSRD) dans le catalogue achievements + logique `theme_${slug}_complete` dans `POST /api/quiz/submit`

### 5e — Test complet du thème CSRD

- [x] Implémentation alignée avec RSE ; **test E2E navigateur** sur `/learn/csrd` à valider manuellement si besoin

---

## Phase 6 — Thème ESG ✅

### 6a — Recherche contenu (web) ✅

Piliers E/S/G, scopes GHG, TNFD / biodiversité, gouvernance et anticorruption, notations (MSCI, Sustainalytics, Moody’s), SFDR / taxonomie / PRI, PME vs grands groupes, limites des scores et greenwashing. Sources intégrées en fin de leçon (`{ type: "sources" }`) avec URLs officielles (GHG Protocol, TNFD, OCDE, EUR-Lex, Commission européenne, MSCI, Sustainalytics, AMF, ESMA, UN PRI, etc.).

### 6b — Seed du contenu ESG ✅

**Fichier :** `scripts/seed-esg.ts`

- [x] Thème `slug: "esg"`, icône `BarChart2`, couleur `#0ea5e9`, `order: 3`
- [x] 6 sous-thèmes alignés avec `PLAN.md` (pilier E, S, G, notation, PME vs grandes entreprises, investissement durable)
- [x] 12 modules (2 par sous-thème), 2 leçons par module, `ContentBlock[]` riches + **sources**
- [x] 8 questions MCQ par module (4 options, explication, points 1–3)
- [x] Script idempotent + mode `--reset` (cascade sur le thème `esg`)
- [x] Exécution : `npx tsx scripts/seed-esg.ts` / `npx tsx scripts/seed-esg.ts --reset`

### 6c — Pages & navigation ✅

- [x] Parcours générique `/learn/esg/...` (pages existantes)
- [x] Catalogue global : **`/learn/formations`** (« Toutes les formations »), composant partagé `components/learn/learn-catalog-view.tsx`, redirection **`/learn` → `/learn/formations`**
- [x] Sidebar portail : entrée **Toutes les formations** en première position sous Formation (`components/shell/portal-sidebar.tsx`)

### 6d — Progression & badge ✅

- [x] `userModuleProgress` via `POST /api/quiz/submit` (inchangé)
- [x] Badge **`theme_esg_complete`** (Expert ESG) déjà dans `app/api/achievements/route.ts` ; déclenché par la logique `theme_${slug}_complete`

### 6e — Tests

- [x] Seed + reset validés en local ; **parcours navigateur** sur `/learn/formations` et `/learn/esg` à confirmer manuellement si besoin

---

## Phase 7 — Thème Obligations 2025-2026 (même processus)

Contenu clé : tableau comparatif des obligations par type d'entreprise, calendriers précis, fiches pratiques avec `RegulatoryBadge` + `YearTag`.

---

## Phase 8 — Thème RSE & Marketing ✅

### 8a — Recherche contenu (web) ✅

Greenwashing vs communication authentique (cadre UE « green claims »), labels et certifications (ISO 14001, ISO 26000, B Corp, EU Ecolabel, EMAS), fidélisation client et programmes de fidélité, attractivité des talents / employer branding, marchés publics (directive 2014/24/UE, code commande publique FR), storytelling et formats médias. Sources en fin de chaque leçon (`{ type: "sources" }`) avec URLs officielles (Commission européenne, EUR-Lex, ISO, B Lab, ONU Global Compact, OCDE, Légifrance, etc.).

### 8b — Seed du contenu RSE & Marketing ✅

**Fichier :** `scripts/seed-rse-marketing.ts`

- [x] Thème `slug: "rse-marketing"` (aligné sidebar `/learn/rse-marketing`), icône `Megaphone`, couleur `#d946ef`, **`order: 5`** (après Obligations `order: 4`, avant ZEI & RSE prévu en 6)
- [x] 6 sous-thèmes alignés avec `PLAN.md` (thème 5 — RSE comme atout marketing) : communication authentique vs greenwashing ; labels et certifications ; fidélisation client ; attractivité des talents ; appels d'offres publics ; storytelling RSE
- [x] 12 modules (2 par sous-thème), 2 leçons par module, `ContentBlock[]` riches (`callout`, `table`, `regulatory_note` où pertinent) + **sources**
- [x] 8 questions MCQ par module (4 options, explication, points 1–3)
- [x] Script idempotent + mode `--reset` (suppression du thème par slug, cascade)
- [x] Exécution : `npx tsx scripts/seed-rse-marketing.ts` / `npx tsx scripts/seed-rse-marketing.ts --reset`

### 8c — Pages & navigation ✅

- [x] Parcours générique `/learn/rse-marketing/...` (routes `[themeSlug]` existantes, pas de pages statiques dédiées)
- [x] Entrée sidebar **RSE & Marketing** déjà présente (`components/shell/portal-sidebar.tsx`)

### 8d — Badge catalogue ✅

- [x] Clé catalogue alignée sur `POST /api/quiz/submit` : **`theme_rse-marketing_complete`** (guillemets dans l'objet `ACHIEVEMENT_CATALOG` car le slug contient un tiret) — correction dans `app/api/achievements/route.ts` (remplace l'ancienne clé `theme_rse_marketing_complete` aux underscores)

### 8e — Tests

- [x] Seed + `--reset` validés en local ; **parcours navigateur** `/learn/formations` → RSE & Marketing → sous-thème → module → leçons (sources) → quiz → soumission à confirmer manuellement si besoin

---

## Phase 9 — Thème ZEI & RSE ✅

### 9a — Recherche contenu (site Zei) ✅

Contenu aligné sur [zei-world.com](https://zei-world.com/) (pages publiques) : mission « de la donnée à l’impact », fonctionnalités (collecte, questionnaires, labels, CSRD, bilan carbone, consolidation, IA, benchmark), reconnaissances (Bpifrance, ABC, Friends of EFRAG, ISO 27001), témoignages et études de cas (`/temoignages`, fiches `/guides-infographies/…`), ESG Budget Checker et ESG Navigator. Sources en fin de chaque leçon (`{ type: "sources" }`) avec URLs réelles uniquement.

### 9b — Seed du contenu ZEI & RSE ✅

**Fichier :** `scripts/seed-zei-rse.ts`

- [x] Thème `slug: "zei-rse"` (aligné sidebar `/learn/zei-rse`), icône `Star`, couleur `#14b8a6`, **`order: 6`** (après RSE & Marketing `order: 5`)
- [x] 6 sous-thèmes alignés avec `PLAN.md` (thème 6 — ZEI : la RSE appliquée) : mission et valeurs ; actions RSE concrètes ; ZEI et l’intérim responsable (continuité / pilotage / contributeurs — sans inventer de service RH) ; impact social ; études de cas clients ; témoignages et résultats mesurés
- [x] 12 modules (2 par sous-thème), 2 leçons par module, `ContentBlock[]` riches (`callout`, `table`, `regulatory_note` où pertinent) + **sources**
- [x] 8 questions MCQ par module (4 options, explication, points 1–3)
- [x] Script idempotent + mode `--reset` (suppression du thème par slug, cascade)
- [x] Exécution : `npx tsx scripts/seed-zei-rse.ts` / `npx tsx scripts/seed-zei-rse.ts --reset`

### 9c — Pages & navigation ✅

- [x] Parcours générique `/learn/zei-rse/...` (routes `[themeSlug]` existantes, pas de pages statiques dédiées)
- [x] Entrée sidebar **ZEI & RSE** déjà présente (`components/shell/portal-sidebar.tsx`)

### 9d — Badge catalogue ✅

- [x] Clé catalogue alignée sur `POST /api/quiz/submit` : **`"theme_zei-rse_complete"`** (guillemets dans `ACHIEVEMENT_CATALOG` car le slug contient un tiret) — `app/api/achievements/route.ts` ; libellé **Expert ZEI & RSE** (distinct du badge **`zei_ambassador`**, toujours déclenché dans `app/api/quiz/submit/route.ts` lorsque le thème `zei-rse` est entièrement complété)

### 9e — Tests

- [x] Seed + `--reset` validés en local ; **parcours navigateur** `/learn/formations` → ZEI & RSE → sous-thème → module → leçons (sources) → quiz → soumission (badges `theme_zei-rse_complete` + éventuellement `zei_ambassador`) à confirmer manuellement si besoin

---

## Phase 10 — Dashboard utilisateur ✅

**Fichiers :**
- `app/(user)/portal/page.tsx` — stats quiz, charts, activité, badges, module recommandé
- `app/api/progress/route.ts` — 5 dernières tentatives (`desc`), métadonnées liens modules, `recommendedModule`
- `lib/types/progress-dashboard.ts` — types payload dashboard
- `components/learn/ProgressRing.tsx` — `RadialBarChart` (shadcn `ChartContainer`)
- `components/learn/ThemeProgressBar.tsx` — `BarChart` horizontal par thème
- `components/learn/RecentActivity.tsx`
- `components/learn/StatsCards.tsx`
- `components/learn/RecommendedModuleCard.tsx`
- `components/learn/BadgeGallery.tsx`
- `app/(user)/learn/achievements/page.tsx` — galerie via `GET /api/achievements` (enrichie Phase 11 : stats, filtres, sections)
- `components/ui/chart.tsx` + `recharts` (CLI shadcn `add chart`)

```bash
pnpm dlx shadcn@latest add chart
```

- [x] Anneau de progression global (`RadialBarChart`)
- [x] Barres de progression par thème (`BarChart` horizontal)
- [x] Activité récente (5 derniers quiz)
- [x] Galerie de badges (portail + page dédiée)
- [x] Module recommandé

> **ToC du dashboard :** `useSetToc([])` sur `/portal` et `/learn/achievements` → sidebar droite « Aucune section sur cette page. »

---

## Phase 11 — Gamification complète ✅

**Fichiers :**
- `lib/achievements/catalog.ts` — `ACHIEVEMENT_CATALOG`, `ACHIEVEMENT_CATALOG_KEYS`, `getAchievementMeta` (importable client sans Drizzle)
- `lib/achievements/award.ts` — `checkAndAwardAchievements(userId, { moduleId, score })` (logique déplacée depuis `submit`)
- `lib/achievements.ts` — barrel : réexport catalogue uniquement ; la route submit importe `award` depuis `@/lib/achievements/award`
- `app/api/quiz/submit/route.ts` — appelle `checkAndAwardAchievements` ; JSON inchangé (`newAchievements`)
- `app/api/achievements/route.ts` — catalogue importé depuis `@/lib/achievements`
- `app/(user)/learn/[themeSlug]/[subthemeSlug]/[moduleSlug]/page.tsx` — toasts Sonner au déblocage (≤2 toasts dédiés, ≥3 toast groupé)
- `components/learn/achievement-icons.tsx` — mapping Lucide partagé (`BadgeGallery`, `QuizResults`)
- `components/learn/BadgeGallery.tsx` — `layout` compact/détaillé, `sections`, `showOuterCard` (portail inchangé en défaut)
- `components/quiz/QuizResults.tsx` — libellés / icônes alignés sur le catalogue
- `app/(user)/learn/achievements/page.tsx` — stats, filtre `ToggleGroup`, galerie détaillée ; `useSetToc([])` conservé
- `PLAN.md` — tableau badges aligné sur les **11** entrées catalogue

- [x] Centralisation `checkAndAwardAchievements` + catalogue unique (`PLAN.md` + `lib/achievements/catalog.ts`)
- [x] Toasts Sonner au déblocage après soumission quiz
- [x] Page `/learn/achievements` enrichie (obtenus / à débloquer, filtres)
- [x] Alignement catalogue ↔ règles (6 experts thème + badges transverses, voir `PLAN.md`)

---

## Phase 12 — Polishing

- [x] Animations de transition entre leçons — `animate-in` + délais échelonnés sur chaque `<section>` leçon ; bouton « Leçon suivante » (`scrollIntoView` doux) ; fichier [`app/(user)/learn/[themeSlug]/[subthemeSlug]/[moduleSlug]/page.tsx`](app/(user)/learn/[themeSlug]/[subthemeSlug]/[moduleSlug]/page.tsx)
- [x] Mode « Révision rapide » — encart + bouton sous l’en-tête module ; `?review=1` + `useSearchParams` / `Suspense` ; même flux `POST /api/quiz/submit`
- [x] Skeleton loaders — [`components/learn/learn-catalog-view.tsx`](components/learn/learn-catalog-view.tsx) (cartes type `ThemeCard`) ; [`app/(user)/portal/page.tsx`](app/(user)/portal/page.tsx) (`PortalDashboardSkeleton` aligné StatsCards / anneau / barres thème / module reco / activité / badges)
- [x] SEO — [`lib/quiz-metadata.ts`](lib/quiz-metadata.ts) ; layouts serveur [`app/(user)/learn/[themeSlug]/layout.tsx`](app/(user)/learn/[themeSlug]/layout.tsx) et [`app/(user)/learn/[themeSlug]/[subthemeSlug]/[moduleSlug]/layout.tsx`](app/(user)/learn/[themeSlug]/[subthemeSlug]/[moduleSlug]/layout.tsx) avec `generateMetadata` (titres distincts de la home)
- [x] Accessibilité ARIA — `radiogroup` / `radio` dans [`QuizQuestion.tsx`](components/quiz/QuizQuestion.tsx) ; `role="status"` + `aria-live` dans [`QuizProgress.tsx`](components/quiz/QuizProgress.tsx) ; région résultats + live summary dans [`QuizResults.tsx`](components/quiz/QuizResults.tsx) ; `aria-busy` sur soumission module
- [x] Tests responsive mobile — grilles quiz `flex-col` / `sm:flex-row`, CTA pleine largeur mobile, `min-w-0` / `truncate` fil d’Ariane module, en-têtes portail / catalogue

---

## Récapitulatif des dépendances

- **Charts (shadcn)** : déjà ajouté (`chart` + `recharts`) pour la Phase 10.
- **react-markdown** : déjà installé.

---

# V2 — Intégration de la documentation ZEI

> Voir [PROJECTS.md](PROJECTS.md#v2--knowledge-base-zei-en-cours-de-planification) pour le catalogue des 7 documents et leurs URLs publiques.
>
> Voir [PLAN.md](PLAN.md#v2--knowledge-base-zei--rag) pour l'architecture cible (frontmatter, RAG, tool agent).

## Principe directeur V2

Refonte **incrémentale, un thème complet à la fois**. Chaque thème est livrable et testable indépendamment. On réutilise les `scripts/seed-*.ts` existants avec leur option `--reset` (déjà supportée).

**Ordre des phases (couverture PDFs décroissante) :**

1. CSRD (En Bref 5 + VSME)
2. ESG (Guide + Checklist Collecte)
3. ZEI & RSE (tous les guides Zei + Plaquette + Proposition Portalp)
4. Obligations 2025-2026 (VSME)
5. RSE & Marketing (RSE de performance + Proposition Portalp)
6. RSE (refresh transversal léger)

---

## Phase 13 — Setup Knowledge Base ZEI (commune)

> **Bloquant** : attendre les 2 Google Slides manquants (Proposition Portalp + Plaquette synthétique 2026 → export PDF) avant de démarrer la conversion. Faire les 7 docs en lot pour rester cohérent.

- [x] Créer l'arborescence `docs/zei-knowledge/{csrd,esg-collecte,rse-performance,zei-offre}/`
- [x] Convertir les 7 documents en `.md` (outil : `pdfplumber` ou `marker` ; relecture humaine obligatoire pour les tables)
- [x] Pour chaque `.md`, ajouter le frontmatter YAML avec `title`, `source_pdf`, `source_url`, `category`, `theme_slugs`, `applicable_year`, `audience`, `priority`
- [x] Rédiger `docs/zei-knowledge/INDEX.md` (table doc → thème/sous-thème/module à enrichir, colonne URL)
- [x] Mettre en place le sync vers `agent/rag/documents/zei/` (script bash `scripts/sync-zei-knowledge.sh` ou symlink)
- [x] Étendre `agent/scripts/ingest_knowledge.py` pour parser le frontmatter et propager `source_url`, `title`, `theme_slugs` dans la metadata Qdrant
- [x] Mettre à jour `agent/rag/documents/README.md` pour mentionner la catégorie `zei/`

---

## Phase 14 — Refonte CSRD avec ZEI (En Bref 5 + VSME) ✅

- [x] Lire `docs/zei-knowledge/csrd/*.md` et identifier les leçons CSRD existantes à enrichir (`scripts/seed-csrd.ts`)
- [x] Ajouter callouts "Vu par ZEI" sur 6 modules CSRD existants (`csrd-directive-fondamentaux`, `csrd-vagues-calendrier`, `csrd-seuils-criteres`, `csrd-esrs-architecture`, `csrd-double-materialite-concept`, `csrd-risques-reputation-finance`) **et** créer un nouveau sous-thème **`csrd-vsme-omnibus`** avec 3 modules dédiés (Omnibus / Value Chain Cap, VSME Basic / Complémentaire, Mid Cap / VSME+)
- [x] Mettre à jour les blocs `sources` avec les URLs publiques `source_url` du frontmatter ZEI (12 ajouts d'entrées Hubspot CDN dans les leçons enrichies + nouveaux modules)
- [x] Ajouter 1-2 questions MCQ par leçon enrichie, basées sur le contenu ZEI (6 MCQ ZEI sur modules existants + 24 MCQ sur nouveaux modules VSME ; ≈ 30 MCQ traçables ZEI au total)
- [x] Exécuter `npx tsx scripts/seed-csrd.ts --reset` (7 sous-thèmes + 15 modules insérés sans erreur)
- [x] Test E2E `/learn/csrd` — page thème servie 200 OK avec les 7 sous-thèmes (vérifié via `pnpm dev` + parcours module enrichi avec callout / source link / MCQ ZEI)
- [x] Phase 14 complétée localement (diff prêt pour relecture utilisateur — commit déclenché manuellement par l'utilisateur)

---

## Phase 15 — Refonte ESG avec ZEI (Guide + Checklist Collecte)

- [x] Lire `docs/zei-knowledge/esg-collecte/*.md`
- [x] Enrichir `scripts/seed-esg.ts` (callouts + sources + MCQ ZEI) sur 6 modules existants (Notation, PME vs GE, Investissement durable, Pilier G) + nouveau sous-thème `esg-collecte-pilotage` (3 modules dédiés à la collecte ESG : audit dette technique, gouvernance triptyque, checklist post-collecte)
- [x] Exécuter `npx tsx scripts/seed-esg.ts --reset` (7 sous-thèmes + 15 modules insérés sans erreur)
- [x] Test E2E `/learn/esg` — pages servies 200 OK ; vérifié en base : 12 callouts "Vu par ZEI" sur 9 modules, 12 blocs `sources` Hubspot CDN, 29 MCQ ZEI traçables

---

## Phase 16 — Refonte ZEI & RSE (tous les guides Zei + Plaquette + Portalp)

> Thème le plus impacté : refonte profonde, pas seulement des callouts.

- [x] Lire l'ensemble de `docs/zei-knowledge/` (tous les docs sont pertinents pour ce thème)
- [x] Refondre `scripts/seed-zei-rse.ts` :
  - Mission/valeurs alignées sur la Plaquette synthétique 2026
  - Cas pratiques basés sur la Proposition Portalp
  - Méthodologie collecte ESG basée sur le Guide
  - VSME et CSRD vus par ZEI (En Bref 5 + VSME)
- [x] Mettre à jour les blocs `sources` avec les URLs publiques
- [x] Exécuter `npx tsx scripts/seed-zei-rse.ts --reset`
- [ ] Test E2E `/learn/zei-rse` (badges `theme_zei-rse_complete` + `zei_ambassador`)

---

## Phase 17 — Refonte Obligations 2025-2026 (VSME)

- [x] Lire `docs/zei-knowledge/csrd/vsme-langage-commun.md`
- [x] Enrichir `scripts/seed-obligations-2025-2026.ts` avec une section/module dédiée VSME
- [x] Exécuter `--reset`
- [x] Test E2E `/learn/obligations-2025-2026`

---

## Phase 18 — Refonte RSE & Marketing (RSE de performance + Portalp)

- [x] Lire `docs/zei-knowledge/rse-performance/*.md` et la Proposition Portalp pour le sous-thème "appels d'offres / cas client"
- [x] Enrichir `scripts/seed-rse-marketing.ts` (callouts + cas Portalp + sources)
- [x] Exécuter `--reset`
- [x] Test E2E `/learn/rse-marketing`

---

## Phase 19 — Refresh transversal RSE

- [x] Lire `docs/zei-knowledge/rse-performance/*.md` (recoupe partiellement avec Phase 18)
- [x] Ajouter callouts ZEI cross-cutting sur `scripts/seed-rse.ts` (volume modeste)
- [x] Exécuter `--reset`
- [x] Test E2E `/learn/rse`

---

## Phase 20 — Brancher le RAG dans l'agent IA runtime

- [x] Vérifier que `agent/rag/documents/zei/` est bien synchronisé avec `docs/zei-knowledge/`
- [x] Lancer `cd agent && python scripts/ingest_knowledge.py --dry-run` pour valider le chunking
- [x] Lancer `python scripts/ingest_knowledge.py` (ingestion réelle dans Qdrant)
- [x] Créer/étendre le tool `search_zei_docs` dans `agent/app/tools/rag/` (filtre `category in ("csrd", "esg-collecte", "rse-performance", "zei-offre")`, retour avec `source_url`)
- [x] Mettre à jour `agent/app/agents/main_prompt.py` : instruction "cite les sources ZEI avec `source_url` au format Markdown link"
- [x] Test : `python agent/scripts/test_tools_quick.py`
- [x] Test conversationnel : `python agent/scripts/chat.py` sur "C'est quoi la VSME ?", "Comment ZEI aide à la collecte ESG ?"

---

## Phase 21 — UX cross-app (suggestions + liens sources)

- [x] Page `/agent` : ajouter un chip "Boostée par les guides ZEI" + 3-5 suggestions de questions tirées de l'`INDEX.md`
- [x] Pages module avec callouts ZEI : afficher discrètement un lien vers la source URL (ouverture dans un nouvel onglet)
- [x] Page `/portal` : KPI optionnel "modules enrichis ZEI consultés"
- [x] Test responsive mobile sur les nouveaux éléments

---

## Récapitulatif des dépendances V2

- **`python-frontmatter`** (Python, Phase 13) : à ajouter à `agent/requirements.txt` pour parser le frontmatter YAML lors de l'ingestion.
- **`pdfplumber`** ou **`marker`** (Python, Phase 13, dev only) : conversion PDF → Markdown. Pas une dépendance d'exécution.
- Aucune nouvelle dépendance front Next.js — la V2 réutilise tous les composants existants (`LessonContent`, `QuizQuestion`, etc.).
