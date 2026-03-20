# Guide pour IA — Template Next.js (UI, sidebar, dashboard)

Document de référence à fournir à une IA lorsque tu travailles sur ta **template Next.js** (hors features métier Growth Machine). L’objectif est de **reproduire les mêmes conventions** : composants UI, navigation, layout dashboard, toasts, et patterns de page type « leads » / « dashboard ».

---

## 1. Stack et récap des dépendances

### Runtime & framework

| Paquet                     | Rôle                |
| -------------------------- | ------------------- |
| `next` 16.x                | App Router, layouts |
| `react` / `react-dom` 19.x | UI                  |
| `typescript`               | Typage              |

### Auth & données

| Paquet                                                  | Rôle                            |
| ------------------------------------------------------- | ------------------------------- |
| `next-auth` 5 (beta)                                    | Sessions, protection des routes |
| `drizzle-orm` + `@neondatabase/serverless` / `postgres` | ORM + Postgres serverless       |
| `@auth/drizzle-adapter`                                 | Adapter Auth ↔ Drizzle          |
| `zod`                                                   | Validation schémas              |

### UI (shadcn / Radix / Tailwind)

| Paquet                                               | Rôle                                          |
| ---------------------------------------------------- | --------------------------------------------- |
| `tailwindcss` 4 + `@tailwindcss/postcss`             | Styles                                        |
| `class-variance-authority`, `clsx`, `tailwind-merge` | Variants + `cn()`                             |
| `radix-ui` + paquets `@radix-ui/react-*`             | Primitives accessibles (dialog, select, etc.) |
| `lucide-react`                                       | Icônes                                        |
| `sonner` + `next-themes`                             | Toasts + thème (clair/sombre)                 |
| `@tanstack/react-table`                              | Tables data-dense                             |
| `recharts`                                           | Graphiques (dashboard)                        |
| `tw-animate-css`                                     | Animations utilitaires                        |

### Outils dev

| Paquet                         | Rôle                       |
| ------------------------------ | -------------------------- |
| `eslint`, `eslint-config-next` | Lint                       |
| `shadcn` (CLI)                 | Ajout de composants shadcn |
| `drizzle-kit`                  | Migrations                 |
| `tsx`                          | Scripts Node en TS         |

Les composants UI vivent sous `components/ui/` (pattern shadcn). Le thème et les tokens (`--primary`, `--chart-*`, sidebar, etc.) sont dans `app/globals.css` (`@theme inline`, variables `:root` / `.dark`).

---

## 2. Boutons (`components/ui/button.tsx`)

### Variants

- **`default`** — action principale (fond primary).
- **`destructive`** — suppression / danger.
- **`outline`** — action secondaire avec bordure.
- **`secondary`** — secondaire discret.
- **`ghost`** — toolbar, lignes de tableau, actions peu visibles.
- **`link`** — style lien.

### Tailles

- Texte : `default` (h-9), `sm` (h-8), `lg` (h-10), `xs` (h-6, texte plus petit).
- Icône seule : `icon`, `icon-sm`, `icon-xs`, `icon-lg` (carrés).

### Bonnes pratiques du projet

1. **`asChild`** — Pour rendre un `Link` Next.js (ou autre élément) avec le style bouton :  
   `<Button asChild><Link href="...">...</Link></Button>`.

2. **États de chargement** — Désactiver le bouton + icône `Loader2` avec `animate-spin` (ex. dashboard campagnes : `disabled={togglingCampaignId === campaign.id}`).

3. **Accessibilité** — Le composant gère `focus-visible`, `aria-invalid`, `disabled:pointer-events-none disabled:opacity-50`. Ne pas retirer ces comportements sans alternative.

4. **Icônes** — Taille SVG harmonisée via classes du bouton (`[&_svg]:size-4` par défaut). Pour `xs`, les SVG peuvent être plus petits automatiquement.

5. **Actions dans les tableaux** — Souvent `variant="ghost"` + `size="icon"` + `className="h-8 w-8"` pour rester compact et aligné aux lignes.

---

## 3. Select, filtres et combobox

### `Select` (Radix, `components/ui/select.tsx`)

- Liste **fermée** d’options connues à l’avance.
- Sur le dashboard : triggers souvent `className="hidden ... sm:flex"` pour le responsive, `aria-label` explicite, `SelectContent` avec `rounded-xl` et `SelectItem` avec `rounded-lg` pour cohérence visuelle.

### `FilterSelect` (`components/ui/filter-select.tsx`)

- Wrapper **opinionated** pour barres d’outils (leads, collections, dashboard campagnes).
- Toujours : `size="sm"` sur le trigger, `h-8`, `min-w-[140px]`, `gap-2`, bordure `border-border/80`, **icône Lucide** à gauche (`icon` + optionnellement `iconColorClass`).
- Enfants : uniquement des `SelectItem` (comme un `Select` classique).

**Quand l’utiliser** : filtres « Statut », « Tri », tout select compact aligné avec d’autres filtres.

### `Combobox` (`components/ui/combobox.tsx`)

- Champ **searchable** : saisie + filtrage client (défaut : `label` contient la recherche, insensible à la casse).
- Fermeture au clic extérieur, **navigation clavier** (↑/↓, Enter, Escape).
- Options : `{ value, label, disabled? }`. Possibilité de `filterFunction` et `onSearchChange` custom.
- Style liste : `z-[100]`, `bg-popover`, `animate-in fade-in-0 zoom-in-95`, `max-h-[300px] overflow-auto`.

**Quand l’utiliser** : longues listes (scrapers, champs dynamiques), pas pour 3–4 choix fixes → préférer `Select` ou `FilterSelect`.

### `FilterInput` (`components/ui/filter-input.tsx`)

- Champ texte **debouncé** (350 ms via `useDebouncedCallback`) pour ne pas spammer les requêtes / le state parent.
- Hauteur `h-8`, `pl-9` pour l’icône absolue à gauche, mêmes bordures que `FilterSelect`.

**Pattern barre d’outils** : `FilterInput` + un ou plusieurs `FilterSelect` dans un `flex flex-wrap items-center gap-2`.

---

## 4. Autres composants UI à respecter

| Composant                                                                     | Usage typique                                                                   |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `Card` + `CardHeader` / `CardTitle` / `CardDescription` / `CardContent`       | Sections de page, blocs dashboard                                               |
| `Table`                                                                       | Données tabulaires ; liens dans les cellules avec `className="hover:underline"` |
| `Badge`                                                                       | Statuts (mapper un objet `Record<status, { label, variant }>`)                  |
| `Progress`                                                                    | Progression fine (`h-2`) + pourcentage en `text-xs text-muted-foreground`       |
| `Pagination`                                                                  | Liste paginée côté serveur (page courante, total pages, callback)               |
| `Skeleton`                                                                    | Chargement : session, stats, graphiques, lignes de tableau                      |
| `Breadcrumb`                                                                  | Header de page ; premier segment souvent `hidden md:block`                      |
| `Separator`                                                                   | Vertical à côté du `SidebarTrigger`                                             |
| `AlertDialog`                                                                 | Confirmations destructives (ex. suppressions sur pages leads/collections)       |
| `Dialog` / `Sheet`                                                            | Formulaires modaux, panneaux                                                    |
| `ChartContainer` + `ChartTooltip` + `ChartLegend` (`components/ui/chart.tsx`) | Graphiques Recharts alignés sur `--chart-1` … `--chart-5`                       |

### Graphiques (dashboard)

- Définir un `chartConfig` avec `satisfies ChartConfig` pour le typage.
- Couleurs via `var(--color-<key>)` générées à partir des clés du config.
- Gradients SVG (`linearGradient` + `fill="url(#...)"`) pour les `AreaChart`.
- Axes : `tickLine={false}`, `axisLine={false}`, `minTickGap` sur `XAxis`.
- Dates affichées en **`fr-FR`** dans les formatters.

---

## 5. Layout dashboard (`app/(dashboard)/layout.tsx` — groupe de routes, URLs inchangées)

Structure à conserver pour un scroll fluide et une sidebar stable :

```tsx
<SidebarProvider>
  <AppSidebar />
  <SidebarInset className="flex h-dvh flex-col overflow-hidden">
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto">
      {children}
    </div>
  </SidebarInset>
</SidebarProvider>
```

- **`h-dvh`** : hauteur viewport, évite les doubles scrollbars parasites.
- **`min-h-0 min-w-0`** : permet aux flex children de rétrécir et de scroller correctement.
- Le contenu scrollable est le **`div` interne**, pas forcément `window` — si tu relies un effet « bordure au scroll » sur `window` (`useScroll`), vérifie que c’est cohérent avec ce conteneur (sinon brancher le listener sur l’élément qui scroll).

---

## 6. Sidebar et navigation

### `AppSidebar` (`components/app-sidebar.tsx`)

- **`collapsible="icon"`** : mode icône replié.
- **Session** : skeleton complet (header, lignes, footer) tant que `useSession().status === "loading"`.
- **Header** : `SidebarMenuButton` `size="lg"` + `asChild` + `Link` vers `/dashboard`, logo `next/image`, titres avec `truncate`.
- **Footer** : notifications + `NavUser` (thème, profil, déconnexion). Gradient avatar optionnel via `/api/user/profile`.
- **`handleNavClick`** : sur mobile ferme le sheet (`setOpenMobile(false)`), sur desktop referme la sidebar étendue (`setOpen(false)`) après navigation — **évite que la sidebar reste ouverte et gêne la lecture**.

### `NavMain` (`components/nav-main.tsx`)

- **`usePathname()`** pour l’état actif (match exact ou préfixe de chemin ; ignore la query pour la comparaison).
- **Sous-menus** : `Collapsible` + `CollapsibleTrigger` avec `ChevronRight` qui tourne quand `open` (`group-data-[state=open]/collapsible:rotate-90`).
- **État ouvert** : `openItems` synchronisé quand la route active est dans une branche — les groupes concernés s’ouvrent au chargement / changement de page.
- **Sidebar repliée en mode icône** : si `state === "collapsed"` et que l’utilisateur ouvre un sous-menu, appeler `setOpen(true)` pour déplier et afficher les sous-liens.
- **Sous-menus imbriqués** : type `SubItem` avec `isCollapsible` + `items[]` pour un troisième niveau (bordure gauche `border-l` sur le nested `SidebarMenuSub`).
- **Tooltips** : `SidebarMenuButton tooltip={item.title}` pour les libellés quand la barre est étroite.

### Header de page (pattern dashboard / leads)

- `sticky top-0 z-10`, `bg-background/95 backdrop-blur`, bordure basse conditionnelle si scroll (`useScroll` + `hasScrolled`).
- `SidebarTrigger`, `Separator` vertical, `Breadcrumb`.
- Classes de sync hauteur avec sidebar repliée :  
  `group-has-data-[collapsible=icon]/sidebar-wrapper:h-12` (comme sur la page dashboard).

---

## 7. Page Dashboard — récap fonctionnel

Fichier : `app/(dashboard)/dashboard/page.tsx` (client component).

### Auth & chargement

- Redirection `/login` si `unauthenticated`.
- Si `status === "loading"` : layout skeleton (header + grille + grand bloc).
- Pas de rendu du contenu principal si `!session`.

### Données et routes API (`app/api/dashboard/`)

| Endpoint                                                               | Rôle                                                          |
| ---------------------------------------------------------------------- | ------------------------------------------------------------- |
| `GET /api/dashboard/stats`                                             | KPIs : leads, companies, collections                          |
| `GET /api/dashboard/chart?timeRange=`                                  | Série temporelle leads + entreprises                          |
| `GET /api/scraper-runs/summary?period=`                                | Total dépensé + runs Apify (`day` / `week` / `month` / `all`) |
| `GET /api/dashboard/spending-chart?timeRange=`                         | Coût + runs réussis/échoués par jour                          |
| `GET /api/dashboard/agent-usage-chart?timeRange=`                      | Coût, tokens, exécutions agents                               |
| `GET /api/dashboard/campaigns-summary?page=&limit=&status=&sortOrder=` | Table campagnes paginée                                       |
| `GET /api/dashboard/activity-chart?timeRange=`                         | Emails envoyés + campagnes actives                            |

### UX métier sur la page

- **Toasts** : `toast.success` / `toast.error` depuis `sonner` après actions API (ex. pause/reprise campagne).
- **Filtres campagnes** : `FilterSelect` + reset page à 1 quand filtre ou tri change.
- **Boutons pause/play** : état local `togglingCampaignId` pour un seul spinner à la fois.
- **États vides** : message centré `text-muted-foreground` dans la zone du graphique ou du tableau.

---

## 8. Toasts et thème

- `Toaster` monté dans `app/layout.tsx` via `components/ui/sonner.tsx`.
- **Important :** Sonner ne définit les variables CSS (`--normal-bg`, etc.) que pour `data-sonner-theme="light"` ou `"dark"`. Si `next-themes` utilise un nom custom (`white`, `light`, etc.), il faut **mapper** vers `light` / `dark` / `system` dans `sonner.tsx`, sinon les toasts restent **sans fond** (transparent).
- `richColors` activé pour succès / erreur / info / warning lisibles.
- Classes optionnelles sur `toastOptions.classNames` (ombre, description `text-muted-foreground`, etc.).

---

## 9. Checklist pour une nouvelle page « comme Leads / Dashboard »

1. **Layout** : sous `(dashboard)`, hériter du `SidebarProvider` + scroll interne.
2. **Header** : `SidebarTrigger`, breadcrumbs, sticky + blur optionnel.
3. **Titres** : `h1` + `text-muted-foreground` pour le sous-texte.
4. **Filtres** : `FilterInput` + `FilterSelect` ; recherche longue liste → `Combobox`.
5. **Actions** : `Button` + `asChild` pour les liens ; `ghost`/`outline` pour densité.
6. **Données** : skeletons pendant fetch ; états vides explicites.
7. **Feedback** : `toast` pour succès/erreur réseau.
8. **Accessibilité** : `aria-label` sur les `SelectTrigger` sans label visible ; conserver focus Radix.
9. **Langue UI** : copy en **français** comme dans le projet actuel.

---

## 10. Fichiers clés à citer dans les prompts IA

| Fichier                              | Contenu                                                   |
| ------------------------------------ | --------------------------------------------------------- |
| `components/ui/button.tsx`           | Variants / tailles boutons                                |
| `components/ui/combobox.tsx`         | Combobox searchable                                       |
| `components/ui/filter-select.tsx`    | Select de filtre compact                                  |
| `components/ui/filter-input.tsx`     | Recherche debouncée                                       |
| `components/nav-main.tsx`            | Logique menu sidebar                                      |
| `components/app-sidebar.tsx`         | Structure nav + données des groupes                       |
| `app/(dashboard)/layout.tsx`         | Shell dashboard (`SidebarProvider`, scroll interne)       |
| `app/(dashboard)/dashboard/page.tsx` | Page d’accueil dashboard (ex. filtres + toasts)         |
| `app/(dashboard)/profile/page.tsx`   | Profil sous le même shell                                 |
| `app/globals.css`                    | Tokens couleur, charts, sidebar                           |
| `hooks/use-scroll.ts`                | `useScroll` (fenêtre) + `useScrollContainer(ref)` pour le layout dashboard |
| `components/dashboard-scroll-area.tsx` | `ref` du conteneur scrollable `(dashboard)` |
| `hooks/use-debounced-callback.ts`   | Debounce pour `FilterInput` |

---

_Ce document décrit l’état du dépôt **Growth Machine** au moment de sa rédaction ; sur ta template seule, adapte les URLs et libellés, mais conserve les patterns ci-dessus pour rester homogène._
