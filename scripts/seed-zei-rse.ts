/**
 * Seed script — Thème « ZEI & RSE » (idempotent + --reset)
 * Contenu aligné sur les pages publiques https://zei-world.com/ (vérifier les chiffres et citations au moment du seed).
 * Usage : npx tsx scripts/seed-zei-rse.ts
 * Reset : npx tsx scripts/seed-zei-rse.ts --reset
 */
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, and } from "drizzle-orm";
import {
  quizThemes,
  quizSubthemes,
  quizModules,
  quizLessons,
  quizQuestions,
  quizQuestionOptions,
} from "../lib/schema";

config({ path: ".env" });
config({ path: ".env.local", override: true });

const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(sql);

type ContentBlock =
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; style?: "bullet" | "ordered"; items: string[] }
  | {
      type: "callout";
      variant: "info" | "warning" | "tip" | "important";
      title?: string;
      text: string;
    }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "divider" }
  | {
      type: "regulatory_note";
      year?: number;
      companySize?: "all" | "large" | "sme";
      text: string;
    }
  | { type: "sources"; items: { label: string; url: string }[] };

const THEME_SLUG = "zei-rse";

const SRC = {
  HOME: "https://zei-world.com/",
  TEMOIGNAGES: "https://zei-world.com/temoignages",
  CSRD: "https://zei-world.com/solutions/csrd",
  COMPLIANCE: "https://zei-world.com/solutions/compliance",
  PRICING: "https://zei-world.com/pricing",
  REGISTER: "https://zei-world.com/register",
  PARTNERSHIP: "https://zei-world.com/partnership",
  BUDGET_CHECKER: "https://zei-world.com/resources/esg-budget-checker",
  NAVIGATOR: "https://zei-world.com/resources/esg-navigator",
  CAS_PREVOIR: "https://zei-world.com/guides-infographies/22",
  CAS_APPARTCITY: "https://zei-world.com/guides-infographies/25",
  CAS_AQUALANDE: "https://zei-world.com/guides-infographies/26",
  CAS_SUPBIOTECH: "https://zei-world.com/guides-infographies/27",
  EC_CSRD:
    "https://finance.ec.europa.eu/capital-markets-union-and-financial-markets/company-reporting-and-auditing/company-reporting/corporate-sustainability-reporting_en",
};

function withSources(
  blocks: ContentBlock[],
  items: { label: string; url: string }[]
): ContentBlock[] {
  return [...blocks, { type: "sources", items }];
}

async function getOrCreateTheme(data: {
  slug: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  order: number;
}) {
  const existing = await db
    .select({ id: quizThemes.id })
    .from(quizThemes)
    .where(eq(quizThemes.slug, data.slug));
  if (existing.length > 0) {
    console.log(`  ↩  Thème "${data.slug}" déjà présent (id=${existing[0].id})`);
    return existing[0].id;
  }
  const [row] = await db
    .insert(quizThemes)
    .values({ ...data, isActive: true })
    .returning({ id: quizThemes.id });
  console.log(`  ✓  Thème "${data.slug}" inséré (id=${row.id})`);
  return row.id;
}

async function getOrCreateSubtheme(data: {
  themeId: number;
  slug: string;
  title: string;
  description: string;
  order: number;
}) {
  const existing = await db
    .select({ id: quizSubthemes.id })
    .from(quizSubthemes)
    .where(and(eq(quizSubthemes.themeId, data.themeId), eq(quizSubthemes.slug, data.slug)));
  if (existing.length > 0) return existing[0].id;
  const [row] = await db
    .insert(quizSubthemes)
    .values({ ...data, isActive: true })
    .returning({ id: quizSubthemes.id });
  console.log(`    ✓  Sous-thème "${data.slug}" inséré (id=${row.id})`);
  return row.id;
}

async function getOrCreateModule(data: {
  subthemeId: number;
  slug: string;
  title: string;
  description: string;
  order: number;
  estimatedMinutes: number;
  difficulty: "debutant" | "intermediaire" | "avance";
}) {
  const existing = await db
    .select({ id: quizModules.id })
    .from(quizModules)
    .where(and(eq(quizModules.subthemeId, data.subthemeId), eq(quizModules.slug, data.slug)));
  if (existing.length > 0) return existing[0].id;
  const [row] = await db
    .insert(quizModules)
    .values({ ...data, isActive: true })
    .returning({ id: quizModules.id });
  console.log(`      ✓  Module "${data.slug}" inséré (id=${row.id})`);
  return row.id;
}

async function insertLesson(data: {
  moduleId: number;
  title: string;
  content: ContentBlock[];
  type: "lesson" | "regulatory_update" | "case_study" | "zei_spotlight";
  applicableYear?: number;
  companySize?: "all" | "large" | "sme";
  order: number;
}) {
  const [row] = await db
    .insert(quizLessons)
    .values({
      moduleId: data.moduleId,
      title: data.title,
      content: data.content,
      type: data.type,
      applicableYear: data.applicableYear ?? null,
      companySize: data.companySize ?? "all",
      order: data.order,
    })
    .returning({ id: quizLessons.id });
  return row.id;
}

function opts(
  correct: string,
  w1: string,
  w2: string,
  w3: string
): { text: string; isCorrect: boolean; order: number }[] {
  return [
    { text: w1, isCorrect: false, order: 1 },
    { text: correct, isCorrect: true, order: 2 },
    { text: w2, isCorrect: false, order: 3 },
    { text: w3, isCorrect: false, order: 4 },
  ];
}

async function insertMcq(data: {
  moduleId: number;
  lessonId?: number;
  question: string;
  explanation: string;
  difficulty: "debutant" | "intermediaire" | "avance";
  points: number;
  order: number;
  correct: string;
  wrong: [string, string, string];
}) {
  const [qRow] = await db
    .insert(quizQuestions)
    .values({
      moduleId: data.moduleId,
      lessonId: data.lessonId ?? null,
      question: data.question,
      type: "mcq",
      explanation: data.explanation,
      difficulty: data.difficulty,
      points: data.points,
      order: data.order,
    })
    .returning({ id: quizQuestions.id });

  await db.insert(quizQuestionOptions).values(
    opts(data.correct, data.wrong[0], data.wrong[1], data.wrong[2]).map((o) => ({
      questionId: qRow.id,
      ...o,
    }))
  );
}

type ModSeed = {
  slug: string;
  title: string;
  description: string;
  order: number;
  estimatedMinutes: number;
  difficulty: "debutant" | "intermediaire" | "avance";
  lesson1Title: string;
  lesson1Content: ContentBlock[];
  lesson2Title: string;
  lesson2Content: ContentBlock[];
  questions: Array<{
    question: string;
    explanation: string;
    correct: string;
    wrong: [string, string, string];
    points: number;
    difficulty: "debutant" | "intermediaire" | "avance";
    lessonIdx: 0 | 1 | null;
  }>;
};

async function seedModuleQuick(subthemeId: number, mod: ModSeed) {
  const moduleId = await getOrCreateModule({
    subthemeId,
    slug: mod.slug,
    title: mod.title,
    description: mod.description,
    order: mod.order,
    estimatedMinutes: mod.estimatedMinutes,
    difficulty: mod.difficulty,
  });
  const already = await db
    .select({ id: quizLessons.id })
    .from(quizLessons)
    .where(eq(quizLessons.moduleId, moduleId))
    .limit(1);
  if (already.length > 0) {
    console.log(`      ↩  Leçons déjà présentes — skip contenu module "${mod.slug}"`);
    return;
  }
  const l1 = await insertLesson({
    moduleId,
    order: 1,
    type: "lesson",
    title: mod.lesson1Title,
    content: mod.lesson1Content,
  });
  const l2 = await insertLesson({
    moduleId,
    order: 2,
    type: "lesson",
    title: mod.lesson2Title,
    content: mod.lesson2Content,
  });
  const lids = [l1, l2];
  let ord = 1;
  for (const q of mod.questions) {
    await insertMcq({
      moduleId,
      lessonId: q.lessonIdx === null ? undefined : lids[q.lessonIdx],
      order: ord++,
      question: q.question,
      explanation: q.explanation,
      correct: q.correct,
      wrong: q.wrong,
      points: q.points,
      difficulty: q.difficulty,
    });
  }
}

function qq(
  text: string,
  expl: string,
  cor: string,
  w: [string, string, string],
  pts: number,
  diff: "debutant" | "intermediaire" | "avance",
  li: 0 | 1 | null
) {
  return { question: text, explanation: expl, correct: cor, wrong: w, points: pts, difficulty: diff, lessonIdx: li };
}

// --- Contenu pédagogique (faits issus des pages publiques Zei, avril 2026) ---

const Q8 = (
  prefix: string
): ModSeed["questions"] => [
  qq(
    `${prefix} — Selon la page d’accueil de Zei, la promesse centrale est plutôt :`,
    "Le site affiche « De la donnée à l’impact » et l’optimisation de la gestion ESG.",
    "Centraliser les données ESG et accélérer la performance / l’impact",
    ["Remplacer toute réglementation nationale", "Interdire le Scope 3", "Supprimer les audits tiers"],
    2,
    "debutant",
    0
  ),
  qq(
    `${prefix} — La page d’accueil indique la compatibilité avec combien de référentiels et standards (ordre de grandeur) ?`,
    "Formulation « 100+ référentiels et standards » sur zei-world.com.",
    "Plus d’une centaine",
    ["Exactement trois", "Moins de dix", "Uniquement la taxonomie UE"],
    2,
    "debutant",
    0
  ),
  qq(
    `${prefix} — Quel chiffre d’entreprises utilisatrices est mis en avant sur la page d’accueil ?`,
    "Bloc « +9 000 Entreprises utilisatrices » (section chiffres).",
    "Plus de 9 000 entreprises utilisatrices",
    ["Moins de 100", "Exactement 0", "Uniquement des banques centrales"],
    2,
    "intermediaire",
    1
  ),
  qq(
    `${prefix} — Combien d’indicateurs « clé en main » sont annoncés sur le site ?`,
    "« 8 000 Indicateurs clé en main » sur la page d’accueil.",
    "8 000",
    ["80", "800 000", "8"],
    2,
    "intermediaire",
    1
  ),
  qq(
    `${prefix} — La page d’inscription indique une durée d’essai gratuit de :`,
    "« 15 jours d’essai gratuit sans engagement » sur /register.",
    "15 jours",
    ["1 jour", "3 ans", "30 minutes"],
    1,
    "debutant",
    null
  ),
  qq(
    `${prefix} — Zei annonce-t-elle un score ou diagnostic de maturité ESG ?`,
    "Page d’accueil : « Score ESG Zei » et comparaison à des entreprises comparables.",
    "Oui — Score ESG Zei",
    ["Non, jamais", "Uniquement un audit comptable légal", "Uniquement pour les banques"],
    2,
    "intermediaire",
    0
  ),
  qq(
    `${prefix} — Les logos de reconnaissance affichés sur la page d’accueil incluent notamment :`,
    "Mentions « Soutenu par Bpifrance », « Reconnu par l’ABC », « Membre de Friends of Efrag », « Certifié ISO 27001 ».",
    "Bpifrance, l’ABC Bilan Carbone, Friends of EFRAG et ISO 27001",
    ["NASA et FIFA uniquement", "Uniquement la certification Fairtrade café", "Aucun partenaire institutionnel"],
    3,
    "avance",
    1
  ),
  qq(
    `${prefix} — Pour la CSRD, Zei propose surtout :`,
    "Liens « Reporting CSRD » et « Mise en conformité » vers les pages solutions.",
    "Des parcours de reporting CSRD et de mise en conformité sur la plateforme",
    ["La suppression du devoir de vigilance", "L’exonération fiscale automatique", "Uniquement du marketing sans outil"],
    2,
    "avance",
    1
  ),
];

async function seedZeiRse() {
  const reset = process.argv.includes("--reset");

  if (reset) {
    console.log(`\n🗑️  Mode reset : suppression du thème "${THEME_SLUG}" existant...`);
    const existing = await db
      .select({ id: quizThemes.id })
      .from(quizThemes)
      .where(eq(quizThemes.slug, THEME_SLUG));
    if (existing.length > 0) {
      await db.delete(quizThemes).where(eq(quizThemes.slug, THEME_SLUG));
      console.log("  ✓  Thème supprimé (cascade)\n");
    } else {
      console.log("  (aucun thème trouvé)\n");
    }
  }

  console.log("🌱 Démarrage du seed ZEI & RSE...\n");

  const themeId = await getOrCreateTheme({
    slug: THEME_SLUG,
    title: "ZEI & RSE",
    description:
      "Comprendre Zei comme plateforme ESG : promesse « de la donnée à l’impact », couverture réglementaire et labels, témoignages clients publics et outils gratuits — en s’appuyant sur zei-world.com.",
    icon: "Star",
    color: "#14b8a6",
    order: 6,
  });

  // 1 — Mission et valeurs
  const st1 = await getOrCreateSubtheme({
    themeId,
    slug: "mission-et-valeurs-zei",
    title: "Mission et valeurs de ZEI",
    description:
      "Positionnement public de Zei : pilotage ESG, promesse d’impact, essai gratuit et périmètre fonctionnel annoncé sur le site officiel.",
    order: 1,
  });

  await seedModuleQuick(st1, {
    slug: "zei-promesse-donnee-impact",
    title: "De la donnée à l’impact : mission affichée",
    description: "Synthèse des messages clés de la page d’accueil et de la page d’inscription.",
    order: 1,
    estimatedMinutes: 14,
    difficulty: "debutant",
    lesson1Title: "Tagline et valeur utilisateur sur zei-world.com",
    lesson1Content: withSources(
      [
        { type: "heading", level: 2, text: "« De la donnée à l’impact »" },
        {
          type: "paragraph",
          text: "La page d’accueil de Zei présente la plateforme comme un moyen d’optimiser la gestion ESG et d’accélérer la performance, avec une promesse de centralisation des données et de pilotage des enjeux de durabilité.",
        },
        {
          type: "list",
          style: "bullet",
          items: [
            "Une plateforme unique pour centraliser les données ESG (formulation du site).",
            "Compatibilité annoncée avec plus de 100 référentiels et standards du marché.",
            "Couverture thématique affichée : carbone, CSRD, VSME, Ecovadis, ISO, SBTi, taxonomie, etc.",
          ],
        },
        {
          type: "callout",
          variant: "tip",
          title: "Lecture critique",
          text: "Les chiffres (clients, utilisatrices, indicateurs) évoluent : vérifiez toujours la page d’accueil et les encarts « Quelques chiffres » au moment où vous formez vos équipes.",
        },
      ],
      [
        { label: "Zei — Page d’accueil", url: SRC.HOME },
        { label: "Zei — Créer un compte (essai)", url: SRC.REGISTER },
      ]
    ),
    lesson2Title: "Essai gratuit et promesse de complétude",
    lesson2Content: withSources(
      [
        { type: "heading", level: 2, text: "Tester la plateforme" },
        {
          type: "paragraph",
          text: "La page d’inscription indique 15 jours d’essai gratuit sans engagement et met en avant l’idée de rejoindre un large nombre d’entreprises qui pilotent déjà leur démarche RSE avec Zei (formulation « +10 000 entreprises » sur cette page — le bloc chiffres de l’accueil mentionne « +9 000 entreprises utilisatrices » : deux formulations coexistent sur le site public).",
        },
        {
          type: "callout",
          variant: "info",
          title: "Cohérence interne",
          text: "En formation, citez la source précise (URL) lorsque vous communiquez un chiffre, surtout si les pages ne sont pas strictement alignées.",
        },
      ],
      [
        { label: "Zei — Inscription / essai", url: SRC.REGISTER },
        { label: "Zei — Page d’accueil (chiffres)", url: SRC.HOME },
      ]
    ),
    questions: Q8("Mission"),
  });

  await seedModuleQuick(st1, {
    slug: "zei-valeurs-rigueur-transparence",
    title: "Rigueur, transparence et écosystème",
    description:
      "Reconnaissances affichées (Bpifrance, ABC, EFRAG, ISO 27001) et tonalité « plateforme la plus complète ».",
    order: 2,
    estimatedMinutes: 14,
    difficulty: "intermediaire",
    lesson1Title: "Logos et messages de confiance",
    lesson1Content: withSources(
      [
        { type: "heading", level: 2, text: "Un environnement de confiance" },
        {
          type: "paragraph",
          text: "Zei affiche sur sa page d’accueil un socle de reconnaissance : soutien de Bpifrance, reconnaissance par l’Association Bilan Carbone (ABC), adhésion à Friends of EFRAG, et certification ISO 27001 pour la sécurité de l’information.",
        },
        {
          type: "table",
          headers: ["Élément affiché", "Lecture pour une entreprise cliente"],
          rows: [
            ["ISO 27001", "Attente légitime sur la sécurité des données ESG centralisées."],
            ["Friends of EFRAG", "Alignement avec l’écosystème de reporting européen."],
            ["Bpifrance / ABC", "Validation institutionnelle et crédibilité auprès des parties prenantes françaises."],
          ],
        },
      ],
      [{ label: "Zei — Page d’accueil", url: SRC.HOME }]
    ),
    lesson2Title: "« La plateforme la plus complète du marché »",
    lesson2Content: withSources(
      [
        {
          type: "paragraph",
          text: "Cette formulation marketing figure dans la section « Quelques chiffres ». Elle traduit une stratégie de couverture large (référentiels, secteurs, dépendances de données) plutôt qu’une promesse juridique : à contextualiser lors d’un appel d’offres ou d’une due diligence.",
        },
        {
          type: "list",
          style: "bullet",
          items: [
            "+200 secteurs d’activité recensés (site).",
            "+20 500 dépendances de données intégrées (site).",
            "Veille réglementaire : le site indique que des experts assurent une veille et intègrent les évolutions.",
          ],
        },
      ],
      [{ label: "Zei — Page d’accueil", url: SRC.HOME }]
    ),
    questions: [
      qq(
        "Quelle certification liée à la sécurité de l’information est affichée sur zei-world.com ?",
        "Mention « Certifié ISO 27001 » sur la page d’accueil.",
        "ISO 27001",
        ["ISO 9001 uniquement", "ISO 14001 uniquement", "Aucune certification affichée"],
        2,
        "debutant",
        0
      ),
      qq(
        "Zei indique être membre de quel dispositif lié à EFRAG ?",
        "Bloc « Membre de Friends of Efrag ».",
        "Friends of EFRAG",
        ["Friends of OECD", "GRI uniquement", "Secrétariat ONU"],
        2,
        "debutant",
        0
      ),
      qq(
        "Quel organisme français de soutien est explicitement mentionné sur la page d’accueil ?",
        "« Soutenu par Bpifrance ».",
        "Bpifrance",
        ["La Banque centrale européenne", "L’OMC", "L’Unesco seulement"],
        1,
        "debutant",
        1
      ),
      qq(
        "L’ABC sur le site Zei renvoie à :",
        "Texte « Reconnu par l’ABC » — Association pour la transition bas carbone (Bilan Carbone).",
        "L’Association Bilan Carbone",
        ["L’Agence Bio française", "L’American Basketball Association", "L’Agence britannique du climat"],
        2,
        "intermediaire",
        1
      ),
      qq(
        "Combien de secteurs d’activité sont indiqués dans le bloc chiffres ?",
        "« +200 Secteurs d’activité ».",
        "Plus de 200",
        ["3", "Exactement 50", "Moins de 10"],
        2,
        "intermediaire",
        null
      ),
      qq(
        "La page d’accueil affiche-t-elle un volume de « dépendances de données intégrées » ?",
        "« +20 500 Dépendances de données intégrées ».",
        "Oui, plus de 20 500",
        ["Non", "Uniquement 2", "Uniquement pour le secteur public"],
        3,
        "avance",
        null
      ),
      qq(
        "Sur le volet produit, Zei affirme que les experts assurent :",
        "« Nos experts assurent une veille continue et intègrent chaque évolution ou nouvelle réglementation » (page d’accueil).",
        "Une veille continue et l’intégration des évolutions réglementaires",
        ["L’absence totale de mise à jour", "Uniquement des traductions", "La suppression des questionnaires"],
        2,
        "intermediaire",
        0
      ),
      qq(
        "Pour un discours interne prudent, face à l’expression « plateforme la plus complète », il faut :",
        "Distinguer message marketing et preuves contractuelles / périmètre fonctionnel détaillé.",
        "Citer la source et préciser le contexte (marketing vs engagement contractuel)",
        ["Affirmer une vérité absolue sans nuance", "Interdire tout benchmark", "Remplacer Zei par un tableur"],
        2,
        "avance",
        1
      ),
    ],
  });

  // 2 — Actions RSE concrètes
  const st2 = await getOrCreateSubtheme({
    themeId,
    slug: "actions-rse-concretes-zei",
    title: "Actions RSE concrètes de ZEI",
    description:
      "Fonctionnalités mises en avant : collecte, questionnaires, labels, rapports de durabilité, bilan carbone, consolidation, IA embarquée.",
    order: 2,
  });

  await seedModuleQuick(st2, {
    slug: "zei-questionnaires-labels-reporting",
    title: "Questionnaires, labels et rapports de durabilité",
    description: "Ce que Zei affiche sur la préparation de labels et le reporting CSRD / taxonomie.",
    order: 1,
    estimatedMinutes: 16,
    difficulty: "debutant",
    lesson1Title: "Agréger les questionnaires ESG",
    lesson1Content: withSources(
      [
        { type: "heading", level: 2, text: "Réduire la fragmentation des demandes" },
        {
          type: "paragraph",
          text: "Zei met en avant la problématique des multiples questionnaires ESG (appels d’offres, financement, investisseurs, fournisseurs) et propose d’agréger les données depuis un seul endroit pour se concentrer sur la donnée manquante.",
        },
        {
          type: "callout",
          variant: "tip",
          title: "Effet attendu",
          text: "Le site promet un gain de temps en centralisant la collecte ; la valeur réelle dépend de votre qualité de données et de votre gouvernance interne.",
        },
      ],
      [{ label: "Zei — Page d’accueil (section Questionnaires ESG)", url: SRC.HOME }]
    ),
    lesson2Title: "Plus de 30 labels et rapports CSRD",
    lesson2Content: withSources(
      [
        {
          type: "paragraph",
          text: "La page d’accueil indique « +30 labels disponibles sur Zei » (ISO, Ecovadis, B Corp, Clé verte, PME+, Numérique responsable, etc.) et décrit un parcours de rapport de durabilité couvrant notamment CSRD, SFDR, VSME, taxonomie, DPEF, avec centralisation et réutilisation entre reportings.",
        },
        {
          type: "regulatory_note",
          year: 2026,
          companySize: "all",
          text: "Le cadre CSRD européen est détaillé sur le site de la Commission ; croisez toujours avec vos obligations légales et votre counsel.",
        },
      ],
      [
        { label: "Zei — Page d’accueil", url: SRC.HOME },
        { label: "Zei — Solutions CSRD", url: SRC.CSRD },
        { label: "Commission européenne — Corporate sustainability reporting", url: SRC.EC_CSRD },
      ]
    ),
    questions: [
      qq("Zei indique combien de labels environnementaux / RSE disponibles sur la plateforme (ordre de grandeur) ?", "Formulation « +30 labels disponibles sur Zei ».", "Plus de 30", ["Moins de 5", "Exactement 2", "Aucun label"], 2, "debutant", 1),
      qq("Quels familles d’outils sont citées parmi les labels sur la page d’accueil ?", "Liste incluant ISO, Ecovadis, B Corp, Clé verte, PME+, Numérique responsable.", "ISO, Ecovadis, B Corp, Clé verte, PME+, Numérique responsable", ["Uniquement le label rouge CE", "Uniquement le cahier des charges militaire", "Uniquement les labels textiles japonais"], 3, "intermediaire", 1),
      qq("Pour les rapports de durabilité, le site mentionne notamment :", "Texte « CSRD, SFDR, VSME, Taxonomie, DPEF ».", "CSRD, SFDR, VSME, taxonomie, DPEF", ["Uniquement IFRS S1 sans lien CSRD", "Uniquement le code du travail français", "Uniquement la comptabilité nationale"], 2, "intermediaire", 0),
      qq("Sur la double saisie, Zei affirme sur la page d’accueil :", "« Finie la double saisie ! » dans la section harmonisation.", "Que les données centralisées alimentent plans d’actions et rapports automatisés", ["Qu’il faut tout ressaisir chaque trimestre", "Qu’il n’y a aucune automatisation", "Que seul Excel est supporté"], 2, "debutant", 0),
      qq("Les questionnaires ESG concernent selon Zei :", "Énumération « appels d’offres, financement, investisseurs, fournisseurs ».", "Plusieurs usages métiers (AO, financement, investisseurs, fournisseurs)", ["Uniquement les RH internes", "Uniquement les clubs sportifs", "Uniquement la paie"], 1, "debutant", 0),
      qq("La page solutions « compliance » existe sur le site pour :", "Lien « Mise en conformité » depuis la page d’accueil.", "Accompagner la mise en conformité réglementaire", ["Supprimer toute obligation légale", "Remplacer un avocat", "Geler les données clients"], 2, "intermediaire", 1),
      qq("La réutilisation des données entre reportings est présentée comme :", "« Réutilisées automatiquement entre vos différents reportings, sans double saisie ».", "Automatique entre reportings", ["Impossible sur Zei", "Manuelle uniquement par courrier", "Réservée au bilan carbone Scope 1"], 3, "avance", 1),
      qq("L’URL dédiée aux solutions CSRD sur zei-world.com est :", "Chemin /solutions/csrd.", "https://zei-world.com/solutions/csrd", ["https://zei-world.com/login", "https://zei-world.com/cgu", "https://zei-world.com/404-csrd"], 1, "debutant", null),
    ],
  });

  await seedModuleQuick(st2, {
    slug: "zei-bilan-carbone-consolidation-ia",
    title: "Bilan carbone, consolidation et IA",
    description: "Scopes, consolidation multi-sites et fonctionnalités d’IA annoncées.",
    order: 2,
    estimatedMinutes: 16,
    difficulty: "intermediaire",
    lesson1Title: "Bilan carbone : BEGES, Scope 3, GHG Protocol",
    lesson1Content: withSources(
      [
        {
          type: "paragraph",
          text: "Zei indique que vous pouvez réaliser votre bilan carbone sur le modèle de votre choix (BEGES avec ou sans Scope 3, GHG Protocol, etc.) et utiliser ce socle comme point de départ d’une stratégie RSE « sans double saisie ».",
        },
        {
          type: "list",
          style: "bullet",
          items: [
            "Consolidation interne : collecte depuis filiales, BU, sites, avec niveaux de contrôle et visualisation.",
            "IA embarquée : complétion automatique, reporting conforme, calculs, détection d’erreurs (formulations du site).",
          ],
        },
      ],
      [{ label: "Zei — Page d’accueil", url: SRC.HOME }]
    ),
    lesson2Title: "Gap analysis sur plus de 100 référentiels",
    lesson2Content: withSources(
      [
        {
          type: "paragraph",
          text: "La section « Gap Analysis universelle » indique qu’en fournissant des données ESG historiques, une évaluation des données manquantes peut être obtenue sur plus de 100 référentiels en un import, pour identifier ceux qui correspondent le mieux.",
        },
        { type: "divider" },
        {
          type: "callout",
          variant: "important",
          title: "Responsabilité finale",
          text: "Les algorithmes et imports accélèrent le diagnostic ; la validation métier et juridique reste interne à l’entreprise.",
        },
      ],
      [{ label: "Zei — Page d’accueil", url: SRC.HOME }]
    ),
    questions: [
      qq("Quels référentiels de carbone sont explicitement nommés sur la page d’accueil ?", "BEGES (avec ou sans Scope 3), GHG Protocol.", "BEGES et GHG Protocol", ["NIIF uniquement", "COSO uniquement", "PCI DSS uniquement"], 2, "debutant", 0),
      qq("La consolidation interne sur Zei vise à couvrir :", "Texte sur filiales, BU, sites.", "Plusieurs entités internes (filiales, BU, sites)", ["Uniquement un seul bureau", "Uniquement les clients finaux", "Uniquement les fournisseurs sans filiales"], 2, "debutant", 1),
      qq("L’IA embarquée est décrite comme permettant notamment :", "Liste : complétion automatique, reporting conforme, calculs intelligents, détection des erreurs.", "Complétion automatique et détection d’erreurs", ["La suppression du RGPD", "Le remplacement du conseil d’administration", "L’audit légal des comptes"], 3, "intermediaire", 1),
      qq("La gap analysis universelle repose sur :", "Import de données historiques + évaluation sur +100 référentiels.", "Un import de données historiques", ["Uniquement une déclaration sur l’honneur", "Uniquement un tweet", "Uniquement un PDF scanné illisible"], 2, "intermediaire", 0),
      qq("Zei affiche-t-elle un benchmark RSE ?", "Section « Benchmark RSE » sur la page d’accueil.", "Oui — comparer aux entreprises comparables", ["Non, jamais", "Uniquement hors ligne papier", "Uniquement pour les banques centrales"], 2, "debutant", 1),
      qq("Les rapports « en un clic » impliquent selon le site :", "Mise à jour instantanée quand les données changent.", "Actualisation des rapports lorsque les données évoluent", ["Des rapports figés à vie", "Une impression obligatoire papier", "Aucun export numérique"], 1, "debutant", 1),
      qq("Le Scope 3 est mentionné dans quel contexte ?", "BEGES avec ou sans Scope 3.", "Comme option de périmètre pour le bilan carbone", ["Comme interdit en France", "Comme réservé aux ONG", "Comme synonyme de TVA"], 3, "avance", 0),
      qq("La page d’accueil relie-t-elle conformité et solutions CSRD ?", "Liens vers /solutions/compliance et /solutions/csrd.", "Oui, via des liens dédiés", ["Non", "Uniquement par e-mail", "Uniquement sur LinkedIn"], 1, "debutant", null),
    ],
  });

  // 3 — ZEI et l'intérim responsable (continuité / gouvernance — faits site : consolidation, multi-acteurs)
  const st3 = await getOrCreateSubtheme({
    themeId,
    slug: "zei-et-interim-responsable",
    title: "ZEI et l'intérim responsable",
    description:
      "Réduire le risque de dépendance à une « personne RSE » en centralisant données et workflows : lecture alignée sur les sections consolidation et pilotage du site Zei (sans confondre avec du portage salarial).",
    order: 3,
  });

  await seedModuleQuick(st3, {
    slug: "zei-pilotage-plans-actions-contributeurs",
    title: "Plans d’actions et mobilisation des contributeurs",
    description:
      "Fonctionnalités publiques de type « invitez vos contributeurs » (navigation Solutions / Piloter & Progresser sur zei-world.com).",
    order: 1,
    estimatedMinutes: 14,
    difficulty: "debutant",
    lesson1Title: "Structurer le pilotage quand les équipes changent",
    lesson1Content: withSources(
      [
        {
          type: "paragraph",
          text: "Le site Zei met en avant une boucle « Piloter & Progresser » : définir des plans d’actions, inviter des contributeurs et suivre la progression RSE. Ce type de fonctionnalité réduit la fragilité opérationnelle lors des transitions d’équipe, car les données et tâches vivent dans la plateforme plutôt que dans des fichiers personnels.",
        },
        {
          type: "callout",
          variant: "info",
          title: "Précision",
          text: "Ce module ne décrit pas un service d’intérim de dirigeants RSE : il relie la notion de « continuité » à des capacités produit annoncées sur zei-world.com.",
        },
      ],
      [{ label: "Zei — Page d’accueil (navigation Solutions)", url: SRC.HOME }]
    ),
    lesson2Title: "Vision consolidée pour le management",
    lesson2Content: withSources(
      [
        {
          type: "paragraph",
          text: "La page d’accueil décrit la possibilité d’analyser la progression à plusieurs niveaux (groupe, filiales, fournisseurs) avec une vision globale et détaillée — utile lorsque la gouvernance RSE est partagée ou en recomposition.",
        },
      ],
      [{ label: "Zei — Page d’accueil", url: SRC.HOME }]
    ),
    questions: [
      qq("Dans la navigation publique Zei, « Piloter & Progresser » inclut notamment :", "Texte marketing du site : plans d’actions, contributeurs, progression.", "Plans d’actions et invitation de contributeurs", ["Uniquement la paie", "Uniquement le recrutement intérim dirigeant", "Uniquement la billetterie"], 2, "debutant", 0),
      qq("La consolidation « sur mesure » mentionne quels niveaux ?", "Groupe, filiales, fournisseurs.", "Groupe, filiales, fournisseurs", ["Uniquement un poste Excel", "Uniquement le siège social sans filiales", "Uniquement les actionnaires"], 2, "debutant", 1),
      qq("Intérêt d’une plateforme centralisée en transition d’équipe RSE :", "Réponse pédagogique : réduire la perte de savoir et les silos.", "Préserver données, historique et workflows", ["Supprimer toute traçabilité", "Multiplier les versions contradictoires", "Interdire l’accès aux filiales"], 2, "intermediaire", 0),
      qq("Zei parle-t-elle de diffusion de questionnaires aux entités ?", "Oui, consolidation interne et diffusion.", "Oui — modèles ou questionnaires adaptés", ["Non", "Uniquement par courrier recommandé", "Uniquement pour les particuliers"], 1, "debutant", 1),
      qq("Comparer les résultats par entité est annoncé comme :", "« Comparez les résultats par entité, activité ou taille ».", "Possible selon les contenus publics", ["Impossible", "Réservé au géant Google", "Interdit en Europe"], 2, "intermediaire", 1),
      qq("Ce sous-thème « intérim responsable » dans ce cours signifie surtout :", "Lecture métier : continuité et reprise par d’autres profils.", "Continuité du pilotage grâce à l’outil et aux rôles", ["Du portage salarial Zei", "Un CDD obligatoire chez Zei", "Une mission RH temporaire fournie par Zei"], 3, "avance", 0),
      qq("Les fournisseurs apparaissent dans quel message Zei ?", "Fédérer fournisseurs et filiales, consolidation.", "Dans la consolidation et l’évaluation de chaîne de valeur", ["Uniquement dans les CGU", "Uniquement sur Twitter", "Nulle part"], 2, "intermediaire", null),
      qq("L’URL d’accueil à citer pour ces fonctionnalités est :", "Référence stable.", "https://zei-world.com/", ["https://example.com", "https://zei-world.com/fake", "https://localhost"], 1, "debutant", null),
    ],
  });

  await seedModuleQuick(st3, {
    slug: "zei-resilience-donnees-rse",
    title: "Résilience des données RSE",
    description: "Mises à jour réglementaires sans ressaisie complète selon les messages Zei.",
    order: 2,
    estimatedMinutes: 12,
    difficulty: "intermediaire",
    lesson1Title: "« Pas de saisie supplémentaire » sur données déjà complétées",
    lesson1Content: withSources(
      [
        {
          type: "paragraph",
          text: "Zei indique que lors des évolutions réglementaires, il n’y a pas de saisie supplémentaire sur les données déjà complétées dans la plateforme — ce qui limite le coût de transition lors du changement de responsable projet.",
        },
      ],
      [{ label: "Zei — Page d’accueil (Toujours à jour)", url: SRC.HOME }]
    ),
    lesson2Title: "Harmonisation et contrôle",
    lesson2Content: withSources(
      [
        {
          type: "paragraph",
          text: "Les contenus publics évoquent harmonisation des données, niveaux de contrôle et visualisation pour la consolidation interne — éléments de gouvernance utiles quand plusieurs managers se succèdent.",
        },
      ],
      [{ label: "Zei — Page d’accueil", url: SRC.HOME }]
    ),
    questions: [
      qq("Selon Zei, lors d’une évolution réglementaire :", "Bloc « Toujours à jour ».", "Pas de ressaisie supplémentaire sur les données déjà dans Zei", ["Tout effacer et recommencer", "Interdiction de mise à jour", "Obligation de papier uniquement"], 2, "debutant", 0),
      qq("L’harmonisation sans effort promet surtout :", "« Finie la double saisie » + centralisation.", "Moins de doubles saisies et données centralisées", ["Plus de doubles saisies", "Zéro donnée ESG", "Uniquement du papier"], 2, "debutant", 1),
      qq("La veille est présentée comme assurée par :", "Nos experts (page d’accueil).", "Des experts Zei", ["Uniquement des robots sans humain", "Les utilisateurs seulement", "Aucune veille"], 1, "debutant", 1),
      qq("Un historique consolidé aide surtout lors d’un changement de référent RSE à :", "Raisonnement générique + alignement site.", "Reprendre le fil sans reconstruire tout ex nihilo", ["Tout cacher aux auditeurs", "Supprimer les preuves", "Réinitialiser la mémoire"], 2, "intermediaire", 0),
      qq("La consolidation multi-sites permet selon le site de :", "Comparer par entité, activité, taille.", "Comparer et prioriser", ["Interdire toute comparaison", "Fusionner juridiquement sans acte", "Supprimer les filiales"], 2, "intermediaire", 1),
      qq("Les questionnaires peuvent être diffusés :", "À partir de modèles ou adaptés.", "Via modèles Zei ou adaptations", ["Uniquement en latin", "Sans aucun modèle", "Uniquement par fax"], 2, "avance", 1),
      qq("L’objectif « moins de contraintes, plus d’automatisation » cite :", "IA pour complétion, reporting, calculs, erreurs.", "L’IA pour automatiser des tâches répétitives", ["La suppression du cloud", "L’interdiction d’Excel", "Le remplacement des DAF"], 3, "avance", 0),
      qq("Pour une due diligence, la bonne pratique est :", "Pédagogie générale.", "Confronter les claims marketing au périmètre contractuel et aux preuves", ["Croire toute phrase sans lecture", "Ignorer les CGU", "Ne jamais lire le site"], 1, "intermediaire", null),
    ],
  });

  // 4 — Impact social
  const st4 = await getOrCreateSubtheme({
    themeId,
    slug: "impact-social-zei",
    title: "Impact social de ZEI",
    description:
      "Évaluation de la chaîne de valeur, parties prenantes et messages d’« impact » tels qu’affichés sur zei-world.com.",
    order: 4,
  });

  await seedModuleQuick(st4, {
    slug: "zei-chaine-valeur-parties-prenantes",
    title: "Chaîne de valeur et parties prenantes",
    description: "Diagnostics fournisseurs et parties externes selon les pages publiques.",
    order: 1,
    estimatedMinutes: 14,
    difficulty: "debutant",
    lesson1Title: "Évaluer la chaîne de valeur",
    lesson1Content: withSources(
      [
        {
          type: "paragraph",
          text: "Zei met en avant l’évaluation de l’impact ESG des partenaires externes (fournisseurs, participations, prestataires) via un diagnostic structuré, avec choix entre une évaluation standard Zei ou sur-mesure, et un suivi comparatif pour engager les parties prenantes.",
        },
      ],
      [{ label: "Zei — Page d’accueil", url: SRC.HOME }]
    ),
    lesson2Title: "Score ESG Zei et recommandations",
    lesson2Content: withSources(
      [
        {
          type: "paragraph",
          text: "Le site présente le Score ESG Zei comme basé sur des indicateurs fréquemment utilisés sur le marché, avec comparaison à des entreprises comparables et recommandations issues de référentiels réglementaires, volontaires ou sectoriels.",
        },
      ],
      [{ label: "Zei — Page d’accueil", url: SRC.HOME }]
    ),
    questions: [
      qq("Les diagnostics chaîne de valeur couvrent notamment :", "Fournisseurs, participations, prestataires.", "Fournisseurs, participations, prestataires", ["Uniquement le siège", "Uniquement les concurrents", "Uniquement les clients finaux B2C"], 2, "debutant", 0),
      qq("Deux modes d’évaluation sont proposés sur la page d’accueil :", "Standard Zei ou sur-mesure.", "Standard Zei et sur-mesure", ["Uniquement papier", "Uniquement oral", "Aucun choix"], 2, "debutant", 1),
      qq("Le Score ESG Zei permet notamment :", "Comparer à des entreprises comparables.", "Une comparaison à des entreprises comparables", ["Une interdiction de benchmark", "Un classement FIFA", "Une note de crédit bancaire obligatoire"], 2, "intermediaire", 1),
      qq("Les recommandations du Score ESG sont décrites comme issues de :", "Référentiels réglementaires, volontaires ou sectoriels.", "Plusieurs types de référentiels", ["Uniquement Wikipedia", "Uniquement la météo", "Uniquement la cuisine"], 3, "intermediaire", 0),
      qq("L’objectif affiché d’évaluation fournisseurs inclut :", "Identifier leviers d’amélioration et engager parties prenantes.", "Leviers d’amélioration et engagement", ["Ignorer les fournisseurs", "Réduire le nombre de fournisseurs à zéro sans stratégie", "Supprimer la RSE"], 2, "intermediaire", 1),
      qq("La page d’accueil utilise la notion d’« impact » notamment pour :", "Plusieurs milliers d’entreprises qui améliorent leur impact.", "Décrire l’effet collectif recherché par les utilisateurs de la plateforme", ["Uniquement le marketing sans contenu", "Uniquement le sport", "Uniquement la fiscalité"], 1, "debutant", 0),
      qq("Les parties prenantes externes incluent selon le texte :", "Liste fournisseurs, participations, prestataires.", "Des acteurs externes à l’entreprise cliente", ["Uniquement les actionnaires internes", "Uniquement les salariés Zei", "Personne"], 2, "avance", 0),
      qq("Pour creuser le volet social au sens CSRD, une source institutionnelle complémentaire est :", "Lien Commission.", "Le site de la Commission sur le reporting de durabilité", ["Un blog anonyme", "Un forum sans modération", "Une chaîne YouTube non officielle"], 1, "debutant", null),
    ],
  });

  await seedModuleQuick(st4, {
    slug: "zei-benchmark-impact-collectif",
    title: "Benchmark et dynamique collective",
    description: "Benchmark RSE et messages sur les milliers d’entreprises utilisatrices.",
    order: 2,
    estimatedMinutes: 12,
    difficulty: "intermediaire",
    lesson1Title: "Benchmark RSE",
    lesson1Content: withSources(
      [
        {
          type: "paragraph",
          text: "Zei propose de comparer ses résultats à ceux d’entreprises qui « vous ressemblent » pour se positionner auprès de clients, concurrents et investisseurs — fonctionnalité explicitement nommée « Benchmark RSE » sur la page d’accueil.",
        },
      ],
      [{ label: "Zei — Page d’accueil", url: SRC.HOME }]
    ),
    lesson2Title: "« +9000 entreprises » et dynamique d’adoption",
    lesson2Content: withSources(
      [
        {
          type: "paragraph",
          text: "Un bloc de conversion affiche « +9000 entreprises améliorent leur impact avec Zei » — message d’échelle à relier aux chiffres détaillés du même site (clients vs entreprises utilisatrices) avec rigueur.",
        },
        {
          type: "callout",
          variant: "warning",
          title: "Chiffres",
          text: "La page témoignages affiche aussi « +0 » dans certains blocs dynamiques selon le rendu — privilégiez les formulations fixes de l’accueil pour vos slides internes.",
        },
      ],
      [
        { label: "Zei — Page d’accueil", url: SRC.HOME },
        { label: "Zei — Témoignages", url: SRC.TEMOIGNAGES },
      ]
    ),
    questions: [
      qq("Le benchmark RSE sert à comparer avec :", "Entreprises qui vous ressemblent.", "Des entreprises comparables / qui vous ressemblent", ["Uniquement des États", "Uniquement des animaux", "Aucune donnée"], 2, "debutant", 0),
      qq("Le message « +9000 entreprises » sur la page d’accueil vise à illustrer :", "Adoption large.", "Une base utilisateurs importante", ["Un effectif salarié Zei de 9000 personnes physiques", "9000 produits", "9000 lois"], 1, "debutant", 1),
      qq("Sur la page d’accueil, le nombre de clients est annoncé comme :", "« 300+ clients » dans un bloc logos.", "Plus de 300 clients", ["Zéro client", "Exactement 2", "Moins de 10 sans plus"], 2, "intermediaire", 1),
      qq("Le benchmark s’adresse selon le texte à :", "Clients, concurrents, investisseurs.", "Parties externes à convaincre", ["Uniquement le service postal", "Uniquement les écoles", "Personne"], 2, "intermediaire", 0),
      qq("Comparer les résultats sectoriels relève plutôt de :", "Lecture pédagogique.", "L’analyse concurrentielle et la stratégie RSE", ["La comptabilité stock", "La paie uniquement", "Le droit pénal seul"], 2, "avance", 1),
      qq("L’impact social au sens large inclut souvent :", "Général ESG.", "Parties prenantes, travail, communautés, chaîne de valeur", ["Uniquement le CO2", "Uniquement la couleur du logo", "Uniquement le prix de l’essence"], 1, "debutant", 0),
      qq("La page témoignages liste des :", "Études de cas / guides téléchargeables.", "Cas clients et contenus associés", ["Vidéos uniquement interdites", "Aucun contenu", "Uniquement des emplois"], 2, "intermediaire", null),
      qq("L’URL des témoignages clients Zei est :", "Chemin /temoignages.", "https://zei-world.com/temoignages", ["https://zei-world.com/fake-temoignages", "https://zei-world.com/404", "https://example.net"], 1, "debutant", null),
    ],
  });

  // 5 — Études de cas clients
  const st5 = await getOrCreateSubtheme({
    themeId,
    slug: "etudes-de-cas-clients-zei",
    title: "Études de cas clients ZEI",
    description:
      "Fiches « guides & infographies » et titres publics sur zei-world.com/temoignages.",
    order: 5,
  });

  await seedModuleQuick(st5, {
    slug: "zei-cas-prevoir-appartcity",
    title: "PRÉVOIR et Appart’City",
    description: "Deux cas listés sur la page témoignages avec contenu téléchargeable.",
    order: 1,
    estimatedMinutes: 14,
    difficulty: "intermediaire",
    lesson1Title: "PRÉVOIR — premier rapport de durabilité accéléré",
    lesson1Content: withSources(
      [
        { type: "heading", level: 2, text: "Cas PRÉVOIR" },
        {
          type: "paragraph",
          text: "La page témoignages de Zei met en avant une fiche « PRÉVOIR — Un premier rapport de durabilité en 3 mois top chrono — ou presque », présentée comme contenu téléchargeable.",
        },
        {
          type: "callout",
          variant: "tip",
          title: "Lecture",
          text: "Ouvrez la fiche pour le détail du dispositif ; ici nous ne faisons que citer le titre public tel qu’affiché dans l’index des cas.",
        },
      ],
      [
        { label: "Zei — Étude de cas PRÉVOIR", url: SRC.CAS_PREVOIR },
        { label: "Zei — Témoignages / études de cas", url: SRC.TEMOIGNAGES },
      ]
    ),
    lesson2Title: "Appart’City — structurer la démarche RSE",
    lesson2Content: withSources(
      [
        {
          type: "paragraph",
          text: "Un second cas indexé est intitulé « Appart’City — Comment structurer sa démarche RSE efficacement ? », également proposé comme contenu téléchargeable depuis la même page.",
        },
      ],
      [
        { label: "Zei — Étude de cas Appart’City", url: SRC.CAS_APPARTCITY },
        { label: "Zei — Témoignages", url: SRC.TEMOIGNAGES },
      ]
    ),
    questions: [
      qq("L’étude de cas PRÉVOIR porte surtout sur :", "Titre public sur la page témoignages.", "Un premier rapport de durabilité en environ trois mois", ["Une introduction à la cuisine", "Un logiciel de paie", "Un guide de jardinage"], 2, "debutant", 0),
      qq("L’étude Appart’City traite de :", "Titre public.", "La structuration efficace d’une démarche RSE", ["Uniquement le marketing hôtelier sans RSE", "Uniquement la fiscalité locale", "Uniquement le football"], 2, "debutant", 1),
      qq("Ces contenus sont présentés sur le site comme :", "Mention « Contenu téléchargeable » sur les vignettes.", "Des contenus téléchargeables", ["Des vidéos uniquement en salle de cinéma", "Des livres papier uniquement en magasin", "Aucun accès numérique"], 2, "intermediaire", 1),
      qq("La page parente qui agrège ces cas est :", "URL /temoignages.", "https://zei-world.com/temoignages", ["https://zei-world.com/login", "https://zei-world.com/cgu", "https://zei-world.com/404"], 1, "debutant", null),
      qq("Pour un cas client, la bonne pratique est de :", "Méthode.", "Vérifier la fiche source et citer l’URL Zei", ["Inventer des chiffres", "Copier sans lien", "Omettre l’entreprise"], 2, "intermediaire", 0),
      qq("Les cas clients servent surtout à :", "Pédagogie.", "Illustrer des problématiques réelles de mise en œuvre", ["Remplacer la réglementation", "Garantir un résultat identique pour toutes les entreprises", "Supprimer le besoin d’outil"], 2, "intermediaire", 1),
      qq("Le chemin d’URL des fiches guides utilise :", "Segment guides-infographies.", "Le préfixe /guides-infographies/", ["/fake-guides/", "/api/v0/", "/static/only/"], 2, "avance", null),
      qq("PRÉVOIR et Appart’City sont listés sur :", "Même page d’index.", "La page témoignages / études de cas", ["La page CGU uniquement", "Un sous-domaine non public", "Un forum tiers"], 1, "debutant", 1),
    ],
  });

  await seedModuleQuick(st5, {
    slug: "zei-cas-aqualande-supbiotech",
    title: "Aqualande et SupBiotech",
    description: "Autres cas listés sur la page témoignages.",
    order: 2,
    estimatedMinutes: 14,
    difficulty: "intermediaire",
    lesson1Title: "Groupe Aqualande — la RSE comme réflexe",
    lesson1Content: withSources(
      [
        {
          type: "paragraph",
          text: "La page témoignages propose une fiche « Groupe Aqualande — Quand la RSE devient un réflexe » avec contenu téléchargeable.",
        },
      ],
      [
        { label: "Zei — Étude de cas Aqualande", url: SRC.CAS_AQUALANDE },
        { label: "Zei — Témoignages", url: SRC.TEMOIGNAGES },
      ]
    ),
    lesson2Title: "SupBiotech — entreprise à mission",
    lesson2Content: withSources(
      [
        {
          type: "paragraph",
          text: "Une fiche « SupBiotech — Devenir entreprise à mission : comment SupBiotech pilote sa RSE avec Zei » est également référencée sur la même page d’index.",
        },
      ],
      [
        { label: "Zei — Étude de cas SupBiotech", url: SRC.CAS_SUPBIOTECH },
        { label: "Zei — Témoignages", url: SRC.TEMOIGNAGES },
      ]
    ),
    questions: [
      qq("Le cas Aqualande est décrit sur le site comme :", "Titre public.", "Quand la RSE devient un réflexe", ["Quand la RSE disparaît", "Uniquement un sujet fiscal", "Uniquement un recrutement"], 2, "debutant", 0),
      qq("SupBiotech est associé sur Zei au thème :", "Titre public.", "Devenir entreprise à mission et piloter la RSE avec Zei", ["Uniquement la restauration collective", "Uniquement le transport maritime", "Uniquement la billetterie"], 3, "intermediaire", 1),
      qq("Les quatre organisations PRÉVOIR, Appart’City, Aqualande, SupBiotech sont :", "Index commun.", "Des cas clients listés sur zei-world.com/temoignages", ["Des concurrents directs exclusifs", "Des régulateurs", "Des normes ISO"], 2, "intermediaire", 0),
      qq("L’URL de la fiche Aqualande est :", "Lien public Zei.", "https://zei-world.com/guides-infographies/26", ["https://zei-world.com/guides-infographies/99", "https://zei-world.com/login", "https://example.com"], 1, "debutant", null),
      qq("L’URL de la fiche SupBiotech est :", "Lien public Zei.", "https://zei-world.com/guides-infographies/27", ["https://zei-world.com/guides-infographies/1", "https://zei-world.com/cgu", "https://example.com"], 1, "debutant", null),
      qq("Une « entreprise à mission » au sens français renvoie à :", "Rappel juridique générique (hors contenu Zei).", "Un cadre légal français (loi PACTE) — à croiser avec la fiche Zei", ["Uniquement un label privé Zei", "Uniquement une SARL allemande", "Uniquement une certification ISO 9001"], 2, "avance", 1),
      qq("Les études de cas Zei complètent utilement :", "Synthèse.", "Les témoignages vidéo/texte de la même page", ["Uniquement les CGU", "Uniquement le code postal", "Rien du tout"], 1, "debutant", 1),
      qq("Pour partager en interne, il faut :", "Bonnes pratiques.", "Partager le lien officiel Zei et le titre exact", ["Modifier le titre sans vérification", "Supprimer la source", "Héberger sans permission une ressource payante"], 2, "intermediaire", 0),
    ],
  });

  // 6 — Témoignages et résultats mesurés
  const st6 = await getOrCreateSubtheme({
    themeId,
    slug: "temoignages-et-resultats-mesures",
    title: "Témoignages et résultats mesurés",
    description:
      "Citations clients publiques (Bpifrance, LFP) et outils gratuits (ESG Budget Checker, ESG Navigator).",
    order: 6,
  });

  await seedModuleQuick(st6, {
    slug: "zei-temoignages-bpifrance-lfp",
    title: "Témoignages Bpifrance et Ligue de Football Professionnel",
    description: "Citations telles qu’affichées sur la page d’accueil et la page témoignages.",
    order: 1,
    estimatedMinutes: 14,
    difficulty: "debutant",
    lesson1Title: "Bpifrance — centralisation et fédération",
    lesson1Content: withSources(
      [
        {
          type: "paragraph",
          text: "Estelle Gruson (Responsable RSE, BPI France) est citée sur la page d’accueil : « Zei nous a permis de centraliser toutes nos données ESG, de couvrir un périmètre réglementaire complet, et de bénéficier d’un accompagnement expert tout au long du projet. »",
        },
        {
          type: "paragraph",
          text: "Philippe Kunter (Directeur du Développement Durable, de l’ESG et de la RSE) indique : « Zei nous a permis de fédérer nos participations et d’amorcer cette transformation chez Bpifrance. »",
        },
      ],
      [
        { label: "Zei — Page d’accueil", url: SRC.HOME },
        { label: "Zei — Témoignages", url: SRC.TEMOIGNAGES },
      ]
    ),
    lesson2Title: "LFP — plateforme intuitive",
    lesson2Content: withSources(
      [
        {
          type: "paragraph",
          text: "Mathilde Chamak (Cheffe de projet RSE, Ligue de Football Professionnel) : « Zei, c’est une plateforme intuitive qui centralise et harmonise nos données RSE, avec une équipe très réactive et à l’écoute de nos besoins. » (page d’accueil et page témoignages).",
        },
      ],
      [{ label: "Zei — Page d’accueil", url: SRC.HOME }]
    ),
    questions: [
      qq("Estelle Gruson est citée comme responsable :", "Titre sur la page d’accueil.", "RSE chez BPI France", ["DG chez Zei", "Ministre", "Arbitre FIFA"], 1, "debutant", 0),
      qq("Selon le témoignage Bpifrance (E. Gruson), Zei a permis notamment de :", "Citation.", "Centraliser les données ESG et couvrir un périmètre réglementaire complet", ["Supprimer toute donnée", "Éviter tout accompagnement", "Ignorer la réglementation"], 3, "intermediaire", 0),
      qq("Philippe Kunter met l’accent sur :", "Citation.", "La fédération des participations et le démarrage de la transformation", ["La vente de maillots uniquement", "Uniquement le marketing digital", "La fermeture de Bpifrance"], 2, "intermediaire", 1),
      qq("La LFP souligne notamment :", "Citation M. Chamak.", "Une plateforme intuitive et une équipe réactive", ["Une absence d’outil", "Uniquement du papier", "Aucun suivi RSE"], 2, "debutant", 1),
      qq("Les témoignages vidéo sont signalés sur :", "Page témoignages avec pastille « Vidéo ».", "La page témoignages pour certains clients", ["Uniquement la page d’inscription", "Uniquement les CGU", "Nulle part"], 2, "intermediaire", null),
      qq("Bpifrance et LFP sont cités comme :", "Clients / organisations utilisatrices.", "Organisations clientes de Zei", ["Concurrents de Zei", "Fournisseurs de Zei uniquement", "Régulateurs européens"], 1, "debutant", 1),
      qq("Pour réutiliser une citation publique, il faut :", "Éthique de communication.", "Conserver l’attribution et la source Zei", ["Modifier les noms", "Tronquer sans mention", "Inventer une citation"], 2, "avance", 0),
      qq("L’URL pour « Lire plus de témoignages » sur l’accueil pointe vers :", "Chemin /temoignages.", "https://zei-world.com/temoignages", ["https://zei-world.com/pricing", "https://zei-world.com/register", "https://example.com"], 1, "debutant", null),
    ],
  });

  await seedModuleQuick(st6, {
    slug: "zei-outils-gratuits-chiffres-cles",
    title: "Outils gratuits et chiffres clés",
    description: "Simulateurs et métriques produit affichées sur zei-world.com.",
    order: 2,
    estimatedMinutes: 12,
    difficulty: "debutant",
    lesson1Title: "ESG Budget Checker et ESG Navigator",
    lesson1Content: withSources(
      [
        {
          type: "paragraph",
          text: "Zei propose un « ESG Budget Checker » pour estimer son budget ESG, et un « ESG Navigator » pour clarifier les prochaines démarches — pages dédiées sous /resources/.",
        },
        {
          type: "paragraph",
          text: "La page ESG Navigator indique par exemple que l’outil couvre des obligations réglementaires, des démarches volontaires, et un indicateur Zei unique pour gagner du temps.",
        },
      ],
      [
        { label: "Zei — ESG Budget Checker", url: SRC.BUDGET_CHECKER },
        { label: "Zei — ESG Navigator", url: SRC.NAVIGATOR },
      ]
    ),
    lesson2Title: "Partenariats et accès commerciaux",
    lesson2Content: withSources(
      [
        {
          type: "paragraph",
          text: "Zei maintient une page « partnership » pour les partenariats (cabinets, intégrateurs). Les tarifs et la demande de démo sont accessibles depuis les pages publiques standards du site.",
        },
      ],
      [
        { label: "Zei — Partenariats", url: SRC.PARTNERSHIP },
        { label: "Zei — Tarifs", url: SRC.PRICING },
      ]
    ),
    questions: [
      qq("L’ESG Budget Checker sert à :", "Sous-titre page d’accueil.", "Estimer son budget ESG", ["Calculer uniquement la masse salariale", "Remplacer la comptabilité", "Supprimer le bilan carbone"], 2, "debutant", 0),
      qq("L’ESG Navigator est présenté pour :", "Page resource.", "Clarifier obligations réglementaires et démarches volontaires", ["Remplacer un avocat fiscaliste", "Gérer uniquement les stocks", "Publier des résultats sportifs"], 2, "debutant", 1),
      qq("La page Navigator mentionne un indicateur :", "Texte « indicateur Zei unique ».", "Un indicateur Zei unique", ["Dix mille indicateurs obligatoires", "Aucun indicateur", "Uniquement le PIB"], 2, "intermediaire", 1),
      qq("Le nombre d’indicateurs « clé en main » annoncés sur l’accueil est :", "Bloc chiffres.", "8 000", ["8", "80", "800 000"], 2, "intermediaire", 0),
      qq("Le nombre de référentiels prêts à l’emploi est annoncé comme :", "Bloc conformité.", "Plus de 100", ["Exactement 1", "Moins de 5", "Zéro"], 1, "debutant", 1),
      qq("La page partenariat s’adresse notamment à :", "Texte typique Zei (cabinets, intégrateurs).", "Acteurs qui accompagnent des entreprises sur la RSE / ESG", ["Uniquement les particuliers sans activité", "Uniquement les mineurs", "Uniquement les banques centrales"], 2, "intermediaire", null),
      qq("Pour obtenir les tarifs, le site propose typiquement :", "Navigation standard.", "Une page « Tarifs » / pricing", ["Uniquement un numéro secret", "Aucune information", "Uniquement le dark web"], 1, "debutant", 1),
      qq("L’URL de l’ESG Navigator est :", "Ressource vérifiée.", "https://zei-world.com/resources/esg-navigator", ["https://zei-world.com/resources/fake", "https://zei-world.com/nav", "https://example.com"], 1, "debutant", null),
    ],
  });
}

seedZeiRse()
  .then(() => {
    console.log("\n✅ Seed ZEI & RSE terminé.\n");
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => sql.end({ timeout: 5 }));
