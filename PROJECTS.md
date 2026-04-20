# PROJECTS — ZEI Quizz : Plateforme e-learning RSE / CSRD / ESG

## Présentation du projet

**ZEI Quizz** est une plateforme d'apprentissage interactive dédiée à la RSE (Responsabilité Sociétale des Entreprises), la CSRD (Corporate Sustainability Reporting Directive) et l'ESG (Environnemental, Social, Gouvernance). Elle a été conçue pour permettre aux équipes de ZEI et à leurs partenaires de maîtriser ces sujets de manière ludique, progressive et mesurable.

L'application se présente comme un outil de e-learning structuré en parcours thématiques, avec des quiz interactifs, un suivi de progression en temps réel, et une dimension gamifiée (badges, points, niveaux) pour encourager l'engagement.

---

## Contexte et objectifs

### Pourquoi ce projet ?

ZEI, acteur de l'intérim responsable, s'engage dans une démarche RSE concrète. Pour que cette démarche soit portée par l'ensemble des collaborateurs et des partenaires, il est indispensable que chacun comprenne :

- Ce qu'est la RSE, la CSRD, l'ESG et leurs implications concrètes
- Les obligations réglementaires qui s'appliquent aux entreprises en 2025 et 2026
- En quoi la RSE est un avantage compétitif et marketing, pas seulement une contrainte
- Comment ZEI applique ces principes dans son activité quotidienne

### Objectifs pédagogiques

1. Permettre à tout utilisateur de passer de "novice" à "praticien" sur les sujets RSE/CSRD/ESG
2. Mettre en lumière les actions concrètes de ZEI en matière de RSE
3. Préparer les équipes aux obligations réglementaires imminentes (2025-2026)
4. Valoriser la RSE comme levier marketing et de développement commercial

---

## Fonctionnalités

### Parcours d'apprentissage structuré

L'application est organisée en **6 thèmes principaux**, chacun découpé en **sous-thèmes** puis en **modules** :

| Thème | Contenu clé |
|---|---|
| RSE | Fondamentaux, piliers, normes, contexte français |
| CSRD | Directive, calendrier, ESRS, double matérialité, obligations |
| ESG | Les 3 piliers E/S/G, notation, investissement durable |
| Obligations 2025-2026 | Loi PACTE, DPEF, taxonomie, bilan GES, nouveautés réglementaires |
| RSE comme atout marketing | Communication, labels, fidélisation, attractivité talents, appels d'offres |
| ZEI et la RSE | Mission ZEI, actions concrètes, cas pratiques, témoignages |

### Fiches réglementaires horodatées

Chaque leçon portant sur une obligation réglementaire est balisée avec :
- L'année d'entrée en vigueur (2025 ou 2026)
- La taille d'entreprise concernée (toutes, grandes entreprises, PME)
- Un encadré coloré pour distinguer les "nouveautés 2025" des "projections 2026"

### Quiz interactifs

- Questions à choix multiples (MCQ)
- Questions vrai/faux
- Questions d'ordonnancement
- Correction détaillée après chaque tentative avec explication pédagogique
- Score calculé (0-100) et points attribués selon la difficulté
- Possibilité de retenter un quiz autant de fois que souhaité (le meilleur score est conservé)

### Suivi de progression

- Progression calculée en pourcentage à chaque niveau : module, sous-thème, thème, global
- Statut visuel par module : non commencé (gris), en cours (bleu), complété (vert)
- Score et nombre de tentatives visible pour chaque module terminé

### Dashboard personnel

Chaque utilisateur dispose d'un tableau de bord (`/learn/dashboard`) affichant :

- **Anneau de progression global** (shadcn Radial Chart) avec pourcentage global
- **Barres par thème** : progression visuelle des 6 thèmes (shadcn Bar Chart)
- **Statistiques clés** : temps total de formation, questions répondues, taux de réussite moyen
- **Activité récente** : derniers quiz passés avec date, score, thème
- **Galerie de badges** : achievements obtenus et à débloquer
- **Module recommandé** : suggestion intelligente basée sur la progression

### Gamification

| Élément | Détail |
|---|---|
| Points | Gagnés à chaque question correcte, selon la difficulté |
| Niveaux | Novice → Initié → Praticien → Expert → Ambassadeur RSE |
| Badges | 8 badges thématiques débloqués selon la progression |
| Notifications | Toast Sonner au déblocage d'un badge |

---

## Stack technique

| Brique | Technologie |
|---|---|
| Framework | Next.js 16 (App Router) |
| Base de données | PostgreSQL via Drizzle ORM |
| Authentification | NextAuth v5 |
| UI | shadcn/ui + Tailwind v4 |
| Graphiques | shadcn Chart (Recharts) |
| Notifications | Sonner (toast) |
| Icons | Lucide React |
| Contenu leçons | JSON structuré (rendu via react-markdown) |
| Navigation droite | Bloc shadcn `sidebar-14` (ToC dynamique) |

---

## Navigation

### Sidebar gauche — menu principal

La sidebar gauche (`components/shell/portal-sidebar.tsx`) est la navigation principale de l'app :

- **Tableau de bord** — vue d'ensemble, progression globale
- **Formation** *(collapsible)* — accès aux 6 thèmes
  - RSE → `/learn/rse`
  - CSRD → `/learn/csrd`
  - ESG → `/learn/esg`
  - Obligations 2025-2026 → `/learn/obligations-2025-2026`
  - RSE & Marketing → `/learn/rse-marketing`
  - ZEI & RSE → `/learn/zei-rse`
- **Mes badges** — galerie des achievements débloqués
- **Assistant IA** — chatbot ZEI
- **Mon compte** — profil utilisateur

### Sidebar droite — Table des matières (bloc sidebar-14)

La sidebar droite (`components/shell/toc-sidebar.tsx`) affiche les sections de la page courante. Elle est :
- Non collapsible, fixe à droite
- Masquée sur mobile (`hidden lg:flex`)
- Alimentée dynamiquement via `useSetToc(items)` appelé dans chaque page

**Chaque page de cours doit déclarer ses sections** en appelant le hook `useSetToc()` avec les items correspondants, et en ajoutant les `id` correspondants sur ses headings HTML. Voir PLAN.md pour le détail complet.

---

## Informations réglementaires intégrées

### CSRD — Calendrier d'application
- **2024** : Rapport sur données 2024 pour les grandes entreprises déjà soumises à la NFRD (Directive DPEF)
- **2025** : Toutes les grandes entreprises (+500 salariés OU CA >40M€ et bilan >20M€)
- **2026** : PME cotées en bourse + entreprises de pays tiers avec activité significative en Europe
- **2028** : Extension aux PME non cotées (optionnel)

### ESRS (European Sustainability Reporting Standards)
- ESRS 1 & 2 : Cross-cutting (transversaux)
- ESRS E1 à E5 : Environnement (changement climatique, pollution, eau, biodiversité, ressources)
- ESRS S1 à S4 : Social (collaborateurs, travailleurs chaîne valeur, communautés, consommateurs)
- ESRS G1 : Gouvernance, éthique, lutte anti-corruption

### Taxonomie européenne 2025-2026
- 6 objectifs environnementaux (atténuation CC, adaptation CC, eau, économie circulaire, pollution, biodiversité)
- Nouvelles activités économiques éligibles intégrées en 2025
- Extension aux activités sociales envisagée 2026

### Bilan GES obligatoire (France)
- Bilan des émissions de gaz à effet de serre : toutes entreprises >500 salariés
- Mise à jour tous les 4 ans (3 ans pour les entreprises cotées)
- Nouveaux seuils et secteurs d'activité prioritaires 2025

---

## Contenu ZEI intégré (Thème 6)

Le sixième thème est entièrement dédié à ZEI et comprend :

- **La mission de ZEI** : intérim responsable, insertion professionnelle, impact social
- **Actions RSE concrètes** : politiques RH, engagements environnementaux, gouvernance
- **Études de cas** : missions réalisées avec impact mesurable
- **Chiffres clés** : données quantifiées des actions RSE de ZEI
- **La CSRD vue par ZEI** : comment ZEI se prépare aux nouvelles obligations

---

## Règles de design

- Cohérence avec la charte graphique de la template existante (couleurs CSS variables shadcn)
- Couleur dédiée par thème (ex: RSE = vert, CSRD = bleu, ESG = indigo, ZEI = couleur primaire)
- Mobile-first : toutes les pages d'apprentissage sont responsives
- Accessibilité : rôles ARIA sur les composants de quiz, contrastes conformes WCAG AA
- Aucune dépendance CSS tierce ajoutée : tout en Tailwind v4 et classes shadcn

---

## Arborescence des pages

```
/learn                                     ← catalogue des 6 thèmes
/learn/dashboard                           ← tableau de bord utilisateur
/learn/achievements                        ← galerie des badges

/learn/rse                                 ← thème RSE
/learn/rse/fondamentaux                    ← sous-thème
/learn/rse/fondamentaux/definitions        ← module cours + quiz

/learn/csrd                                ← thème CSRD
/learn/csrd/calendrier-application
/learn/csrd/calendrier-application/2025-2026

/learn/esg
/learn/esg/pilier-environnemental
/learn/esg/pilier-social
/learn/esg/pilier-gouvernance

/learn/obligations-2025-2026
/learn/obligations-2025-2026/csrd-obligations
/learn/obligations-2025-2026/bilan-ges

/learn/rse-marketing
/learn/rse-marketing/communication-authentique
/learn/rse-marketing/labels-certifications

/learn/zei-rse
/learn/zei-rse/mission-valeurs
/learn/zei-rse/actions-concretes
/learn/zei-rse/cas-pratiques
```

---

## Stratégie d'implémentation — un thème à la fois

L'implémentation suit un principe strict : **un thème est entièrement terminé avant de passer au suivant**. Pour chaque thème, on suit le cycle :

```
Recherche internet → Rédaction contenu → Seed DB → Pages UI → Quiz → Suivi progression → Test
```

**Ordre des thèmes :**
1. RSE — fondements, socle de tout le reste
2. CSRD — actualité réglementaire forte, enjeu 2025-2026
3. ESG — approfondissement des piliers
4. Obligations 2025-2026 — fiches pratiques par obligation
5. RSE & Marketing — dimension commerciale
6. ZEI & RSE — contenu propriétaire, études de cas réels

Chaque thème est livrable et testable indépendamment dès sa complétion.

---

## Métriques de succès

| Indicateur | Objectif |
|---|---|
| Complétion d'au moins 1 module | 100% des utilisateurs inscrits |
| Complétion d'un thème complet | 70% des utilisateurs actifs |
| Score moyen aux quiz | > 70% |
| Progression globale moyenne | > 50% après 4 semaines |
| Badges débloqués | Au moins 3 badges par utilisateur actif |

---

## Évolutions futures envisageables

- Mode "équipe" : progression collective d'un workspace
- Classement (leaderboard) interne ZEI
- Certification téléchargeable à la complétion d'un thème
- Intégration de l'agent IA existant pour répondre aux questions sur les modules
- Notifications email de rappel si l'utilisateur est inactif depuis 7 jours
- Export PDF du rapport de formation par utilisateur
