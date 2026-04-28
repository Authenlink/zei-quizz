/**
 * Seed script — Thème « RSE & Marketing » (idempotent + --reset)
 * Usage : npx tsx scripts/seed-rse-marketing.ts
 * Reset : npx tsx scripts/seed-rse-marketing.ts --reset
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

const THEME_SLUG = "rse-marketing";

/** Sources officielles réutilisées (UE, ISO, institutions) */
const SRC = {
  EC_GREEN_CLAIMS:
    "https://environment.ec.europa.eu/topics/circular-economy/green-claims_en",
  EC_GREEN_CLAIMS_PROPOSAL:
    "https://environment.ec.europa.eu/publications/proposal-directive-green-claims_en",
  EC_EMPOWERING_CONSUMERS:
    "https://ec.europa.eu/commission/presscorner/detail/en/ip_22_2098",
  EU_ECOSYSTEM_LABEL:
    "https://environment.ec.europa.eu/topics/circular-economy/eu-ecolabel-home_en",
  EMAS: "https://green-business.ec.europa.eu/eco-management-and-audit-scheme-emas_en",
  ISO_14001: "https://www.iso.org/standard/14001",
  ISO_26000: "https://www.iso.org/iso-26000-social-responsibility.html",
  BCORP_ABOUT: "https://www.bcorporation.net/en-us/movement/about-b-corps",
  UN_GC: "https://www.unglobalcompact.org/what-is-gc/mission/principles",
  OECD_MNE: "https://mneguidelines.oecd.org/mneguidelines/",
  EU_PROCUREMENT:
    "https://single-market-economy.ec.europa.eu/single-market/public-procurement_en",
  EUR_LEX_CLASSIC_DIR:
    "https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32014L0024",
  EC_CSRD_PAGE:
    "https://finance.ec.europa.eu/capital-markets-union-and-financial-markets/company-reporting-and-auditing/company-reporting/corporate-sustainability-reporting_en",
  FR_CODE_MARCHES:
    "https://www.legifrance.gouv.fr/codes/texte_lc/LEGITEXT000005627565",
  EC_SF_STRATEGY:
    "https://finance.ec.europa.eu/sustainable-finance/overview/sustainable-finance-strategy_en",
};

/** Documents Zei — URLs alignées sur docs/zei-knowledge/INDEX.md */
const ZEI_KB = {
  EN_BREF_5_CSRD:
    "https://4495458.fs1.hubspotusercontent-na1.net/hubfs/4495458/En%20bref/En%20Bref%205%20-%20CSRD%2c%20ce%20que%20vous%20devez%20comprendre%20avant%20vos%20concurrents%20pour%20rester%20comp%C3%A9titifs%20-%20Zei.pdf",
  VSME_LANGAGE_COMMUN:
    "https://4495458.fs1.hubspotusercontent-na1.net/hubfs/4495458/Livres%20blancs/Zei%20-%20La%20VSME%20expliqu%C3%A9e%20-%20Le%20nouveau%20langage%20commun%20de%20la%20donn%C3%A9es%20ESG%20en%20Europe.pdf",
  RSE_2025_PERFORMANCE:
    "https://4495458.fs1.hubspotusercontent-na1.net/hubfs/4495458/Livres%20blancs/Zei%20-%20En%202025%20comment%20passer%20%C3%A0%20une%20RSE%20de%20performance%20%3F.pdf",
  PROPOSITION_PORTALP:
    "https://docs.google.com/presentation/d/1Z_OuSEaTGMupYV79TdMVqXObXSgxlJF1ouojGd9hLB4/edit",
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

async function seedRseMarketing() {
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

  console.log("🌱 Démarrage du seed RSE & Marketing...\n");

  const themeId = await getOrCreateTheme({
    slug: THEME_SLUG,
    title: "RSE & Marketing",
    description:
      "Aligner communication commerciale et démarche RSE : éviter le greenwashing, valoriser labels et preuves, fidéliser clients et talents, répondre aux marchés publics durables et raconter un storytelling d’impact crédible.",
    icon: "Megaphone",
    color: "#d946ef",
    order: 5,
  });

  // ——— 1. Communication authentique vs greenwashing ———
  const st1 = await getOrCreateSubtheme({
    themeId,
    slug: "communication-authentique-vs-greenwashing",
    title: "Communication RSE authentique vs greenwashing",
    description:
      "Repérer les allégations trompeuses, comprendre les initiatives européennes sur les « green claims » et bâtir un discours vérifiable.",
    order: 1,
  });

  await seedModuleQuick(st1, {
    slug: "rm-greenwashing-cadre-risques",
    title: "Greenwashing : définition, signaux et risques",
    description:
      "Ce qu’est le greenwashing, pourquoi il fragilise la confiance, et comment l’Union européenne encadre les allégations environnementales.",
    order: 1,
    estimatedMinutes: 16,
    difficulty: "debutant",
    lesson1Title: "Greenwashing : définitions et exemples fréquents",
    lesson1Content: withSources(
      [
        {
          type: "heading",
          level: 2,
          text: "Quand la communication dépasse la réalité des impacts",
        },
        {
          type: "paragraph",
          text: "Le greenwashing désigne des messages (marketing, packaging, site web, rapport annuel) qui exagèrent ou faussent le bénéfice environnemental d’un produit, d’un service ou d’une entreprise. Les consommateurs y sont particulièrement sensibles : une partie des allégations environnementales dans l’UE est jugée vague ou peu étayée selon les travaux de la Commission.",
        },
        {
          type: "list",
          style: "bullet",
          items: [
            "Vocabulaire flou (« éco-responsable », « naturel ») sans périmètre ni mesure.",
            "Mise en avant d’un micro-critère (ex. emballage recyclé) alors que l’impact majeur est ailleurs.",
            "Images « nature » décoratives sans lien causal avec la chaîne de valeur.",
            "Absence de preuve indépendante ou de méthode reproductible.",
          ],
        },
        {
          type: "callout",
          variant: "warning",
          title: "Risque réputationnel",
          text: "Les autorités et les ONG scrutent de plus en plus les allégations. Une campagne agressive sans données vérifiables peut se retourner contre la marque et affecter la confiance des distributeurs et partenaires.",
        },
      ],
      [
        { label: "Commission européenne — Green claims", url: SRC.EC_GREEN_CLAIMS },
        {
          label: "Commission européenne — Proposition de directive sur les allégations environnementales",
          url: SRC.EC_GREEN_CLAIMS_PROPOSAL,
        },
      ]
    ),
    lesson2Title: "Vers des allégations comparables et vérifiables",
    lesson2Content: withSources(
      [
        {
          type: "heading",
          level: 2,
          text: "L’approche européenne : substantiation et gouvernance des labels",
        },
        {
          type: "paragraph",
          text: "Les initiatives européennes visent à harmoniser les exigences de preuve pour les allégations volontaires et à encadrer les schémas d’étiquetage environnemental. L’objectif est un terrain de jeu équitable entre entreprises réellement engagées et discours marketing superficiels.",
        },
        {
          type: "callout",
          variant: "tip",
          title: "Bon réflexe marketing",
          text: "Pour chaque message public, documentez la méthode (norme, facteur d’émission, périmètre géographique et temporel) et conservez la trace des sources : c’est la base d’une communication résistante au contrôle.",
        },
        {
          type: "regulatory_note",
          year: 2026,
          companySize: "all",
          text: "Les textes définitifs et échéances nationales peuvent évoluer ; croisez toujours la version consolidée au Journal officiel de l’UE et les guides de votre autorité de surveillance.",
        },
      ],
      [
        { label: "Commission européenne — Green claims", url: SRC.EC_GREEN_CLAIMS },
        {
          label: "Commission européenne — Empowering consumers for the green transition (proposition)",
          url: SRC.EC_EMPOWERING_CONSUMERS,
        },
      ]
    ),
    questions: [
      qq(
        "Le greenwashing correspond principalement à :",
        "Des messages qui exagèrent ou faussent le bénéfice environnemental.",
        "Des pratiques trompeuses qui donnent une fausse impression d’impact environnemental positif",
        ["Uniquement l’usage de couleur verte sur un logo", "Le seul non-respect du RGPD", "Une certification ISO obligatoire"],
        1,
        "debutant",
        0
      ),
      qq(
        "Une allégation « 100 % neutre en carbone » sans périmètre ni méthode publiée est surtout risquée car :",
        "Sans transparence méthodologique, le consommateur et les autorités ne peuvent pas vérifier la claim.",
        "Elle est difficilement vérifiable et peut être qualifiée de vague ou trompeuse",
        ["Elle est toujours interdite en B2B", "Elle est réservée aux PME", "Elle remplace un bilan comptable"],
        2,
        "intermediaire",
        0
      ),
      qq(
        "L’initiative européenne sur les « green claims » vise notamment à :",
        "Renforcer la fiabilité et la comparabilité des allégations environnementales.",
        "Rendre les allégations environnementales fiables, comparables et vérifiables",
        ["Supprimer tout marketing B2C", "Interdire les labels privés", "Nationaliser les audits"],
        2,
        "intermediaire",
        1
      ),
      qq(
        "Un pictogramme « forêt » sur un emballage sans lien avec la chaîne d’approvisionnement relève surtout de :",
        "Une suggestion implicite d’impact positif sans preuve = risque de greenwashing.",
        "Une association suggestive potentiellement trompeuse",
        ["Une obligation légale française", "Un usage exclusivement B2B", "Une norme ISO 9001"],
        1,
        "debutant",
        1
      ),
      qq(
        "Pour réduire le risque de greenwashing, la priorité est de :",
        "Lier chaque message à des données et un périmètre clairs.",
        "Substantier chaque allégation avec méthode, périmètre et sources traçables",
        ["Multiplier les hashtags durables", "Réduire le prix", "Supprimer les preuves pour simplifier"],
        3,
        "avance",
        null
      ),
      qq(
        "Les schémas d’étiquetage environnemental volontaires dans l’UE doivent tendre vers :",
        "Transparence, solidité et gouvernance claire selon les objectifs européens.",
        "Solidité, transparence et fiabilité pour le consommateur",
        ["Le secret des méthodes", "L’absence de contrôle tiers", "Des critères purement décoratifs"],
        2,
        "intermediaire",
        null
      ),
      qq(
        "La communication RSE authentique se distingue par :",
        "L’alignement entre discours externe et données internes (KPI, audits, incidents).",
        "La cohérence entre promesses publiques et indicateurs internes vérifiables",
        ["Le volume de publicité achetée", "Le nombre de likes", "L’absence de reporting"],
        3,
        "avance",
        null
      ),
      qq(
        "Face à une enquête ou un signalement sur une allégation, l’entreprise doit surtout :",
        "Pouvoir produire méthode, périmètre et sources.",
        "Disposer d’un dossier de preuve reproductible et à jour",
        ["Supprimer immédiatement tout site web", "Nier sans analyse", "Attendre 10 ans"],
        2,
        "debutant",
        null
      ),
    ],
  });

  await seedModuleQuick(st1, {
    slug: "rm-communication-rse-integrite",
    title: "Communication RSE : intégrité, preuves et narration",
    description:
      "Structurer messages et preuves, impliquer les parties prenantes et éviter l’écueil « marketing pur ».",
    order: 2,
    estimatedMinutes: 15,
    difficulty: "intermediaire",
    lesson1Title: "Principes d’intégrité et de proportionnalité des messages",
    lesson1Content: withSources(
      [
        { type: "heading", level: 2, text: "Proportionnalité et honnêteté intellectuelle" },
        {
          type: "paragraph",
          text: "Une communication RSE crédible met en avant des progrès mesurables, mentionne les limites et les arbitrages, et évite la surenchère. Les principes de responsabilité sociétale (ISO 26000) rappellent l’importance de la transparence, de la redevabilité et du respect des faits.",
        },
        {
          type: "list",
          style: "ordered",
          items: [
            "Choisir 3 à 5 messages clés alignés sur la stratégie et les données disponibles.",
            "Préciser périmètre (site, pays, filiales) et année de référence.",
            "Distinguer objectifs, actions en cours et résultats obtenus.",
            "Prévoir une revue juridique/compliance pour les allégations sensibles.",
          ],
        },
        {
          type: "callout",
          variant: "info",
          title: "Alignement interne",
          text: "Les équipes marketing, juridique, achats et RSE doivent partager les mêmes définitions (ex. « fournisseur local », « recyclé ») pour éviter les décalages entre campagne et rapport extra-financier.",
        },
      ],
      [
        { label: "ISO — ISO 26000 (responsabilité sociétale)", url: SRC.ISO_26000 },
        { label: "OCDE — Lignes directrices à l’intention des entreprises multinationales", url: SRC.OECD_MNE },
      ]
    ),
    lesson2Title: "Co-construction avec parties prenantes et tiers de confiance",
    lesson2Content: withSources(
      [
        { type: "heading", level: 2, text: "Dialogue et validation externe" },
        {
          type: "paragraph",
          text: "Impliquer clients, ONG ou experts dans la formulation des engagements renforce la qualité du message et anticipe les critiques. Le Pacte mondial des Nations unies encourage les entreprises à intégrer les principes universels dans leurs stratégies et communications.",
        },
        {
          type: "table",
          headers: ["Étape", "Objectif", "Indicateur de succès"],
          rows: [
            ["Cartographie parties prenantes", "Prioriser les attentes", "Liste validée en comité RSE"],
            ["Tests de messages", "Clarifier le vocabulaire", "Taux de compréhension en panel"],
            ["Revue documentaire", "Aligner claims et preuves", "0 divergence avec le reporting"],
          ],
        },
      ],
      [
        { label: "Nations unies — Global Compact (principes)", url: SRC.UN_GC },
        { label: "Commission européenne — Green claims", url: SRC.EC_GREEN_CLAIMS },
      ]
    ),
    questions: [
      qq(
        "ISO 26000 est surtout :",
        "Norme de lignes directrices, non exigible comme système certifiable au sens ISO 14001.",
        "Un référentiel de bonnes pratiques en responsabilité sociétale (guidance)",
        ["Un système de management certifiable comme ISO 9001", "Une directive européenne", "Un label produit obligatoire"],
        1,
        "debutant",
        0
      ),
      qq(
        "La redevabilité (accountability) en communication RSE implique :",
        "Rendre compte de façon transparente des impacts et des décisions.",
        "Expliquer et documenter les impacts et réponses apportées",
        ["Supprimer les indicateurs défavorables", "Ne communiquer qu’en interne", "Éviter tout audit"],
        2,
        "intermediaire",
        0
      ),
      qq(
        "Le Pacte mondial de l’ONU propose notamment :",
        "Dix principes couvrant droits de l’homme, travail, environnement et anti-corruption.",
        "Dix principes pour aligner stratégie et pratiques sur des valeurs universelles",
        ["Trois piliers ESG obligatoires", "Une certification ISO", "Un classement B2B obligatoire"],
        2,
        "debutant",
        1
      ),
      qq(
        "Les Lignes directrices OCDE à l’intention des entreprises multinationales servent surtout à :",
        "Guider les attentes en matière de conduite responsable des entreprises.",
        "Encadrer les attentes de conduite responsable des entreprises à l’international",
        ["Remplacer le droit national", "Fixer les prix du carbone", "Réglementer la publicité TV"],
        2,
        "intermediaire",
        1
      ),
      qq(
        "Un atelier « test de messages » avec des clients a surtout pour but de :",
        "Vérifier compréhension et crédibilité avant diffusion large.",
        "Réduire le risque de malentendu ou de sur-promesse",
        ["Baisser les coûts médias", "Remplacer la stratégie RSE", "Supprimer le reporting"],
        2,
        "debutant",
        null
      ),
      qq(
        "La cohérence entre communication externe et reporting CSRD (quand applicable) est importante car :",
        "Les investisseurs et parties prenantes croisent les sources.",
        "Les lecteurs confrontent campagnes publiques et informations réglementées",
        ["La CSRD interdit tout marketing", "Le marketing remplace le DPEF", "Les PME sont exemptées de tout"],
        3,
        "avance",
        null
      ),
      qq(
        "Proportionnalité des messages signifie :",
        "Adapter les promesses au niveau de preuve disponible.",
        "Ne pas annoncer plus que ce que les données et le périmètre permettent de soutenir",
        ["Toujours viser 100 % de circularité", "Ne jamais mentionner les limites", "Copier les concurrents"],
        2,
        "intermediaire",
        null
      ),
      qq(
        "Une revue juridique des allégations environnementales est surtout pertinente pour :",
        "Sécuriser les formulations à fort risque réglementaire ou concurrentiel.",
        "Identifier les formulations à risque avant diffusion",
        ["Supprimer toute communication", "Éviter le travail avec le marketing", "Remplacer les preuves par des slogans"],
        2,
        "debutant",
        null
      ),
    ],
  });

  await seedModuleQuick(st1, {
    slug: "rm-communication-intentions-vers-preuves",
    title: "De la communication d’intentions à la communication de preuves",
    description:
      "Passer des effets d’annonce à des faits traçables : exigence des parties prenantes, crédibilité et intégration des données ESG dans le pilotage.",
    order: 3,
    estimatedMinutes: 16,
    difficulty: "intermediaire",
    lesson1Title: "Preuves, pas seulement intentions",
    lesson1Content: withSources(
      [
        { type: "heading", level: 2, text: "Les parties prenantes demandent des faits" },
        {
          type: "paragraph",
          text: "La montée des exigences réglementaires renforce aussi la crédibilité vis-à-vis des parties prenantes : pouvoir démontrer sa conformité à des standards reconnus rassure. Les acteurs économiques — clients, investisseurs, partenaires financiers ou publics — exigent de plus en plus des preuves : transparence, comparabilité, garanties sur la qualité des données.",
        },
        {
          type: "paragraph",
          text: "Il ne s’agit plus seulement de « prouver que l’on fait », mais de démontrer que ce que l’on fait est efficace. Cette exigence de preuve change le dialogue entre équipes RSE et directions métiers.",
        },
        {
          type: "paragraph",
          text: "Robin Moysset (Sustainability Performance Reporting Manager Lead, Danone), dans le livre blanc Zei « En 2025, comment passer à une RSE de performance ? », indique notamment : « Afin d’en garantir la cohérence, les données ESG seront désormais intégrées dans les outils de reporting financier afin de renforcer la coopération entre les contrôleurs de gestion, la communauté RH et les référents RSE localement. Cela participe à la crédibilité du sujet comme outil d’arbitrage dans l’orientation de la stratégie à tous les niveaux. »",
        },
        {
          type: "callout",
          variant: "tip",
          title: "Vu par ZEI",
          text: "Le marketing et la com doivent s’appuyer sur le même socle que la finance et le reporting : indicateurs, périmètre, actualisation. C’est le passage d’une logique d’image à une logique d’efficacité documentée, comme le décrit le livre blanc RSE 2025 Zei.",
        },
      ],
      [{ label: "Zei — RSE de performance 2025 (PDF)", url: ZEI_KB.RSE_2025_PERFORMANCE }]
    ),
    lesson2Title: "Crédibilité : réussites, limites, amélioration continue",
    lesson2Content: withSources(
      [
        { type: "heading", level: 2, text: "Fonder la crédibilité sur des faits" },
        {
          type: "paragraph",
          text: "À l’horizon considéré dans le livre blanc, la crédibilité des démarches RSE reposera de plus en plus sur leur capacité à démontrer des résultats concrets. Les effets d’annonce ou les engagements généraux ne suffisent plus : les entreprises sont attendues sur des preuves de mise en œuvre, de résultats et d’impact.",
        },
        {
          type: "paragraph",
          text: "Cette évaluation exige des méthodes solides et une capacité à accepter la transparence — montrer les réussites, mais aussi les limites et les ajustements. La logique d’amélioration continue fonde la crédibilité sur des faits, pas sur des intentions.",
        },
        {
          type: "callout",
          variant: "tip",
          title: "Vu par ZEI",
          text: "Chaque campagne ou message public peut citer la méthode (norme, périmètre, année) et renvoyer vers le même socle de données que le rapport de durabilité : c’est l’alignement marketing / preuves que les lecteurs Zei cherchent quand ils comparent discours et documents.",
        },
      ],
      [
        { label: "Zei — RSE de performance 2025 (PDF)", url: ZEI_KB.RSE_2025_PERFORMANCE },
        { label: "Commission européenne — Green claims", url: SRC.EC_GREEN_CLAIMS },
      ]
    ),
    questions: [
      qq(
        "Selon le livre blanc Zei RSE 2025, clients, investisseurs et partenaires publics exigent notamment :",
        "Transparence, comparabilité et fiabilité des informations.",
        "Des preuves, de la transparence et des garanties sur la qualité des données",
        ["Uniquement des intentions affichées", "L’absence de reporting", "Uniquement des photos de terrain"],
        2,
        "debutant",
        0
      ),
      qq(
        "L’exigence « il ne s’agit plus seulement de prouver que l’on fait » vise surtout à :",
        "Démontrer l’efficacité des actions, pas seulement leur existence.",
        "Démontrer que ce que l’on fait est efficace",
        ["Supprimer le reporting", "Éviter les audits", "Remplacer la finance"],
        2,
        "intermediaire",
        0
      ),
      qq(
        "Robin Moysset (Danone) relie l’intégration des données ESG aux outils de reporting financier à :",
        "La crédibilité du sujet et le rôle d’arbitrage dans la stratégie.",
        "La crédibilité comme outil d’arbitrage pour l’orientation de la stratégie",
        ["La suppression des indicateurs RH", "L’exemption CSRD", "Uniquement le marketing digital"],
        2,
        "intermediaire",
        1
      ),
      qq(
        "La crédibilité des démarches RSE repose de plus en plus sur :",
        "Des résultats concrets et démontrables.",
        "La capacité à démontrer des résultats concrets (mise en œuvre, résultats, impact)",
        ["Uniquement des slogans", "L’absence de transparence", "Des engagements généraux sans suite"],
        2,
        "debutant",
        1
      ),
      qq(
        "Montrer les limites et les ajustements dans la communication sert notamment à :",
        "Fonder la crédibilité sur des faits et l’amélioration continue.",
        "Accepter la transparence et ancrer la crédibilité sur des faits, pas des intentions",
        ["Masquer les échecs", "Supprimer le dialogue interne", "Éviter toute mesure"],
        2,
        "avance",
        null
      ),
      qq(
        "Les Sustainability-Linked Loans (SLL) illustrent selon le livre blanc que :",
        "Le coût de la dette peut être lié à la performance durable.",
        "La capacité à produire un reporting robuste devient un enjeu financier",
        ["La dette est interdite aux entreprises RSE", "Les banques ignorent l’ESG", "Seules les PME sont concernées"],
        2,
        "intermediaire",
        null
      ),
      qq(
        "L’auditabilité des données ESG, y compris sur les données qualitatives, devient :",
        "Un objectif explicite dans les organisations avancées.",
        "Un objectif explicite, y compris pour les données qualitatives",
        ["Secondaire par rapport au marketing", "Réservé au bilan carbone produit", "Interdit par la CSRD"],
        2,
        "avance",
        null
      ),
      qq(
        "Pour le marketing, l’alignement avec les preuves évoqué par Zei implique surtout de :",
        "Renvoyer vers les mêmes méthodes et données que le reporting.",
        "Citer méthode, périmètre et actualisation cohérents avec le rapport de durabilité",
        ["Supprimer les KPI", "Éviter tout lien avec la finance", "Ne communiquer qu’en interne"],
        3,
        "intermediaire",
        null
      ),
    ],
  });

  // ——— 2. Labels et certifications ———
  const st2 = await getOrCreateSubtheme({
    themeId,
    slug: "labels-et-certifications-rse",
    title: "Labels et certifications (B Corp, ISO 14001, etc.)",
    description:
      "Comprendre la logique des certifications, leurs limites et la façon de les intégrer dans une stratégie de marque sans sur-interprétation.",
    order: 2,
  });

  await seedModuleQuick(st2, {
    slug: "rm-iso-14001-et-logique-ems",
    title: "ISO 14001 : système de management environnemental",
    description:
      "Exigences, cycle Plan-Do-Check-Act et articulation avec la communication des résultats environnementaux.",
    order: 1,
    estimatedMinutes: 14,
    difficulty: "debutant",
    lesson1Title: "ISO 14001 : exigences et certification",
    lesson1Content: withSources(
      [
        { type: "heading", level: 2, text: "Un référentiel international pour l’EMS" },
        {
          type: "paragraph",
          text: "ISO 14001 spécifie les exigences pour un système de management environnemental (EMS). Elle vise l’amélioration continue des performances environnementales, la conformité réglementaire et la prise en compte des aspects environnementaux significatifs.",
        },
        {
          type: "list",
          style: "bullet",
          items: [
            "Contexte de l’organisation et parties prenantes.",
            "Planification : aspects environnementaux, risques et opportunités, objectifs.",
            "Support et mise en œuvre : compétences, communication, documentation opérationnelle.",
            "Évaluation des performances : surveillance, audit interne, revue de direction.",
          ],
        },
      ],
      [{ label: "ISO — ISO 14001 (management environnemental)", url: SRC.ISO_14001 }]
    ),
    lesson2Title: "Différencier EMS certifié, label produit et rapport volontaire",
    lesson2Content: withSources(
      [
        { type: "heading", level: 2, text: "Ne pas tout mélanger dans un même slogan" },
        {
          type: "paragraph",
          text: "Un site certifié ISO 14001 démontre un système structuré ; ce n’est pas équivalent à un label « produit faible impact » ni à un rapport CSRD. La communication doit refléter précisément l’objet de la certification ou du label.",
        },
        {
          type: "callout",
          variant: "important",
          title: "Attention",
          text: "Afficher le logo d’un organisme certificateur sans contrat ou périmètre exact peut constituer une utilisation abusive — respectez les règles du certificateur et le scope du certificat.",
        },
      ],
      [
        { label: "ISO — ISO 14001", url: SRC.ISO_14001 },
        { label: "ISO — ISO 26000", url: SRC.ISO_26000 },
      ]
    ),
    questions: [
      qq(
        "ISO 14001 porte principalement sur :",
        "Un système de management environnemental.",
        "Les exigences pour établir et améliorer un système de management environnemental",
        ["La notation financière ESG", "Uniquement le bilan carbone produit", "Le droit fiscal français"],
        2,
        "debutant",
        0
      ),
      qq(
        "Le cycle PDCA (Plan-Do-Check-Act) sert surtout à :",
        "Structurer l’amélioration continue du système.",
        "Piloter l’amélioration continue du management environnemental",
        ["Remplacer les audits tiers", "Supprimer les aspects réglementaires", "Fixer les prix de vente"],
        2,
        "intermediaire",
        0
      ),
      qq(
        "Une certification ISO 14001 d’un site ne signifie pas automatiquement :",
        "Elle atteste d’un système, pas de la performance absolue de chaque produit.",
        "Que chaque produit vendu est « neutre en carbone »",
        ["Qu’un EMS est documenté", "Qu’il existe une politique environnementale", "Qu’il y a des audits"],
        3,
        "avance",
        1
      ),
      qq(
        "ISO 26000 complète ISO 14001 surtout par :",
        "Une vision élargie de la responsabilité sociétale (7 sujets).",
        "Des lignes directrices sur la responsabilité sociétale au-delà de l’environnement",
        ["Des exigences certifiables identiques à ISO 14001", "Uniquement la fiscalité", "Uniquement le marketing digital"],
        2,
        "intermediaire",
        1
      ),
      qq(
        "La communication du logo ISO 14001 doit :",
        "Respecter les règles du certificateur et le périmètre du certificat.",
        "Rester conforme aux conditions d’usage du certificateur",
        ["Être agrandie sans limite", "Remplacer toute donnée chiffrée", "Dispenser de veille réglementaire"],
        2,
        "debutant",
        null
      ),
      qq(
        "Un EMS vise notamment à :",
        "Identifier les aspects environnementaux significatifs et agir dessus.",
        "Gérer les impacts environnementaux significatifs de l’organisation",
        ["Supprimer toute réglementation", "Éviter les indicateurs", "Remplacer la stratégie commerciale"],
        2,
        "intermediaire",
        null
      ),
      qq(
        "La revue de direction en ISO 14001 sert à :",
        "Valider l’adéquation et l’efficacité du système.",
        "S’assurer que l’EMS reste adapté et efficace",
        ["Choisir uniquement les couleurs de marque", "Supprimer les audits internes", "Ignorer les non-conformités"],
        2,
        "debutant",
        null
      ),
      qq(
        "Comparer ISO 14001 et un label produit type EU Ecolabel, on peut dire que :",
        "L’un cible l’organisation, l’autre un produit répondant à des critères environnementaux.",
        "ISO 14001 structure l’organisation ; l’EU Ecolabel distingue des produits à faible impact",
        ["Ce sont la même chose", "L’EU Ecolabel remplace ISO 14001", "Les deux sont obligatoires pour toutes les PME"],
        3,
        "avance",
        null
      ),
    ],
  });

  await seedModuleQuick(st2, {
    slug: "rm-b-corp-eu-ecolabel-emas",
    title: "B Corp, EU Ecolabel, EMAS : usages marketing",
    description:
      "Comprendre ce que garantissent ces référentiels et comment les présenter sans sur-promesse.",
    order: 2,
    estimatedMinutes: 15,
    difficulty: "intermediaire",
    lesson1Title: "B Corp : gouvernance, impact et communication",
    lesson1Content: withSources(
      [
        { type: "heading", level: 2, text: "Certification d’entreprise à impact global" },
        {
          type: "paragraph",
          text: "Le mouvement B Corp distingue les entreprises qui répondent à des standards élevés de performance sociale et environnementale, de transparence et de responsabilité vis-à-vis des parties prenantes. La communication doit rester alignée sur le score et les exigences en vigueur du référentiel B Lab.",
        },
        {
          type: "callout",
          variant: "tip",
          title: "Marketing",
          text: "Mettre en avant les domaines où l’entreprise excelle réellement (gouvernance, travailleurs, communauté, environnement, clients) plutôt qu’un message générique « nous sommes une B Corp ».",
        },
      ],
      [{ label: "B Lab — About B Corps", url: SRC.BCORP_ABOUT }]
    ),
    lesson2Title: "EU Ecolabel et EMAS : labels officiels de l’UE",
    lesson2Content: withSources(
      [
        { type: "heading", level: 2, text: "Labels européens reconnus" },
        {
          type: "paragraph",
          text: "L’EU Ecolabel distingue des produits et services à faible impact environnemental tout au long du cycle de vie. EMAS est le système communautaire d’audit environnemental et de management des organisations ; il renforce la transparence via une déclaration environnementale validée.",
        },
        {
          type: "list",
          style: "bullet",
          items: [
            "EU Ecolabel : critères produits/services, usage encadré du logo.",
            "EMAS : sites enregistrés, exigences de reporting et vérification.",
          ],
        },
      ],
      [
        { label: "Commission européenne — EU Ecolabel", url: SRC.EU_ECOSYSTEM_LABEL },
        { label: "Commission européenne — EMAS", url: SRC.EMAS },
      ]
    ),
    questions: [
      qq(
        "B Lab certifie principalement :",
        "Des entreprises selon des standards de performance globale.",
        "Des entreprises répondant aux critères B Impact selon B Lab",
        ["Des produits uniquement selon l’EU Ecolabel", "Des sites EMAS uniquement", "Des notations financières MSCI"],
        2,
        "debutant",
        0
      ),
      qq(
        "L’EU Ecolabel est :",
        "Le label environnemental officiel volontaire de l’UE pour des produits et services.",
        "Un label européen pour des produits et services à faible impact environnemental",
        ["Un impôt carbone", "Une norme ISO obligatoire", "Un classement bancaire"],
        2,
        "intermediaire",
        1
      ),
      qq(
        "EMAS se distingue notamment par :",
        "Un schéma d’audit et de déclaration environnementale pour les organisations.",
        "Un système communautaire d’audit environnemental et de management",
        ["Une certification produit grand public identique à l’EU Ecolabel", "Uniquement le droit du travail", "Uniquement la fiscalité locale"],
        2,
        "intermediaire",
        1
      ),
      qq(
        "Afficher B Corp + ISO 14001 sur un packaging sans préciser le périmètre peut :",
        "Créer une confusion sur ce qui est certifié (entreprise vs site vs produit).",
        "Brouiller la lecture entre certification d’entreprise et autres référentiels",
        ["Être recommandé sans limite", "Remplacer toute traçabilité fournisseurs", "Dispenser de bilan GES"],
        3,
        "avance",
        0
      ),
      qq(
        "Pour communiquer sur l’EU Ecolabel, il faut :",
        "Respecter les règles graphiques et d’usage fixées par le programme.",
        "Suivre les règles d’usage du logo et du cahier des charges applicable",
        ["Inventer un logo proche", "L’utiliser pour tout le catalogue", "L’associer à toute allégation carbone"],
        2,
        "debutant",
        null
      ),
      qq(
        "Une entreprise B Corp doit encore :",
        "Maintenir ses performances et la transparence dans le temps.",
        "Poursuivre l’alignement avec les standards et la re-certification",
        ["Arrêter tout reporting", "Se dispenser d’ISO 14001", "Ne plus dialoguer avec les parties prenantes"],
        2,
        "intermediaire",
        null
      ),
      qq(
        "EMAS renforce la crédibilité car :",
        "Il combine management, audit et information publique structurée.",
        "Il associe système de management, vérification et information publique",
        ["Il supprime les audits", "Il est réservé aux micro-entreprises", "Il remplace la loi"],
        2,
        "avance",
        null
      ),
      qq(
        "Le marketing ne doit pas présenter un label produit comme :",
        "Une garantie universelle sur tous les impacts sociétaux de l’entreprise.",
        "La preuve d’une performance globale sur tous les sujets RSE",
        ["Un critère d’achat pour certains segments", "Un repère pour les acheteurs publics", "Un signal de démarche qualité"],
        3,
        "debutant",
        null
      ),
    ],
  });

  // ——— 3. RSE et fidélisation client ———
  const st3 = await getOrCreateSubtheme({
    themeId,
    slug: "rse-et-fidelisation-client",
    title: "RSE et fidélisation client",
    description:
      "Transformer la confiance et la transparence en leviers de répétition d’achat et d’ambassadorship.",
    order: 3,
  });

  await seedModuleQuick(st3, {
    slug: "rm-confiance-marque-engagement",
    title: "Confiance, transparence et valeur perçue",
    description:
      "Lier promesses RSE, preuves et expérience client pour renforcer la fidélité.",
    order: 1,
    estimatedMinutes: 13,
    difficulty: "debutant",
    lesson1Title: "La confiance comme actif commercial",
    lesson1Content: withSources(
      [
        { type: "heading", level: 2, text: "Pourquoi la RSE nourrit la fidélité" },
        {
          type: "paragraph",
          text: "Les consommateurs et acheteurs professionnels comparent de plus en plus les marques sur la cohérence entre discours et pratiques. Une communication factuelle, des preuves accessibles et une gestion transparente des incidents renforcent la confiance et la répétition d’achat.",
        },
        {
          type: "list",
          style: "bullet",
          items: [
            "Clarté des origines et des conditions de production.",
            "Service après-vente aligné avec les valeurs affichées (ex. réparabilité).",
            "Programmes de feedback et correction publique des écarts.",
          ],
        },
      ],
      [
        { label: "Commission européenne — Green claims", url: SRC.EC_GREEN_CLAIMS },
        { label: "ISO — ISO 26000", url: SRC.ISO_26000 },
      ]
    ),
    lesson2Title: "Parcours client et preuves au point de contact",
    lesson2Content: withSources(
      [
        { type: "heading", level: 2, text: "Du site e-commerce au conseil en magasin" },
        {
          type: "paragraph",
          text: "Chaque point de contact doit pouvoir « tenir » la promesse RSE : fiches produit, scripts commerciaux, packaging, conditions générales. Harmoniser les KPI internes (taux de retour, NPS, plaintes) avec les messages marketing évite les ruptures d’expérience.",
        },
        {
          type: "callout",
          variant: "tip",
          title: "Quick win",
          text: "Ajouter un lien « comment ce chiffre est calculé » à côté des allégations clés sur le site augmente la confiance perçue sans alourdir la page.",
        },
      ],
      [{ label: "Nations unies — Global Compact", url: SRC.UN_GC }]
    ),
    questions: [
      qq(
        "La fidélisation par la RSE repose surtout sur :",
        "La cohérence entre promesse et expérience vécue.",
        "L’alignement entre discours durable et expérience réelle du client",
        ["Le prix le plus bas", "Le nombre maximal de labels", "L’absence de données"],
        2,
        "debutant",
        0
      ),
      qq(
        "Une plainte mal gérée sur un sujet « durable » peut :",
        "Détruire plus vite la confiance qu’une campagne n’en construit.",
        "Éroder fortement la crédibilité RSE de la marque",
        ["Être ignorée sans risque", "Renforcer automatiquement la NPS", "Ne concerner que le service juridique"],
        2,
        "intermediaire",
        0
      ),
      qq(
        "Harmoniser scripts commerciaux et données RSE sert à :",
        "Éviter que le vendeur promette plus que l’entreprise peut prouver.",
        "Réduire le risque de sur-promesse au contact client",
        ["Supprimer la formation", "Éviter tout reporting", "Remplacer le marketing digital"],
        2,
        "intermediaire",
        1
      ),
      qq(
        "Un lien « comment ce chiffre est calculé » aide surtout :",
        "La transparence méthodologique perçue par l’acheteur.",
        "À rendre la preuve accessible sans jargon excessif",
        ["À cacher les méthodes", "À supprimer les audits", "À éviter le RGPD"],
        2,
        "debutant",
        1
      ),
      qq(
        "La valeur perçue « durable » combine souvent :",
        "Bénéfice fonctionnel + confiance + alignement valeurs.",
        "Utilité produit, confiance et adéquation aux valeurs du client",
        ["Uniquement la couleur du logo", "Uniquement le prix", "Uniquement la TVA"],
        3,
        "avance",
        null
      ),
      qq(
        "Un programme de feedback client sur la RSE permet surtout de :",
        "Ajuster messages et offres selon les attentes réelles.",
        "Affiner produits et communication selon les attentes",
        ["Supprimer les indicateurs", "Éviter la veille concurrentielle", "Remplacer la R&D"],
        2,
        "intermediaire",
        null
      ),
      qq(
        "La transparence sur les limites d’une offre « verte » peut :",
        "Augmenter la crédibilité si le client comprend l’arbitrage.",
        "Renforcer la confiance par honnêteté sur les arbitrages",
        ["Toujours réduire les ventes", "Être interdite en B2B", "Remplacer la conformité produit"],
        2,
        "debutant",
        null
      ),
      qq(
        "Un client ambassadeur RSE est surtout :",
        "Un client qui partage volontairement une expérience cohérente avec la promesse.",
        "Un défenseur de la marque fondé sur une expérience crédible",
        ["Un influenceur payé sans brief", "Un salarié interne", "Un concurrent"],
        2,
        "intermediaire",
        null
      ),
    ],
  });

  await seedModuleQuick(st3, {
    slug: "rm-programmes-fidelite-valeurs",
    title: "Programmes de fidélité et communautés de valeurs",
    description:
      "Concevoir récompenses et contenus qui reflètent les engagements RSE sans instrumentaliser la cause.",
    order: 2,
    estimatedMinutes: 14,
    difficulty: "intermediaire",
    lesson1Title: "Fidélité : au-delà des points de réduction",
    lesson1Content: withSources(
      [
        { type: "heading", level: 2, text: "Récompenser des comportements alignés" },
        {
          type: "paragraph",
          text: "Les programmes de fidélité peuvent valoriser des choix sobres (réparation, reprise, livraison groupée) plutôt que d’inciter uniquement à la consommation accélérée. Le marketing doit éviter l’instrumentalisation superficielle des causes sociales (« cause washing »).",
        },
        { type: "divider" },
        {
          type: "paragraph",
          text: "Pensez à des paliers de récompense qui reflètent des actions mesurables (ex. retour consigne, choix d’emballage minimal) plutôt que des bonus génériques déconnectés de votre matérialité RSE.",
        },
      ],
      [{ label: "OCDE — Lignes directrices entreprises multinationales", url: SRC.OECD_MNE }]
    ),
    lesson2Title: "Communautés et cohérence avec le reporting",
    lesson2Content: withSources(
      [
        { type: "heading", level: 2, text: "Engager sans sur-promettre l’impact" },
        {
          type: "paragraph",
          text: "Les communautés (clubs clients, événements, UGC) amplifient les récits. Encadrer les témoignages, citer des résultats audités et relier aux objectifs extra-financiers publiés évite les dérives.",
        },
        {
          type: "callout",
          variant: "warning",
          title: "Cause marketing",
          text: "Associer une campagne à une ONG ou un ODD sans contribution mesurable ni gouvernance claire expose à des accusations d’opportunisme.",
        },
      ],
      [
        { label: "Commission européenne — Stratégie finance durable", url: SRC.EC_SF_STRATEGY },
        { label: "ISO — ISO 26000", url: SRC.ISO_26000 },
      ]
    ),
    questions: [
      qq(
        "Un programme de fidélité « durable » pertinent incite plutôt à :",
        "Des comportements sobres ou circulaires cohérents avec la stratégie.",
        "Des usages (réparation, reprise, livraison groupée) alignés avec la stratégie",
        ["Maximiser les retours invendables", "Augmenter uniquement le panier moyen", "Ignorer la logistique"],
        2,
        "intermediaire",
        0
      ),
      qq(
        "Le « cause washing » désigne :",
        "L’usage opportuniste d’une cause sans contribution crédible.",
        "Instrumentaliser une cause sociale sans impact sérieux derrière",
        ["Un partenariat long terme avec une ONG", "Un don anonyme", "Un rapport CSRD complet"],
        2,
        "debutant",
        0
      ),
      qq(
        "Les témoignages clients en marketing RSE doivent :",
        "Être authentiques, datés et conformes au droit de la publicité.",
        "Respecter la véracité et le cadre légal des avis et témoignages",
        ["Être systématiquement anonymes sans consentement", "Remplacer toute donnée chiffrée", "Ignorer le RGPD"],
        2,
        "intermediaire",
        1
      ),
      qq(
        "Relier une campagne communautaire au reporting permet :",
        "De montrer la cohérence entre storytelling et indicateurs.",
        "D’aligner narration publique et indicateurs publiés",
        ["De supprimer les KPI", "D’éviter les audits", "De remplacer la stratégie"],
        2,
        "debutant",
        1
      ),
      qq(
        "Récompenser la réparation plutôt que le seul achat neuf peut :",
        "Réduire l’impact matière et renforcer l’image de service.",
        "Réduire pression sur ressources et valoriser le service",
        ["Toujours baisser le CA", "Supprimer la garantie", "Interdire la fidélité"],
        3,
        "avance",
        null
      ),
      qq(
        "Un UGC (contenu généré par utilisateurs) sur la durabilité doit être :",
        "Modéré pour éviter allégations non fondées au nom de la marque.",
        "Contrôlé pour éviter des claims non prouvés",
        ["Laissé 100 % sans relecture", "Interdit", "Réservé au PDG"],
        2,
        "intermediaire",
        null
      ),
      qq(
        "La finance durable européenne (contexte général) pousse les entreprises à :",
        "Rendre l’information plus comparable pour les investisseurs.",
        "Améliorer comparabilité et fiabilité de l’information de durabilité",
        ["Supprimer tout marketing", "Éliminer les PME", "Interdire les labels"],
        2,
        "debutant",
        null
      ),
      qq(
        "Un bon indicateur pour un programme fidélité RSE est :",
        "Un lien clair entre action incitée et résultat environnemental/social.",
        "Mesurer l’effet des incitations sur un indicateur de durabilité",
        ["Uniquement le nombre de likes", "Uniquement le stock en magasin", "Uniquement la masse salariale"],
        3,
        "avance",
        null
      ),
    ],
  });

  // ——— 4. RSE et attractivité des talents ———
  const st4 = await getOrCreateSubtheme({
    themeId,
    slug: "rse-et-attractivite-talents",
    title: "RSE et attractivité des talents",
    description:
      "Employer branding, attentes des candidats et alignement entre discours RH et indicateurs sociaux.",
    order: 4,
  });

  await seedModuleQuick(st4, {
    slug: "rm-marche-emploi-attentes-rse",
    title: "Attentes des talents et crédibilité de l’employeur",
    description:
      "Comprendre ce que cherchent les candidats sur la RSE et comment le marketing RH reste factuel.",
    order: 1,
    estimatedMinutes: 14,
    difficulty: "debutant",
    lesson1Title: "RSE dans la décision de postuler",
    lesson1Content: withSources(
      [
        { type: "heading", level: 2, text: "Les candidats croisent plusieurs sources" },
        {
          type: "paragraph",
          text: "Site carrières, avis en ligne, médias sociaux, entretiens : les signaux doivent converger. Les principes de responsabilité sociétale (ISO 26000) incluent des thématiques « conditions et relations de travail » et « pratiques loyales » utiles pour structurer le discours employeur.",
        },
        {
          type: "paragraph",
          text: "Des travaux cités dans la littérature Zei illustrent l’enjeu : selon une étude menée par Cone Communications, 55 % des collaborateurs déclarent que l’engagement RSE d’une entreprise est un critère plus important que le salaire ; deux tiers des jeunes déclarent ne pas vouloir travailler pour une entreprise sans stratégie RSE solide ou au sens fort. Côté consommateurs, une étude de l’ADEME menée en 2019 indique que 80 % des Français ont déjà changé leurs habitudes pour consommer plus durablement. Parmi les grandes entreprises et ETI, 62 % ont fixé un objectif de neutralité carbone incluant les achats — un signal pour les marques employeurs en B2B.",
        },
        {
          type: "callout",
          variant: "tip",
          title: "Vu par ZEI",
          text: "Pour la marque employeur, traitez la RSE comme une promesse vérifiable : les mêmes chiffres et exemples doivent tenir sur le site carrières, dans les entretiens et dans vos indicateurs internes. Les guides Zei « En Bref 5 — CSRD » et « VSME » recensent ces ordres de grandeur pour ancrer le discours dans des références publiées.",
        },
        {
          type: "list",
          style: "bullet",
          items: [
            "Transparence sur la diversité, la sécurité et la formation.",
            "Preuves d’engagements collectifs (accords, comités CE-CSE).",
            "Cohérence entre annonces « green job » et fiches de poste réelles.",
          ],
        },
      ],
      [
        { label: "Zei — En Bref 5 — CSRD (PDF)", url: ZEI_KB.EN_BREF_5_CSRD },
        { label: "Zei — La VSME expliquée (PDF)", url: ZEI_KB.VSME_LANGAGE_COMMUN },
        { label: "ISO — ISO 26000", url: SRC.ISO_26000 },
        { label: "OCDE — Lignes directrices entreprises multinationales", url: SRC.OECD_MNE },
      ]
    ),
    lesson2Title: "Éviter le « social washing » en recrutement",
    lesson2Content: withSources(
      [
        { type: "heading", level: 2, text: "Promesses RH tenables" },
        {
          type: "paragraph",
          text: "Surligner des avantages « bien-être » sans budget ni indicateurs expose à la déception des nouvelles recrues et aux avis négatifs. Le marketing RH doit s’appuyer sur des politiques documentées et des objectifs mesurables.",
        },
        {
          type: "paragraph",
          text: "Côté coût et marchés, le livre blanc Zei sur la VSME rappelle que 13 340 € représente le coût annuel estimé d’un·e salarié·e non motivé·e pour l’entreprise, et que 15 % de la notation des appels d’offres repose sur des critères ESG — utile pour aligner discours employeur et enjeux commerciaux.",
        },
        {
          type: "callout",
          variant: "tip",
          title: "Vu par ZEI",
          text: "Reliez marque employeur et dossiers clients ou AO : une même base de données ESG alimente les réponses aux questionnaires fournisseurs et la crédibilité du discours RH. Source chiffrée : livre blanc « La VSME expliquée ».",
        },
        {
          type: "callout",
          variant: "tip",
          title: "Preuve sociale",
          text: "Mettre en avant des parcours internes réels, des certifications de compétences et des accords d’entreprise plutôt que des slogans génériques.",
        },
      ],
      [
        { label: "Zei — La VSME expliquée (PDF)", url: ZEI_KB.VSME_LANGAGE_COMMUN },
        { label: "Nations unies — Global Compact", url: SRC.UN_GC },
      ]
    ),
    questions: [
      qq(
        "Les candidats évaluent souvent la RSE de l’employeur via :",
        "La cohérence entre plusieurs canaux (site, avis, entretien).",
        "La convergence des signaux sur la durée",
        ["Uniquement le salaire affiché", "Uniquement le nombre de bureaux", "Uniquement la couleur du logo"],
        2,
        "debutant",
        0
      ),
      qq(
        "Le « social washing » en RH correspond à :",
        "Des promesses sociales/bien-être non soutenues par les pratiques.",
        "Surpromettre l’expérience employé sans moyens ni résultats",
        ["Un plan de formation documenté", "Un accord d’entreprise signé", "Des indicateurs d’accidents publiés"],
        2,
        "intermediaire",
        0
      ),
      qq(
        "ISO 26000 couvre notamment :",
        "Les conditions et relations de travail comme sujet central.",
        "Les thématiques travail et dialogue social parmi ses sujets",
        ["Uniquement le bilan carbone produit", "Uniquement la fiscalité", "Uniquement le marketing digital"],
        2,
        "intermediaire",
        1
      ),
      qq(
        "Le Global Compact de l’ONU rappelle notamment :",
        "Des principes sur les droits humains et le travail applicables aux employeurs.",
        "Des engagements sur droits humains, travail, environnement et anti-corruption",
        ["Des ratios boursiers obligatoires", "Un salaire minimum européen unique", "L’interdiction du télétravail"],
        2,
        "debutant",
        1
      ),
      qq(
        "Un bon contenu « preuve » sur la page carrières est :",
        "Un indicateur social clé et sa tendance sur 2–3 ans.",
        "Un graphique ou tableau d’évolution d’un indicateur RH pertinent",
        ["Uniquement une citation anonyme", "Uniquement une photo stock", "Uniquement un jeu-concours"],
        3,
        "avance",
        null
      ),
      qq(
        "Aligner managers et marketing RH sert à :",
        "Éviter les écarts entre discours public et entretien.",
        "Garantir la même narration lors des entretiens",
        ["Supprimer la formation managers", "Réduire les salaires", "Éviter tout indicateur"],
        2,
        "intermediaire",
        null
      ),
      qq(
        "Les Lignes directrices OCDE sont utiles pour :",
        "Cadre de diligence raisonnable attendu des entreprises.",
        "Structurer une approche de diligence sur les impacts",
        ["Remplacer le contrat de travail", "Fixer les congés payés", "Supprimer le CE"],
        2,
        "debutant",
        null
      ),
      qq(
        "Un employeur brand « durable » crédible intègre :",
        "Données RH + politiques + témoignages vérifiables.",
        "Politiques, indicateurs et récits cohérents",
        ["Uniquement des hashtags", "Uniquement des primes", "Uniquement le siège social"],
        2,
        "intermediaire",
        null
      ),
    ],
  });

  await seedModuleQuick(st4, {
    slug: "rm-employer-branding-rse-actions",
    title: "Employer branding RSE : actions et canaux",
    description:
      "Déployer la marque employeur durable sur les bons supports sans sur-filtrer l’image.",
    order: 2,
    estimatedMinutes: 15,
    difficulty: "intermediaire",
    lesson1Title: "Canaux : médias sociaux, événements, écoles",
    lesson1Content: withSources(
      [
        { type: "heading", level: 2, text: "Adapter le format au public" },
        {
          type: "paragraph",
          text: "LinkedIn, salons, partenariats avec écoles : chaque canal a ses codes. Les messages doivent rester vérifiables (photos de sites réels, citations nommées avec accord, chiffres issus du rapport de durabilité ou du bilan social).",
        },
        {
          type: "table",
          headers: ["Canal", "Message fort", "Risque"],
          rows: [
            ["Réseaux sociaux", "Culture et projets", "Bullshit jobs / greenwashing social"],
            ["Salons emploi", "Rencontre managériale", "Promesses non tenues sur place"],
          ],
        },
        {
          type: "callout",
          variant: "tip",
          title: "Vu par ZEI",
          text: "Les études citées dans « En Bref 5 — CSRD » et « La VSME expliquée » vont dans le même sens : sens au travail, attentes sur les achats durables et barèmes ESG dans les AO. Calibrez vos campagnes employeur sur des faits vérifiables (rapports, labels, indicateurs), pas sur des envolées isolées du reporting.",
        },
      ],
      [
        { label: "Zei — En Bref 5 — CSRD (PDF)", url: ZEI_KB.EN_BREF_5_CSRD },
        { label: "Zei — La VSME expliquée (PDF)", url: ZEI_KB.VSME_LANGAGE_COMMUN },
        { label: "ISO — ISO 26000", url: SRC.ISO_26000 },
      ]
    ),
    lesson2Title: "Mesurer l’attractivité au-delà des clics",
    lesson2Content: withSources(
      [
        { type: "heading", level: 2, text: "Indicateurs qualité de recrutement" },
        {
          type: "paragraph",
          text: "Taux d’acceptation d’offre, délai de recrutement, diversité des viviers, rétention à 12 mois : reliez ces KPI aux actions RSE annoncées pour vérifier si la promesse tient dans l’expérience.",
        },
        {
          type: "regulatory_note",
          year: 2026,
          companySize: "all",
          text: "Les obligations légales en matière d’égalité professionnelle ou de handicap restent distinctes du marketing employeur ; la conformité prime sur le discours.",
        },
      ],
      [
        { label: "Commission européenne — CSRD (reporting entreprises)", url: SRC.EC_CSRD_PAGE },
        { label: "OCDE — Lignes directrices entreprises multinationales", url: SRC.OECD_MNE },
      ]
    ),
    questions: [
      qq(
        "Un post LinkedIn « nous sommes engagés » sans exemple concret risque :",
        "De ne pas se distinguer et d’éveiller la méfiance.",
        "D’être perçu comme générique ou non crédible",
        ["De doubler automatiquement les candidatures", "D’être illégal", "De remplacer l’entretien"],
        2,
        "debutant",
        0
      ),
      qq(
        "Citer des collaborateurs avec accord et contexte sert à :",
        "Renforcer l’authenticité du témoignage.",
        "Assurer la véracité et le respect des personnes",
        ["Éviter toute preuve chiffrée", "Remplacer la politique RH", "Supprimer la diversité"],
        2,
        "intermediaire",
        0
      ),
      qq(
        "Le taux d’acceptation d’offre reflète surtout :",
        "L’adéquation perçue entre promesse et package réel.",
        "La cohérence offre / marque employeur / conditions",
        ["Uniquement la taille du logo", "Uniquement le nombre de likes", "Uniquement la météo"],
        2,
        "intermediaire",
        1
      ),
      qq(
        "Relier KPI RH aux actions RSE permet :",
        "De tester si la promesse durable se traduit en expérience.",
        "De valider l’impact perçu des politiques annoncées",
        ["De supprimer les entretiens", "D’éviter la paie", "De remplacer le CE"],
        3,
        "avance",
        1
      ),
      qq(
        "Un salon emploi efficace sur la RSE prévoit :",
        "Des interlocuteurs informés des indicateurs et projets.",
        "Des managers briefés sur données et limites",
        ["Uniquement des goodies", "Uniquement une vidéo stock", "Aucun chiffre"],
        2,
        "debutant",
        null
      ),
      qq(
        "La note « diversité des viviers » peut aider à :",
        "Vérifier si les canaux évitent la reproduction homogène.",
        "Élargir les sources de candidatures",
        ["Supprimer les critères de compétence", "Éviter l’objectivité", "Remplacer l’entretien technique"],
        2,
        "intermediaire",
        null
      ),
      qq(
        "La conformité légale (égalité, handicap…) et le marketing RH doivent :",
        "Rester distinctes : la conformité n’est pas un slogan.",
        "Être traitées avec rigueur juridique distincte du storytelling",
        ["Être fusionnées sans distinction", "Être ignorées si la marque est forte", "Être remplacées par des émojis"],
        3,
        "avance",
        null
      ),
      qq(
        "Un partenariat école / entreprise crédible inclut :",
        "Des actions pédagogiques mesurables et suivies.",
        "Des interventions et projets étudiants concrets",
        ["Uniquement un logo sur un PDF", "Uniquement une promesse de CDI", "Aucun contact"],
        2,
        "debutant",
        null
      ),
    ],
  });

  // ——— 5. RSE dans les appels d’offres publics ———
  const st5 = await getOrCreateSubtheme({
    themeId,
    slug: "rse-appels-offres-publics",
    title: "RSE dans les appels d’offres publics",
    description:
      "Critères techniques et environnementaux/sociaux, preuves et documentation pour répondre sans sur-allégation.",
    order: 5,
  });

  await seedModuleQuick(st5, {
    slug: "rm-criteres-achats-durables-marches-publics",
    title: "Marchés publics : critères et achats durables",
    description:
      "Cadre européen des marchés publics et intégration d’exigences environnementales ou sociales.",
    order: 1,
    estimatedMinutes: 16,
    difficulty: "intermediaire",
    lesson1Title: "Directive classique 2014/24/UE et achats durables",
    lesson1Content: withSources(
      [
        { type: "heading", level: 2, text: "Intégrer la durabilité dans les procédures" },
        {
          type: "paragraph",
          text: "Le droit des marchés publics de l’UE encadre la manière dont les acheteurs peuvent fixer des spécifications techniques, critères d’attribution et clauses d’exécution liées à l’environnement ou aux aspects sociaux, dans le respect des principes de transparence et d’égalité de traitement.",
        },
        {
          type: "callout",
          variant: "info",
          title: "Pour l’offrant",
          text: "Relisez précisément les critères pondérés : chaque promesse doit être démontrable dans le mémoire technique et, le cas échéant, par des attestations ou labels admis par le cahier des charges.",
        },
        {
          type: "paragraph",
          text: "Le livre blanc Zei « La VSME expliquée » indique que 15 % de la notation des appels d’offres est basée sur des critères ESG — une pondération à avoir en tête lors de la lecture du règlement de consultation.",
        },
        {
          type: "callout",
          variant: "tip",
          title: "Vu par ZEI",
          text: "Préparez vos preuves comme une bibliothèque réutilisable : mêmes données pour bilan carbone, questionnaires fournisseurs et critères ESG du dossier — le même raisonnement que dans les exemples Zei de mise en cohérence multi-référentiels.",
        },
      ],
      [
        { label: "EUR-Lex — Directive 2014/24/UE (marchés publics classiques)", url: SRC.EUR_LEX_CLASSIC_DIR },
        { label: "Commission européenne — Marchés publics", url: SRC.EU_PROCUREMENT },
        { label: "Zei — La VSME expliquée (PDF)", url: ZEI_KB.VSME_LANGAGE_COMMUN },
      ]
    ),
    lesson2Title: "Spécifications techniques et preuves acceptables",
    lesson2Content: withSources(
      [
        { type: "heading", level: 2, text: "Du critère à la preuve" },
        {
          type: "paragraph",
          text: "Les spécifications peuvent viser des caractéristiques environnementales (matériaux, réparabilité, émissions) ou sociales (clauses réservées, critères sur les conditions de travail de la chaîne). L’offre doit lier chaque engagement à une méthode ou un document vérifiable.",
        },
        {
          type: "list",
          style: "ordered",
          items: [
            "Identifier les exigences éliminatoires vs critères d’attribution.",
            "Constituer le dossier de preuves (certificats, rapports, cas clients).",
            "Anticiper les sous-traitants et leur conformité.",
          ],
        },
      ],
      [
        { label: "Légifrance — Code de la commande publique (texte consolidé)", url: SRC.FR_CODE_MARCHES },
        { label: "Commission européenne — Marchés publics", url: SRC.EU_PROCUREMENT },
      ]
    ),
    questions: [
      qq(
        "Les marchés publics dans l’UE sont encadrés notamment par :",
        "Des directives harmonisant procédures et principes.",
        "Un cadre juridique européen transpose en droit national",
        ["Uniquement le droit américain", "Uniquement les usages de place", "Uniquement la CSRD"],
        2,
        "debutant",
        0
      ),
      qq(
        "Intégrer des critères environnementaux dans un marché public doit respecter :",
        "Transparence, égalité de traitement et lien avec l’objet du marché.",
        "Les principes de transparence et de non-discrimination",
        ["Des critères secrets", "Des favoritismes locaux", "L’absence de publication"],
        2,
        "intermediaire",
        0
      ),
      qq(
        "Une preuve typique pour une exigence ISO peut être :",
        "Un certificat en cours de validité dans le périmètre demandé.",
        "Une attestation de certification pour le scope concerné",
        ["Un tweet de l’entreprise", "Une promesse orale", "Un logo recopié"],
        2,
        "intermediaire",
        1
      ),
      qq(
        "Le Code de la commande publique en France :",
        "Codifie les règles applicables aux entités adjudicatrices.",
        "Constitue le socle juridique national des marchés publics",
        ["Remplace toute directive européenne", "Ne concerne que les achats privés", "Interdit les critères sociaux"],
        2,
        "debutant",
        1
      ),
      qq(
        "Sur-promettre dans un mémoire technique expose à :",
        "Risque d’exclusion, pénalités ou résiliation pour inexécution.",
        "Sanctions contractuelles et perte de confiance de l’acheteur public",
        ["Une médaille automatique", "Une hausse de capital", "Une dispense d’audit"],
        3,
        "avance",
        null
      ),
      qq(
        "Une clause sociale peut viser :",
        "Des conditions de travail ou l’insertion selon le cadre du marché.",
        "L’emploi ou des critères sociaux liés à l’exécution",
        ["Uniquement la couleur des livrables", "Uniquement le prix du papier", "Uniquement la TVA"],
        2,
        "intermediaire",
        null
      ),
      qq(
        "Le lien entre CSRD et marchés publics pour une grande entreprise peut être :",
        "Cohérence entre données publiées et réponses aux AO.",
        "Réutiliser des données auditées dans les dossiers de candidature",
        ["Inexistant par principe", "Interdit", "Réservé aux micro-entreprises"],
        3,
        "avance",
        null
      ),
      qq(
        "Un critère d’attribution « bilan carbone du service » exige :",
        "Une méthode et un périmètre clairs dans l’offre.",
        "Une méthodologie et des hypothèses documentées",
        ["Uniquement un slogan", "Uniquement un logo", "Aucune donnée"],
        2,
        "debutant",
        null
      ),
    ],
  });

  await seedModuleQuick(st5, {
    slug: "rm-reponses-offres-valeur-ajoutee-rse",
    title: "Mémoire technique : valeur ajoutée RSE",
    description:
      "Structurer la réponse pour scorer sur les critères RSE sans surcharger ni inventer.",
    order: 2,
    estimatedMinutes: 15,
    difficulty: "avance",
    lesson1Title: "Storyline du mémoire : problème — solution — preuve",
    lesson1Content: withSources(
      [
        { type: "heading", level: 2, text: "Lisibilité pour le jury" },
        {
          type: "paragraph",
          text: "Un jury public cherche la conformité, puis la valeur ajoutée. Pour chaque lot, articulez : besoin de l’acheteur, votre réponse technique, indicateurs RSE pertinents (ex. taux de sous-traitance locale, certifications, politique achats responsables) et preuves.",
        },
        {
          type: "callout",
          variant: "warning",
          title: "Greenwashing dans un AO",
          text: "Des allégations non sourcées peuvent coûter la note sur le critère « qualité technique » et nuire à votre réputation auprès des acheteurs sectoriels.",
        },
        {
          type: "paragraph",
          text: "Exemple de cadrage Zei (proposition commerciale type « Portalp France ») : renouveler un bilan carbone après un exercice réalisé sur une autre calculette ; collecter la donnée auprès des fournisseurs pour identifier des leviers de décarbonation ; viser une progression d’évaluation EcoVadis (Silver vers Gold en 2027 dans le cas documenté) ; produire un rapport RSE personnalisé sur une même plateforme d’ici une échéance fixée (2028 dans le document). Chaque point correspond à des preuves et livrables distincts dans un mémoire.",
        },
        {
          type: "callout",
          variant: "tip",
          title: "Vu par ZEI",
          text: "Réutilisez les mêmes jeux de données que pour vos référentiels volontaires : indicateurs déjà consolidés, pièces EcoVadis et traces de collecte fournisseurs nourrissent un mémoire sans double langage. L’exemple Portalp dans les slides Zei illustre ce lien entre outillage et réponses aux exigences clients ou AO.",
        },
      ],
      [
        { label: "Zei — Exemple proposition Portalp France (Slides)", url: ZEI_KB.PROPOSITION_PORTALP },
        { label: "Zei — La VSME expliquée (PDF)", url: ZEI_KB.VSME_LANGAGE_COMMUN },
        { label: "Commission européenne — Green claims", url: SRC.EC_GREEN_CLAIMS },
        { label: "ISO — ISO 26000", url: SRC.ISO_26000 },
      ]
    ),
    lesson2Title: "Labels et attestations : lire le cahier des charges",
    lesson2Content: withSources(
      [
        { type: "heading", level: 2, text: "Seuls les labels reconnus comptent" },
        {
          type: "paragraph",
          text: "Le cahier des charges liste souvent les labels ou normes admises (ex. EU Ecolabel pour certains produits, ISO 14001 pour le système). Proposer un label non listé ou hors périmètre fait perdre des points inutilement.",
        },
        {
          type: "divider",
        },
        {
          type: "paragraph",
          text: "Joignez les attestations sur le bon périmètre géographique et temporel ; mentionnez les limites (ex. certification site A, pas site B) pour éviter une mauvaise surprise en phase d’exécution.",
        },
      ],
      [
        { label: "Commission européenne — EU Ecolabel", url: SRC.EU_ECOSYSTEM_LABEL },
        { label: "ISO — ISO 14001", url: SRC.ISO_14001 },
      ]
    ),
    questions: [
      qq(
        "La première lecture d’un jury porte souvent sur :",
        "La conformité administrative et technique de base.",
        "L’admissibilité et la conformité aux exigences",
        ["Uniquement le style graphique", "Uniquement le prix bas", "Uniquement le nombre de pages"],
        2,
        "debutant",
        0
      ),
      qq(
        "Une « preuve » solide dans un mémoire est :",
        "Un document traçable (certificat, rapport, attestation).",
        "Un document vérifiable et pertinent pour le critère",
        ["Une rumeur", "Un emoji", "Un slogan"],
        2,
        "intermediaire",
        0
      ),
      qq(
        "Proposer un label non demandé peut :",
        "Distracter ou montrer une incompréhension du besoin.",
        "Nuire à la clarté si le cahier des charges est strict",
        ["Garantir la victoire", "Remplacer une exigence", "Supprimer les pénalités"],
        2,
        "intermediaire",
        1
      ),
      qq(
        "Mentionner les limites de périmètre d’une certification est :",
        "Une marque d’honnêteté qui réduit le risque contractuel.",
        "Une bonne pratique pour sécuriser l’exécution",
        ["Toujours interdit", "Inutile", "Réservé au privé"],
        2,
        "debutant",
        1
      ),
      qq(
        "Aligner mémoire technique et reporting CSRD (si applicable) permet :",
        "De réutiliser des données auditées cohérentes.",
        "D’éviter les contradictions entre sources publiques",
        ["D’éviter tout contrôle", "De supprimer les clauses sociales", "De court-circuiter la loi"],
        3,
        "avance",
        null
      ),
      qq(
        "Un critère « qualité technique » évalue surtout :",
        "L’adéquation et la robustesse de l’offre au besoin.",
        "La valeur technique par rapport au besoin exprimé",
        ["Uniquement la couleur du reliure", "Uniquement le nombre d’années d’existence", "Uniquement le chiffre d’affaires"],
        2,
        "intermediaire",
        null
      ),
      qq(
        "Les allégations environnementales dans un AO doivent :",
        "Être étayées comme en communication grand public.",
        "Être substantiées pour résister au contrôle de l’acheteur",
        ["Être floues pour garder le secret", "Être uniquement orales", "Ignorer les normes"],
        3,
        "avance",
        null
      ),
      qq(
        "Un plan de management de projet RSE dans l’offre sert à :",
        "Montrer comment les engagements seront pilotés en exécution.",
        "Démontrer le pilotage des engagements sur la durée du marché",
        ["Remplacer le CCTP", "Supprimer les pénalités", "Éviter les livrables"],
        2,
        "debutant",
        null
      ),
    ],
  });

  // ——— 6. Storytelling RSE ———
  const st6 = await getOrCreateSubtheme({
    themeId,
    slug: "storytelling-rse-exemples-reussis",
    title: "Storytelling RSE : exemples réussis",
    description:
      "Narratifs basés sur données, formats médias et campagnes alignées avec la matérialité.",
    order: 6,
  });

  await seedModuleQuick(st6, {
    slug: "rm-narratif-donnees-impact",
    title: "Données, impact et récit de transformation",
    description:
      "Construire un arc narratif crédible : diagnostic, actions, résultats et perspectives.",
    order: 1,
    estimatedMinutes: 14,
    difficulty: "intermediaire",
    lesson1Title: "De la donnée au récit",
    lesson1Content: withSources(
      [
        { type: "heading", level: 2, text: "Protagoniste, tension, résolution" },
        {
          type: "paragraph",
          text: "Un bon storytelling RSE place le public (client, talent, citoyen) au centre, expose un enjeu concret, montre les actions de l’entreprise et livre des résultats mesurables avec sources. Les recommandations européennes sur les allégations vertes rappellent l’importance de preuves robustes.",
        },
        {
          type: "list",
          style: "bullet",
          items: [
            "Choisir 1–3 indicateurs phares (émissions évitées, heures de formation, etc.).",
            "Montrer l’évolution dans le temps plutôt qu’un snapshot isolé.",
            "Citer la méthode (norme, périmètre, année).",
          ],
        },
      ],
      [
        { label: "Commission européenne — Green claims", url: SRC.EC_GREEN_CLAIMS },
        { label: "Commission européenne — Proposition directive green claims", url: SRC.EC_GREEN_CLAIMS_PROPOSAL },
      ]
    ),
    lesson2Title: "Éviter le « hero washing »",
    lesson2Content: withSources(
      [
        { type: "heading", level: 2, text: "Humilité et redevabilité" },
        {
          type: "paragraph",
          text: "Les récits « héroïques » sans contreparties ni limites sonnent faux. Reconnaître les défis en cours et les prochaines étapes renforce la confiance plus qu’un discours parfaitement lisse.",
        },
        {
          type: "callout",
          variant: "tip",
          title: "Format court",
          text: "Une vidéo 90 s. avec 1 responsable métier + 1 graphique sourcé bat souvent une campagne vague multi-supports.",
        },
      ],
      [{ label: "ISO — ISO 26000", url: SRC.ISO_26000 }]
    ),
    questions: [
      qq(
        "Un storytelling RSE efficace commence souvent par :",
        "Un enjeu concret compris du public cible.",
        "Un problème ou une tension pertinente pour l’audience",
        ["La date de création de l’entreprise", "Uniquement le logo", "Uniquement le prix"],
        2,
        "debutant",
        0
      ),
      qq(
        "Montrer l’évolution temporelle d’un indicateur sert à :",
        "Prouver une dynamique de progrès ou de pilotage.",
        "Rendre crédible la trajectoire plutôt qu’un instantané",
        ["Masquer les erreurs passées", "Supprimer la méthode", "Éviter les audits"],
        2,
        "intermediaire",
        0
      ),
      qq(
        "Le « hero washing » correspond à :",
        "Un récit trop parfait sans limites ni redevabilité.",
        "Un discours héroïque déconnecté des faits et arbitrages",
        ["Un témoignage client réel", "Un rapport de progrès chiffré", "Une reconnaissance d’erreur"],
        2,
        "intermediaire",
        1
      ),
      qq(
        "Citer la méthode derrière un chiffre d’impact permet :",
        "La vérification par des tiers.",
        "La reproductibilité et la comparabilité",
        ["D’éviter toute communication", "De remplacer les livrables", "De supprimer les labels"],
        2,
        "debutant",
        1
      ),
      qq(
        "Un format vidéo court avec 1 graphique sourcé est utile car :",
        "Il concentre preuve + émotion sans dispersion.",
        "Il combine preuve chiffrée et narration humaine",
        ["Il remplace la stratégie", "Il supprime le besoin de site web", "Il évite la réglementation"],
        3,
        "avance",
        null
      ),
      qq(
        "Reconnaître des défis en cours dans un storytelling :",
        "Augmente la crédibilité perçue.",
        "Montre de la maturité et de la transparence",
        ["Est interdit en B2B", "Réduit toujours les ventes", "Remplace les KPI"],
        2,
        "debutant",
        null
      ),
      qq(
        "Les green claims européens visent aussi :",
        "Les communications B2C sur produits et organisations.",
        "Des allégations volontaires vérifiables",
        ["Uniquement la fiscalité", "Uniquement le secret des entreprises", "Uniquement le maritime"],
        2,
        "intermediaire",
        null
      ),
      qq(
        "Un arc narratif classique comprend :",
        "Contexte, tension, actions, résultats, suite.",
        "Enjeu, réponse de l’organisation, résultats, perspectives",
        ["Uniquement un slogan", "Uniquement une photo", "Uniquement un prix"],
        3,
        "avance",
        null
      ),
    ],
  });

  await seedModuleQuick(st6, {
    slug: "rm-formats-campagnes-rse-medias",
    title: "Formats médias et campagnes RSE",
    description:
      "Choisir canaux et formats adaptés tout en sécurisant juridiquement les messages.",
    order: 2,
    estimatedMinutes: 15,
    difficulty: "intermediaire",
    lesson1Title: "Formats : rapport, web, social, événement",
    lesson1Content: withSources(
      [
        { type: "heading", level: 2, text: "Adapter profondeur et public" },
        {
          type: "paragraph",
          text: "Le rapport de durabilité ou DPEF apporte la profondeur ; les réseaux sociaux distillent des micro-preuves ; les événements créent la rencontre. Chaque format doit pointer vers une preuve plus complète (page « méthodologie », annexe).",
        },
        {
          type: "table",
          headers: ["Format", "Force", "Risque"],
          rows: [
            ["Post social", "Portée", "Simplification excessive"],
            ["Rapport PDF", "Détail", "Faible lisibilité grand public"],
          ],
        },
      ],
      [
        { label: "Commission européenne — CSRD", url: SRC.EC_CSRD_PAGE },
        { label: "Commission européenne — Stratégie finance durable", url: SRC.EC_SF_STRATEGY },
      ]
    ),
    lesson2Title: "Campagne multi-touch : cohérence des messages",
    lesson2Content: withSources(
      [
        { type: "heading", level: 2, text: "Playbook message unique + déclinaisons" },
        {
          type: "paragraph",
          text: "Définissez une « message house » validée par RSE, juridique et marketing, puis déclinez par canal en conservant les mêmes définitions chiffrées. Évitez les équipes silo qui modifient les pourcentages entre un post et une landing page.",
        },
        {
          type: "callout",
          variant: "important",
          title: "Preuve",
          text: "Pour chaque campagne, gardez un fichier source (tableur, étude LCA, rapport RH) versionné et accessible en cas de contrôle.",
        },
      ],
      [
        { label: "OCDE — Lignes directrices entreprises multinationales", url: SRC.OECD_MNE },
        { label: "Nations unies — Global Compact", url: SRC.UN_GC },
      ]
    ),
    questions: [
      qq(
        "Un rapport de durabilité et un post Instagram doivent :",
        "Partager les mêmes définitions chiffrées clés.",
        "Rester cohérents sur les chiffres et périmètres",
        ["Toujours se contredire", "Utiliser des périmètres différents sans mention", "Ignorer la méthode"],
        2,
        "debutant",
        0
      ),
      qq(
        "Le risque principal des posts sociaux sur la RSE est :",
        "La simplification excessive ou trompeuse.",
        "La sur-simplification qui devient une allégation non prouvée",
        ["La trop grande précision", "L’absence d’audience", "Le manque d’émojis"],
        2,
        "intermediaire",
        0
      ),
      qq(
        "Une « message house » sert à :",
        "Centraliser les formulations validées.",
        "Aligner juridique, RSE et marketing sur un socle commun",
        ["Supprimer le reporting", "Remplacer le produit", "Éviter les clients"],
        2,
        "intermediaire",
        1
      ),
      qq(
        "Garder un fichier source versionné permet :",
        "De répondre rapidement à un contrôle ou une question média.",
        "De prouver l’origine des chiffres communiqués",
        ["D’effacer l’historique", "D’éviter la comptabilité", "De supprimer les audits"],
        2,
        "debutant",
        1
      ),
      qq(
        "La CSRD (pour les entreprises concernées) renforce :",
        "L’information de durabilité standardisée pour les marchés.",
        "La comparabilité des informations publiées",
        ["L’interdiction du marketing", "La fin des labels", "L’exemption des PME européennes"],
        3,
        "avance",
        null
      ),
      qq(
        "Un événement terrain RSE réussi prépare :",
        "Des experts capables d’expliquer chiffres et limites.",
        "Des porte-parole formés aux données et aux risques",
        ["Uniquement des goodies", "Uniquement une scène", "Aucun fait"],
        2,
        "intermediaire",
        null
      ),
      qq(
        "Lier un post à une page « méthodologie » permet :",
        "De combiner reach et profondeur.",
        "D’offrir la preuve sans alourdir chaque post",
        ["De cacher la méthode", "De supprimer le site", "D’éviter le RGPD"],
        2,
        "debutant",
        null
      ),
      qq(
        "Une campagne multi-touch efficace évite :",
        "Les chiffres contradictoires entre canaux.",
        "Les divergences de pourcentages entre supports",
        ["Toute coordination", "Toute preuve", "Tout objectif"],
        2,
        "intermediaire",
        null
      ),
    ],
  });

  console.log("\n✅ Seed RSE & Marketing terminé.\n");
}

seedRseMarketing()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sql.end({ timeout: 5 });
  });