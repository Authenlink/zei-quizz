export type AchievementCatalogEntry = {
  label: string;
  description: string;
  icon: string;
};

/** Clés = `achievementType` persistés en base (slugs thème avec tirets → clés entre guillemets). */
export const ACHIEVEMENT_CATALOG: Record<string, AchievementCatalogEntry> = {
  first_quiz: {
    label: "Premier pas",
    description: "Complété votre premier module",
    icon: "FootprintsIcon",
  },
  theme_rse_complete: {
    label: "Expert RSE",
    description: "Terminé tous les modules du thème RSE",
    icon: "LeafIcon",
  },
  theme_csrd_complete: {
    label: "Expert CSRD",
    description: "Terminé tous les modules du thème CSRD",
    icon: "FileTextIcon",
  },
  theme_esg_complete: {
    label: "Expert ESG",
    description: "Terminé tous les modules du thème ESG",
    icon: "BarChart2Icon",
  },
  "theme_obligations-2025-2026_complete": {
    label: "Expert Obligations",
    description: "Terminé tous les modules des obligations 2025-2026",
    icon: "CalendarIcon",
  },
  "theme_rse-marketing_complete": {
    label: "Expert RSE & Marketing",
    description: "Terminé tous les modules du thème RSE & Marketing",
    icon: "MegaphoneIcon",
  },
  "theme_zei-rse_complete": {
    label: "Expert ZEI & RSE",
    description: "Terminé tous les modules du thème ZEI & RSE",
    icon: "StarIcon",
  },
  zei_ambassador: {
    label: "ZEI Ambassador",
    description: "Terminé le parcours ZEI & RSE",
    icon: "StarIcon",
  },
  perfect_score: {
    label: "Score parfait",
    description: "Obtenu 100% à un quiz",
    icon: "TrophyIcon",
  },
  assidu: {
    label: "Assidu",
    description: "5 modules complétés",
    icon: "FlameIcon",
  },
  platform_complete: {
    label: "Plateforme complète",
    description: "Terminé l'ensemble de tous les thèmes",
    icon: "AwardIcon",
  },
};

/** Toutes les clés catalogue (ordre insertion objet ≈ ordre d’affichage stable). */
export const ACHIEVEMENT_CATALOG_KEYS: string[] =
  Object.keys(ACHIEVEMENT_CATALOG);

export function getAchievementMeta(achievementType: string): AchievementCatalogEntry & {
  achievementType: string;
} {
  const row = ACHIEVEMENT_CATALOG[achievementType];
  if (row) {
    return { achievementType, ...row };
  }
  return {
    achievementType,
    label: achievementType,
    description: "",
    icon: "AwardIcon",
  };
}
