/**
 * Seed script — Thème CSRD complet (idempotent pour thème / sous-thèmes / modules)
 * Usage : npx tsx scripts/seed-csrd.ts
 * Reset : npx tsx scripts/seed-csrd.ts --reset
 *
 * Re-seed complet des leçons / questions : préférer --reset (comme seed-rse).
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
    .where(
      and(eq(quizSubthemes.themeId, data.themeId), eq(quizSubthemes.slug, data.slug))
    );
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
    .where(
      and(eq(quizModules.subthemeId, data.subthemeId), eq(quizModules.slug, data.slug))
    );
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

/** 2 leçons + 8 questions MCQ — lessonIdx 0 ou 1 pour lier la question à la leçon, null = sans lien */
async function seedModuleQuick(
  subthemeId: number,
  mod: {
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
  }
) {
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

async function moduleHasLessons(moduleId: number) {
  const r = await db
    .select({ id: quizLessons.id })
    .from(quizLessons)
    .where(eq(quizLessons.moduleId, moduleId))
    .limit(1);
  return r.length > 0;
}

async function seedCSRD() {
  const reset = process.argv.includes("--reset");

  if (reset) {
    console.log("\n🗑️  Mode reset : suppression du thème CSRD existant...");
    const existing = await db
      .select({ id: quizThemes.id })
      .from(quizThemes)
      .where(eq(quizThemes.slug, "csrd"));
    if (existing.length > 0) {
      await db.delete(quizThemes).where(eq(quizThemes.slug, "csrd"));
      console.log("  ✓  Thème CSRD supprimé (cascade)\n");
    } else {
      console.log("  (aucun thème CSRD trouvé)\n");
    }
  }

  console.log("🌱 Démarrage du seed CSRD...\n");

  const themeId = await getOrCreateTheme({
    slug: "csrd",
    title: "CSRD — Corporate Sustainability Reporting Directive",
    description:
      "Maîtrisez la directive européenne 2022/2464 : calendrier, périmètre, ESRS, double matérialité et risques pour votre reporting de durabilité.",
    icon: "FileText",
    color: "#6366f1",
    order: 2,
  });

  // ——— Sous-thèmes (6) ———
  const stIntro = await getOrCreateSubtheme({
    themeId,
    slug: "csrd-introduction",
    title: "Qu'est-ce que la CSRD ?",
    description:
      "Directive UE 2022/2464, remplacement de la NFRD, objectifs et principes du reporting de durabilité.",
    order: 1,
  });
  const stCal = await getOrCreateSubtheme({
    themeId,
    slug: "csrd-calendrier",
    title: "Calendrier d'application",
    description:
      "Phases d'entrée en vigueur pour les grands groupes, les PME cotées et les PME non cotées (2025–2029).",
    order: 2,
  });
  const stScope = await getOrCreateSubtheme({
    themeId,
    slug: "csrd-perimetre",
    title: "Entreprises concernées",
    description:
      "Seuils de taille, critères « deux sur trois », entreprises d'intérêt public et filiales.",
    order: 3,
  });
  const stEsrs = await getOrCreateSubtheme({
    themeId,
    slug: "csrd-esrs",
    title: "ESRS — European Sustainability Reporting Standards",
    description:
      "Structure des standards : exigences générales, disclosures transversaux et thématiques E / S / G.",
    order: 4,
  });
  const stDm = await getOrCreateSubtheme({
    themeId,
    slug: "csrd-double-materialite",
    title: "Double matérialité",
    description:
      "Matérialité d'impact et matérialité financière, analyse IRO et intégration dans le rapport.",
    order: 5,
  });
  const stSan = await getOrCreateSubtheme({
    themeId,
    slug: "csrd-sanctions",
    title: "Sanctions et risques",
    description:
      "Cadre de contrôle, responsabilité des dirigeants, amendes, contentieux et risque réputationnel.",
    order: 6,
  });
  const stVsme = await getOrCreateSubtheme({
    themeId,
    slug: "csrd-vsme-omnibus",
    title: "VSME, Omnibus et Value Chain Cap",
    description:
      "Le langage commun ESG européen porté par l'EFRAG : Omnibus de février 2025, modules VSME Basic / Complémentaire / Mid Cap / VSME+ et clause Value Chain Cap.",
    order: 7,
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Modules : 2 par sous-thème — leçons + 8 MCQ chacun
  // ═══════════════════════════════════════════════════════════════════════════

  // --- Introduction 1 & 2 (leçons + questions — skip si déjà présent)
  const m1 = await getOrCreateModule({
    subthemeId: stIntro,
    slug: "csrd-directive-fondamentaux",
    title: "Directive 2022/2464 et fin de la NFRD",
    description:
      "Texte juridique, articulation avec la NFRD et exigences générales de publication d'informations de durabilité.",
    order: 1,
    estimatedMinutes: 14,
    difficulty: "debutant",
  });

  if (!(await moduleHasLessons(m1))) {
  const l1a = await insertLesson({
    moduleId: m1,
    order: 1,
    type: "regulatory_update",
    applicableYear: 2025,
    companySize: "large",
    title: "De la NFRD à la CSRD",
    content: [
      {
        type: "heading",
        level: 2,
        text: "Directive (UE) 2022/2464 — CSRD",
      },
      {
        type: "paragraph",
        text:
          "La CSRD (Corporate Sustainability Reporting Directive) refond les obligations européennes d'information financière et non financière en intégrant des exigences détaillées sur le climat, l'environnement, le social et la gouvernance. Elle remplace et étend la directive NFRD (2014/95/UE).",
      },
      {
        type: "callout",
        variant: "info",
        title: "Point clé",
        text:
          "Les informations de durabilité doivent être publiées dans le rapport de gestion (ou équivalent) et, le cas échéant, faire l'objet d'une assurance conformément aux dispositions nationales et européennes.",
      },
      {
        type: "table",
        headers: ["Directive", "Objet principal"],
        rows: [
          ["NFRD (2014/95/UE)", "Publication d'informations non financières pour certaines grandes entreprises"],
          ["CSRD (2022/2464)", "Reporting élargi, standards ESRS, audit/assurance renforcés, périmètre étendu"],
        ],
      },
      {
        type: "callout",
        variant: "tip",
        title: "Vu par ZEI",
        text:
          "La CSRD, c'est près de 1 700 indicateurs et plus de 4 200 points de données XBRL. En moyenne, 70 % des données demandées sont narratives (qualitatives) et 30 % quantitatives — c'est cette partie quantitative, nouvelle, qui mobilise la majorité de la bande passante des entreprises soumises (consolidation par filiale, par fournisseur, par matière). Source : ZEI — En Bref 5.",
      },
      {
        type: "sources",
        items: [
          {
            label: "Directive (UE) 2022/2464 — texte consolidé (EUR-Lex)",
            url: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32022L2464",
          },
          {
            label: "Commission européenne — Corporate sustainability reporting",
            url: "https://finance.ec.europa.eu/capital-markets-union-and-financial-markets/company-reporting-and-auditing/company-reporting/corporate-sustainability-reporting_en",
          },
          {
            label: "ZEI — En Bref 5 : CSRD, ce que vous devez comprendre (PDF)",
            url: "https://4495458.fs1.hubspotusercontent-na1.net/hubfs/4495458/En%20bref/En%20Bref%205%20-%20CSRD%2c%20ce%20que%20vous%20devez%20comprendre%20avant%20vos%20concurrents%20pour%20rester%20comp%C3%A9titifs%20-%20Zei.pdf",
          },
        ],
      },
    ] as ContentBlock[],
  });
  const l1b = await insertLesson({
    moduleId: m1,
    order: 2,
    type: "lesson",
    title: "Objectifs et cohérence avec le Green Deal",
    content: [
      {
        type: "heading",
        level: 2,
        text: "Pourquoi la CSRD ?",
      },
      {
        type: "list",
        style: "bullet",
        items: [
          "Accroître la comparabilité des données ESG entre entreprises européennes",
          "Répondre aux besoins des investisseurs et des parties prenantes sur les risques et opportunités de durabilité",
          "Aligner le reporting avec les objectifs climatiques et environnementaux de l'UE",
        ],
      },
      {
        type: "regulatory_note",
        year: 2026,
        companySize: "all",
        text:
          "Les modalités précises d'application (calendrier par catégorie d'entreprise) ont fait l'objet d'ajustements législatifs — vérifiez toujours la transposition nationale et les actes délégués en vigueur pour votre exercice.",
      },
      {
        type: "sources",
        items: [
          {
            label: "European Commission — Sustainable finance (CSRD context)",
            url: "https://finance.ec.europa.eu/sustainable-finance_en",
          },
          {
            label: "EFRAG — Sustainability reporting",
            url: "https://www.efrag.org/en/projects/sustainability-reporting",
          },
        ],
      },
    ] as ContentBlock[],
  });
  let o = 1;
  await insertMcq({
    moduleId: m1,
    lessonId: l1a,
    order: o++,
    question: "Quel texte la CSRD remplace-t-elle principalement ?",
    explanation: "La CSRD remplace et étend la directive NFRD sur le reporting extra-financier.",
    difficulty: "debutant",
    points: 1,
    correct: "La directive NFRD (2014/95/UE)",
    wrong: ["La directive Sapin II", "Le règlement SFDR uniquement", "La directive IA"],
  });
  await insertMcq({
    moduleId: m1,
    lessonId: l1a,
    order: o++,
    question: "En quelle année la directive CSRD a-t-elle été adoptée au niveau européen ?",
    explanation: "La directive (UE) 2022/2464 a été adoptée en 2022.",
    difficulty: "debutant",
    points: 1,
    correct: "2022",
    wrong: ["2014", "2019", "2025"],
  });
  await insertMcq({
    moduleId: m1,
    lessonId: l1a,
    order: o++,
    question: "Les informations de durabilité doivent-elles être intégrées au rapport de gestion ?",
    explanation: "La CSRD exige que les informations soient fournies dans le cadre du rapport annuel (rapport de gestion ou équivalent selon le droit national).",
    difficulty: "intermediaire",
    points: 2,
    correct: "Oui, dans le cadre du rapport annuel / rapport de gestion",
    wrong: [
      "Non, uniquement sur un site web séparé",
      "Uniquement si l'entreprise est cotée",
      "Uniquement pour les filiales hors UE",
    ],
  });
  await insertMcq({
    moduleId: m1,
    lessonId: l1b,
    order: o++,
    question: "Un objectif majeur de la CSRD est :",
    explanation: "La comparabilité des informations pour les utilisateurs (investisseurs, autorités, citoyens) est un pilier de la réforme.",
    difficulty: "debutant",
    points: 1,
    correct: "Améliorer la comparabilité et la fiabilité des informations de durabilité",
    wrong: [
      "Supprimer tout reporting financier",
      "Interdire les investissements durables",
      "Harmoniser uniquement les salaires en Europe",
    ],
  });
  await insertMcq({
    moduleId: m1,
    order: o++,
    question: "Le Green Deal européen est lié à la CSRD par :",
    explanation: "Le reporting de durabilité soutient la transition et la transparence sur les impacts environnementaux et sociaux.",
    difficulty: "intermediaire",
    points: 2,
    correct: "La nécessité d'orienter les capitaux et la transparence vers la transition durable",
    wrong: [
      "L'interdiction du nucléaire dans tous les États membres",
      "La fusion des États membres en une seule entité fiscale",
      "La suppression du marché carbone européen",
    ],
  });
  await insertMcq({
    moduleId: m1,
    order: o++,
    question: "La CSRD s'applique uniquement aux entreprises tech.",
    explanation: "Faux. Le périmètre couvre de nombreuses catégories d'entreprises selon des critères de taille, de cotation et de forme juridique.",
    difficulty: "debutant",
    points: 1,
    correct: "Faux",
    wrong: ["Vrai", "Vrai pour les PME seulement", "Vrai hors Union européenne"],
  });
  await insertMcq({
    moduleId: m1,
    order: o++,
    question: "EFRAG a un rôle clé dans la CSRD car :",
    explanation: "EFRAG a contribué au développement des standards ESRS repris dans le cadre réglementaire européen.",
    difficulty: "intermediaire",
    points: 2,
    correct: "Il a développé des propositions de standards de reporting repris dans les ESRS",
    wrong: [
      "Il fixe les taux d'imposition des entreprises",
      "Il remplace la Commission sur les amendes",
      "Il certifie ISO 14001 pour toutes les PME",
    ],
  });
  await insertMcq({
    moduleId: m1,
    order: o++,
    question: "La NFRD concernait déjà :",
    explanation: "La NFRD visait notamment certaines grandes entreprises et entités d'intérêt public pour des informations non financières.",
    difficulty: "debutant",
    points: 1,
    correct: "Certaines grandes entreprises et entités d'intérêt public",
    wrong: [
      "Uniquement les micro-entreprises",
      "Uniquement les banques centrales",
      "Aucune entreprise européenne",
    ],
  });
  await insertMcq({
    moduleId: m1,
    lessonId: l1a,
    order: o++,
    question: "Selon ZEI, combien de points de données XBRL la CSRD comporte-t-elle environ ?",
    explanation:
      "La CSRD compte près de 1 700 indicateurs et plus de 4 200 points de données XBRL (source : ZEI — En Bref 5).",
    difficulty: "intermediaire",
    points: 2,
    correct: "Plus de 4 200",
    wrong: ["Environ 200", "Environ 1 200", "Plus de 50 000"],
  });

  } else {
    console.log("      ↩  Modules intro CSRD déjà seedés (m1) — skip questions m1");
  }

  // Introduction 2
  const m2 = await getOrCreateModule({
    subthemeId: stIntro,
    slug: "csrd-assurance-audit",
    title: "Assurance, audit et gouvernance de l'information",
    description:
      "Exigences d'assurance sur les informations de durabilité, rôle des commissaires aux comptes et gouvernance.",
    order: 2,
    estimatedMinutes: 12,
    difficulty: "intermediaire",
  });

  if (!(await moduleHasLessons(m2))) {
  const l2a = await insertLesson({
    moduleId: m2,
    order: 1,
    type: "lesson",
    title: "Niveaux d'assurance et contrôle interne",
    content: [
      { type: "heading", level: 2, text: "Assurance des informations de durabilité" },
      {
        type: "paragraph",
        text:
          "La CSRD prévoit une trajectoire d'assurance (limited assurance puis raisonnable selon les étapes) sur les informations de durabilité publiées, afin d'en renforcer la fiabilité pour le marché.",
      },
      {
        type: "callout",
        variant: "warning",
        title: "Organisation interne",
        text:
          "Les entreprises doivent renforcer leurs contrôles internes, la documentation des données ESG et la supervision des processus (gouvernance, IT, collecte fournisseurs).",
      },
      {
        type: "sources",
        items: [
          {
            label: "Commission européenne — FAQ sustainability reporting",
            url: "https://finance.ec.europa.eu/capital-markets-union-and-financial-markets/company-reporting-and-auditing/company-reporting/corporate-sustainability-reporting_en",
          },
        ],
      },
    ] as ContentBlock[],
  });
  const l2b = await insertLesson({
    moduleId: m2,
    order: 2,
    type: "lesson",
    title: "Conseil d'administration et données ESG",
    content: [
      { type: "heading", level: 2, text: "Responsabilité des organes de gouvernance" },
      {
        type: "paragraph",
        text:
          "Les dirigeants sont impliqués dans la validation des informations et la cohérence avec la stratégie ; la chaîne de contrôle doit couvrir les risques de greenwashing et d'erreurs matérielles.",
      },
      {
        type: "sources",
        items: [
          {
            label: "ESRS — Portail officiel (Commission européenne)",
            url: "https://www.esrs.europa.eu/",
          },
        ],
      },
    ] as ContentBlock[],
  });
  let o = 1;
  for (const [q, e, c, w, pts, diff] of [
    [
      "La CSRD vise à renforcer la fiabilité des informations de durabilité notamment via :",
      "L'assurance sur le reporting de durabilité est un pilier de la directive.",
      "L'assurance des informations de durabilité selon une trajectoire progressive",
      ["La suppression des audits financiers", "L'interdiction du reporting extra-financier", "La nationalisation des entreprises"],
      2,
      "intermediaire",
    ],
    [
      "Le greenwashing dans le rapport de durabilité expose l'entreprise à :",
      "Les informations trompeuses peuvent entraîner sanctions, litiges et perte de confiance.",
      "Des risques juridiques, réputationnels et de marché",
      ["Aucun risque si le logo est vert", "Uniquement une amende de 1 €", "Une prime automatique de l'État"],
      2,
      "debutant",
    ],
    [
      "Les ESRS structurent principalement :",
      "Les ESRS définissent les exigences de contenu pour le reporting.",
      "Le contenu et les métriques du rapport de durabilité",
      ["Les salaires minimaux nationaux", "Les taux de TVA", "Les conventions bancaires privées"],
      1,
      "debutant",
    ],
    [
      "La gouvernance doit superviser :",
      "La qualité des données et la cohérence avec la stratégie relèvent de la gouvernance.",
      "La qualité des données ESG et la documentation sous-jacente",
      ["Uniquement le menu de la cantine", "Les congés payés uniquement", "Les couleurs du logo"],
      1,
      "debutant",
    ],
    [
      "L'assurance raisonnable (reasonable assurance) est plus stricte que l'assurance limitée.",
      "L'assurance raisonnable implique davantage de preuves et de procédures que l'assurance limitée.",
      "Vrai",
      ["Faux", "Les deux sont identiques", "N'existe pas en Europe"],
      2,
      "intermediaire",
    ],
    [
      "Un contrôle interne efficace sur les données carbone nécessite :",
      "Traçabilité, réconciliation et contrôles d'accès sont des bonnes pratiques.",
      "Des procédures documentées et des contrôles sur les sources de données",
      ["Aucune donnée quantitative", "Uniquement des photos", "Un seul tableur sans sauvegarde"],
      2,
      "intermediaire",
    ],
    [
      "Les dirigeants peuvent être tenus responsables en cas d'information erronée matérielle.",
      "Les mécanismes de gouvernance et de certification visent aussi la responsabilité des organes sociaux.",
      "Vrai",
      ["Faux", "Uniquement en dehors de l'UE", "Jamais pour le reporting durable"],
      1,
      "debutant",
    ],
    [
      "Le site esrs.europa.eu sert notamment à :",
      "Le portail officiel agrège les textes et ressources sur les ESRS.",
      "Accéder aux informations officielles sur les standards de reporting européens",
      ["Réserver des vols", "Publier des bilans fiscaux nationaux", "Gérer les aides PAC agricoles"],
      1,
      "debutant",
    ],
  ] as const) {
    await insertMcq({
      moduleId: m2,
      lessonId: o <= 4 ? l2a : l2b,
      order: o++,
      question: q,
      explanation: e,
      correct: c,
      wrong: w as unknown as [string, string, string],
      points: pts,
      difficulty: diff as "debutant" | "intermediaire" | "avance",
    });
  }

  } else {
    console.log("      ↩  Module intro CSRD déjà seedé (m2) — skip");
  }

  // ——— Calendrier (2 modules) ———
  await seedModuleQuick(stCal, {
    slug: "csrd-vagues-calendrier",
    title: "Vagues d'application et dates de publication",
    description:
      "Grandes entreprises, capital-markets entities, PME cotées : comprendre les exercices concernés et les reports annuels.",
    order: 1,
    estimatedMinutes: 13,
    difficulty: "intermediaire",
    lesson1Title: "2025–2029 : qui publie quand ?",
    lesson1Content: [
      { type: "heading", level: 2, text: "Phased implementation" },
      {
        type: "paragraph",
        text:
          "La CSRD s'applique par vagues : d'abord les grandes entreprises déjà soumises à la NFRD (exercices ouverts à partir du 1er janvier 2024 pour publication en 2025), puis d'autres grandes entreprises répondant aux critères de taille, ensuite les PME cotées (sauf micro-entreprises), puis des catégories supplémentaires selon le calendrier politique et législatif.",
      },
      {
        type: "table",
        headers: ["Catégorie indicative", "Illustration de calendrier"],
        rows: [
          ["Très grandes entreprises / déjà NFRD", "Premiers rapports CSRD complets (selon transposition)"],
          ["Autres grandes entreprises (2/3 critères)", "Entrée décalée d'une vague par rapport à la première"],
          ["PME cotées", "Vague ultérieure ; possibilité d'exemption temporaire"],
        ],
      },
      {
        type: "callout",
        variant: "warning",
        title: "Évolutions législatives",
        text:
          "Le calendrier a pu être ajusté (reports « stop-the-clock »). Vérifiez toujours le Journal officiel de l'UE et la transposition nationale pour votre périmètre exact.",
      },
      {
        type: "callout",
        variant: "tip",
        title: "Vu par ZEI",
        text:
          "L'Omnibus de février 2025 marque un tournant : derrière les ajustements de calendrier CSRD, il introduit la « Value Chain Cap » qui impose à tout questionnaire fournisseur ou bancaire d'être aligné sur la VSME. Le langage ESG européen converge — y compris pour les entreprises qui ne reporteront pas en direct. Source : ZEI — La VSME expliquée.",
      },
      {
        type: "sources",
        items: [
          {
            label: "Commission européenne — Corporate sustainability reporting",
            url: "https://finance.ec.europa.eu/capital-markets-union-and-financial-markets/company-reporting-and-auditing/company-reporting/corporate-sustainability-reporting_en",
          },
          {
            label: "Dcycle — CSRD calendar and deadlines (overview)",
            url: "https://www.dcycle.io/blog/csrd-calendar",
          },
          {
            label: "ZEI — La VSME expliquée : le nouveau langage commun de la donnée ESG (PDF)",
            url: "https://4495458.fs1.hubspotusercontent-na1.net/hubfs/4495458/Livres%20blancs/Zei%20-%20La%20VSME%20expliqu%C3%A9e%20-%20Le%20nouveau%20langage%20commun%20de%20la%20donn%C3%A9es%20ESG%20en%20Europe.pdf",
          },
        ],
      },
    ] as ContentBlock[],
    lesson2Title: "PME cotées et reports différés",
    lesson2Content: [
      { type: "heading", level: 2, text: "Allègements pour certaines PME" },
      {
        type: "paragraph",
        text:
          "Les PME cotées peuvent bénéficier de standards simplifiés (LSME-ESRS) et, dans certains cas, d'un report d'application pour limiter la charge au démarrage.",
      },
      {
        type: "sources",
        items: [
          {
            label: "EFRAG — ESRS for listed SMEs",
            url: "https://www.efrag.org/en/projects/sustainability-reporting",
          },
        ],
      },
    ] as ContentBlock[],
    questions: [
      {
        question: "La CSRD introduit une application :",
        explanation: "L'application est échelonnée par catégories d'entreprises.",
        correct: "Par vagues successives selon la taille et le statut boursier",
        wrong: ["En un jour unique pour toute l'UE", "Uniquement après 2035", "Uniquement pour les entreprises américaines"],
        points: 1,
        difficulty: "debutant",
        lessonIdx: 0,
      },
      {
        question: "Les premières entités historiquement sous NFRD ont généralement précédé :",
        explanation: "La première vague inclut souvent les grandes entreprises déjà soumises à la NFRD.",
        correct: "Les autres grandes entreprises soumises aux critères CSRD",
        wrong: ["Les micro-entreprises", "Les particuliers", "Les associations sans employé"],
        points: 2,
        difficulty: "intermediaire",
        lessonIdx: 0,
      },
      {
        question: "Les PME cotées peuvent :",
        explanation: "Des mécanismes de report et des standards allégés existent pour les PME.",
        correct: "Utiliser des standards simplifiés et/ou un report selon les conditions",
        wrong: ["Être automatiquement exemptées pour toujours", "Ne jamais publier d'information", "Être assimilées aux micro-entreprises sans condition"],
        points: 2,
        difficulty: "intermediaire",
        lessonIdx: 1,
      },
      {
        question: "Le calendrier CSRD peut être modifié par de nouveaux actes législatifs.",
        explanation: "Les reports législatifs peuvent décaler certaines échéances.",
        correct: "Vrai",
        wrong: ["Faux", "Uniquement par vote municipal", "Jamais"],
        points: 1,
        difficulty: "debutant",
        lessonIdx: 0,
      },
      {
        question: "Un exercice ouvert au 1er janvier 2025 se rapporte à :",
        explanation: "Le rapport porte généralement sur l'exercice civil ou fiscal défini par l'entité.",
        correct: "La période de 12 mois suivant la clôture comptable de l'entité",
        wrong: ["Uniquement le mois de janvier", "Les 10 dernières années", "Uniquement le trimestre T1"],
        points: 2,
        difficulty: "intermediaire",
        lessonIdx: 0,
      },
      {
        question: "Les entreprises non cotées hors critères de taille sont souvent :",
        explanation: "Le périmètre CSRD cible d'abord les grandes entreprises et PME cotées.",
        correct: "Hors champ dans un premier temps (selon critères)",
        wrong: ["Toujours incluses dès 2020", "Jamais concernées par la RSE", "Uniquement si elles importent du café"],
        points: 1,
        difficulty: "debutant",
        lessonIdx: 1,
      },
      {
        question: "Le rapport de durabilité est publié :",
        explanation: "Il fait partie du rapport annuel / de gestion.",
        correct: "Avec le rapport annuel dans le même délai légal",
        wrong: ["10 ans après la clôture", "Uniquement sur TikTok", "Uniquement en anglais américain"],
        points: 1,
        difficulty: "debutant",
        lessonIdx: 1,
      },
      {
        question: "Les filiales peuvent être concernées via :",
        explanation: "La consolidation peut inclure des filiales dans le périmètre du groupe.",
        correct: "Les règles de consolidation du groupe",
        wrong: ["Uniquement si la filiale a un chat", "Jamais", "Uniquement les filiales lunaires"],
        points: 2,
        difficulty: "intermediaire",
        lessonIdx: null,
      },
      {
        question: "Selon ZEI, quand l'Omnibus européen impactant la CSRD a-t-il été adopté ?",
        explanation:
          "L'Omnibus a été adopté en février 2025 et introduit notamment la Value Chain Cap (source : ZEI — La VSME expliquée).",
        correct: "Février 2025",
        wrong: ["Janvier 2022", "Décembre 2023", "Septembre 2027"],
        points: 2,
        difficulty: "intermediaire",
        lessonIdx: 0,
      },
    ],
  });

  await seedModuleQuick(stCal, {
    slug: "csrd-horizons-2026-2028",
    title: "Horizons 2026 et 2028 pour les PME",
    description:
      "Lire le calendrier politique : PME cotées, reports optionnels jusqu'à 2028 pour certaines catégories.",
    order: 2,
    estimatedMinutes: 11,
    difficulty: "debutant",
    lesson1Title: "2026 : élargissement du périmètre",
    lesson1Content: [
      {
        type: "paragraph",
        text:
          "Les formations et matériels pédagogiques citent souvent 2026 pour l'entrée des PME cotées (hors micro) et 2028 pour des catégories de PME non cotées soumises à certains critères — utilisez toujours la réglementation consolidée.",
      },
      {
        type: "sources",
        items: [
          {
            label: "Emistra — CSRD deadlines by phase",
            url: "https://www.emistra.io/blog/csrd-deadlines-2025-2028-which-phase-applies",
          },
        ],
      },
    ] as ContentBlock[],
    lesson2Title: "Suivre les ajustements nationaux",
    lesson2Content: [
      {
        type: "paragraph",
        text:
          "Chaque État membre transpose la directive : les autorités nationales (AMF en France, etc.) précisent modalités et sanctions.",
      },
      {
        type: "sources",
        items: [
          {
            label: "EUR-Lex — Directive 2022/2464",
            url: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32022L2464",
          },
        ],
      },
    ] as ContentBlock[],
    questions: [
      {
        question: "Les PME cotées sont généralement concernées :",
        explanation: "Après les grandes entreprises, une vague cible les PME cotées.",
        correct: "Dans une vague ultérieure aux très grandes entreprises",
        wrong: ["Avant toute grande entreprise", "Jamais", "Uniquement si elles sont américaines"],
        points: 1,
        difficulty: "debutant",
        lessonIdx: 0,
      },
      {
        question: "Un report d'application peut concerner :",
        explanation: "Certaines PME peuvent reporter pour alléger la charge.",
        correct: "Certaines catégories de PME pendant une période transitoire",
        wrong: ["Toutes les entreprises pour 50 ans", "Personne", "Uniquement les ONG"],
        points: 2,
        difficulty: "intermediaire",
        lessonIdx: 0,
      },
      {
        question: "La transposition nationale est importante car :",
        explanation: "Les sanctions et modalités peuvent varier selon les États membres dans le cadre européen.",
        correct: "Elle précise contrôles, formats et calendriers locaux",
        wrong: ["Elle supprime la CSRD", "Elle n'existe pas", "Elle remplace les ESRS par du ISO 9001"],
        points: 2,
        difficulty: "intermediaire",
        lessonIdx: 1,
      },
      {
        question: "2028 apparaît souvent dans les guides pour :",
        explanation: "Les fiches pédagogiques mentionnent l'extension aux PME non cotées répondant aux critères.",
        correct: "L'extension progressive à d'autres catégories d'entreprises",
        wrong: ["La fin du climat sur Terre", "L'interdiction du reporting", "Le lancement de la NFRD"],
        points: 1,
        difficulty: "debutant",
        lessonIdx: 0,
      },
      {
        question: "L'AMF en France peut :",
        explanation: "Les autorités de marché communiquent sur les attentes en matière d'information.",
        correct: "Publier des guides et Q&A pour les émetteurs",
        wrong: ["Supprimer la loi européenne", "Remplacer la Commission européenne", "Interdire tout investissement"],
        points: 1,
        difficulty: "debutant",
        lessonIdx: 1,
      },
      {
        question: "Les micro-entreprises cotées sont souvent :",
        explanation: "La directive exclut souvent les micro-entreprises de certaines obligations.",
        correct: "Exclues ou traitées à part selon la définition comptable",
        wrong: ["Toujours les premières concernées", "Assimilées aux multinationales", "Non définies"],
        points: 2,
        difficulty: "intermediaire",
        lessonIdx: null,
      },
      {
        question: "Un calendrier de compliance doit être :",
        explanation: "Gouvernance de projet et veille réglementaire sont essentiels.",
        correct: "Révisé lors des changements législatifs",
        wrong: ["Gravé dans le marbre une fois pour toutes", "Ignoré par la direction", "Confié uniquement au stagiaire"],
        points: 1,
        difficulty: "debutant",
        lessonIdx: null,
      },
      {
        question: "Les grandes entreprises hors UE avec activité en UE peuvent :",
        explanation: "Des règles spécifiques existent pour les entreprises tierces (groupes non européens).",
        correct: "Être soumises à des obligations selon le règlement délégué sur les entreprises tierces",
        wrong: ["Toujours être exemptées", "Ne jamais publier", "Uniquement si elles vendent du fromage"],
        points: 3,
        difficulty: "avance",
        lessonIdx: null,
      },
    ],
  });

  // ——— Périmètre entreprises (2 modules) ———
  await seedModuleQuick(stScope, {
    slug: "csrd-seuils-criteres",
    title: "Seuils : 500 salariés, 40 M€, 20 M€",
    description:
      "Critère « deux sur trois » pour les grandes entreprises ; critères pour les capital-markets entities.",
    order: 1,
    estimatedMinutes: 12,
    difficulty: "intermediaire",
    lesson1Title: "Calculer la taille de l'entreprise",
    lesson1Content: [
      {
        type: "paragraph",
        text:
          "Une grande entreprise est souvent définie comme dépassant au moins deux des trois seuils : total du bilan 20 M€, chiffre d'affaires net 40 M€, effectif moyen 250 salariés — variante 500 salariés selon catégories. Vérifiez la définition exacte du texte et de la transposition pour votre cas.",
      },
      {
        type: "table",
        headers: ["Indicateur", "Seuil indicatif (grandes entreprises)"],
        rows: [
          ["Chiffre d'affaires net", "40 M€"],
          ["Total du bilan", "20 M€"],
          ["Effectif moyen", "250 salariés (ou 500 selon critère retenu pour la catégorie)"],
        ],
      },
      {
        type: "callout",
        variant: "tip",
        title: "Vu par ZEI",
        text:
          "Même les PME hors champ direct CSRD seront sollicitées via la Value Chain Cap : tout questionnaire fournisseur ou bancaire devra être aligné sur la VSME. En pratique, une entreprise non soumise reste indirectement concernée dès qu'elle vend en B2B ou cherche à contracter un prêt. Source : ZEI — La VSME expliquée.",
      },
      {
        type: "sources",
        items: [
          {
            label: "Directive 2022/2464 — définitions (EUR-Lex)",
            url: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32022L2464",
          },
          {
            label: "ZEI — La VSME expliquée : Value Chain Cap (PDF)",
            url: "https://4495458.fs1.hubspotusercontent-na1.net/hubfs/4495458/Livres%20blancs/Zei%20-%20La%20VSME%20expliqu%C3%A9e%20-%20Le%20nouveau%20langage%20commun%20de%20la%20donn%C3%A9es%20ESG%20en%20Europe.pdf",
          },
        ],
      },
    ] as ContentBlock[],
    lesson2Title: "Capital-markets entities",
    lesson2Content: [
      {
        type: "paragraph",
        text:
          "Les entités d'intérêt public cotées sont au cœur du premier cercle d'obligations ; les critères de taille servent à englober d'autres grandes sociétés.",
      },
      {
        type: "sources",
        items: [
          {
            label: "Commission UE — company reporting",
            url: "https://finance.ec.europa.eu/capital-markets-union-and-financial-markets/company-reporting-and-auditing/company-reporting/corporate-sustainability-reporting_en",
          },
        ],
      },
    ] as ContentBlock[],
    questions: [
      {
        question: "Le critère « deux sur trois » signifie :",
        explanation: "L'entreprise est concernée si elle dépasse au moins deux seuils sur trois.",
        correct: "Dépasser au moins deux des trois seuils fixés",
        wrong: ["Dépasser un seul seuil", "Ne dépasser aucun seuil", "Additionner les trois seuils"],
        points: 2,
        difficulty: "intermediaire",
        lessonIdx: 0,
      },
      {
        question: "40 M€ et 20 M€ concernent respectivement souvent :",
        explanation: "CA net et total bilan sont deux des trois critères.",
        correct: "Chiffre d'affaires et bilan",
        wrong: ["Effectif et météo", "Uniquement les impôts", "Les likes sur les réseaux"],
        points: 1,
        difficulty: "debutant",
        lessonIdx: 0,
      },
      {
        question: "500 salariés apparaît dans certains textes pour :",
        explanation: "La NFRD utilisait notamment le seuil de 500 pour certaines entités.",
        correct: "Qualifier certaines grandes entreprises ou entités sous ancienne NFRD",
        wrong: ["Les micro-entreprises", "Les écoles maternelles", "Les particuliers"],
        points: 2,
        difficulty: "intermediaire",
        lessonIdx: 0,
      },
      {
        question: "Une filiale peut être consolidée dans le périmètre du groupe.",
        explanation: "Les obligations peuvent s'apprécier au niveau du groupe consolidé.",
        correct: "Vrai",
        wrong: ["Faux", "Uniquement si la filiale est sur Mars", "Jamais en Europe"],
        points: 1,
        difficulty: "debutant",
        lessonIdx: 1,
      },
      {
        question: "Les micro-entreprises sont en général :",
        explanation: "Les micro-entreprises sont souvent exclues des obligations CSRD de base.",
        correct: "Exclues du champ CSRD initial",
        wrong: ["Les premières obligées", "Toujours assimilées aux grandes entreprises", "Non définies juridiquement"],
        points: 1,
        difficulty: "debutant",
        lessonIdx: 1,
      },
      {
        question: "Le périmètre doit être réévalué :",
        explanation: "Les seuils peuvent être franchis ou perdus d'un exercice à l'autre.",
        correct: "Chaque année selon les comptes arrêtés",
        wrong: ["Une fois à la création uniquement", "Jamais", "Tous les 100 ans"],
        points: 1,
        difficulty: "debutant",
        lessonIdx: null,
      },
      {
        question: "Une entreprise non cotée peut être concernée si :",
        explanation: "Les grandes entreprises non cotées répondant aux critères sont visées.",
        correct: "Elle dépasse les critères de taille applicables",
        wrong: ["Elle est toujours exemptée", "Elle n'a aucun employé", "Elle est une association loi 1901 sans condition"],
        points: 2,
        difficulty: "intermediaire",
        lessonIdx: null,
      },
      {
        question: "Les données pour apprécier les seuils proviennent de :",
        explanation: "Les comptes annuels arrêtés servent de base.",
        correct: "Les états financiers et effectifs de l'exercice",
        wrong: ["Un sondage Twitter", "Uniquement du ressenti du PDG", "Des prévisions sans réalisation"],
        points: 1,
        difficulty: "debutant",
        lessonIdx: null,
      },
      {
        question:
          "Selon ZEI, une PME hors seuils CSRD peut être indirectement concernée par :",
        explanation:
          "La Value Chain Cap (Omnibus, février 2025) impose à tout questionnaire fournisseur ou bancaire d'utiliser la VSME : les PME qui vendent en B2B ou empruntent reçoivent donc des demandes ESG alignées VSME (source : ZEI — La VSME expliquée).",
        correct:
          "Les questionnaires Value Chain Cap envoyés par ses clients ou ses banques",
        wrong: [
          "Un audit fiscal automatique de l'État",
          "L'obligation de publier un rapport CSRD complet",
          "Une convention collective spécifique",
        ],
        points: 2,
        difficulty: "intermediaire",
        lessonIdx: 0,
      },
    ],
  });

  await seedModuleQuick(stScope, {
    slug: "csrd-consolidation-filiales",
    title: "Consolidation et chaîne de valeur",
    description:
      "Périmètre du groupe, données fournisseurs et montée en maturité sur le Scope 3.",
    order: 2,
    estimatedMinutes: 14,
    difficulty: "avance",
    lesson1Title: "Rapport consolidé",
    lesson1Content: [
      {
        type: "paragraph",
        text:
          "Le rapport de durabilité s'inscrit dans le rapport de gestion du groupe ; les filiales pertinentes sont incluses selon les normes comptables applicables (IFRS / normes nationales).",
      },
      {
        type: "sources",
        items: [
          {
            label: "ESRS — portail officiel",
            url: "https://www.esrs.europa.eu/",
          },
        ],
      },
    ] as ContentBlock[],
    lesson2Title: "Données amont / aval",
    lesson2Content: [
      {
        type: "paragraph",
        text:
          "La matérialité peut impliquer des informations sur la chaîne de valeur : travail des fournisseurs, usage des produits, fin de vie — liens avec ESRS S2 et climat (E1).",
      },
      {
        type: "sources",
        items: [
          {
            label: "EFRAG — sustainability reporting",
            url: "https://www.efrag.org/en/projects/sustainability-reporting",
          },
        ],
      },
    ] as ContentBlock[],
    questions: [
      {
        question: "Le reporting CSRD au niveau groupe :",
        explanation: "Le rapport couvre le périmètre consolidé lorsque applicable.",
        correct: "Intègre les entités consolidées selon la comptabilité applicable",
        wrong: ["Ignore toutes les filiales", "Ne concerne que le siège social", "Est facultatif pour tout groupe"],
        points: 2,
        difficulty: "intermediaire",
        lessonIdx: 0,
      },
      {
        question: "La chaîne de valeur peut inclure :",
        explanation: "Fournisseurs, clients et fin de vie des produits font partie de la chaîne.",
        correct: "Les impacts en amont et en aval de l'entreprise",
        wrong: ["Uniquement le parking du siège", "Uniquement les actionnaires", "Rien du tout"],
        points: 2,
        difficulty: "intermediaire",
        lessonIdx: 1,
      },
      {
        question: "Les données Scope 3 sont souvent :",
        explanation: "Le Scope 3 couvre les émissions indirectes de la chaîne de valeur.",
        correct: "Estimées à partir de données internes et fournisseurs",
        wrong: ["Toujours nulles", "Interdites en Europe", "Uniquement pour les ONG"],
        points: 2,
        difficulty: "intermediaire",
        lessonIdx: 1,
      },
      {
        question: "Une filiale étrangère peut entrer dans le périmètre consolidé.",
        explanation: "Les règles de consolidation suivent le référentiel comptable.",
        correct: "Vrai",
        wrong: ["Faux", "Uniquement si elle est sur le même palier", "Jamais"],
        points: 1,
        difficulty: "debutant",
        lessonIdx: 0,
      },
      {
        question: "L'interconnexion CSRD / données carbone nécessite :",
        explanation: "Gouvernance des données et contrôles sur les hypothèses.",
        correct: "Des processus de collecte et de revue des hypothèses",
        wrong: ["Aucune documentation", "Uniquement Excel sans contrôle", "Une seule personne sans backup"],
        points: 2,
        difficulty: "intermediaire",
        lessonIdx: null,
      },
      {
        question: "Les joint-ventures peuvent :",
        explanation: "Le traitement comptable détermine l'inclusion.",
        correct: "Être incluses ou suivies selon la méthode de consolidation",
        wrong: ["Toujours exclues", "Toujours comptées à 200%", "N'existent pas en droit"],
        points: 3,
        difficulty: "avance",
        lessonIdx: null,
      },
      {
        question: "La chaîne de valeur pour le social peut couvrir :",
        explanation: "ESRS S2 traite notamment les travailleurs de la chaîne de valeur.",
        correct: "Les travailleurs chez les fournisseurs contractuels",
        wrong: ["Uniquement le PDG", "Les animaux de compagnie", "Personne"],
        points: 2,
        difficulty: "intermediaire",
        lessonIdx: 1,
      },
      {
        question: "Un même indicateur doit être :",
        explanation: "Cohérence dans le temps et méthodologie documentée.",
        correct: "Calculé de manière cohérente d'une année sur l'autre",
        wrong: ["Changeant aléatoirement", "Secret défense", "Uniquement narratif sans chiffre"],
        points: 1,
        difficulty: "debutant",
        lessonIdx: null,
      },
    ],
  });

  // ——— ESRS (2 modules) ———
  await seedModuleQuick(stEsrs, {
    slug: "csrd-esrs-architecture",
    title: "ESRS 1 et ESRS 2 : architecture générale",
    description:
      "Principes généraux, passage « cohérence avec les états financiers », gouvernance de l'information.",
    order: 1,
    estimatedMinutes: 15,
    difficulty: "intermediaire",
    lesson1Title: "ESRS 1 — Exigences générales",
    lesson1Content: [
      {
        type: "paragraph",
        text:
          "L'ESRS 1 fixe les principes de préparation du rapport : valeur courante, passage cohérent avec les états financiers, information prospective et rétrospective, et notion de matérialité (y compris double matérialité).",
      },
      {
        type: "callout",
        variant: "tip",
        title: "Vu par ZEI",
        text:
          "Avant la CSRD, les entreprises choisissaient les données absolues qui les arrangeaient : impossible de comparer. Avec la CSRD et ses définitions ESRS uniformes, on bascule vers des données quantitatives relatives (ratios sur CA, intensités) et sectorielles, accessibles publiquement (Open Source) pour ~50 000 entreprises européennes — la donnée ESG devient enfin comparable. Source : ZEI — En Bref 5.",
      },
      {
        type: "sources",
        items: [
          {
            label: "Règlement délégué ESRS — Journal officiel UE",
            url: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX%3A32023R2772",
          },
          {
            label: "ZEI — En Bref 5 : Avant CSRD vs Avec CSRD (PDF)",
            url: "https://4495458.fs1.hubspotusercontent-na1.net/hubfs/4495458/En%20bref/En%20Bref%205%20-%20CSRD%2c%20ce%20que%20vous%20devez%20comprendre%20avant%20vos%20concurrents%20pour%20rester%20comp%C3%A9titifs%20-%20Zei.pdf",
          },
        ],
      },
    ] as ContentBlock[],
    lesson2Title: "ESRS 2 — Disclosures généraux",
    lesson2Content: [
      {
        type: "paragraph",
        text:
          "L'ESRS 2 impose des informations transversales : stratégie, gouvernance, impacts, risques et opportunités (IRO), méthodes et métadonnées.",
      },
      {
        type: "sources",
        items: [
          {
            label: "ESRS — site européen",
            url: "https://www.esrs.europa.eu/",
          },
        ],
      },
    ] as ContentBlock[],
    questions: [
      {
        question: "ESRS signifie :",
        explanation: "European Sustainability Reporting Standards.",
        correct: "European Sustainability Reporting Standards",
        wrong: ["Environmental Social Rating System", "European Securities Regulation Standard", "Eco Score Reporting Sheet"],
        points: 1,
        difficulty: "debutant",
        lessonIdx: 0,
      },
      {
        question: "L'ESRS 1 traite notamment :",
        explanation: "ESRS 1 pose le cadre conceptuel et les exigences générales.",
        correct: "Les exigences générales de préparation du rapport",
        wrong: ["Uniquement le climat", "Uniquement la paie", "Les visas de voyage"],
        points: 2,
        difficulty: "intermediaire",
        lessonIdx: 0,
      },
      {
        question: "L'ESRS 2 couvre :",
        explanation: "ESRS 2 = disclosures généraux (gouvernance, stratégie, IRO…).",
        correct: "Les informations transversales (gouvernance, stratégie, IRO…)",
        wrong: ["Uniquement la biodiversité", "Uniquement les scooters", "Rien du tout"],
        points: 2,
        difficulty: "intermediaire",
        lessonIdx: 1,
      },
      {
        question: "Le rapport doit être cohérent avec :",
        explanation: "Cohérence avec les états financiers est un principe clé.",
        correct: "Les états financiers et annexes lorsque pertinent",
        wrong: ["Uniquement Instagram", "Les prévisions météo", "Un blog personnel"],
        points: 2,
        difficulty: "intermediaire",
        lessonIdx: 0,
      },
      {
        question: "La matérialité en CSRD repose sur :",
        explanation: "Double matérialité : impact et financier.",
        correct: "L'analyse de double matérialité",
        wrong: ["Uniquement le prix de l'or", "Uniquement le nombre de likes", "Aucun critère"],
        points: 2,
        difficulty: "intermediaire",
        lessonIdx: 1,
      },
      {
        question: "Les ESRS sont adoptés par :",
        explanation: "Acte délégué de la Commission sur la base des travaux EFRAG.",
        correct: "La Commission européenne (actes délégués)",
        wrong: ["Uniquement la NASA", "Les clubs de football", "Chaque entreprise librement"],
        points: 1,
        difficulty: "debutant",
        lessonIdx: null,
      },
      {
        question: "Un émetteur peut devoir expliquer :",
        explanation: "Méthodologies et hypothèses doivent être transparentes.",
        correct: "Ses méthodes d'estimation et sources de données",
        wrong: ["Rien", "Uniquement des émojis", "Des secrets industriels non matériels"],
        points: 2,
        difficulty: "intermediaire",
        lessonIdx: null,
      },
      {
        question: "EFRAG dans le processus ESRS :",
        explanation: "EFRAG a préparé des drafts repris par la Commission.",
        correct: "A proposé des drafts de standards repris dans les actes délégués",
        wrong: ["Vote les amendes CSRD", "Remplace les juges", "Délivre le permis de conduire"],
        points: 2,
        difficulty: "intermediaire",
        lessonIdx: null,
      },
      {
        question:
          "Selon ZEI, en moyenne dans un rapport CSRD, la part de données narratives (qualitatives) est de :",
        explanation:
          "ZEI rappelle qu'un rapport CSRD est composé d'environ 70 % de données narratives et 30 % de données quantitatives — la nouveauté CSRD étant cette partie quantitative (source : ZEI — En Bref 5).",
        correct: "Environ 70 %",
        wrong: ["Environ 10 %", "Environ 30 %", "Environ 95 %"],
        points: 2,
        difficulty: "intermediaire",
        lessonIdx: 0,
      },
    ],
  });

  await seedModuleQuick(stEsrs, {
    slug: "csrd-esrs-thematiques",
    title: "Standards thématiques E, S et G",
    description:
      "Vue d'ensemble : climat (E1), pollution, eau, biodiversité, circularité ; social (S1–S4) ; gouvernance (G1).",
    order: 2,
    estimatedMinutes: 16,
    difficulty: "avance",
    lesson1Title: "Pilier E : E1 à E5",
    lesson1Content: [
      {
        type: "table",
        headers: ["Standard", "Thématique"],
        rows: [
          ["E1", "Climat"],
          ["E2", "Pollution"],
          ["E3", "Ressources hydriques et marines"],
          ["E4", "Biodiversité"],
          ["E5", "Économie circulaire"],
        ],
      },
      {
        type: "sources",
        items: [
          {
            label: "ESRS — liste des standards",
            url: "https://www.esrs.europa.eu/",
          },
        ],
      },
    ] as ContentBlock[],
    lesson2Title: "Pilier S et G",
    lesson2Content: [
      {
        type: "list",
        style: "bullet",
        items: [
          "S1 : effectifs propres",
          "S2 : travailleurs de la chaîne de valeur",
          "S3 : communautés affectées",
          "S4 : consommateurs et utilisateurs finaux",
          "G1 : conduite des affaires (y compris corruption)",
        ],
      },
      {
        type: "sources",
        items: [
          {
            label: "Commission — sustainable finance",
            url: "https://finance.ec.europa.eu/sustainable-finance_en",
          },
        ],
      },
    ] as ContentBlock[],
    questions: [
      {
        question: "E1 traite principalement :",
        explanation: "E1 = changement climatique.",
        correct: "Le changement climatique",
        wrong: ["La paie des dirigeants", "Les dividendes uniquement", "Les marques de café"],
        points: 1,
        difficulty: "debutant",
        lessonIdx: 0,
      },
      {
        question: "E4 concerne :",
        explanation: "E4 = biodiversité et écosystèmes.",
        correct: "La biodiversité et les écosystèmes",
        wrong: ["Les salaires", "La fiscalité locale", "Les avions privés uniquement"],
        points: 1,
        difficulty: "debutant",
        lessonIdx: 0,
      },
      {
        question: "S1 se concentre sur :",
        explanation: "S1 = travailleurs propres à l'entreprise.",
        correct: "Les propres effectifs",
        wrong: ["Uniquement les chats", "Les concurrents", "Les banques centrales"],
        points: 2,
        difficulty: "intermediaire",
        lessonIdx: 1,
      },
      {
        question: "S2 couvre notamment :",
        explanation: "S2 = value chain workers.",
        correct: "Les travailleurs dans la chaîne de valeur",
        wrong: ["Uniquement les actionnaires", "Les satellites", "Les élections municipales"],
        points: 2,
        difficulty: "intermediaire",
        lessonIdx: 1,
      },
      {
        question: "G1 inclut :",
        explanation: "G1 = business conduct, corruption, lobbying…",
        correct: "La conduite des affaires et la lutte contre la corruption",
        wrong: ["Uniquement le menu cantine", "Les couleurs du logo", "Les tickets restaurant"],
        points: 2,
        difficulty: "intermediaire",
        lessonIdx: 1,
      },
      {
        question: "Combien de standards thématiques E sont listés en ESRS (E1–E5) ?",
        explanation: "Cinq standards E1 à E5.",
        correct: "5",
        wrong: ["2", "12", "0"],
        points: 1,
        difficulty: "debutant",
        lessonIdx: 0,
      },
      {
        question: "S3 peut concerner :",
        explanation: "S3 = communautés locales affectées.",
        correct: "Les communautés locales affectées par les opérations",
        wrong: ["Uniquement Paris", "Les planètes", "Les licornes"],
        points: 2,
        difficulty: "intermediaire",
        lessonIdx: 1,
      },
      {
        question: "S4 inclut :",
        explanation: "S4 = consommateurs et utilisateurs finaux.",
        correct: "Les consommateurs et utilisateurs finaux",
        wrong: ["Les fournisseurs d'énergie nucléaire uniquement", "Personne", "Tous les animaux"],
        points: 2,
        difficulty: "intermediaire",
        lessonIdx: null,
      },
    ],
  });

  // ——— Double matérialité (2 modules) ———
  await seedModuleQuick(stDm, {
    slug: "csrd-double-materialite-concept",
    title: "Impact et matérialité financière",
    description:
      "Double matérialité : impacts sur les personnes et l'environnement vs risques et opportunités pour l'entreprise.",
    order: 1,
    estimatedMinutes: 14,
    difficulty: "intermediaire",
    lesson1Title: "Deux perspectives complémentaires",
    lesson1Content: [
      {
        type: "paragraph",
        text:
          "Matérialité d'impact : les incidences réelles et potentives de l'entreprise sur l'environnement et les personnes. Matérialité financière : les risques et opportunités qui influencent la valeur de l'entreprise (cash-flows, coût du capital, etc.).",
      },
      {
        type: "callout",
        variant: "tip",
        title: "Vu par ZEI",
        text:
          "L'analyse de double matérialité fait souvent émerger des risques et opportunités jamais identifiés. ZEI cite l'exemple d'un groupe d'éducation qui a découvert qu'il s'apprêtait à acheter des biens immobiliers dans des zones promises à un fort stress hydrique futur — un risque peu visible à court terme mais qui dégrade la valeur du bien à moyen-long terme. Source : ZEI — En Bref 5.",
      },
      {
        type: "sources",
        items: [
          {
            label: "EFRAG — double materiality (documentation)",
            url: "https://www.efrag.org/en/projects/sustainability-reporting",
          },
          {
            label: "ZEI — En Bref 5 : ROI de la double matérialité (PDF)",
            url: "https://4495458.fs1.hubspotusercontent-na1.net/hubfs/4495458/En%20bref/En%20Bref%205%20-%20CSRD%2c%20ce%20que%20vous%20devez%20comprendre%20avant%20vos%20concurrents%20pour%20rester%20comp%C3%A9titifs%20-%20Zei.pdf",
          },
        ],
      },
    ] as ContentBlock[],
    lesson2Title: "Méthode d'analyse",
    lesson2Content: [
      {
        type: "list",
        style: "ordered",
        items: [
          "Cartographier les activités et la chaîne de valeur",
          "Identifier les impacts, risques et opportunités (IRO)",
          "Évaluer l'ampleur et la gravité (impact) / effets financiers probables",
          "Prioriser les sujets matériels à déclarer",
        ],
      },
      {
        type: "sources",
        items: [
          {
            label: "ESRS 1 — concept de matérialité",
            url: "https://www.esrs.europa.eu/",
          },
        ],
      },
    ] as ContentBlock[],
    questions: [
      {
        question: "La matérialité d'impact répond à la question :",
        explanation: "Impact = effets de l'entreprise sur le monde extérieur.",
        correct: "Comment l'entreprise affecte-t-elle l'environnement et la société ?",
        wrong: ["Combien vaut le bitcoin ?", "Quel est le plat du jour ?", "Qui gagne le championnat ?"],
        points: 2,
        difficulty: "intermediaire",
        lessonIdx: 0,
      },
      {
        question: "La matérialité financière vise :",
        explanation: "Risques et opportunités pour la création de valeur financière.",
        correct: "Les effets sur la performance et la situation financière",
        wrong: ["Uniquement les couleurs du site web", "Le nombre de plantes au bureau", "Les goûts musicaux du PDG"],
        points: 2,
        difficulty: "intermediaire",
        lessonIdx: 0,
      },
      {
        question: "Les IRO désignent :",
        explanation: "Impacts, Risks, Opportunities.",
        correct: "Impacts, risques et opportunités",
        wrong: ["Instituts, Régions, Océans", "Imports, Routes, Outputs", "Rien"],
        points: 1,
        difficulty: "debutant",
        lessonIdx: 1,
      },
      {
        question: "La double matérialité exige toujours deux analyses distinctes mais liées.",
        explanation: "Les deux dimensions sont interconnectées (ex. climat).",
        correct: "Vrai",
        wrong: ["Faux", "Interdit en Europe", "Remplacée par du simple greenwashing"],
        points: 1,
        difficulty: "debutant",
        lessonIdx: 0,
      },
      {
        question: "Un sujet peut être matériel sur :",
        explanation: "Un sujet peut être matériel sur un seul ou les deux critères.",
        correct: "Uniquement l'impact, uniquement le financier, ou les deux",
        wrong: ["Jamais le climat", "Toujours les deux obligatoirement de la même façon", "Uniquement le marketing"],
        points: 2,
        difficulty: "intermediaire",
        lessonIdx: 1,
      },
      {
        question: "La cartographie de la chaîne de valeur sert à :",
        explanation: "Identifier où se situent les impacts et dépendances.",
        correct: "Repérer les activités et parties prenantes pertinentes",
        wrong: ["Décorer un PowerPoint", "Rien", "Cacher les fournisseurs"],
        points: 1,
        difficulty: "debutant",
        lessonIdx: 1,
      },
      {
        question: "Les seuils de matérialité sont :",
        explanation: "L'entreprise définit critères et seuils documentés.",
        correct: "Fixés par l'entité avec justification",
        wrong: ["Toujours identiques pour toutes les entreprises", "Imposés par Twitter", "Inexistants"],
        points: 2,
        difficulty: "intermediaire",
        lessonIdx: null,
      },
      {
        question: "Le climat peut être :",
        explanation: "À la fois impact physique et risque de transition financier.",
        correct: "Matériel à la fois en impact et en financier",
        wrong: ["Jamais matériel", "Uniquement une mode", "Exclu des ESRS"],
        points: 2,
        difficulty: "intermediaire",
        lessonIdx: null,
      },
      {
        question:
          "Selon ZEI, l'analyse de double matérialité permet notamment de :",
        explanation:
          "ZEI illustre le ROI de la DMA par un cas concret (groupe d'éducation découvrant un risque de stress hydrique futur sur des acquisitions immobilières) : la DMA fait émerger des risques moyen-long terme insoupçonnés (source : ZEI — En Bref 5).",
        correct:
          "Découvrir des risques ESG moyen-long terme insoupçonnés (ex. stress hydrique futur)",
        wrong: [
          "Réduire automatiquement les coûts d'audit financier",
          "Remplacer la stratégie commerciale de l'entreprise",
          "Garantir l'obtention d'un label B Corp",
        ],
        points: 2,
        difficulty: "intermediaire",
        lessonIdx: 0,
      },
    ],
  });

  await seedModuleQuick(stDm, {
    slug: "csrd-dma-pratique",
    title: "DMA : priorisation et documentation",
    description:
      "Mettre en œuvre une analyse de double matérialité documentée et révisable par les auditeurs.",
    order: 2,
    estimatedMinutes: 13,
    difficulty: "avance",
    lesson1Title: "Gouvernance du processus DMA",
    lesson1Content: [
      {
        type: "paragraph",
        text:
          "Le processus doit être reproductible : critères d'évaluation, sources (études internes, experts, parties prenantes), validation par la direction et le conseil.",
      },
      {
        type: "sources",
        items: [
          {
            label: "ESRS — ressources officielles",
            url: "https://www.esrs.europa.eu/",
          },
        ],
      },
    ] as ContentBlock[],
    lesson2Title: "Preuves pour l'assurance",
    lesson2Content: [
      {
        type: "callout",
        variant: "tip",
        title: "Audit trail",
        text:
          "Conservez les versions des matrices de matérialité, les comptes rendus d'ateliers et les données sources pour faciliter l'assurance.",
      },
      {
        type: "sources",
        items: [
          {
            label: "Commission — corporate sustainability reporting",
            url: "https://finance.ec.europa.eu/capital-markets-union-and-financial-markets/company-reporting-and-auditing/company-reporting/corporate-sustainability-reporting_en",
          },
        ],
      },
    ] as ContentBlock[],
    questions: [
      {
        question: "Le processus DMA doit être :",
        explanation: "Traçabilité pour l'assurance.",
        correct: "Documenté et traçable",
        wrong: ["Oral uniquement sans trace", "Secret absolu", "Aléatoire"],
        points: 2,
        difficulty: "intermediaire",
        lessonIdx: 0,
      },
      {
        question: "Les parties prenantes peuvent être consultées pour :",
        explanation: "Dialogue avec parties prenantes = bonne pratique.",
        correct: "Affiner la compréhension des impacts et attentes",
        wrong: ["Rien du tout", "Uniquement décorer le rapport", "Remplacer la direction"],
        points: 2,
        difficulty: "intermediaire",
        lessonIdx: 0,
      },
      {
        question: "La matrice de matérialité doit être :",
        explanation: "Elle évolue avec l'activité.",
        correct: "Révisée lorsque le contexte ou l'activité change",
        wrong: ["Gelée à vie", "Publiée une fois sur MySpace", "Inutile"],
        points: 1,
        difficulty: "debutant",
        lessonIdx: 1,
      },
      {
        question: "L'assurance portera souvent sur :",
        explanation: "Procédures et données sous-jacentes.",
        correct: "La conception du processus et la qualité des preuves",
        wrong: ["Le goût du café", "La couleur des chaises", "Rien"],
        points: 2,
        difficulty: "intermediaire",
        lessonIdx: 1,
      },
      {
        question: "Un écart entre années doit être expliqué :",
        explanation: "Changements méthodologiques = transparence.",
        correct: "Oui, pour la comparabilité",
        wrong: ["Non, jamais", "Uniquement en latin", "Par des émojis"],
        points: 1,
        difficulty: "debutant",
        lessonIdx: null,
      },
      {
        question: "Les outils logiciels DMA doivent permettre :",
        explanation: "Versioning et contrôle d'accès.",
        correct: "La traçabilité des modifications et des validations",
        wrong: ["D'effacer toute donnée", "Rien", "Uniquement du dessin"],
        points: 2,
        difficulty: "intermediaire",
        lessonIdx: null,
      },
      {
        question: "Un sujet non matériel :",
        explanation: "Pas d'information détaillée requise pour ce sujet.",
        correct: "Ne nécessite pas les mêmes disclosures qu'un sujet matériel",
        wrong: ["Doit quand même remplir 500 pages", "Est illégal", "N'existe pas"],
        points: 2,
        difficulty: "intermediaire",
        lessonIdx: null,
      },
      {
        question: "La CSRD impose une analyse de double matérialité pour :",
        explanation: "Identification des sujets à inclure dans le rapport.",
        correct: "Déterminer les informations pertinentes à publier",
        wrong: ["Choisir la couleur du logo", "Remplacer la stratégie commerciale", "Annuler le bilan carbone"],
        points: 2,
        difficulty: "intermediaire",
        lessonIdx: null,
      },
    ],
  });

  // ——— Sanctions & risques (2 modules) ———
  await seedModuleQuick(stSan, {
    slug: "csrd-sanctions-administratives",
    title: "Sanctions, enforcement et autorités",
    description:
      "Cadres nationaux d'enquête, amendes potentielles et responsabilité des dirigeants.",
    order: 1,
    estimatedMinutes: 12,
    difficulty: "intermediaire",
    lesson1Title: "Sanctions et contrôles",
    lesson1Content: [
      {
        type: "paragraph",
        text:
          "Les États membres désignent les autorités compétentes et prévoient des sanctions effectives, proportionnées et dissuasives pour manquement aux obligations de publication ou à l'assurance lorsque requis.",
      },
      {
        type: "sources",
        items: [
          {
            label: "Directive 2022/2464 — articles sur sanctions (EUR-Lex)",
            url: "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32022L2464",
          },
        ],
      },
    ] as ContentBlock[],
    lesson2Title: "Responsabilité des administrateurs",
    lesson2Content: [
      {
        type: "paragraph",
        text:
          "Les organes de surveillance et les commissaires aux comptes jouent un rôle clé ; les dirigeants doivent attester la cohérence des informations avec les faits.",
      },
      {
        type: "sources",
        items: [
          {
            label: "Emistra — CSRD legal risks",
            url: "https://www.emistra.io/blog/csrd-deadlines-2025-2028-which-phase-applies",
          },
        ],
      },
    ] as ContentBlock[],
    questions: [
      {
        question: "Les sanctions pour défaut de reporting sont fixées :",
        explanation: "Au niveau national dans le respect du cadre européen.",
        correct: "Par chaque État membre avec des autorités désignées",
        wrong: ["Par un tirage au sort", "Uniquement par l'ONU", "Il n'y a jamais de sanctions"],
        points: 2,
        difficulty: "intermediaire",
        lessonIdx: 0,
      },
      {
        question: "Les amendes doivent être :",
        explanation: "Directive : effectives, proportionnées, dissuasives.",
        correct: "Effectives, proportionnées et dissuasives",
        wrong: ["Symboliques uniquement", "Toujours de 1 €", "Interdites"],
        points: 2,
        difficulty: "intermediaire",
        lessonIdx: 0,
      },
      {
        question: "Un greenwashing grave peut entraîner :",
        explanation: "Sanctions AMF, réparation civile, réputation.",
        correct: "Sanctions des autorités de marché et actions en responsabilité",
        wrong: ["Une médaille", "Rien", "Un abonnement gratuit"],
        points: 2,
        difficulty: "intermediaire",
        lessonIdx: 1,
      },
      {
        question: "Les dirigeants peuvent être exposés si :",
        explanation: "Information trompeuse ou dolosive.",
        correct: "Ils valident des informations fausses ou trompeuses",
        wrong: ["Ils lisent le rapport", "Ils embauchent", "Ils changent de café"],
        points: 2,
        difficulty: "intermediaire",
        lessonIdx: 1,
      },
      {
        question: "L'assurance réduit les risques mais :",
        explanation: "Ne supprime pas la responsabilité de l'entité.",
        correct: "Ne remplace pas la responsabilité de l'entité sur le contenu",
        wrong: ["Garantit 0 risque", "Remplace la direction", "Supprime les ESRS"],
        points: 2,
        difficulty: "intermediaire",
        lessonIdx: null,
      },
      {
        question: "Une plainte d'ONG peut :",
        explanation: "Voies civiles et médiatiques.",
        correct: "S'ajouter aux contrôles réglementaires pour faire évoluer les pratiques",
        wrong: ["Être illégale", "Être ignorée systématiquement", "Remplacer le droit"],
        points: 1,
        difficulty: "debutant",
        lessonIdx: null,
      },
      {
        question: "Le non-respect des ESRS peut être :",
        explanation: "Manquement aux obligations d'information.",
        correct: "Sanctionné comme tout manquement aux obligations de publication",
        wrong: ["Récompensé", "Ignoré par principe", "Remplacé par du ISO 9001"],
        points: 2,
        difficulty: "intermediaire",
        lessonIdx: null,
      },
      {
        question: "La coopération entre autorités européennes vise :",
        explanation: "Convergence de l'application.",
        correct: "Une application cohérente du cadre",
        wrong: ["Supprimer les frontières fiscales", "Fusionner toutes les entreprises", "Interdire les audits"],
        points: 1,
        difficulty: "debutant",
        lessonIdx: null,
      },
    ],
  });

  await seedModuleQuick(stSan, {
    slug: "csrd-risques-reputation-finance",
    title: "Risque réputationnel et coût du capital",
    description:
      "Comment le marché et les investisseurs réagissent aux écarts de transparence ESG.",
    order: 2,
    estimatedMinutes: 11,
    difficulty: "debutant",
    lesson1Title: "Investisseurs et banques",
    lesson1Content: [
      {
        type: "paragraph",
        text:
          "Un reporting CSRD de qualité réduit la prime de risque ESG perçue par les investisseurs et facilite l'accès aux financements verts ou aux lignes de crédit indexées sur des KPIs de durabilité.",
      },
      {
        type: "callout",
        variant: "tip",
        title: "Vu par ZEI",
        text:
          "Au-delà du risque, la CSRD ouvre trois leviers compétitifs concrets selon ZEI : marque employeur (55 % des collaborateurs placent l'engagement RSE devant le salaire ; 2 jeunes sur 3 refusent de travailler pour une entreprise sans stratégie RSE solide), parts de marché (80 % des Français ont changé leurs habitudes d'achat ; 62 % des grandes entreprises et ETI incluent les achats dans leur objectif de neutralité carbone), et financement (prêts à impact, due diligences ESG, fonds à impact). Source : ZEI — En Bref 5.",
      },
      {
        type: "sources",
        items: [
          {
            label: "Commission — sustainable finance overview",
            url: "https://finance.ec.europa.eu/sustainable-finance_en",
          },
          {
            label:
              "ZEI — En Bref 5 : leviers compétitifs RSE / CSRD (PDF)",
            url: "https://4495458.fs1.hubspotusercontent-na1.net/hubfs/4495458/En%20bref/En%20Bref%205%20-%20CSRD%2c%20ce%20que%20vous%20devez%20comprendre%20avant%20vos%20concurrents%20pour%20rester%20comp%C3%A9titifs%20-%20Zei.pdf",
          },
        ],
      },
    ] as ContentBlock[],
    lesson2Title: "Crises et réputation",
    lesson2Content: [
      {
        type: "paragraph",
        text:
          "Les affaires de greenwashing ou de données erronées peuvent provoquer des chutes de cours, des plaintes collectives et une perte de confiance des consommateurs.",
      },
      {
        type: "sources",
        items: [
          {
            label: "Dcycle — CSRD and reputational risk (blog)",
            url: "https://www.dcycle.io/blog/csrd-guide-obligations-deadlines-esrs",
          },
        ],
      },
    ] as ContentBlock[],
    questions: [
      {
        question: "Un écart révélé entre discours et données peut :",
        explanation: "Réaction des marchés et parties prenantes.",
        correct: "Réduire la confiance et affecter la valorisation",
        wrong: ["Toujours augmenter le cours", "Être ignoré", "Être illégal à mentionner"],
        points: 2,
        difficulty: "intermediaire",
        lessonIdx: 0,
      },
      {
        question: "Les financements durables liés à des KPIs exigent :",
        explanation: "Données vérifiables.",
        correct: "Des indicateurs fiables et traçables",
        wrong: ["Aucune donnée", "Uniquement des promesses", "Uniquement du marketing"],
        points: 2,
        difficulty: "intermediaire",
        lessonIdx: 0,
      },
      {
        question: "La transparence CSRD peut abaisser :",
        explanation: "Meilleure information = moindre asymétrie.",
        correct: "La prime de risque perçue par certains investisseurs",
        wrong: ["Toujours les salaires", "La qualité du reporting", "Le nombre d'employés"],
        points: 2,
        difficulty: "intermediaire",
        lessonIdx: 1,
      },
      {
        question: "Une crise réputationnelle ESG peut impacter :",
        explanation: "Multiplicateur d'impact.",
        correct: "Les ventes, le recrutement et les partenariats",
        wrong: ["Uniquement le logo", "Rien", "Uniquement les concurrents positivement"],
        points: 1,
        difficulty: "debutant",
        lessonIdx: 1,
      },
      {
        question: "La communication doit être alignée avec :",
        explanation: "Cohérence données / message.",
        correct: "Les données publiées et les ESRS",
        wrong: ["Uniquement les slogans", "Les rumeurs", "Les mèmes internet"],
        points: 1,
        difficulty: "debutant",
        lessonIdx: null,
      },
      {
        question: "Les actionnaires activistes peuvent :",
        explanation: "Propositions de résolutions climatiques, etc.",
        correct: "Exiger plus de transparence et d'ambition climatique",
        wrong: ["Rien faire", "Interdire le bilan", "Remplacer le PDG sans vote"],
        points: 2,
        difficulty: "intermediaire",
        lessonIdx: null,
      },
      {
        question: "Un bon reporting CSRD est un investissement car :",
        explanation: "Réduit incidents et facilite financements.",
        correct: "Il réduit le risque d'incidents et facilite l'accès au financement",
        wrong: ["Il coûte toujours plus qu'il ne rapporte", "Il est interdit", "Il remplace la stratégie"],
        points: 1,
        difficulty: "debutant",
        lessonIdx: null,
      },
      {
        question: "Les médias et ONG scrutent :",
        explanation: "Contre-vérifications et enquêtes.",
        correct: "La cohérence entre les engagements publics et les données",
        wrong: ["Uniquement les matchs de foot", "Rien", "Les recettes de cuisine"],
        points: 1,
        difficulty: "debutant",
        lessonIdx: null,
      },
      {
        question:
          "Selon ZEI, quel pourcentage de collaborateurs déclare que l'engagement RSE de leur entreprise est un critère plus important que le salaire ?",
        explanation:
          "ZEI cite l'étude Cone Communications : 55 % des collaborateurs placent l'engagement RSE devant le salaire (source : ZEI — En Bref 5).",
        correct: "55 %",
        wrong: ["12 %", "30 %", "98 %"],
        points: 2,
        difficulty: "intermediaire",
        lessonIdx: 0,
      },
    ],
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ——— Sous-thème NOUVEAU : VSME, Omnibus et Value Chain Cap (3 modules) ———
  //
  // Source ZEI : docs/zei-knowledge/csrd/vsme-langage-commun.md (priority high)
  //              docs/zei-knowledge/csrd/en-bref-5-csrd.md (chiffres compétitivité)
  // ═══════════════════════════════════════════════════════════════════════════

  const VSME_SOURCE_URL =
    "https://4495458.fs1.hubspotusercontent-na1.net/hubfs/4495458/Livres%20blancs/Zei%20-%20La%20VSME%20expliqu%C3%A9e%20-%20Le%20nouveau%20langage%20commun%20de%20la%20donn%C3%A9es%20ESG%20en%20Europe.pdf";
  const VSME_SOURCE_LABEL =
    "ZEI — La VSME expliquée : le nouveau langage commun de la donnée ESG (PDF)";

  await seedModuleQuick(stVsme, {
    slug: "csrd-omnibus-value-chain-cap",
    title: "Omnibus 2025 et Value Chain Cap",
    description:
      "Comprendre l'Omnibus de février 2025, la clause Value Chain Cap et le périmètre des questionnaires ESG concernés (fournisseurs, banques, appels d'offres).",
    order: 1,
    estimatedMinutes: 14,
    difficulty: "intermediaire",
    lesson1Title: "Omnibus février 2025 — un nouveau tournant ESG",
    lesson1Content: [
      { type: "heading", level: 2, text: "L'Omnibus marque la convergence ESG européenne" },
      {
        type: "paragraph",
        text:
          "Avec l'Omnibus, le reporting durable européen entre dans une phase d'harmonisation : les référentiels convergent autour de la VSME (Voluntary Standard for SMEs), construite par l'EFRAG. Pensée pour les PME non cotées, elle devient aussi cruciale pour les grandes entreprises qui doivent évaluer leur chaîne de valeur selon ce cadre.",
      },
      {
        type: "callout",
        variant: "important",
        title: "La clause Value Chain Cap",
        text:
          "La Value Chain Cap, peu mise en avant lors de l'Omnibus de février 2025, est l'un de ses aspects les plus structurants : tout questionnaire fournisseur ou bancaire doit désormais utiliser les indicateurs de la VSME. Un langage ESG commun s'installe entre entreprises, investisseurs et fournisseurs.",
      },
      {
        type: "list",
        style: "bullet",
        items: [
          "Côté acheteurs : ils piochent dans les indicateurs VSME pour construire leurs questionnaires.",
          "Côté fournisseurs : ils collectent leurs données ESG une seule fois pour répondre à tous leurs clients.",
          "Auto-régulation par le marché : un fournisseur peut refuser un questionnaire non aligné VSME et signaler l'entreprise auprès de l'UE.",
        ],
      },
      {
        type: "regulatory_note",
        year: 2025,
        companySize: "all",
        text:
          "L'Omnibus a été adopté en février 2025. La Value Chain Cap impose la VSME comme référentiel commun pour les évaluations fournisseurs et bancaires.",
      },
      {
        type: "sources",
        items: [
          { label: VSME_SOURCE_LABEL, url: VSME_SOURCE_URL },
          {
            label: "EFRAG — Sustainability reporting (VSME)",
            url: "https://www.efrag.org/en/projects/sustainability-reporting",
          },
        ],
      },
    ] as ContentBlock[],
    lesson2Title: "Périmètre exact de la Value Chain Cap",
    lesson2Content: [
      { type: "heading", level: 2, text: "Quels questionnaires sont concernés ?" },
      {
        type: "table",
        headers: ["Questionnaire", "Concerné par la Value Chain Cap ?"],
        rows: [
          ["Appels d'offres", "Oui — alignement VSME exigé"],
          ["Questionnaires fournisseurs / prestataires (cadre CSRD acheteur)", "Oui"],
          ["Questionnaires ESG bancaires (financement)", "Oui"],
          ["Questionnaires des investisseurs", "Non"],
          ["Scores RSE / ESG volontaires (favoriser un fournisseur)", "Non"],
        ],
      },
      {
        type: "callout",
        variant: "tip",
        title: "Vu par ZEI",
        text:
          "Les questions posées aux fournisseurs et emprunteurs seront limitées à celles présentes dans la VSME : toutes les questions VSME ne sont pas obligatoires, mais celles qui sont posées doivent correspondre au répertoire VSME — et utiliser les définitions VSME. La VSME devient un répertoire ESG universel : les fournisseurs collectent leurs données une seule fois pour les transmettre à tous leurs clients.",
      },
      {
        type: "paragraph",
        text:
          "Pour les acheteurs, cela permet de gagner du temps : plus besoin de réinventer un questionnaire ESG propriétaire. Pour les fournisseurs, c'est la fin des dizaines de questionnaires différents reçus chaque année.",
      },
      {
        type: "sources",
        items: [{ label: VSME_SOURCE_LABEL, url: VSME_SOURCE_URL }],
      },
    ] as ContentBlock[],
    questions: [
      {
        question: "L'Omnibus européen ayant introduit la Value Chain Cap a été adopté en :",
        explanation:
          "La Value Chain Cap est introduite par l'Omnibus de février 2025 (source : ZEI — La VSME expliquée).",
        correct: "Février 2025",
        wrong: ["Novembre 2022", "Avril 2024", "Janvier 2027"],
        points: 2,
        difficulty: "intermediaire",
        lessonIdx: 0,
      },
      {
        question: "La Value Chain Cap impose que tout questionnaire fournisseur ESG soit aligné sur :",
        explanation:
          "Tout questionnaire fournisseur ou bancaire doit désormais utiliser les indicateurs de la VSME (source : ZEI — La VSME expliquée).",
        correct: "La VSME (Voluntary Standard for SMEs)",
        wrong: ["Le règlement SFDR uniquement", "La norme ISO 14001", "Le seul questionnaire EcoVadis"],
        points: 2,
        difficulty: "intermediaire",
        lessonIdx: 0,
      },
      {
        question: "Lequel de ces questionnaires N'EST PAS concerné par la Value Chain Cap ?",
        explanation:
          "Les questionnaires des investisseurs et les scores RSE volontaires utilisés pour favoriser un fournisseur ne sont pas concernés par la Value Chain Cap (source : ZEI — La VSME expliquée).",
        correct: "Les questionnaires des investisseurs",
        wrong: [
          "Les questionnaires d'appels d'offres",
          "Les questionnaires fournisseurs envoyés par un acheteur soumis à la CSRD",
          "Les questionnaires ESG bancaires liés à un financement",
        ],
        points: 3,
        difficulty: "avance",
        lessonIdx: 1,
      },
      {
        question: "La Value Chain Cap implique pour les fournisseurs :",
        explanation:
          "Un seul exercice VSME permet de répondre à l'ensemble des questionnaires reçus, ce qui en fait un répertoire ESG universel (source : ZEI — La VSME expliquée).",
        correct:
          "De collecter les données ESG une seule fois pour répondre à tous les questionnaires reçus",
        wrong: [
          "De refaire un questionnaire spécifique par client",
          "D'arrêter tout reporting ESG",
          "De passer obligatoirement la certification ISO 27001",
        ],
        points: 2,
        difficulty: "intermediaire",
        lessonIdx: 1,
      },
      {
        question: "L'EFRAG dans le contexte de la VSME :",
        explanation:
          "L'EFRAG a construit la VSME et structure les modules B et C pour couvrir tous les niveaux de maturité des PME (source : ZEI — La VSME expliquée).",
        correct: "Construit et fait évoluer le standard VSME pour l'EFRAG",
        wrong: [
          "Vote les amendes liées à la CSRD",
          "Remplace la Commission européenne",
          "Délivre les labels B Corp",
        ],
        points: 1,
        difficulty: "debutant",
        lessonIdx: 0,
      },
      {
        question: "Le mécanisme de contrôle prévu pour la Value Chain Cap repose sur :",
        explanation:
          "Comme pour le RGPD, le marché s'auto-régule : les fournisseurs peuvent refuser un questionnaire non aligné et signaler l'entreprise auprès de l'UE (source : ZEI — La VSME expliquée).",
        correct: "Une auto-régulation par le marché (signalement à l'UE)",
        wrong: [
          "Un audit fiscal trimestriel obligatoire",
          "Un agrément préalable de chaque questionnaire par la Commission",
          "Une vérification individuelle par l'AMF",
        ],
        points: 2,
        difficulty: "intermediaire",
        lessonIdx: 0,
      },
      {
        question: "Toutes les questions de la VSME doivent-elles être posées aux fournisseurs ?",
        explanation:
          "Non : toutes les questions de la VSME ne doivent pas obligatoirement être posées, mais celles qui le sont doivent appartenir au répertoire VSME et suivre ses définitions (source : ZEI — La VSME expliquée).",
        correct:
          "Non, seules celles qui sont posées doivent appartenir au répertoire VSME",
        wrong: [
          "Oui, toutes les ~80 questions VSME Basic sont obligatoires",
          "Non, l'acheteur peut inventer librement ses questions",
          "Oui, et il faut y ajouter 100 questions propriétaires",
        ],
        points: 3,
        difficulty: "avance",
        lessonIdx: 1,
      },
      {
        question: "L'effet principal de la Value Chain Cap sur la donnée ESG est :",
        explanation:
          "La VSME impose un modèle de données unique avec des définitions communes, ce qui rend la donnée ESG enfin comparable entre entreprises (source : ZEI — La VSME expliquée).",
        correct: "Rendre la donnée ESG comparable grâce à un modèle unique de définitions",
        wrong: [
          "Supprimer toute donnée quantitative",
          "Réserver la donnée ESG aux seules grandes entreprises",
          "Empêcher tout benchmark",
        ],
        points: 2,
        difficulty: "intermediaire",
        lessonIdx: null,
      },
    ],
  });

  await seedModuleQuick(stVsme, {
    slug: "csrd-vsme-basic-complementaire",
    title: "VSME Basic et Complémentaire",
    description:
      "Le référentiel ESG simplifié de l'EFRAG pour les PME : module Basic (~80 indicateurs) et module Complémentaire (publié décembre 2024) — flexibilité, indicateurs chiffrés, anticipation CSRD.",
    order: 2,
    estimatedMinutes: 12,
    difficulty: "debutant",
    lesson1Title: "VSME Basic — ~80 indicateurs ESG pour PME",
    lesson1Content: [
      { type: "heading", level: 2, text: "Un référentiel volontaire conçu par l'EFRAG" },
      {
        type: "paragraph",
        text:
          "La VSME est le référentiel de reporting ESG construit par l'EFRAG, destiné aux PME non cotées. Norme volontaire basée sur les ESRS de la CSRD, elle comporte moins d'indicateurs, mieux choisis pour les spécificités des plus petites structures.",
      },
      {
        type: "table",
        headers: ["Pilier", "Exemples d'indicateurs VSME Basic"],
        rows: [
          ["Environnement", "Consommation d'énergie, émissions de GES, gestion des déchets, consommation d'eau"],
          ["Social", "Santé et sécurité, égalité femmes-hommes, absentéisme, formation"],
          ["Gouvernance", "Lutte contre la corruption, pratiques éthiques, présence d'une politique RSE"],
        ],
      },
      {
        type: "callout",
        variant: "tip",
        title: "Vu par ZEI",
        text:
          "Le module Basic de la VSME comprend environ 80 indicateurs ESG, principalement chiffrés (peu d'indicateurs narratifs). La norme étant volontaire, une PME peut ignorer certains indicateurs sans avoir à justifier leur non-matérialité — une flexibilité bienvenue pour les structures qui démarrent. Sur ZEI, le module VSME B est testable en autonomie.",
      },
      {
        type: "sources",
        items: [
          { label: VSME_SOURCE_LABEL, url: VSME_SOURCE_URL },
          {
            label: "EFRAG — VSME (Voluntary Standard for SMEs)",
            url: "https://www.efrag.org/en/projects/sustainability-reporting",
          },
        ],
      },
    ] as ContentBlock[],
    lesson2Title: "VSME Complémentaire — passer du chiffré au stratégique",
    lesson2Content: [
      { type: "heading", level: 2, text: "Un module publié en décembre 2024" },
      {
        type: "paragraph",
        text:
          "Le module Complémentaire pousse l'exercice plus loin : on ne se contente plus de dire ce que l'on fait, on commence à expliquer pourquoi, comment, avec qui et pour aller où. Ce module s'adresse aux entreprises qui veulent anticiper la CSRD ou répondre à des demandes clients exigeantes.",
      },
      {
        type: "list",
        style: "bullet",
        items: [
          "Indicateurs narratifs : stratégie RSE, engagements, trajectoires de réduction, plans d'action, moyens consacrés.",
          "Documentation des politiques, procédures et gouvernance ESG (politique climat, évaluation fournisseurs, pilotage RSE par le ComEx).",
          "Reporting plus crédible et aligné avec les attentes des investisseurs, donneurs d'ordre et parties prenantes.",
        ],
      },
      {
        type: "regulatory_note",
        year: 2024,
        companySize: "sme",
        text:
          "Le module VSME Complémentaire a été publié en décembre 2024 par l'EFRAG. Il complète le module Basic pour les PME souhaitant anticiper leur passage à la CSRD ou répondre aux donneurs d'ordre.",
      },
      {
        type: "sources",
        items: [{ label: VSME_SOURCE_LABEL, url: VSME_SOURCE_URL }],
      },
    ] as ContentBlock[],
    questions: [
      {
        question: "Le module VSME Basic comporte environ :",
        explanation:
          "Le module Basic de la VSME comprend environ 80 indicateurs ESG, principalement chiffrés (source : ZEI — La VSME expliquée).",
        correct: "80 indicateurs ESG",
        wrong: ["10 indicateurs", "1 700 indicateurs", "4 200 indicateurs"],
        points: 2,
        difficulty: "intermediaire",
        lessonIdx: 0,
      },
      {
        question: "Quel est le statut juridique de la VSME ?",
        explanation:
          "La VSME est une norme volontaire construite par l'EFRAG (source : ZEI — La VSME expliquée).",
        correct: "Norme volontaire conçue par l'EFRAG",
        wrong: [
          "Règlement européen contraignant pour toutes les entreprises",
          "Loi française appliquée uniquement en France",
          "Standard ISO payant",
        ],
        points: 1,
        difficulty: "debutant",
        lessonIdx: 0,
      },
      {
        question: "Le public cible historique de la VSME est :",
        explanation:
          "La VSME a été conçue pour les PME non cotées, avec moins d'indicateurs adaptés à leurs spécificités (source : ZEI — La VSME expliquée).",
        correct: "Les PME non cotées",
        wrong: [
          "Les très grandes entreprises cotées uniquement",
          "Les administrations publiques",
          "Les associations sportives",
        ],
        points: 1,
        difficulty: "debutant",
        lessonIdx: 0,
      },
      {
        question: "Une PME peut-elle ignorer certains indicateurs VSME Basic ?",
        explanation:
          "Oui : la norme étant volontaire, une PME peut ignorer certains indicateurs sans avoir à justifier leur non-matérialité (source : ZEI — La VSME expliquée).",
        correct: "Oui, sans avoir à justifier leur non-matérialité",
        wrong: [
          "Non, tous les indicateurs sont strictement obligatoires",
          "Oui, mais uniquement après audit OTI",
          "Non, sauf si l'EFRAG accorde une dérogation écrite",
        ],
        points: 2,
        difficulty: "intermediaire",
        lessonIdx: 0,
      },
      {
        question: "Le module VSME Complémentaire a été publié en :",
        explanation:
          "Le module Complémentaire a été publié en décembre 2024 par l'EFRAG (source : ZEI — La VSME expliquée).",
        correct: "Décembre 2024",
        wrong: ["Janvier 2018", "Mars 2022", "Octobre 2026"],
        points: 2,
        difficulty: "intermediaire",
        lessonIdx: 1,
      },
      {
        question:
          "Par rapport à VSME Basic, le module VSME Complémentaire ajoute notamment :",
        explanation:
          "Le Complémentaire ajoute des indicateurs narratifs (stratégie, trajectoires, plans d'action) et une documentation des politiques et de la gouvernance ESG (source : ZEI — La VSME expliquée).",
        correct:
          "Des indicateurs narratifs et la documentation des politiques / gouvernance ESG",
        wrong: [
          "Uniquement des indicateurs financiers IFRS",
          "Une obligation de cotation en bourse",
          "Un audit fiscal trimestriel",
        ],
        points: 2,
        difficulty: "intermediaire",
        lessonIdx: 1,
      },
      {
        question: "La VSME comprend principalement :",
        explanation:
          "Contrairement à d'autres modèles, la VSME contient surtout des indicateurs chiffrés et moins de narratifs, ce qui simplifie le travail des PME (source : ZEI — La VSME expliquée).",
        correct: "Des indicateurs chiffrés (peu de narratif)",
        wrong: [
          "Uniquement du narratif libre",
          "Uniquement des photos et schémas",
          "Aucune donnée quantitative",
        ],
        points: 1,
        difficulty: "debutant",
        lessonIdx: 0,
      },
      {
        question: "Le module Complémentaire de la VSME est particulièrement utile pour :",
        explanation:
          "Le Complémentaire vise les PME qui veulent anticiper la CSRD ou répondre à des demandes clients plus exigeantes (source : ZEI — La VSME expliquée).",
        correct:
          "Anticiper la CSRD ou répondre aux donneurs d'ordre / investisseurs",
        wrong: [
          "Remplacer la comptabilité financière",
          "Obtenir automatiquement un label B Corp",
          "Échapper à toute obligation ESG future",
        ],
        points: 2,
        difficulty: "intermediaire",
        lessonIdx: 1,
      },
    ],
  });

  await seedModuleQuick(stVsme, {
    slug: "csrd-vsme-plus-mid-cap",
    title: "Mid Cap #WeAreEurope et VSME+ de ZEI",
    description:
      "Les référentiels intermédiaires entre VSME et CSRD : Mid Cap (170 points) pour les ETI et VSME+ Zei pour préparer la CSRD avec DMA, IRO et gouvernance.",
    order: 3,
    estimatedMinutes: 15,
    difficulty: "avance",
    lesson1Title: "Mid Cap #WeAreEurope — 170 points pour les ETI",
    lesson1Content: [
      { type: "heading", level: 2, text: "Un cadre stratégique pour les ETI hors CSRD" },
      {
        type: "paragraph",
        text:
          "Le collectif #WeAreEurope (dont ZEI fait partie) a développé le modèle Mid Cap. Il conserve la structure simple et harmonisée de la VSME tout en y réintroduisant les éléments stratégiques nécessaires. Public cible : les ETI non encore soumises à la CSRD mais qui souhaitent anticiper ou répondre à leurs donneurs d'ordre.",
      },
      {
        type: "list",
        style: "bullet",
        items: [
          "170 points de données, dont la moitié (~50 %) sont quantitatives, couvrant une partie des ESRS.",
          "Analyse de double matérialité (impact + financier).",
          "Cartographie de la chaîne de valeur et des parties prenantes.",
          "Structure « Politique / Actions / Objectifs ».",
          "Application requirements pour tous les points de données.",
        ],
      },
      {
        type: "callout",
        variant: "tip",
        title: "Vu par ZEI",
        text:
          "Le Mid Cap allège les exigences de la VSME tout en redonnant à l'exercice de reporting une dimension stratégique : il ne s'agit plus seulement de collecter, mais de comprendre où concentrer ses efforts, définir des objectifs et mesurer les résultats.",
      },
      {
        type: "sources",
        items: [
          { label: VSME_SOURCE_LABEL, url: VSME_SOURCE_URL },
          {
            label: "ZEI — En Bref 5 : pourquoi viser plus loin que la conformité (PDF)",
            url: "https://4495458.fs1.hubspotusercontent-na1.net/hubfs/4495458/En%20bref/En%20Bref%205%20-%20CSRD%2c%20ce%20que%20vous%20devez%20comprendre%20avant%20vos%20concurrents%20pour%20rester%20comp%C3%A9titifs%20-%20Zei.pdf",
          },
        ],
      },
    ] as ContentBlock[],
    lesson2Title: "VSME+ ZEI — préparer la CSRD et créer un répertoire ESG universel",
    lesson2Content: [
      { type: "heading", level: 2, text: "VSME+ : un superset robuste" },
      {
        type: "paragraph",
        text:
          "La VSME+ de ZEI est plus complète que la VSME et que le Mid Cap. Elle s'adresse aux entreprises qui veulent un reporting robuste, notamment pour préparer la CSRD.",
      },
      {
        type: "table",
        headers: ["Référentiel", "Contenu clé"],
        rows: [
          ["VSME Basic", "~80 indicateurs ESG (E/S/G), volontaire"],
          ["VSME Complémentaire", "Ajoute narratif, politiques, gouvernance"],
          ["Mid Cap #WeAreEurope", "170 points, DMA, chaîne de valeur, application requirements"],
          ["VSME+ ZEI", "Basic + Complémentaire + DMA + cotation IRO + gouvernance durabilité"],
        ],
      },
      {
        type: "callout",
        variant: "tip",
        title: "Répertoire ESG universel",
        text:
          "La VSME sert aux fournisseurs et emprunteurs à la fois de trame de rapport de durabilité et de répertoire ESG universel : un fichier Excel envoyable aux tiers (clients, banques) sans filtrage, qui permet de répondre à tous les questionnaires reçus.",
      },
      {
        type: "regulatory_note",
        year: 2025,
        companySize: "all",
        text:
          "Sur ZEI, les modules VSME B et C sont testables en autonomie. Le VSME+ s'adresse aux entreprises souhaitant un reporting volontaire robuste, ou se préparer activement à la CSRD.",
      },
      {
        type: "sources",
        items: [{ label: VSME_SOURCE_LABEL, url: VSME_SOURCE_URL }],
      },
    ] as ContentBlock[],
    questions: [
      {
        question: "Le modèle Mid Cap #WeAreEurope contient combien de points de données ?",
        explanation:
          "Le Mid Cap propose 170 points de données, dont environ la moitié quantitatifs (source : ZEI — La VSME expliquée).",
        correct: "170 points",
        wrong: ["12 points", "80 points", "4 200 points"],
        points: 2,
        difficulty: "intermediaire",
        lessonIdx: 0,
      },
      {
        question: "Le Mid Cap s'adresse principalement à :",
        explanation:
          "Le Mid Cap cible les ETI non soumises à la CSRD mais qui souhaitent anticiper ou répondre à leurs donneurs d'ordre (source : ZEI — La VSME expliquée).",
        correct: "Les ETI non encore soumises à la CSRD",
        wrong: [
          "Les micro-entreprises sans salarié",
          "Les multinationales déjà CSRD première vague",
          "Les particuliers",
        ],
        points: 2,
        difficulty: "intermediaire",
        lessonIdx: 0,
      },
      {
        question: "Quelle proportion des points de données du Mid Cap est quantitative ?",
        explanation:
          "Environ la moitié des 170 points de données du Mid Cap sont quantitatifs (source : ZEI — La VSME expliquée).",
        correct: "Environ 50 %",
        wrong: ["100 % (que du quantitatif)", "0 % (que du narratif)", "Environ 5 %"],
        points: 2,
        difficulty: "intermediaire",
        lessonIdx: 0,
      },
      {
        question: "Le Mid Cap inclut notamment :",
        explanation:
          "Le Mid Cap contient l'analyse de double matérialité, la cartographie de la chaîne de valeur, la structure Politique / Actions / Objectifs, et des application requirements (source : ZEI — La VSME expliquée).",
        correct:
          "L'analyse de double matérialité, la chaîne de valeur et la structure Politique / Actions / Objectifs",
        wrong: [
          "Uniquement des KPI financiers IFRS",
          "Aucun élément stratégique",
          "Uniquement des photos d'usines",
        ],
        points: 2,
        difficulty: "intermediaire",
        lessonIdx: 0,
      },
      {
        question: "La VSME+ de ZEI couvre :",
        explanation:
          "La VSME+ regroupe les modules Basic et Complémentaire de la VSME, l'analyse de double matérialité (avec cotation des IRO), la cartographie de la chaîne de valeur et des éléments de gouvernance de la durabilité (source : ZEI — La VSME expliquée).",
        correct:
          "Basic + Complémentaire + DMA + cotation IRO + gouvernance de la durabilité",
        wrong: [
          "Uniquement le module Basic",
          "Uniquement les ESRS sociaux S1–S4",
          "Uniquement la taxonomie européenne",
        ],
        points: 3,
        difficulty: "avance",
        lessonIdx: 1,
      },
      {
        question:
          "Selon ZEI, dire que la VSME devient un « répertoire ESG universel » signifie :",
        explanation:
          "La VSME peut être envoyée au format Excel aux tiers (clients, banques) sans filtrage, permettant de répondre à tous les questionnaires reçus avec une seule collecte (source : ZEI — La VSME expliquée).",
        correct:
          "Collecter ses données ESG une seule fois pour répondre à tous les questionnaires reçus",
        wrong: [
          "Que la VSME remplace toute comptabilité financière",
          "Que la VSME est interdite hors UE",
          "Qu'elle ne sert qu'aux ONG environnementales",
        ],
        points: 3,
        difficulty: "avance",
        lessonIdx: 1,
      },
      {
        question:
          "Quel acronyme décrit l'analyse de cotation incluse dans Mid Cap et VSME+ ?",
        explanation:
          "IRO = Impacts, Risques et Opportunités, exercice central de la double matérialité (source : ZEI — La VSME expliquée).",
        correct: "IRO (Impacts, Risques, Opportunités)",
        wrong: ["KPI (Key Performance Indicators)", "ESG (Environnement, Social, Gouvernance)", "TCO (Total Cost of Ownership)"],
        points: 1,
        difficulty: "debutant",
        lessonIdx: 1,
      },
      {
        question:
          "Pour une entreprise qui souhaite préparer activement la CSRD, le référentiel le plus complet parmi ceux cités est :",
        explanation:
          "La VSME+ de ZEI est plus complète que la VSME (Basic + Complémentaire) et que le Mid Cap, et s'adresse aux entreprises qui doivent se préparer au reporting CSRD (source : ZEI — La VSME expliquée).",
        correct: "VSME+ de ZEI",
        wrong: ["VSME Basic seul", "Aucun (la CSRD ne se prépare pas)", "ISO 9001"],
        points: 2,
        difficulty: "intermediaire",
        lessonIdx: 1,
      },
    ],
  });

  console.log("\n✅ Seed CSRD terminé avec succès !\n");
  await sql.end();
}

seedCSRD().catch((err) => {
  console.error("❌ Erreur lors du seed CSRD :", err);
  process.exit(1);
});
