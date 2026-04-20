import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  quizModules,
  quizSubthemes,
  quizThemes,
  userAchievements,
  userModuleProgress,
} from "@/lib/schema";

export type CheckAchievementsContext = {
  moduleId: number;
  score: number;
};

/**
 * Évalue et enregistre les badges après une soumission de quiz (progression déjà mise à jour).
 * Retourne la liste des `achievementType` nouvellement attribués (ordre d’attribution).
 */
export async function checkAndAwardAchievements(
  userId: number,
  context: CheckAchievementsContext
): Promise<string[]> {
  const { moduleId, score } = context;
  const awarded: string[] = [];

  const alreadyEarned = await db
    .select({ achievementType: userAchievements.achievementType })
    .from(userAchievements)
    .where(eq(userAchievements.userId, userId));

  const earnedTypes = new Set(alreadyEarned.map((a) => a.achievementType));

  const grantIfNew = async (
    type: string,
    metadata?: Record<string, unknown>
  ) => {
    if (!earnedTypes.has(type)) {
      await db.insert(userAchievements).values({
        userId,
        achievementType: type,
        metadata: metadata ?? null,
      });
      earnedTypes.add(type);
      awarded.push(type);
    }
  };

  const completedCount = await db
    .select({ id: userModuleProgress.id })
    .from(userModuleProgress)
    .where(
      and(
        eq(userModuleProgress.userId, userId),
        eq(userModuleProgress.status, "completed")
      )
    );
  if (completedCount.length >= 1) {
    await grantIfNew("first_quiz");
  }

  if (completedCount.length >= 5) {
    await grantIfNew("assidu");
  }

  if (score === 100) {
    await grantIfNew("perfect_score", { moduleId });
  }

  const moduleRow = await db
    .select({ subthemeId: quizModules.subthemeId })
    .from(quizModules)
    .where(eq(quizModules.id, moduleId));

  if (moduleRow.length > 0) {
    const subtheme = await db
      .select({ themeId: quizSubthemes.themeId })
      .from(quizSubthemes)
      .where(eq(quizSubthemes.id, moduleRow[0].subthemeId));

    if (subtheme.length > 0) {
      const themeId = subtheme[0].themeId;

      const themeRow = await db
        .select({ slug: quizThemes.slug })
        .from(quizThemes)
        .where(eq(quizThemes.id, themeId));

      const themeSlug = themeRow[0]?.slug;

      const allThemeModules = await db
        .select({ id: quizModules.id })
        .from(quizModules)
        .innerJoin(
          quizSubthemes,
          and(
            eq(quizModules.subthemeId, quizSubthemes.id),
            eq(quizSubthemes.themeId, themeId),
            eq(quizSubthemes.isActive, true)
          )
        )
        .where(eq(quizModules.isActive, true));

      const allThemeModuleIds = allThemeModules.map((m) => m.id);

      const completedWithModuleId = await db
        .select({ moduleId: userModuleProgress.moduleId })
        .from(userModuleProgress)
        .where(
          and(
            eq(userModuleProgress.userId, userId),
            eq(userModuleProgress.status, "completed")
          )
        );

      const completedModuleIds = new Set(
        completedWithModuleId.map((p) => p.moduleId)
      );
      const themeComplete = allThemeModuleIds.every((id) =>
        completedModuleIds.has(id)
      );

      if (themeComplete && themeSlug) {
        const achievementType = `theme_${themeSlug}_complete`;
        await grantIfNew(achievementType, { themeSlug });

        const allThemes = await db
          .select({ id: quizThemes.id, slug: quizThemes.slug })
          .from(quizThemes)
          .where(eq(quizThemes.isActive, true));

        const allComplete = await Promise.all(
          allThemes.map(async (t) => {
            const mods = await db
              .select({ id: quizModules.id })
              .from(quizModules)
              .innerJoin(
                quizSubthemes,
                and(
                  eq(quizModules.subthemeId, quizSubthemes.id),
                  eq(quizSubthemes.themeId, t.id),
                  eq(quizSubthemes.isActive, true)
                )
              )
              .where(eq(quizModules.isActive, true));
            return mods.every((m) => completedModuleIds.has(m.id));
          })
        );

        if (allComplete.every(Boolean)) {
          await grantIfNew("platform_complete");
        }
      }

      if (themeSlug === "zei-rse" && themeComplete) {
        await grantIfNew("zei_ambassador");
      }
    }
  }

  return awarded;
}
