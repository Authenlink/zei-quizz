# Index — Knowledge Base ZEI

Cartographie centrale de la knowledge base ZEI (Phase 13 V2).

Ce fichier sert de pont entre les **7 documents officiels Zei** convertis en Markdown et les **thèmes / modules de quizz** ainsi que le **RAG runtime de l'agent IA** (Phase 20). Il guide les Phases 14-19 d'enrichissement des seeds.

## Conventions

- `category` ∈ `{csrd, esg-collecte, rse-performance, zei-offre}`
- `theme_slugs` aligné sur les slugs Drizzle (`rse`, `csrd`, `esg`, `obligations-2025-2026`, `rse-marketing`, `zei-rse`)
- `priority` ∈ `{high, medium, low}` — pondération éditoriale (priorisation des enrichissements et boost RAG)
- `audience` slugs cohérents avec la cible utilisateur Zei (`dirigeant`, `rse-manager`, `finance`, `credit-manager`, `data-officer`, `marketing`, `commercial`, `ressources-humaines`)

## Catalogue des documents

| Document | Catégorie | Fichier `.md` | URL publique | Priority |
|---|---|---|---|---|
| En Bref 5 — CSRD : ce que vous devez comprendre | csrd | [csrd/en-bref-5-csrd.md](csrd/en-bref-5-csrd.md) | [PDF](https://4495458.fs1.hubspotusercontent-na1.net/hubfs/4495458/En%20bref/En%20Bref%205%20-%20CSRD%2c%20ce%20que%20vous%20devez%20comprendre%20avant%20vos%20concurrents%20pour%20rester%20comp%C3%A9titifs%20-%20Zei.pdf) | high |
| La VSME expliquée — Le nouveau langage commun de la donnée ESG | csrd | [csrd/vsme-langage-commun.md](csrd/vsme-langage-commun.md) | [PDF](https://4495458.fs1.hubspotusercontent-na1.net/hubfs/4495458/Livres%20blancs/Zei%20-%20La%20VSME%20expliqu%C3%A9e%20-%20Le%20nouveau%20langage%20commun%20de%20la%20donn%C3%A9es%20ESG%20en%20Europe.pdf) | high |
| Guide Zei — Collecte ESG : arrêtez de bricoler, commencez à piloter | esg-collecte | [esg-collecte/guide-collecte-esg.md](esg-collecte/guide-collecte-esg.md) | [PDF](https://4495458.fs1.hubspotusercontent-na1.net/hubfs/4495458/Livres%20blancs/Guide%20Zei%20-%20Collecte%20ESG%20%20arr%C3%AAtez%20de%20bricoler%2c%20commencez%20%C3%A0%20piloter.pdf) | high |
| Checklist — Faites le point sur votre collecte ESG | esg-collecte | [esg-collecte/checklist-collecte-esg.md](esg-collecte/checklist-collecte-esg.md) | [PDF](https://4495458.fs1.hubspotusercontent-na1.net/hubfs/4495458/Lead%20Magnets/Zei%20-%20Checklist%20Faites%20le%20point%20sur%20votre%20collecte%20ESG.pdf) | medium |
| En 2025, comment passer à une RSE de performance ? | rse-performance | [rse-performance/rse-2025-performance.md](rse-performance/rse-2025-performance.md) | [PDF](https://4495458.fs1.hubspotusercontent-na1.net/hubfs/4495458/Livres%20blancs/Zei%20-%20En%202025%20comment%20passer%20%C3%A0%20une%20RSE%20de%20performance%20%3F.pdf) | high |
| Plaquette synthétique 2026 | zei-offre | [zei-offre/plaquette-synthetique-2026.md](zei-offre/plaquette-synthetique-2026.md) | [Slides](https://docs.google.com/presentation/d/1aeOHcN3LXL8z3U8oRkZsYktFwCxGrX4jPzQAN2G8ff8/edit) | high |
| Exemple proposition Zei — Portalp France | zei-offre | [zei-offre/proposition-portalp.md](zei-offre/proposition-portalp.md) | [Slides](https://docs.google.com/presentation/d/1Z_OuSEaTGMupYV79TdMVqXObXSgxlJF1ouojGd9hLB4/edit) | high |

## Couverture par thème de quizz

Chaque tableau mappe les documents source aux modules existants (slugs de la base Drizzle, cf. `scripts/seed-*.ts`) et propose une **action concrète d'enrichissement** pour les Phases 14-19 (re-seeding ciblé).

### Thème `csrd`

| Document | Sous-thème(s) impacté(s) | Module(s) à enrichir | Action concrète |
|---|---|---|---|
| `csrd/en-bref-5-csrd.md` | Données quantitatives vs qualitatives, ROI compétitivité, comparabilité | Modules CSRD (calendrier, exigences ESRS, double matérialité) | Callout « 1 700 indicateurs / 4 200 points XBRL / 70 % narratif – 30 % quantitatif ». Nouveau module ou QCM sur la table « Avant CSRD vs Avec CSRD ». |
| `csrd/vsme-langage-commun.md` | VSME Basic / Complémentaire, Mid Cap, VSME+, Value Chain Cap | Modules CSRD avancés (PME / chaîne de valeur, Omnibus, alignement EFRAG) | Nouveau module dédié à la **VSME** (Basic ≈ 80 indicateurs, Complémentaire, Mid Cap 170 points, VSME+). Module dédié à la **Value Chain Cap** (questionnaires fournisseurs / banques alignés VSME). |

### Thème `esg`

| Document | Sous-thème(s) impacté(s) | Module(s) à enrichir | Action concrète |
|---|---|---|---|
| `esg-collecte/guide-collecte-esg.md` | Dette technique, double matérialité, gouvernance triptyque (contributeur / valideur / admin), audit trail, dashboard | `esg-pme-vs-grandes-entreprises`, `esg-notation-limites-greenwashing`, `esg-pme-vs-ge-double-materialite` | Refondre le module « Collecte et qualité des données » avec la statistique **80 % collecte / 20 % analyse**. Ajouter un module « Triptyque de validation ». Callout « 40 % données estimées → 90 % données réelles ». |
| `esg-collecte/checklist-collecte-esg.md` | Complétion, cohérence, justificatifs, consolidation, préparation reporting, capitalisation | Modules ESG opérationnels (audit, OTI, justificatifs) | Nouveau module checklist post-collecte (6 sections × ~6 items). Idéal pour QCM « Quel risque si vous ne le faites pas ? ». |
| `csrd/vsme-langage-commun.md` | Données comparables (intensités vs valeurs absolues), répertoire ESG universel | `esg-investissement-durable`, `esg-notation-agences-methodes` | Mettre à jour le module « Comparabilité ESG » avec la VSME comme socle commun et l'effet Value Chain Cap. |

### Thème `zei-rse`

| Document | Sous-thème(s) impacté(s) | Module(s) à enrichir | Action concrète |
|---|---|---|---|
| `zei-offre/plaquette-synthetique-2026.md` | Promesse Zei, mission, chiffres clés 2026, sécurité ISO 27001 | `zei-promesse-donnee-impact`, `zei-valeurs-rigueur-transparence`, `zei-resilience-donnees-rse` | Mettre à jour les chiffres clés (10 ans, 50 employés, **300 clients**, **13 000 entreprises évaluées**, **150 référentiels**, **20 000 indicateurs**). Module sécurité (ISO 27001, OVH, RGPD, RBAC, réversibilité). |
| `zei-offre/proposition-portalp.md` | Cas d'usage Bilan Carbone, architecture fournisseurs, EcoVadis, référentiel personnalisé | `zei-bilan-carbone-consolidation-ia`, `zei-questionnaires-labels-reporting`, `zei-pilotage-plans-actions-contributeurs`, `zei-cas-aqualande-supbiotech` | Étoffer le module « Bilan carbone Zei » avec les 5 étapes BEGES + ACT. Refondre le module « Architecture fournisseurs » (interface dédiée, familles, tableaux de bord). Ajouter un mini-cas Aqualande (1 000 collab., 48 piscicultures, 41 contributeurs). |
| `rse-performance/rse-2025-performance.md` | Témoignages clients (Danone, GreenYellow, Sanofi, Vulcain, Reworld, CMT, Alkar) | `temoignages-et-resultats-mesures`, `zei-temoignages-bpifrance-lfp` | Nouveaux modules « Voix des clients » (verbatims contextualisés). Idéal pour QCM associatif « Qui a dit quoi ? ». |

### Thème `obligations-2025-2026`

| Document | Sous-thème(s) impacté(s) | Module(s) à enrichir | Action concrète |
|---|---|---|---|
| `csrd/vsme-langage-commun.md` | Omnibus février 2025, Value Chain Cap, calendrier d'application | `calendrier-secteurs-csrd`, futurs modules « Omnibus » | Ajouter module dédié à l'**Omnibus** (effets sur CSRD + VSME). Callout « février 2025 — Value Chain Cap ». |
| `rse-performance/rse-2025-performance.md` | Sustainability-Linked Loans (SLL), conditionnement de financement | `taxonomie-europeenne`, `dpef-performance-extra-financiere` | Mettre à jour le module financements verts avec les SLL et les conditions de prêt à impact (citations Romane Vieira / Sabrina Meddahi). |
| `csrd/en-bref-5-csrd.md` | Reporting 2025 (volumes, points XBRL), ESRS sectoriels | `calendrier-secteurs-csrd` | Callout chiffrés (1 700 indicateurs, 4 200 XBRL, 50 000 entreprises Open Source). |

### Thème `rse-marketing`

| Document | Sous-thème(s) impacté(s) | Module(s) à enrichir | Action concrète |
|---|---|---|---|
| `csrd/en-bref-5-csrd.md` | Marque employeur, gain de parts de marché, investissements à impact | Modules « Marque employeur RSE », « Achats durables » | Callout 55 % salariés (engagement RSE > salaire) ; 2 jeunes sur 3 ; 80 % consommateurs ; 62 % grands groupes / ETI neutralité carbone incluant achats. |
| `csrd/vsme-langage-commun.md` | Attractivité / business — chiffres marque employeur | Modules « Marque employeur RSE », « ROI RSE » | Mettre à jour les chiffres : **13 340 €** coût annuel d'un·e salarié·e non motivé·e, **15 %** notation appels d'offres ESG. |
| `rse-performance/rse-2025-performance.md` | Communication ESG, Sustainability-Linked Loans, due diligence ESG | Modules « Communication RSE / preuves » | Nouveau module « De la communication d'intentions à la communication de preuves ». Citation Robin Moysset. |

### Thème `rse`

| Document | Sous-thème(s) impacté(s) | Module(s) à enrichir | Action concrète |
|---|---|---|---|
| `rse-performance/rse-2025-performance.md` | Reconnaissance interdirections, indicateurs économiques RSE, gouvernance ComEx | `rse-performance-business`, `rse-piliers-social-gouvernance` | Refondre le module « ROI RSE » (logique offensive vs défensive, indicateurs composites, monétisation). Callout « 80 % collecte vs 20 % analyse ». |
| `rse-performance/rse-2025-performance.md` (chap. IV) | Projections 2027, harmonisation, exigence d'impact réel | `rse-iso26000-cadre`, `rse-france` | Module « 2027 et après » : standardisation, redevabilité, ancrage local. |
| `esg-collecte/guide-collecte-esg.md` | Acculturation des métiers, animation de communauté, Fresque du Climat | `rse-fondamentaux`, `rse-piliers-social-gouvernance` | Ajouter un module « Animer la RSE en interne » (réseaux, communautés, ambassadeurs). |

## Priorisation des enrichissements (Phases 14-19)

Ordre suggéré pour le re-seeding ciblé, basé sur le couple `priority` × densité d'impact :

1. **Phase 14 — `csrd`** : `en-bref-5-csrd.md` + `vsme-langage-commun.md` (refonte calendrier, double matérialité, VSME, Value Chain Cap).
2. **Phase 15 — `esg`** : `guide-collecte-esg.md` + `checklist-collecte-esg.md` (modules data quality, audit, gouvernance triptyque).
3. **Phase 16 — `zei-rse`** : `plaquette-synthetique-2026.md` + `proposition-portalp.md` (mise à jour chiffres clés, modules sécurité, mini-cas Aqualande).
4. **Phase 17 — `obligations-2025-2026`** : intégration Omnibus / Value Chain Cap depuis `vsme-langage-commun.md` ; SLL depuis `rse-2025-performance.md`.
5. **Phase 18 — `rse-marketing`** : callouts marque employeur depuis `en-bref-5-csrd.md` et chiffres business depuis `vsme-langage-commun.md`.
6. **Phase 19 — `rse`** : refonte « ROI RSE » et nouveau module « 2027 et après » depuis `rse-2025-performance.md`.

## Synchronisation avec l'agent RAG

Les fichiers `.md` ci-dessus sont synchronisés dans `agent/rag/documents/zei/<category>/` via [`scripts/sync-zei-knowledge.sh`](../../scripts/sync-zei-knowledge.sh) (rsync idempotent, sans symlink). L'ingestion réelle dans Qdrant interviendra en **Phase 20**.

Voir aussi : [`agent/rag/documents/README.md`](../../agent/rag/documents/README.md).
