/**
 * Seed script — Thème ESG (idempotent + --reset)
 * Usage : npx tsx scripts/seed-esg.ts
 * Reset : npx tsx scripts/seed-esg.ts --reset
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

function q(
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

async function seedESG() {
  const reset = process.argv.includes("--reset");

  if (reset) {
    console.log("\n🗑️  Mode reset : suppression du thème ESG existant...");
    const existing = await db.select({ id: quizThemes.id }).from(quizThemes).where(eq(quizThemes.slug, "esg"));
    if (existing.length > 0) {
      await db.delete(quizThemes).where(eq(quizThemes.slug, "esg"));
      console.log("  ✓  Thème ESG supprimé (cascade)\n");
    } else {
      console.log("  (aucun thème ESG trouvé)\n");
    }
  }

  console.log("🌱 Démarrage du seed ESG...\n");

  // ═══════════════════════════════════════════════════════════════════════════
  // Sources ZEI (Phase 15) — URLs publiques Hubspot CDN à citer dans les blocs
  // `sources` des leçons enrichies. Ne jamais tronquer ces URLs.
  //
  // Cf. docs/zei-knowledge/esg-collecte/*.md (frontmatter `source_url`).
  // ═══════════════════════════════════════════════════════════════════════════
  const GUIDE_URL =
    "https://4495458.fs1.hubspotusercontent-na1.net/hubfs/4495458/Livres%20blancs/Guide%20Zei%20-%20Collecte%20ESG%20%20arr%C3%AAtez%20de%20bricoler%2c%20commencez%20%C3%A0%20piloter.pdf";
  const GUIDE_LABEL =
    "ZEI — Guide Collecte ESG : arrêtez de bricoler, commencez à piloter (PDF)";
  const CHECKLIST_URL =
    "https://4495458.fs1.hubspotusercontent-na1.net/hubfs/4495458/Lead%20Magnets/Zei%20-%20Checklist%20Faites%20le%20point%20sur%20votre%20collecte%20ESG.pdf";
  const CHECKLIST_LABEL =
    "ZEI — Checklist : Faites le point sur votre collecte ESG (PDF)";
  const VSME_URL =
    "https://4495458.fs1.hubspotusercontent-na1.net/hubfs/4495458/Livres%20blancs/Zei%20-%20La%20VSME%20expliqu%C3%A9e%20-%20Le%20nouveau%20langage%20commun%20de%20la%20donn%C3%A9es%20ESG%20en%20Europe.pdf";
  const VSME_LABEL =
    "ZEI — La VSME expliquée : le nouveau langage commun de la donnée ESG (PDF)";

  const themeId = await getOrCreateTheme({
    slug: "esg",
    title: "ESG — Environnement, Social et Gouvernance",
    description:
      "Approfondissez les trois piliers ESG, les notations et données de marché (MSCI, Sustainalytics, Moody’s), les attentes PME vs grands groupes et l’investissement durable (SFDR, taxonomie, PRI).",
    icon: "BarChart2",
    color: "#0ea5e9",
    order: 3,
  });

  const stE = await getOrCreateSubtheme({
    themeId,
    slug: "esg-pilier-environnement",
    title: "Pilier E : bilan carbone, biodiversité, ressources",
    description:
      "Émissions GES (scopes), pressions sur la nature, circularité et gestion des ressources dans une stratégie ESG crédible.",
    order: 1,
  });
  const stS = await getOrCreateSubtheme({
    themeId,
    slug: "esg-pilier-social",
    title: "Pilier S : bien-être au travail, diversité, droits humains",
    description:
      "Conditions de travail, inclusion, chaîne de valeur et respect des droits humains comme risques et opportunités ESG.",
    order: 2,
  });
  const stG = await getOrCreateSubtheme({
    themeId,
    slug: "esg-pilier-gouvernance",
    title: "Pilier G : transparence, éthique, anti-corruption",
    description:
      "Gouvernance d’entreprise, contrôles internes, intégrité et lutte contre la corruption au service de la confiance des marchés.",
    order: 3,
  });
  const stN = await getOrCreateSubtheme({
    themeId,
    slug: "esg-notation",
    title: "Notation ESG : acteurs et méthodologies",
    description:
      "Agences de notation et fournisseurs de données ESG : logique de score, matérialité sectorielle et usages côté investisseurs.",
    order: 4,
  });
  const stPme = await getOrCreateSubtheme({
    themeId,
    slug: "esg-pme-vs-grandes-entreprises",
    title: "ESG pour les PME vs grandes entreprises",
    description:
      "Attentes différenciées, proportionnalité des données et collaboration dans la chaîne de valeur.",
    order: 5,
  });
  const stInv = await getOrCreateSubtheme({
    themeId,
    slug: "esg-investissement-durable",
    title: "Investissement durable et ESG",
    description:
      "Réglementation européenne (SFDR, taxonomie), stratégies d’investissement et dialogue avec les entreprises.",
    order: 6,
  });
  const stCollecte = await getOrCreateSubtheme({
    themeId,
    slug: "esg-collecte-pilotage",
    title: "Collecte ESG : arrêtez de bricoler, commencez à piloter",
    description:
      "Industrialiser la collecte ESG comme socle du pilotage : audit de la dette technique, gouvernance triptyque (Contributeur / Valideur / Administrateur), audit trail OTI et checklist post-collecte selon ZEI.",
    order: 7,
  });

  // ——— Pilier E ———
  await seedModuleQuick(stE, {
    slug: "esg-e-scopes-bilan-carbone",
    title: "Scopes 1, 2 et 3 : cadre d’un bilan carbone",
    description: "GHG Protocol : périmètre des émissions directes et indirectes et priorisation des leviers de réduction.",
    order: 1,
    estimatedMinutes: 14,
    difficulty: "debutant",
    lesson1Title: "Scopes 1 et 2 : émissions directes et énergie achetée",
    lesson1Content: [
      { type: "heading", level: 2, text: "Définir un inventaire d’émissions crédible" },
      {
        type: "paragraph",
        text: "Le pilier « E » couvre notamment le changement climatique. Les scopes du GHG Protocol sont la référence internationale pour classer les émissions de gaz à effet de serre d’une organisation.",
      },
      {
        type: "list",
        style: "bullet",
        items: [
          "Scope 1 : émissions directes (combustion, véhicules, procédés industriels).",
          "Scope 2 : émissions indirectes liées à l’énergie achetée (électricité, chaleur, vapeur).",
        ],
      },
      {
        type: "callout",
        variant: "tip",
        title: "Bon réflexe",
        text: "Avant d’optimiser le scope 3, stabiliser scopes 1–2 renforce la lisibilité pour les investisseurs et les banques.",
      },
      {
        type: "sources",
        items: [
          {
            label: "GHG Protocol — Corporate Standard",
            url: "https://ghgprotocol.org/corporate-standard",
          },
          {
            label: "GHG Protocol — Corporate Value Chain (Scope 3) Standard",
            url: "https://ghgprotocol.org/corporate-value-chain-scope-3-standard",
          },
        ],
      },
    ],
    lesson2Title: "Scope 3 : chaîne de valeur et matérialité",
    lesson2Content: [
      { type: "heading", level: 2, text: "Pourquoi le scope 3 domine souvent le bilan" },
      {
        type: "paragraph",
        text: "Les achats, la logistique aval, l’usage des produits vendus ou le traitement en fin de vie peuvent représenter la majeure partie des émissions. Le GHG Protocol distingue 15 catégories pour structurer le travail.",
      },
      {
        type: "table",
        headers: ["Catégorie (exemples)", "Amont / aval", "Point d’attention"],
        rows: [
          ["Achats de biens et services", "Amont", "Données fournisseurs, facteurs d’émission"],
          ["Transport amont / aval", "Les deux", "Modes, distances, taux de remplissage"],
          ["Usage des produits vendus", "Aval", "Hypothèses d’usage client"],
        ],
      },
      {
        type: "regulatory_note",
        year: 2026,
        companySize: "large",
        text: "Les grandes entreprises soumises à CSRD intègrent des informations climat (E1) cohérentes avec une trajectoire de transition ; le scope 3 est au cœur des enjeux de matérialité.",
      },
      {
        type: "sources",
        items: [
          {
            label: "Commission européenne — Stratégie finance durable",
            url: "https://finance.ec.europa.eu/sustainable-finance/overview/sustainable-finance-strategy_en",
          },
        ],
      },
    ],
    questions: [
      q(
        "Les émissions du scope 1 correspondent à :",
        "Émissions directement contrôlées ou possédées par l’entreprise.",
        "Des émissions directes des sources possédées ou contrôlées",
        ["Uniquement l’électricité achetée", "Uniquement les fournisseurs", "Uniquement les clients"],
        1,
        "debutant",
        0
      ),
      q(
        "Le scope 2 concerne principalement :",
        "Émissions liées à l’énergie achetée.",
        "Les émissions indirectes liées à l’énergie achetée",
        ["Les déplacements clients", "Les déchets", "Les dividendes"],
        1,
        "debutant",
        0
      ),
      q(
        "Le scope 3 couvre :",
        "Toutes les autres émissions indirectes de la chaîne de valeur.",
        "Les autres émissions indirectes de la chaîne de valeur",
        ["Uniquement le siège social", "Les impôts locaux", "La trésorerie"],
        2,
        "intermediaire",
        1
      ),
      q(
        "Le GHG Protocol est utile pour :",
        "Harmoniser la comptabilisation des GES.",
        "Structurer un inventaire de GES comparable et reproductible",
        ["Remplacer la comptabilité financière", "Mesurer uniquement l’eau", "Calculer la masse salariale"],
        2,
        "intermediaire",
        1
      ),
      q(
        "Prioriser les catégories scope 3 les plus matérielles sert à :",
        "Concentrer les efforts de collecte et d’action.",
        "Allouer les ressources là où l’impact carbone est le plus significatif",
        ["Ignorer les fournisseurs", "Éviter toute donnée", "Supprimer le scope 1"],
        2,
        "intermediaire",
        null
      ),
      q(
        "Une banque analyse souvent en priorité :",
        "Les émissions liées au portefeuille de financement (scope 3 cat. 15).",
        "Les émissions financées (catégorie 15 du scope 3 pour les FI)",
        ["Uniquement le papier en bureau", "Les logos RSE", "Les likes sur les réseaux"],
        3,
        "avance",
        null
      ),
      q(
        "Les facteurs d’émission permettent de :",
        "Convertir activité (kWh, km…) en tCO₂e.",
        "Convertir des données d’activité en quantités de GES",
        ["Supprimer les audits", "Remplacer la gouvernance", "Mesurer le chiffre d’affaires"],
        1,
        "debutant",
        null
      ),
      q(
        "Un inventaire scope 1–3 bien documenté aide surtout :",
        "Cohérence avec objectifs climat et reporting.",
        "À piloter la transition et à répondre aux attentes réglementaires et financières",
        ["À masquer les risques", "À éviter les fournisseurs", "À supprimer le conseil d’administration"],
        2,
        "intermediaire",
        null
      ),
    ],
  });

  await seedModuleQuick(stE, {
    slug: "esg-e-biodiversite-ressources",
    title: "Biodiversité, dépendances et ressources",
    description: "TNFD, économie circulaire et gestion de l’eau comme compléments au volet climat du pilier E.",
    order: 2,
    estimatedMinutes: 15,
    difficulty: "intermediaire",
    lesson1Title: "Nature et dépendances : cadre TNFD",
    lesson1Content: [
      { type: "heading", level: 2, text: "Au-delà du carbone : risques liés à la nature" },
      {
        type: "paragraph",
        text: "Les investisseurs et régulateurs s’intéressent aux impacts et dépendances vis-à-vis des écosystèmes (eau, sols, pollution, perte de biodiversité). Le Taskforce on Nature-related Financial Disclosures (TNFD) propose un cadre de reporting aligné sur la logique TCFD.",
      },
      {
        type: "callout",
        variant: "info",
        title: "LEAP en résumé",
        text: "Locate–Evaluate–Assess–Prepare : une approche itérative pour identifier les enjeux de nature pertinents par localisation et filière.",
      },
      {
        type: "sources",
        items: [
          { label: "TNFD — Taskforce on Nature-related Financial Disclosures", url: "https://tnfd.global/" },
          {
            label: "OECD — OECD Guidelines for Multinational Enterprises on Responsible Business Conduct",
            url: "https://mneguidelines.oecd.org/mneguidelines/",
          },
        ],
      },
    ],
    lesson2Title: "Ressources, déchets et circularité",
    lesson2Content: [
      { type: "heading", level: 2, text: "Efficacité et circularité" },
      {
        type: "paragraph",
        text: "Le pilier E inclut la consommation responsable des ressources : matières premières critiques, eau, déchets, design pour le recyclage. Les notations ESG sectorielles pondèrent souvent ces enjeux selon la matérialité.",
      },
      {
        type: "list",
        style: "bullet",
        items: [
          "Identifier les matières à fort risque d’approvisionnement.",
          "Réduire, réutiliser, recycler avec des indicateurs traçables.",
          "Intégrer les fournisseurs dans des programmes d’éco-conception.",
        ],
      },
      {
        type: "sources",
        items: [
          {
            label: "ADEME — Économie circulaire (ressources officielles)",
            url: "https://www.ademe.fr/expertises/economie-circulaire",
          },
        ],
      },
    ],
    questions: [
      q(
        "Le TNFD vise principalement à :",
        "Standardiser l’information sur les enjeux financiers liés à la nature.",
        "Améliorer la transparence sur les risques et opportunités liés à la nature",
        ["Remplacer la comptabilité nationale", "Mesurer uniquement le bruit", "Supprimer les audits financiers"],
        2,
        "intermediaire",
        0
      ),
      q(
        "Une « dépendance » vis-à-vis de la nature signifie :",
        "L’entreprise repose sur des services écosystémiques.",
        "L’activité repose sur des services fournis par les écosystèmes",
        ["Aucun lien avec la production", "Uniquement un label marketing", "Uniquement le climat"],
        2,
        "intermediaire",
        0
      ),
      q(
        "La circularité concerne surtout :",
        "Boucles de valeur et fin de vie des produits.",
        "Réduire l’extraction de matières vierges et les pertes en fin de cycle",
        ["Uniquement les dividendes", "Uniquement les salaires", "Uniquement la fiscalité"],
        1,
        "debutant",
        1
      ),
      q(
        "Les matières premières critiques sont sensibles à :",
        "Géopolitique, rareté, régulation.",
        "Risques d’approvisionnement, prix volatils et réputation",
        ["Uniquement la météo locale d’un jour", "Les couleurs du logo", "Le nombre de likes"],
        2,
        "intermediaire",
        1
      ),
      q(
        "L’OCDE rappelle aux entreprises multinationales :",
        "Conduite responsable tout au long de la chaîne de valeur.",
        "Des attentes en matière de diligence raisonnable sur droits humains et environnement",
        ["D’ignorer les filiales", "D’éviter tout dialogue", "De ne publier aucune donnée"],
        2,
        "intermediaire",
        null
      ),
      q(
        "Intégrer la biodiversité dans la stratégie ESG sert à :",
        "Anticiper régulation, coûts et accès aux financements.",
        "Réduire les risques physiques et transitionnels liés à la nature",
        ["Augmenter artificiellement le CA", "Supprimer les fournisseurs", "Remplacer le PDG"],
        3,
        "avance",
        null
      ),
      q(
        "Un indicateur « eau » pertinent peut être :",
        "Prélèvement en zone de stress hydrique.",
        "Volume prélevé ou consommé dans des bassins sous stress hydrique",
        ["Nombre de plantes en bureau", "Couleur du site web", "Nombre d’actions en bourse"],
        2,
        "intermediaire",
        null
      ),
      q(
        "L’éco-conception vise notamment à :",
        "Réduire l’impact sur tout le cycle de vie.",
        "Diminuer l’impact environnemental dès la phase de conception",
        ["Augmenter le suremballage", "Rendre le produit non réparable", "Ignorer la fin de vie"],
        1,
        "debutant",
        null
      ),
    ],
  });

  // ——— Pilier S ———
  await seedModuleQuick(stS, {
    slug: "esg-s-bien-etre-diversite",
    title: "Bien-être au travail et diversité",
    description: "Santé psychosociale, QVT et politiques d’inclusion comme facteurs de performance et de risque ESG.",
    order: 1,
    estimatedMinutes: 13,
    difficulty: "debutant",
    lesson1Title: "Qualité de vie au travail et indicateurs S",
    lesson1Content: [
      { type: "heading", level: 2, text: "Le social au cœur du risque entreprise" },
      {
        type: "paragraph",
        text: "Le pilier S couvre les droits et conditions des travailleurs, la diversité, la formation et parfois les communautés impactées. Les agences ESG croisent données déclaratives, enquêtes et signaux de controverses.",
      },
      {
        type: "table",
        headers: ["Thème", "Exemples d’indicateurs", "Pourquoi c’est matériel"],
        rows: [
          ["Santé et sécurité", "Fréquence et gravité des accidents", "Coûts, interruptions, image"],
          ["Diversité & équité", "Parts femmes/hommes à chaque niveau", "Innovation, recrutement, conformité"],
          ["Dialogue social", "Accords, négociations", "Stabilité opérationnelle"],
        ],
      },
      {
        type: "sources",
        items: [
          {
            label: "OIT — Travail décent et droits fondamentaux",
            url: "https://www.ilo.org/global/topics/labour-standards/lang--fr/index.htm",
          },
        ],
      },
    ],
    lesson2Title: "Inclusion et non-discrimination",
    lesson2Content: [
      { type: "heading", level: 2, text: "Diversité utile, pas décorative" },
      {
        type: "paragraph",
        text: "Les investisseurs attendent des politiques mesurables : recrutement, promotions, égalité salariale, lutte contre le harcèlement. Les écarts inexpliqués entre groupes comparables signalent un risque réputationnel et juridique.",
      },
      {
        type: "callout",
        variant: "warning",
        title: "Controverses",
        text: "Un incident grave (discrimination systémique, atteinte aux droits humains dans la chaîne de valeur) peut faire chuter un score ESG indépendamment des politiques affichées.",
      },
      {
        type: "sources",
        items: [
          {
            label: "PNUD — Objectifs de développement durable (ODD)",
            url: "https://www.undp.org/sustainable-development-goals",
          },
        ],
      },
    ],
    questions: [
      q(
        "Le pilier S inclut typiquement :",
        "Enjeux liés aux personnes et à la société.",
        "Conditions de travail, droits humains et diversité",
        ["Uniquement le bilan carbone", "Uniquement la trésorerie", "Uniquement les brevets"],
        1,
        "debutant",
        0
      ),
      q(
        "Un indicateur de diversité pertinent mesure souvent :",
        "Représentation à tous les niveaux hiérarchiques.",
        "La répartition des profils dans les recrutements et promotions",
        ["Uniquement le nombre de plantes", "La couleur du siège", "Le nombre de logos"],
        2,
        "intermediaire",
        0
      ),
      q(
        "La QVT peut être liée à :",
        "Risques psychosociaux et absentéisme.",
        "Santé mentale, charge de travail et climat social",
        ["Uniquement la décoration", "Les impôts sur les sociétés", "La taille du parking uniquement"],
        2,
        "intermediaire",
        1
      ),
      q(
        "Les controverses sociales impactent les notations car :",
        "Elles signalent un écart gouvernance / réalité.",
        "Elles révèlent des risques non capturés par les politiques publiées",
        ["Elles sont ignorées", "Elles augmentent toujours le score", "Elles sont confidentielles à 100 %"],
        2,
        "intermediaire",
        1
      ),
      q(
        "L’OIT fixe notamment :",
        "Standards internationaux du travail.",
        "Des normes fondamentales sur le travail (libertés, non-discrimination, etc.)",
        ["Des taux de change", "Des prix du pétrole", "Des quotas boursiers"],
        2,
        "intermediaire",
        null
      ),
      q(
        "Un bon reporting S combine :",
        "Politiques + résultats + incidents.",
        "Engagements, indicateurs chiffrés et gestion des incidents",
        ["Uniquement des slogans", "Uniquement des photos", "Aucune donnée"],
        2,
        "intermediaire",
        null
      ),
      q(
        "L’inclusion va au-delà du recrutement car elle concerne :",
        "Parcours, rémunération, pouvoir de décision.",
        "L’accès aux responsabilités et à la rémunération équitable",
        ["Uniquement les cartes de visite", "Les couleurs du site", "Les fournisseurs IT uniquement"],
        3,
        "avance",
        null
      ),
      q(
        "Les ODD de l’ONU servent souvent à :",
        "Structurer les priorités extra-financières.",
        "Donner un langage commun aux enjeux de développement durable",
        ["Remplacer la loi française", "Supprimer la fiscalité", "Mesurer uniquement le cash-flow"],
        1,
        "debutant",
        null
      ),
    ],
  });

  await seedModuleQuick(stS, {
    slug: "esg-s-droits-humains-chaine",
    title: "Droits humains et chaîne de valeur",
    description: "Due diligence droits de l’homme, fournisseurs et travail forcé : attentes réglementaires et ESG.",
    order: 2,
    estimatedMinutes: 14,
    difficulty: "intermediaire",
    lesson1Title: "Due diligence et chaîne d’approvisionnement",
    lesson1Content: [
      { type: "heading", level: 2, text: "Risques humains dans les filières" },
      {
        type: "paragraph",
        text: "Le pilier S s’étend aux travailleurs des fournisseurs et sous-traitants. Les lois de vigilance et les attentes des investisseurs demandent des processus d’identification, prévention et remédiation.",
      },
      {
        type: "sources",
        items: [
          {
            label: "OCDE — Lignes directrices pour entreprises multinationales",
            url: "https://www.oecd.org/corporate/mne/",
          },
        ],
      },
    ],
    lesson2Title: "Indicateurs et audits fournisseurs",
    lesson2Content: [
      { type: "heading", level: 2, text: "Au-delà du questionnaire" },
      {
        type: "paragraph",
        text: "Les questionnaires ESG standardisés (EcoVadis, CDP Supply Chain…) complètent audits sur site et données tierces. L’objectif est de prioriser les sites à risque plutôt que de multiplier les PDF inutilisés.",
      },
      {
        type: "sources",
        items: [
          { label: "CDP — Supply chain et climat", url: "https://www.cdp.net/en" },
        ],
      },
    ],
    questions: [
      q(
        "La diligence raisonnable sur les droits humains implique :",
        "Identifier, prévenir, atténuer et réparer.",
        "Identifier les impacts, agir et fournir des voies de réparation",
        ["Ignorer les fournisseurs", "Publier uniquement une vidéo", "Supprimer les contrats écrits"],
        2,
        "intermediaire",
        0
      ),
      q(
        "Un « hotspot » fournisseur est :",
        "Zone ou site à risque concentré.",
        "Un segment de chaîne à risque élevé nécessitant plus de contrôle",
        ["Un fournisseur le moins cher", "Un bureau à Paris uniquement", "Un concurrent"],
        2,
        "intermediaire",
        0
      ),
      q(
        "Les audits sociaux sont utiles si :",
        "Ils sont indépendants et suivis d’actions.",
        "Ils sont crédibles, documentés et suivis de plans de correction",
        ["Ils durent 5 minutes", "Ils remplacent la direction", "Ils sont confidentiels sans suite"],
        2,
        "intermediaire",
        1
      ),
      q(
        "Le CDP est surtout connu pour :",
        "Données climat et environnementales.",
        "La collecte standardisée de données climat et environnementales",
        ["Les salaires des PDG", "La notation sportive", "Les taux d’intérêt"],
        2,
        "intermediaire",
        1
      ),
      q(
        "Un indicateur de travail décent peut inclure :",
        "Salaire vivant, heures, contrats.",
        "Respect du salaire minimum / vivant et stabilité des contrats",
        ["Uniquement la couleur des uniformes", "Le nombre de fenêtres", "La marque du café"],
        1,
        "debutant",
        null
      ),
      q(
        "Les investisseurs scrutent les chaînes car :",
        "Risque réputationnel et juridique répercuté.",
        "Les incidents en amont peuvent impacter valorisation et accès au marché",
        ["C’est illégal de ne pas le faire", "Les chaînes n’existent pas", "C’est neutre"],
        2,
        "intermediaire",
        null
      ),
      q(
        "La remédiation signifie :",
        "Corriger les torts subis par les victimes.",
        "Réparer les impacts négatifs sur les personnes concernées",
        ["Ignorer les plaintes", "Changer uniquement le logo", "Supprimer les preuves"],
        3,
        "avance",
        null
      ),
      q(
        "Prioriser les fournisseurs critiques repose sur :",
        "Volume, criticité, pays, secteur.",
        "Critères de sévérité et d’exposition dans la chaîne",
        ["Leur couleur préférée", "Leur distance au siège uniquement", "Le nombre de tweets"],
        2,
        "intermediaire",
        null
      ),
    ],
  });

  // ——— Pilier G ———
  await seedModuleQuick(stG, {
    slug: "esg-g-transparence-gouvernance",
    title: "Transparence et gouvernance d’entreprise",
    description: "Conseil d’administration, indépendance, rémunérations et contrôle interne comme socle du pilier G.",
    order: 1,
    estimatedMinutes: 12,
    difficulty: "debutant",
    lesson1Title: "Conseil, comités et indépendance",
    lesson1Content: [
      { type: "heading", level: 2, text: "Gouvernance = cadres de décision" },
      {
        type: "paragraph",
        text: "Le pilier G couvre la structure du conseil, la séparation des pouvoirs, la gestion des conflits d’intérêts et la qualité de l’information aux actionnaires. Les agences ESG évaluent l’alignement intérêts dirigeants / actionnaires à long terme.",
      },
      {
        type: "list",
        style: "bullet",
        items: [
          "Comités audit, risques, rémunération.",
          "Taux d’administrateurs indépendants et diversité des profils.",
          "Clarté des transactions avec parties liées.",
        ],
      },
      {
        type: "sources",
        items: [
          {
            label: "OCDE — Principes de gouvernance d’entreprise",
            url: "https://www.oecd.org/corporate/principles-corporate-governance/",
          },
        ],
      },
    ],
    lesson2Title: "Contrôle interne et gestion des risques",
    lesson2Content: [
      { type: "heading", level: 2, text: "Culture du risque et ESG" },
      {
        type: "paragraph",
        text: "Les contrôles internes (dont trois lignes de défense) doivent intégrer risques climatiques, sociaux et de conformité. Les faiblesses révélées par des lanceurs d’alerte ou des sanctions pèsent fortement sur les scores G.",
      },
      {
        type: "callout",
        variant: "important",
        title: "Transparence",
        text: "Les marchés sanctionnent l’opacité sur la rémunération variable liée au durable si les critères ne sont pas vérifiables.",
      },
      {
        type: "callout",
        variant: "tip",
        title: "Vu par ZEI",
        text:
          "Avec la CSRD, les rapports ESG sont audités par des commissaires aux comptes ou organismes tiers indépendants (OTI). La piste d'audit fiable est la colonne vertébrale de la crédibilité : chaque indicateur consolidé doit pouvoir être dé-tricoté jusqu'à l'unité de mesure initiale. Trois piliers selon ZEI — horodatage immuable, traçabilité des auteurs (« qui a modifié quoi »), motif de modification obligatoire en commentaire. Source : ZEI — Guide collecte ESG (chap. IV).",
      },
      {
        type: "sources",
        items: [
          {
            label: "Autorité des marchés financiers (AMF) — gouvernance et information",
            url: "https://www.amf-france.org/",
          },
          { label: GUIDE_LABEL, url: GUIDE_URL },
        ],
      },
    ],
    questions: [
      q(
        "Le pilier G concerne surtout :",
        "Structures de pouvoir et éthique des décisions.",
        "Gouvernance, éthique des affaires et transparence",
        ["Uniquement le marketing", "Uniquement le climat", "Uniquement les stocks"],
        1,
        "debutant",
        0
      ),
      q(
        "Un administrateur indépendant est utile pour :",
        "Limiter les conflits d’intérêts.",
        "Apporter un regard extérieur sur les décisions stratégiques sensibles",
        ["Signer seul tous les chèques", "Remplacer les salariés", "Supprimer l’audit"],
        2,
        "intermediaire",
        0
      ),
      q(
        "La rémunération liée au durable doit être :",
        "Mesurable et auditée.",
        "Basée sur des critères vérifiables et documentés",
        ["Secrète", "Toujours identique pour tous", "Sans lien avec la stratégie"],
        2,
        "intermediaire",
        1
      ),
      q(
        "Le contrôle interne vise à :",
        "Raisonnable assurance sur objectifs.",
        "Donner une assurance raisonnable sur la fiabilité des opérations",
        ["Supprimer les risques à 100 %", "Remplacer le conseil", "Éliminer la fiscalité"],
        2,
        "intermediaire",
        1
      ),
      q(
        "Les parties liées sont sensibles car :",
        "Risque de transfert de valeur.",
        "Elles peuvent détourner des ressources au détriment des actionnaires minoritaires",
        ["Elles n’existent jamais", "Elles sont neutres", "Elles sont illégales par définition"],
        3,
        "avance",
        null
      ),
      q(
        "Un bon disclosure G inclut :",
        "Politiques, instances, incidents.",
        "Structure de gouvernance, politiques anticorruption et gestion des litiges",
        ["Uniquement des emojis", "Rien sur les comités", "Uniquement le logo"],
        2,
        "intermediaire",
        null
      ),
      q(
        "La séparation PDG / Président du conseil peut :",
        "Renforcer les contre-pouvoirs.",
        "Renforcer l’équilibre des pouvoirs au sommet de l’entreprise",
        ["Être interdite", "Être neutre à chaque fois", "Supprimer le conseil"],
        2,
        "intermediaire",
        null
      ),
      q(
        "Les lanceurs d’alerte bien traités réduisent :",
        "Risque de fraude prolongée.",
        "Le risque que des problèmes majeurs restent cachés",
        ["La transparence", "La confiance", "Les ventes toujours"],
        1,
        "debutant",
        null
      ),
      q(
        "Selon ZEI, sur quels trois piliers repose la piste d'audit ESG attendue par un OTI (organisme tiers indépendant) ?",
        "ZEI identifie trois piliers d'audit trail : horodatage immuable de chaque saisie, traçabilité des auteurs (« qui a modifié quoi »), et motif de modification obligatoire en cas de correction d'une donnée historique (source : ZEI — Guide collecte ESG, §IV.2).",
        "Horodatage immuable, traçabilité des auteurs, motif de modification",
        [
          "Antivirus, sauvegarde quotidienne et chiffrement des disques",
          "ISO 27001 + ISO 9001 + ISO 14001",
          "Mot de passe, double authentification et VPN",
        ],
        3,
        "avance",
        1
      ),
    ],
  });

  await seedModuleQuick(stG, {
    slug: "esg-g-ethique-anti-corruption",
    title: "Éthique des affaires et anti-corruption",
    description: "Lutte contre la corruption, conflits d’intérêts et conformité internationale (FCPA, UK Bribery Act, Loi Sapin II).",
    order: 2,
    estimatedMinutes: 13,
    difficulty: "intermediaire",
    lesson1Title: "Cadres internationaux et culture d’intégrité",
    lesson1Content: [
      { type: "heading", level: 2, text: "Corruption = risque systémique" },
      {
        type: "paragraph",
        text: "Les programmes anticorruption couvrent cadeaux et invitations, agents commerciaux à l’étranger, due diligence M&A et partenariats publics. Les notations ESG pénalisent fortement les procédures et condamnations avérées.",
      },
      {
        type: "regulatory_note",
        year: 2026,
        companySize: "large",
        text: "En France, la Loi Sapin II impose un dispositif anticorruption pour certaines entreprises ; les filiales à l’international restent exposées aux lois extraterritoriales américaines ou britanniques.",
      },
      {
        type: "sources",
        items: [
          {
            label: "OCDE — Convention anticorruption",
            url: "https://www.oecd.org/daf/anti-bribery/",
          },
        ],
      },
    ],
    lesson2Title: "Tiers de confiance et formation",
    lesson2Content: [
      { type: "heading", level: 2, text: "Opérationnaliser la conformité" },
      {
        type: "paragraph",
        text: "La cartographie des risques pays / secteur, la vérification des intermédiaires (KYS), les clauses contractuelles anticorruption et la formation des équipes commerciales sont des preuves attendues par les enquêteurs comme par les investisseurs.",
      },
      {
        type: "sources",
        items: [
          {
            label: "Transparency International — Corruption Perceptions Index (méthodo)",
            url: "https://www.transparency.org/en/cpi/2024",
          },
        ],
      },
    ],
    questions: [
      q(
        "Un programme anticorruption crédible inclut :",
        "Tone at the top + contrôles + sanctions.",
        "Engagement de la direction, contrôles et sanctions internes",
        ["Uniquement un poster", "Aucune formation", "Ignorer les filiales"],
        2,
        "intermediaire",
        0
      ),
      q(
        "Un agent commercial à risque élevé nécessite :",
        "Due diligence renforcée.",
        "Des vérifications renforcées et une surveillance des commissions",
        ["Aucun contrat écrit", "Uniquement une poignée de main", "Aucun KYC"],
        2,
        "intermediaire",
        0
      ),
      q(
        "La Loi Sapin II (France) concerne notamment :",
        "Dispositif anticorruption pour grandes organisations éligibles.",
        "Un programme anticorruption pour certaines entreprises et la protection des lanceurs d’alerte",
        ["Uniquement les PME de moins de 5 salariés", "Les particuliers uniquement", "Les écoles primaires"],
        3,
        "avance",
        1
      ),
      q(
        "Les pots-de-vin à l’étranger peuvent exposer :",
        "Sanctions dans plusieurs juridictions.",
        "Des sanctions dans le pays de l’entreprise mère et dans le pays cible",
        ["Personne", "Uniquement le client", "Uniquement les médias locaux"],
        2,
        "intermediaire",
        1
      ),
      q(
        "La « tone at the top » signifie :",
        "Exemplarité des dirigeants.",
        "Le comportement des dirigeants fixe la norme éthique",
        ["Ignorer la compliance", "Multiplier les silos", "Réduire les audits"],
        1,
        "debutant",
        null
      ),
      q(
        "Un conflit d’intérêts survient quand :",
        "Intérêts personnels croisent intérêt de l’entreprise.",
        "Un décideur a des intérêts privés incompatibles avec sa mission",
        ["Tout le monde est d’accord", "Il n’y a pas de décision", "Les ventes baissent"],
        2,
        "intermediaire",
        null
      ),
      q(
        "Transparency International mesure surtout :",
        "Perception de la corruption par pays.",
        "La perception de la corruption dans le secteur public",
        ["La météo", "Les salaires minimaux", "Les taux de change"],
        2,
        "intermediaire",
        null
      ),
      q(
        "Les clauses anticorruption dans les contrats servent à :",
        "Clarifier obligations et sorties.",
        "Exiger des standards et prévoir résiliation en cas de manquement",
        ["Interdire toute vente", "Remplacer la loi", "Supprimer les audits"],
        2,
        "intermediaire",
        null
      ),
    ],
  });

  // ——— Notation ———
  await seedModuleQuick(stN, {
    slug: "esg-notation-agences-methodes",
    title: "MSCI, Sustainalytics et Moody’s : panorama",
    description: "Comment les principaux fournisseurs positionnent les entreprises et agrègent données publiques et tierces.",
    order: 1,
    estimatedMinutes: 15,
    difficulty: "intermediaire",
    lesson1Title: "MSCI ESG Ratings : relatif au secteur",
    lesson1Content: [
      { type: "heading", level: 2, text: "Notation relative et enjeux clés" },
      {
        type: "paragraph",
        text: "MSCI évalue la résilience d’une entreprise aux risques et opportunités ESG financièrement pertinents pour son industrie (notation AAA à CCC). L’approche est comparative aux pairs du même sous-secteur GICS.",
      },
      {
        type: "callout",
        variant: "tip",
        title: "Vu par ZEI",
        text:
          "Au-delà du score, c'est la qualité de la collecte qui rend la note crédible : aujourd'hui une direction RSE passe en moyenne 80 % de son temps à collecter la donnée (relances, nettoyage de fichiers, vérification des unités) et seulement 20 % à l'analyser et à piloter. Sans industrialisation, le rating ESG s'appuie sur une matière première fragile. Source : ZEI — Guide collecte ESG.",
      },
      {
        type: "sources",
        items: [
          {
            label: "MSCI — ESG Ratings (solutions durabilité)",
            url: "https://www.msci.com/data-and-analytics/sustainability-solutions/esg-ratings",
          },
          { label: GUIDE_LABEL, url: GUIDE_URL },
        ],
      },
    ],
    lesson2Title: "Sustainalytics (Morningstar) et scores Moody’s",
    lesson2Content: [
      { type: "heading", level: 2, text: "Exposition vs gestion du risque" },
      {
        type: "paragraph",
        text: "Sustainalytics met l’accent sur l’exposition sectorielle aux risques ESG et la qualité de la gestion (ESG Risk Rating). Moody’s intègre des scores ESG et des données climat au sein de ses offres d’analyse de risque de crédit.",
      },
      {
        type: "table",
        headers: ["Fournisseur", "Logique souvent mise en avant", "Usage typique"],
        rows: [
          ["MSCI", "Résilience sectorielle, controverses", "Indices, fonds, engagement"],
          ["Sustainalytics", "Risque ESG absolu / relatif", "Fonds Article 8/9, plateformes"],
          ["Moody’s", "Scores ESG + crédit", "Banques, marchés obligataires"],
        ],
      },
      {
        type: "sources",
        items: [
          {
            label: "Morningstar Sustainalytics — ESG Risk Ratings methodology",
            url: "https://www.sustainalytics.com/esg-ratings/methodology",
          },
          {
            label: "Moody’s — ESG (capacités)",
            url: "https://www.moodys.com/web/en/us/capabilities/esg.html",
          },
        ],
      },
    ],
    questions: [
      q(
        "Les notations MSCI ESG sont en grande partie :",
        "Relatives aux pairs du même secteur.",
        "Comparatives au sein d’un même groupe sectoriel (GICS)",
        ["Absolues identiques pour tous secteurs", "Basées uniquement sur le prix de l’action", "Secrètes"],
        2,
        "intermediaire",
        0
      ),
      q(
        "Sustainalytics met l’accent sur :",
        "Exposition et gestion des risques ESG.",
        "L’exposition sectorielle et la qualité de la gestion des risques ESG",
        ["Uniquement le marketing", "Uniquement les dividendes", "Uniquement la taille du siège"],
        2,
        "intermediaire",
        0
      ),
      q(
        "Moody’s utilise les données ESG notamment pour :",
        "Enrichir l’analyse de risque de crédit.",
        "Relier performance ESG et profils de risque financier",
        ["Remplacer les états financiers", "Supprimer les notations", "Mesurer les likes"],
        2,
        "intermediaire",
        1
      ),
      q(
        "Les controverses dans les modèles servent souvent à :",
        "Ajuster le score après incidents.",
        "Pénaliser ou nuancer le score suite à incidents médiatisés ou sanctions",
        ["Augmenter toujours le score", "Ignorer les médias", "Supprimer l’historique"],
        2,
        "intermediaire",
        1
      ),
      q(
        "Deux entreprises avec le même score brut peuvent différer car :",
        "Secteurs et pondérations différents.",
        "Les pondérations des enjeux matériels varient selon l’industrie",
        ["Les scores sont identiques partout", "Il n’y a pas de méthodo", "C’est aléatoire"],
        3,
        "avance",
        null
      ),
      q(
        "Un investisseur utilise les ratings pour :",
        "Filtrer, engager, suivre l’allocation.",
        "Construire des portefeuilles et suivre l’évolution des risques",
        ["Remplacer la fiscalité", "Choisir un fournisseur de café", "Ignorer la liquidité"],
        1,
        "debutant",
        null
      ),
      q(
        "Les données « alternative » peuvent inclure :",
        "Satellite, NLP sur médias, signaux web.",
        "Sources non financières traditionnelles complétant les rapports",
        ["Uniquement le papier", "Rien", "Uniquement les rumeurs anonymes"],
        2,
        "intermediaire",
        null
      ),
      q(
        "Un écart entre rating MSCI et Sustainalytics peut s’expliquer par :",
        "Méthodes, périmètre, moment de mise à jour.",
        "Des définitions de matérialité, des périmètres corporates et des calendriers de mise à jour différents",
        ["Erreur obligatoire", "Un seul chiffre existe", "Ils copient toujours la même source"],
        3,
        "avance",
        null
      ),
      q(
        "Selon ZEI, quelle part du temps d'une direction RSE est aujourd'hui absorbée par la collecte de données (vs analyse / pilotage) ?",
        "ZEI documente le ratio 80 / 20 : 80 % du temps en collecte, 20 % en analyse — la note ESG repose sur une donnée bricolée tant que ce ratio n'est pas inversé (source : ZEI — Guide collecte ESG).",
        "80 % du temps en collecte, 20 % en analyse",
        [
          "20 % du temps en collecte, 80 % en analyse",
          "50 % du temps en collecte, 50 % en analyse",
          "95 % du temps en collecte, 5 % en analyse",
        ],
        2,
        "intermediaire",
        0
      ),
    ],
  });

  await seedModuleQuick(stN, {
    slug: "esg-notation-limites-greenwashing",
    title: "Limites des scores et risque de greenwashing",
    description: "Dépendance aux données, rétroactivité des modèles et alignement marketing / réalité.",
    order: 2,
    estimatedMinutes: 12,
    difficulty: "intermediaire",
    lesson1Title: "Ce qu’un score ESG ne dit pas",
    lesson1Content: [
      { type: "heading", level: 2, text: "Nuancer les usages" },
      {
        type: "paragraph",
        text: "Les scores agrègent des indicateurs publics, des enquêtes et des hypothèses. Ils ne remplacent pas l’analyse fondamentale ni la due diligence sur émetteur. Les entreprises peuvent optimiser des métriques sans changer profondément le modèle économique.",
      },
      {
        type: "callout",
        variant: "warning",
        title: "Attention",
        text: "Un fonds « ESG » n’est pas forcément « bas carbone » ou « aligné 1,5 °C » : lire les critères d’investissement et le règlement du produit.",
      },
      {
        type: "sources",
        items: [
          {
            label: "ESMA — supervision finance durable (contexte UE)",
            url: "https://www.esma.europa.eu/esmas-work/sustainable-finance",
          },
        ],
      },
    ],
    lesson2Title: "Lutte contre le greenwashing côté marché",
    lesson2Content: [
      { type: "heading", level: 2, text: "Régulateurs et investisseurs" },
      {
        type: "paragraph",
        text: "L’AMF et l’ESMA rappellent que les noms de fonds et les promesses « durables » doivent être vérifiables. Les entreprises évitent les allégations floues (« eco-friendly ») sans indicateurs.",
      },
      {
        type: "callout",
        variant: "tip",
        title: "Vu par ZEI",
        text:
          "Antidote concret au greenwashing : industrialiser la collecte fait passer une entreprise de 40 % de données estimées à 90 % de données réelles. On ne parle plus d'intentions face aux investisseurs et aux agences de notation, mais d'une réalité mesurée et auditable. Source : ZEI — Guide collecte ESG.",
      },
      {
        type: "sources",
        items: [
          {
            label: "AMF — Finance durable / greenwashing",
            url: "https://www.amf-france.org/en_US/Retail-investors/Sustainable-finance",
          },
          { label: GUIDE_LABEL, url: GUIDE_URL },
        ],
      },
    ],
    questions: [
      q(
        "Un score ESG agrège surtout :",
        "Données et hypothèses modélisées.",
        "Des indicateurs normalisés et des jugements d’analystes",
        ["Uniquement l’intuition", "Uniquement le prix boursier du jour", "Rien de vérifiable"],
        1,
        "debutant",
        0
      ),
      q(
        "Le greenwashing désigne :",
        "Image durable non étayée par des faits.",
        "Une communication environnementale trompeuse ou non fondée",
        ["Une certification ISO obligatoire", "Un bilan carbone réalisé", "Un audit financier"],
        2,
        "intermediaire",
        0
      ),
      q(
        "Lire le prospectus d’un fonds sert à :",
        "Comprendre critères et limites.",
        "Vérifier objectifs, exclusions et méthode d’agrégation",
        ["Ignorer les risques", "Voir uniquement la couverture", "Supprimer la fiscalité"],
        2,
        "intermediaire",
        1
      ),
      q(
        "Les régulateurs sanctionnent surtout :",
        "Déclarations non vérifiables.",
        "Les allégations non étayées ou trompeuses envers les investisseurs",
        ["Les rapports trop longs", "Les tableaux Excel", "Les audits réussis"],
        2,
        "intermediaire",
        1
      ),
      q(
        "Un bon antidote au greenwashing est :",
        "Données auditées et traçables.",
        "Des indicateurs audités ou assurance limitée et des preuves documentées",
        ["Plus de slogans", "Moins de données", "Supprimer les labels"],
        2,
        "intermediaire",
        null
      ),
      q(
        "Comparer deux entreprises uniquement par leur note :",
        "Peut masquer des contextes différents.",
        "Est risqué sans analyse sectorielle et des critères de matérialité",
        ["Est toujours suffisant", "Remplace la stratégie", "Est interdit"],
        3,
        "avance",
        null
      ),
      q(
        "Les données ESG manquantes sont souvent :",
        "Imputées ou estimées.",
        "Estimées par modèles ou valeurs par défaut sectorielles",
        ["Ignorées à tort", "Toujours exactes", "Interdites"],
        2,
        "intermediaire",
        null
      ),
      q(
        "L’alignement marketing / données internes est un enjeu car :",
        "Les parties prenantes croisent les sources.",
        "Investisseurs et ONG confrontent discours public et rapports",
        ["Personne ne lit les rapports", "Les médias n’existent pas", "C’est neutre"],
        1,
        "debutant",
        null
      ),
      q(
        "Selon le Guide ZEI, l'industrialisation de la collecte fait évoluer le mix d'une entreprise dans quelle proportion de données estimées vs réelles ?",
        "ZEI documente le passage de 40 % de données estimées à 90 % de données réelles : la communication ESG bascule de l'intention à la réalité mesurée (source : ZEI — Guide collecte ESG, §V.3).",
        "De 40 % de données estimées à 90 % de données réelles",
        [
          "De 10 % de données estimées à 50 % de données réelles",
          "De 60 % de données estimées à 70 % de données réelles",
          "De 80 % de données estimées à 95 % de données réelles",
        ],
        2,
        "intermediaire",
        1
      ),
    ],
  });

  // ——— PME vs grandes entreprises ———
  await seedModuleQuick(stPme, {
    slug: "esg-pme-attentes-proportionnalite",
    title: "ESG en PME : proportionnalité et pragmatisme",
    description: "Prioriser peu d’indicateurs solides, répondre aux questionnaires clients et monter en maturité sans sur-ingénierie.",
    order: 1,
    estimatedMinutes: 11,
    difficulty: "debutant",
    lesson1Title: "Ce que les grands donneurs d’ordre demandent aux PME",
    lesson1Content: [
      { type: "heading", level: 2, text: "Pression de la chaîne de valeur" },
      {
        type: "paragraph",
        text: "Les PME reçoivent des questionnaires climat et sociaux de leurs clients grands comptes ou de leurs banques. La proportionnalité consiste à fournir des données fiables sur les sujets vraiment matériels plutôt que de viser exhaustivité immédiate.",
      },
      {
        type: "callout",
        variant: "tip",
        title: "Conseil",
        text: "Commencer par politiques écrites courtes, 5–10 KPI annuels et preuves (factures kWh, accidents du travail, politique fournisseurs).",
      },
      {
        type: "callout",
        variant: "tip",
        title: "Vu par ZEI",
        text:
          "La double matérialité est avant tout une tour de contrôle, pas une contrainte CSRD : selon la loi de Pareto appliquée par ZEI, 20 % des indicateurs couvrent 80 % des enjeux réels. Inutile pour une PME d'automatiser des données non matérielles : la matérialité définit le périmètre d'excellence et légitime la demande de données aux Achats ou à la Finance. Source : ZEI — Guide collecte ESG.",
      },
      {
        type: "sources",
        items: [
          {
            label: "Commission européenne — PME et finance durable",
            url: "https://finance.ec.europa.eu/sustainable-finance/overview/sustainable-finance-strategy_en",
          },
          { label: GUIDE_LABEL, url: GUIDE_URL },
        ],
      },
    ],
    lesson2Title: "Outils mutualisés et plateformes",
    lesson2Content: [
      { type: "heading", level: 2, text: "Mutualiser les coûts" },
      {
        type: "paragraph",
        text: "Les PME utilisent des référentiels sectoriels, des calculateurs carbone simplifiés ou des réseaux professionnels pour partager bonnes pratiques. L’objectif est de répondre aux exigences CSRD « en cascade » sans duplicate massif de reporting.",
      },
      {
        type: "sources",
        items: [
          { label: "BPI France — RSE / transition (ressources)", url: "https://bpifrance-creation.fr/encyclopedie/rse-responsabilite-societale-entreprise" },
        ],
      },
    ],
    questions: [
      q(
        "Pour une PME, la proportionnalité signifie :",
        "Adapter l’effort au risque et à la taille.",
        "Mettre en œuvre des pratiques adaptées à la maturité et aux enjeux réels",
        ["Ne rien faire", "Copier un rapport de 300 pages d’une multinationale", "Ignorer les clients"],
        1,
        "debutant",
        0
      ),
      q(
        "Les grands comptes poussent les PME car :",
        "Leur scope 3 dépend des fournisseurs.",
        "Les émissions et risques de la chaîne remontent dans leur bilan",
        ["C’est illégal autrement", "Les PME n’ont pas de fournisseurs", "C’est neutre"],
        2,
        "intermediaire",
        0
      ),
      q(
        "Un premier pas crédible peut être :",
        "Politique courte + quelques KPI.",
        "Une politique formalisée et quelques indicateurs suivis dans le temps",
        ["100 pages vides", "Uniquement un slogan", "Supprimer les contrats"],
        2,
        "intermediaire",
        1
      ),
      q(
        "Les plateformes sectorielles aident à :",
        "Standardiser et réduire les coûts.",
        "Partager des facteurs d’émission et des questionnaires harmonisés",
        ["Remplacer la loi", "Supprimer les audits", "Éliminer la concurrence"],
        2,
        "intermediaire",
        1
      ),
      q(
        "Une PME doit prioriser :",
        "Sujets à fort impact relatif.",
        "Les enjeux les plus matériels pour ses clients et sa production",
        ["Tous les ODD à la fois", "Uniquement le logo", "Rien"],
        2,
        "intermediaire",
        null
      ),
      q(
        "Répondre aux questionnaires clients demande :",
        "Données traçables.",
        "Des chiffres cohérents avec factures et systèmes internes",
        ["Des estimations sans source", "Rien", "Uniquement des rumeurs"],
        2,
        "intermediaire",
        null
      ),
      q(
        "La CSRD des grands peut impacter les PME car :",
        "Information en cascade dans la chaîne.",
        "Les exigences de données durables se propagent contractuellement",
        ["Les PME sont toujours hors scope", "Il n’y a aucun lien", "C’est secret"],
        3,
        "avance",
        null
      ),
      q(
        "Mutualiser les bonnes pratiques permet :",
        "Apprentissage plus rapide.",
        "D’accélérer la montée en compétence avec des coûts maîtrisés",
        ["De cacher les problèmes", "D’éviter toute mesure", "De supprimer la RSE"],
        1,
        "debutant",
        null
      ),
    ],
  });

  await seedModuleQuick(stPme, {
    slug: "esg-pme-vs-ge-double-materialite",
    title: "PME et grands groupes : matérialité et gouvernance des données",
    description: "Comparer niveaux d’exigence, ressources internes et gouvernance ESG entre ETI / grands groupes et structures plus petites.",
    order: 2,
    estimatedMinutes: 12,
    difficulty: "intermediaire",
    lesson1Title: "Ressources, outils et culture des données",
    lesson1Content: [
      { type: "heading", level: 2, text: "Même enjeux, rythmes différents" },
      {
        type: "paragraph",
        text: "Les grands groupes déploient des directions durabilité, des outils GRC et des audits tiers. Les PME s’appuient souvent sur des rôles partagés (DG, QHSE, finance) et sur des consultants ponctuels. La maturité ESG se mesure à la qualité du pilotage, pas seulement au volume de pages.",
      },
      {
        type: "callout",
        variant: "tip",
        title: "Vu par ZEI",
        text:
          "Selon ZEI, la maturité ESG ne se juge pas au volume du rapport mais à la qualité du pilotage. Le bon réflexe : passer d'une équipe RSE « pompier » qui court après les chiffres à un chef d'orchestre — chaque métier (RH pour la parité et le turn-over, Achats pour les émissions fournisseurs, DAF pour la taxonomie verte) devient propriétaire de sa donnée, dans un triptyque Contributeur / Valideur / Administrateur. Source : ZEI — Guide collecte ESG (chap. III).",
      },
      {
        type: "sources",
        items: [
          {
            label: "EFRAG — PME et reporting (contexte standards européens)",
            url: "https://www.efrag.org/",
          },
          { label: GUIDE_LABEL, url: GUIDE_URL },
        ],
      },
    ],
    lesson2Title: "Double matérialité : même logique, périmètres différents",
    lesson2Content: [
      { type: "heading", level: 2, text: "Impact et risque financier" },
      {
        type: "paragraph",
        text: "La double matérialité (impact sur people & planet + risques financiers) s’applique aux rapports réglementés des grandes entités, mais la logique d’arbitrage aide aussi les PME à choisir où investir leur effort de collecte.",
      },
      {
        type: "divider",
      },
      {
        type: "sources",
        items: [
          {
            label: "EFRAG — European Sustainability Reporting Standards (ESRS)",
            url: "https://www.efrag.org/en/projects-and-technical-work/european-sustainability-reporting-standard-esrs",
          },
        ],
      },
    ],
    questions: [
      q(
        "Les grands groupes mobilisent souvent :",
        "Équipes dédiées et systèmes intégrés.",
        "Des directions durabilité et des outils de gouvernance des données",
        ["Uniquement des stagiaires", "Aucune donnée", "Uniquement Excel sans contrôle"],
        1,
        "debutant",
        0
      ),
      q(
        "Les PME peuvent compenser par :",
        "Agilité et proximité terrain.",
        "Des décisions rapides et une connaissance fine des opérations",
        ["Ignorer les risques", "Supprimer les clients", "Éviter tout chiffre"],
        2,
        "intermediaire",
        0
      ),
      q(
        "La maturité ESG se juge notamment sur :",
        "Fiabilité et pilotage.",
        "La qualité des processus et la traçabilité des indicateurs",
        ["Le nombre de pages uniquement", "La couleur du rapport", "Le nombre de likes"],
        2,
        "intermediaire",
        1
      ),
      q(
        "La double matérialité distingue :",
        "Impact et financier.",
        "Les impacts sociétaux/environnementaux et les risques/opportunités financiers",
        ["Marketing et ventes", "RH et IT", "Fiscal et social uniquement"],
        3,
        "avance",
        1
      ),
      q(
        "Une PME peut appliquer la logique de matérialité pour :",
        "Prioriser son plan d’action.",
        "Décider quels sujets traiter en premier avec ses ressources",
        ["Éviter toute mesure", "Remplacer la stratégie commerciale", "Supprimer les fournisseurs"],
        2,
        "intermediaire",
        null
      ),
      q(
        "Un bon data owner interne :",
        "Assure cohérence des chiffres publiés.",
        "Centralise les définitions et contrôles de qualité des données ESG",
        ["Change les chiffres sans trace", "Ignore les erreurs", "Ne lit jamais les rapports"],
        2,
        "intermediaire",
        null
      ),
      q(
        "Les ETI se situent souvent :",
        "Entre PME et CAC40 sur la complexité.",
        "Avec des exigences croissantes mais des ressources intermédiaires",
        ["Sans aucun enjeu ESG", "Hors de toute réglementation", "Sans clients"],
        2,
        "intermediaire",
        null
      ),
      q(
        "Comparer PME et grand groupe sans nuance :",
        "Peut être trompeur.",
        "Ignore les différences de périmètre, de secteur et de maturité",
        ["Est toujours exact", "Est recommandé", "Est neutre"],
        1,
        "debutant",
        null
      ),
      q(
        "Selon ZEI, le triptyque de validation ESG qui rend une donnée auditable repose sur quels rôles ?",
        "Le Guide ZEI structure la gouvernance autour de trois rôles distincts : le Contributeur saisit la donnée et téléverse la preuve, le Valideur (manager métier) vérifie la cohérence opérationnelle, l'Administrateur RSE assure la complétude inter-services (source : ZEI — Guide collecte ESG, §III.2).",
        "Contributeur (saisit + preuve), Valideur métier (cohérence), Administrateur RSE (complétude)",
        [
          "DAF seul valide tous les indicateurs ESG",
          "Contrôleur de gestion + commissaire aux comptes uniquement",
          "RH + Communication suffisent pour valider la donnée ESG",
        ],
        2,
        "intermediaire",
        0
      ),
    ],
  });

  // ——— Investissement durable ———
  await seedModuleQuick(stInv, {
    slug: "esg-inv-sfdr-taxonomie",
    title: "SFDR, taxonomie et classifications de produits",
    description: "Articles 6, 8 et 9 du SFDR et lien avec la taxonomie européenne des activités durables.",
    order: 1,
    estimatedMinutes: 14,
    difficulty: "intermediaire",
    lesson1Title: "SFDR : transparence des produits financiers",
    lesson1Content: [
      { type: "heading", level: 2, text: "Règlement (UE) 2019/2088" },
      {
        type: "paragraph",
        text: "Le SFDR impose aux acteurs financiers de publier des informations sur l’intégration des risques de durabilité (Article 6), sur les produits promouvant des caractéristiques environnementales ou sociales (Article 8) et sur les produits à objectif d’investissement durable (Article 9).",
      },
      {
        type: "list",
        style: "ordered",
        items: [
          "Article 6 : prise en compte des risques de durabilité sur l’ensemble des produits.",
          "Article 8 : promotion d’ES caractéristiques E/S.",
          "Article 9 : objectif d’investissement durable spécifique.",
        ],
      },
      {
        type: "sources",
        items: [
          {
            label: "EUR-Lex — Règlement (UE) 2019/2088 (SFDR)",
            url: "https://eur-lex.europa.eu/eli/reg/2019/2088/oj",
          },
        ],
      },
    ],
    lesson2Title: "Taxonomie et « activités alignées »",
    lesson2Content: [
      { type: "heading", level: 2, text: "Définir ce qui est « durable » en Europe" },
      {
        type: "paragraph",
        text: "La taxonomie fixe des critères techniques pour des activités substantiellement contributeurs aux objectifs environnementaux (climat, eau, économie circulaire, etc.), sans nuire aux autres objectifs. Les produits Article 8/9 s’appuient souvent sur ces définitions pour leurs KPI.",
      },
      {
        type: "callout",
        variant: "tip",
        title: "Vu par ZEI",
        text:
          "Avant la CSRD, les entreprises choisissaient les valeurs absolues qui les arrangeaient : impossible de comparer deux émetteurs. Avec la VSME (Voluntary Standard for SMEs, EFRAG) et la Value Chain Cap introduite par l'Omnibus de février 2025, tout questionnaire fournisseur ou bancaire doit s'aligner sur les indicateurs VSME — intensités et ratios standardisés. La VSME devient un répertoire ESG universel : la donnée investissable devient enfin comparable. Source : ZEI — La VSME expliquée.",
      },
      {
        type: "sources",
        items: [
          {
            label: "Commission européenne — Taxonomie (activités durables)",
            url: "https://finance.ec.europa.eu/sustainable-finance/tools-and-standards/eu-taxonomy-climate-change-mitigation-and-adaptation_en",
          },
          { label: VSME_LABEL, url: VSME_URL },
        ],
      },
    ],
    questions: [
      q(
        "Le SFDR vise principalement :",
        "Transparence des produits et acteurs financiers.",
        "Des disclosures sur la durabilité pour les investisseurs",
        ["Interdire toute action", "Remplacer la comptabilité nationale", "Supprimer les marchés"],
        2,
        "intermediaire",
        0
      ),
      q(
        "L’article 8 concerne des produits qui :",
        "Promouvent des caractéristiques E/S.",
        "Promouvent des caractéristiques environnementales ou sociales",
        ["N’ont aucun critère", "Sont toujours Article 9", "Sont hors UE"],
        2,
        "intermediaire",
        0
      ),
      q(
        "L’article 9 cible :",
        "Objectif d’investissement durable déterminé.",
        "Un objectif d’investissement durable spécifique",
        ["Uniquement le cash", "Les dépôts bancaires courants", "Les crypto-actifs non régulés"],
        3,
        "avance",
        1
      ),
      q(
        "La taxonomie européenne sert à :",
        "Classifier des activités éligibles / alignées.",
        "Définir des critères pour des activités économiques considérées comme durables",
        ["Mesurer les salaires", "Fixer les taux d’intérêt", "Remplacer le bilan comptable"],
        2,
        "intermediaire",
        1
      ),
      q(
        "L’article 6 du SFDR impose :",
        "Intégration des risques de durabilité.",
        "D’intégrer les risques de durabilité dans les processus pour tous les produits concernés",
        ["Rien pour les produits", "Uniquement des labels", "Des garanties bancaires"],
        2,
        "intermediaire",
        null
      ),
      q(
        "Un DIC ou prospectus doit :",
        "Expliquer méthode et limites.",
        "Décrire comment les critères durables sont appliqués et leurs limites",
        ["Être vide", "Mentir", "Ignorer les risques"],
        2,
        "intermediaire",
        null
      ),
      q(
        "Les KPI d’alignement taxonomique sont sensibles car :",
        "Définitions techniques et évolutives.",
        "Les seuils techniques et les activités admissibles évoluent avec les actes délégués",
        ["Ils sont figés pour toujours", "Ils n’existent pas", "Ils sont secrets"],
        3,
        "avance",
        null
      ),
      q(
        "Un gestionnaire « Article 9 » doit :",
        "Démontrer l’objectif durable du produit.",
        "Montrer comment l’objectif durable est atteint et mesuré",
        ["Ignorer les données", "Ne pas publier d’information", "Éviter tout indicateur"],
        2,
        "intermediaire",
        null
      ),
      q(
        "Selon ZEI, quel cadre fait de la donnée ESG un répertoire universel pour fournisseurs et financeurs depuis l'Omnibus de février 2025 ?",
        "La Value Chain Cap introduite par l'Omnibus de février 2025 impose que tout questionnaire fournisseur ou bancaire soit aligné sur la VSME (Voluntary Standard for SMEs construit par l'EFRAG) — la VSME devient le répertoire ESG commun (source : ZEI — La VSME expliquée).",
        "La VSME (Voluntary Standard for SMEs)",
        ["La SFDR seule", "La directive NFRD", "La norme ISO 14001"],
        2,
        "intermediaire",
        1
      ),
    ],
  });

  await seedModuleQuick(stInv, {
    slug: "esg-inv-pri-engagement-strategies",
    title: "PRI, stratégies d’actifs et engagement actionnarial",
    description: "Principes pour l’investissement responsable de l’ONU et leviers d’engagement avec les entreprises.",
    order: 2,
    estimatedMinutes: 13,
    difficulty: "debutant",
    lesson1Title: "Principles for Responsible Investment (PRI)",
    lesson1Content: [
      { type: "heading", level: 2, text: "Six principes volontaires" },
      {
        type: "paragraph",
        text: "Le PRI est une initiative de l’ONU qui engage les investisseurs institutionnels à intégrer les questions ESG dans l’analyse, la propriété active, la recherche de transparence et le reporting. Des milliers de signataires représentent des actifs considérables à l’échelle mondiale.",
      },
      {
        type: "sources",
        items: [{ label: "UN PRI — Principles for Responsible Investment", url: "https://www.unpri.org/" }],
      },
    ],
    lesson2Title: "Engagement, voting et impact",
    lesson2Content: [
      { type: "heading", level: 2, text: "Au-delà du screening négatif" },
      {
        type: "paragraph",
        text: "Les stratégies combinent exclusion, intégration ESG, thématique impact, engagement et co-construction d’indicateurs avec les émetteurs. L’engagement prolongé peut précéder des votes contre en assemblée générale si la trajectoire est jugée insuffisante.",
      },
      {
        type: "callout",
        variant: "info",
        title: "Impact",
        text: "Les investisseurs distinguent souvent « éviter le mal » (exclusions) et « faire le bien mesurable » (impact avec théorie du changement).",
      },
      {
        type: "sources",
        items: [
          {
            label: "Finance EC — Plan d’action sur la finance durable (2018)",
            url: "https://finance.ec.europa.eu/sustainable-finance/overview/sustainable-finance-strategy_en",
          },
        ],
      },
    ],
    questions: [
      q(
        "Le PRI est :",
        "Une initiative volontaire pour investisseurs.",
        "Un cadre volontaire soutenu par l’ONU pour intégrer l’ESG",
        ["Une taxe obligatoire", "Un indice boursier", "Une loi française unique"],
        1,
        "debutant",
        0
      ),
      q(
        "L’engagement actionnarial consiste à :",
        "Dialoguer pour améliorer les pratiques.",
        "Conduire un dialogue structuré avec les dirigeants sur des enjeux ESG",
        ["Acheter puis ignorer", "Vendre sans analyse", "Supprimer les assemblées"],
        2,
        "intermediaire",
        0
      ),
      q(
        "Le vote en AG peut servir à :",
        "Valider rémunérations et climat.",
        "Approuver ou sanctionner des résolutions liées à la gouvernance et au climat",
        ["Choisir le menu de la cantine", "Modifier le code civil", "Nommer les clients"],
        2,
        "intermediaire",
        1
      ),
      q(
        "Une stratégie « impact » vise souvent :",
        "Mesurer des résultats positifs.",
        "Des indicateurs de résultat alignés avec une théorie du changement",
        ["Uniquement la liquidité court terme", "Ignorer les externalités", "Maximiser le greenwashing"],
        2,
        "intermediaire",
        1
      ),
      q(
        "L’intégration ESG en analyse financière :",
        "Affine les projections.",
        "Peut modifier hypothèses de croissance, coût du capital ou valeur résiduelle",
        ["Est interdite", "Ne sert jamais", "Remplace toujours le cash-flow"],
        3,
        "avance",
        null
      ),
      q(
        "Les exclusions sectorielles :",
        "Retirent certaines activités du univers.",
        "Éliminent des secteurs ou produits du univers investissable",
        ["Forcent toujours l’impact", "Remplacent l’engagement toujours", "Sont neutres"],
        2,
        "intermediaire",
        null
      ),
      q(
        "Un signataire PRI doit :",
        "Rapporter sur la mise en œuvre.",
        "Publier un reporting sur ses progrès dans l’application des principes",
        ["Ne rien publier", "Ignorer les données", "Quitter les marchés"],
        2,
        "intermediaire",
        null
      ),
      q(
        "La propriété active (« active ownership ») inclut :",
        "Engagement + vote.",
        "Le dialogue avec les entreprises et l’exercice des droits de vote",
        ["Uniquement la passivité", "Aucune responsabilité", "Supprimer les conseils"],
        1,
        "debutant",
        null
      ),
    ],
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ——— Sous-thème NOUVEAU : Collecte ESG, arrêtez de bricoler (3 modules) ———
  //
  // Source ZEI : docs/zei-knowledge/esg-collecte/guide-collecte-esg.md (priority high)
  //              docs/zei-knowledge/esg-collecte/checklist-collecte-esg.md (priority medium)
  // ═══════════════════════════════════════════════════════════════════════════

  await seedModuleQuick(stCollecte, {
    slug: "esg-collecte-audit-dette-technique",
    title: "Audit de la dette technique ESG et double matérialité",
    description:
      "Diagnostiquer la « dette technique » d'une collecte ESG bricolée et rationaliser les indicateurs avec la double matérialité avant d'industrialiser.",
    order: 1,
    estimatedMinutes: 14,
    difficulty: "intermediaire",
    lesson1Title: "Audit de l'existant : diagnostiquer la dette technique ESG",
    lesson1Content: [
      { type: "heading", level: 2, text: "Le paradoxe de la donnée ESG selon ZEI" },
      {
        type: "paragraph",
        text:
          "Avant d'automatiser, il faut comprendre. Automatiser un processus bancal génère des erreurs plus rapidement. La donnée ESG est nomade : elle naît rarement à la direction RSE et se cache dans des sources hétérogènes — la première étape consiste à les recenser et identifier leur format (numérique, papier, API, tableur).",
      },
      {
        type: "table",
        headers: ["Famille de données", "Source habituelle", "Direction propriétaire"],
        rows: [
          ["Sociales (parité, formation, accidents)", "SIRH ou fichiers RH déconnectés", "Ressources humaines"],
          ["Environnementales (énergie, déchets)", "Factures d'énergie, gestion de flotte, prestataires déchets", "Services généraux / HSE"],
          ["Gouvernance & achats (fournisseurs)", "ERP, contrats, chartes éthiques", "Achats / DAF"],
        ],
      },
      {
        type: "heading",
        level: 3,
        text: "Trois risques majeurs d'un pilotage Excel",
      },
      {
        type: "list",
        style: "bullet",
        items: [
          "Erreur de saisie : une virgule mal placée ou une unité mal interprétée (kWh vs MWh) effondre toute la trajectoire carbone.",
          "Dépendance individuelle : si la personne qui gère le « fichier maître » quitte l'entreprise, le savoir-faire disparaît avec elle.",
          "Insécurité des données : un Excel envoyé par mail n'est pas protégé — n'importe qui peut modifier une formule ou supprimer une cellule, compromettant l'intégrité pour l'auditeur.",
        ],
      },
      {
        type: "callout",
        variant: "tip",
        title: "Vu par ZEI",
        text:
          "Aujourd'hui, une direction RSE passe en moyenne 80 % de son temps à collecter la donnée (relances, nettoyage de fichiers, vérification des unités) et seulement 20 % à l'analyser et à piloter la transformation. C'est ce ratio que l'industrialisation cherche à inverser, pour passer d'une RSE de « reporting » à une RSE de « pilotage ». Source : ZEI — Guide collecte ESG.",
      },
      {
        type: "paragraph",
        text:
          "L'objectif de la cartographie est de dessiner le chemin parcouru par la donnée — entre la réception d'une facture de gaz et son intégration dans le rapport annuel, combien de mains ont touché la donnée ? Plus il y a d'étapes manuelles, plus le risque est élevé.",
      },
      {
        type: "sources",
        items: [{ label: GUIDE_LABEL, url: GUIDE_URL }],
      },
    ],
    lesson2Title: "Rationaliser avant d'automatiser : la double matérialité comme tour de contrôle",
    lesson2Content: [
      { type: "heading", level: 2, text: "Industrialiser ne veut pas dire tout collecter" },
      {
        type: "paragraph",
        text:
          "Sans le filtre de la double matérialité, la collecte ESG devient un inventaire épuisant et sans valeur stratégique. Selon ZEI, la double matérialité ne doit pas être vue comme une contrainte CSRD, mais comme une tour de contrôle qui croise deux perspectives.",
      },
      {
        type: "list",
        style: "bullet",
        items: [
          "Matérialité financière (Inside-out) : comment les enjeux durables (climat, ressources) impactent la santé économique de l'entreprise.",
          "Matérialité d'impact (Outside-in) : comment les activités de l'entreprise impactent l'environnement et la société.",
        ],
      },
      {
        type: "callout",
        variant: "tip",
        title: "Vu par ZEI",
        text:
          "Loi de Pareto appliquée à la collecte : 20 % d'indicateurs couvrent 80 % des enjeux réels. Inutile d'automatiser avec précision la gestion des déchets de bureau si l'enjeu majeur se situe dans le scope 3. La matérialité définit le périmètre d'excellence et légitime la demande de données aux Achats ou à la Finance. Source : ZEI — Guide collecte ESG (chap. II.1).",
      },
      {
        type: "heading",
        level: 3,
        text: "« Collecter une fois, reporter partout »",
      },
      {
        type: "paragraph",
        text:
          "Une même donnée sert au Bilan Carbone, à la CSRD et à EcoVadis. ZEI assure l'interopérabilité native via la synchronisation avec +130 référentiels : on saisit une donnée une seule fois et la plateforme l'attribue automatiquement aux différents cadres de reporting (avec conversions d'unités gérées).",
      },
      {
        type: "heading",
        level: 3,
        text: "Granularité : par hotspots plutôt qu'uniforme",
      },
      {
        type: "paragraph",
        text:
          "ZEI recommande une granularité variable : extrêmement précise sur les postes les plus impactants (par exemple le scope 3 pour un industriel) et plus macro sur les postes négligeables. La fréquence est aussi un levier : la collecte annuelle est un constat, la collecte trimestrielle ou mensuelle permet d'ajuster le tir et transforme la donnée en outil de gestion courante.",
      },
      {
        type: "regulatory_note",
        year: 2026,
        companySize: "all",
        text:
          "Avec la CSRD, les données quantitatives (intensités, ratios) deviennent comparables entre entreprises. La granularité par hotspots maximise le ratio « précision de l'analyse / effort de collecte » sans saturer les équipes.",
      },
      {
        type: "sources",
        items: [{ label: GUIDE_LABEL, url: GUIDE_URL }],
      },
    ],
    questions: [
      q(
        "Selon ZEI, quelle part du temps d'une direction RSE est aujourd'hui absorbée par la collecte de données ESG (vs analyse) ?",
        "ZEI documente le ratio 80 / 20 : 80 % du temps en collecte (relances, nettoyage, vérification d'unités), 20 % en analyse et pilotage (source : ZEI — Guide collecte ESG, paradoxe de la donnée).",
        "80 % en collecte / 20 % en analyse",
        ["20 % en collecte / 80 % en analyse", "50 % en collecte / 50 % en analyse", "5 % en collecte / 95 % en analyse"],
        2,
        "intermediaire",
        0
      ),
      q(
        "Quels sont les trois risques majeurs d'un pilotage ESG sur Excel selon ZEI ?",
        "Le Guide ZEI identifie l'erreur de saisie (kWh vs MWh), la dépendance individuelle (perte de savoir-faire si la personne part) et l'insécurité des données partagées par mail (source : ZEI — Guide collecte ESG, §I.2).",
        "Erreur de saisie, dépendance individuelle, insécurité des données",
        [
          "Coût de licence, lenteur d'ouverture, incompatibilité Mac",
          "Manque de formules avancées, absence de macros, lenteur du tri",
          "Trop de couleurs, polices illisibles, fichiers trop lourds",
        ],
        2,
        "intermediaire",
        0
      ),
      q(
        "Selon le Guide ZEI, sur quel principe Pareto repose la priorisation par double matérialité ?",
        "ZEI applique la loi de Pareto à la collecte ESG : 20 % d'indicateurs bien choisis couvrent 80 % des enjeux réels — la matérialité définit le périmètre d'excellence (source : ZEI — Guide collecte ESG, §II.1).",
        "20 % d'indicateurs couvrent 80 % des enjeux réels",
        ["80 % d'indicateurs couvrent 20 % des enjeux", "Tous les indicateurs ESG ont le même poids", "Seuls les indicateurs financiers comptent"],
        2,
        "intermediaire",
        1
      ),
      q(
        "L'approche « Collecter une fois, reporter partout » repose chez ZEI sur la synchronisation avec :",
        "ZEI assure l'interopérabilité native via la synchronisation avec +130 référentiels (CSRD, Bilan Carbone, EcoVadis…) : la donnée saisie une seule fois est attribuée à chaque cadre (source : ZEI — Guide collecte ESG, §II.2).",
        "+130 référentiels (CSRD, Bilan Carbone, EcoVadis…)",
        ["Uniquement la CSRD", "Une feuille Excel partagée par mail", "Un PDF imprimé par les commissaires aux comptes"],
        2,
        "intermediaire",
        1
      ),
      q(
        "Selon ZEI, où dorment habituellement les données ESG sociales (parité, formation, turn-over) dans une organisation ?",
        "Les données sociales se trouvent dans le SIRH ou dans des fichiers RH déconnectés du système RSE — d'où l'enjeu de cartographier les sources (source : ZEI — Guide collecte ESG, §I.1).",
        "Dans le SIRH ou dans des fichiers RH déconnectés",
        [
          "Dans les factures d'énergie",
          "Dans les contrats fournisseurs de l'ERP achats",
          "Dans le rapport financier publié",
        ],
        1,
        "debutant",
        0
      ),
      q(
        "Quelle est la finalité ultime de l'industrialisation de la collecte selon ZEI ?",
        "Le Guide ZEI insiste : passer d'une RSE de « reporting » qui constate les dégâts à une RSE de « pilotage » qui prépare l'avenir — c'est la seule voie pour libérer du temps et sécuriser la stratégie (source : ZEI — Guide collecte ESG, intro).",
        "Passer d'une RSE de reporting à une RSE de pilotage",
        [
          "Réduire le nombre de salariés en RSE",
          "Supprimer les rapports annuels",
          "Externaliser entièrement la collecte à un consultant",
        ],
        1,
        "debutant",
        null
      ),
      q(
        "Pour un industriel, l'approche de granularité recommandée par ZEI sur le scope 3 est :",
        "ZEI recommande une granularité variable : extrêmement précise sur les postes hotspots (scope 3 pour un industriel) et macro sur les postes négligeables — pour maximiser le ratio précision / effort (source : ZEI — Guide collecte ESG, §II.3).",
        "Une granularité par hotspots, fine sur les postes les plus impactants",
        [
          "Une granularité uniforme à la machine pour tous les postes",
          "Une granularité au niveau groupe consolidé uniquement",
          "Aucune granularité — un total annuel suffit",
        ],
        3,
        "avance",
        1
      ),
      q(
        "La double matérialité, telle que présentée par ZEI, croise quelles deux perspectives ?",
        "ZEI distingue la matérialité financière (Inside-out : comment les enjeux durables impactent l'entreprise) et la matérialité d'impact (Outside-in : comment l'entreprise impacte planète et société) (source : ZEI — Guide collecte ESG, §II.1).",
        "Inside-out (financière) et Outside-in (impact)",
        [
          "Court terme et long terme uniquement",
          "Marketing et communication interne",
          "Audit fiscal et audit social",
        ],
        2,
        "intermediaire",
        1
      ),
    ],
  });

  await seedModuleQuick(stCollecte, {
    slug: "esg-collecte-gouvernance-triptyque",
    title: "Gouvernance triptyque et audit trail",
    description:
      "Structurer la collecte ESG avec un triptyque Contributeur / Valideur / Administrateur et garantir une piste d'audit fiable de bout en bout pour les OTI.",
    order: 2,
    estimatedMinutes: 15,
    difficulty: "intermediaire",
    lesson1Title: "Le triptyque Contributeur / Valideur / Administrateur",
    lesson1Content: [
      { type: "heading", level: 2, text: "Faire de la collecte l'affaire de tous" },
      {
        type: "paragraph",
        text:
          "Selon ZEI, la RSE ne doit plus être un département « tour d'ivoire » mais le chef d'orchestre d'une collecte décentralisée. L'enjeu : passer d'une équipe RSE « pompier » qui court après les chiffres à un pilotage où chaque direction métier prend ses responsabilités.",
      },
      {
        type: "table",
        headers: ["Métier", "Indicateurs ESG dont il devient propriétaire"],
        rows: [
          ["RH", "Parité, formation, turn-over, accidents du travail"],
          ["Achats", "Émissions fournisseurs, chartes éthiques, dépendance fournisseurs critiques"],
          ["DAF", "Taxonomie verte, investissements durables, alignement reporting financier"],
        ],
      },
      {
        type: "heading",
        level: 3,
        text: "Le circuit de validation à trois étages",
      },
      {
        type: "list",
        style: "ordered",
        items: [
          "Le Contributeur saisit la donnée à la source et téléverse la preuve associée. Sa responsabilité est engagée sur la véracité du document joint.",
          "Le Valideur (manager métier) vérifie la cohérence métier : « est-il normal que notre consommation d'eau ait doublé ce mois-ci ? ». Sa validation transforme la donnée RSE en donnée de performance départementale.",
          "L'Administrateur (RSE) assure la complétude globale et la cohérence inter-services, sans avoir à vérifier chaque document un par un.",
        ],
      },
      {
        type: "callout",
        variant: "tip",
        title: "Vu par ZEI",
        text:
          "L'acculturation est fondamentale : un acheteur qui comprend que sa donnée sert à sécuriser un futur financement bancaire ou à répondre à un appel d'offres stratégique sera bien plus rigoureux qu'un acheteur qui remplit un tableau « pour la RSE ». Le triptyque rend la donnée auditable et engage durablement les contributeurs. Source : ZEI — Guide collecte ESG (chap. III).",
      },
      {
        type: "heading",
        level: 3,
        text: "Alertes et détection d'anomalies",
      },
      {
        type: "paragraph",
        text:
          "Le temps réel est le meilleur allié de la qualité. ZEI paramètre automatiquement des seuils de tolérance : si une donnée saisie s'écarte de 20 % de la moyenne historique, le système bloque la saisie et demande une justification immédiate. On traite l'erreur à la source, pas six mois plus tard.",
      },
      {
        type: "sources",
        items: [{ label: GUIDE_LABEL, url: GUIDE_URL }],
      },
    ],
    lesson2Title: "Audit trail et coffre-fort de preuves",
    lesson2Content: [
      { type: "heading", level: 2, text: "L'audit comme formalité, pas comme épreuve" },
      {
        type: "paragraph",
        text:
          "Avec la CSRD, les rapports ESG sont audités par des commissaires aux comptes ou des organismes tiers indépendants (OTI). La donnée doit être irréprochable : la piste d'audit fiable est la colonne vertébrale de la crédibilité.",
      },
      {
        type: "callout",
        variant: "warning",
        title: "Le piège de la « boîte noire »",
        text:
          "Une erreur classique : effectuer des calculs complexes sur des fichiers personnels hors système. Pour l'auditeur, c'est une boîte noire impossible à vérifier. Chaque étape de transformation (conversions, facteurs d'émission) doit être paramétrée et verrouillée dans un outil commun.",
      },
      {
        type: "heading",
        level: 3,
        text: "Les trois piliers de l'audit trail",
      },
      {
        type: "list",
        style: "bullet",
        items: [
          "Horodatage immuable : chaque saisie est marquée d'une date et d'une heure précises.",
          "Traçabilité des auteurs : « qui a modifié quoi ? » devient une information accessible en un clic.",
          "Motif de modification : la saisie d'un commentaire est obligatoire en cas de correction d'une donnée historique pour justifier l'écart auprès des auditeurs.",
        ],
      },
      {
        type: "callout",
        variant: "tip",
        title: "Vu par ZEI",
        text:
          "La piste d'audit fiable repose sur la capacité de l'entreprise à dé-tricoter chaque indicateur consolidé pour remonter jusqu'à l'unité de mesure initiale. Pour un auditeur, la question n'est pas tant « ce chiffre est-il juste ? » mais « comment a-t-il été produit ? ». Source : ZEI — Guide collecte ESG (chap. IV).",
      },
      {
        type: "heading",
        level: 3,
        text: "Le coffre-fort numérique de preuves",
      },
      {
        type: "paragraph",
        text:
          "Collecter des données sans preuve jointe est une pratique à haut risque. ZEI impose un coffre-fort numérique où chaque donnée est liée de manière indissociable à son justificatif : facture, certificat de formation, photo de compteur. L'audit OTI devient indolore.",
      },
      {
        type: "regulatory_note",
        year: 2026,
        companySize: "large",
        text:
          "Sous CSRD, l'assurance limitée puis raisonnable des données ESG par un OTI nécessite une piste d'audit complète et un coffre-fort de justificatifs accessible à l'auditeur.",
      },
      {
        type: "sources",
        items: [{ label: GUIDE_LABEL, url: GUIDE_URL }],
      },
    ],
    questions: [
      q(
        "Selon le Guide ZEI, le triptyque de validation ESG implique quels trois rôles distincts ?",
        "ZEI structure la gouvernance autour de trois rôles : le Contributeur (saisit + preuve), le Valideur (cohérence métier), l'Administrateur RSE (complétude inter-services) (source : ZEI — Guide collecte ESG, §III.2).",
        "Contributeur, Valideur (manager métier), Administrateur (RSE)",
        [
          "PDG, DAF, Commissaire aux comptes",
          "Stagiaire, alternant, prestataire externe",
          "Conseil d'administration, comité d'audit, AMF",
        ],
        2,
        "intermediaire",
        0
      ),
      q(
        "À partir de quel écart par rapport à la moyenne historique le système ZEI bloque-t-il une saisie pour exiger une justification ?",
        "ZEI paramètre par défaut un seuil de tolérance à 20 % d'écart : au-delà, la saisie est bloquée et un commentaire de justification est demandé immédiatement (source : ZEI — Guide collecte ESG, §III.3).",
        "20 % d'écart par rapport à la moyenne historique",
        ["1 % d'écart", "50 % d'écart", "200 % d'écart"],
        2,
        "intermediaire",
        0
      ),
      q(
        "À quoi sert exactement le contrôle de cohérence réalisé par le Valideur (manager métier) selon ZEI ?",
        "Le Valideur vérifie la cohérence opérationnelle (« est-il normal que notre consommation d'eau ait doublé ce mois-ci ? ») et transforme ainsi la donnée RSE en donnée de performance départementale (source : ZEI — Guide collecte ESG, §III.2).",
        "Vérifier la plausibilité opérationnelle des chiffres remontés par les contributeurs",
        [
          "Recalculer chaque facteur d'émission depuis la base ADEME",
          "Auditer les comptes financiers de la filiale",
          "Auditer la conformité RGPD du SIRH",
        ],
        2,
        "intermediaire",
        0
      ),
      q(
        "Quels sont les trois piliers de la piste d'audit fiable selon ZEI ?",
        "Le Guide ZEI identifie trois piliers d'audit trail : horodatage immuable de chaque saisie, traçabilité des auteurs (« qui a modifié quoi »), motif de modification obligatoire en cas de correction (source : ZEI — Guide collecte ESG, §IV.2).",
        "Horodatage immuable, traçabilité des auteurs, motif de modification",
        [
          "Antivirus, sauvegarde quotidienne, chiffrement des disques",
          "Mot de passe, double authentification, VPN",
          "ISO 9001, ISO 14001, ISO 27001",
        ],
        3,
        "avance",
        1
      ),
      q(
        "Le « coffre-fort » numérique évoqué par ZEI sert à :",
        "Le coffre-fort lie de manière indissociable chaque donnée comptable à son justificatif (facture, certificat de formation, photo de compteur) — c'est ce qui rend l'audit OTI indolore (source : ZEI — Guide collecte ESG, §IV.3).",
        "Lier chaque donnée à son justificatif (facture, certificat, photo de compteur)",
        [
          "Stocker les mots de passe des contributeurs",
          "Archiver les contrats de travail des employés",
          "Conserver des sauvegardes off-site des serveurs",
        ],
        2,
        "intermediaire",
        1
      ),
      q(
        "Selon ZEI, qui audite les rapports CSRD à partir de l'arrivée de la directive ?",
        "ZEI rappelle que les rapports ESG seront audités par des commissaires aux comptes ou des organismes tiers indépendants (OTI) — la donnée doit donc être irréprochable et traçable (source : ZEI — Guide collecte ESG, chap. IV).",
        "Des commissaires aux comptes ou organismes tiers indépendants (OTI)",
        [
          "L'AMF qui audite chaque rapport individuellement",
          "Une équipe interne RSE sans regard externe",
          "Le commissaire aux apports lors d'une fusion",
        ],
        1,
        "debutant",
        1
      ),
      q(
        "Le concept de « boîte noire » désigne chez ZEI :",
        "ZEI alerte sur les calculs complexes effectués sur des fichiers personnels hors système : pour l'auditeur, ce sont des « boîtes noires » impossibles à vérifier — d'où l'obligation de paramétrer/verrouiller chaque transformation dans un outil commun (source : ZEI — Guide collecte ESG, §IV.1).",
        "Les calculs complexes effectués sur des fichiers Excel personnels invérifiables par l'auditeur",
        [
          "Un coffre-fort physique pour les preuves papier",
          "Une intelligence artificielle obscure",
          "Une caisse fiscale anonyme",
        ],
        3,
        "avance",
        1
      ),
      q(
        "Selon ZEI, l'acculturation des métiers à la donnée ESG passe surtout par :",
        "Un acheteur qui comprend que sa donnée sécurise un futur financement bancaire ou un appel d'offres stratégique sera bien plus rigoureux qu'un acheteur qui remplit un tableau « pour la RSE » (source : ZEI — Guide collecte ESG, §III.1).",
        "Montrer que la donnée sécurise un financement bancaire ou un appel d'offres",
        [
          "Imposer des sanctions financières aux contributeurs en retard",
          "Multiplier les e-mails de relance hebdomadaires",
          "Sous-traiter la collecte à un cabinet externe",
        ],
        2,
        "intermediaire",
        0
      ),
    ],
  });

  await seedModuleQuick(stCollecte, {
    slug: "esg-collecte-checklist-post-collecte",
    title: "Checklist ZEI post-collecte (6 sections)",
    description:
      "Les 6 sections de la checklist ZEI pour analyser à froid une collecte ESG terminée : complétion, cohérence, justificatifs, consolidation, préparation reporting, capitalisation.",
    order: 3,
    estimatedMinutes: 12,
    difficulty: "debutant",
    lesson1Title: "Sections 1 à 3 — Complétion, cohérence, justificatifs",
    lesson1Content: [
      {
        type: "heading",
        level: 2,
        text: "Prendre du recul sur la dernière collecte",
      },
      {
        type: "paragraph",
        text:
          "L'objectif de la checklist ZEI est d'aider à comprendre ce qui a fonctionné, ce qui a bloqué, et de ne pas repartir de zéro la prochaine fois. Elle s'organise en 6 sections — les trois premières sécurisent la matière première (complétion, qualité, traçabilité).",
      },
      {
        type: "heading",
        level: 3,
        text: "1. Complétion des données",
      },
      {
        type: "list",
        style: "bullet",
        items: [
          "Toutes les entités du périmètre ont-elles répondu ?",
          "Tous les indicateurs obligatoires sont-ils complétés ?",
          "Les données manquantes sont-elles identifiées et listées ?",
          "Un taux de complétion global et par entité est-il calculé ?",
          "Les entités non répondantes ont-elles été relancées ?",
          "Les données issues d'estimations sont-elles clairement identifiées ?",
        ],
      },
      {
        type: "callout",
        variant: "tip",
        title: "Vu par ZEI",
        text:
          "Une donnée manquante aujourd'hui devient une faiblesse demain. Une collecte incomplète fragilise immédiatement tout le reporting : retraitements en urgence, perte de crédibilité en interne et difficultés à produire des indicateurs consolidés fiables, notamment dans un cadre réglementaire. Source : ZEI — Checklist collecte ESG.",
      },
      {
        type: "heading",
        level: 3,
        text: "2. Cohérence et qualité des données",
      },
      {
        type: "list",
        style: "bullet",
        items: [
          "Les unités sont-elles homogènes (kWh, tonnes, €…) ?",
          "Les conversions d'unités ont-elles été vérifiées ?",
          "Les ordres de grandeur sont-ils cohérents par rapport à N-1 ?",
          "Les variations significatives sont-elles expliquées ?",
          "Les ratios clés (énergie / surface, émissions / CA) sont-ils plausibles ?",
          "Les doublons ont-ils été supprimés ?",
        ],
      },
      {
        type: "heading",
        level: 3,
        text: "3. Justificatifs et validations",
      },
      {
        type: "list",
        style: "bullet",
        items: [
          "Pièces justificatives collectées pour les données sensibles.",
          "Sources de données documentées.",
          "Chaque donnée rattachée à un responsable identifié.",
          "Facteurs d'émission utilisés documentés.",
          "Indicateurs relus par les responsables métiers.",
          "Validation globale (RSE / finance / direction) réalisée et tracée.",
        ],
      },
      {
        type: "sources",
        items: [{ label: CHECKLIST_LABEL, url: CHECKLIST_URL }],
      },
    ],
    lesson2Title: "Sections 4 à 6 — Consolidation, reporting, capitalisation",
    lesson2Content: [
      {
        type: "heading",
        level: 2,
        text: "De la base de données au pilotage stratégique",
      },
      {
        type: "heading",
        level: 3,
        text: "4. Consolidation et analyse des données",
      },
      {
        type: "list",
        style: "bullet",
        items: [
          "Les règles de consolidation sont-elles clairement définies ?",
          "Les méthodes d'agrégation sont-elles cohérentes (somme, moyenne…) ?",
          "Les cas particuliers (acquisitions, fermetures…) ont-ils été intégrés ?",
          "Les principaux écarts et tendances sont-ils identifiés ?",
          "Les résultats sont-ils comparés à N-1 ou aux objectifs ?",
          "Les hotspots (sites ou activités les plus impactants) sont-ils identifiés ?",
          "Les anomalies restantes sont-elles comprises et documentées ?",
        ],
      },
      {
        type: "heading",
        level: 3,
        text: "5. Préparation au reporting",
      },
      {
        type: "list",
        style: "bullet",
        items: [
          "Tous les indicateurs pour le reporting sont-ils disponibles ?",
          "Les données sont-elles alignées avec les autres reportings (financier notamment) ?",
          "Les indicateurs propres au secteur sont-ils identifiables et justifiables ?",
          "Les commentaires contextualisent les données.",
          "Les hypothèses et limites méthodologiques sont expliquées.",
          "Les formats d'export sont prêts (tableaux, graphiques…).",
          "Les données sont prêtes pour un audit externe éventuel.",
        ],
      },
      {
        type: "heading",
        level: 3,
        text: "6. Enseignements pour la prochaine collecte",
      },
      {
        type: "list",
        style: "bullet",
        items: [
          "Difficultés rencontrées documentées.",
          "Indicateurs les plus complexes à collecter identifiés.",
          "Délais réels vs prévus analysés.",
          "Document de traçabilité de collecte complété.",
          "Besoins d'automatisation identifiés.",
          "Plan d'amélioration concret défini pour la prochaine collecte.",
        ],
      },
      {
        type: "callout",
        variant: "tip",
        title: "Vu par ZEI",
        text:
          "Ne pas capitaliser sur une collecte, c'est repartir de zéro chaque année. Les mêmes difficultés réapparaissent, les équipes se démobilisent et les coûts opérationnels augmentent. À l'inverse, les entreprises qui structurent leurs retours d'expérience gagnent en efficacité, fiabilisent leurs données et montent rapidement en maturité ESG. Source : ZEI — Checklist collecte ESG (§6).",
      },
      {
        type: "sources",
        items: [{ label: CHECKLIST_LABEL, url: CHECKLIST_URL }],
      },
    ],
    questions: [
      q(
        "La checklist post-collecte ZEI s'organise en combien de sections ?",
        "La checklist ZEI distingue 6 sections : complétion, cohérence et qualité, justificatifs et validations, consolidation et analyse, préparation au reporting, enseignements (source : ZEI — Checklist collecte ESG, sommaire).",
        "6 sections",
        ["3 sections", "10 sections", "15 sections"],
        1,
        "debutant",
        0
      ),
      q(
        "Selon la Checklist ZEI, quel risque concret survient si les données manquantes ne sont pas identifiées et listées ?",
        "ZEI alerte qu'une collecte incomplète fragilise tout le reporting : retraitements en urgence, perte de crédibilité en interne et difficultés à produire des indicateurs consolidés fiables (source : ZEI — Checklist, §1).",
        "Retraitements en urgence et perte de crédibilité interne",
        [
          "Une amende immédiate de l'AMF",
          "Une suspension automatique de l'exercice fiscal",
          "Un blocage des salaires des contributeurs",
        ],
        2,
        "intermediaire",
        0
      ),
      q(
        "Pour vérifier la cohérence des données ESG, la Checklist ZEI demande de comparer les chiffres :",
        "La Checklist exige de vérifier les ordres de grandeur par rapport à N-1 et la plausibilité des ratios clés (énergie / surface, émissions / CA) — c'est ainsi que l'on détecte une variation aberrante (source : ZEI — Checklist, §2).",
        "Aux ordres de grandeur N-1 et aux ratios clés (énergie / surface, émissions / CA)",
        [
          "Aux chiffres communiqués par les concurrents directs",
          "Au cours de bourse de l'entreprise",
          "À l'inflation annuelle de l'INSEE",
        ],
        2,
        "intermediaire",
        0
      ),
      q(
        "Selon la Checklist ZEI, à quoi sert la documentation des facteurs d'émission utilisés ?",
        "Sans facteurs d'émission documentés, les données deviennent indéfendables en cas d'audit et génèrent des allers-retours internes coûteux pour retrouver leur origine (source : ZEI — Checklist, §3).",
        "Rendre les données auditables et défendables face à un OTI",
        [
          "Réduire la facture d'énergie de l'entreprise",
          "Accélérer le rendu du rapport financier",
          "Imposer un facteur unique à toute la profession",
        ],
        2,
        "intermediaire",
        0
      ),
      q(
        "Quels cas particuliers la Checklist ZEI demande explicitement d'intégrer à la consolidation ESG ?",
        "ZEI cite explicitement les acquisitions et les fermetures comme cas particuliers à intégrer à la consolidation pour éviter des biais (source : ZEI — Checklist, §4).",
        "Les acquisitions et les fermetures de sites",
        [
          "Les fluctuations de marché sur 24 h",
          "Les jours fériés et ponts du calendrier",
          "Les changements de logo et de charte graphique",
        ],
        2,
        "intermediaire",
        1
      ),
      q(
        "Dans la consolidation, à quoi correspondent les « hotspots » que la Checklist ZEI demande d'identifier ?",
        "Les hotspots, selon la Checklist ZEI, sont les sites ou activités les plus impactants — leur identification permet de prioriser les leviers d'action et d'orienter la stratégie (source : ZEI — Checklist, §4).",
        "Les sites ou activités les plus impactants à prioriser",
        [
          "Les serveurs informatiques en surchauffe",
          "Les bureaux ayant le moins de fenêtres",
          "Les filiales dont le CA augmente le plus vite",
        ],
        2,
        "intermediaire",
        1
      ),
      q(
        "Avant un éventuel audit externe, la Checklist ZEI insiste sur :",
        "ZEI souligne que les données ESG doivent être alignées avec les autres reportings (notamment financier) — sans cela, les incohérences apparaissent trop tard et génèrent une forte pression en fin de cycle (source : ZEI — Checklist, §5).",
        "L'alignement avec les autres reportings (notamment financier)",
        [
          "Un export en PDF couleur uniquement",
          "Une réunion plénière des actionnaires",
          "La rédaction d'un communiqué de presse",
        ],
        3,
        "avance",
        1
      ),
      q(
        "Selon la Checklist ZEI, ne pas capitaliser sur une collecte revient à :",
        "ZEI résume : sans capitalisation, les mêmes difficultés réapparaissent chaque année, les équipes se démobilisent et les coûts opérationnels augmentent (source : ZEI — Checklist, §6).",
        "Repartir de zéro chaque année avec démobilisation des équipes",
        [
          "Économiser du temps sur la collecte suivante",
          "Garantir une note maximale en audit",
          "Améliorer automatiquement la qualité des données",
        ],
        1,
        "debutant",
        1
      ),
    ],
  });

  // Vérification finale : 7 sous-thèmes, 15 modules attendus pour le thème ESG.
  const countMods = await db
    .select({ id: quizModules.id })
    .from(quizModules)
    .innerJoin(
      quizSubthemes,
      and(eq(quizModules.subthemeId, quizSubthemes.id), eq(quizSubthemes.themeId, themeId))
    );
  console.log(`\n  📊 Modules ESG en base pour ce thème : ${countMods.length}`);

  console.log("\n✅ Seed ESG terminé avec succès !\n");
  await sql.end();
}

seedESG().catch((err) => {
  console.error("❌ Erreur lors du seed ESG :", err);
  process.exit(1);
});
