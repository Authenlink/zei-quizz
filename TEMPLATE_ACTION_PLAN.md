# Plan d’action — Template Next.js (apps internes & portails B2B)

Document de référence pour **réorganiser et enrichir** la template selon ton usage réel : applications **internes ou clé en main pour entreprises** (portails partenaires, suivi de leads, vues direction / ops, intégration d’un agent IA), avec parfois des outils **personnels** type growth machine.

---

## 1. Contexte et objectifs

### Ce que tu construis souvent

- **Espace « terrain »** (partenaires, apporteurs, utilisateurs métiers) : soumission de leads, suivi de statuts, historique, parfois chat / IA contextuelle.
- **Espace « siège »** (client final / admin interne) : vue agrégée, filtres, KPIs, tableaux, graphiques, pilotage co-marketing ou ops.
- **Auth forte** : comptes nominatifs, parfois **rôles** ou **tenants** (plusieurs organisations).
- **UI dense** : tableaux, filtres (`FilterInput` / `FilterSelect`), dashboards, états vides, toasts.

### Objectif de la template

Avoir une base **opinionated** qui accélère ce type de projet : structure de dossiers lisible, **deux shells d’interface** (ou plus) quand c’est nécessaire, conventions pour les données et le code métier, sans tout figurer (chaque client reste unique).

---

## 2. Principes directeurs

| Principe | Détail |
|----------|--------|
| **Séparer par *parcours* et *layout*, pas par technologie** | Deux groupes de routes si deux UX distinctes (ex. partenaire vs admin), pas « tout au dashboard » par défaut. |
| **URLs explicites** | Préfixes stables : `/p/...` ou `/partner/...` et `/admin/...` ou `/internal/...` (à trancher une fois pour la template). |
| **Un seul repo, features optionnelles** | La growth machine ou l’IA ne sont pas obligatoires ; la structure doit **accueillir** ces modules sans les imposer. |
| **RBAC tôt dans le modèle** | Même minimal : `role` ou `organizationId` en session + garde sur routes sensibles. |
| **Colocation ou `features/`** | Préférer le code métier près des routes ou dans `features/<domaine>/` plutôt que d’énormes dossiers `components/customer`. |

---

## 3. Architecture cible `app/` (proposition)

> Les noms entre parenthèses sont des **groupes de routes** (invisibles dans l’URL). À adapter à ton vocabulaire métier.

```
app/
  layout.tsx                    # Racine : fonts, providers globaux
  globals.css
  (marketing)/                  # Optionnel : landing publique, legal
    page.tsx
  (auth)/                       # Login, signup, reset — layout minimal
    login/
    signup/
  (portal)/                     # Shell A : utilisateurs « externes » au client
    layout.tsx                  # Sidebar ou header simplifié
    portal/
      page.tsx                  # ex. /portal (home partenaire)
    leads/
    companies/
  (internal)/                   # Shell B : équipe client / back-office
    layout.tsx                  # Sidebar dense, breadcrumbs
    internal/
      page.tsx                  # ex. /internal (overview)
    partners/
    analytics/
  api/
```

**Variante** si tu préfères des préfixes très courts : `(p)/...` → `/p/leads`, `(a)/...` → `/a/partners`.

**À migrer depuis l’existant** : aujourd’hui `(dashboard)` regroupe tout le shell connecté. Le plan est de le **scinder** ou le **renommer** en `(internal)` (ou `(app)`) et d’**ajouter** `(portal)` quand le projet a deux publics.

Pour un projet **100 % interne** (pas de partenaires), un seul groupe `(app)` suffit — la template peut documenter les **deux** et ne générer qu’un seul squelette par défaut.

---

## 4. Composants

| Zone | Rôle |
|------|------|
| `components/ui/` | shadcn / primitives — inchangé. |
| `components/shell/` (ou `layout/`) | `AppSidebar`, en-têtes sticky, wrappers scroll — **un fichier ou variantes** par shell (portal plus léger vs internal complet). |
| `components/shared/` | Blocs réutilisables entre les deux shells (cartes KPI, tableaux génériques, empty states). |
| `features/leads/`, `features/partners/`, etc. | Logique + composants **métier** (formulaires lead, colonnes tableau spécifiques). Créer au fil des projets, pas tout au début. |

Éviter `components/company` / `components/customer` **tant que** la frontière ne correspond pas à deux codebases mentales distinctes ; `portal` vs `internal` (ou `features/*`) est souvent plus clair.

---

## 5. Auth, données, multi-tenant

### Court terme

- Conserver **credentials + JWT** ou session selon ton choix actuel.
- Ajouter en **schéma** (Drizzle) les champs qui reviennent : `role` (enum texte), éventuellement `organizationId` sur `users` ou table `memberships` si un user peut appartenir à plusieurs orgs.

### Moyen terme

- **Middleware** Next : redirection si rôle insuffisant sur préfixe `/internal/*` ou `/portal/*`.
- **Policies** simples : fonctions `canAccessInternal(user)` / `canAccessPortal(user)` centralisées dans `lib/authz.ts`.

### Optionnel (gros clients)

- Tables `organizations`, `organization_members` ; filtrer **toutes** les requêtes API par `organizationId`.

---

## 6. Patterns UI / produit à standardiser dans la template

Déjà en partie dans `UPDATE.md` — à consolider :

- Barre d’outils : `FilterInput` + `FilterSelect` + `Combobox`.
- Pages liste : tableau + pagination serveur + skeletons + empty state.
- Page détail lead / entreprise : layout deux colonnes ou fiche + timeline (exemple minimal dans la template).
- **Chat / IA** : slot optionnel (layout avec panneau latéral ou page dédiée `/portal/assistant`) — route + composant placeholder documenté.

---

## 7. Plan par phases

### Phase 0 — Documentation (0,5 j)

- [ ] Lire ce plan + `UPDATE.md` ; trancher les **préfixes d’URL** par défaut (`/portal` vs `/internal` ou équivalent).
- [ ] Ajouter un schéma ASCII ou Mermaid dans le README : « qui voit quoi ».

### Phase 1 — Restructuration légère (1–2 j)

- [ ] Renommer `(dashboard)` → `(internal)` ou `(app)` **ou** garder le nom mais documenter qu’il = « back-office / utilisateurs internes ».
- [ ] Déplacer `dashboard/page.tsx` vers une route plus neutre si besoin (`/internal`, `/home`, ou garder `/dashboard` comme landing interne).
- [ ] Extraire le shell (sidebar + scroll) dans `components/shell/internal-layout.tsx` (ou équivalent) consommé par le `layout` du groupe.

### Phase 2 — Deuxième shell « portail » (2–4 j)

- [ ] Créer `app/(portal)/layout.tsx` avec navigation **plus simple** (moins d’items, branding partenaire possible).
- [ ] Ajouter 1–2 pages exemple : liste vide + formulaire fictif « nouveau lead ».
- [ ] Middleware : utilisateurs avec `role=partner` → `/portal` ; `role=admin` → `/internal` (exemple commenté si tu ne veux pas l’activer tout de suite).

### Phase 3 — Authz & schéma (2–3 j)

- [ ] Migration Drizzle : `role`, éventuellement `organization_id`.
- [ ] `lib/authz.ts` + utilisation dans les `route.ts` critiques.
- [ ] Aligner le profil / signup si plusieurs types de compte.

### Phase 4 — Blocs réutilisables métier (itéré)

- [ ] Module `features/leads` minimal (types, hooks, 1 composant tableau).
- [ ] Module `features/dashboard-stats` (cartes + hook fetch) branché sur des API factices.
- [ ] Emplacement documenté pour **widget IA** (iframe, chat SDK, ou API route stream).

### Phase 5 — Qualité template (continu)

- [ ] `README` : « Démarrer un nouveau client » (clone, `.env`, `db:push`, créer premier user).
- [ ] Script ou checklist déploiement (Vercel + Neon).
- [ ] Résoudre durablement les versions `@auth/core` / adapter si encore conflictuel au build.

---

## 8. Ce que tu peux ignorer au début

- Multi-tenant complet si tes premiers projets sont mono-org.
- Deux shells si le projet est **uniquement** interne — la template peut shipper seulement `(internal)`.
- Growth machine : garde-la comme **app séparée** ou branche `features/growth` copiée à la demande pour ne pas alourdir le socle.

---

## 9. Prochaine décision à prendre (toi)

1. **Noms d’URL par défaut** pour la template : ex. `/internal/*` + `/portal/*`, ou `/app/*` + `/p/*` ?
2. **Un ou deux shells** dans le repo par défaut : les deux en exemple minimal, ou un seul + dossier `examples/` en commentaire ?

Une fois ces deux points fixés, les phases 1–2 deviennent des tâches mécaniques (déplacements de fichiers + layouts).

---

_Dernière mise à jour : mars 2026 — à ajuster après chaque gros projet client._
