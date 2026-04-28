/**
 * Seed script — Thème « Obligations 2025-2026 » (idempotent + --reset)
 * Usage : npx tsx scripts/seed-obligations-2025-2026.ts
 * Reset : npx tsx scripts/seed-obligations-2025-2026.ts --reset
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

// ——— Références officielles réutilisées (Légifrance, EUR-Lex, institutions UE/FR) ———
/** JORF du 23 mai 2019 — loi n° 2019-486 (PACTE), réf. JORF RF / Légifrance */
const LF_PACTE_JORF =
  "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000038496102/";
const LF_VIGILANCE_2017 = "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000034290626";
const EUR_TAXO = "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32020R0852";
const EUR_CSRD = "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32022L2464";
const EUR_CSDDD = "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32024L1760";
const LF_CODE_COM = "https://www.legifrance.gouv.fr/codes/id/LEGITEXT000005634379/";
const LF_CODE_ENV = "https://www.legifrance.gouv.fr/codes/id/LEGITEXT000006074220/";
const LF_CODE_CIV = "https://www.legifrance.gouv.fr/codes/id/LEGITEXT000006070721/";
const SP_MISSION = "https://entreprendre.service-public.fr/vosdroits/F37408";
const EC_TAXO_PAGE =
  "https://finance.ec.europa.eu/sustainable-finance/overview/sustainable-finance-taxonomy_en";
const EC_CSRD_PAGE =
  "https://finance.ec.europa.eu/capital-markets-union-and-financial-markets/company-reporting-and-auditing/company-reporting/corporate-sustainability-reporting_en";
const EC_SF = "https://finance.ec.europa.eu/sustainable-finance_en";
const ADEME_PORTAL = "https://bilans-ges.ademe.fr/";
const AMF_FD = "https://www.amf-france.org/fr/espace-epargne-entreprises/finance-durable";
/** Zei — La VSME expliquée (PDF), aligné sur docs/zei-knowledge/INDEX.md */
const ZEI_VSME_LB_PDF =
  "https://4495458.fs1.hubspotusercontent-na1.net/hubfs/4495458/Livres%20blancs/Zei%20-%20La%20VSME%20expliqu%C3%A9e%20-%20Le%20nouveau%20langage%20commun%20de%20la%20donn%C3%A9es%20ESG%20en%20Europe.pdf";

async function seedObligations() {
  const reset = process.argv.includes("--reset");
  const THEME_SLUG = "obligations-2025-2026";

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

  console.log("🌱 Démarrage du seed Obligations 2025-2026...\n");

  const themeId = await getOrCreateTheme({
    slug: THEME_SLUG,
    title: "Obligations réglementaires 2025-2026",
    description:
      "Loi PACTE et société à mission, DPEF, taxonomie européenne, devoir de vigilance, bilan GES (BEGES), calendriers 2025-2026 et secteurs prioritaires, VSME (EFRAG), Omnibus et Value Chain Cap, articulation avec la CSRD.",
    icon: "Calendar",
    color: "#f97316",
    order: 4,
  });

  const stPacte = await getOrCreateSubtheme({
    themeId,
    slug: "loi-pacte-entreprise-mission",
    title: "Loi PACTE et entreprise à mission",
    description:
      "Loi n° 2019-486 du 22 mai 2019 : transformation des entreprises, article 1833 du Code civil et qualité de société à mission au Code de commerce.",
    order: 1,
  });
  const stDpef = await getOrCreateSubtheme({
    themeId,
    slug: "dpef-performance-extra-financiere",
    title: "DPEF — Déclaration de performance extra-financière",
    description:
      "Obligations du Code de commerce pour certaines sociétés : informations environnementales, sociales et anticorruption avant généralisation du reporting de durabilité (CSRD).",
    order: 2,
  });
  const stTaxo = await getOrCreateSubtheme({
    themeId,
    slug: "taxonomie-europeenne",
    title: "Taxonomie européenne (activités durables)",
    description:
      "Règlement (UE) 2020/852 : classification des activités économiques « vertes », critères techniques et liens avec l'information financière durable.",
    order: 3,
  });
  const stVig = await getOrCreateSubtheme({
    themeId,
    slug: "devoir-de-vigilance",
    title: "Devoir de vigilance (France et Union européenne)",
    description:
      "Loi française 2017-399, plan de vigilance, et directive européenne 2024/1760 sur le devoir de diligence en matière de durabilité.",
    order: 4,
  });
  const stBeges = await getOrCreateSubtheme({
    themeId,
    slug: "bilan-ges-obligatoire",
    title: "Bilan GES obligatoire (France)",
    description:
      "Bilans d'émissions de gaz à effet de serre (BEGES) : assujettissement, contenu, plan de transition et publication.",
    order: 5,
  });
  const stCal = await getOrCreateSubtheme({
    themeId,
    slug: "calendrier-secteurs-csrd",
    title: "Calendrier 2025-2026, secteurs prioritaires et CSRD",
    description:
      "Jalons nationaux et européens, secteurs à enjeu renforcé, et lien entre CSRD, taxonomie et autres obligations.",
    order: 6,
  });
  const stVsme = await getOrCreateSubtheme({
    themeId,
    slug: "vsme-omnibus-value-chain",
    title: "VSME, Omnibus et Value Chain Cap",
    description:
      "Référentiel volontaire EFRAG pour les PME, modules Basic et Complémentaire, clause Value Chain Cap de l'Omnibus et alignement des questionnaires fournisseurs et bancaires (livre blanc Zei).",
    order: 7,
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MODULES (13) — 6 sous-thèmes × 2 modules + 1 module VSME (7e sous-thème), 2 leçons + 8 MCQ / module
  // ═══════════════════════════════════════════════════════════════════════════

  await seedModuleQuick(stPacte, {
    slug: "obl-pacte-cadre-loi-2019-486",
    title: "Loi PACTE : cadre et finalités",
    description: "Texte fondateur, modernisation du droit des entreprises et intégration d'enjeux extra-financiers.",
    order: 1,
    estimatedMinutes: 14,
    difficulty: "debutant",
    lesson1Title: "Loi n° 2019-486 et grands chantiers pour les entreprises",
    lesson1Content: [
      { type: "heading", level: 2, text: "Une loi structurante pour la croissance et la transformation" },
      {
        type: "paragraph",
        text: "La loi relative à la croissance et à la transformation des entreprises, dite « PACTE », a été promulguée le 23 mai 2019. Elle modifie de nombreux codes (commerce, travail, énergie, etc.) pour simplifier la vie des entreprises tout en renforçant certaines exigences de responsabilité.",
      },
      {
        type: "list",
        style: "bullet",
        items: [
          "Réforme du droit des sociétés (capitaux, gouvernance, transmission).",
          "Renforcement des droits des salariés dans les entreprises (épargne salariale, formation).",
          "Introduction explicite de la prise en compte d'enjeux sociaux et environnementaux dans la gestion (notamment via l'article 1833 du Code civil).",
        ],
      },
      {
        type: "callout",
        variant: "info",
        title: "Lecture opérationnelle",
        text: "Pour un responsable RSE ou conformité, la PACTE n'est pas un texte « climat » isolé : elle pose le cadre juridique dans lequel s'inscrivent ensuite DPEF, BEGES, CSRD et la société à mission.",
      },
      {
        type: "regulatory_note",
        year: 2025,
        companySize: "all",
        text: "Les dispositions applicables à votre entité dépendent de sa forme juridique, de sa taille et de son secteur ; croisez toujours le texte légal avec les guides administratifs à jour.",
      },
      {
        type: "sources",
        items: [
          { label: "Loi n° 2019-486 du 22 mai 2019 (PACTE) — Légifrance (JORF)", url: LF_PACTE_JORF },
          { label: "Code civil — plan de texte (art. 1833 et sociétés)", url: LF_CODE_CIV },
          { label: "Code de commerce — plan de texte", url: LF_CODE_COM },
        ],
      },
    ],
    lesson2Title: "Article 1833 du Code civil et « intérêt social » élargi",
    lesson2Content: [
      { type: "heading", level: 2, text: "Gérer la société au regard de ses impacts" },
      {
        type: "paragraph",
        text: "L'article 1833 du Code civil dispose que la société est gérée dans son intérêt social, en prenant en considération les enjeux sociaux et environnementaux de son activité. Cette formulation s'applique aux formes sociétaires concernées par le code civil et marque une attente de diligence au-delà du seul profit financier à court terme.",
      },
      {
        type: "table",
        headers: ["Angle", "Conséquence pratique"],
        rows: [
          ["Conseil d'administration / surveillance", "Information sur risques climatiques et sociaux dans les dossiers récurrents."],
          ["Documentation contractuelle", "Cohérence entre clauses d'achats, chartes fournisseurs et objectifs extra-financiers."],
          ["Litiges", "Argumentaire possible sur la prise en compte raisonnable des externalités dans les décisions."],
        ],
      },
      {
        type: "callout",
        variant: "tip",
        title: "Alignement interne",
        text: "Reliez explicitement vos procédures internes (risques, achats, RH) au cadre de l'article 1833 pour faciliter la transition vers un reporting CSRD ou une société à mission.",
      },
      {
        type: "sources",
        items: [
          { label: "Code civil — plan de texte (Légifrance)", url: LF_CODE_CIV },
          { label: "Loi PACTE — texte officiel (Légifrance)", url: LF_PACTE_JORF },
          { label: "Service-Public — entreprise / société à mission (fiche F37408)", url: SP_MISSION },
        ],
      },
    ],
    questions: [
      qq("La loi PACTE est promulguée en :", "La loi n° 2019-486 est promulguée le 23 mai 2019.", "2019", ["2015", "2017", "2022"], 1, "debutant", 0),
      qq("L'article 1833 du Code civil impose notamment :", "Le texte lie gestion de la société, intérêt social et prise en compte d'enjeux sociaux et environnementaux.", "Gérer dans l'intérêt social en considérant enjeux sociaux et environnementaux", ["Ignorer les parties prenantes", "Interdire toute distribution de dividendes", "Supprimer les comités"], 2, "intermediaire", 1),
      qq("La PACTE modifie notamment :", "Le droit des sociétés et d'autres branches du droit économique.", "Le Code de commerce et d'autres codes", ["Uniquement le code pénal", "Seulement le code de la route", "Uniquement le code du sport"], 1, "debutant", 0),
      qq("L'intérêt social au sens renforcé :", "Il s'agit d'un cadre juridique de gestion, pas d'un simple slogan marketing.", "Un cadre juridique de gestion sociétaire", ["Uniquement un label privé", "Une recommandation ISO obligatoire", "Une taxe carbone"], 2, "intermediaire", 1),
      qq("La société à mission relève principalement du :", "Les règles détaillées figurent au Code de commerce (sociétés commerciales).", "Code de commerce", ["Code de la construction", "Code forestier", "Code des postes"], 1, "debutant", null),
      qq("La PACTE est-elle limitée aux grandes entreprises ?", "De nombreuses dispositions s'appliquent selon la forme et la taille ; certaines obligations ciblent plutôt les grands groupes.", "Non : périmètre variable selon dispositions", ["Oui, exclusivement +5000 salariés", "Oui, uniquement cotées", "Non, uniquement associations"], 2, "avance", null),
      qq("Un levier de mise en œuvre de l'article 1833 est :", "La cartographie des risques et décisions du conseil.", "Relier procédures de gouvernance et enjeux ESG", ["Supprimer le dialogue social", "Réduire le capital sans information", "Ignorer la chaîne de valeur"], 2, "intermediaire", 0),
      qq("La PACTE se substitue-t-elle à la CSRD ?", "Ce sont des textes distincts ; la CSRD est une directive européenne de reporting de durabilité.", "Non : cadres complémentaires", ["Oui intégralement", "Oui pour les PME uniquement", "Non, la CSRD n'existe pas"], 3, "avance", null),
    ],
  });

  await seedModuleQuick(stPacte, {
    slug: "obl-pacte-societe-mission-statuts",
    title: "Société à mission : statuts, comité et tiers",
    description: "Conditions pour adopter la qualité de société à mission, suivi et contrôle par un tiers indépendant.",
    order: 2,
    estimatedMinutes: 16,
    difficulty: "intermediaire",
    lesson1Title: "Raison d'être, objectifs et inscription statutaire",
    lesson1Content: [
      { type: "heading", level: 2, text: "Trois éléments statutaires clés" },
      {
        type: "paragraph",
        text: "La qualité de société à mission repose sur l'inscription dans les statuts d'une raison d'être, d'objectifs sociaux et environnementaux précis et évaluables, et de modalités de suivi de leur mise en œuvre. La forme juridique reste celle d'une société commerciale classique (SA, SAS, SARL, etc.).",
      },
      {
        type: "list",
        style: "ordered",
        items: [
          "Définir la raison d'être : le projet de long terme dans lequel s'inscrit l'objet social.",
          "Fixer des objectifs sociaux et environnementaux mesurables.",
          "Prévoir la gouvernance du suivi (comité de mission pour les effectifs supérieurs au seuil légal).",
        ],
      },
      {
        type: "regulatory_note",
        year: 2026,
        companySize: "sme",
        text: "Les PME peuvent adopter la société à mission ; les obligations de comité de mission sont liées aux effectifs (seuil légal — vérifier le texte et la fiche service-public à jour).",
      },
      {
        type: "sources",
        items: [
          { label: "Société à mission — Service-Public Entreprendre (F37408)", url: SP_MISSION },
          { label: "Code de commerce — plan de texte (Légifrance)", url: LF_CODE_COM },
          { label: "Loi PACTE — JORF (Légifrance)", url: LF_PACTE_JORF },
        ],
      },
    ],
    lesson2Title: "Rapport de mission et tiers indépendant",
    lesson2Content: [
      { type: "heading", level: 2, text: "Contrôle périodique et transparence" },
      {
        type: "paragraph",
        text: "La société à mission doit établir un rapport sur la mise en œuvre de sa mission. Un tiers indépendant vérifie, au moins une fois tous les deux ans, l'exécution des actions relatives à la raison d'être et aux objectifs sociaux et environnementaux. Les actionnaires et parties prenantes s'appuient sur ces éléments pour juger de la cohérence entre discours et pratiques.",
      },
      {
        type: "callout",
        variant: "warning",
        title: "Réputation",
        text: "Un rapport de mission superficiel ou un tiers peu crédible exposent à des critiques d'« impact washing » : anticipez la qualité des preuves et des indicateurs.",
      },
      { type: "divider" },
      {
        type: "sources",
        items: [
          { label: "Service-Public — qualité de société à mission", url: SP_MISSION },
          { label: "Code de commerce — Légifrance", url: LF_CODE_COM },
          { label: "Loi PACTE — texte officiel", url: LF_PACTE_JORF },
        ],
      },
    ],
    questions: [
      qq("La société à mission est-elle une nouvelle forme juridique ?", "Il s'agit d'une qualité attachée à une société existante.", "Non : qualité sur une forme classique", ["Oui, uniquement SAS", "Oui, coopérative obligatoire", "Oui, association"], 1, "debutant", 0),
      qq("La raison d'être doit être :", "Elle traduit le projet de long terme dans lequel s'inscrit l'objet social.", "Inscrite dans les statuts", ["Orale uniquement", "Secrète", "Facultative sans suivi"], 2, "intermediaire", 0),
      qq("Le comité de mission est requis notamment lorsque :", "Le seuil d'effectifs déclenche l'obligation de comité (voir texte et fiche officielle).", "L'effectif dépasse le seuil légal prévu", ["Jamais", "Uniquement pour les associations", "Dès 1 salarié"], 2, "intermediaire", 1),
      qq("La vérification par un tiers indépendant a lieu :", "Au minimum une fois tous les deux ans selon le cadre légal.", "Au moins tous les deux ans", ["Chaque mois", "Une fois à vie", "Tous les 10 ans"], 1, "debutant", 1),
      qq("Les objectifs de mission doivent être :", "Ils doivent être évaluables pour permettre un suivi sérieux.", "Précis et évaluables", ["Vagues", "Uniquement financiers", "Sans indicateur"], 2, "intermediaire", 0),
      qq("Une SAS peut-elle devenir société à mission ?", "La qualité est ouverte aux formes de sociétés commerciales prévues par le texte.", "Oui si conditions statutaires remplies", ["Non jamais", "Uniquement SA", "Uniquement à l'étranger"], 1, "debutant", null),
      qq("Le rapport de mission sert notamment à :", "Informer sur la mise en œuvre effective de la mission.", "Documenter l'exécution des objectifs statutaires", ["Remplacer les comptes annuels", "Supprimer l'AG", "Éviter la fiscalité"], 2, "avance", null),
      qq("Lien avec l'article 1833 :", "Les deux logiques se renforcent mutuellement sur la prise en compte des enjeux.", "Complémentarité entre gestion sociétaire et mission", ["Opposition totale", "Identité stricte", "Incompatibilité"], 3, "avance", 1),
    ],
  });

  await seedModuleQuick(stDpef, {
    slug: "obl-dpef-perimetre-code-commerce",
    title: "DPEF : périmètre légal et contenu",
    description: "Articles L. 232-6-3 et suivants du Code de commerce : sociétés concernées et thématiques à couvrir.",
    order: 1,
    estimatedMinutes: 15,
    difficulty: "intermediaire",
    lesson1Title: "Qui publie une DPEF en France ?",
    lesson1Content: [
      { type: "heading", level: 2, text: "Seuils et filière cotée" },
      {
        type: "paragraph",
        text: "La déclaration de performance extra-financière (DPEF) s'adresse aux sociétés qui dépassent certains seuils de taille et, selon les cas, aux sociétés cotées. Le détail des critères (bilan, chiffre d'affaires, effectifs) est fixé par le Code de commerce et doit être relu sur la version consolidée à jour sur Légifrance.",
      },
      {
        type: "callout",
        variant: "important",
        title: "Articulation CSRD",
        text: "Pour les sociétés entrant dans le champ de la directive (UE) 2022/2464 (CSRD), le rapport de durabilité tend à structurer l'information extra-financière au niveau européen ; la DPEF reste une référence historique pour comprendre les attentes françaises en matière de publication.",
      },
      {
        type: "regulatory_note",
        year: 2025,
        companySize: "large",
        text: "Les grandes sociétés et sociétés cotées sont en première ligne pour l'alignement entre exigences nationales historiques et reporting CSRD / normes ESRS.",
      },
      {
        type: "sources",
        items: [
          { label: "Code de commerce — plan de texte (DPEF : section pertinente)", url: LF_CODE_COM },
          { label: "Directive (UE) 2022/2464 (CSRD) — EUR-Lex", url: EUR_CSRD },
          { label: "Corporate sustainability reporting — Commission européenne", url: EC_CSRD_PAGE },
        ],
      },
    ],
    lesson2Title: "Thématiques : environnement, social, anticorruption",
    lesson2Content: [
      { type: "heading", level: 2, text: "Contenu attendu" },
      {
        type: "paragraph",
        text: "La DPEF doit présenter la manière dont la société prend en compte les conséquences de son activité sur l'environnement et les conditions sociales, ainsi que les engagements en matière de société civile, de respect des droits humains et de lutte contre la corruption. Les politiques, résultats, risques et indicateurs sont attendus avec une logique de cohérence d'ensemble.",
      },
      {
        type: "table",
        headers: ["Famille d'information", "Exemples d'indicateurs"],
        rows: [
          ["Climat / énergie", "Consommations, émissions GES, trajectoires de réduction."],
          ["Social", "Formation, diversité, conditions de santé et sécurité."],
          ["Anticorruption", "Cartographie des risques, procédures, formations ciblées."],
        ],
      },
      {
        type: "sources",
        items: [
          { label: "Code de commerce — Légifrance", url: LF_CODE_COM },
          { label: "CSRD — texte sur EUR-Lex", url: EUR_CSRD },
          { label: "Finance durable — AMF (France)", url: AMF_FD },
        ],
      },
    ],
    questions: [
      qq("La DPEF relève principalement du :", "Les règles figurent dans le Code de commerce.", "Code de commerce", ["Code rural", "Code des transports", "Code de la route"], 1, "debutant", 0),
      qq("La CSRD est :", "Directive européenne 2022/2464.", "Une directive européenne sur le reporting de durabilité", ["Un règlement comptable français", "Une norme ISO", "Un label B Corp"], 2, "intermediaire", 0),
      qq("Les thématiques DPEF incluent notamment :", "Environnement, social, droits humains et anticorruption.", "Environnement, social et lutte contre la corruption", ["Uniquement fiscal", "Uniquement maritime", "Uniquement sport"], 2, "intermediaire", 1),
      qq("L'EUR-Lex permet de :", "Consulter les textes de l'Union en version officielle.", "Accéder aux textes officiels de l'UE", ["Payer des taxes", "Publier des comptes", "Déposer des marques"], 1, "debutant", 0),
      qq("La Commission européenne publie sur son site :", "Guides et pages thématiques sur le reporting de durabilité.", "Des explications sur la CSRD et la finance durable", ["Les bilans fiscaux français", "Les statuts types SAS", "Les permis de construire"], 2, "intermediaire", null),
      qq("Une société cotée est typiquement :", "Le champ légal combine taille et critères de marché.", "Plus exposée aux obligations de transparence", ["Exemptée de toute publication", "Dispensée de gouvernance", "Hors champ social"], 2, "avance", null),
      qq("Le passage DPEF → CSRD implique souvent :", "Harmonisation avec ESRS et contrôles renforcés.", "Révision du périmètre d'information et des contrôles", ["Suppression de toute donnée ESG", "Interdiction du scope 3", "Fin du droit français"], 3, "avance", 1),
      qq("L'AMF en France traite notamment :", "Information des marchés et finance durable.", "Information des investisseurs et finance durable", ["Homologation des véhicules", "Aides agricoles", "Visas d'urbanisme"], 1, "debutant", null),
    ],
  });

  await seedModuleQuick(stDpef, {
    slug: "obl-dpef-publication-ag",
    title: "Publication, assemblée générale et garde-fous",
    description: "Modalités de mise à disposition des actionnaires et liens avec la gouvernance.",
    order: 2,
    estimatedMinutes: 12,
    difficulty: "debutant",
    lesson1Title: "Calendrier de publication et lien avec l'AG",
    lesson1Content: [
      { type: "heading", level: 2, text: "Rythme annuel" },
      {
        type: "paragraph",
        text: "La DPEF est actualisée chaque exercice et communiquée selon les modalités prévues par le Code de commerce, en lien avec les documents préparatoires à l'assemblée générale des actionnaires. La cohérence avec le rapport de gestion et, le cas échéant, avec les informations réglementées diffusées en marché est un point de vigilance pour les sociétés cotées.",
      },
      {
        type: "list",
        style: "bullet",
        items: [
          "Contrôler la qualité des données sources (finance, RH, HSE, achats).",
          "Tracer les méthodes d'estimation (notamment pour les indicateurs carbone).",
          "Préparer les réponses aux questions d'actionnaires et d'analystes.",
        ],
      },
      {
        type: "sources",
        items: [
          { label: "Code de commerce — Légifrance", url: LF_CODE_COM },
          { label: "CSRD — EUR-Lex", url: EUR_CSRD },
          { label: "Finance durable — Commission européenne", url: EC_SF },
        ],
      },
    ],
    lesson2Title: "Contrôles internes et assurance",
    lesson2Content: [
      { type: "heading", level: 2, text: "Fiabilité de l'information" },
      {
        type: "paragraph",
        text: "Même avant les exigences d'assurance limitée ou raisonnable prévues dans certains cas par la chaîne CSRD, les bonnes pratiques recommandent des revues internes (audit interne, contrôle de gestion) et la documentation des contrôles sur les données extra-financières.",
      },
      {
        type: "callout",
        variant: "tip",
        title: "Continuité",
        text: "Conservez la traçabilité des jeux de données utilisés en DPEF : ils serviront de socle pour les repères de double matérialité et les ESRS.",
      },
      {
        type: "sources",
        items: [
          { label: "Corporate sustainability reporting — Commission", url: EC_CSRD_PAGE },
          { label: "Directive CSRD — EUR-Lex", url: EUR_CSRD },
          { label: "Code de commerce — Légifrance", url: LF_CODE_COM },
        ],
      },
    ],
    questions: [
      qq("La DPEF est liée au :", "Le cadre français rattache la publication aux obligations sociétaires.", "Code de commerce et vie de la société", ["Code de la pêche", "Code minier", "Code du cinéma"], 1, "debutant", 0),
      qq("La CSRD concerne notamment :", "Reporting de durabilité des entreprises dans le champ de la directive.", "Information de durabilité des entreprises concernées", ["Uniquement les particuliers", "Les élections locales", "Les permis de conduire"], 2, "intermediaire", 0),
      qq("Une bonne pratique de gouvernance est :", "La relecture croisée finance / RSE avant publication.", "Revue croisée des données avant diffusion publique", ["Publier sans relecture", "Supprimer les annexes", "Diffuser uniquement en interne"], 2, "intermediaire", 1),
      qq("L'assemblée générale :", "Les actionnaires peuvent questionner la direction sur le contenu extra-financier.", "Peut être un lieu de dialogue sur la DPEF", ["Ignore la stratégie", "Interdit les questions ESG", "Remplace le conseil"], 1, "debutant", 0),
      qq("La Commission UE sur la finance durable :", "Site institutionnel de référence pour la taxonomie et la CSRD.", "Centralise guides et textes d'application", ["Gère les impôts français", "Délivre les visas", "Contrôle le code du travail français"], 2, "intermediaire", null),
      qq("L'AMF peut être utile pour :", "Cadre français sur information marché et ESG.", "Comprendre attentes marché et ESG en France", ["Homologuer les normes ISO", "Fixer le SMIC", "Délivrer AOC"], 2, "avance", null),
      qq("Les données carbone en DPEF doivent :", "Méthodes et périmètres doivent être documentés.", "Être traçables et documentées", ["Être secrètes", "Ignorer le scope 3 toujours", "Rester orales"], 2, "intermediaire", 1),
      qq("EUR-Lex sert à :", "Consulter le droit de l'Union.", "Vérifier les textes européens officiels", ["Publier des annonces légales", "Gérer la paie", "Déclarer la TVA"], 1, "debutant", null),
    ],
  });

  await seedModuleQuick(stTaxo, {
    slug: "obl-taxonomie-reglement-852",
    title: "Règlement (UE) 2020/852 : objectifs et six environnementaux",
    description: "Classification des activités économiques durables au sens de l'Union européenne.",
    order: 1,
    estimatedMinutes: 14,
    difficulty: "intermediaire",
    lesson1Title: "Finalité : orienter les flux financiers durables",
    lesson1Content: [
      { type: "heading", level: 2, text: "Un langage commun pour les marchés" },
      {
        type: "paragraph",
        text: "Le règlement (UE) 2020/852 établit les critères pour déterminer dans quelle mesure une activité économique est considérée comme durable sur le plan environnemental. Il s'appuie sur six objectifs environnementaux (dont atténuation et adaptation au changement climatique) et sur des actes délégués précisant les critères d'examen technique.",
      },
      {
        type: "list",
        style: "bullet",
        items: [
          "Contribution substantielle à un objectif environnemental.",
          "Absence de préjudice important (DNSH) aux autres objectifs.",
          "Respect de garanties sociales minimales (travailleurs, conventions internationales).",
        ],
      },
      {
        type: "sources",
        items: [
          { label: "Règlement (UE) 2020/852 — EUR-Lex", url: EUR_TAXO },
          { label: "Taxonomy Regulation — Commission européenne", url: EC_TAXO_PAGE },
          { label: "Finance durable — Commission", url: EC_SF },
        ],
      },
    ],
    lesson2Title: "Actes délégués et critères techniques",
    lesson2Content: [
      { type: "heading", level: 2, text: "Évolution du cadre technique" },
      {
        type: "paragraph",
        text: "La Commission adopte des actes délégués sectoriels (climat, eau, pollution, économie circulaire, biodiversité) qui précisent les seuils et méthodes. Les entreprises et investisseurs doivent suivre les versions consolidées publiées sur EUR-Lex et les Q&A publiées par la Commission.",
      },
      {
        type: "regulatory_note",
        year: 2026,
        companySize: "large",
        text: "Les grands émetteurs d'information financière durable croisent souvent taxonomie, SFDR et CSRD : harmonisez définitions et périmètres au niveau groupe.",
      },
      {
        type: "callout",
        variant: "info",
        title: "DNSH",
        text: "« Do no significant harm » : une activité ne peut être « verte » pour un objectif si elle dégrade fortement un autre objectif environnemental.",
      },
      {
        type: "sources",
        items: [
          { label: "EUR-Lex — règlement taxonomie (2020/852)", url: EUR_TAXO },
          { label: "Sustainable finance taxonomy — Commission", url: EC_TAXO_PAGE },
          { label: "CSRD — EUR-Lex (articulation information)", url: EUR_CSRD },
        ],
      },
    ],
    questions: [
      qq("Le règlement taxonomie porte sur :", "2020/852 établit une classification d'activités durables.", "La classification d'activités économiques durables", ["Les taux d'intérêt BCE", "Les normes IFRS seules", "Le droit fiscal français uniquement"], 2, "intermediaire", 0),
      qq("DNSH signifie :", "Do no significant harm — ne pas causer de préjudice important.", "Ne pas causer de préjudice important aux autres objectifs", ["Données non signées", "Directive nationale simple", "Déclaration non soumise"], 2, "intermediaire", 1),
      qq("Les textes officiels de l'UE se consultent sur :", "EUR-Lex est le portail officiel.", "EUR-Lex", ["Wikipedia uniquement", "IMDb", "Stack Overflow"], 1, "debutant", 0),
      qq("La taxonomie couvre notamment :", "Six objectifs environnementaux dont climat.", "Atténuation et adaptation climatiques, entre autres", ["Uniquement le social", "Uniquement la TVA", "Uniquement le droit du travail"], 2, "intermediaire", 0),
      qq("La Commission européenne :", "Elle pilote les actes délégués et guides.", "Adopte des actes délégués de critères techniques", ["Abroge le Parlement", "Fixe le SMIC français", "Gère les permis de pêche"], 2, "avance", null),
      qq("La CSRD et la taxonomie sont :", "Elles s'articulent dans l'écosystème de reporting durable.", "Complémentaires pour l'information de marché", ["Identiques mot pour mot", "Incompatibles", "Réservées aux USA"], 2, "intermediaire", null),
      qq("Un investisseur utilisera la taxonomie pour :", "Identifier part d'activités alignées.", "Évaluer l'alignement d'activités avec critères UE", ["Calculer l'IS uniquement", "Remplacer les comptes IFRS", "Supprimer le risque"], 2, "avance", 1),
      qq("Les garanties sociales minimales :", "Prévues par le règlement pour l'alignement.", "Font partie du test d'alignement taxonomique", ["N'existent pas", "Sont optionnelles toujours", "Concernent uniquement les États"], 1, "debutant", null),
    ],
  });

  await seedModuleQuick(stTaxo, {
    slug: "obl-taxonomie-entreprise-kpis",
    title: "KPIs d'alignement et communication",
    description: "Part de chiffre d'affaires aligné, Capex/Opex et transparence vers investisseurs.",
    order: 2,
    estimatedMinutes: 13,
    difficulty: "avance",
    lesson1Title: "Indicateurs courants (CA, CapEx, OpEx)",
    lesson1Content: [
      { type: "heading", level: 2, text: "Mesurer l'alignement" },
      {
        type: "paragraph",
        text: "Les entreprises soumises à certaines obligations d'information (notamment via la chaîne SFDR / rapports annuels) peuvent être amenées à publier la part de leur chiffre d'affaires, CapEx ou OpEx considérée comme alignée avec la taxonomie. Les définitions précises et périmètres comptables doivent suivre les actes d'application et les orientations de la Commission.",
      },
      {
        type: "table",
        headers: ["Indicateur", "Question clé"],
        rows: [
          ["CA aligné", "Quels produits / services satisfont les critères techniques ?"],
          ["CapEx aligné", "Quels investissements contribuent à la transition ?"],
          ["OpEx aligné", "Quelles dépenses d'exploitation sont éligibles ?"],
        ],
      },
      {
        type: "sources",
        items: [
          { label: "Taxonomie — Commission européenne", url: EC_TAXO_PAGE },
          { label: "Règlement (UE) 2020/852 — EUR-Lex", url: EUR_TAXO },
          { label: "Finance durable — AMF", url: AMF_FD },
        ],
      },
    ],
    lesson2Title: "Pièges : greenwashing et données fragiles",
    lesson2Content: [
      { type: "heading", level: 2, text: "Qualité des preuves" },
      {
        type: "paragraph",
        text: "Un pourcentage d'alignement élevé sans documentation des hypothèses techniques, des périmètres géographiques et des sources de données expose à des contestations réglementaires et à une perte de confiance des investisseurs. Croisez les exigences AMF/ESMA avec le cadre européen.",
      },
      {
        type: "callout",
        variant: "warning",
        title: "Cohérence CSRD",
        text: "Les informations taxonomie doivent être cohérentes avec les disclosures climat et risques du rapport de durabilité (ESRS) lorsque le périmètre CSRD s'applique.",
      },
      {
        type: "sources",
        items: [
          { label: "CSRD — EUR-Lex", url: EUR_CSRD },
          { label: "Corporate sustainability reporting — Commission", url: EC_CSRD_PAGE },
          { label: "Finance durable — AMF", url: AMF_FD },
        ],
      },
    ],
    questions: [
      qq("Un KPI courant de taxonomie est :", "CA, CapEx ou OpEx alignés.", "Part de CA / CapEx / OpEx aligné", ["Uniquement l'effectif", "Uniquement l'âge moyen", "Uniquement la marge brute"], 2, "intermediaire", 0),
      qq("DNSH s'applique :", "Aux autres objectifs environnementaux.", "Pour éviter un préjudice important aux autres objectifs", ["Uniquement au social", "Jamais", "Uniquement aux banques centrales"], 2, "intermediaire", 1),
      qq("EUR-Lex contient :", "Versions officielles des actes UE.", "Les actes juridiques de l'Union", ["Les statuts des PME", "Les comptes bancaires", "Les résultats sportifs"], 1, "debutant", 0),
      qq("L'AMF en France :", "Autorité des marchés financiers.", "Surveille l'information des marchés financiers", ["Gère les hôpitaux", "Délivre permis de chasse", "Fixe les APE"], 1, "debutant", null),
      qq("La Commission publie :", "Guides et actes délégués.", "Actes délégués et orientations sur la taxonomie", ["Les bilans médicaux", "Les permis bâtiment", "Les contrats de mariage"], 2, "intermediaire", null),
      qq("L'alignement taxonomie sans preuve :", "Risque de greenwashing.", "Expose à des risques de réputation et conformité", ["Est sans risque", "Est interdit d'écrire", "Est neutre"], 2, "avance", 1),
      qq("ESRS et taxonomie :", "Informations complémentaires dans le rapport de durabilité.", "Doivent être cohérentes quand le champ CSRD s'applique", ["S'excluent toujours", "Fusionnent en un seul chiffre", "Sont illégaux"], 3, "avance", null),
      qq("Le règlement 2020/852 modifie notamment :", "Le règlement SFDR 2019/2088 pour cohérence.", "Le cadre SFDR sur les produits financiers durables", ["Le code pénal français", "Le droit fiscal US", "La constitution française"], 2, "avance", 0),
    ],
  });

  await seedModuleQuick(stVig, {
    slug: "obl-vigilance-loi-2017-399-france",
    title: "Loi française 2017-399 : plan de vigilance",
    description: "Obligation d'établir, de mettre en œuvre et de rendre public un plan de vigilance pour certaines grandes entreprises.",
    order: 1,
    estimatedMinutes: 15,
    difficulty: "intermediaire",
    lesson1Title: "Champ d'application et cinq blocs obligatoires",
    lesson1Content: [
      { type: "heading", level: 2, text: "Une obligation née en 2017" },
      {
        type: "paragraph",
        text: "La loi n° 2017-399 du 27 mars 2017 impose à certaines sociétés d'établir et de mettre en œuvre un plan de vigilance visant l'identification des risques et la prévention des atteintes graves aux droits humains et libertés fondamentales, à la santé et à la sécurité des personnes et à l'environnement, résultant des activités de la société, de celles des sociétés qu'elle contrôle ou de celles de sous-traitants ou fournisseurs.",
      },
      {
        type: "list",
        style: "ordered",
        items: [
          "Cartographie des risques.",
          "Procédures d'évaluation régulière des filiales, sous-traitants ou fournisseurs.",
          "Actions d'atténuation adaptées.",
          "Mécanisme d'alerte.",
          "Suivi des mesures mises en œuvre et bilan dans le rapport annuel.",
        ],
      },
      {
        type: "sources",
        items: [
          { label: "Loi n° 2017-399 — Légifrance (JORF)", url: LF_VIGILANCE_2017 },
          { label: "Code de commerce — plan de texte (transpositions et sociétés)", url: LF_CODE_COM },
          { label: "Directive (UE) 2024/1760 — EUR-Lex (cadre européen)", url: EUR_CSDDD },
        ],
      },
    ],
    lesson2Title: "Mise en œuvre : gouvernance et preuves",
    lesson2Content: [
      { type: "heading", level: 2, text: "Du document à l'efficacité" },
      {
        type: "paragraph",
        text: "Un plan de vigilance crédible repose sur des analyses de risques sectorielles et géographiques, l'implication du conseil, la contractualisation avec les partenaires critiques et des indicateurs de suivi. Les juridictions ont sanctionné des carences de fond (absence d'études sérieuses, mécanisme d'alerte inopérant).",
      },
      {
        type: "regulatory_note",
        year: 2025,
        companySize: "large",
        text: "Les entreprises au-dessus des seuils d'effectifs doivent anticiper la convergence avec la directive européenne sur la diligence de durabilité (transposition et calendrier à suivre sur EUR-Lex et sites gouvernementaux).",
      },
      {
        type: "sources",
        items: [
          { label: "Loi 2017-399 — Légifrance", url: LF_VIGILANCE_2017 },
          { label: "Directive (UE) 2024/1760 — EUR-Lex", url: EUR_CSDDD },
          { label: "Code de commerce — Légifrance", url: LF_CODE_COM },
        ],
      },
    ],
    questions: [
      qq("La loi française sur le devoir de vigilance date de :", "Loi 2017-399.", "2017", ["2010", "2005", "2024"], 1, "debutant", 0),
      qq("Le plan de vigilance couvre notamment :", "Risques liés aux activités, filiales, sous-traitants et fournisseurs.", "Risques liés à la chaîne de valeur étendue", ["Uniquement le siège social", "Uniquement les clients finaux", "Uniquement les actionnaires"], 2, "intermediaire", 0),
      qq("Un bloc obligatoire est :", "Mécanisme d'alerte prévu par la loi.", "Un dispositif d'alerte", ["Uniquement la carte de visite", "Uniquement le logo", "Uniquement le site web"], 1, "debutant", 0),
      qq("La directive 2024/1760 concerne :", "Diligence de durabilité au niveau européen.", "Un cadre européen de diligence en matière de durabilité", ["La taxe foncière", "Le permis de conduire", "Les marchés publics locaux"], 2, "intermediaire", 1),
      qq("La loi 2017-399 est publiée sur :", "Journal officiel via Légifrance.", "Légifrance", ["YouTube", "Wikipedia", "Reddit"], 1, "debutant", null),
      qq("Un plan de vigilance doit être :", "Effectif, pas seulement formel.", "Mis en œuvre et documenté", ["Théorique seulement", "Secret", "Oral uniquement"], 2, "intermediaire", null),
      qq("L'environnement est-il couvert ?", "La loi cite explicitement l'environnement parmi les domaines protégés.", "Oui", ["Non", "Uniquement le fiscal", "Uniquement le sport"], 1, "debutant", 1),
      qq("EUR-Lex pour 2024/1760 sert à :", "Lire le texte de la directive CSDDD.", "Consulter le texte officiel de la directive", ["Publier des statuts", "Déclarer la TVA", "Obtenir un visa"], 2, "avance", null),
    ],
  });

  await seedModuleQuick(stVig, {
    slug: "obl-vigilance-europe-csddd-chaines",
    title: "Directive européenne et chaînes de valeur",
    description: "Étendue des obligations, climat et droits humains dans une logique de diligence.",
    order: 2,
    estimatedMinutes: 14,
    difficulty: "avance",
    lesson1Title: "Directive (UE) 2024/1760 : objectifs",
    lesson1Content: [
      { type: "heading", level: 2, text: "Vers un socle européen" },
      {
        type: "paragraph",
        text: "La directive (UE) 2024/1760 du Parlement européen et du Conseil vise à favoriser le développement durable et une conduite responsable des entreprises dans toute la chaîne de valeurs mondiale, en imposant des obligations de diligence en matière de impacts environnementaux et de droits humains pour les entreprises et sociétés concernées par son champ d'application.",
      },
      {
        type: "callout",
        variant: "info",
        title: "Suivi réglementaire",
        text: "Les modalités d'application dépendront de la transposition en droit national et des guides ; consultez régulièrement EUR-Lex et les sites des ministères compétents.",
      },
      {
        type: "sources",
        items: [
          { label: "Directive (UE) 2024/1760 — EUR-Lex", url: EUR_CSDDD },
          { label: "Loi française 2017-399 — Légifrance", url: LF_VIGILANCE_2017 },
          { label: "Finance durable — Commission", url: EC_SF },
        ],
      },
    ],
    lesson2Title: "Comparer cadre français et directive",
    lesson2Content: [
      { type: "heading", level: 2, text: "Cohérence et charges" },
      {
        type: "paragraph",
        text: "Les entreprises déjà soumises à la loi française disposeront d'un socle documentaire (cartographie, alerte, suivi) utile pour la mise en conformité avec la directive, sous réserve d'ajustements de périmètre, de critères de due diligence et d'éventuelles obligations climatiques supplémentaires selon la version transposée.",
      },
      {
        type: "table",
        headers: ["Thème", "Point d'attention"],
        rows: [
          ["Périmètre sociétés", "Vérifier seuils UE vs loi française."],
          ["Climat", "Intégrer les attentes de plan de transition si requis."],
          ["Gouvernance", "Implication du conseil et traçabilité des décisions."],
        ],
      },
      {
        type: "sources",
        items: [
          { label: "EUR-Lex — directive 2024/1760", url: EUR_CSDDD },
          { label: "Légifrance — loi 2017-399", url: LF_VIGILANCE_2017 },
          { label: "Code de commerce — Légifrance", url: LF_CODE_COM },
        ],
      },
    ],
    questions: [
      qq("La directive 2024/1760 porte sur :", "Diligence en matière de durabilité.", "Devoir de diligence des entreprises sur durabilité", ["Taxonomie uniquement", "PIB uniquement", "Zonage urbain"], 2, "intermediaire", 0),
      qq("La loi française 2017-399 est :", "Antérieure à la directive européenne.", "Un précédent national sur le devoir de vigilance", ["Une directive", "Un règlement CE", "Un arrêté municipal"], 1, "debutant", 0),
      qq("EUR-Lex pour la directive :", "Texte officiel.", "Fournit le texte authentique", ["Remplace les tribunaux", "Est payant obligatoirement", "Est secret"], 2, "intermediaire", 1),
      qq("Le plan de vigilance français inclut :", "Cinq blocs structurants.", "Cartographie, évaluation, actions, alerte, suivi", ["Uniquement le logo", "Uniquement la paie", "Uniquement le marketing"], 2, "intermediaire", 0),
      qq("La chaîne de valeur :", "Fournisseurs et sous-traitants peuvent être couverts.", "Peut inclure sous-traitants et fournisseurs", ["Est limitée au siège", "Ignore les filiales", "Est fictive"], 2, "avance", null),
      qq("La Commission sur la finance durable :", "Contexte UE pour entreprises et investisseurs.", "Documente l'écosystème reporting et durable", ["Gère les permis de conduire", "Fixe les loyers", "Contrôle les écoles"], 1, "debutant", null),
      qq("La transposition nationale :", "Adaptera la directive au droit français.", "Précisera obligations et sanctions en France", ["Est inutile", "Est déjà finalisée dans ce seed", "N'existe pas"], 2, "avance", 1),
      qq("Légifrance sert à :", "Consulter le droit français officiel.", "Vérifier lois et codes nationaux", ["Trader des actions", "Publier des podcasts", "Héberger des jeux"], 1, "debutant", null),
    ],
  });

  await seedModuleQuick(stBeges, {
    slug: "obl-beges-assujettissement-l229-25",
    title: "BEGES : qui est assujetti ?",
    description: "Obligations du Code de l'environnement pour les bilans d'émissions de gaz à effet de serre.",
    order: 1,
    estimatedMinutes: 13,
    difficulty: "intermediaire",
    lesson1Title: "Personnes morales et seuils d'effectifs",
    lesson1Content: [
      { type: "heading", level: 2, text: "Article L. 229-25 du Code de l'environnement" },
      {
        type: "paragraph",
        text: "Le Code de l'environnement impose à certaines personnes morales de droit privé et publiques de réaliser un bilan des émissions de gaz à effet de serre (BEGES), de le rendre public et de le mettre à jour selon une périodicité fixée par le texte. Les seuils d'effectifs diffèrent entre métropole et outre-mer ; les collectivités et l'État peuvent également être concernés selon leurs effectifs ou populations.",
      },
      {
        type: "regulatory_note",
        year: 2025,
        companySize: "large",
        text: "Les entreprises de plus de 500 salariés en métropole (seuil différent en outre-mer) relèvent typiquement du champ ; vérifiez toujours la version consolidée du code.",
      },
      {
        type: "sources",
        items: [
          { label: "Code de l'environnement — plan de texte (Légifrance)", url: LF_CODE_ENV },
          { label: "Plateforme Bilans GES — ADEME", url: ADEME_PORTAL },
          { label: "Directive CSRD — lien contexte reporting (EUR-Lex)", url: EUR_CSRD },
        ],
      },
    ],
    lesson2Title: "Plan de transition et publication",
    lesson2Content: [
      { type: "heading", level: 2, text: "Aller au-delà de l'inventaire" },
      {
        type: "paragraph",
        text: "Le bilan doit être accompagné d'un plan de transition présentant les actions envisagées pour réduire les émissions. La publication et la transmission aux autorités compétentes s'effectuent selon les modalités réglementaires ; la plateforme Bilans GES de l'ADEME est l'outil national de déclaration pour de nombreux opérateurs.",
      },
      {
        type: "callout",
        variant: "tip",
        title: "Cohérence",
        text: "Alignez périmètre BEGES et données carbone utilisées pour la taxonomie ou la CSRD afin d'éviter des écarts d'inventaire.",
      },
      {
        type: "sources",
        items: [
          { label: "Code de l'environnement — Légifrance", url: LF_CODE_ENV },
          { label: "Bilans GES — ADEME (plateforme)", url: ADEME_PORTAL },
          { label: "Commission — corporate sustainability reporting", url: EC_CSRD_PAGE },
        ],
      },
    ],
    questions: [
      qq("Le BEGES relève du :", "Code de l'environnement.", "Code de l'environnement", ["Code de la route", "Code du sport", "Code minier"], 1, "debutant", 0),
      qq("La plateforme nationale de déclaration est :", "bilans-ges.ademe.fr", "Bilans GES — ADEME", ["Impots.gouv", "France travail", "ANTS"], 1, "debutant", 1),
      qq("Un plan de transition doit :", "Présenter actions de réduction.", "Décrire les actions pour réduire les émissions", ["Supprimer le bilan", "Remplacer l'AG", "Ignorer le scope 3"], 2, "intermediaire", 0),
      qq("L'article L. 229-25 concerne notamment :", "Bilan GES et obligations associées.", "Bilan d'émissions de gaz à effet de serre", ["Uniquement les particuliers", "Uniquement les associations", "Uniquement les écoles"], 2, "intermediaire", 1),
      qq("Légifrance pour le code environnement :", "Texte consolidé officiel.", "Permet de lire le code consolidé", ["Est un blog", "Est payant obligatoirement", "Remplace la loi"], 1, "debutant", null),
      qq("La CSRD et le BEGES :", "Données carbone complémentaires.", "Peuvent croiser les jeux de données carbone", ["S'excluent", "Fusionnent en un seul document toujours", "Sont identiques"], 2, "avance", null),
      qq("Les personnes morales de droit privé en métropole :", "Seuil 500 salariés typique pour obligation.", "Peuvent être assujetties au-delà de 500 salariés", ["Jamais assujetties", "Toujours 10 salariés", "Uniquement à l'étranger"], 2, "intermediaire", 0),
      qq("La publication du BEGES :", "Obligation de transparence.", "Fait partie des exigences de publicité", ["Est facultative toujours", "Est secrète", "Est orale uniquement"], 1, "debutant", null),
    ],
  });

  await seedModuleQuick(stBeges, {
    slug: "obl-beges-perimetre-scopes",
    title: "Périmètre des émissions et scopes",
    description: "Directes, indirectes et extension progressive des émissions indirectes significatives.",
    order: 2,
    estimatedMinutes: 14,
    difficulty: "avance",
    lesson1Title: "Scopes 1, 2 et 3 : logique française et alignement GHG",
    lesson1Content: [
      { type: "heading", level: 2, text: "Lecture par périmètre" },
      {
        type: "paragraph",
        text: "Les bilans d'émissions distinguent les émissions directes (scopes 1), les émissions indirectes liées à l'énergie (scope 2) et les autres émissions indirectes significatives (scope 3). Le droit français et les guides méthodologiques de l'ADEME précisent progressivement les postes à inclure ; le décret d'application du 1er juillet 2022 a notamment renforcé l'exigence d'intégration d'émissions indirectes significatives pour les bilans déposés à partir de 2023 pour les personnes soumises à l'obligation.",
      },
      {
        type: "list",
        style: "bullet",
        items: [
          "Prioriser les postes du scope 3 les plus matériels pour votre secteur.",
          "Documenter hypothèses et facteurs d'émission.",
          "Réconcilier avec les données financières (CA, volumes).",
        ],
      },
      {
        type: "sources",
        items: [
          { label: "Code de l'environnement — Légifrance", url: LF_CODE_ENV },
          { label: "Bilans GES — ADEME", url: ADEME_PORTAL },
          { label: "Règlement taxonomie — EUR-Lex (contexte climat)", url: EUR_TAXO },
        ],
      },
    ],
    lesson2Title: "Sanctions et mise à jour périodique",
    lesson2Content: [
      { type: "heading", level: 2, text: "Respecter la périodicité" },
      {
        type: "paragraph",
        text: "Le non-respect de l'obligation de bilan, de publication ou de transmission peut entraîner des sanctions administratives prévues par le code. Les bilans doivent être mis à jour selon la périodicité légale (tous les quatre ans pour le secteur privé dans la rédaction classique, sous réserve de consolidation en vigueur).",
      },
      {
        type: "callout",
        variant: "warning",
        title: "Vérifier la consolidation",
        text: "Les montants des amendes et la périodicité exacte doivent être confirmés sur la version à jour du Code de l'environnement sur Légifrance.",
      },
      {
        type: "sources",
        items: [
          { label: "Code de l'environnement — Légifrance", url: LF_CODE_ENV },
          { label: "Bilans GES — ADEME", url: ADEME_PORTAL },
          { label: "Finance durable — Commission", url: EC_SF },
        ],
      },
    ],
    questions: [
      qq("Le scope 1 concerne :", "Émissions directes.", "Les émissions directes de l'organisation", ["Les achats clients uniquement", "Les dividendes", "La masse salariale seule"], 1, "debutant", 0),
      qq("Le scope 2 concerne :", "Énergie achetée.", "Émissions indirectes liées à l'énergie achetée", ["Déplacements clients uniquement", "Impôts", "Effectifs"], 1, "debutant", 0),
      qq("Le scope 3 :", "Autres émissions indirectes significatives.", "Autres émissions indirectes de la chaîne de valeur", ["N'existe pas", "Est interdit", "Est uniquement fiscal"], 2, "intermediaire", 0),
      qq("L'ADEME héberge :", "La plateforme nationale Bilans GES.", "La plateforme de déclaration Bilans GES", ["EUR-Lex", "Légifrance", "INSEE seul"], 1, "debutant", 1),
      qq("Le décret du 1er juillet 2022 :", "A renforcé l'intégration d'émissions indirectes significatives à partir de 2023 pour les personnes concernées.", "Renforce le périmètre des bilans", ["Supprime le BEGES", "Interdit le scope 1", "N'a aucun effet"], 2, "intermediaire", null),
      qq("La périodicité classique du bilan (secteur privé) :", "Souvent tous les quatre ans — confirmer sur code consolidé.", "Quatre ans (à confirmer sur texte consolidé)", ["Tous les mois", "Une fois", "Tous les 20 ans"], 2, "avance", 1),
      qq("Légifrance pour le code env. :", "Référence pour vérifier sanctions et obligations.", "Source pour obligations et sanctions", ["Blog", "Forum", "Réseau social"], 2, "intermediaire", null),
      qq("Cohérence CSRD / BEGES :", "Éviter doubles comptages ou incohérences.", "Harmoniser périmètres et facteurs", ["Ignorer l'un ou l'autre", "Mélanger sans méthode", "Supprimer les données"], 2, "avance", null),
    ],
  });

  await seedModuleQuick(stCal, {
    slug: "obl-calendrier-fr-ue-2025-2026",
    title: "Jalons 2025-2026 : France et Union européenne",
    description: "Entrées en vigueur, premiers exercices concernés et articulation CSRD / ESRS.",
    order: 1,
    estimatedMinutes: 16,
    difficulty: "intermediaire",
    lesson1Title: "CSRD : premières vagues et exercices",
    lesson1Content: [
      { type: "heading", level: 2, text: "Lire le calendrier officiel" },
      {
        type: "paragraph",
        text: "La directive (UE) 2022/2464 organise des vagues d'application selon la taille, le statut boursier et la nature des entreprises (y compris certaines entreprises non européennes cotées en UE). Les dates de reporting se comprennent en fonction de l'exercice comptable clos et des transpositions nationales ; la Commission et l'ESRS fournissent les repères de contenu.",
      },
      {
        type: "table",
        headers: ["Horizon", "Lecture pratique"],
        rows: [
          ["2025", "Premières publications pour grandes entités déjà soumises à NFRD (selon calendrier officiel)."],
          ["2026", "Extension progressive à d'autres catégories (grandes entreprises non précédemment couvertes, etc.)."],
          ["Au-delà", "PME cotées et filiales complexes — suivre guides Commission et transpositions."],
        ],
      },
      {
        type: "regulatory_note",
        year: 2026,
        companySize: "large",
        text: "Les dates exactes par catégorie d'entreprise doivent être vérifiées dans le texte de la directive et les fiches de la Commission ; ce module donne une vision d'ensemble, pas un conseil juridique individualisé.",
      },
      {
        type: "sources",
        items: [
          { label: "Directive (UE) 2022/2464 — EUR-Lex", url: EUR_CSRD },
          { label: "Corporate sustainability reporting — Commission", url: EC_CSRD_PAGE },
          { label: "ESRS — site EFRAG / ESRS officiel", url: "https://www.esrs.europa.eu/" },
        ],
      },
    ],
    lesson2Title: "BEGES, taxonomie et vigilance en parallèle",
    lesson2Content: [
      { type: "heading", level: 2, text: "Une entreprise, plusieurs calendriers" },
      {
        type: "paragraph",
        text: "En 2025-2026, une grande entreprise peut cumuler BEGES (périodicité code environnement), publication DPEF ou rapport de durabilité (selon champ), alignement taxonomie pour l'information marché, plan de vigilance français et préparation à la directive européenne sur la diligence. Un tableau de bord réglementaire interne par obligation évite les oublis.",
      },
      {
        type: "callout",
        variant: "important",
        title: "Mise à jour",
        text: "Les calendriers évoluent avec les actes d'application ; fixez une revue semestrielle des sites EUR-Lex, Légifrance, Commission et AMF.",
      },
      {
        type: "sources",
        items: [
          { label: "EUR-Lex — CSRD", url: EUR_CSRD },
          { label: "Code de l'environnement — Légifrance", url: LF_CODE_ENV },
          { label: "Finance durable — AMF", url: AMF_FD },
        ],
      },
    ],
    questions: [
      qq("Le calendrier CSRD se lit dans :", "Directive 2022/2464 et guides Commission.", "La directive et les guides officiels", ["Le code postal", "La météo", "Uniquement Twitter"], 2, "intermediaire", 0),
      qq("ESRS désigne :", "European Sustainability Reporting Standards.", "Les normes européennes de reporting de durabilité", ["Un logiciel RH", "Une taxe locale", "Un fonds d'investissement"], 2, "intermediaire", 0),
      qq("En 2025-2026, une grande entreprise peut avoir :", "Plusieurs obligations parallèles.", "BEGES, CSRD, taxonomie, vigilance selon cas", ["Aucune obligation", "Uniquement la TVA", "Uniquement le permis de construire"], 2, "intermediaire", 1),
      qq("EUR-Lex sert notamment à :", "Vérifier les dates et articles de la directive.", "Contrôler le texte de la CSRD", ["Publier des bilans", "Gérer la paie", "Louer des bureaux"], 1, "debutant", 0),
      qq("La Commission UE :", "Publie des pages sur le reporting de durabilité.", "Explique le reporting de durabilité", ["Vend des actions", "Délivre des permis de pêche", "Gère les hôpitaux"], 1, "debutant", null),
      qq("L'AMF :", "Autorité des marchés financiers en France.", "Accompagne la compréhension finance durable en France", ["Gère les écoles", "Délivre des passeports", "Contrôle le code de la route"], 2, "intermediaire", null),
      qq("Le site esrs.europa.eu :", "Informations sur les ESRS.", "Porte la documentation sur les ESRS", ["Vend des normes ISO", "Remplace Légifrance", "Est privé"], 1, "debutant", 1),
      qq("Un tableau de bord obligations :", "Aide à piloter jalons multiples.", "Centralise échéances par texte", ["Remplace les lois", "Supprime les audits", "Est interdit"], 2, "avance", null),
    ],
  });

  await seedModuleQuick(stCal, {
    slug: "obl-secteurs-prioritaires-nfca-climat",
    title: "Secteurs à enjeu et financement durable",
    description: "Activités fortement exposées (climat, énergie, matières premières) et attentes des superviseurs.",
    order: 2,
    estimatedMinutes: 14,
    difficulty: "avance",
    lesson1Title: "Secteurs sensibles climat et chaîne de valeur",
    lesson1Content: [
      { type: "heading", level: 2, text: "Matérialité sectorielle" },
      {
        type: "paragraph",
        text: "Les secteurs à forte intensité carbone (énergie, transport lourd, industrie process, agriculture intensive) ou à risques sociaux dans la chaîne de valeur (textile, extraction) font l'objet d'un examen renforcé par les investisseurs, les superviseurs et les autorités. La taxonomie et les ESRS sectoriels (quand applicables) fournissent des grilles d'analyse.",
      },
      {
        type: "list",
        style: "bullet",
        items: [
          "Identifier les hotspots scope 3 sectoriels.",
          "Documenter les scénarios climat 1,5 °C ou 2 °C lorsque requis.",
          "Préparer des données vérifiables pour les banques et assureurs.",
        ],
      },
      {
        type: "sources",
        items: [
          { label: "Taxonomie — Commission européenne", url: EC_TAXO_PAGE },
          { label: "CSRD — EUR-Lex", url: EUR_CSRD },
          { label: "Finance durable — AMF", url: AMF_FD },
        ],
      },
    ],
    lesson2Title: "NCAs et contrôle de l'information",
    lesson2Content: [
      { type: "heading", level: 2, text: "Autorités compétentes et enforcement" },
      {
        type: "paragraph",
        text: "La directive CSRD confie des rôles aux autorités compétentes (NCAs) pour le contrôle de l'information publiée. En France, l'AMF et l'Autorité de contrôle prudentiel et de résolution (ACPR) interviennent selon les entités financières et marchés ; pour le non-financier, suivez les précisions des guides AMF-ACPR et les textes nationaux d'application.",
      },
      {
        type: "callout",
        variant: "info",
        title: "Liens utiles",
        text: "Les pages institutionnelles de l'AMF et de l'ACPR décrivent les attentes en matière de publication d'information extra-financière et de risques de greenwashing.",
      },
      {
        type: "sources",
        items: [
          { label: "AMF — Finance durable", url: AMF_FD },
          { label: "ACPR — site officiel Banque de France", url: "https://acpr.banque-france.fr/" },
          { label: "Corporate sustainability reporting — Commission", url: EC_CSRD_PAGE },
        ],
      },
    ],
    questions: [
      qq("Un secteur à enjeu climat typique est :", "Énergie et industrie lourde.", "Énergie / industrie à forte intensité carbone", ["Uniquement la restauration", "Uniquement la librairie", "Uniquement le tourisme local"], 2, "intermediaire", 0),
      qq("Les ESRS sectoriels :", "Précisent des disclosures selon activités.", "Complètent les standards sectoriels lorsque publiés", ["N'existent pas", "Remplacent la TVA", "Sont secrets"], 2, "intermediaire", 0),
      qq("L'AMF en France :", "Marchés financiers.", "Surveille l'information des marchés", ["Gère les écoles", "Délivre permis de chasse", "Contrôle le code du travail"], 1, "debutant", 0),
      qq("L'ACPR :", "Autorité de contrôle prudentiel et de résolution.", "Supervise banques et assurances", ["Gère les parcs", "Délivre visas", "Contrôle restaurants"], 2, "intermediaire", 1),
      qq("La taxonomie aide à :", "Classifier activités durables.", "Qualifier des activités « vertes » selon critères UE", ["Calculer l'IS", "Gérer la paie", "Déclarer la TVA"], 2, "intermediaire", null),
      qq("Un hotspot scope 3 :", "Poste indirect majeur.", "Émission indirecte significative dans la chaîne", ["Émission négligeable", "Dividende", "Marge brute"], 2, "avance", null),
      qq("EUR-Lex pour CSRD :", "Texte officiel de la directive.", "Référence pour obligations européennes", ["Blog", "Forum", "Wiki non officiel"], 1, "debutant", null),
      qq("La Commission sur la taxonomie :", "Critères et guides.", "Publie critères et orientations", ["Vend des crédits carbone", "Gère les impôts français", "Remplace les tribunaux"], 2, "avance", 1),
    ],
  });

  await seedModuleQuick(stVsme, {
    slug: "obl-vsme-omnibus-value-chain-cap",
    title: "VSME : Basic, Complémentaire et Value Chain Cap",
    description:
      "Cadre EFRAG, modules opérationnels et stratégiques, Omnibus et clause Value Chain Cap pour harmoniser les questionnaires ESG (selon Zei — La VSME expliquée).",
    order: 1,
    estimatedMinutes: 18,
    difficulty: "intermediaire",
    lesson1Title: "VSME : référentiel EFRAG, modules Basic et Complémentaire",
    lesson1Content: [
      {
        type: "heading",
        level: 2,
        text: "Un référentiel volontaire aligné sur les ESRS, adapté aux PME non cotées",
      },
      {
        type: "paragraph",
        text: "La VSME (Voluntary Standard for SMEs) est le référentiel de reporting ESG construit par l'EFRAG pour les PME non cotées. C'est une norme volontaire, basée sur les ESRS de la CSRD, avec moins d'indicateurs, choisis pour s'adapter aux spécificités des plus petites entreprises.",
      },
      {
        type: "heading",
        level: 3,
        text: "Module « Basic » : environ 80 indicateurs répartis sur trois piliers",
      },
      {
        type: "list",
        style: "bullet",
        items: [
          "Environnement : consommation d'énergie, émissions de GES, gestion des déchets, consommation d'eau…",
          "Social : santé et sécurité, égalité femmes-hommes, absentéisme, formation des salariés…",
          "Gouvernance : lutte contre la corruption, pratiques éthiques, présence d'une politique RSE…",
        ],
      },
      {
        type: "paragraph",
        text: "La VSME comprend surtout des indicateurs chiffrés, et moins d'indicateurs narratifs que d'autres modèles de reporting. La norme est volontaire : les entreprises peuvent ignorer certains indicateurs sans avoir à justifier leur non-matérialité.",
      },
      {
        type: "heading",
        level: 3,
        text: "Module Complémentaire (publié en décembre 2024)",
      },
      {
        type: "paragraph",
        text: "Ce module ajoute des indicateurs narratifs (stratégie RSE, engagements, trajectoires de réduction, plans d'action, moyens consacrés) et une documentation des politiques, procédures et gouvernance ESG (ex. politique climat, évaluation des fournisseurs, pilotage RSE par le comité de direction). Il vise les entreprises qui veulent anticiper la CSRD ou répondre à des demandes clients plus exigeantes.",
      },
      {
        type: "paragraph",
        text: "Le collectif #WeAreEurope (dont Zei fait partie) a aussi développé le modèle Mid Cap pour les ETI : une sélection de 170 points de données, dont la moitié sont quantitatives, couvrant une partie des ESRS, avec double matérialité, cartographie chaîne de valeur et structure « Politique / Actions / Objectifs ». La VSME+ de Zei reprend l'ensemble des points de données des modules Basic et Complémentaire de la VSME, avec notamment la cotation des IROs et des application requirements.",
      },
      {
        type: "callout",
        variant: "tip",
        title: "Vu par ZEI",
        text: "Le livre blanc Zei indique que le module VSME B est testable en autonomie pour se familiariser avec les exigences de la VSME, et que le module VSME C l'est également en autonomie. Source : Zei — La VSME expliquée, §II.1 et §II.2.",
      },
      {
        type: "regulatory_note",
        year: 2025,
        companySize: "all",
        text: "La VSME est particulièrement mise en avant en 2025, notamment lors de Produrable, en lien avec les Omnibus de la CSRD ; l'EFRAG continue à structurer la norme et ses modules B et C.",
      },
      {
        type: "sources",
        items: [
          {
            label: "Zei — La VSME expliquée (PDF)",
            url: ZEI_VSME_LB_PDF,
          },
          { label: "Directive (UE) 2022/2464 (CSRD) — EUR-Lex", url: EUR_CSRD },
          { label: "Corporate sustainability reporting — Commission européenne", url: EC_CSRD_PAGE },
        ],
      },
    ],
    lesson2Title: "Omnibus, Value Chain Cap et impacts pour les entreprises",
    lesson2Content: [
      {
        type: "heading",
        level: 2,
        text: "L'Omnibus et la Value Chain Cap",
      },
      {
        type: "paragraph",
        text: "Avec l'Omnibus, le reporting durable entre dans une phase d'harmonisation ; la VSME s'impose comme colonne vertébrale du futur reporting ESG en Europe, y compris pour les grandes entreprises qui devront évaluer leur chaîne de valeur selon ce cadre. La clause Value Chain Cap impose que tout questionnaire fournisseur ou bancaire soit aligné sur la VSME.",
      },
      {
        type: "paragraph",
        text: "Peu mise en avant lors de la réglementation Omnibus de février 2025, la Value Chain Cap stipule que chaque question posée à un fournisseur dans le cadre d'une évaluation ESG doit correspondre à un indicateur officiel du référentiel. Les acheteurs piochent dans les indicateurs VSME ; les fournisseurs peuvent collecter leurs données une seule fois pour les transmettre à tous leurs clients. Le marché peut s'auto-réguler (refus de questionnaires non alignés, signalement), sur le modèle évoqué pour le RGPD dans le livre blanc.",
      },
      {
        type: "heading",
        level: 3,
        text: "Questionnaires concernés et hors périmètre",
      },
      {
        type: "list",
        style: "bullet",
        items: [
          "Concernés : questionnaires d'appels d'offres ; questionnaires fournisseurs/prestataires nécessaires pour que l'acheteur réponde à sa CSRD ; questionnaires ESG demandés par un banquier dans un financement.",
          "Non concernés : questionnaires des investisseurs ; scores RSE et ESG non imposés mais utilisés pour favoriser certains fournisseurs.",
        ],
      },
      {
        type: "paragraph",
        text: "Les questions posées seront limitées au répertoire VSME (sans obligation de tout poser) ; les définitions doivent suivre celles de la VSME. Pour les fournisseurs et emprunteurs, la VSME sert de trame de rapport standardisée et de répertoire de données ESG universel (ex. envoi Excel aux tiers).",
      },
      {
        type: "heading",
        level: 3,
        text: "Comparabilité et données",
      },
      {
        type: "paragraph",
        text: "La Value Chain Cap favorise un modèle de données unique et une typologie où les données narratives cèdent davantage la place aux chiffres ; les données sont de plus en plus demandées en intensités relatives plutôt qu'en valeurs absolues, pour comparer des entreprises de tailles différentes. La VSME devient un « répertoire ESG universel » pour de nombreuses entreprises européennes.",
      },
      {
        type: "callout",
        variant: "tip",
        title: "Vu par ZEI",
        text: "Le livre blanc relie la mise en avant de la VSME en 2025 aux Omnibus de la CSRD et à la perspective d'une recommandation de la Commission sur la VSME comme modèle unique d'évaluation fournisseurs (Value Chain Cap). Source : Zei — La VSME expliquée, §II.4 et §I.",
      },
      {
        type: "sources",
        items: [
          { label: "Zei — La VSME expliquée (PDF)", url: ZEI_VSME_LB_PDF },
          { label: "Directive (UE) 2022/2464 (CSRD) — EUR-Lex", url: EUR_CSRD },
        ],
      },
    ],
    questions: [
      qq(
        "Qui a développé le référentiel VSME ?",
        "Source : Zei — La VSME expliquée, §II.1 : la VSME est construite par l'EFRAG.",
        "L'EFRAG",
        ["La Commission européenne seule", "L'AMF", "L'ADEME"],
        2,
        "debutant",
        0
      ),
      qq(
        "Le module « Basic » de la VSME comprend environ :",
        "Source : Zei — La VSME expliquée, §II.1 : le module Basic comprend environ 80 indicateurs ESG.",
        "80 indicateurs ESG",
        ["10 indicateurs", "500 indicateurs", "4 200 points XBRL"],
        2,
        "debutant",
        0
      ),
      qq(
        "Le module Complémentaire de la VSME a été publié en :",
        "Source : Zei — La VSME expliquée, §II.2 : publication en décembre 2024.",
        "Décembre 2024",
        ["Janvier 2020", "Mars 2023", "Juillet 2026"],
        2,
        "intermediaire",
        0
      ),
      qq(
        "Pour une entreprise qui débute en RSE, un atout de la norme VSME est que :",
        "Source : Zei — La VSME expliquée, §II.1 : la norme est volontaire ; on peut ignorer certains indicateurs sans justifier une non-matérialité.",
        "Certains indicateurs peuvent être ignorés sans justification de non-matérialité",
        ["Tous les indicateurs sont obligatoires avec audit externe", "Seules les grandes entreprises peuvent l'utiliser", "La VSME remplace le Code de commerce français"],
        3,
        "intermediaire",
        0
      ),
      qq(
        "La Value Chain Cap est notamment évoquée dans le livre blanc Zei comme peu mise en avant lors de la réglementation Omnibus de :",
        "Source : Zei — La VSME expliquée, §III.1 : Omnibus de février 2025.",
        "Février 2025",
        ["Février 2019", "Janvier 2030", "Aucune date n'est mentionnée"],
        2,
        "intermediaire",
        1
      ),
      qq(
        "Selon le livre blanc Zei, les questionnaires des investisseurs relèvent-ils de la Value Chain Cap ?",
        "Source : Zei — La VSME expliquée, §III.2 : ne sont pas concernés les questionnaires des investisseurs.",
        "Non",
        ["Oui, systématiquement", "Oui, uniquement s'ils sont en anglais", "Uniquement pour les banques centrales"],
        1,
        "debutant",
        1
      ),
      qq(
        "Selon le livre blanc, chaque question d'un questionnaire ESG d'évaluation fournisseur doit :",
        "Source : Zei — La VSME expliquée, §III.1 : correspondre à un indicateur officiel du référentiel VSME.",
        "Correspondre à un indicateur officiel du référentiel VSME",
        ["Être librement inventée par l'acheteur", "Reposer uniquement sur des avis Google", "Ignorer tout référentiel public"],
        3,
        "avance",
        1
      ),
      qq(
        "Le modèle Mid Cap #WeAreEurope comporte une sélection de :",
        "Source : Zei — La VSME expliquée, §II.3 : 170 points de données, dont la moitié sont quantitatives.",
        "170 points de données",
        ["80 points de données", "10 000 indicateurs", "4 indicateurs"],
        3,
        "avance",
        0
      ),
    ],
  });

  const countMods = await db
    .select({ id: quizModules.id })
    .from(quizModules)
    .innerJoin(
      quizSubthemes,
      and(eq(quizModules.subthemeId, quizSubthemes.id), eq(quizSubthemes.themeId, themeId))
    );
  console.log(`\n  📊 Modules « ${THEME_SLUG} » en base pour ce thème : ${countMods.length}`);
}

seedObligations()
  .then(async () => {
    console.log("\n✅ Seed Obligations 2025-2026 terminé avec succès !\n");
    await sql.end();
  })
  .catch((err) => {
    console.error("❌ Erreur seed obligations :", err);
    process.exit(1);
  });
