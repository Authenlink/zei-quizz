/**
 * Seed script — Thème RSE complet (idempotent)
 * Usage : npx tsx scripts/seed-rse.ts
 * Usage (reset) : npx tsx scripts/seed-rse.ts --reset
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type ContentBlock =
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; style?: "bullet" | "ordered"; items: string[] }
  | { type: "callout"; variant: "info" | "warning" | "tip" | "important"; title?: string; text: string }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "divider" }
  | { type: "regulatory_note"; year?: number; companySize?: "all" | "large" | "sme"; text: string }
  | { type: "sources"; items: { label: string; url: string }[] };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function getOrCreateTheme(data: {
  slug: string; title: string; description: string;
  icon: string; color: string; order: number;
}) {
  const existing = await db.select({ id: quizThemes.id }).from(quizThemes).where(eq(quizThemes.slug, data.slug));
  if (existing.length > 0) {
    console.log(`  ↩  Thème "${data.slug}" déjà présent (id=${existing[0].id})`);
    return existing[0].id;
  }
  const [row] = await db.insert(quizThemes).values({ ...data, isActive: true }).returning({ id: quizThemes.id });
  console.log(`  ✓  Thème "${data.slug}" inséré (id=${row.id})`);
  return row.id;
}

async function getOrCreateSubtheme(data: {
  themeId: number; slug: string; title: string; description: string; order: number;
}) {
  const existing = await db.select({ id: quizSubthemes.id }).from(quizSubthemes)
    .where(and(eq(quizSubthemes.themeId, data.themeId), eq(quizSubthemes.slug, data.slug)));
  if (existing.length > 0) return existing[0].id;
  const [row] = await db.insert(quizSubthemes).values({ ...data, isActive: true }).returning({ id: quizSubthemes.id });
  console.log(`    ✓  Sous-thème "${data.slug}" inséré (id=${row.id})`);
  return row.id;
}

async function getOrCreateModule(data: {
  subthemeId: number; slug: string; title: string; description: string;
  order: number; estimatedMinutes: number; difficulty: "debutant" | "intermediaire" | "avance";
}) {
  const existing = await db.select({ id: quizModules.id }).from(quizModules)
    .where(and(eq(quizModules.subthemeId, data.subthemeId), eq(quizModules.slug, data.slug)));
  if (existing.length > 0) return existing[0].id;
  const [row] = await db.insert(quizModules).values({ ...data, isActive: true }).returning({ id: quizModules.id });
  console.log(`      ✓  Module "${data.slug}" inséré (id=${row.id})`);
  return row.id;
}

async function insertLesson(data: {
  moduleId: number; title: string; content: ContentBlock[];
  type: "lesson" | "regulatory_update" | "case_study" | "zei_spotlight";
  applicableYear?: number; companySize?: "all" | "large" | "sme"; order: number;
}) {
  const [row] = await db.insert(quizLessons).values({
    moduleId: data.moduleId,
    title: data.title,
    content: data.content,
    type: data.type,
    applicableYear: data.applicableYear ?? null,
    companySize: data.companySize ?? "all",
    order: data.order,
  }).returning({ id: quizLessons.id });
  return row.id;
}

async function insertQuestion(data: {
  moduleId: number; lessonId?: number; question: string;
  type: "mcq" | "true_false"; explanation: string;
  difficulty: "debutant" | "intermediaire" | "avance"; points: number; order: number;
  options: { text: string; isCorrect: boolean; order: number }[];
}) {
  const [qRow] = await db.insert(quizQuestions).values({
    moduleId: data.moduleId,
    lessonId: data.lessonId ?? null,
    question: data.question,
    type: data.type,
    explanation: data.explanation,
    difficulty: data.difficulty,
    points: data.points,
    order: data.order,
  }).returning({ id: quizQuestions.id });

  await db.insert(quizQuestionOptions).values(
    data.options.map((o) => ({ questionId: qRow.id, ...o }))
  );
  return qRow.id;
}

// ---------------------------------------------------------------------------
// SEED
// ---------------------------------------------------------------------------

async function seedRSE() {
  const reset = process.argv.includes("--reset");

  if (reset) {
    console.log("\n🗑️  Mode reset : suppression du thème RSE existant...");
    const existing = await db.select({ id: quizThemes.id }).from(quizThemes).where(eq(quizThemes.slug, "rse"));
    if (existing.length > 0) {
      await db.delete(quizThemes).where(eq(quizThemes.slug, "rse"));
      console.log("  ✓  Thème RSE supprimé (cascade sur sous-thèmes, modules, leçons, questions)\n");
    } else {
      console.log("  (aucun thème RSE trouvé)\n");
    }
  }

  console.log("🌱 Démarrage du seed RSE...\n");

  // ═══════════════════════════════════════════════════════════
  // THÈME RSE
  // ═══════════════════════════════════════════════════════════
  const themeId = await getOrCreateTheme({
    slug: "rse",
    title: "RSE — Responsabilité Sociétale des Entreprises",
    description: "Découvrez les fondements, les piliers et les enjeux de la Responsabilité Sociétale des Entreprises (RSE) : définitions, normes internationales, contexte réglementaire français et avantages concurrentiels.",
    icon: "Leaf",
    color: "#22c55e",
    order: 1,
  });

  // ═══════════════════════════════════════════════════════════
  // SOUS-THÈME 1 : Définitions et fondamentaux
  // ═══════════════════════════════════════════════════════════
  const st1 = await getOrCreateSubtheme({
    themeId,
    slug: "rse-fondamentaux",
    title: "Définitions et fondamentaux",
    description: "Comprendre ce qu'est la RSE, son origine, ses principes clés et pourquoi elle est devenue incontournable pour les entreprises modernes.",
    order: 1,
  });

  const m1_1 = await getOrCreateModule({
    subthemeId: st1,
    slug: "rse-definition-enjeux",
    title: "Qu'est-ce que la RSE ?",
    description: "Définition officielle, origine et enjeux de la Responsabilité Sociétale des Entreprises.",
    order: 1,
    estimatedMinutes: 12,
    difficulty: "debutant",
  });

  const l1_1_1 = await insertLesson({
    moduleId: m1_1,
    title: "Définition et origines de la RSE",
    order: 1,
    type: "lesson",
    content: [
      { type: "heading", level: 2, text: "Qu'est-ce que la RSE ?" },
      { type: "paragraph", text: "La RSE (Responsabilité Sociétale des Entreprises) désigne l'intégration volontaire par les entreprises de préoccupations sociales et environnementales dans leurs activités commerciales et leurs relations avec les parties prenantes. Elle va au-delà du simple respect des obligations légales." },
      { type: "callout", variant: "info", title: "Définition de la Commission européenne", text: "La RSE est « la responsabilité des entreprises vis-à-vis des effets qu'elles exercent sur la société » (Communication 2011). Elle implique d'intégrer les préoccupations sociales, environnementales, éthiques, les droits de l'homme et les préoccupations des consommateurs dans leurs activités et leur stratégie de base." },
      { type: "heading", level: 3, text: "Origines historiques" },
      { type: "paragraph", text: "Le concept de RSE est apparu aux États-Unis dans les années 1950, avec les travaux de Howard Bowen (1953) qui a introduit l'idée que les entreprises ont des obligations envers la société. En Europe, la notion s'est développée dans les années 1990, avec le Livre vert de la Commission européenne en 2001." },
      { type: "list", style: "ordered", items: [
        "1953 : Howard Bowen publie « Social Responsibilities of the Businessman »",
        "1992 : Sommet de la Terre à Rio — émergence du développement durable",
        "2001 : Livre vert de la Commission européenne sur la RSE",
        "2010 : Publication de la norme ISO 26000",
        "2014 : Directive européenne NFRD (première obligation de reporting)",
        "2022 : Adoption de la directive CSRD, qui remplace la NFRD",
      ]},
      { type: "heading", level: 3, text: "Pourquoi la RSE est-elle incontournable ?" },
      { type: "paragraph", text: "Les entreprises font face à des attentes croissantes de leurs parties prenantes : clients, salariés, investisseurs, régulateurs et société civile. La RSE permet de répondre à ces attentes tout en créant de la valeur à long terme." },
      { type: "callout", variant: "tip", title: "Chiffre clé", text: "87% des consommateurs sont plus susceptibles d'acheter auprès d'entreprises soutenant des causes sociales (Cone Communications). Les entreprises RSE actives observent en moyenne une augmentation de 40% de leur rentabilité." },
      { type: "sources", items: [
        { label: "RSE Définition : 3 Piliers, Avantages & Stratégie 2025 — sanscravate.fr", url: "https://sanscravate.fr/rse-definition-entreprise/" },
        { label: "ISO 26000 : décliner sa démarche en 7 piliers — Groupe AFNOR", url: "https://www.afnor.org/developpement-durable/politique-iso-26000/" },
        { label: "Norme ISO 26000 : définition et rôle dans la RSE — ESG Act", url: "https://www.esg-act.org/ressources/norme-iso-26000" },
      ]},
    ] as ContentBlock[],
  });

  const l1_1_2 = await insertLesson({
    moduleId: m1_1,
    title: "Les parties prenantes et la double obligation",
    order: 2,
    type: "lesson",
    content: [
      { type: "heading", level: 2, text: "Les parties prenantes de la RSE" },
      { type: "paragraph", text: "La RSE implique d'identifier et de prendre en compte l'ensemble des parties prenantes (stakeholders) qui peuvent être affectées par les activités de l'entreprise ou qui ont une influence sur elle." },
      { type: "table", headers: ["Partie prenante", "Type", "Exemples d'attentes RSE"], rows: [
        ["Salariés", "Interne", "Conditions de travail, égalité, formation"],
        ["Clients", "Externe", "Produits responsables, transparence"],
        ["Fournisseurs", "Externe", "Achats responsables, délais de paiement"],
        ["Investisseurs", "Externe", "Reporting ESG, gouvernance"],
        ["Collectivités", "Externe", "Impact local, fiscalité, emploi"],
        ["ONG / Société civile", "Externe", "Droits humains, environnement"],
      ]},
      { type: "heading", level: 3, text: "La double obligation de la RSE" },
      { type: "paragraph", text: "La RSE repose sur deux types d'obligations complémentaires :" },
      { type: "list", style: "bullet", items: [
        "L'obligation légale (compliance) : respecter les lois et réglementations en vigueur (droit du travail, environnement, etc.)",
        "L'engagement volontaire (beyond compliance) : aller au-delà des obligations légales pour créer de la valeur sociale et environnementale",
      ]},
      { type: "callout", variant: "important", title: "Point clé", text: "La RSE n'est pas uniquement du philanthropisme ou du mécénat. C'est une approche stratégique intégrée qui vise à aligner performance économique, responsabilité sociale et impact environnemental." },
      { type: "heading", level: 3, text: "RSE vs développement durable" },
      { type: "paragraph", text: "La RSE est l'application du développement durable au niveau de l'entreprise. Le développement durable (défini par le rapport Brundtland, 1987) est « un développement qui répond aux besoins du présent sans compromettre la capacité des générations futures à répondre aux leurs »." },
      { type: "sources", items: [
        { label: "Gouvernance RSE : définition, enjeux et bonnes pratiques — ESG Act", url: "https://www.esg-act.org/ressources/gouvernance-rse" },
        { label: "Comprendre les 7 piliers de la RSE — RSE Market", url: "https://www.rse-market.com/blog/comprendre-les-sept-piliers-de-la-rse-pour-une-entreprise-responsable" },
      ]},
    ] as ContentBlock[],
  });

  await insertQuestion({ moduleId: m1_1, lessonId: l1_1_1, question: "Quelle institution a publié la définition officielle de la RSE en 2011 ?", type: "mcq", difficulty: "debutant", points: 1, order: 1, explanation: "La Commission européenne a défini la RSE en 2011 comme 'la responsabilité des entreprises vis-à-vis des effets qu'elles exercent sur la société'.", options: [{ text: "L'ONU", isCorrect: false, order: 1 }, { text: "La Commission européenne", isCorrect: true, order: 2 }, { text: "L'ISO", isCorrect: false, order: 3 }, { text: "Le gouvernement français", isCorrect: false, order: 4 }] });
  await insertQuestion({ moduleId: m1_1, lessonId: l1_1_1, question: "En quelle année Howard Bowen a-t-il introduit le concept de responsabilité sociale des entreprises ?", type: "mcq", difficulty: "debutant", points: 1, order: 2, explanation: "Howard Bowen a publié 'Social Responsibilities of the Businessman' en 1953, ouvrage fondateur du concept de RSE.", options: [{ text: "1945", isCorrect: false, order: 1 }, { text: "1953", isCorrect: true, order: 2 }, { text: "1972", isCorrect: false, order: 3 }, { text: "2001", isCorrect: false, order: 4 }] });
  await insertQuestion({ moduleId: m1_1, lessonId: l1_1_1, question: "La RSE implique uniquement le respect des obligations légales.", type: "true_false", difficulty: "debutant", points: 1, order: 3, explanation: "Faux. La RSE va au-delà du simple respect des obligations légales (beyond compliance). Elle implique un engagement volontaire pour créer de la valeur sociale et environnementale.", options: [{ text: "Vrai", isCorrect: false, order: 1 }, { text: "Faux", isCorrect: true, order: 2 }, { text: "Cela dépend du secteur", isCorrect: false, order: 3 }, { text: "Cela dépend de la taille de l'entreprise", isCorrect: false, order: 4 }] });
  await insertQuestion({ moduleId: m1_1, lessonId: l1_1_2, question: "Parmi les parties prenantes suivantes, laquelle est une partie prenante INTERNE de l'entreprise ?", type: "mcq", difficulty: "debutant", points: 1, order: 4, explanation: "Les salariés sont des parties prenantes internes car ils font partie de l'organisation. Les clients, fournisseurs et ONG sont des parties prenantes externes.", options: [{ text: "Les clients", isCorrect: false, order: 1 }, { text: "Les fournisseurs", isCorrect: false, order: 2 }, { text: "Les salariés", isCorrect: true, order: 3 }, { text: "Les ONG", isCorrect: false, order: 4 }] });
  await insertQuestion({ moduleId: m1_1, lessonId: l1_1_2, question: "Quelle directive européenne adoptée en 2022 remplace la NFRD ?", type: "mcq", difficulty: "intermediaire", points: 2, order: 5, explanation: "La CSRD (Corporate Sustainability Reporting Directive) adoptée en 2022 remplace la NFRD (Non-Financial Reporting Directive) et renforce considérablement les obligations de reporting extra-financier.", options: [{ text: "DPEF", isCorrect: false, order: 1 }, { text: "CSRD", isCorrect: true, order: 2 }, { text: "ESRS", isCorrect: false, order: 3 }, { text: "SFDR", isCorrect: false, order: 4 }] });
  await insertQuestion({ moduleId: m1_1, question: "Selon la définition du rapport Brundtland (1987), qu'est-ce que le développement durable ?", type: "mcq", difficulty: "debutant", points: 1, order: 6, explanation: "Le rapport Brundtland définit le développement durable comme 'un développement qui répond aux besoins du présent sans compromettre la capacité des générations futures à répondre aux leurs'.", options: [{ text: "Un développement basé uniquement sur la croissance économique", isCorrect: false, order: 1 }, { text: "Un développement qui répond aux besoins du présent sans compromettre ceux des générations futures", isCorrect: true, order: 2 }, { text: "Un développement centré sur les énergies renouvelables", isCorrect: false, order: 3 }, { text: "Un développement qui privilégie l'environnement sur l'économie", isCorrect: false, order: 4 }] });
  await insertQuestion({ moduleId: m1_1, question: "Quel pourcentage de consommateurs sont plus susceptibles d'acheter auprès d'entreprises soutenant des causes sociales (Cone Communications) ?", type: "mcq", difficulty: "debutant", points: 1, order: 7, explanation: "Selon l'étude Cone Communications, 87% des consommateurs sont plus susceptibles d'acheter auprès d'entreprises soutenant des causes sociales.", options: [{ text: "45%", isCorrect: false, order: 1 }, { text: "65%", isCorrect: false, order: 2 }, { text: "87%", isCorrect: true, order: 3 }, { text: "95%", isCorrect: false, order: 4 }] });
  await insertQuestion({ moduleId: m1_1, question: "La RSE est l'application du développement durable à quelle échelle ?", type: "mcq", difficulty: "debutant", points: 1, order: 8, explanation: "La RSE est l'application du développement durable au niveau de l'entreprise. Elle traduit les principes du développement durable en actions concrètes dans le contexte d'une organisation.", options: [{ text: "À l'échelle mondiale", isCorrect: false, order: 1 }, { text: "À l'échelle nationale", isCorrect: false, order: 2 }, { text: "À l'échelle de l'entreprise", isCorrect: true, order: 3 }, { text: "À l'échelle locale", isCorrect: false, order: 4 }] });

  // Module 1.2 — ISO 26000
  const m1_2 = await getOrCreateModule({
    subthemeId: st1,
    slug: "rse-iso26000-cadre",
    title: "ISO 26000 : le cadre de référence international",
    description: "Découvrez les 7 domaines d'action de la norme ISO 26000 et comment elle structure la démarche RSE de toute organisation.",
    order: 2,
    estimatedMinutes: 15,
    difficulty: "intermediaire",
  });

  const l1_2_1 = await insertLesson({
    moduleId: m1_2,
    title: "Présentation de la norme ISO 26000",
    order: 1,
    type: "lesson",
    content: [
      { type: "heading", level: 2, text: "La norme ISO 26000 : qu'est-ce que c'est ?" },
      { type: "paragraph", text: "Publiée en novembre 2010, l'ISO 26000 est une norme internationale de guidance sur la responsabilité sociétale. Elle a été élaborée en concertation avec des représentants de plus de 90 pays et 40 organisations internationales." },
      { type: "callout", variant: "warning", title: "Attention", text: "L'ISO 26000 est une norme de GUIDANCE, non une norme de management certifiable. Contrairement à l'ISO 9001 (qualité) ou l'ISO 14001 (environnement), il n'existe pas de certification ISO 26000." },
      { type: "heading", level: 3, text: "Les 7 questions centrales d'ISO 26000" },
      { type: "table", headers: ["Question centrale", "Enjeux couverts"], rows: [
        ["1. Gouvernance de l'organisation", "Processus de décision, transparence, responsabilisation"],
        ["2. Droits de l'homme", "Droits civils, politiques, économiques, sociaux et culturels"],
        ["3. Relations et conditions de travail", "Emploi, conditions de travail, protection sociale, dialogue social"],
        ["4. Environnement", "Prévention pollution, utilisation durable des ressources, changement climatique"],
        ["5. Loyauté des pratiques", "Anti-corruption, concurrence loyale, promotion de la RSE dans la chaîne de valeur"],
        ["6. Questions relatives aux consommateurs", "Pratiques commerciales loyales, protection de la santé et sécurité"],
        ["7. Communautés et développement local", "Implication, contribution au développement, emploi local"],
      ]},
      { type: "paragraph", text: "Ces 7 questions sont interdépendantes et forment un système cohérent. Une démarche RSE solide doit aborder chacune d'entre elles en tenant compte du contexte de l'organisation." },
      { type: "sources", items: [
        { label: "ISO 26000 : décliner sa démarche en 7 piliers — Groupe AFNOR", url: "https://www.afnor.org/developpement-durable/politique-iso-26000/" },
        { label: "Norme ISO 26000 : définition et rôle dans la RSE — ESG Act", url: "https://www.esg-act.org/ressources/norme-iso-26000" },
      ]},
    ] as ContentBlock[],
  });

  const l1_2_2 = await insertLesson({
    moduleId: m1_2,
    title: "Mettre en œuvre ISO 26000 dans son organisation",
    order: 2,
    type: "lesson",
    content: [
      { type: "heading", level: 2, text: "Les principes fondamentaux de l'ISO 26000" },
      { type: "paragraph", text: "La norme s'appuie sur 7 principes fondamentaux que toute organisation doit respecter dans sa démarche RSE :" },
      { type: "list", style: "ordered", items: [
        "Redevabilité : rendre compte de ses impacts sur la société et l'environnement",
        "Transparence : communiquer clairement sur ses décisions et activités",
        "Comportement éthique : agir avec honnêteté, équité et intégrité",
        "Respect des intérêts des parties prenantes : identifier et considérer leurs besoins",
        "Respect de l'État de droit : respecter la légalité et les réglementations",
        "Respect des normes internationales de comportement : s'aligner sur les standards mondiaux",
        "Respect des droits de l'homme : soutenir et respecter les droits fondamentaux",
      ]},
      { type: "heading", level: 3, text: "Comment utiliser ISO 26000 ?" },
      { type: "list", style: "bullet", items: [
        "Identifier les questions pertinentes pour son activité et son contexte",
        "Dialoguer avec ses parties prenantes pour comprendre leurs attentes",
        "Fixer des priorités et objectifs mesurables",
        "Intégrer la RSE dans les processus de gouvernance et les pratiques opérationnelles",
        "Communiquer sur ses engagements et ses résultats",
        "Évaluer régulièrement la performance et améliorer continuellement",
      ]},
      { type: "callout", variant: "tip", title: "Bonne pratique", text: "ISO 26000 peut être utilisée comme référentiel pour conduire un bilan RSE ou préparer un rapport de développement durable. Elle est complémentaire des standards de reporting comme le GRI." },
      { type: "sources", items: [
        { label: "ISO 26000 — Site officiel ISO", url: "https://www.iso.org/iso-26000-social-responsibility.html" },
        { label: "ISO 26000 : 7 questions centrales — AFNOR Groupe", url: "https://www.afnor.org/developpement-durable/politique-iso-26000/" },
      ]},
    ] as ContentBlock[],
  });

  await insertQuestion({ moduleId: m1_2, lessonId: l1_2_1, question: "En quelle année l'ISO 26000 a-t-elle été publiée ?", type: "mcq", difficulty: "debutant", points: 1, order: 1, explanation: "L'ISO 26000 a été publiée en novembre 2010, après plusieurs années de travaux impliquant des représentants de plus de 90 pays.", options: [{ text: "2001", isCorrect: false, order: 1 }, { text: "2005", isCorrect: false, order: 2 }, { text: "2010", isCorrect: true, order: 3 }, { text: "2014", isCorrect: false, order: 4 }] });
  await insertQuestion({ moduleId: m1_2, lessonId: l1_2_1, question: "L'ISO 26000 est une norme certifiable, comme l'ISO 9001.", type: "true_false", difficulty: "debutant", points: 1, order: 2, explanation: "Faux. L'ISO 26000 est une norme de guidance, non certifiable. Contrairement à l'ISO 9001 (qualité) ou l'ISO 14001 (environnement), il n'existe pas de certification ISO 26000.", options: [{ text: "Vrai", isCorrect: false, order: 1 }, { text: "Faux", isCorrect: true, order: 2 }, { text: "Cela dépend du pays", isCorrect: false, order: 3 }, { text: "Cela dépend de la taille", isCorrect: false, order: 4 }] });
  await insertQuestion({ moduleId: m1_2, lessonId: l1_2_1, question: "Combien de questions centrales comporte l'ISO 26000 ?", type: "mcq", difficulty: "debutant", points: 1, order: 3, explanation: "L'ISO 26000 s'articule autour de 7 questions centrales : gouvernance, droits de l'homme, conditions de travail, environnement, loyauté des pratiques, questions consommateurs, communautés.", options: [{ text: "3", isCorrect: false, order: 1 }, { text: "5", isCorrect: false, order: 2 }, { text: "7", isCorrect: true, order: 3 }, { text: "10", isCorrect: false, order: 4 }] });
  await insertQuestion({ moduleId: m1_2, lessonId: l1_2_2, question: "Quel principe ISO 26000 consiste à 'rendre compte de ses impacts sur la société et l'environnement' ?", type: "mcq", difficulty: "intermediaire", points: 2, order: 4, explanation: "La redevabilité est le principe qui consiste à rendre compte de ses décisions et activités, notamment de leurs impacts sur la société, l'économie et l'environnement.", options: [{ text: "Transparence", isCorrect: false, order: 1 }, { text: "Redevabilité", isCorrect: true, order: 2 }, { text: "Comportement éthique", isCorrect: false, order: 3 }, { text: "Respect de l'État de droit", isCorrect: false, order: 4 }] });
  await insertQuestion({ moduleId: m1_2, question: "Quelle question centrale d'ISO 26000 couvre la prévention de la pollution et le changement climatique ?", type: "mcq", difficulty: "intermediaire", points: 2, order: 5, explanation: "La 4e question centrale 'Environnement' couvre la prévention de la pollution, l'utilisation durable des ressources, l'atténuation des changements climatiques et la protection de la biodiversité.", options: [{ text: "Gouvernance de l'organisation", isCorrect: false, order: 1 }, { text: "Loyauté des pratiques", isCorrect: false, order: 2 }, { text: "Environnement", isCorrect: true, order: 3 }, { text: "Communautés et développement local", isCorrect: false, order: 4 }] });
  await insertQuestion({ moduleId: m1_2, question: "Combien de pays ont participé à l'élaboration de l'ISO 26000 ?", type: "mcq", difficulty: "intermediaire", points: 2, order: 6, explanation: "Plus de 90 pays ont participé à l'élaboration de l'ISO 26000, ce qui en fait une norme véritablement internationale et consensuelle.", options: [{ text: "Plus de 30 pays", isCorrect: false, order: 1 }, { text: "Plus de 50 pays", isCorrect: false, order: 2 }, { text: "Plus de 90 pays", isCorrect: true, order: 3 }, { text: "Plus de 150 pays", isCorrect: false, order: 4 }] });
  await insertQuestion({ moduleId: m1_2, question: "Quelle question centrale d'ISO 26000 couvre la lutte anti-corruption ?", type: "mcq", difficulty: "intermediaire", points: 2, order: 7, explanation: "La question 'Loyauté des pratiques' couvre notamment la lutte contre la corruption, la concurrence loyale et la promotion de la RSE dans la chaîne de valeur.", options: [{ text: "Gouvernance de l'organisation", isCorrect: false, order: 1 }, { text: "Droits de l'homme", isCorrect: false, order: 2 }, { text: "Relations et conditions de travail", isCorrect: false, order: 3 }, { text: "Loyauté des pratiques", isCorrect: true, order: 4 }] });
  await insertQuestion({ moduleId: m1_2, question: "Laquelle de ces normes est certifiable contrairement à l'ISO 26000 ?", type: "mcq", difficulty: "debutant", points: 1, order: 8, explanation: "L'ISO 14001 est une norme de système de management environnemental certifiable. L'ISO 26000, GRI et DPEF sont des référentiels de guidance ou de reporting, non certifiables.", options: [{ text: "GRI Standards", isCorrect: false, order: 1 }, { text: "ISO 14001", isCorrect: true, order: 2 }, { text: "DPEF", isCorrect: false, order: 3 }, { text: "Aucune de ces réponses", isCorrect: false, order: 4 }] });

  // ═══════════════════════════════════════════════════════════
  // SOUS-THÈME 2 : Les 3 piliers RSE
  // ═══════════════════════════════════════════════════════════
  const st2 = await getOrCreateSubtheme({
    themeId,
    slug: "rse-piliers",
    title: "Les 3 piliers RSE",
    description: "Plongez dans les trois dimensions fondamentales de la RSE : Environnemental, Social et Gouvernance (ESG). Comprendre chaque pilier et leurs interactions.",
    order: 2,
  });

  const m2_1 = await getOrCreateModule({
    subthemeId: st2,
    slug: "rse-pilier-environnement",
    title: "Pilier Environnemental",
    description: "Le pilier E de l'ESG : bilan carbone, biodiversité, économie circulaire et gestion des ressources naturelles.",
    order: 1,
    estimatedMinutes: 15,
    difficulty: "debutant",
  });

  const l2_1_1 = await insertLesson({
    moduleId: m2_1,
    title: "L'empreinte environnementale de l'entreprise",
    order: 1,
    type: "lesson",
    content: [
      { type: "heading", level: 2, text: "Le pilier Environnemental (E)" },
      { type: "paragraph", text: "Le pilier environnemental de la RSE englobe l'ensemble des actions visant à réduire l'impact négatif de l'entreprise sur l'environnement naturel et à contribuer à sa préservation." },
      { type: "heading", level: 3, text: "Les 3 scopes d'émissions carbone (GHG Protocol)" },
      { type: "table", headers: ["Scope", "Description", "Exemples"], rows: [
        ["Scope 1 — Émissions directes", "Sources détenues ou contrôlées par l'entreprise", "Combustion de carburant, fuites de réfrigérants"],
        ["Scope 2 — Émissions indirectes (énergie)", "Production de l'énergie achetée et consommée", "Électricité, chaleur, vapeur achetées"],
        ["Scope 3 — Autres émissions indirectes", "Toute la chaîne de valeur (amont et aval)", "Déplacements domicile-travail, produits achetés, usage des produits vendus"],
      ]},
      { type: "callout", variant: "info", title: "Le saviez-vous ?", text: "Le Scope 3 représente en moyenne 70 à 90% des émissions totales d'une entreprise. C'est le plus difficile à mesurer mais aussi le plus important à réduire pour une démarche climatique crédible." },
      { type: "heading", level: 3, text: "Les autres enjeux environnementaux clés" },
      { type: "list", style: "bullet", items: [
        "Biodiversité : préservation des écosystèmes et des espèces",
        "Eau : gestion responsable de la consommation et prévention de la pollution",
        "Économie circulaire : réduction des déchets, réutilisation, recyclage",
        "Pollution : air, eau, sol — prévention et traitement",
        "Énergie : transition vers les énergies renouvelables, efficacité énergétique",
      ]},
      { type: "sources", items: [
        { label: "Les 3 piliers RSE : Environnement, Social, Gouvernance — ESG Act", url: "https://www.esg-act.org/ressources/gouvernance-rse" },
        { label: "Bilan GES et scopes d'émissions — ADEME", url: "https://www.ademe.fr/nos-missions/transition-ecologique/bilan-ges/" },
        { label: "GHG Protocol — Corporate Standard", url: "https://ghgprotocol.org/corporate-standard" },
      ]},
    ] as ContentBlock[],
  });

  const l2_1_2 = await insertLesson({
    moduleId: m2_1,
    title: "Économie circulaire et objectifs climatiques",
    order: 2,
    type: "lesson",
    content: [
      { type: "heading", level: 2, text: "L'économie circulaire" },
      { type: "paragraph", text: "L'économie circulaire est un modèle économique visant à produire des biens et services de manière durable en limitant la consommation et les gaspillages de matières premières, d'eau et de sources d'énergie. Elle s'oppose au modèle linéaire 'extraire-fabriquer-jeter'." },
      { type: "list", style: "ordered", items: [
        "Éco-conception : intégrer les impacts environnementaux dès la conception du produit",
        "Écologie industrielle et territoriale : créer des synergies entre entreprises pour valoriser les déchets",
        "Économie de la fonctionnalité : vendre l'usage plutôt que le produit",
        "Consommation responsable : rendre les produits réparables, durables",
        "Allongement de la durée d'usage : réemploi, réparation, reconditionnement",
        "Recyclage : retraiter les matières pour créer de nouveaux produits",
        "Valorisation : récupérer l'énergie des déchets non recyclables",
      ]},
      { type: "heading", level: 3, text: "Les objectifs climatiques des entreprises" },
      { type: "paragraph", text: "L'Accord de Paris (2015) engage les pays à maintenir le réchauffement climatique en dessous de 2°C. Pour y contribuer, les entreprises doivent aligner leurs objectifs de réduction de GES sur ces trajectoires, notamment via les Science Based Targets (SBTi)." },
      { type: "callout", variant: "tip", title: "Science Based Targets (SBTi)", text: "Les Science Based Targets permettent aux entreprises de définir des objectifs de réduction de GES en accord avec les données scientifiques climatiques. Plus de 7 000 entreprises dans le monde ont déjà adopté ces cibles." },
      { type: "sources", items: [
        { label: "Économie circulaire — ADEME", url: "https://www.ademe.fr/nos-missions/economie-circulaire/" },
        { label: "Science Based Targets Initiative (SBTi)", url: "https://sciencebasedtargets.org/" },
        { label: "Accord de Paris — ONU Climat", url: "https://unfccc.int/fr/processus-et-reunions/l-accord-de-paris" },
      ]},
    ] as ContentBlock[],
  });

  await insertQuestion({ moduleId: m2_1, lessonId: l2_1_1, question: "Que désigne le 'Scope 3' dans la comptabilisation des émissions de GES ?", type: "mcq", difficulty: "intermediaire", points: 2, order: 1, explanation: "Le Scope 3 couvre toutes les autres émissions indirectes, c'est-à-dire celles liées à la chaîne de valeur en amont et en aval de l'entreprise (achats, transport, usage des produits, fin de vie).", options: [{ text: "Les émissions directes des installations de l'entreprise", isCorrect: false, order: 1 }, { text: "Les émissions liées à l'énergie achetée", isCorrect: false, order: 2 }, { text: "Les émissions indirectes de toute la chaîne de valeur", isCorrect: true, order: 3 }, { text: "Les émissions des produits en fin de vie uniquement", isCorrect: false, order: 4 }] });
  await insertQuestion({ moduleId: m2_1, lessonId: l2_1_1, question: "En moyenne, quel pourcentage des émissions totales d'une entreprise représente le Scope 3 ?", type: "mcq", difficulty: "intermediaire", points: 2, order: 2, explanation: "Le Scope 3 représente en moyenne 70 à 90% des émissions totales d'une entreprise. C'est pourquoi il est crucial de l'intégrer dans la stratégie climatique.", options: [{ text: "10 à 30%", isCorrect: false, order: 1 }, { text: "30 à 50%", isCorrect: false, order: 2 }, { text: "50 à 70%", isCorrect: false, order: 3 }, { text: "70 à 90%", isCorrect: true, order: 4 }] });
  await insertQuestion({ moduleId: m2_1, lessonId: l2_1_2, question: "Quelle initiative internationale définit des objectifs de réduction de GES alignés sur la science climatique ?", type: "mcq", difficulty: "intermediaire", points: 2, order: 3, explanation: "Les Science Based Targets (SBTi) permettent aux entreprises de définir des objectifs de réduction de GES cohérents avec les données scientifiques sur le climat et l'Accord de Paris.", options: [{ text: "Les Objectifs de Développement Durable (ODD)", isCorrect: false, order: 1 }, { text: "Les Science Based Targets (SBTi)", isCorrect: true, order: 2 }, { text: "Le Pacte Mondial de l'ONU", isCorrect: false, order: 3 }, { text: "La taxonomie européenne", isCorrect: false, order: 4 }] });
  await insertQuestion({ moduleId: m2_1, question: "Laquelle de ces actions fait partie de l'économie circulaire ?", type: "mcq", difficulty: "debutant", points: 1, order: 4, explanation: "La réparation des produits est une composante de l'économie circulaire car elle allonge la durée de vie des produits et réduit les déchets.", options: [{ text: "Produire et jeter après usage", isCorrect: false, order: 1 }, { text: "Réparer les produits pour allonger leur durée de vie", isCorrect: true, order: 2 }, { text: "Externaliser la production dans des pays à faible coût", isCorrect: false, order: 3 }, { text: "Compenser ses émissions carbone uniquement", isCorrect: false, order: 4 }] });
  await insertQuestion({ moduleId: m2_1, question: "Quel accord international engage les pays à limiter le réchauffement climatique à 2°C ?", type: "mcq", difficulty: "debutant", points: 1, order: 5, explanation: "L'Accord de Paris (COP21, 2015) engage les pays signataires à maintenir le réchauffement climatique bien en dessous de 2°C par rapport aux niveaux préindustriels.", options: [{ text: "Le Protocole de Kyoto", isCorrect: false, order: 1 }, { text: "La Convention de Rio", isCorrect: false, order: 2 }, { text: "L'Accord de Paris", isCorrect: true, order: 3 }, { text: "Le Pacte Vert européen", isCorrect: false, order: 4 }] });
  await insertQuestion({ moduleId: m2_1, question: "Qu'est-ce que le Scope 1 dans la comptabilisation carbone ?", type: "mcq", difficulty: "debutant", points: 1, order: 6, explanation: "Le Scope 1 correspond aux émissions directes provenant des sources détenues ou contrôlées par l'entreprise.", options: [{ text: "Les émissions liées aux achats de matières premières", isCorrect: false, order: 1 }, { text: "Les émissions directes des sources contrôlées par l'entreprise", isCorrect: true, order: 2 }, { text: "Les émissions de l'énergie achetée", isCorrect: false, order: 3 }, { text: "Les émissions du transport des produits finis", isCorrect: false, order: 4 }] });
  await insertQuestion({ moduleId: m2_1, question: "Parmi ces enjeux, lequel appartient au pilier ENVIRONNEMENTAL de la RSE ?", type: "mcq", difficulty: "debutant", points: 1, order: 7, explanation: "La préservation de la biodiversité est un enjeu environnemental. Les autres options relèvent des piliers Social ou Gouvernance.", options: [{ text: "L'égalité salariale hommes-femmes", isCorrect: false, order: 1 }, { text: "La préservation de la biodiversité", isCorrect: true, order: 2 }, { text: "La lutte contre la corruption", isCorrect: false, order: 3 }, { text: "La formation des salariés", isCorrect: false, order: 4 }] });
  await insertQuestion({ moduleId: m2_1, question: "L'éco-conception consiste à :", type: "mcq", difficulty: "intermediaire", points: 2, order: 8, explanation: "L'éco-conception consiste à intégrer les préoccupations environnementales dès la conception du produit ou service, pour minimiser ses impacts tout au long de son cycle de vie.", options: [{ text: "Recycler les produits en fin de vie uniquement", isCorrect: false, order: 1 }, { text: "Utiliser uniquement des matériaux recyclés", isCorrect: false, order: 2 }, { text: "Intégrer les impacts environnementaux dès la conception du produit", isCorrect: true, order: 3 }, { text: "Compenser toutes les émissions carbone du produit", isCorrect: false, order: 4 }] });

  const m2_2 = await getOrCreateModule({
    subthemeId: st2,
    slug: "rse-piliers-social-gouvernance",
    title: "Piliers Social et Gouvernance",
    description: "Les dimensions sociale (S) et gouvernance (G) de la RSE : bien-être au travail, diversité, éthique des affaires et transparence.",
    order: 2,
    estimatedMinutes: 15,
    difficulty: "debutant",
  });

  const l2_2_1 = await insertLesson({
    moduleId: m2_2,
    title: "Le pilier Social : personnes et conditions de travail",
    order: 1,
    type: "lesson",
    content: [
      { type: "heading", level: 2, text: "Le pilier Social (S)" },
      { type: "paragraph", text: "Le pilier social englobe toutes les actions relatives aux personnes : salariés, fournisseurs, clients et communautés locales. Il vise à garantir des conditions de travail dignes, l'égalité des chances et le respect des droits fondamentaux." },
      { type: "heading", level: 3, text: "Les principaux enjeux sociaux" },
      { type: "list", style: "bullet", items: [
        "Conditions de travail : sécurité, santé, ergonomie, temps de travail",
        "Égalité et diversité : égalité hommes-femmes, inclusion des personnes handicapées, diversité culturelle",
        "Formation et développement des compétences : investissement dans le capital humain",
        "Dialogue social : relations avec les représentants du personnel, négociations collectives",
        "Rémunération équitable : salaires justes, partage de la valeur",
        "Chaîne d'approvisionnement responsable : conditions de travail chez les fournisseurs",
        "Droits humains : prévention du travail forcé et du travail des enfants",
      ]},
      { type: "callout", variant: "info", title: "Indicateurs sociaux clés", text: "Les entreprises RSE suivent des indicateurs comme : le taux d'absentéisme, l'index d'égalité professionnelle (obligatoire en France depuis 2019 pour les entreprises de +50 salariés), le taux de fréquence des accidents du travail, le taux de formation." },
      { type: "heading", level: 3, text: "La QVCT (Qualité de Vie et des Conditions de Travail)" },
      { type: "paragraph", text: "La QVCT, renommée depuis 2020, désigne les actions qui permettent de concilier amélioration des conditions de travail des salariés et performance globale de l'entreprise." },
      { type: "sources", items: [
        { label: "Index d'égalité professionnelle — Ministère du Travail", url: "https://www.gouvernement.fr/action/l-index-de-l-egalite-professionnelle" },
        { label: "Qualité de Vie et Conditions de Travail (QVCT) — Anact", url: "https://www.anact.fr/quest-ce-que-la-qvct" },
      ]},
    ] as ContentBlock[],
  });

  const l2_2_2 = await insertLesson({
    moduleId: m2_2,
    title: "Le pilier Gouvernance : éthique et transparence",
    order: 2,
    type: "lesson",
    content: [
      { type: "heading", level: 2, text: "Le pilier Gouvernance (G)" },
      { type: "paragraph", text: "La gouvernance RSE désigne l'ensemble des règles, pratiques et processus par lesquels une entreprise est dirigée et contrôlée de manière éthique, transparente et responsable. Elle constitue la colonne vertébrale qui permet aux piliers E et S de se concrétiser." },
      { type: "heading", level: 3, text: "Les composantes de la gouvernance RSE" },
      { type: "table", headers: ["Composante", "Description"], rows: [
        ["Structure de gouvernance", "Composition et fonctionnement du conseil d'administration, comités spécialisés"],
        ["Transparence et reporting", "Publication d'informations fiables sur les performances ESG"],
        ["Lutte anti-corruption", "Politiques et contrôles internes pour prévenir la corruption"],
        ["Éthique des affaires", "Code de conduite, lanceurs d'alerte, due diligence"],
        ["Rémunération des dirigeants", "Lien entre rémunération et performance ESG"],
        ["Droits des actionnaires", "Engagement des actionnaires, vote aux assemblées"],
      ]},
      { type: "callout", variant: "important", title: "La loi Sapin 2 (2016)", text: "En France, la loi Sapin 2 impose aux entreprises de plus de 500 salariés et réalisant un CA de plus de 100 M€ de mettre en place un programme anti-corruption (code de conduite, cartographie des risques, formation, dispositif d'alerte, procédures de contrôle...)." },
      { type: "sources", items: [
        { label: "Loi Sapin 2 et programme anti-corruption — AFA (Agence Française Anticorruption)", url: "https://www.agence-francaise-anticorruption.gouv.fr/fr/la-loi-sapin-ii" },
        { label: "Gouvernance RSE : définition et enjeux — ESG Act", url: "https://www.esg-act.org/ressources/gouvernance-rse" },
      ]},
    ] as ContentBlock[],
  });

  await insertQuestion({ moduleId: m2_2, lessonId: l2_2_1, question: "Depuis quelle année l'index d'égalité professionnelle est-il obligatoire en France pour les entreprises de +50 salariés ?", type: "mcq", difficulty: "intermediaire", points: 2, order: 1, explanation: "L'index d'égalité professionnelle est obligatoire en France depuis 2019 pour les entreprises de plus de 50 salariés.", options: [{ text: "2015", isCorrect: false, order: 1 }, { text: "2017", isCorrect: false, order: 2 }, { text: "2019", isCorrect: true, order: 3 }, { text: "2022", isCorrect: false, order: 4 }] });
  await insertQuestion({ moduleId: m2_2, lessonId: l2_2_1, question: "Quel indicateur mesure spécifiquement la sécurité au travail ?", type: "mcq", difficulty: "debutant", points: 1, order: 2, explanation: "Le taux de fréquence des accidents du travail mesure le nombre d'accidents avec arrêt pour 1 million d'heures travaillées.", options: [{ text: "Le taux d'absentéisme", isCorrect: false, order: 1 }, { text: "L'index d'égalité professionnelle", isCorrect: false, order: 2 }, { text: "Le taux de fréquence des accidents du travail", isCorrect: true, order: 3 }, { text: "Le taux de turnover", isCorrect: false, order: 4 }] });
  await insertQuestion({ moduleId: m2_2, lessonId: l2_2_2, question: "Quelle loi française impose un programme anti-corruption aux entreprises de plus de 500 salariés ?", type: "mcq", difficulty: "intermediaire", points: 2, order: 3, explanation: "La loi Sapin 2 (2016) impose aux entreprises de plus de 500 salariés réalisant un CA de plus de 100 M€ de mettre en place un programme anti-corruption complet.", options: [{ text: "Loi NRE", isCorrect: false, order: 1 }, { text: "Loi PACTE", isCorrect: false, order: 2 }, { text: "Loi Sapin 2", isCorrect: true, order: 3 }, { text: "Loi Grenelle 2", isCorrect: false, order: 4 }] });
  await insertQuestion({ moduleId: m2_2, question: "Parmi ces enjeux, lequel appartient au pilier SOCIAL de la RSE ?", type: "mcq", difficulty: "debutant", points: 1, order: 4, explanation: "La diversité et l'inclusion appartiennent au pilier Social de la RSE.", options: [{ text: "La lutte contre la corruption", isCorrect: false, order: 1 }, { text: "La gestion du bilan carbone", isCorrect: false, order: 2 }, { text: "La diversité et l'inclusion en entreprise", isCorrect: true, order: 3 }, { text: "La transparence du reporting financier", isCorrect: false, order: 4 }] });
  await insertQuestion({ moduleId: m2_2, question: "Les 3 piliers de la RSE sont :", type: "mcq", difficulty: "debutant", points: 1, order: 5, explanation: "Les 3 piliers de la RSE correspondent aux 3 lettres de l'acronyme ESG : Environnemental, Social et Gouvernance.", options: [{ text: "Économique, Social, Environnemental", isCorrect: false, order: 1 }, { text: "Environnemental, Social, Gouvernance", isCorrect: true, order: 2 }, { text: "Éthique, Solidarité, Gouvernance", isCorrect: false, order: 3 }, { text: "Écologie, Société, Gouvernement", isCorrect: false, order: 4 }] });
  await insertQuestion({ moduleId: m2_2, question: "Qu'est-ce que la QVCT ?", type: "mcq", difficulty: "debutant", points: 1, order: 6, explanation: "La QVCT signifie 'Qualité de Vie et des Conditions de Travail'. Elle a remplacé la QVT en 2020.", options: [{ text: "Qualité et Valeurs des Contrats de Travail", isCorrect: false, order: 1 }, { text: "Qualité de Vie et des Conditions de Travail", isCorrect: true, order: 2 }, { text: "Quota et Valorisation des Compétences Transversales", isCorrect: false, order: 3 }, { text: "Qualité des Valeurs Culturelles de l'entreprise", isCorrect: false, order: 4 }] });
  await insertQuestion({ moduleId: m2_2, question: "La gouvernance RSE constitue quel élément par rapport aux piliers E et S ?", type: "mcq", difficulty: "intermediaire", points: 2, order: 7, explanation: "La gouvernance est la 'colonne vertébrale' de la RSE car elle crée les conditions qui permettent aux piliers environnemental et social de se concrétiser.", options: [{ text: "Un élément secondaire et optionnel", isCorrect: false, order: 1 }, { text: "La colonne vertébrale qui permet aux piliers E et S de se concrétiser", isCorrect: true, order: 2 }, { text: "Un pilier uniquement financier", isCorrect: false, order: 3 }, { text: "Une obligation uniquement pour les grandes entreprises", isCorrect: false, order: 4 }] });
  await insertQuestion({ moduleId: m2_2, question: "Quel est le seuil de salariés à partir duquel la loi Sapin 2 impose un programme anti-corruption ?", type: "mcq", difficulty: "intermediaire", points: 2, order: 8, explanation: "La loi Sapin 2 s'applique aux entreprises de plus de 500 salariés ET dont le CA est supérieur à 100 millions d'euros.", options: [{ text: "100 salariés", isCorrect: false, order: 1 }, { text: "250 salariés", isCorrect: false, order: 2 }, { text: "500 salariés", isCorrect: true, order: 3 }, { text: "1000 salariés", isCorrect: false, order: 4 }] });

  // ═══════════════════════════════════════════════════════════
  // SOUS-THÈME 3 : Normes et standards
  // ═══════════════════════════════════════════════════════════
  const st3 = await getOrCreateSubtheme({
    themeId,
    slug: "rse-normes",
    title: "Normes et standards RSE",
    description: "Tour d'horizon des principaux référentiels de reporting RSE : GRI, SASB, IFRS S1/S2 et leur complémentarité.",
    order: 3,
  });

  const m3_1 = await getOrCreateModule({
    subthemeId: st3,
    slug: "rse-gri-standards",
    title: "GRI Standards : le référentiel universel",
    description: "Les GRI Standards, le framework de reporting durabilité le plus adopté mondialement, et son articulation avec IFRS S1/S2.",
    order: 1,
    estimatedMinutes: 12,
    difficulty: "intermediaire",
  });

  const l3_1_1 = await insertLesson({
    moduleId: m3_1,
    title: "Présentation des GRI Standards",
    order: 1,
    type: "lesson",
    content: [
      { type: "heading", level: 2, text: "Qu'est-ce que le GRI ?" },
      { type: "paragraph", text: "Le GRI (Global Reporting Initiative) est une organisation internationale indépendante créée en 1997 qui a développé les standards de reporting sur la durabilité les plus largement utilisés au monde. Plus de 14 000 organisations dans plus de 90 pays utilisent les GRI Standards." },
      { type: "heading", level: 3, text: "Structure des GRI Standards" },
      { type: "list", style: "bullet", items: [
        "GRI 1 (Fondements) : explique les concepts clés et comment utiliser les standards",
        "GRI 2 (Informations générales) : informations sur l'organisation et ses pratiques de reporting",
        "GRI 3 (Sujets importants) : processus pour identifier les sujets importants",
        "Standards thématiques (GRI 200-400) : standards spécifiques sur les sujets économiques, environnementaux et sociaux",
        "Standards sectoriels : adaptations pour des secteurs spécifiques (pétrole et gaz, agriculture, mines...)",
      ]},
      { type: "callout", variant: "info", title: "Interopérabilité GRI-IFRS (2025)", text: "En 2025, le GSSB a accordé une équivalence à IFRS S2 pour les émissions de GES sous GRI 102 (standard climatique). Les organisations peuvent utiliser les divulgations IFRS S2 pour satisfaire les exigences GRI 102 relatives aux Scopes 1, 2 et 3." },
      { type: "sources", items: [
        { label: "GRI Standards 2025 — Practical guide for sustainability teams (Nexio Projects)", url: "https://nexioprojects.com/how-to-navigate-the-latest-gri-standards-in-2025/" },
        { label: "GRI 102 and IFRS S2 — Equivalence for GHG Emissions (IFRS Foundation, 2025)", url: "https://www.ifrs.org/news-and-events/news/2025/06/gri-102-ifrs-s2-reporting-and-equivalence/" },
        { label: "GRI — globalreporting.org", url: "https://www.globalreporting.org/" },
      ]},
    ] as ContentBlock[],
  });

  const l3_1_2 = await insertLesson({
    moduleId: m3_1,
    title: "SASB et IFRS S1/S2 : focus sur la matérialité financière",
    order: 2,
    type: "lesson",
    content: [
      { type: "heading", level: 2, text: "SASB : la matérialité par secteur" },
      { type: "paragraph", text: "Le SASB (Sustainability Accounting Standards Board) a développé des standards de reporting durabilité axés sur la matérialité financière. À la différence du GRI, le SASB se concentre sur les informations ESG financièrement significatives pour les investisseurs, organisées par secteur d'activité." },
      { type: "heading", level: 3, text: "IFRS S1 et S2 : la baseline mondiale" },
      { type: "paragraph", text: "Publiés en juin 2023 par l'ISSB (International Sustainability Standards Board), IFRS S1 et S2 constituent la nouvelle baseline mondiale pour le reporting durabilité :" },
      { type: "table", headers: ["Standard", "Périmètre", "Public cible"], rows: [
        ["IFRS S1", "Exigences générales sur la divulgation d'informations financières liées au développement durable", "Entreprises cotées et multinationales"],
        ["IFRS S2", "Divulgations sur le changement climatique (risques et opportunités)", "Toutes organisations exposées aux risques climatiques"],
      ]},
      { type: "callout", variant: "tip", title: "Complémentarité des standards", text: "GRI, SASB et IFRS S1/S2 sont complémentaires : GRI couvre les impacts sur la société (double matérialité), SASB et IFRS se concentrent sur les risques financiers (matérialité financière). Une entreprise peut utiliser GRI pour son rapport RSE et IFRS S1/S2 pour ses informations réglementaires." },
      { type: "sources", items: [
        { label: "Best ESG Framework for 2025: CSRD, GRI, SASB, TCFD & More — Ecoactive Tech", url: "https://ecoactivetech.com/choosing-esg-framework-2025-guide/" },
        { label: "IFRS S1 et S2 — IFRS Foundation", url: "https://www.ifrs.org/groups/international-sustainability-standards-board/" },
        { label: "SASB Standards — IFRS Foundation", url: "https://www.ifrs.org/groups/sustainability-accounting-standards-board/" },
      ]},
    ] as ContentBlock[],
  });

  await insertQuestion({ moduleId: m3_1, lessonId: l3_1_1, question: "Combien d'organisations utilisent les GRI Standards dans le monde ?", type: "mcq", difficulty: "debutant", points: 1, order: 1, explanation: "Plus de 14 000 organisations dans plus de 90 pays utilisent les GRI Standards.", options: [{ text: "Plus de 1 000", isCorrect: false, order: 1 }, { text: "Plus de 5 000", isCorrect: false, order: 2 }, { text: "Plus de 14 000", isCorrect: true, order: 3 }, { text: "Plus de 50 000", isCorrect: false, order: 4 }] });
  await insertQuestion({ moduleId: m3_1, lessonId: l3_1_1, question: "En quelle année a été créé le GRI ?", type: "mcq", difficulty: "debutant", points: 1, order: 2, explanation: "Le GRI a été créé en 1997 aux États-Unis.", options: [{ text: "1987", isCorrect: false, order: 1 }, { text: "1992", isCorrect: false, order: 2 }, { text: "1997", isCorrect: true, order: 3 }, { text: "2001", isCorrect: false, order: 4 }] });
  await insertQuestion({ moduleId: m3_1, lessonId: l3_1_2, question: "Quelle est la principale différence entre le GRI et le SASB ?", type: "mcq", difficulty: "intermediaire", points: 2, order: 3, explanation: "Le GRI couvre les impacts de l'organisation sur la société (double matérialité), tandis que le SASB se concentre sur la matérialité financière pour les investisseurs, par secteur.", options: [{ text: "Le GRI est certifiable, le SASB non", isCorrect: false, order: 1 }, { text: "Le GRI est gratuit, le SASB est payant", isCorrect: false, order: 2 }, { text: "Le GRI couvre tous les impacts, le SASB se concentre sur la matérialité financière par secteur", isCorrect: true, order: 3 }, { text: "Le GRI s'applique aux grandes entreprises, le SASB aux PME", isCorrect: false, order: 4 }] });
  await insertQuestion({ moduleId: m3_1, lessonId: l3_1_2, question: "Qui a publié les standards IFRS S1 et S2 ?", type: "mcq", difficulty: "intermediaire", points: 2, order: 4, explanation: "Les IFRS S1 et S2 ont été publiés en juin 2023 par l'ISSB (International Sustainability Standards Board).", options: [{ text: "Le GRI", isCorrect: false, order: 1 }, { text: "L'Union européenne", isCorrect: false, order: 2 }, { text: "L'ISSB (International Sustainability Standards Board)", isCorrect: true, order: 3 }, { text: "L'ISO", isCorrect: false, order: 4 }] });
  await insertQuestion({ moduleId: m3_1, question: "Quel standard IFRS se concentre spécifiquement sur le changement climatique ?", type: "mcq", difficulty: "intermediaire", points: 2, order: 5, explanation: "IFRS S2 est dédié aux divulgations spécifiques au changement climatique (risques physiques et risques de transition). IFRS S1 couvre les exigences générales.", options: [{ text: "IFRS S1", isCorrect: false, order: 1 }, { text: "IFRS S2", isCorrect: true, order: 2 }, { text: "IFRS S3", isCorrect: false, order: 3 }, { text: "Les deux IFRS S1 et S2", isCorrect: false, order: 4 }] });
  await insertQuestion({ moduleId: m3_1, question: "Les GRI Standards s'adressent à quel type d'organisations ?", type: "mcq", difficulty: "debutant", points: 1, order: 6, explanation: "Les GRI Standards s'adressent à tout type d'organisation : entreprises privées, organisations publiques, PME ou grandes entreprises, dans tous les secteurs.", options: [{ text: "Uniquement aux grandes entreprises cotées", isCorrect: false, order: 1 }, { text: "Uniquement aux entreprises industrielles", isCorrect: false, order: 2 }, { text: "À tout type d'organisation, quelle que soit sa taille ou son secteur", isCorrect: true, order: 3 }, { text: "Uniquement aux entreprises européennes", isCorrect: false, order: 4 }] });
  await insertQuestion({ moduleId: m3_1, question: "Quel GRI Standard définit les 'Informations générales' sur l'organisation ?", type: "mcq", difficulty: "avance", points: 3, order: 7, explanation: "GRI 2 (Informations générales) couvre les informations sur l'organisation : activités, gouvernance, stratégie, politiques, pratiques de reporting.", options: [{ text: "GRI 1", isCorrect: false, order: 1 }, { text: "GRI 2", isCorrect: true, order: 2 }, { text: "GRI 3", isCorrect: false, order: 3 }, { text: "GRI 200", isCorrect: false, order: 4 }] });
  await insertQuestion({ moduleId: m3_1, question: "Laquelle de ces affirmations sur GRI et IFRS S2 est vraie depuis 2025 ?", type: "mcq", difficulty: "avance", points: 3, order: 8, explanation: "Depuis 2025, le GSSB a accordé une équivalence à IFRS S2 pour les émissions de GES dans GRI 102. Les entreprises peuvent utiliser les divulgations IFRS S2 pour satisfaire les exigences GRI 102.", options: [{ text: "GRI a remplacé IFRS S2 pour le reporting climatique", isCorrect: false, order: 1 }, { text: "IFRS S2 est reconnu équivalent à GRI 102 pour les émissions GES", isCorrect: true, order: 2 }, { text: "GRI et IFRS S2 sont incompatibles", isCorrect: false, order: 3 }, { text: "IFRS S2 est devenu obligatoire pour tous les utilisateurs GRI", isCorrect: false, order: 4 }] });

  // ═══════════════════════════════════════════════════════════
  // SOUS-THÈME 4 : RSE en France — contexte réglementaire
  // ═══════════════════════════════════════════════════════════
  const st4 = await getOrCreateSubtheme({
    themeId,
    slug: "rse-france",
    title: "RSE en France : contexte réglementaire",
    description: "Le cadre législatif et réglementaire de la RSE en France : loi NRE, loi PACTE, DPEF, devoir de vigilance et transition vers la CSRD.",
    order: 4,
  });

  const m4_1 = await getOrCreateModule({
    subthemeId: st4,
    slug: "rse-loi-nre-pacte",
    title: "Loi NRE et loi PACTE",
    description: "Les deux lois fondatrices de la RSE en France : la loi NRE (2001) et la loi PACTE (2019).",
    order: 1,
    estimatedMinutes: 12,
    difficulty: "intermediaire",
  });

  const l4_1_1 = await insertLesson({
    moduleId: m4_1,
    title: "La loi NRE (2001) : premières obligations de reporting",
    order: 1,
    type: "regulatory_update",
    applicableYear: 2001,
    content: [
      { type: "heading", level: 2, text: "La loi NRE : acte de naissance du reporting extra-financier" },
      { type: "paragraph", text: "La loi sur les Nouvelles Régulations Économiques (NRE) du 15 mai 2001 a constitué une première mondiale en obligeant les entreprises cotées en bourse françaises à intégrer des informations sociales et environnementales dans leur rapport annuel." },
      { type: "regulatory_note", year: 2001, companySize: "large", text: "La loi NRE s'appliquait initialement aux seules sociétés anonymes cotées sur un marché réglementé. Elle imposait la publication de 43 indicateurs sociaux et environnementaux dans le rapport de gestion." },
      { type: "heading", level: 3, text: "Les apports de la loi Grenelle 2 (2010)" },
      { type: "paragraph", text: "La loi Grenelle 2 a renforcé la loi NRE en élargissant le périmètre (toutes les SA de plus de 500 salariés) et en ajoutant un volet sociétal. Elle a introduit l'obligation de vérification par un organisme tiers indépendant (OTI)." },
      { type: "callout", variant: "info", title: "Chronologie du reporting extra-financier en France", text: "2001 : loi NRE (cotées) → 2010 : loi Grenelle 2 (SA +500 salariés) → 2017 : transposition NFRD → DPEF → 2025-2028 : transition vers la CSRD." },
      { type: "sources", items: [
        { label: "RSE et loi PACTE : nouveau cadre légal — Études et Analyses (2025)", url: "https://www.etudes-et-analyses.com/blog/decryptage-economique/responsabilite-societale-entreprises-rse-loi-pacte-nouveau-cadre-legal-08-04-2025.html" },
        { label: "Lois et réglementations RSE — RSE Inside", url: "https://rse-inside.fr/ressource-rse/lois-et-reglementations-rse/" },
        { label: "Reporting extra-financier obligatoire 2025 — Climate Selectra", url: "https://climate.selectra.com/fr/entreprises/reglementations/reporting-extra-financier" },
      ]},
    ] as ContentBlock[],
  });

  const l4_1_2 = await insertLesson({
    moduleId: m4_1,
    title: "La loi PACTE (2019) : la raison d'être et la société à mission",
    order: 2,
    type: "regulatory_update",
    applicableYear: 2019,
    content: [
      { type: "heading", level: 2, text: "La loi PACTE : une révolution pour l'entreprise" },
      { type: "paragraph", text: "La loi PACTE (Plan d'Action pour la Croissance et la Transformation des Entreprises) du 22 mai 2019 a introduit deux innovations majeures dans le droit des sociétés français en matière de RSE :" },
      { type: "heading", level: 3, text: "1. La raison d'être" },
      { type: "paragraph", text: "La loi PACTE a modifié l'article 1835 du Code civil pour permettre à toute société d'inscrire dans ses statuts une 'raison d'être' : l'énoncé des principes dont la société se dote et pour le respect desquels elle entend affecter des moyens dans la réalisation de son activité." },
      { type: "heading", level: 3, text: "2. La société à mission" },
      { type: "paragraph", text: "La loi PACTE a créé le statut de 'société à mission' : une entreprise peut adopter ce statut si elle inscrit dans ses statuts une raison d'être et des objectifs sociaux et environnementaux. Elle doit alors désigner un comité de mission et soumettre sa mission à une vérification par un OTI tous les 2 ans." },
      { type: "table", headers: ["Critère", "Raison d'être", "Société à mission"], rows: [
        ["Démarche", "Volontaire", "Volontaire"],
        ["Statuts", "Inscription possible", "Inscription obligatoire"],
        ["Objectifs sociaux/environnementaux", "Non requis", "Obligatoires dans les statuts"],
        ["Comité de mission", "Non requis", "Obligatoire"],
        ["Vérification externe (OTI)", "Non requise", "Obligatoire tous les 2 ans"],
      ]},
      { type: "callout", variant: "tip", title: "Exemples de sociétés à mission", text: "Maif, Camif, Yves Rocher, La Poste... En 2024, plus de 2 000 entreprises françaises ont adopté le statut de société à mission." },
      { type: "sources", items: [
        { label: "Réglementation RSE entreprises — Altopi (sept. 2025)", url: "https://www.altopi.eco/blog-rse/reglementation-rse-entreprises" },
        { label: "RSE et loi PACTE — Études et Analyses (2025)", url: "https://www.etudes-et-analyses.com/blog/decryptage-economique/responsabilite-societale-entreprises-rse-loi-pacte-nouveau-cadre-legal-08-04-2025.html" },
        { label: "Société à mission — Ministère de l'Économie", url: "https://www.economie.gouv.fr/entreprises/societe-mission" },
      ]},
    ] as ContentBlock[],
  });

  await insertQuestion({ moduleId: m4_1, lessonId: l4_1_1, question: "La loi NRE de 2001 concernait initialement quelles entreprises ?", type: "mcq", difficulty: "intermediaire", points: 2, order: 1, explanation: "La loi NRE de 2001 s'appliquait aux sociétés anonymes cotées sur un marché réglementé.", options: [{ text: "Toutes les entreprises de plus de 250 salariés", isCorrect: false, order: 1 }, { text: "Les sociétés anonymes cotées en bourse", isCorrect: true, order: 2 }, { text: "Toutes les SA de plus de 500 salariés", isCorrect: false, order: 3 }, { text: "Les entreprises réalisant plus de 100M€ de CA", isCorrect: false, order: 4 }] });
  await insertQuestion({ moduleId: m4_1, lessonId: l4_1_2, question: "Quel texte législatif a créé le statut de 'société à mission' en France ?", type: "mcq", difficulty: "intermediaire", points: 2, order: 2, explanation: "La loi PACTE du 22 mai 2019 a créé le statut de société à mission.", options: [{ text: "Loi NRE (2001)", isCorrect: false, order: 1 }, { text: "Loi Grenelle 2 (2010)", isCorrect: false, order: 2 }, { text: "Loi PACTE (2019)", isCorrect: true, order: 3 }, { text: "Loi Sapin 2 (2016)", isCorrect: false, order: 4 }] });
  await insertQuestion({ moduleId: m4_1, lessonId: l4_1_2, question: "Pour adopter le statut de société à mission, une entreprise doit :", type: "mcq", difficulty: "intermediaire", points: 2, order: 3, explanation: "Pour obtenir le statut de société à mission : inscrire une raison d'être et des objectifs sociaux/environnementaux dans les statuts, désigner un comité de mission, faire vérifier par un OTI tous les 2 ans.", options: [{ text: "Uniquement inscrire une raison d'être dans ses statuts", isCorrect: false, order: 1 }, { text: "Inscrire des objectifs sociaux/environnementaux, créer un comité de mission et faire vérifier par un OTI", isCorrect: true, order: 2 }, { text: "Obtenir une certification ISO 26000", isCorrect: false, order: 3 }, { text: "Avoir au moins 500 salariés", isCorrect: false, order: 4 }] });
  await insertQuestion({ moduleId: m4_1, question: "Qu'est-ce qu'un OTI dans le contexte du reporting RSE en France ?", type: "mcq", difficulty: "intermediaire", points: 2, order: 4, explanation: "Un OTI (Organisme Tiers Indépendant) est chargé de vérifier les informations extra-financières publiées par les entreprises.", options: [{ text: "Un Objectif de Transition Industrielle", isCorrect: false, order: 1 }, { text: "Un Organisme Tiers Indépendant chargé de vérifier le reporting RSE", isCorrect: true, order: 2 }, { text: "Un Outil de Traçabilité Institutionnel", isCorrect: false, order: 3 }, { text: "Un bureau de l'ADEME", isCorrect: false, order: 4 }] });
  await insertQuestion({ moduleId: m4_1, question: "Quel article du Code civil a été modifié par la loi PACTE pour intégrer la notion de raison d'être ?", type: "mcq", difficulty: "avance", points: 3, order: 5, explanation: "La loi PACTE a modifié l'article 1835 du Code civil pour permettre aux sociétés d'inscrire une raison d'être dans leurs statuts.", options: [{ text: "Article 1832", isCorrect: false, order: 1 }, { text: "Article 1835", isCorrect: true, order: 2 }, { text: "Article 1844", isCorrect: false, order: 3 }, { text: "Article 2000", isCorrect: false, order: 4 }] });
  await insertQuestion({ moduleId: m4_1, question: "En 2024, combien d'entreprises françaises ont adopté le statut de société à mission ?", type: "mcq", difficulty: "intermediaire", points: 2, order: 6, explanation: "En 2024, plus de 2 000 entreprises françaises avaient adopté le statut de société à mission.", options: [{ text: "Moins de 100", isCorrect: false, order: 1 }, { text: "Environ 500", isCorrect: false, order: 2 }, { text: "Plus de 2 000", isCorrect: true, order: 3 }, { text: "Plus de 10 000", isCorrect: false, order: 4 }] });
  await insertQuestion({ moduleId: m4_1, question: "La loi Grenelle 2 a étendu l'obligation de reporting RSE à :", type: "mcq", difficulty: "intermediaire", points: 2, order: 7, explanation: "La loi Grenelle 2 de 2010 a élargi le périmètre de la loi NRE en incluant toutes les SA de plus de 500 salariés, cotées ou non.", options: [{ text: "Toutes les entreprises françaises", isCorrect: false, order: 1 }, { text: "Uniquement les entreprises de plus de 5 000 salariés", isCorrect: false, order: 2 }, { text: "Toutes les SA de plus de 500 salariés, cotées ou non", isCorrect: true, order: 3 }, { text: "Les entreprises cotées dans l'UE uniquement", isCorrect: false, order: 4 }] });
  await insertQuestion({ moduleId: m4_1, question: "Quel est le sigle NRE dans 'loi NRE' ?", type: "mcq", difficulty: "debutant", points: 1, order: 8, explanation: "NRE signifie 'Nouvelles Régulations Économiques'. La loi NRE du 15 mai 2001 a instauré l'obligation de reporting social et environnemental pour les entreprises cotées.", options: [{ text: "Normes de Responsabilité Environnementale", isCorrect: false, order: 1 }, { text: "Nouvelles Régulations Économiques", isCorrect: true, order: 2 }, { text: "Normes de Reporting Extra-financier", isCorrect: false, order: 3 }, { text: "Nouvelles Règles pour les Entreprises", isCorrect: false, order: 4 }] });

  // ═══════════════════════════════════════════════════════════
  // SOUS-THÈME 5 : RSE comme avantage concurrentiel
  // ═══════════════════════════════════════════════════════════
  const st5 = await getOrCreateSubtheme({
    themeId,
    slug: "rse-avantage",
    title: "RSE comme avantage concurrentiel",
    description: "Comment la RSE crée de la valeur business : performance financière, attractivité des talents, fidélisation clients et résilience organisationnelle.",
    order: 5,
  });

  const m5_1 = await getOrCreateModule({
    subthemeId: st5,
    slug: "rse-performance-business",
    title: "RSE et performance financière",
    description: "Les données et études qui démontrent le lien entre RSE et performance économique.",
    order: 1,
    estimatedMinutes: 10,
    difficulty: "intermediaire",
  });

  const l5_1_1 = await insertLesson({
    moduleId: m5_1,
    title: "Les bénéfices business de la RSE",
    order: 1,
    type: "lesson",
    content: [
      { type: "heading", level: 2, text: "RSE et création de valeur" },
      { type: "paragraph", text: "La RSE n'est pas uniquement une obligation morale ou réglementaire. De nombreuses études montrent qu'une démarche RSE bien intégrée crée de la valeur économique mesurable pour l'entreprise." },
      { type: "heading", level: 3, text: "Résultats des études clés" },
      { type: "list", style: "bullet", items: [
        "40% des entreprises RSE actives observent une augmentation de leur rentabilité",
        "78% constatent une stimulation de l'innovation",
        "80% notent une meilleure attractivité et un engagement accru des collaborateurs",
        "87% des consommateurs préfèrent acheter auprès d'entreprises responsables (Cone Communications)",
        "Les 'Reinventors' ESG ont augmenté leurs revenus de 15 points supplémentaires sur 2019-2022 (Accenture, juin 2024)",
      ]},
      { type: "callout", variant: "tip", title: "L'écart de valeur RSE", text: "Selon Accenture (2024), seulement 15% des entreprises utilisent leurs compétences ESG pour accélérer leur stratégie. L'écart de valeur entre les leaders RSE et les autres devrait atteindre 37 points de pourcentage d'ici 2026." },
      { type: "sources", items: [
        { label: "RSE et avantage concurrentiel : compliance vers compétitivité — Accenture (2024)", url: "https://www.accenture.com/fr-fr/insights/consulting/esg-reporting-compliance-competitive-advantage" },
        { label: "RSE Définition : avantages et stratégie 2025 — sanscravate.fr", url: "https://sanscravate.fr/rse-definition-entreprise/" },
      ]},
    ] as ContentBlock[],
  });

  const l5_1_2 = await insertLesson({
    moduleId: m5_1,
    title: "Attractivité des talents et fidélisation client",
    order: 2,
    type: "lesson",
    content: [
      { type: "heading", level: 2, text: "RSE et capital humain" },
      { type: "paragraph", text: "La RSE est devenue un facteur déterminant dans les décisions des talents, notamment chez les nouvelles générations (Millennials et Gen Z) pour qui l'engagement sociétal de leur employeur est une priorité." },
      { type: "list", style: "bullet", items: [
        "70% des jeunes diplômés refuseraient un emploi dans une entreprise aux mauvaises pratiques RSE",
        "Les entreprises reconnues pour leur RSE réduisent leur taux de turnover jusqu'à 25%",
        "Le label 'Great Place to Work' et les notations Glassdoor intègrent des critères RSE",
        "L'engagement des salariés est directement corrélé à la perception des valeurs de l'entreprise",
      ]},
      { type: "heading", level: 3, text: "RSE dans les appels d'offres" },
      { type: "paragraph", text: "La RSE est également un avantage concurrentiel dans les appels d'offres publics et privés. Le Code de la commande publique encourage la prise en compte de critères environnementaux et sociaux. Certains donneurs d'ordre imposent des questionnaires RSE à leurs fournisseurs via des plateformes comme EcoVadis (130 000+ entreprises évaluées dans 175 pays)." },
      { type: "callout", variant: "info", title: "EcoVadis", text: "EcoVadis est la principale plateforme mondiale d'évaluation RSE des chaînes d'approvisionnement. Plus de 130 000 entreprises dans 175 pays ont été évaluées." },
      { type: "sources", items: [
        { label: "EcoVadis — plateforme d'évaluation RSE fournisseurs", url: "https://ecovadis.com/fr/" },
        { label: "RSE et commande publique — Direction des Achats de l'État", url: "https://www.economie.gouv.fr/dae/achat-responsable" },
        { label: "RSE et attractivité — ANDRH", url: "https://andrh.fr/" },
      ]},
    ] as ContentBlock[],
  });

  await insertQuestion({ moduleId: m5_1, lessonId: l5_1_1, question: "Selon les études, quel pourcentage des entreprises RSE actives observent une augmentation de leur rentabilité ?", type: "mcq", difficulty: "debutant", points: 1, order: 1, explanation: "40% des entreprises ayant adopté une démarche RSE observent une augmentation de leur rentabilité.", options: [{ text: "15%", isCorrect: false, order: 1 }, { text: "40%", isCorrect: true, order: 2 }, { text: "65%", isCorrect: false, order: 3 }, { text: "90%", isCorrect: false, order: 4 }] });
  await insertQuestion({ moduleId: m5_1, lessonId: l5_1_2, question: "EcoVadis est une plateforme qui évalue quoi ?", type: "mcq", difficulty: "debutant", points: 1, order: 2, explanation: "EcoVadis est la principale plateforme mondiale d'évaluation RSE des chaînes d'approvisionnement.", options: [{ text: "La performance financière des entreprises", isCorrect: false, order: 1 }, { text: "La RSE des entreprises dans les chaînes d'approvisionnement", isCorrect: true, order: 2 }, { text: "La qualité des produits industriels", isCorrect: false, order: 3 }, { text: "Le bilan carbone uniquement", isCorrect: false, order: 4 }] });
  await insertQuestion({ moduleId: m5_1, lessonId: l5_1_2, question: "La RSE peut-elle être un critère dans les appels d'offres publics ?", type: "mcq", difficulty: "intermediaire", points: 2, order: 3, explanation: "Oui. Le Code de la commande publique encourage la prise en compte de critères environnementaux et sociaux dans les marchés publics.", options: [{ text: "Non, les appels d'offres publics sont uniquement basés sur le prix", isCorrect: false, order: 1 }, { text: "Oui, le Code de la commande publique encourage les critères RSE", isCorrect: true, order: 2 }, { text: "Oui, mais uniquement pour les marchés supérieurs à 5M€", isCorrect: false, order: 3 }, { text: "Non, c'est contraire aux règles européennes de la concurrence", isCorrect: false, order: 4 }] });
  await insertQuestion({ moduleId: m5_1, question: "Selon Accenture (2024), quel pourcentage d'entreprises utilisent leurs compétences ESG pour accélérer leur stratégie ?", type: "mcq", difficulty: "avance", points: 3, order: 4, explanation: "Selon Accenture, seulement 15% des entreprises utilisent leurs compétences ESG pour accélérer leur stratégie durable.", options: [{ text: "5%", isCorrect: false, order: 1 }, { text: "15%", isCorrect: true, order: 2 }, { text: "35%", isCorrect: false, order: 3 }, { text: "50%", isCorrect: false, order: 4 }] });
  await insertQuestion({ moduleId: m5_1, question: "Quel avantage concurrentiel la RSE procure-t-elle en matière de ressources humaines ?", type: "mcq", difficulty: "debutant", points: 1, order: 5, explanation: "La RSE améliore l'attractivité des talents, réduit le turnover et augmente l'engagement des salariés. 70% des jeunes diplômés refuseraient un emploi dans une entreprise aux mauvaises pratiques RSE.", options: [{ text: "Elle réduit les salaires moyens", isCorrect: false, order: 1 }, { text: "Elle améliore l'attractivité des talents et réduit le turnover", isCorrect: true, order: 2 }, { text: "Elle permet de remplacer les salariés par des machines", isCorrect: false, order: 3 }, { text: "Elle n'a aucun impact sur les ressources humaines", isCorrect: false, order: 4 }] });
  await insertQuestion({ moduleId: m5_1, question: "Selon Accenture, de combien de points les 'Reinventors' ESG ont-ils augmenté leurs revenus sur 2019-2022 ?", type: "mcq", difficulty: "avance", points: 3, order: 6, explanation: "Selon Accenture, les 'Reinventors' (entreprises RSE avancées) ont augmenté leurs revenus de 15 points de pourcentage supplémentaires sur 2019-2022.", options: [{ text: "5 points", isCorrect: false, order: 1 }, { text: "10 points", isCorrect: false, order: 2 }, { text: "15 points", isCorrect: true, order: 3 }, { text: "25 points", isCorrect: false, order: 4 }] });
  await insertQuestion({ moduleId: m5_1, question: "Combien d'entreprises ont été évaluées par EcoVadis dans le monde ?", type: "mcq", difficulty: "intermediaire", points: 2, order: 7, explanation: "Plus de 130 000 entreprises dans 175 pays ont été évaluées par EcoVadis.", options: [{ text: "Plus de 10 000", isCorrect: false, order: 1 }, { text: "Plus de 50 000", isCorrect: false, order: 2 }, { text: "Plus de 130 000", isCorrect: true, order: 3 }, { text: "Plus de 500 000", isCorrect: false, order: 4 }] });
  await insertQuestion({ moduleId: m5_1, question: "Les entreprises RSE réduisent leur taux de turnover jusqu'à :", type: "mcq", difficulty: "intermediaire", points: 2, order: 8, explanation: "Les entreprises reconnues pour leur engagement RSE réduisent leur taux de turnover jusqu'à 25%.", options: [{ text: "5%", isCorrect: false, order: 1 }, { text: "15%", isCorrect: false, order: 2 }, { text: "25%", isCorrect: true, order: 3 }, { text: "50%", isCorrect: false, order: 4 }] });

  // ═══════════════════════════════════════════════════════════
  // SOUS-THÈME 6 : ZEI et la RSE — ZEI est une plateforme SaaS ESG
  // ═══════════════════════════════════════════════════════════
  const st6 = await getOrCreateSubtheme({
    themeId,
    slug: "rse-zei",
    title: "ZEI et la RSE",
    description: "Découvrez ZEI, la plateforme SaaS ESG qui permet aux entreprises de piloter leur stratégie RSE, réaliser leur reporting CSRD et mesurer leur impact — avec 9 000+ entreprises utilisatrices.",
    order: 6,
  });

  const m6_1 = await getOrCreateModule({
    subthemeId: st6,
    slug: "zei-plateforme-esg",
    title: "ZEI : la plateforme ESG nouvelle génération",
    description: "Présentation de ZEI, son positionnement, ses fonctionnalités clés et comment elle accompagne les entreprises dans leur démarche RSE.",
    order: 1,
    estimatedMinutes: 10,
    difficulty: "debutant",
  });

  const l6_1_1 = await insertLesson({
    moduleId: m6_1,
    title: "Qu'est-ce que ZEI ?",
    order: 1,
    type: "zei_spotlight",
    content: [
      { type: "heading", level: 2, text: "ZEI : « La plateforme ESG qui fait rimer pilotage et impact »" },
      { type: "paragraph", text: "ZEI (zei-world.com) est une plateforme SaaS ESG française qui permet aux entreprises de centraliser leurs données ESG, de piloter leur stratégie de durabilité et de réaliser leurs reportings réglementaires. Elle s'adresse aussi bien aux PME qui démarrent leur démarche RSE qu'aux grandes entreprises soumises à des obligations complexes comme la CSRD." },
      { type: "callout", variant: "tip", title: "En chiffres", text: "9 000+ entreprises utilisatrices · 8 000 indicateurs clés en main · 200+ secteurs d'activité · 20 500+ dépendances de données intégrées · Compatible avec 100+ référentiels et standards du marché." },
      { type: "heading", level: 3, text: "Le positionnement de ZEI" },
      { type: "paragraph", text: "ZEI se positionne comme une plateforme à 360° qui couvre l'intégralité du cycle de gestion ESG : collecte de données, analyse et plans d'action, reporting automatisé, évaluation des fournisseurs, consolidation multi-entités." },
      { type: "table", headers: ["Usage", "Ce que ZEI permet"], rows: [
        ["Se lancer dans la RSE", "Score ESG Zei, recommandations sur-mesure, diagnostics structurés"],
        ["Répondre aux obligations réglementaires", "CSRD, DPEF, Taxonomie européenne, SFDR"],
        ["Piloter sa stratégie carbone", "Bilan GES (BEGES, GHG Protocol), trajectoire SBTi"],
        ["Réaliser son reporting CSRD", "ESRS, VSME, rapports automatisés"],
        ["Évaluer ses fournisseurs", "Questionnaires ESG, évaluation standard Zei ou sur-mesure"],
        ["Améliorer son portefeuille d'investissements", "Données ESG consolidées pour les investisseurs"],
      ]},
      { type: "heading", level: 3, text: "Reconnaissances et certifications" },
      { type: "list", style: "bullet", items: [
        "Soutenu par Bpifrance (Banque publique d'investissement)",
        "Certifié ISO 27001 (sécurité de l'information)",
        "Reconnu par l'ABC (Association pour la transition Bas Carbone)",
        "Membre de 'Friends of EFRAG' (European Financial Reporting Advisory Group)",
      ]},
      { type: "sources", items: [
        { label: "ZEI — La plateforme ESG qui fait rimer pilotage et impact", url: "https://zei-world.com/" },
      ]},
    ] as ContentBlock[],
  });

  const l6_1_2 = await insertLesson({
    moduleId: m6_1,
    title: "Les fonctionnalités clés de ZEI",
    order: 2,
    type: "zei_spotlight",
    content: [
      { type: "heading", level: 2, text: "Une gestion ESG à 360°" },
      { type: "paragraph", text: "ZEI couvre tous les processus ESG dans une plateforme unique, de la collecte au reporting, en passant par l'analyse et les plans d'action." },
      { type: "heading", level: 3, text: "Les 3 piliers fonctionnels de ZEI" },
      { type: "list", style: "bullet", items: [
        "Évaluer & Communiquer : identifiez vos impacts, centralisez votre RSE et communiquez votre ESG",
        "Piloter & Progresser : définissez vos plans d'actions, invitez vos contributeurs et progressez dans votre démarche",
        "Fédérer et Consolider : invitez vos fournisseurs et filiales, engagez-les et consolidez leurs données ESG",
      ]},
      { type: "heading", level: 3, text: "Les référentiels couverts par ZEI" },
      { type: "paragraph", text: "ZEI est compatible avec plus de 100 référentiels et standards, dont :" },
      { type: "list", style: "bullet", items: [
        "Réglementaires : CSRD/ESRS, DPEF, Taxonomie européenne, SFDR",
        "Carbone : BEGES (obligatoire pour les entreprises de +500 salariés), GHG Protocol, SBTi",
        "Volontaires : ISO 14001, ISO 26000, GRI, EcoVadis, B Corp, Clé verte, Numérique responsable",
        "Investissement : BRSR, TCFD, TNFD",
      ]},
      { type: "heading", level: 3, text: "Des clients de référence" },
      { type: "paragraph", text: "Parmi les 9 000+ entreprises utilisatrices de ZEI, on retrouve des acteurs variés :" },
      { type: "table", headers: ["Client", "Témoignage"], rows: [
        ["BPIfrance", "« Zei nous a permis de centraliser toutes nos données ESG, de couvrir un périmètre réglementaire complet. » — Estelle Gruson, Responsable RSE"],
        ["Ligue de Football Professionnel", "« Zei, c'est une plateforme intuitive qui centralise et harmonise nos données RSE. » — Mathilde Chamak, Cheffe de projet RSE"],
      ]},
      { type: "callout", variant: "info", title: "ESG Budget Checker & ESG Navigator", text: "ZEI propose deux outils gratuits : l'ESG Budget Checker pour estimer son budget RSE, et l'ESG Navigator pour faire le point sur ses démarches ESG et obligations réglementaires." },
      { type: "sources", items: [
        { label: "ZEI — Fonctionnalités et solutions ESG complètes", url: "https://zei-world.com/" },
        { label: "ZEI — Cas clients et témoignages", url: "https://zei-world.com/#clients" },
      ]},
    ] as ContentBlock[],
  });

  await insertQuestion({ moduleId: m6_1, lessonId: l6_1_1, question: "Qu'est-ce que ZEI (zei-world.com) ?", type: "mcq", difficulty: "debutant", points: 1, order: 1, explanation: "ZEI est une plateforme SaaS ESG française qui permet aux entreprises de centraliser leurs données ESG, piloter leur stratégie RSE et réaliser leurs reportings réglementaires.", options: [{ text: "Une agence de conseil en ressources humaines", isCorrect: false, order: 1 }, { text: "Une plateforme SaaS ESG pour piloter la stratégie RSE des entreprises", isCorrect: true, order: 2 }, { text: "Une entreprise de travail temporaire spécialisée RSE", isCorrect: false, order: 3 }, { text: "Un organisme de certification ISO 26000", isCorrect: false, order: 4 }] });
  await insertQuestion({ moduleId: m6_1, lessonId: l6_1_1, question: "Combien d'entreprises utilisent la plateforme ZEI ?", type: "mcq", difficulty: "debutant", points: 1, order: 2, explanation: "ZEI revendique plus de 9 000 entreprises utilisatrices dans de nombreux secteurs d'activité.", options: [{ text: "Plus de 500", isCorrect: false, order: 1 }, { text: "Plus de 2 000", isCorrect: false, order: 2 }, { text: "Plus de 9 000", isCorrect: true, order: 3 }, { text: "Plus de 50 000", isCorrect: false, order: 4 }] });
  await insertQuestion({ moduleId: m6_1, lessonId: l6_1_1, question: "Par quelle institution publique française ZEI est-il soutenu ?", type: "mcq", difficulty: "debutant", points: 1, order: 3, explanation: "ZEI est soutenu par Bpifrance (Banque Publique d'Investissement), ce qui témoigne de son ancrage dans l'écosystème des entreprises françaises innovantes.", options: [{ text: "La Caisse des Dépôts", isCorrect: false, order: 1 }, { text: "Bpifrance", isCorrect: true, order: 2 }, { text: "L'ADEME", isCorrect: false, order: 3 }, { text: "Le Ministère de la Transition Écologique", isCorrect: false, order: 4 }] });
  await insertQuestion({ moduleId: m6_1, lessonId: l6_1_2, question: "Combien de référentiels et standards ZEI supporte-t-il ?", type: "mcq", difficulty: "debutant", points: 1, order: 4, explanation: "ZEI est compatible avec plus de 100 référentiels et standards du marché : CSRD, DPEF, Taxonomie, GHG Protocol, EcoVadis, B Corp, ISO, etc.", options: [{ text: "Plus de 10", isCorrect: false, order: 1 }, { text: "Plus de 50", isCorrect: false, order: 2 }, { text: "Plus de 100", isCorrect: true, order: 3 }, { text: "Plus de 500", isCorrect: false, order: 4 }] });
  await insertQuestion({ moduleId: m6_1, lessonId: l6_1_2, question: "Quel outil ZEI permet d'estimer son budget RSE ?", type: "mcq", difficulty: "debutant", points: 1, order: 5, explanation: "L'ESG Budget Checker est l'outil gratuit de ZEI qui permet aux entreprises d'estimer leur budget RSE en fonction de leur contexte.", options: [{ text: "ESG Navigator", isCorrect: false, order: 1 }, { text: "ESG Budget Checker", isCorrect: true, order: 2 }, { text: "Score ESG Zei", isCorrect: false, order: 3 }, { text: "Gap Analysis Universelle", isCorrect: false, order: 4 }] });
  await insertQuestion({ moduleId: m6_1, question: "Quelle certification de sécurité ZEI a-t-il obtenue ?", type: "mcq", difficulty: "intermediaire", points: 2, order: 6, explanation: "ZEI est certifié ISO 27001, la norme internationale de référence pour la sécurité de l'information, garantissant la protection des données de ses clients.", options: [{ text: "ISO 9001 (qualité)", isCorrect: false, order: 1 }, { text: "ISO 14001 (environnement)", isCorrect: false, order: 2 }, { text: "ISO 27001 (sécurité de l'information)", isCorrect: true, order: 3 }, { text: "ISO 26000 (responsabilité sociétale)", isCorrect: false, order: 4 }] });
  await insertQuestion({ moduleId: m6_1, question: "Lequel de ces clients utilise ZEI pour sa gestion ESG ?", type: "mcq", difficulty: "debutant", points: 1, order: 7, explanation: "BPIfrance utilise ZEI pour centraliser ses données ESG et couvrir son périmètre réglementaire. ZEI accompagne également la LFP, Best Western, La Poste Immobilier, MAIF et Veepee, entre autres.", options: [{ text: "Google France", isCorrect: false, order: 1 }, { text: "BPIfrance", isCorrect: true, order: 2 }, { text: "Airbus", isCorrect: false, order: 3 }, { text: "SNCF", isCorrect: false, order: 4 }] });
  await insertQuestion({ moduleId: m6_1, question: "Que signifie l'acronyme ESRS dans le contexte du reporting CSRD supporté par ZEI ?", type: "mcq", difficulty: "intermediaire", points: 2, order: 8, explanation: "ESRS signifie European Sustainability Reporting Standards. Ce sont les standards de reporting de durabilité européens adoptés dans le cadre de la CSRD, que ZEI intègre dans sa plateforme.", options: [{ text: "European Social Responsibility Standards", isCorrect: false, order: 1 }, { text: "Environmental and Social Reporting System", isCorrect: false, order: 2 }, { text: "European Sustainability Reporting Standards", isCorrect: true, order: 3 }, { text: "ESG Scoring and Rating Standards", isCorrect: false, order: 4 }] });

  console.log("\n✅ Seed RSE terminé avec succès !\n");
  await sql.end();
}

seedRSE().catch((err) => {
  console.error("❌ Erreur lors du seed RSE :", err);
  process.exit(1);
});
