/**
 * Seed script — Thème « ZEI & RSE » (idempotent + --reset)
 * Contenu : docs/zei-knowledge/ (Plaquette, Proposition, guides) + zei-world.com en complément opérationnel.
 * Usage : npx tsx scripts/seed-zei-rse.ts
 * Reset : npx tsx scripts/seed-zei-rse.ts --reset
 */
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, and } from "drizzle-orm";
import { resolveZeiCalloutSourceLinks } from "../lib/zei-callout-resolve-links";
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
      sourceLinks?: { label: string; url: string }[];
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
  /** Sites publics partenaires intégrés (écosystème Zei) */
  KARBONPATH: "https://www.karbonpath.com/",
  ZELIO: "https://zelio-impact.com/",
  SIMPL: "https://www.simpl.tools/",
  BUDGET_CHECKER: "https://zei-world.com/resources/esg-budget-checker",
  NAVIGATOR: "https://zei-world.com/resources/esg-navigator",
  CAS_PREVOIR: "https://zei-world.com/guides-infographies/22",
  CAS_APPARTCITY: "https://zei-world.com/guides-infographies/25",
  CAS_AQUALANDE: "https://zei-world.com/guides-infographies/26",
  CAS_SUPBIOTECH: "https://zei-world.com/guides-infographies/27",
  EC_CSRD:
    "https://finance.ec.europa.eu/capital-markets-union-and-financial-markets/company-reporting-and-auditing/company-reporting/corporate-sustainability-reporting_en",
};

/** URLs complètes — frontmatter `docs/zei-knowledge/` (Hubspot CDN ou Google Slides). */
const SRC_ZEI = {
  PLAQUETTE_2026:
    "https://docs.google.com/presentation/d/1aeOHcN3LXL8z3U8oRkZsYktFwCxGrX4jPzQAN2G8ff8/edit",
  PROPOSITION_PORTALP:
    "https://docs.google.com/presentation/d/1Z_OuSEaTGMupYV79TdMVqXObXSgxlJF1ouojGd9hLB4/edit",
  GUIDE_COLLECTE_ESG:
    "https://4495458.fs1.hubspotusercontent-na1.net/hubfs/4495458/Livres%20blancs/Guide%20Zei%20-%20Collecte%20ESG%20%20arr%C3%AAtez%20de%20bricoler%2c%20commencez%20%C3%A0%20piloter.pdf",
  EN_BREF_5_CSRD:
    "https://4495458.fs1.hubspotusercontent-na1.net/hubfs/4495458/En%20bref/En%20Bref%205%20-%20CSRD%2c%20ce%20que%20vous%20devez%20comprendre%20avant%20vos%20concurrents%20pour%20rester%20comp%C3%A9titifs%20-%20Zei.pdf",
  VSME_LIVRE_BLANC:
    "https://4495458.fs1.hubspotusercontent-na1.net/hubfs/4495458/Livres%20blancs/Zei%20-%20La%20VSME%20expliqu%C3%A9e%20-%20Le%20nouveau%20langage%20commun%20de%20la%20donn%C3%A9es%20ESG%20en%20Europe.pdf",
  RSE_2025_PERFORMANCE:
    "https://4495458.fs1.hubspotusercontent-na1.net/hubfs/4495458/Livres%20blancs/Zei%20-%20En%202025%20comment%20passer%20%C3%A0%20une%20RSE%20de%20performance%20%3F.pdf",
  CHECKLIST_COLLECTE_ESG:
    "https://4495458.fs1.hubspotusercontent-na1.net/hubfs/4495458/Lead%20Magnets/Zei%20-%20Checklist%20Faites%20le%20point%20sur%20votre%20collecte%20ESG.pdf",
};

const APP_ORIGIN = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
const learn = (p: string) => `${APP_ORIGIN}${p.startsWith("/") ? p : `/${p}`}`;

function withSources(
  blocks: ContentBlock[],
  items: { label: string; url: string }[]
): ContentBlock[] {
  return [...blocks, { type: "sources", items }];
}

function zeiCallout(excerpt: string, doc: string): ContentBlock {
  const text = `${excerpt} — Source : ZEI — ${doc}.`;
  const sourceLinks = resolveZeiCalloutSourceLinks({
    title: "Vu par ZEI",
    text,
  });
  return {
    type: "callout",
    variant: "tip",
    title: "Vu par ZEI",
    text,
    ...(sourceLinks.length > 0 ? { sourceLinks } : {}),
  };
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
  lesson1Type?: "lesson" | "regulatory_update" | "case_study" | "zei_spotlight";
  lesson2Title: string;
  lesson2Content: ContentBlock[];
  lesson2Type?: "lesson" | "regulatory_update" | "case_study" | "zei_spotlight";
  lesson3Title?: string;
  lesson3Content?: ContentBlock[];
  lesson3Type?: "lesson" | "regulatory_update" | "case_study" | "zei_spotlight";
  questions: Array<{
    question: string;
    explanation: string;
    correct: string;
    wrong: [string, string, string];
    points: number;
    difficulty: "debutant" | "intermediaire" | "avance";
    lessonIdx: 0 | 1 | 2 | null;
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
    type: mod.lesson1Type ?? "lesson",
    title: mod.lesson1Title,
    content: mod.lesson1Content,
  });
  const l2 = await insertLesson({
    moduleId,
    order: 2,
    type: mod.lesson2Type ?? "lesson",
    title: mod.lesson2Title,
    content: mod.lesson2Content,
  });
  const lids: number[] = [l1, l2];
  if (mod.lesson3Title && mod.lesson3Content) {
    const l3 = await insertLesson({
      moduleId,
      order: 3,
      type: mod.lesson3Type ?? "lesson",
      title: mod.lesson3Title,
      content: mod.lesson3Content,
    });
    lids.push(l3);
  }
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
  li: 0 | 1 | 2 | null
) {
  return { question: text, explanation: expl, correct: cor, wrong: w, points: pts, difficulty: diff, lessonIdx: li };
}

// --- Contenu pédagogique (sources : docs/zei-knowledge + zei-world.com en complément) ---

/** 8 QCM Plaquette 2026 + Guide collecte (traçables). */
const Q8Mission: ModSeed["questions"] = [
  qq(
    "D’après la Plaquette synthétique 2026, quelle est la mission formulée par Zei ?",
    "Source : ZEI — Plaquette synthétique 2026 (« La mission de Zei »).",
    "Accélérer la transition durable des entreprises",
    ["Remplacer toute loi climat", "Vendre uniquement des audits légaux", "Supprimer le Scope 3"],
    2,
    "debutant",
    0
  ),
  qq(
    "Selon le tableau « Zei en bref » (Plaquette 2026), combien d’indicateurs ESG clés en main sont indiqués ?",
    "Source : ZEI — Plaquette synthétique 2026 (tableau des indicateurs).",
    "20 000",
    ["8 000", "200", "2 000"],
    2,
    "intermediaire",
    0
  ),
  qq(
    "La Plaquette 2026 indique la compatibilité avec combien de référentiels et standards (formulation) ?",
    "Source : ZEI — Plaquette synthétique 2026 (sous-titre d’ouverture).",
    "130+ référentiels et standards",
    ["Exactement 12", "Moins de 10", "Un seul label obligatoire"],
    2,
    "debutant",
    0
  ),
  qq(
    "Combien d’entreprises « évaluées » sont indiquées dans le tableau de la Plaquette 2026 ?",
    "Source : ZEI — Plaquette synthétique 2026.",
    "13 000",
    ["9 000 (chiffre marketing site)", "1 000", "130"],
    2,
    "intermediaire",
    0
  ),
  qq(
    "Le Guide collecte ESG (Zei) indique en moyenne quelle répartition du temps d’une direction RSE entre collecte et pilotage / analyse ?",
    "Source : ZEI — Guide collecte ESG. Le volet outillage détaillé est aussi traité dans le thème ESG (collecte).",
    "80 % de temps à collecter, 20 % à analyser et piloter",
    ["50 / 50", "20 % collecte, 80 % analyse", "100 % reporting légal"],
    3,
    "intermediaire",
    0
  ),
  qq(
    "Quel titre de manifeste Zei le Guide collecte ESG associe-t-il à la RSE de pilotage ?",
    "Source : ZEI — Guide collecte ESG (couverture et paradoxe de la donnée ESG).",
    "« Arrêtez de bricoler, commencez à piloter »",
    ["Supprimez d’abord l’ISO 14001", "Déclarez tout en PDF scanné", "Ignorez la double matérialité"],
    2,
    "debutant",
    0
  ),
  qq(
    "La Plaquette 2026 compte combien d’années d’expérience « au service de la transition durable » ?",
    "Source : ZEI — Plaquette synthétique 2026.",
    "10 ans",
    ["2 ans", "30 ans", "0 an"],
    1,
    "debutant",
    0
  ),
  qq(
    "Pour compléter la vision produit, la page d’inscription zei-world.com indique un essai gratuit de :",
    "Source : page publique https://zei-world.com/register (hors Plaquette PDF) — vérifier au moment de l’accès.",
    "15 jours d’essai sans engagement",
    ["1 jour", "24 mois", "30 secondes"],
    1,
    "debutant",
    null
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
      "Zei « de la donnée à l’impact » : mission, chiffres et manifeste (Plaquette 2026, guides), lecture ZEI de la CSRD / VSME, étude de cas type, couverture site zei-world.com en complément.",
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
      "Plaquette synthétique 2026 : promesse, mission, chiffres, secteurs, engagement durabilité versus « infobésité ESG » (Guide collecte).",
    order: 1,
  });

  await seedModuleQuick(st1, {
    slug: "zei-promesse-donnee-impact",
    title: "De la donnée à l’impact : promesse et mission (Plaquette 2026)",
    description: "Chiffres officiels, mission et liens vers le guide « arrêtez de bricoler, commencez à piloter ».",
    order: 1,
    estimatedMinutes: 16,
    difficulty: "debutant",
    lesson1Title: "Promesse, mission et piliers (Plaquette synthétique 2026)",
    lesson1Content: withSources(
      [
        { type: "heading", level: 2, text: "« De la donnée à l’impact. Optimisez votre gestion ESG, accélérez votre performance »" },
        {
          type: "paragraph",
          text: "Zei se présente dans la Plaquette 2026 comme « une plateforme unique pour centraliser les données ESG et piloter tous les enjeux de durabilité », « compatible avec 130+ référentiels et standards du marché ».",
        },
        zeiCallout(
          "L’enjeu : faire passer la durabilité d’un sujet de reporting à un enjeu stratégique — le marché exige des données ESG fiables, la pression réglementaire et médiatique augmente, et l’exécution terrain reste souvent bricolée. Le Guide collecte y répond en invitant à une RSE de pilotage, pas de pur reporting.",
          "Plaquette synthétique 2026 ; Guide collecte ESG (paradoxe de la donnée ESG)"
        ),
        { type: "heading", level: 3, text: "La mission de Zei" },
        {
          type: "paragraph",
          text: "« Accélérer la transition durable des entreprises. » « Zei simplifie la mesure, l’amélioration et la communication de l’impact ESG des entreprises pour en faire un levier de compétitivité majeur. » Trois piliers fondateurs : une méthodologie alignée sur des standards internationaux ; une plateforme souveraine et sécurisée reconnue pour sa qualité et sa fiabilité ; un réseau de partenaires institutionnels.",
        },
        {
          type: "table",
          headers: ["Indicateur", "Valeur (Plaquette 2026)"],
          rows: [
            ["Années d'expérience (transition durable)", "10 ans"],
            ["Employés", "50"],
            ["Clients français et internationaux", "300"],
            ["Entreprises évaluées", "13 000"],
            ["Référentiels prêts à l’emploi, harmonisés", "150"],
            ["Indicateurs ESG clé en main", "20 000"],
          ],
        },
      ],
      [
        { label: "Zei — Plaquette synthétique 2026 (Google Slides)", url: SRC_ZEI.PLAQUETTE_2026 },
        { label: "Zei — Guide collecte ESG (PDF)", url: SRC_ZEI.GUIDE_COLLECTE_ESG },
        { label: "Zei — Site (complément pratique)", url: SRC.HOME },
      ]
    ),
    lesson2Title: "RSE de « reporting » à RSE de pilotage (Guide Zei)",
    lesson2Content: withSources(
      [
        { type: "heading", level: 2, text: "L’épuisement 80/20" },
        {
          type: "paragraph",
          text: "Aujourd’hui, « une direction RSE passe en moyenne 80% de son temps à collecter la donnée (relances, nettoyage de fichiers, vérification des unités) et seulement 20% à l’analyser et à piloter la transformation ». C’est l’exaspération derrière l’infobésité ESG. Passer d’une RSE de « reporting » à une RSE de pilotage est, selon Zei, la seule voie pour l’avenir de l’entreprise.",
        },
        zeiCallout(
          "Dans l’e-learning, le détail opérationnel (triptyque contributeur / valideur / admin, OTI, outillage) est aussi développé dans le thème ESG. Ici : la philosophie d’aggrégation multi-référentiels telle qu’Zei l’inscrit dans le Guide.",
          "Guide collecte ESG"
        ),
      ],
      [
        { label: "Zei — Guide collecte ESG (PDF)", url: SRC_ZEI.GUIDE_COLLECTE_ESG },
        { label: "Zei — Inscription (essai)", url: SRC.REGISTER },
      ]
    ),
    questions: Q8Mission,
  });

  await seedModuleQuick(st1, {
    slug: "zei-valeurs-rigueur-transparence",
    title: "Rigueur, transparence et confiance (Plaquette + Proposition type)",
    description:
      "Engagements sécurité et redevabilité des données (Plaquette 2026) ; mêmes principes rappelés sur une proposition commerciale type Zei.",
    order: 2,
    estimatedMinutes: 14,
    difficulty: "intermediaire",
    lesson1Title: "La plateforme la plus complète : cas d’usage (Plaquette 2026)",
    lesson1Content: withSources(
      [
        { type: "heading", level: 2, text: "Couverture attendue des parties prenantes" },
        {
          type: "paragraph",
          text: "La Plaquette 2026 intitule la section : « La plateforme la plus complète du marché pour répondre aux attentes des parties prenantes ». Cas d’usage listés : Bilan Carbone® ; évaluation d’impact ESG ; préparation à la labellisation ; rapport de durabilité (CSRD, VSME, taxonomie…) ; évaluation des parties prenantes ; structurer / piloter sa démarche RSE.",
        },
        {
          type: "paragraph",
          text: "Secteurs clients cités : BTP, immobilier et gestion foncière ; banque & assurance ; transport & logistique ; industrie, ingénierie et R&D ; commerce & distribution ; IT & logiciels ; conseil et services aux entreprises ; agroalimentaire & agriculture ; santé et service à la personne.",
        },
        zeiCallout(
          "L’e-commerce et le site public ajoutent des chiffres marketing (ex. +9 000 entreprises) : en interne, privilégiez les chiffres Plaquette / livres blancs pour l’alignement RSE 2026.",
          "Plaquette synthétique 2026"
        ),
      ],
      [
        { label: "Zei — Plaquette synthétique 2026 (Google Slides)", url: SRC_ZEI.PLAQUETTE_2026 },
        { label: "Zei — Page d’accueil (complément)", url: SRC.HOME },
      ]
    ),
    lesson2Title: "Nos engagements pour la sécurité (Plaquette + Proposition type Zei)",
    lesson2Content: withSources(
      [
        { type: "heading", level: 2, text: "Sécurité, souveraineté, réversibilité" },
        {
          type: "paragraph",
          text: "La Plaquette 2026 liste notamment : solution SaaS 100% cloud ; évaluation annuelle de vulnérabilité ; certification ISO 27001 ; serveurs hébergés en France (OVH) ; conformité RGPD ; contrôle d’accès basé sur les rôles (RBAC) ; audit sécurité par les clients en avance ; réversibilité des données via exports CSV ou XLS à tout moment.",
        },
        {
          type: "paragraph",
          text: "Ces mêmes engagements (formulations voisines) apparaissent sur un exemple de proposition commerciale Zei (dossier Portalp France) : RBAC avancé, mêmes socles d’hébergement, ISO 27001, réversibilité.",
        },
      ],
      [
        { label: "Zei — Plaquette synthétique 2026 (Google Slides)", url: SRC_ZEI.PLAQUETTE_2026 },
        { label: "Zei — Proposition commerciale type (Google Slides, Portalp France)", url: SRC_ZEI.PROPOSITION_PORTALP },
        { label: "Zei — Page d’accueil (Bpifrance, ABC, EFRAG…)", url: SRC.HOME },
      ]
    ),
    questions: [
      qq(
        "La Plaquette 2026 indique l’hébergement des serveurs :",
        "Source : ZEI — Plaquette synthétique 2026, section « Nos engagements pour la sécurité de vos données ».",
        "En France (OVH)",
        ["En dehors de l’Espace économique européen par défaut", "Chez l’hébergeur du client seulement", "Sans information"],
        2,
        "debutant",
        0
      ),
      qq(
        "La réversibilité telle qu’Zei la communique s’applique notamment par :",
        "Source : ZEI — Plaquette synthétique 2026.",
        "Exports CSV ou XLS à tout moment",
        ["Suppression définitive sans copie de secours", "Oral en réunion de direction uniquement", "Aucun export autorisé"],
        2,
        "intermediaire",
        1
      ),
      qq(
        "Trois piliers de la mission Zei, selon la Plaquette 2026, sont notamment :",
        "Source : ZEI — Plaquette synthétique 2026, « La mission de Zei » (méthodologie, plateforme, partenaires).",
        "Méthodologie, plateforme souveraine et réseau de partenaires institutionnels",
        ["Aucun référentiel, aucun contrôle, aucun client", "Un seul outil feuille Excel", "Droit du travail uniquement"],
        2,
        "debutant",
        0
      ),
      qq(
        "Quel rôle d’accès l’on retrouve dans la Plaquette 2026 pour contrôler les droits d’utilisation de la plateforme ?",
        "Source : ZEI — Plaquette synthétique 2026.",
        "RBAC (contrôle d’accès basé sur les rôles)",
        ["Un seul compte partagé pour tout l’établissement", "Suppression de tout compte hiver", "Aucun contrôle des rôles"],
        2,
        "debutant",
        0
      ),
      qq(
        "Zei affiche sur le site d’accueil une certification liée à la sécurité de l’information (complément) :",
        "Source : ZEI — Plaquette « ISO 27001 » et page https://zei-world.com/ .",
        "Certification ISO 27001",
        ["ISO 9000 sans rapport", "Marque de café", "Aucune mention"],
        1,
        "debutant",
        0
      ),
      qq(
        "Sur zei-world.com, Zei se dit membre d’un dispositif lié à l’écosystème de reporting :",
        "Contenu de la page d’accueil Zei. Source secondaire (site) complément Plaquette.",
        "Friends of EFRAG",
        ["FIFA", "Aucun", "G20 permanent"],
        1,
        "debutant",
        1
      ),
      qq(
        "Dans l’esprit d’une due diligence, face au slogan marketing « la plateforme la plus complète du marché », on conseille de :",
        "Source pédagogique (Plaquette + pratique contractuelle) — ne pas conflire message marketing et périmètre contractuel écrit.",
        "Croiser les claims avec le périmètre contractuel et des preuves d’implémentation",
        ["Croire la phrase telle quelle", "Oublier l’hébergeur", "Ne jamais lire de CGU"],
        2,
        "avance",
        null
      ),
      qq(
        "L’exemple de proposition (Portalp France) mentionne l’hébergement :",
        "Source : ZEI — Exemple de proposition commerciale Zei, section Sécurité des données.",
        "En France, sur OVH, avec certains mêmes engagements (RBAC, ISO 27001, etc.)",
        ["Sans hébergeur nommé", "Bloqué en Corée du Nord", "Aucun engagement ISO"],
        2,
        "intermediaire",
        1
      ),
    ],
  });

  // 2 — Réglementation : lecture ZEI
  const stReg = await getOrCreateSubtheme({
    themeId,
    slug: "reglementation-lecture-zei",
    title: "Réglementation : la lecture ZEI (CSRD / VSME)",
    description: "En Bref 5 — CSRD et La VSME expliquée, en synthèse — pour le détail voir thèmes CSRD, ESG, Obligations 2025-2026.",
    order: 2,
  });

  await seedModuleQuick(stReg, {
    slug: "zei-lecture-csrd-donnees-competitivite",
    title: "En Bref 5 — la CSRD : données et compétitivité",
    description: "Lecture ZEI d’un document « En Bref 5 — CSRD » (volumes, comparabilité, intérêt stratégique).",
    order: 1,
    estimatedMinutes: 14,
    difficulty: "intermediaire",
    lesson1Title: "Charge de pilotage et quantité vs qualité (En Bref 5)",
    lesson1Content: withSources(
      [
        { type: "heading", level: 2, text: "Ordre de grandeur (CSRD) — ce que rappelle Zei" },
        {
          type: "paragraph",
          text: "« La CSRD c'est presque 1.700 indicateurs, et plus de 4.200 points de données XBRL. En moyenne, dans un rapport CSRD, 70% des données demandées sont narratives (qualitatives), et 30% des données demandées sont quantitatives. La nouveauté de la CSRD c'est donc cette partie quantitative, qui existait peu dans les autres règlementations. » Cette partie quantité reste — pour le pilotage — majoritaire dans l’effort, car les qualitatives s’écrient souvent au centre ; « les données quantitatives doivent être consolidées » avec beaucoup de strates (filiales, fournisseurs…).",
        },
        zeiCallout(
          "Cette lecture sert ici d’amorce : le parcours thématique `CSRD` de la plateforme donne le détail (ESRS, calendrier, matérialité, etc.).",
          "Zei — En Bref 5 — CSRD, ce que vous devez comprendre… (PDF)"
        ),
      ],
      [
        { label: "Zei — En Bref 5 — CSRD (PDF, Hubspot)", url: SRC_ZEI.EN_BREF_5_CSRD },
        { label: "E-learning thème « CSRD » (complément interne Zei Quizz)", url: learn("/learn/csrd") },
      ]
    ),
    lesson2Title: "Comparabilité, Open Source, ROI compétitif (En Bref 5)",
    lesson2Content: withSources(
      [
        { type: "heading", level: 2, text: "Avant / avec CSRD (Zei) — bref" },
        {
          type: "table",
          headers: ["Avant", "Avec CSRD"],
          rows: [
            [
              "Sélection de données absolues qui arrangent, peu comparables.",
              "Intensités et ratios pour comparer aux concurrents (données « relatives »).",
            ],
            [
              "Données peu accessibles, PDFs longs.",
              "50 000 entreprises européennes, données ESG en Open Source réutilisables (benchmark) — d’après le texte de Zei sur ce scénario (selon période et acteurs).",
            ],
          ],
        },
        { type: "paragraph", text: "Pour l’e-learning détaillé, suivre le thème CSRD. Source : ZEI — En Bref 5; voir le PDF pour l’explication complète." },
      ],
      [{ label: "Zei — En Bref 5 — CSRD (PDF)", url: SRC_ZEI.EN_BREF_5_CSRD }]
    ),
    questions: [
      qq(
        "D’après l’En Bref 5 (Zei), le rapport CSRD mélange plutôt :",
        "Source : ZEI — en-bref-5-csrd.md, § I (répartition 70% / 30%).",
        "environ 70% de données qualitatives et 30% quantitatives, en moyenne",
        ["30% de qualitatives, 70% de quantitatives, toujours", "0% de narratif", "100% d’Excel"],
        2,
        "debutant",
        0
      ),
      qq(
        "Ordre de grandeur d’indicateurs cités (En Bref 5, Zei) :",
        "Source : ZEI — en-bref-5-csrd, § I.",
        "environ 1.700",
        ["17", "170.000 seulement qualitatives", "7"],
        1,
        "debutant",
        0
      ),
      qq(
        "Pourquoi, selon Zei, le pilotage « pèse » surtout côté quanti ?",
        "Source : ZEI — En Bref 5, § I (explication part quantitative vs part narrative).",
        "Parce que consolider les données quanti engage filiales, fournisseurs et « machine de données »",
        ["Parce qu’il n’y a jamais de Q&A narratif", "Uniquement pour l’Ukraine", "Aucun lien"],
        2,
        "intermediaire",
        0
      ),
      qq(
        "Avec le reporting CSRD, Zei indique l’ouverture Open Source d’environ :",
        "Source : ZEI — en-bref-5, tableau comparatif « Open Source » / 50.000 entreprises (selon formulation du doc). Vérifier le texte intégral en PDF si besoin.",
        "environ 50 000 entreprises européennes, données ESG proposées en accès",
        ["5 entreprises", "0 entreprise, tout secret", "Uniquement les banques d’investissement hébergées hors UE"],
        2,
        "avance",
        1
      ),
      qq(
        "Côté marque employeur, Zei (En Bref 5) rappelle par exemple (étude : Cone) :",
        "Source : ZEI — en-bref-5-csrd, § II.",
        "55% des collaborateurs : engagement RSE plus important que le salaire (selon cette source citée).",
        ["0%", "100% sans RSE seulement", "Uniquement les retraités"],
        1,
        "debutant",
        0
      ),
      qq(
        "Pour le détail ESRS, double matérialité et calendrier, ce parcours e-learning enchaîne plutôt sur :",
        "Lien pédagogique : thème `csrd` de Zei Quizz. Source : enchaînement pédagogique (pas le PDF seul).",
        "le thème CSRD de la plateforme",
        ["le module fiscal TVA seul", "l’e-learning cuisine", "le droit pénal routier"],
        1,
        "debutant",
        1
      ),
      qq(
        "Côté BtoB (En Bref 5), le document cite (grandes entreprises/ETI) :",
        "Source : ZEI — en-bref-5, § II.",
        "62% avec objectif de neutralité carbone incluant les achats (formulation de l’étude / doc Zei).",
        ["0%", "8%", "Tous 100% sans intégrer les achats"],
        1,
        "debutant",
        1
      ),
      qq(
        "Côté consommateurs (ADEME 2019, cité par l’En Bref 5 Zei) :",
        "Source : ZEI — en-bref-5, § II (texte 80% des Français, habitudes de consommation).",
        "environ 80% des Français indiquent avoir modifié des habitudes en faveur d’une conso. plus durable",
        ["0%", "1%", "5% seulement"],
        1,
        "debutant",
        null
      ),
    ],
  });

  await seedModuleQuick(stReg, {
    slug: "zei-lecture-vsme-omnibus-valeur",
    title: "VSME, Omnibus et Value Chain (La VSME expliquée, Zei)",
    description: "Lecture d’entrée de « La VSME expliquée » (EFRAG, Value Chain Cap, #WeAreEurope). Renvois vers thèmes CSRD, Obligations.",
    order: 2,
    estimatedMinutes: 16,
    difficulty: "avance",
    lesson1Title: "VSME Basic, Complémentaire, clause Value Chain (Zei)",
    lesson1Content: withSources(
      [
        { type: "heading", level: 2, text: "L’Omnibus et le « langage commun »" },
        {
          type: "paragraph",
          text: "Depuis l’Omnibus, le reporting durable s’harmonise ; le standard VSME, construit par l’EFRAG, s’impose « comme la colonne vertébrale du futur reporting ESG en Europe ». La Value Chain Cap de l’Omnibus oblige l’alignement des questionnaires fournisseurs / bancaires sur la VSME. Le module « Basic » couvre « environ 80 indicateurs ESG » répartis sur E, S, G. Le module « Complémentaire » est publié (décembre 2024) et pousse l’exercice plus loin, avec plus de narratif et gouvernance. « Sur Zei : le module VSME B est testable en autonomie. » (formulation identique sur le test pour le module C dans le texte d’origine).",
        },
        zeiCallout(
          "L’#WeAreEurope a créé le « Mid Cap » (170 points de données, matérialité, chaîne de valeur…) ; Zei a aussi sa VSME+ — l’e-learning thème Obligations / CSRD détaille les délais.",
          "Zei — La VSME expliquée (PDF) ; thèmes e-learning `csrd` et `obligations-2025-2026` en complément"
        ),
      ],
      [
        { label: "Zei — La VSME expliquée (PDF)", url: SRC_ZEI.VSME_LIVRE_BLANC },
        { label: "E-learning thème « Obligations 2025-2026 » (compl.)", url: learn("/learn/obligations-2025-2026") },
      ]
    ),
    lesson2Title: "Démocratisation VSME et prochaines étapes (Zei)",
    lesson2Content: withSources(
      [
        {
          type: "paragraph",
          text: "Avec l’Omnibus, l’EFRAG structure les modules B et C pour couvrir plusieurs niveaux de maturité ; la Value Chain accélère le réemploi d’un outillage commun. Pour anticiper la maturité, Zei rappelle que l’#WeAreEurope a aussi introduit le « Mid Cap » (170 points de données, structuration Politique/Actions/Objectifs) et sa VSME+ (Basic + Complément + double matérialité + IRO, etc. selon l’ouvrage). Détails d’ingestion produit côté plateforme e-learning = thèmes `csrd` et `esg` — ici, angle « lecture ZEI » seulement.",
        },
        {
          type: "paragraph",
          text: "Citations et chiffres exacts : s’y reporter dans le PDF « La VSME expliquée — Zei » pour les formations qui exigent la référence intégrale (URL ci-dessous, complète).",
        },
      ],
      [
        { label: "Zei — La VSME expliquée (PDF)", url: SRC_ZEI.VSME_LIVRE_BLANC },
        { label: "E-learning thème « CSRD » (compl.)", url: learn("/learn/csrd") },
      ]
    ),
    questions: [
      qq(
        "D’après le livre blanc Zei sur la VSME, le module Basic couvre (ordre de grandeur) :",
        "Source : ZEI — vsme-langage-commun.md, §II.1.",
        "environ 80 indicateurs ESG (Basic)",
        ["800 indicateurs ONU", "2 indicateurs", "0"],
        2,
        "debutant",
        0
      ),
      qq(
        "Tout questionnaire fournisseur ou bancaire doit, selon la Value Chain Cap, être aligné sur :",
        "Source : ZEI — vsme-langage-commun, §I.",
        "le référentiel VSME (Zei : texte de la Value Chain Cap)",
        ["GRI 100% obligatoire pour tout le monde, sans autre règle", "Un seul chiffre par entreprise, sans suivi", "Aucun alignement"],
        2,
        "debutant",
        0
      ),
      qq(
        "Le module Complémentaire de la VSME est, selon Zei, paru en :",
        "Source : ZEI — La VSME expliquée, date exposée (décembre 2024).",
        "décembre 2024",
        ["janvier 2010", "décembre 2099", "hier sans date"],
        1,
        "debutant",
        0
      ),
      qq(
        "Le #WeAreEurope, selon Le VSME expliqué (Zei) : le Mid Cap a à peu près :",
        "Source : ZEI — vsme-langage-commun, §2.3.",
        "environ 170 points de données (Zei ; moitié quanti selon l’ouvrage)",
        ["0 point", "10 000 points toutes PME d’un coup", "80 points, sans jamais varier"],
        2,
        "intermediaire",
        0
      ),
      qq(
        "Dans la VSME+, Zei y inclut notamment :",
        "Source : ZEI — La VSME expliquée, §2.3 (VSME+).",
        "Totalité modules Basic + Complémentaire, double matérialité, IRO, gouvernance, etc. (détail = PDF).",
        ["0 module", "Un module sans données", "Un seul chiffre"],
        2,
        "avance",
        0
      ),
      qq(
        "Pour l’E-learning Zei, ce module sert surtout à :",
        "Lien pédagogique. Source : commentaire pédagogique (pas de nouvelle donnée de marché).",
        "lire l’essentiel avant d’ouvrir les thèmes CSRD / ESG / Obligations",
        ["Remplacer un juge administratif", "Déclarer fiscalement à la place du client", "Bloquer tout export PDF"],
        1,
        "debutant",
        0
      ),
      qq(
        "La flexibilité « on peut ignorer certains indicateurs sans non-matérialité » s’adresse, dans le texte, au module :",
        "Source : ZEI — La VSME expliquée, §2.1 (nature de la flexibilité Basic). Lire l’ouvrage pour l’alinea exact (norme volontaire, etc.).",
        "Basic (Zei) — lire l’ouvrage pour l’alinea de souplesse (volontariisme).",
        ["Déclaration TVA 3310", "Aucun module de la planète", "Bilan comptable IFRS 18"],
        1,
        "debutant",
        0
      ),
      qq(
        "Quand la VSME, selon l’ouvrage Zei, a été en particulier en avant (édition) :",
        "Source : ZEI — La VSME expliquée, §2.4 (mise en avant, Produrable 2025, Omnibus).",
        "édition 2025 de Produrable (Zei) — lire l’ouvrage pour l’enchaînement exact (Omnibus / incertitude CSRD).",
        ["En 2010 seulement", "Uniquement hors Europe", "Sans aucun lien Omnibus"],
        1,
        "intermediaire",
        1
      ),
    ],
  });

  // 3 — Actions RSE concrètes
  const st2 = await getOrCreateSubtheme({
    themeId,
    slug: "actions-rse-concretes-zei",
    title: "Actions RSE concrètes de ZEI",
    description:
      "Fonctionnalités et dispositif type (Plaquette, Proposition) : collecte, fournisseurs, bilan, EcoVadis, référentiel personnalisé, IA.",
    order: 3,
  });

  await seedModuleQuick(st2, {
    slug: "zei-questionnaires-labels-reporting",
    title: "Questionnaires, labels et rapports de durabilité",
    description: "Site, Plaquette et dispositif type (EcoVadis, rapport RSE) — ne pas sur-promettre : suivre le document de proposition commerciale.",
    order: 1,
    estimatedMinutes: 16,
    difficulty: "debutant",
    lesson1Title: "Agréger les demandes (site) et « compléter +150 reportings » (Plaquette)",
    lesson1Content: withSources(
      [
        { type: "heading", level: 2, text: "De la page publique à la fiche d’offre" },
        {
          type: "paragraph",
          text: "Zei publicise la multiplication des questionnaires ESG (appels d’offres, financement, investisseurs, fournisseurs) et la possibilité d’agréger. La Plaquette 2026 indique l’idée d’ « harmoniser vos données sur 150+ référentiels » via la plateforme, sans double saisie, et d’intégrer des modèles additionnels de demandes de données (gain de temps sur le reporting).",
        },
        zeiCallout(
          "Sur un dossier de proposition type (ex. Portalp France), l’un des besoins listés par Zei : « Être EcoVadis Silver et viser la médaille Gold en 2027 ». Zei y répond par le « référentiel EcoVadis présent dans le catalogue pour visualiser l’historique, préparer la mise à jour et centraliser des pièces justificatives ». Il s’agit d’objectifs d’accompagnement, pas d’un score garanti.",
          "proposition-portalp.md — tableau besoins (EcoVadis 2027)"
        ),
        {
          type: "list",
          style: "bullet",
          items: [
            "L’e-learning CSRD/VSME détaillant les exigences : thème CSRD et thème Réglementation (vue ZEI) du présent parcours.",
            "L’e-learning collecte (ESG) pour le gros du détail d’ingénierie (triptyque, OTI) — ici, angle offre + cas.",
          ],
        },
      ],
      [
        { label: "Zei — Plaquette 2026 (compléter +150 reportings)", url: SRC_ZEI.PLAQUETTE_2026 },
        { label: "Zei — Proposition type Portalp France (Google Slides)", url: SRC_ZEI.PROPOSITION_PORTALP },
        { label: "Zei — Page d’accueil", url: SRC.HOME },
      ]
    ),
    lesson2Title: "Rapport de durabilité et DPEF (Proposition, Plaquette, site)",
    lesson2Content: withSources(
      [
        {
          type: "paragraph",
          text: "Le site d’accueil cite « +30 labels disponibles sur Zei » et des enchaînements CSRD, SFDR, VSME, taxonomie, DPEF. La Plaquette 2026 liste le « rapport de durabilité (CSRD, VSME, Taxonomie…) ». Sur la proposition commerciale type, un besoin client est de « Créer et gérer un rapport RSE personnalisé Portalp France […] d’ici 2028 » : Zei y répond par un référentiel personnalisé, connecté aux autres démarches, avec export, et rappel du plan d’actions groupe (document type).",
        },
        {
          type: "regulatory_note",
          year: 2026,
          companySize: "all",
          text: "Le droit de l’UE et de la Commission fixe l’exigence réelle ; les documents commerciaux de Zei cadrant un projet s’y réfèrent, sans s’y substituer (voir thème « Obligations 2025-2026 » + counsel).",
        },
      ],
      [
        { label: "Zei — Proposition commerciale type (Portalp)", url: SRC_ZEI.PROPOSITION_PORTALP },
        { label: "Zei — Plaquette 2026", url: SRC_ZEI.PLAQUETTE_2026 },
        { label: "Zei — Page d’accueil", url: SRC.HOME },
        { label: "Commission — Corporate sustainability reporting", url: SRC.EC_CSRD },
      ]
    ),
    questions: [
      qq(
        "Dans l’exemple de proposition (Portalp France), le besoin n°3 sur EcoVadis est (résumé fidèle) :",
        "Source : ZEI — proposition-portalp.md, tableau (besoin / réponse Zei).",
        "Être EcoVadis Silver et viser la Gold en 2027, avec le référentiel Zei (historique, mises à jour, pièces).",
        ["N’adresser jamais EcoVadis", "Interdire tout justificatif", "Supprimer l’histoire de données ESG"],
        2,
        "debutant",
        0
      ),
      qq(
        "La Plaquette 2026 invite à « harmoniser vos données » sur combien de référentiels (ordre) ?",
        "Source : ZEI — Plaquette synthétique 2026, « Complétez simplement +150 reportings standards ».",
        "150+",
        ["1", "12 000 (confusion avec 13k entreprises)", "0"],
        2,
        "debutant",
        0
      ),
      qq(
        "Le site zei-world.com indique (ordre de grandeur) de labels RSE/ISO, etc. disponibles :",
        "Source : zei-world.com, section labels (détail site public).",
        "Plus de 30",
        ["Moins de 2", "Exactement 1", "0"],
        2,
        "debutant",
        1
      ),
      qq(
        "Dans l’exemple de proposition, le besoin de « créer et gérer un rapport RSE personnalisé […] » indique l’échéance (selon le doc) :",
        "Source : ZEI — proposition-portalp.md, besoin 4 (table).",
        "D’ici 2028",
        ["Sans échéance (le doc ne le dit pas)", "Uniquement avant 2010 (contredit) ", "Interdit par Zei d’anticiper un rapport"],
        2,
        "debutant",
        0
      ),
      qq(
        "Le site d’accueil Zei enchaîne typiquement les rapports de durabilité sur (extrait) :",
        "Source : zei-world.com (page d’accueil, liste regroupée).",
        "CSRD, SFDR, VSME, taxonomie, DPEF (d’après le contenu public cité ailleurs dans le seed).",
        ["Uniquement DPEF sans le reste", "Uniquement le droit pénal", "Uniquement l’euro libre"],
        1,
        "debutant",
        1
      ),
      qq(
        "Sur la Proposition, la réponse Zei liée à la collecte auprès de fournisseurs mentionne (idée) :",
        "Source : ZEI — proposition-portalp.md, besoin 2 / réponse Zei.",
        "Interface dédiée fournisseurs, suivi de complétion des questionnaires carbone (Zei dans le texte d’exemple de proposition).",
        ["Aucun écran (contredit) ", "Interdiction d’invoquer des fournisseurs (contredit) ", "Suppression de tout Scope 3 (contredit) "],
        2,
        "intermediaire",
        0
      ),
      qq(
        "L’URL des solutions « CSRD » côté site public Zei est (chemin) :",
        "Rappel pédagogique, voir le seed SRC.CSRD.",
        "https://zei-world.com/solutions/csrd",
        ["https://zei-world.com/login seulement", "Sous-domaine aléatoire", "Aucun"],
        1,
        "debutant",
        1
      ),
      qq(
        "Dans l’exemple de proposition, le besoin n°1 (bilan carbone) mentionne l’ancien outil (HelloCarbo) et l’intégration possible :",
        "Source : ZEI — proposition-portalp.md, besoin 1 / réponse Zei.",
        "Intégrer la calculette carbone existante et disposer des fonctionnalités (facteurs, collecte, plans d’actions) pour un bilan conforme (formulation type du document).",
        ["Obligation d’effacer l’histoire d’émissions (contredit) ", "Interdire BEGES (contredit) ", "Refuser toute base de facteurs (contredit) "],
        2,
        "intermediaire",
        0
      ),
    ],
  });

  await seedModuleQuick(st2, {
    slug: "zei-bilan-carbone-consolidation-ia",
    title: "Bilan carbone, consolidation (portail d’exemple) et IA",
    description: "Page Zei, Plaquette et chapitre Proposition (Portalp) : BEGES/GHGP, étapes 0–2, import — sans promettre d’abattement concret de GES sur ce document type.",
    order: 2,
    estimatedMinutes: 18,
    difficulty: "intermediaire",
    lesson1Title: "Méthode BEGES + GHG Protocol, étapes 0 et 1 (Zei, proposition type)",
    lesson1Content: withSources(
      [
        {
          type: "paragraph",
          text: "Dans l’exemple de proposition, Zei s’appuie sur BEGES et GHG Protocol. Les étapes 0 à 1 décrivent import, cartographie, postes, facteurs d’émissions, interfaces siège + fournisseurs, familles, calculette personnalisée : « 7 bases disponibles » et personnalisation des facteurs, selon le texte. La Plaquette annonce l’exemple d’accès : Bilan Carbone® (marque) parmi d’autres cas d’usage. Le site public tient l’idée d’un bilan (BEGES, Scope 3) et d’alignement multi-déclarations. La validation finale reste côté entreprise (OTI, audit) — thème Réglementation pour les sources légales.",
        },
        zeiCallout(
          "Côté outillage, l’exemple de proposition indique l’alignement d’environ 15 000+ indicateurs sur un import, pour rapprocher l’existant des modèles. La gouvernance de validation reste côté client (cf. Guide collecte).",
          "proposition-portalp — étape 0 / cartographie"
        ),
        {
          type: "list",
          style: "ordered",
          items: [
            "Zei / site : consolidation filiales, BU, sites, complétion, détection d’écarts, benchmark (vocabulaire public).",
            "Livre blanc RSE 2025 (Zei) : cadrage « RSE de performance » — approfondir via le thème Témoignages de ce parcours et le PDF (source).",
          ],
        },
      ],
      [
        { label: "Zei — Proposition commerciale type (Portalp)", url: SRC_ZEI.PROPOSITION_PORTALP },
        { label: "Zei — Plaquette 2026 (cas d’usage Bilan Carbone®)", url: SRC_ZEI.PLAQUETTE_2026 },
        { label: "Zei — En 2025, RSE de performance (PDF) — cadrage 2025", url: SRC_ZEI.RSE_2025_PERFORMANCE },
        { label: "Zei — Page d’accueil (produit, IA, benchmark) ", url: SRC.HOME },
      ]
    ),
    lesson2Title: "Collecte fournisseurs, suivi, imports (Zei) et gap analysis (site)",
    lesson2Content: withSources(
      [
        { type: "heading", level: 2, text: "Livrables, pas d’or sans travail" },
        {
          type: "paragraph",
          text: "Dans l’exemple, le déploiement inclut : contributeurs (illimités), suivi de complétion par poste, reprise des bases carbone, contrôles, exports en rapport, harmonisation d’un « référentiel personnalisé » avec d’autres exigences (BEGES, DPEF/CSRD). La proposition mentionne 10–25% de « temps » sur le pilotage d’exploitation des données entre bilans, dans un scénario personnalisé, sans s’y substituer. La Plaquette annonce 150+ référentiels, la gap analysis côté site s’entend plutôt sur ~100+ référentiels, voir l’e-learning CSRD. ",
        },
        { type: "divider" },
        {
          type: "callout",
          variant: "important",
          title: "Lecture pro",
          text: "Un gain de 10–25% de temps de gestion des données entre exercices a été indiqué dans l’exemple, dans un scénario personnalisé avec référentiel intégré. Ne le généralisez pas : citez l’exemple de proposition, pas un engagement universel.",
        },
      ],
      [
        { label: "Zei — Proposition (Portalp), étapes 1–2 / imports", url: SRC_ZEI.PROPOSITION_PORTALP },
        { label: "Zei — Page d’accueil (Gap Analysis) ", url: SRC.HOME },
      ]
    ),
    questions: [
      qq(
        "Dans la proposition, la double assise métho du bilan carbone est (texte) :",
        "Source : ZEI — proposition-portalp.md, § « Bilan carbone — méthodologie ».",
        "BEGES + GHG Protocol, pour robustesse, comparabilité, adaptabilité. ",
        ["BEGES seul, sans jamais GHG", "GHG seul, sans BEGES", "NIIF/IFRS 16 exclusivement (contredit) "],
        2,
        "debutant",
        0
      ),
      qq(
        "Dans l’exemple, combien de bases d’émissions (facteur) le texte de Zei rappelle-t-il (disponibles) ?",
        "Source : ZEI — proposition-portalp, étape 1 / facteurs.",
        "7",
        ["0 (aucune) ", "700 obligatoires uniques (contredit) ", "1, sans ajustement (contredit) "],
        2,
        "debutant",
        0
      ),
      qq(
        "Sur zei-world.com, l’IA est présentée comme un soutien notamment à :",
        "Source : page d’accueil Zei (même formulation que d’autres thèmes du seed).",
        "Complétion, reporting, calculs, détection d’écarts (formulations du site).",
        ["L’obligation d’exonérer toute vérification humaine", "Le remplacement du CAC", "L’abandon du RSE (contredit) "],
        2,
        "debutant",
        0
      ),
      qq(
        "Dans l’exemple, l’échantillon global de comparaison « peers » s’appuie sur (ordre) d’entreprises, selon la proposition :",
        "Source : ZEI — proposition-portalp, § Benchmark.",
        "13 000+",
        ["50 000 000 (contredit) ", "100 seulement (contredit) ", "0 (contredit) "],
        1,
        "intermediaire",
        0
      ),
      qq("La Plaquette indique d’ « harmoniser » le reporting sur (ordre) de référentiels, dans la même logique d’enchaînement. ", "Source : ZEI — Plaquette 2026.", "150+", ["12", "0", "1"], 1, "debutant", 0),
      qq("La page d’accueil Zei, section gap analysis, mentionne d’(ordre) de référentiels, pour l’idée d’import — à recouper avec l’e-learning site :", "Source : zei-world.com (même thème, seed).", "environ 100+ ", ["1", "0", "1 000 000"], 1, "intermediaire", 0),
      qq(
        "Pour l’E-learning, après l’amorce de ce thème, il est cohérent d’enchaîner (navigation interne) vers :",
        "Lien pédagogique. Source : parcours Zei Quizz (thèmes internes, pas seulement le PDF).",
        "Le thème CSRD (détail) et le sous-thème « Réglementation : la lecture ZEI » de ce parcours",
        [
          "Ignorer entièrement le thème CSRD de l’app",
          "Remplacer un avis de l’AMF sur un DPEF",
          "Ne citer que des sources anonymes",
        ],
        2,
        "avance",
        0
      ),
    ],
  });

  // 4 — ZEI et l'intérim responsable (continuité / gouvernance — faits site : consolidation, multi-acteurs)
  const st3 = await getOrCreateSubtheme({
    themeId,
    slug: "zei-et-interim-responsable",
    title: "ZEI et l'intérim responsable",
    description:
      "Gouvernance de collecte « vue ZEI » (Guide) : triptyque, audit trail, 40%→90% — le site zei-world.com illustre le produit.",
    order: 4,
  });

  await seedModuleQuick(st3, {
    slug: "zei-pilotage-plans-actions-contributeurs",
    title: "Plans d’actions, contributeurs et gouvernance (vue ZEI)",
    description: "Produit (site) + triptyque Contributeur / Valideur / Administrateur (Guide Zei) — l’E-learning ESG approfondit l’ingénierie de collecte.",
    order: 1,
    estimatedMinutes: 16,
    difficulty: "debutant",
    lesson1Title: "Piloter sur la plateforme + réseau de contributeurs (site) ",
    lesson1Content: withSources(
      [
        {
          type: "paragraph",
          text: "Le site Zei met en avant « Piloter & Progresser » : plans d’actions, invitation de contributeurs, suivi. Ce module complète l’intention d’industrialiser (Guide) : « chaque métier devient propriétaire de sa donnée » (rhétorique pédagogique) ; la RSE cesse d’être un « pompier » de fin d’exercice.",
        },
        zeiCallout(
          "Zei formalise le triptyque : Contributeur (saisie + preuve) ; Valideur / manager (cohérence métier) ; Administrateur RSE (complétude inter-services). Renvoi pédagogique : §3.2 du Guide. ",
          "Guide collecte ESG (section triptyque)"
        ),
      ],
      [
        { label: "Zei — Guide collecte ESG (PDF)", url: SRC_ZEI.GUIDE_COLLECTE_ESG },
        { label: "Zei — Page d’accueil (Piloter & Progresser) ", url: SRC.HOME },
      ]
    ),
    lesson2Title: "Lien avec le « 80/20 » et l’E-learning ESG",
    lesson2Content: withSources(
      [
        {
          type: "paragraph",
          text: "Le guide estime 80% du temps RSE en collecte vs 20% d’analyse/pilotage : l’E-learning thème ESG (collecte) déroule l’ingénierie, ici c’est l’intention d’y répondre. Sur la page publique, Zei rappelle consolidation groupe / filiales / fournisseurs, comparer par entité, etc.",
        },
        {
          type: "callout",
          variant: "info",
          title: "Précision pédagogique",
          text: "« Intérim responsable » ici n’est pas le portage salarial : c’est la continuité (donnée et rôles) quand l’équipe change, via l’outil — pas l’agence d’intérim.",
        },
      ],
      [
        { label: "Zei — Guide collecte ESG (80/20)", url: SRC_ZEI.GUIDE_COLLECTE_ESG },
        { label: "Zei — Thème e-learning ESG (compl. interne) ", url: learn("/learn/esg") },
      ]
    ),
    questions: [
      qq(
        "Dans le Guide Zei, le Valideur (manager) a pour rôle de :",
        "Source : ZEI — Guide collecte ESG, §3.2.",
        "Vérifier la cohérence métier d’une donnée saisie par le Contributeur",
        ["Supprimer toutes les preuves", "Signer à la place du CAC toutes les comptes", "Ne jamais lire de donnée, par principe (contredit) "],
        2,
        "debutant",
        0
      ),
      qq(
        "Le triptyque d’ingénierie du Guide s’enchaîne en :",
        "Source : ZEI — Guide collecte ESG, §3.2.",
        "Contributeur — Valideur — Administrateur (RSE)",
        [
          "Un seul rôle sans délégation",
          "Uniquement le CAC pour toute saisie",
          "Aucun contrôle, tout par e-mail non tracé",
        ],
        1,
        "debutant",
        0
      ),
      qq("Le guide situe, en moyenne, 80% du temps RSE côté :", "Source : ZEI — Guide, paradoxe de la donnée ESG.", "la collecte (le reste pour piloter, analyser) ", ["0% (contredit) ", "l’avocat seul (faux) ", "100% audit, sans, collecte, (faux) "], 1, "debutant", 0),
      qq(
        "Dans ce parcours, l’intitulé « intérim responsable » vise d’abord (cf. encadré du module) :",
        "Source : encadré « Précision pédagogique » (ce module).",
        "la continuité de pilotage et de données (pas le portage salarial)",
        ["l’agence d’intérim Zei", "le recrutement CDD imposé par Zei", "le remplacement du CAC "],
        2,
        "avance",
        1
      ),
      qq(
        "Le site public mentionne, pour aider le pilotage, d’ « inviter » :",
        "Source : zei-world.com, Piloter & Progresser (même formulation que le seed).",
        "les contributeurs à des plans d’actions de suivi",
        ["personne, en interdisant toute saisie", "uniquement l’intérim dirigeant (contredit) ", "uniquement le site social "],
        1,
        "debutant",
        0
      ),
      qq(
        "Le détail opératoire (outillage, OTI, règles de collecte) est surtout dans l’E-learning thème :",
        "Source : Guide + architecture Zei Quizz (parcours ESG).",
        "ESG (collecte / pilotage)",
        ["Aucun thème sur la plateforme", "Uniquement le droit sportif", "RSE seul, sans ESG, toujours"],
        1,
        "intermediaire",
        0
      ),
      qq(
        "Sur le site, l’idée de comparer par entité, activité ou taille sert notamment à :",
        "Source : zei-world.com (même libellé que d’autres thèmes du seed).",
        "une vision consolidée multi-niveau du pilotage",
        ["interdire toute comparaison", "supprimer toutes les filiales", "fusionner les entités sans acte"],
        1,
        "debutant",
        0
      ),
    ],
  });

  await seedModuleQuick(st3, {
    slug: "zei-resilience-donnees-rse",
    title: "Traçabilité, audit et « Toujours à jour » (Guide + produit) ",
    description: "Audit trail, seuil 20 %, 40%→90% (Guide) ; mises à jour produit (site) — thème ESG = détail OTI / qualité. ",
    order: 2,
    estimatedMinutes: 16,
    difficulty: "intermediaire",
    lesson1Title: "Journal d’audit : trois piliers (Guide Zei)",
    lesson1Content: withSources(
      [
        {
          type: "paragraph",
          text: "Avec la CSRD, la donnée sera auditée (OTI). Le Guide Zei distingue : l’horodatage immuable ; la traçabilité des auteurs (« qui a modifié quoi ? ») ; le motif de modification (commentaire en cas de correction d’une donnée historique). C’est l’intention d’industrialisation — sur Zei, la collecte des justificatifs par indicateur est rappelée. « Rien ne doit être modifié sans laisser de trace. »",
        },
        zeiCallout(
          "En cas d’écart d’environ 20% par rapport à la moyenne historique, le texte du Guide évoque un blocage de saisie et une justification — à relier à la gouvernance, pas à une promesse d’omniscience. ",
          "Guide collecte ESG, §3.3 (alertes)"
        ),
        {
          type: "paragraph",
          text: "Côté produit, zei-world.com indique l’absence de ressaisie supplémentaire sur les données déjà saisies lors d’évolutions réglementaires, et l’idée d’ « harmonisation » / automatisations (même champs pédagogiques que d’autres thèmes du seed).",
        },
      ],
      [
        { label: "Zei — Guide collecte ESG (PDF, audit & traçabilité) ", url: SRC_ZEI.GUIDE_COLLECTE_ESG },
        { label: "Zei — Page d’accueil (Toujours à jour) ", url: SRC.HOME },
      ]
    ),
    lesson2Title: "40% → 90% : fin des « données estimées » (Guide)",
    lesson2Content: withSources(
      [
        {
          type: "paragraph",
          text: "Le Guide indique qu’industrialiser permet de « passer de 40% de données estimées à 90% de données réelles » : le positionnement vis-à-vis des notations et des investisseurs change, on parle de « réalité mesurée » plutôt que d’intention seule. Cela complète le thème ESG (collecte) : ici, la philosophie ZEI et le manifeste « arrêtez de bricoler, commencez à piloter ».",
        },
        {
          type: "paragraph",
          text: "Comme sur la Proposition d’exemple, un « piste d’audit » apparaît dans l’offre de licence (document type) : le détail contractuel relève de l’exemplaire de proposition, pas de ce e-learning seul. ",
        },
      ],
      [
        { label: "Zei — Guide collecte ESG (restitution §5) ", url: SRC_ZEI.GUIDE_COLLECTE_ESG },
        { label: "Zei — Proposition commerciale type (licence, piste) ", url: SRC_ZEI.PROPOSITION_PORTALP },
      ]
    ),
    questions: [
      qq(
        "Les trois piliers de la piste d’audit (Guide) sont :",
        "Source : ZEI — Guide collecte ESG, §4.2 (trois piliers).",
        "Horodatage, traçabilité des auteurs, motif de modification",
        [
          "Un seul chiffre sans explication",
          "Aucun historique ni horodatage",
          "Modifier une cellule Excel sans auteur (contredit) ",
        ],
        2,
        "debutant",
        0
      ),
      qq("Le Guide cite un écart d’environ, par rapport à la moyenne, pour bloquer la saisie (avec justification) :", "Source : ZEI — Guide, §3.3.", "20%", ["0%", "200%", "2% imposé sans marge (faux) "], 1, "debutant", 0),
      qq(
        "Le Guide formule l’enjeu du passage 40% → 90% (estimations vs données réelles) :",
        "Source : ZEI — Guide, §5.3.",
        "changer de posture face aux notations et investisseurs (réalité mesurée vs intentions) ",
        [
          "ignorer toute preuve (contredit) ",
          "n’écrire que du narratif (faux) ",
          "supprimer tout indicateur (faux) ",
        ],
        2,
        "intermediaire",
        0
      ),
      qq("Sur le site, « Toujours à jour » s’aligne surtout, pour l’E-learning, sur l’idée de :", "Source : zei-world, même seed que d’autres thèmes. ", "ne pas ressaisir inutilement des données déjà en plateforme lors d’évolutions réglementaires (message pédago.)", ["tout effacer chaque an", "interdire toute veille (contredit) ", "papier obligatoire (faux) "], 1, "debutant", 0),
      qq(
        "Le Guide qualifie d’erreur de « boîte noire » pour l’auditeur :",
        "Source : ZEI — Guide, §4.1.",
        "des calculs sur fichiers personnels hors outil, non traçables par l’auditeur",
        [
          "Un outil partagé avec paramétrage des conversions",
          "Un journal d’audit avec auteurs et motifs de correction",
          "Un justificatif lié indissociablement à la donnée (coffre-fort) ",
        ],
        2,
        "intermediaire",
        0
      ),
      qq(
        "La mention « piste d’audit » sur l’exemple de Proposition (Zei) apparaît dans :",
        "Source : ZEI — proposition-portalp, offre / licence (document type).",
        "les éléments d’offre commerciale décrits (à confronter au contrat signé) ",
        [
          "le seul règlement de la LFP",
          "un code fiscal sans lien",
          "une norme ISO 9001 seule, sans ESG (faux) ",
        ],
        1,
        "avance",
        0
      ),
      qq(
        "Sur le site, l’« harmonisation » des données RSE sert surtout à :",
        "Source : zei-world + coh. avec le Guide (interop / une seule base).",
        "éviter la double saisie et tenir des données centralisées et réutilisables",
        [
          "multiplier des versions Excel contradictoires",
          "n’avoir aucune base",
          "imposer du papier pour tout (faux) ",
        ],
        2,
        "debutant",
        0
      ),
      qq(
        "Lors d’un changement de référent RSE, conserver l’historique en outil aide plutôt à :",
        "Source : pédagogie de continuité (module + page d’accueil).",
        "reprendre le fil sans reconstruire tout de zéro",
        [
          "supprimer toute piste d’audit pour l’extérieur",
          "interdire l’accès aux filiales (sans contexte) ",
          "casser volontairement les workflows (faux) ",
        ],
        1,
        "intermediaire",
        0
      ),
    ],
  });

  // 5 — Impact social
  const st4 = await getOrCreateSubtheme({
    themeId,
    slug: "impact-social-zei",
    title: "Impact social de ZEI",
    description:
      "Chaîne de valeur, benchmark, compléments Checklist ZEI (fin de collecte) en rapprochement du site.",
    order: 5,
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
          text: "Un bloc de conversion affiche « +9000 entreprises améliorent leur impact avec Zei » — message d’échelle. À rapprocher des chiffres de la Plaquette 2026 (p. ex. 13 000 entreprises évaluées) sans les confondre avec le marketing de page d’accueil.",
        },
        {
          type: "callout",
          variant: "warning",
          title: "Chiffres",
          text: "Croisez site (messages dynamiques) et Plaquette PDF pour les grands nombres : la Plaquette synthétique 2026 détaille indicateurs et périmètre. La page témoignages peut afficher des compteurs « +0 » selon le rendu — préférez des sources documentées en interne.",
        },
      ],
      [
        { label: "Zei — Page d’accueil", url: SRC.HOME },
        { label: "Zei — Témoignages", url: SRC.TEMOIGNAGES },
      ]
    ),
    questions: [
      qq("Le benchmark RSE sert à comparer avec :", "Entreprises qui vous ressemblent.", "Des entreprises comparables / qui vous ressemblent", ["Uniquement des États", "Uniquement des animaux", "Aucune donnée"], 2, "debutant", 0),
      qq(
        "Le message « +9000 entreprises » sur l’accueil vise à illustrer (à ne pas confondre avec) :",
        "Site d’acquisition. La Plaquette 2026 cite p. ex. 13 000 entreprises évaluées (autre indicateur).",
        "une adoption / une base d’utilisatrices en croissance (message marketing) ",
        ["l’effectif exact de salariés Zei, au sens RH", "un chiffre d’affaires en millions d’euros", "le nombre d’indicateurs clé en main de l’offre (voir Plaquette) "],
        1,
        "debutant",
        1
      ),
      qq("Sur la page d’accueil, le nombre de clients est annoncé comme :", "« 300+ clients » dans un bloc logos.", "Plus de 300 clients", ["Zéro client", "Exactement 2", "Moins de 10 sans plus"], 2, "intermediaire", 1),
      qq("Le benchmark s’adresse selon le texte à :", "Clients, concurrents, investisseurs.", "Parties externes à convaincre", ["Uniquement le service postal", "Uniquement les écoles", "Personne"], 2, "intermediaire", 0),
      qq("Comparer les résultats sectoriels relève plutôt de :", "Lecture pédagogique.", "L’analyse concurrentielle et la stratégie RSE", ["La comptabilité stock", "La paie uniquement", "Le droit pénal seul"], 2, "avance", 1),
      qq("L’impact social au sens large inclut souvent :", "Général ESG.", "Parties prenantes, travail, communautés, chaîne de valeur", ["Uniquement le CO2", "Uniquement la couleur du logo", "Uniquement le prix de l’essence"], 1, "debutant", 0),
      qq("La page témoignages liste des :", "Études de cas / guides téléchargeables.", "Cas clients et contenus associés", ["Vidéos uniquement interdites", "Aucun contenu", "Uniquement des emplois"], 2, "intermediaire", null),
      qq("L’URL des témoignages clients Zei est :", "Chemin /temoignages.", "https://zei-world.com/temoignages", ["https://zei-world.com/fake-temoignages", "https://zei-world.com/404", "https://example.net"], 1, "debutant", null),
    ],
  });

  await seedModuleQuick(st4, {
    slug: "zei-checklist-faites-le-point-collecte",
    title: "Checklist — faites le point sur votre collecte ESG",
    description: "Rappel du PDF ZEI (fin de collecte) pour clôturer ou auditer un cycle, en complément du site.",
    order: 3,
    estimatedMinutes: 10,
    difficulty: "intermediaire",
    lesson1Title: "Rôle de la Checklist (PDF)",
    lesson1Type: "lesson",
    lesson1Content: withSources(
      [
        {
          type: "paragraph",
          text: "La Checklist ZEI « Faites le point sur votre collecte ESG » sert d’autodiagnostic rapide : forces, angles morts, priorités avant de boucler une campagne ou d’ouvrir un cycle suivant. Elle complète le Guide (méthode) en restant opérationnelle côté contrôle de fin de période.",
        },
        zeiCallout(
          "Cesser de bricoler, côté collecte, c’est surtout savoir quand s’arrêter pour cadrer la suite : la Checklist pousse à cette lecture synthétique.",
          "Checklist ESG (PDF) + coh. Guide collecte"
        ),
      ],
      [
        { label: "Zei — Checklist collecte ESG (PDF, Hubspot)", url: SRC_ZEI.CHECKLIST_COLLECTE_ESG },
        { label: "Zei — Guide collecte ESG (PDF)", url: SRC_ZEI.GUIDE_COLLECTE_ESG },
      ]
    ),
    lesson2Title: "Croiser site, outils et ressource téléchargeable",
    lesson2Type: "lesson",
    lesson2Content: withSources(
      [
        {
          type: "paragraph",
          text: "Utilisez la Checklist en binôme avec l’E-learning (ce parcours) : fixez d’abord l’exigence CSRD/VSME, puis le niveau d’exhaustivité, puis l’espace « 80/20 » du Guide. La Checklist sert ici de grille de relecture avant de présenter les chiffres à la direction ou au commissaire.",
        },
      ],
      [
        { label: "E-learning ZEI (interne) — thème RSE", url: learn("/learn/zei-rse") },
        { label: "Zei — Page d’accueil", url: SRC.HOME },
        { label: "Zei — Checklist (PDF, Hubspot)", url: SRC_ZEI.CHECKLIST_COLLECTE_ESG },
      ]
    ),
    questions: [
      qq(
        "La ressource « Checklist — faites le point sur votre collecte ESG » (Zei) est diffusée sous :",
        "Fichier PDF sur Hubspot (même filière que le Guide).",
        "un PDF (lien de téléchargement) ",
        ["uniquement une vidéo YouTube", "uniquement du papier en points de vente", "un code secret sans accès public"],
        1,
        "debutant",
        0
      ),
      qq(
        "La Checklist sert surtout à :",
        "Cadrer une fin de collecte (auto-éval., priorités) selon l’intitulé du document.",
        "Faire le point, identifier angles morts, clarifier des suites à donner",
        [
          "Remplacer toute exigence légale CSRD",
          "Garantir un taux d’exhaustivité à 100 % sans outil",
          "Supprimer la double matérialité",
        ],
        1,
        "intermediaire",
        0
      ),
      qq(
        "La Checklist se complète naturellement avec :",
        "Coh. Guide (méthode) + ce parcours (contexte) ",
        "le Guide collecte ESG (méthodologie, 80/20, traçabilité) ",
        ["l’oubli de toute traçabilité (contredit) ", "un renoncement total au pilotage (faux) ", "l’exclusion de tout référentiel (faux) "],
        2,
        "intermediaire",
        1
      ),
      qq(
        "Avant d’ouvrir le PDF Checklist, quelle règle de prudence le module recommande ?",
        "Cadrer exigence, exhaustivité, 80/20, puis relecture.",
        "Fixer le niveau d’exigence (CSRD/VSME), puis l’espace 80/20, puis relecture",
        [
          "ajouter 50 indicateurs ad hoc chaque lundi (faux) ",
          "ignorer toute piste d’audit (faux) ",
          "déclarer 100 % sans vérification (faux) ",
        ],
        1,
        "avance",
        1
      ),
      qq(
        "Dans l’E-learning, l’URL du thème RSE côté application est (schéma) :",
        "Lien relatif d’appli — APP_ORIGIN + /learn/zei-rse. ",
        `${learn("/learn/zei-rse")}`,
        [learn("/learn/foo"), "https://example.com/fake-zei", "zei://intranet-404"],
        1,
        "debutant",
        1
      ),
      qq(
        "La Checklist et le Guide partagent (intention) :",
        "Donnée pilotable, pas seulement narrative. ",
        "Moins d’improvisation en collecte, plus d’arbitrage et de relecture cadrés",
        [
          "Défendre 100 % de l’informatique (sans nuance) ",
          "Abolir toute ressource PDF (faux) ",
          "Interdire tout référent (faux) ",
        ],
        2,
        "debutant",
        0
      ),
      qq(
        "Côté parties prenantes, une relecture « fin de campagne » aide surtout à :",
        "Coh. chaîne de valeur, benchmark (module précédent) et Checklist. ",
        "décider quoi partager, avec quelles preuves, avant reporting ou audit",
        ["tout cacher (contredit) ", "brûler des justificatifs (faux) ", "supprimer l’e-learning (faux) "],
        1,
        "intermediaire",
        0
      ),
      qq(
        "L’intitulé marketing du Guide (« arrêtez de bricoler… ») s’applique à la Checklist en ce sens :",
        "Coh. Guide + Checklist (fin de période).",
        "éviter les collectes bâclées et cadrer une clôture qui tient la route",
        [
          "multiplier 12 versions d’Excel sans relecture (faux) ",
          "ne jamais documenter (faux) ",
          "renoncer à tout chiffre (faux) ",
        ],
        1,
        "debutant",
        0
      ),
    ],
  });

  // 6 — Études de cas clients
  const st5 = await getOrCreateSubtheme({
    themeId,
    slug: "etudes-de-cas-clients-zei",
    title: "Études de cas clients ZEI",
    description:
      "Proposition commerciale type, fiches site (PRÉVOIR, Appart’City, Aqualande, SupBiotech) et parcours Zei Quizz CSRD/ESG en complément.",
    order: 6,
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

  await seedModuleQuick(st5, {
    slug: "zei-cas-portalp-proposition-type",
    title: "Proposition commerciale type (Portalp France)",
    description: "Lecture d’une proposition type en Google Slides, croisée avec la Plaquette 2026 (gammes, Bilan Carbone®).",
    order: 3,
    estimatedMinutes: 16,
    difficulty: "avance",
    lesson1Type: "case_study",
    lesson1Title: "Structure d’offre, licence et piste d’audit",
    lesson1Content: withSources(
      [
        { type: "heading", level: 2, text: "Proposition type (extrait pédagogique) " },
        {
          type: "paragraph",
          text: "Le document « Proposition commerciale type (Portalp France) » sur Google Slides formalise le découpage d’offre (licence, paramètres, accompagnement) et mentionne explicitement une piste d’audit — élément à confronter à tout contrat signé (ce module ne substitue pas un juriste).",
        },
        zeiCallout(
          "Une offre B2B récente mélange souvent logiciel, méthode et ressources humaines : lisez la Proposition pour voir comment Zei pose la « boîte à outils » côté client, avant de la mettre en parallèle de votre politique d’achat RSE. ",
          "proposition-portalp (Google Slides) "
        ),
      ],
      [
        { label: "Zei — Proposition commerciale type, Portalp France (Google Slides)", url: SRC_ZEI.PROPOSITION_PORTALP },
        { label: "Zei — Plaquette synthétique 2026 (Google Slides)", url: SRC_ZEI.PLAQUETTE_2026 },
      ]
    ),
    lesson2Type: "case_study",
    lesson2Title: "Gammes produit et cas Bilan Carbone® (Plaquette)",
    lesson2Content: withSources(
      [
        {
          type: "paragraph",
          text: "La Plaquette 2026 relie les gammes Zei (plateforme, outils, services) à des cas concrets, dont un volet sur le Bilan Carbone® (ADEME) et des éléments d’accompagnement. En cas client, l’enjeu est d’aligner l’exigence ESG (CSRD, score, labels) sur ce que l’offre promet effectivement (périmètre, preuves, ressources).",
        },
        {
          type: "callout",
          variant: "info",
          title: "Lecture",
          text: "On ne cherche pas ici à reproduire un cahier des charges Portalp, mais à entraîner l’esprit : relier chaque brique d’offre à une exigence de traçabilité (cf. module « résilience des données »).",
        },
      ],
      [
        { label: "Zei — Plaquette synthétique 2026 (Google Slides)", url: SRC_ZEI.PLAQUETTE_2026 },
        { label: "Zei — Proposition commerciale type (Portalp)", url: SRC_ZEI.PROPOSITION_PORTALP },
      ]
    ),
    lesson3Type: "case_study",
    lesson3Title: "Cadrer un cas fournisseur (check-list rapide) ",
    lesson3Content: withSources(
      [
        {
          type: "paragraph",
          text: "Avant toute reprise de contenu de la Proposition : (1) isoler le périmètre CSRD/VSME du client, (2) vérifier ce qui relève de la plateforme vs des services, (3) consigner le lien public Google Slides et un instantané des grilles d’offre (date) pour l’équipe commerciale. Même logique que pour un audit de collecte RSE : la preuve tient d’abord à la cohérence des documents et des URL.",
        },
        zeiCallout(
          "Côté Zei, un cas d’usage type + Plaquette complète souvent le « pourquoi maintenant » auprès d’un COPIL : gardez les deux onglets ouverts (Slides + Plaquette) pour les ateliers internes. ",
          "proposition-portalp + Plaquette 2026 "
        ),
      ],
      [
        { label: "Zei — Proposition (Portalp), Google Slides", url: SRC_ZEI.PROPOSITION_PORTALP },
        { label: "Zei — Checklist collecte (PDF) — relecture", url: SRC_ZEI.CHECKLIST_COLLECTE_ESG },
      ]
    ),
    questions: [
      qq(
        "Le document « Proposition commerciale type (Portalp France) » est consultable sur :",
        "URL complète : Google Slides (SRC_ZEI).",
        "Google Slides (lien de présentation) ",
        ["uniquement un fichier Word sur un serveur interne non identifié", "uniquement le Hubspot Checklist (faux) ", "uniquement le PDF En Bref 5 (faux) "],
        1,
        "debutant",
        0
      ),
      qq(
        "La Proposition type mentionne (concepts pédago.) :",
        "Lecture Proposition (grilles) + module résilience. ",
        "licence, paramètres, et l’idée d’une piste d’audit côté offre",
        [
          "un mode de transport maritime exclusivement (faux) ",
          "l’abandon de toute traçabilité (faux) ",
          "un abonnement presse (faux) ",
        ],
        1,
        "intermediaire",
        0
      ),
      qq(
        "La Plaquette 2026 sert ici surtout à :",
        "Croiser offre type et positionnement produit. ",
        "raccrocher gammes, outils, services et cas (ex. Bilan Carbone®) à l’argumentaire",
        [
          "remplacer toute fiche commerciale signée (faux) ",
          "supprimer la CSRD (faux) ",
          "geler un prix sans négociation (faux) ",
        ],
        1,
        "intermediaire",
        1
      ),
      qq(
        "Dans le triptyque Plaquette + Proposition + Checklist, la Checklist sert plutôt à :",
        "Coh. module Checklist (st4) + fin de période. ",
        "relecture d’exhaustivité / fin de campagne, pas à substituer un contrat",
        [
          "rédiger seule le code du sport (faux) ",
          "déclarer seul l’ISF (faux) ",
          "remplacer un CDD (faux) ",
        ],
        1,
        "avance",
        2
      ),
      qq(
        "Un cas fournisseur « type Portalp » implique d’abord (ordre) :",
        "Méthode (périmètre, offre, preuves) — leçon 3. ",
        "fixer l’exigence CSRD/VSME, distinguer plateforme vs services, archiver l’URL et la date",
        [
          "publier sans relecture (faux) ",
          "mélanger deux devises sans taux (faux) ",
          "ignorer la piste d’audit (faux) ",
        ],
        1,
        "avance",
        2
      ),
      qq(
        "Le Bilan Carbone® (ADEME) apparaît dans le parcours ZEI & RSE comme :",
        "Rappel Plaquette + cas; pas un exposé complet ADEME ici. ",
        "un cas d’usage / référence de méthodologie, à cadrer dans l’offre Zei",
        [
          "un label obligatoire pour toute TPE (faux) ",
          "un outil de paie (faux) ",
          "une norme ISO 9001 (faux) ",
        ],
        1,
        "intermediaire",
        1
      ),
      qq(
        "L’intérêt pédagogique d’ouvrir Plaquette + Proposition côte à côte est :",
        "Aligner discours produit et promesse d’accompagnement. ",
        "vérifier la cohérence « promesse / preuve / ressource » pour un interlocuteur RSE",
        [
          "faire jongler deux PDF sans auteur (faux) ",
          "cacher la CSRD (faux) ",
          "remplacer le comité d’audit (faux) ",
        ],
        1,
        "debutant",
        1
      ),
      qq(
        "Pour citer la Proposition en interne, la bonne pratique est :",
        "Traçabilité (URL, version) — coh. autres cas. ",
        "conserver le lien Google Slides, le titre, et un repère de date de consultation",
        [
          "inventer des remises non écrites (faux) ",
          "citer un concurrent à la place (faux) ",
          "retirer toute mention d’audit (faux) ",
        ],
        1,
        "debutant",
        2
      ),
    ],
  });

  // 7 — Témoignages et résultats mesurés
  const st6 = await getOrCreateSubtheme({
    themeId,
    slug: "temoignages-et-resultats-mesures",
    title: "Témoignages et résultats mesurés",
    description:
      "Livre blanc RSE de performance 2025, témoignages (Bpifrance, LFP), outils et chiffres Plaquette en cohérence.",
    order: 7,
  });

  await seedModuleQuick(st6, {
    slug: "zei-temoignages-bpifrance-lfp",
    title: "Témoignages Bpifrance et Ligue de Football Professionnel",
    description: "Citations site, complétées par le livre blanc RSE de performance 2025 (Hubspot) pour le cadrage « image → efficacité ».",
    order: 1,
    estimatedMinutes: 18,
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
    lesson3Title: "Livre blanc — RSE de performance (2025)",
    lesson3Type: "regulatory_update",
    lesson3Content: withSources(
      [
        {
          type: "paragraph",
          text: "Le PDF « En 2025, comment passer à une RSE de performance ? » prolonge le discours public : l’enjeu n’est pas d’empiler des labels, mais de structurer la donnée ESG pour que l’impact pèse dans les décisions (ROI extra-financier, comparabilité, pilotage) — y compris sous l’effet moteur de la CSRD.",
        },
        zeiCallout(
          "L’éditorial insiste : la RSE, ce n’est ni la course aux badges ni la conformité « pour conformer » seule, mais la clarté des chiffres et l’action.",
          "En 2025, comment passer à une RSE de performance ? (PDF) "
        ),
        {
          type: "list",
          style: "ordered",
          items: [
            "I. 2025, année marquée par le réglementaire (premiers gros reportings CSRD) ",
            "II. Chantiers dominants de la RSE en 2025 ",
            "III. RSE comme moteur de performance (efficacité, pas seulement l’image) ",
            "IV. Projections à 2027 ",
          ],
        },
      ],
      [
        { label: "Zei — RSE de performance 2025 (PDF, Hubspot)", url: SRC_ZEI.RSE_2025_PERFORMANCE },
        { label: "Zei — Témoignages", url: SRC.TEMOIGNAGES },
        { label: "Zei — Plaquette synthétique 2026 (Google Slides)", url: SRC_ZEI.PLAQUETTE_2026 },
      ]
    ),
    questions: [
      qq("Estelle Gruson est citée comme responsable :", "Titre sur la page d’accueil.", "RSE chez BPI France", ["DG chez Zei", "Ministre", "Arbitre FIFA"], 1, "debutant", 0),
      qq("Selon le témoignage Bpifrance (E. Gruson), Zei a permis notamment de :", "Citation.", "Centraliser les données ESG et couvrir un périmètre réglementaire complet", ["Supprimer toute donnée", "Éviter tout accompagnement", "Ignorer la réglementation"], 3, "intermediaire", 0),
      qq("Philippe Kunter met l’accent sur :", "Citation.", "La fédération des participations et le démarrage de la transformation", ["La vente de maillots uniquement", "Uniquement le marketing digital", "La fermeture de Bpifrance"], 2, "intermediaire", 1),
      qq("La LFP souligne notamment :", "Citation M. Chamak.", "Une plateforme intuitive et une équipe réactive", ["Une absence d’outil", "Uniquement du papier", "Aucun suivi RSE"], 2, "debutant", 1),
      qq(
        "Le livre blanc 2025 « RSE de performance » (Zei) propose surtout de :",
        "Source : sommaire + éditorial (PDF) — pédago. intégrée. ",
        "Dépasser l’empilement d’intentions / labels pour structurer donnée, impact et pilotage ",
        [
          "Renoncer entièrement à toute exigence CSRD",
          "Traiter l’ESG uniquement comme communication sans chiffre",
          "Figer la RSE en « vitrine statique » sans preuve (contredit) ",
        ],
        1,
        "intermediaire",
        2
      ),
      qq("Bpifrance et LFP sont cités comme :", "Clients / organisations utilisatrices.", "Organisations clientes de Zei", ["Concurrents de Zei", "Fournisseurs de Zei uniquement", "Régulateurs européens"], 1, "debutant", 1),
      qq(
        "Selon l’ouverture du PDF RSE 2025, 2025 sert notamment d’illustration de :",
        "Source : partie I. du livre blanc (gros reportings, dynamique RSE) ",
        "l’arrivée des grands reportings de durabilité structurés CSRD, comme déclencheur",
        [
          "la retraite sportive comme seul enjeu RSE (hors propos) ",
          "l’abandon d’une norme spécifique pour toutes les entreprises sans contexte (faux) ",
          "la résiliation de tout contrat d’hébergement (faux) ",
        ],
        1,
        "avance",
        2
      ),
      qq("L’URL pour « Lire plus de témoignages » sur l’accueil pointe vers :", "Chemin /temoignages.", "https://zei-world.com/temoignages", ["https://zei-world.com/pricing", "https://zei-world.com/register", "https://example.com"], 1, "debutant", null),
    ],
  });

  await seedModuleQuick(st6, {
    slug: "zei-outils-gratuits-chiffres-cles",
    title: "Outils gratuits et chiffres clés",
    description: "Simulateurs et grand chiffrage produit : site + Plaquette 2026 pour ne pas mélanger les compteurs d’acquisition. ",
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
    lesson2Title: "Partenariats, tarifs, et chiffres « offre Zei » (Plaquette)",
    lesson2Content: withSources(
      [
        {
          type: "paragraph",
          text: "Zei maintient une page « partnership » pour les partenariats (cabinets, intégrateurs). Les tarifs et la demande de démo sont accessibles depuis les pages publiques standards du site.",
        },
        {
          type: "callout",
          variant: "tip",
          title: "Vu par ZEI",
          text: "Pour le volume d’indicateurs ESG clé en main et l’ouverture référentiels, privilégiez la Plaquette 2026 (mêmes chiffres que le module « Mission & valeurs ») : elles se substituent aux compteurs marketing d’ancienne génération éventuels de la page d’accueil.",
        },
      ],
      [
        { label: "Zei — Plaquette synthétique 2026 (Google Slides)", url: SRC_ZEI.PLAQUETTE_2026 },
        { label: "Zei — Partenariats", url: SRC.PARTNERSHIP },
        { label: "Zei — Tarifs", url: SRC.PRICING },
      ]
    ),
    questions: [
      qq("L’ESG Budget Checker sert à :", "Sous-titre page d’accueil.", "Estimer son budget ESG", ["Calculer uniquement la masse salariale", "Remplacer la comptabilité", "Supprimer le bilan carbone"], 2, "debutant", 0),
      qq("L’ESG Navigator est présenté pour :", "Page resource.", "Clarifier obligations réglementaires et démarches volontaires", ["Remplacer un avocat fiscaliste", "Gérer uniquement les stocks", "Publier des résultats sportifs"], 2, "debutant", 1),
      qq("La page Navigator mentionne un indicateur :", "Texte « indicateur Zei unique ».", "Un indicateur Zei unique", ["Dix mille indicateurs obligatoires", "Aucun indicateur", "Uniquement le PIB"], 2, "intermediaire", 1),
      qq(
        "D’après la Plaquette 2026 (Zei en bref), le volume d’indicateurs ESG clé en main est d’environ :",
        "Coh. Plaquette + QCM Mission — se substitue aux blocs 8 000 possibles ailleurs. ",
        "20 000",
        ["8 000 (ancre marketing, à éviter si Plaquette sourcée) ", "200", "2 000 000 (hors champs) "],
        1,
        "intermediaire",
        0
      ),
      qq(
        "La Plaquette 2026 indique l’ouverture à (formulation) :",
        "Tableau d’ouverture — 130+ référentiels, pas 100+ générique. ",
        "130+ référentiels et standards",
        ["Moins de 5 au total", "Exactement 1 label privé", "0 référentiel"],
        1,
        "debutant",
        1
      ),
      qq("La page partenariat s’adresse notamment à :", "Texte typique Zei (cabinets, intégrateurs).", "Acteurs qui accompagnent des entreprises sur la RSE / ESG", ["Uniquement les particuliers sans activité", "Uniquement les mineurs", "Uniquement les banques centrales"], 2, "intermediaire", null),
      qq("Pour obtenir les tarifs, le site propose typiquement :", "Navigation standard.", "Une page « Tarifs » / pricing", ["Uniquement un numéro secret", "Aucune information", "Uniquement le dark web"], 1, "debutant", 1),
      qq("L’URL de l’ESG Navigator est :", "Ressource vérifiée.", "https://zei-world.com/resources/esg-navigator", ["https://zei-world.com/resources/fake", "https://zei-world.com/nav", "https://example.com"], 1, "debutant", null),
    ],
  });

  // 8 — Écosystème partenaires (Karbonpath, Zelio, SIMPL) — fiche interne alignée sur PARTNERS.md
  const stPartners = await getOrCreateSubtheme({
    themeId,
    slug: "ecosysteme-partenaires",
    title: "Écosystème partenaires",
    description:
      "Karbonpath, Zelio et SIMPL : trois spécialisations (conformité CSRD / mesure carbone / infrastructure) qui complètent la promesse de collecte et de pilotage ESG de Zei.",
    order: 8,
  });

  await seedModuleQuick(stPartners, {
    slug: "zei-partenaires-karbonpath-zelio-simpl",
    title: "Karbonpath, Zelio, SIMPL : l’écosystème intégré",
    description:
      "Comprendre le positionnement de chaque partenaire, la complémentarité avec Zei, et ce que cela apporte en profondeur fonctionnelle et sectorielle.",
    order: 1,
    estimatedMinutes: 20,
    difficulty: "intermediaire",
    lesson1Title: "Trois briques, une logique d’écosystème",
    lesson1Content: withSources(
      [
        { type: "heading", level: 2, text: "Karbonpath" },
        {
          type: "paragraph",
          text: "Karbonpath est une plateforme de pilotage ESG et de conformité extra-financière : structuration de la stratégie ESG, analyse de double matérialité, sélection des points de données ESRS, production d’un rapport CSRD et suivi de plans d’action. Le positionnement est « compliance + pilotage » : traçabilité, fiabilité du reporting, alignement réglementaire.",
        },
        { type: "heading", level: 2, text: "Zelio" },
        {
          type: "paragraph",
          text: "Zelio est une plateforme de comptabilité carbone et de reporting environnemental, avec collecte de données automatisée (IA) : bilan carbone, ACV, décarbonation, et réduction du temps sur les tâches de reporting répétitives. Elle sert à industrialiser le reporting carbone et accélérer des données exploitables pour les plans de décarbonation.",
        },
        { type: "heading", level: 2, text: "SIMPL" },
        {
          type: "paragraph",
          text: "SIMPL est une plateforme d’ESG reporting orientée infrastructure : processus (collecte, traitement, analyse), suivi de portefeuille, engagement des parties prenantes. C’est une brique spécialisée pour des obligations ESG complexes à l’échelle d’actifs ou de portefeuilles.",
        },
        { type: "heading", level: 2, text: "Rôle de Zei et complémentarité" },
        {
          type: "paragraph",
          text: "Zei se positionne comme plateforme de collecte et de pilotage ESG (fournisseurs, parties prenantes, questionnaires, suivi en temps réel, éviter la double saisie, consolidation, reporting automatisé). Les trois partenariats renforcent l’écosystème : conformité réglementaire, mesure carbone, verticalisation métier (infrastructure).",
        },
        {
          type: "table",
          headers: ["Partenaire", "Proposition", "Valeur pour Zei"],
          rows: [
            [
              "Karbonpath",
              "CSRD / ESG, double matérialité, reporting extra-financier",
              "Conformité et pilotage ESG réglementaire",
            ],
            ["Zelio", "Bilan carbone, ACV, IA sur le reporting environnemental", "Brique carbone et décarbonation"],
            [
              "SIMPL",
              "ESG infrastructure, suivi de portefeuille, parties prenantes",
              "Spécialisation sectorielle pour certains clients",
            ],
          ],
        },
        zeiCallout(
          "Lecture simple : Zei comme couche de collecte, orchestration et collaboration ESG ; les partenaires apportent des spécialisations pointues (conformité globale, carbone, infrastructure).",
          "Alignement interne fiche partenaires (contenu pédagogique) "
        ),
      ],
      [
        { label: "Zei — Partenariats (site)", url: SRC.PARTNERSHIP },
        { label: "Karbonpath", url: SRC.KARBONPATH },
        { label: "Zelio Impact", url: SRC.ZELIO },
        { label: "Simpl", url: SRC.SIMPL },
      ]
    ),
    lesson2Title: "Approfondissement et impact pour Zei",
    lesson2Content: withSources(
      [
        { type: "heading", level: 2, text: "Karbonpath — de la stratégie au reporting CSRD" },
        {
          type: "paragraph",
          text: "Karbonpath accompagne de la stratégie ESG au reporting de durabilité : conformité CSRD, pilotage de la performance, collecte fiabilisée connectée au SI. Briques mises en avant : double matérialité, périmètre de reporting, sélection parmi les 1 135 datapoints ESRS, rapport CSRD. La plateforme intègre aussi l’empreinte (Carbon Footprint) et l’ACV pour des indicateurs environnementaux et sociaux et des plans d’action. Pour Zei : couche de conformité et gouvernance, traçabilité et auditabilité pour industrialiser le reporting auprès de clients soumis à la CSRD.",
        },
        { type: "heading", level: 2, text: "Zelio — comptabilité carbone et assistant IA" },
        {
          type: "paragraph",
          text: "L’offre s’appuie sur l’extraction de données (ex. factures, Excel, CSV, images) via l’IA « Zelia ». Les référentiels couverts incluent notamment Bilan Carbone v9, BEGES-r, GHG Protocol, ISO 14069/14064 — pour des obligations et des démarches volontaires. Côté opération : périmètre, tâches collaborateur, suivi d’avancement, plan de réduction avec impact. Zei bénéficie d’une brique carbone solide (GES, homogénéisation des livrables).",
        },
        { type: "heading", level: 2, text: "SIMPL — infrastructure, SDG, taxonomie, SFDR" },
        {
          type: "paragraph",
          text: "Pensé pour l’infrastructure (actifs, fonds, acteurs sectoriels) : enchaînement collecte — traitement — analyse. Cadres intégrés : ODD (SDG), taxonomie européenne, indicateurs PAI (SFDR). L’outil dépasse le simple formulaire : benchmark entre pairs, agrégation actif / fonds / société, visualisations pour le reporting, suivi interannuel et comparaison de portefeuille. Pour Zei : répondre à des clients à besoins multi-actifs et lecture financière / réglementaire de l’impact.",
        },
        {
          type: "callout",
          variant: "important",
          title: "Synthèse",
          text: "Karbonpath = conformité CSRD et pilotage ESG ; Zelio = calcul carbone et automatisation de la donnée environnementale ; SIMPL = reporting ESG spécialisé infrastructure (SDG, taxonomie UE, SFDR). En pratique, Zei peut densifier l’offre et la crédibilité sans internaliser toutes les briques techniques du reporting durable.",
        },
      ],
      [
        { label: "Zei — Partenariats (site)", url: SRC.PARTNERSHIP },
        { label: "Karbonpath", url: SRC.KARBONPATH },
        { label: "Zelio Impact", url: SRC.ZELIO },
        { label: "Simpl", url: SRC.SIMPL },
      ]
    ),
    questions: [
      qq(
        "Quel positionnement caractérise le plus Karbonpath dans la fiche partenaires ?",
        "Karbonpath = compliance + pilotage, CSRD, ESRS.",
        "Conformité extra‑financière, double matérialité et reporting CSRD",
        [
          "Uniquement du recrutement en RSE, sans outil",
          "Uniquement de la comptabilité client sans carbone",
          "Un moteur de e‑mailing B2B déconnecté de l’ESG",
        ],
        2,
        "debutant",
        0
      ),
      qq(
        "Zelio est surtout mobilisé pour :",
        "Brique carbone, ACV, automatisation, standards GES.",
        "Comptabilité carbone, reporting environnemental et plans de décarbonation",
        [
          "Gestion des stocks d’entrepôt hors climat",
          "Campagnes de communication sans donnée chiffrée",
          "Uniquement l’indice boursier d’une seule place",
        ],
        2,
        "debutant",
        0
      ),
      qq(
        "SIMPL est conçu en priorité pour :",
        "Secteur infrastructure, portefeuille, PAI, taxonomie.",
        "L’infrastructure, les actifs et fonds, avec ESG structuré multi-actifs",
        [
          "Les particuliers sans sujet d’actifs",
          "L’agriculture biologique seule, sans autre cible",
          "Uniquement l’hôtellerie de luxe hors reporting",
        ],
        2,
        "debutant",
        0
      ),
      qq(
        "Selon la synthèse, qu’apporte Karbonpath à l’écosystème Zei en premier chef ?",
        "Table + complémentarité : conformité, CSRD, ESRS.",
        "La conformité, la gouvernance ESG et le pilotage du reporting réglementaire",
        [
          "L’hébergement d’e‑mails seulement",
          "L’infrastructure câblage réseau, hors ESG",
          "L’oubli de toute traçabilité (contredit la fiche)",
        ],
        2,
        "intermediaire",
        0
      ),
      qq(
        "Quels standards de mesure carbone sont évoqués à propos de Zelio ?",
        "Bilan Carbone v9, BEGES-r, GHG, ISO 14064/69.",
        "Par exemple Bilan Carbone v9, GHG Protocol, ISO 14064 et ISO 14069",
        [
          "Aucun référentiel, seulement du PDF non structuré",
          "Uniquement une norme culinaire, hors sujet",
          "Seulement du droit pénal des affaires, hors carbone",
        ],
        3,
        "intermediaire",
        1
      ),
      qq(
        "SIMPL met en avant trois grands types de cadres (énumération de la fiche) :",
        "SDG, taxonomie UE, SFDR PAI.",
        "Objectifs de développement durable (ODG/SDG), taxonomie européenne, indicateurs SFDR PAI",
        [
          "CNC, CAC, COFRAC (organismes d’audit seulement) ",
          "COP, OMC, BRI (géopolitique, hors cadrage produit) ",
          "Aucun cadre, seulement du free texte illimité",
        ],
        2,
        "avance",
        1
      ),
      qq(
        "Dans la lecture « couche Zei + spécialisations partenaires », le rôle principal de Zei est de :",
        "Collecte, orchestration, fournisseurs, consolidation.",
        "Collecter, orchestrer et consolider la donnée ESG côté entreprise et parties prenantes",
        [
          "Remplacer 100 % des outils d’infrastructure (faux) ",
          "Exclure tout reporting réglementaire (faux) ",
          "Se limiter à un seul chiffre marketing sans intégration (faux) ",
        ],
        2,
        "intermediaire",
        1
      ),
      qq(
        "L’enchaînement « ce que cela change pour Zei » insiste notamment sur :",
        "Dernière section PARTNERS : profondeur, crédibilité, couverture, écosystème client.",
        "Gagner en profondeur fonctionnelle, crédibilité réglementaire et couverture sectorielle sans tout développer en interne",
        [
          "Abandon de tout partenariat externe",
          "Réduction à un seul produit, sans R&D",
          "Désintérêt pour la taxonomie et le climat (contredit) ",
        ],
        1,
        "debutant",
        null
      ),
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
