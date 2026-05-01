/**
 * Source de vérité pour la page Ressources (`/ressources`).
 *
 * Chaque `ResourceItem` est rendu en fiche (Card) sur la page, et son `id`
 * sert d'ancre HTML (déclenche le scroll depuis la ToC à droite).
 *
 * Convention de rédaction :
 * - `summary` : 1–2 phrases (chapeau)
 * - `body` : paragraphes (chaque chaîne = un <p>)
 * - `keyPoints` : 3–6 bullets « À retenir » max
 * - `isStub: true` => fiche courte à enrichir ultérieurement
 */

export type ResourceCategory =
  | "regulatory"
  | "esg"
  | "carbon"
  | "rating"
  | "partner";

export type ResourceItem = {
  id: string;
  title: string;
  fullName?: string;
  category: ResourceCategory;
  summary: string;
  body: string[];
  keyPoints?: string[];
  links?: { label: string; href: string }[];
  isStub?: boolean;
};

export const RESOURCE_CATEGORIES: { id: ResourceCategory; label: string }[] = [
  { id: "esg", label: "Concepts ESG" },
  { id: "regulatory", label: "Réglementaire" },
  { id: "carbon", label: "Empreinte carbone" },
  { id: "rating", label: "Notation & labels" },
  { id: "partner", label: "Partenaires ZEI" },
];

/** Clés résolues vers des icônes Lucide dans `resource-category-icons.tsx`. */
export type ResourceCategoryIconKey =
  | "leaf"
  | "scale"
  | "factory"
  | "award"
  | "handshake";

/** Métadonnées UI par catégorie (bordures / pastilles — tokens Tailwind uniquement). */
export const RESOURCE_CATEGORY_UI: Record<
  ResourceCategory,
  {
    iconKey: ResourceCategoryIconKey;
    /** Bordure gauche des cartes (différenciation légère par chart). */
    borderAccentClass: string;
    /** Fond + couleur d’icône pour les pastilles de section et cartes. */
    iconSurfaceClass: string;
  }
> = {
  esg: {
    iconKey: "leaf",
    borderAccentClass: "border-l-chart-1",
    iconSurfaceClass: "bg-chart-1/10 text-chart-1",
  },
  regulatory: {
    iconKey: "scale",
    borderAccentClass: "border-l-chart-2",
    iconSurfaceClass: "bg-chart-2/10 text-chart-2",
  },
  carbon: {
    iconKey: "factory",
    borderAccentClass: "border-l-chart-3",
    iconSurfaceClass: "bg-chart-3/10 text-chart-3",
  },
  rating: {
    iconKey: "award",
    borderAccentClass: "border-l-chart-4",
    iconSurfaceClass: "bg-chart-4/10 text-chart-4",
  },
  partner: {
    iconKey: "handshake",
    borderAccentClass: "border-l-chart-5",
    iconSurfaceClass: "bg-chart-5/10 text-chart-5",
  },
};

export const RESOURCES: ResourceItem[] = [
  // ============================================================
  // CONCEPTS ESG / RSE
  // ============================================================
  {
    id: "rse",
    title: "RSE",
    fullName: "Responsabilité Sociétale des Entreprises",
    category: "esg",
    summary:
      "Démarche volontaire par laquelle une entreprise intègre les enjeux sociaux, environnementaux et de gouvernance dans sa stratégie et ses opérations, au-delà de ses obligations légales.",
    body: [
      "La RSE désigne l'ensemble des pratiques mises en place par une entreprise pour avoir un impact positif sur la société tout en restant économiquement viable. Elle couvre la gouvernance, les conditions de travail, les droits humains, l'environnement, la loyauté des pratiques, les questions relatives aux consommateurs et l'engagement local.",
      "Définie au niveau international par la norme ISO 26000, la RSE n'est pas une certification mais un cadre de pratiques. Elle est de plus en plus encadrée en Europe par des obligations de transparence (CSRD, CS3D), ce qui rend la frontière entre démarche volontaire et conformité réglementaire de plus en plus fine.",
      "Pour une entreprise, structurer sa démarche RSE permet de réduire ses risques, d'attirer talents et clients, d'accéder plus facilement au financement et de répondre aux exigences croissantes des donneurs d'ordre.",
    ],
    keyPoints: [
      "Acronyme : Responsabilité Sociétale (ou Sociale) des Entreprises.",
      "Cadre international : ISO 26000 (7 questions centrales).",
      "Trois piliers : environnement, social, gouvernance — mêmes enjeux que l'ESG, mais vus côté entreprise.",
      "De plus en plus liée à des obligations réglementaires (CSRD, CS3D, devoir de vigilance).",
    ],
  },
  {
    id: "esg",
    title: "ESG",
    fullName: "Environnement, Social, Gouvernance",
    category: "esg",
    summary:
      "Les critères ESG sont les indicateurs extra-financiers utilisés pour évaluer la performance d'une entreprise sur les volets environnement, social et gouvernance.",
    body: [
      "L'ESG est le pendant « investisseurs et marchés » de la RSE : là où la RSE décrit la démarche interne, l'ESG est la grille de lecture utilisée par les agences de notation, les fonds d'investissement, les banques et les donneurs d'ordre pour évaluer une entreprise.",
      "Volet Environnemental : émissions de gaz à effet de serre, consommation d'énergie et d'eau, gestion des déchets, biodiversité, économie circulaire. Volet Social : conditions de travail, santé et sécurité, diversité, formation, droits humains dans la chaîne de valeur. Volet Gouvernance : structure du board, éthique, anti-corruption, transparence fiscale, rémunérations.",
      "Un score ESG résume la performance d'une entreprise sur ces dimensions. Il influence l'accès au capital, la prime de risque, l'éligibilité aux appels d'offres et l'image de marque.",
    ],
    keyPoints: [
      "ESG = grille d'évaluation, RSE = démarche d'entreprise.",
      "Utilisé par investisseurs, banques, donneurs d'ordre et agences de notation.",
      "Indicateurs cadrés par la CSRD côté entreprises et par la SFDR côté finance.",
      "Un bon score ESG améliore l'accès au financement et la résilience.",
    ],
  },
  {
    id: "double-materialite",
    title: "Double matérialité",
    category: "esg",
    summary:
      "Principe central de la CSRD : analyser à la fois l'impact de l'entreprise sur son environnement (matérialité d'impact) et l'impact des enjeux ESG sur l'entreprise (matérialité financière).",
    body: [
      "La double matérialité oblige l'entreprise à regarder dans les deux sens : ce qu'elle fait subir au monde (impacts environnementaux et sociaux de ses activités) et ce que le monde lui fait subir (risques climatiques, sociaux, réglementaires qui pèsent sur sa performance financière).",
      "C'est cette analyse qui permet de sélectionner, parmi les 1 135 datapoints ESRS, ceux qui sont réellement pertinents pour l'entreprise et donc à publier dans son rapport CSRD.",
    ],
    keyPoints: [
      "Matérialité d'impact : effets de l'entreprise sur la société et l'environnement.",
      "Matérialité financière : effets des enjeux ESG sur la performance de l'entreprise.",
      "Étape obligatoire pour cadrer le périmètre du reporting CSRD.",
    ],
    isStub: true,
  },
  {
    id: "odd",
    title: "ODD",
    fullName: "Objectifs de Développement Durable (SDG)",
    category: "esg",
    summary:
      "Les 17 Objectifs de Développement Durable adoptés par l'ONU en 2015, à atteindre d'ici 2030, qui servent de cadre de référence aux stratégies RSE et aux reportings d'impact.",
    body: [
      "Les ODD couvrent la lutte contre la pauvreté, l'égalité, l'éducation, la santé, le climat, la biodiversité, le travail décent, etc. Les entreprises s'en servent pour cartographier leurs contributions et leurs impacts négatifs, et les investisseurs (notamment via la SFDR) les utilisent comme grille de lecture.",
    ],
    keyPoints: [
      "17 objectifs, 169 cibles, échéance 2030.",
      "Cadre volontaire mais largement utilisé en reporting et en marketing RSE.",
    ],
    isStub: true,
  },
  {
    id: "economie-circulaire",
    title: "Économie circulaire",
    category: "esg",
    summary:
      "Modèle économique qui vise à découpler la création de valeur de la consommation de ressources, en boucle (réemploi, réparation, recyclage) plutôt qu'en ligne (extraire-produire-jeter).",
    body: [
      "L'économie circulaire repose sur 7 piliers : approvisionnement durable, écoconception, écologie industrielle et territoriale, économie de la fonctionnalité, consommation responsable, allongement de la durée d'usage, recyclage.",
      "En France, la loi AGEC (2020) en est la principale traduction réglementaire, avec des obligations sur la fin de vie des produits et la lutte contre le gaspillage.",
    ],
    isStub: true,
  },

  // ============================================================
  // RÉGLEMENTAIRE
  // ============================================================
  {
    id: "csrd",
    title: "CSRD",
    fullName: "Corporate Sustainability Reporting Directive",
    category: "regulatory",
    summary:
      "Directive européenne qui impose aux entreprises de publier un rapport de durabilité standardisé, audité, et aligné sur les normes ESRS, en remplacement de la NFRD/DPEF.",
    body: [
      "Adoptée en 2022 et entrée en application progressivement à partir de 2024, la CSRD fait passer le reporting extra-financier d'une logique déclarative à une logique « auditée » comparable au reporting financier. Elle s'applique selon un calendrier par vagues : grandes entreprises cotées d'abord, puis grandes entreprises, puis PME cotées, puis filiales d'entreprises non-européennes.",
      "Le rapport CSRD doit suivre les normes ESRS (European Sustainability Reporting Standards), qui définissent plus de 1 100 datapoints couvrant l'environnement, le social et la gouvernance. La sélection des datapoints à publier dépend de l'analyse de double matérialité menée par l'entreprise.",
      "Le rapport est intégré au rapport de gestion, publié au format numérique XBRL, et soumis à une vérification par un commissaire aux comptes ou un organisme tiers indépendant. Avec la révision Omnibus (2025), les seuils d'application et le calendrier ont été allégés pour réduire la charge sur les entreprises.",
    ],
    keyPoints: [
      "Remplace la NFRD (et donc la DPEF en France).",
      "Reporting basé sur les normes ESRS et la double matérialité.",
      "Audit obligatoire (assurance limitée puis raisonnable).",
      "Format numérique XBRL, intégré au rapport de gestion.",
      "Calendrier et seuils allégés par le règlement Omnibus.",
    ],
  },
  {
    id: "omnibus",
    title: "Omnibus",
    fullName: "Règlement européen Omnibus sur la simplification ESG",
    category: "regulatory",
    summary:
      "Paquet de simplification adopté par la Commission européenne en 2025 pour alléger les obligations CSRD, CS3D et Taxonomie, en relevant les seuils et en repoussant le calendrier.",
    body: [
      "Le règlement Omnibus a été présenté début 2025 par la Commission européenne pour répondre aux critiques sur la complexité et le coût du reporting de durabilité, en particulier pour les ETI et PME. Il modifie en profondeur le périmètre d'application de la CSRD, de la CS3D et du règlement Taxonomie.",
      "Concrètement, Omnibus relève les seuils d'assujettissement à la CSRD (une grande partie des entreprises initialement concernées de la vague 2 sortent du dispositif), repousse les premiers exercices d'application, et simplifie le contenu des datapoints ESRS. La CSRD se rapproche ainsi du référentiel volontaire LSME/VSME pour les plus petites structures.",
      "Pour les entreprises, Omnibus n'est pas un retrait de la CSRD mais un recalibrage : les obligations restent fortes pour les très grandes entreprises, et les exigences des donneurs d'ordre vis-à-vis de leurs fournisseurs n'ont pas changé.",
    ],
    keyPoints: [
      "Adopté en 2025, modifie CSRD, CS3D et Taxonomie.",
      "Relève les seuils et repousse le calendrier d'application.",
      "Simplifie les datapoints ESRS pour les plus petites entreprises.",
      "Ne supprime pas la CSRD : les exigences restent fortes pour les grandes entreprises et la chaîne de valeur.",
    ],
  },
  {
    id: "esrs",
    title: "ESRS",
    fullName: "European Sustainability Reporting Standards",
    category: "regulatory",
    summary:
      "Normes européennes de reporting de durabilité qui définissent le contenu du rapport CSRD : environ 1 135 datapoints répartis en normes transversales et thématiques (E, S, G).",
    body: [
      "Les ESRS comprennent deux normes transversales (ESRS 1 sur les principes généraux, ESRS 2 sur les informations générales), cinq normes environnementales (E1 climat, E2 pollution, E3 eau, E4 biodiversité, E5 économie circulaire), quatre normes sociales (S1 personnel, S2 chaîne de valeur, S3 communautés, S4 consommateurs) et une norme gouvernance (G1).",
      "L'entreprise sélectionne les ESRS à publier en fonction de son analyse de double matérialité.",
    ],
    isStub: true,
  },
  {
    id: "cs3d",
    title: "CS3D",
    fullName: "Corporate Sustainability Due Diligence Directive",
    category: "regulatory",
    summary:
      "Directive européenne sur le devoir de vigilance qui oblige les grandes entreprises à identifier, prévenir et atténuer les atteintes aux droits humains et à l'environnement dans leur chaîne de valeur.",
    body: [
      "La CS3D (ou CSDDD) impose un véritable devoir de vigilance « européen », inspiré de la loi française de 2017. Elle couvre les opérations propres, les filiales et les partenaires commerciaux directs et indirects.",
      "Comme la CSRD, son périmètre a été ajusté par le règlement Omnibus en 2025.",
    ],
    isStub: true,
  },
  {
    id: "sfdr",
    title: "SFDR",
    fullName: "Sustainable Finance Disclosure Regulation",
    category: "regulatory",
    summary:
      "Règlement européen qui impose aux acteurs financiers de publier des informations standardisées sur la durabilité de leurs produits (articles 6, 8, 9) et sur leurs principaux impacts négatifs (PAI).",
    body: [
      "La SFDR vise à lutter contre le greenwashing dans la finance. Les fonds doivent se classer en article 6 (sans intégration ESG), article 8 (promotion de caractéristiques ESG) ou article 9 (objectif d'investissement durable).",
      "Les indicateurs PAI (Principal Adverse Impacts) couvrent émissions GES, biodiversité, droits humains, gouvernance, etc.",
    ],
    isStub: true,
  },
  {
    id: "taxonomie-ue",
    title: "Taxonomie UE",
    fullName: "Règlement Taxonomie verte européenne",
    category: "regulatory",
    summary:
      "Classification européenne des activités économiques durables. Permet de mesurer l'éligibilité et l'alignement d'un chiffre d'affaires, d'un CapEx ou d'un OpEx aux six objectifs environnementaux de l'UE.",
    body: [
      "La Taxonomie définit des critères techniques pour qualifier une activité de « durable » au sens européen. Elle couvre six objectifs : atténuation du climat, adaptation, eau, économie circulaire, pollution, biodiversité.",
      "Les entreprises soumises à la CSRD doivent publier leurs ratios d'éligibilité et d'alignement.",
    ],
    isStub: true,
  },
  {
    id: "dpef",
    title: "DPEF",
    fullName: "Déclaration de Performance Extra-Financière",
    category: "regulatory",
    summary:
      "Ancien dispositif français de reporting extra-financier, transposition de la directive NFRD. Progressivement remplacé par le rapport de durabilité CSRD.",
    body: [
      "La DPEF s'applique aux grandes entreprises françaises depuis 2017. Elle couvre les conséquences sociales, environnementales et sociétales de l'activité, ainsi que les effets sur les droits humains et la lutte contre la corruption.",
      "Pour les entreprises entrant dans le périmètre CSRD, la DPEF est remplacée par le rapport de durabilité aligné sur les ESRS.",
    ],
    isStub: true,
  },
  {
    id: "beges",
    title: "BEGES",
    fullName: "Bilan d'Émissions de Gaz à Effet de Serre",
    category: "regulatory",
    summary:
      "Bilan GES réglementaire français (article L229-25 du Code de l'environnement), obligatoire pour les entreprises de plus de 500 salariés (250 en outre-mer) et les collectivités de plus de 50 000 habitants.",
    body: [
      "Le BEGES couvre obligatoirement les scopes 1 et 2, et de plus en plus les principales émissions du scope 3 depuis la mise à jour BEGES-r. Il doit être publié sur la plateforme de l'ADEME et mis à jour tous les 4 ans (3 ans pour les acteurs publics).",
      "Le non-respect de l'obligation est passible d'une amende administrative pouvant atteindre 50 000 €.",
    ],
    isStub: true,
  },
  {
    id: "lsme-vsme",
    title: "LSME / VSME",
    fullName: "Listed SME / Voluntary SME Standard",
    category: "regulatory",
    summary:
      "Référentiels ESG simplifiés portés par l'EFRAG : LSME pour les PME cotées (obligatoire à terme), VSME pour les PME non cotées (volontaire), pour répondre aux demandes des donneurs d'ordre sans subir tout le poids de la CSRD.",
    body: [
      "Le VSME est un standard volontaire qui permet à une PME de publier un set minimal d'indicateurs ESG, suffisant pour la plupart des questionnaires fournisseurs et des banques. Le LSME, lui, est destiné aux PME cotées et sera obligatoire dans le calendrier CSRD.",
      "Avec Omnibus, la CSRD se rapproche dans les faits du LSME pour beaucoup d'entreprises de taille intermédiaire.",
    ],
    isStub: true,
  },
  {
    id: "agec",
    title: "Loi AGEC",
    fullName: "Loi Anti-Gaspillage pour une Économie Circulaire (2020)",
    category: "regulatory",
    summary:
      "Loi française qui structure la transition vers l'économie circulaire : interdiction des plastiques à usage unique, indice de réparabilité, REP, fin de la destruction des invendus non alimentaires.",
    body: [
      "La loi AGEC impose une cinquantaine de mesures qui montent en puissance jusqu'en 2040, avec des obligations à tous les étages : producteurs (filières REP), distributeurs (vrac, réemploi), consommateurs (information environnementale).",
    ],
    isStub: true,
  },
  {
    id: "article-29-lec",
    title: "Article 29 LEC",
    fullName: "Article 29 de la Loi Énergie-Climat",
    category: "regulatory",
    summary:
      "Disposition française qui impose aux acteurs financiers de publier leur stratégie climat et biodiversité, avec un alignement sur les Accords de Paris et la prise en compte des risques ESG.",
    body: [
      "L'article 29 LEC va plus loin que la SFDR sur certains aspects (biodiversité, alignement 2°C/1,5°C). Il s'applique aux investisseurs institutionnels, sociétés de gestion, banques et assurances opérant en France.",
    ],
    isStub: true,
  },
  {
    id: "pacte-vert",
    title: "Pacte Vert européen",
    fullName: "European Green Deal",
    category: "regulatory",
    summary:
      "Feuille de route adoptée en 2019 pour faire de l'UE le premier continent neutre en carbone d'ici 2050. Cadre parapluie qui chapeaute CSRD, CS3D, Taxonomie, Fit for 55, CBAM, etc.",
    body: [
      "Le Pacte Vert articule des objectifs (-55 % d'émissions en 2030 vs 1990, neutralité en 2050) avec des outils réglementaires : marché carbone (ETS), mécanisme d'ajustement carbone aux frontières (CBAM), normes véhicules, rénovation des bâtiments, finance durable, biodiversité.",
    ],
    isStub: true,
  },

  // ============================================================
  // EMPREINTE CARBONE
  // ============================================================
  {
    id: "scope-1",
    title: "Scope 1",
    fullName: "Émissions directes",
    category: "carbon",
    summary:
      "Émissions de gaz à effet de serre générées directement par les sources que l'entreprise possède ou contrôle : combustion d'énergies fossiles sur site, flotte de véhicules, fuites de fluides frigorigènes, procédés industriels.",
    body: [
      "Le scope 1 regroupe tout ce qui est brûlé ou émis « à l'intérieur des murs » de l'entreprise. Exemples typiques : chaudière au gaz d'un site industriel, voitures et camions de la flotte, fuites de gaz des climatisations, émissions de procédés (cimenterie, chimie).",
      "C'est généralement la partie la plus simple à mesurer car les données sont disponibles en interne (factures de carburant, inventaire de fluides). C'est aussi le scope le plus directement actionnable par l'entreprise via la sobriété, l'électrification et le changement de procédés.",
    ],
    keyPoints: [
      "Émissions « à l'intérieur des murs » de l'entreprise.",
      "Sources : combustion sur site, flotte propre, fluides frigorigènes, procédés.",
      "Données disponibles en interne, facilement mesurables.",
      "Levier d'action direct pour l'entreprise.",
    ],
  },
  {
    id: "scope-2",
    title: "Scope 2",
    fullName: "Émissions indirectes liées à l'énergie",
    category: "carbon",
    summary:
      "Émissions liées à la production de l'électricité, de la vapeur, de la chaleur ou du froid achetés et consommés par l'entreprise. Indirectes pour l'entreprise, mais directes pour son fournisseur d'énergie.",
    body: [
      "Le scope 2 mesure l'empreinte carbone de l'énergie achetée. Le facteur d'émission dépend du mix électrique du pays (très bas en France grâce au nucléaire et à l'hydraulique, beaucoup plus élevé en Pologne ou en Allemagne) et du mode de calcul retenu (location-based vs market-based selon le GHG Protocol).",
      "Les principaux leviers de réduction sont la sobriété énergétique, l'efficacité (équipements, bâtiments), et la souscription d'une électricité verte certifiée (PPA, garanties d'origine).",
    ],
    keyPoints: [
      "Lié à l'achat d'électricité, vapeur, chaleur, froid.",
      "Deux méthodes : location-based (mix moyen) et market-based (contrat).",
      "Très dépendant du mix électrique du pays.",
      "Leviers : sobriété, efficacité énergétique, électricité verte.",
    ],
  },
  {
    id: "scope-3",
    title: "Scope 3",
    fullName: "Autres émissions indirectes",
    category: "carbon",
    summary:
      "Toutes les autres émissions indirectes de la chaîne de valeur, en amont (achats, transport, déplacements) et en aval (utilisation et fin de vie des produits vendus). Souvent 70 à 90 % de l'empreinte totale.",
    body: [
      "Le scope 3 est le plus large et le plus complexe : il couvre 15 catégories selon le GHG Protocol (achats de biens et services, immobilisations, transport amont/aval, déplacements professionnels, trajets domicile-travail, utilisation des produits vendus, fin de vie, investissements, franchises, etc.).",
      "Il représente la majorité de l'empreinte carbone pour la plupart des entreprises de services, du retail et de la finance. C'est aussi le scope le plus difficile à mesurer (données fournisseurs, hypothèses, facteurs d'émission moyens) — d'où l'intérêt des plateformes ESG pour industrialiser la collecte.",
      "Le scope 3 est de plus en plus exigé : par la CSRD via l'ESRS E1, par la SBTi pour fixer des objectifs, et par les donneurs d'ordre dans leurs questionnaires fournisseurs.",
    ],
    keyPoints: [
      "15 catégories GHG Protocol, en amont et en aval de l'entreprise.",
      "Souvent 70–90 % de l'empreinte carbone totale.",
      "Difficile à mesurer (données fournisseurs, hypothèses).",
      "Exigé par CSRD (ESRS E1), SBTi, EcoVadis, donneurs d'ordre.",
    ],
  },
  {
    id: "bilan-carbone",
    title: "Bilan Carbone®",
    category: "carbon",
    summary:
      "Méthode française de comptabilité carbone développée à l'origine par l'ADEME, aujourd'hui portée par l'Association pour la Transition Bas Carbone (ABC). Compatible avec le GHG Protocol et la BEGES.",
    body: [
      "Le Bilan Carbone® couvre les scopes 1, 2 et 3. C'est la méthode de référence en France pour les BEGES réglementaires et pour la plupart des démarches volontaires.",
      "La version 9 (Bilan Carbone v9) intègre les évolutions ISO 14064-1:2018 et facilite l'articulation avec la CSRD.",
    ],
    isStub: true,
  },
  {
    id: "ghg-protocol",
    title: "GHG Protocol",
    fullName: "Greenhouse Gas Protocol",
    category: "carbon",
    summary:
      "Standard international de comptabilité carbone le plus utilisé au monde, qui définit les scopes 1, 2 et 3 et la méthode de calcul des émissions.",
    body: [
      "Le GHG Protocol est piloté par le World Resources Institute (WRI) et le World Business Council for Sustainable Development (WBCSD). Il est la base sur laquelle se sont construites la plupart des autres méthodes (Bilan Carbone, ISO 14064, BEGES).",
    ],
    isStub: true,
  },
  {
    id: "acv",
    title: "ACV",
    fullName: "Analyse du Cycle de Vie",
    category: "carbon",
    summary:
      "Méthode normalisée (ISO 14040/14044) qui évalue les impacts environnementaux d'un produit ou service sur l'ensemble de son cycle de vie : extraction, fabrication, transport, usage, fin de vie.",
    body: [
      "L'ACV est multi-critères (climat, eau, ressources, toxicité…) et multi-étapes. Elle est à la base des affichages environnementaux (note environnementale, écoscore) et des démarches d'écoconception.",
    ],
    isStub: true,
  },
  {
    id: "sbti",
    title: "SBTi",
    fullName: "Science Based Targets initiative",
    category: "carbon",
    summary:
      "Initiative qui valide les objectifs de réduction d'émissions des entreprises selon une trajectoire compatible avec l'Accord de Paris (1,5 °C ou « bien en-dessous de 2 °C »).",
    body: [
      "SBTi propose des méthodologies sectorielles (Net Zero Standard, FLAG pour les secteurs liés aux terres) et un processus de validation indépendant. Avoir des objectifs « SBTi-validés » est devenu un standard pour les grandes entreprises.",
    ],
    isStub: true,
  },
  {
    id: "net-zero",
    title: "Net Zero / Neutralité carbone",
    category: "carbon",
    summary:
      "Objectif d'équilibre entre les émissions résiduelles et les absorptions de carbone (puits naturels ou technologiques). Au niveau d'une entreprise, le Net Zero suit des règles strictes (SBTi Net Zero Standard).",
    body: [
      "La neutralité carbone n'est rigoureuse qu'au niveau planétaire. À l'échelle d'une entreprise, on parle plutôt de trajectoire Net Zero, qui suppose : -90 % d'émissions sur tous les scopes d'ici 2050, et compensation des seules émissions résiduelles via des absorptions permanentes.",
      "Attention au greenwashing : « entreprise neutre en carbone » via simple compensation est désormais interdit dans la communication commerciale en France et en Europe.",
    ],
    isStub: true,
  },

  // ============================================================
  // NOTATION ET LABELS
  // ============================================================
  {
    id: "ecovadis",
    title: "EcoVadis",
    category: "rating",
    summary:
      "Plateforme de notation RSE des fournisseurs (médailles bronze, argent, or, platine), largement utilisée par les grands donneurs d'ordre pour évaluer leur chaîne de valeur.",
    body: [
      "EcoVadis évalue les entreprises sur 4 thèmes : environnement, social et droits humains, éthique, achats responsables. La note synthétique conditionne souvent l'accès aux appels d'offres et aux référencements.",
    ],
    isStub: true,
  },
  {
    id: "iso-26000",
    title: "ISO 26000",
    fullName: "Lignes directrices relatives à la responsabilité sociétale",
    category: "rating",
    summary:
      "Norme internationale (non certifiable) qui définit le cadre de référence de la RSE autour de 7 questions centrales : gouvernance, droits humains, relations de travail, environnement, loyauté des pratiques, consommateurs, communautés.",
    body: [
      "L'ISO 26000 n'est pas une norme de certification mais un guide. Elle sert de socle à la plupart des labels RSE en France (Engagé RSE de l'AFNOR, Lucie, B Corp dans une certaine mesure).",
    ],
    isStub: true,
  },

  // ============================================================
  // PARTENAIRES ZEI
  // ============================================================
  {
    id: "karbonpath",
    title: "Karbonpath",
    category: "partner",
    summary:
      "Partenaire de ZEI. Plateforme de pilotage ESG et de conformité extra-financière, spécialisée dans la CSRD, la double matérialité et la sélection des datapoints ESRS.",
    body: [
      "Karbonpath se présente comme une plateforme de conformité extra-financière et de performance durable qui accompagne l'entreprise de la stratégie ESG jusqu'au reporting de durabilité. L'outil sert à structurer le processus de conformité CSRD, à piloter la performance ESG, et à fiabiliser la collecte de données via l'intégration au système d'information.",
      "On y trouve l'analyse de double matérialité, la définition du périmètre de reporting, la sélection des points de données parmi les 1 135 datapoints ESRS, puis la publication d'un rapport conforme aux exigences CSRD. La plateforme inclut aussi des modules de Carbon Footprint et d'Analyse du Cycle de Vie.",
      "Pour ZEI, Karbonpath renforce la couche de conformité et de gouvernance ESG : il sécurise la traçabilité, l'auditabilité et la fiabilité des données, ce qui est utile pour industrialiser le reporting auprès de clients soumis à la CSRD.",
    ],
    keyPoints: [
      "Positionnement : compliance + pilotage CSRD/ESG.",
      "Double matérialité, périmètre, sélection des datapoints ESRS.",
      "Modules Carbon Footprint et ACV intégrés.",
      "Apport pour ZEI : conformité réglementaire et gouvernance du reporting.",
    ],
  },
  {
    id: "zelio",
    title: "Zelio",
    category: "partner",
    summary:
      "Partenaire de ZEI. Plateforme de comptabilité carbone qui automatise la collecte et le traitement des données via un assistant IA, compatible Bilan Carbone v9, BEGES-r, GHG Protocol, ISO 14064/14069.",
    body: [
      "Zelio met en avant un assistant IA, « Zelia », capable de lire des documents (factures, Excel, CSV, images) et de classer automatiquement les informations carbone. La solution couvre les grands standards de mesure : Bilan Carbone v9, BEGES-r, GHG Protocol, ISO 14069 et ISO 14064.",
      "La plateforme permet de créer un périmètre, répartir les tâches entre collaborateurs, suivre l'avancement d'un projet carbone en temps réel et construire un plan d'action de réduction des émissions avec visualisation de son impact.",
      "Pour ZEI, Zelio apporte une brique très forte sur la partie carbone : si ZEI agrège de la donnée ESG multi-thèmes, Zelio enrichit l'expertise sur le bilan GES, l'automatisation de la collecte et la production de livrables carbone plus rapides et plus homogènes.",
    ],
    keyPoints: [
      "Positionnement : comptabilité carbone IA + plan d'action.",
      "Multi-référentiels : Bilan Carbone v9, BEGES-r, GHG Protocol, ISO 14064/14069.",
      "Assistant IA « Zelia » pour la collecte automatisée.",
      "Apport pour ZEI : profondeur carbone et automatisation de la donnée environnementale.",
    ],
  },
  {
    id: "simpl",
    title: "SIMPL",
    category: "partner",
    summary:
      "Partenaire de ZEI. Plateforme de reporting ESG dédiée au secteur de l'infrastructure, structurée autour des cadres SDG, EU Taxonomy et SFDR PAI, avec suivi de portefeuille et benchmark inter-actifs.",
    body: [
      "SIMPL est structurée autour d'un processus en trois étapes — collecte des données, traitement et analyse — et conçue pour répondre aux contraintes spécifiques des acteurs d'actifs, de fonds et d'entreprises d'infrastructure.",
      "Trois cadres principaux sont intégrés à la plateforme : alignement SDG, conformité EU Taxonomy et indicateurs SFDR PAI. SIMPL permet d'évaluer la contribution d'un actif aux Objectifs de Développement Durable, de calculer son éligibilité et son alignement à la taxonomie européenne, puis de suivre les impacts négatifs principaux exigés par la SFDR.",
      "Pour ZEI, SIMPL apporte une spécialisation sectorielle importante : reporting multi-actifs, comparaison de portefeuille et lecture financière/réglementaire de l'impact, particulièrement utile pour les acteurs de l'infrastructure.",
    ],
    keyPoints: [
      "Positionnement : ESG reporting vertical infrastructure.",
      "Cadres intégrés : SDG, EU Taxonomy, SFDR PAI.",
      "Suivi de portefeuille, benchmark inter-actifs, vues fund/asset/company.",
      "Apport pour ZEI : spécialisation sectorielle infrastructure.",
    ],
  },
];
