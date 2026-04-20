import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  quizThemes,
  quizSubthemes,
  quizModules,
  userModuleProgress,
} from "@/lib/schema";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const userId = Number(session.user.id);
  if (!Number.isFinite(userId)) {
    return NextResponse.json({ error: "Session invalide" }, { status: 400 });
  }

  const themes = await db
    .select()
    .from(quizThemes)
    .where(eq(quizThemes.isActive, true))
    .orderBy(quizThemes.order);

  const themesWithProgress = await Promise.all(
    themes.map(async (theme) => {
      const subthemes = await db
        .select({ id: quizSubthemes.id })
        .from(quizSubthemes)
        .where(
          and(
            eq(quizSubthemes.themeId, theme.id),
            eq(quizSubthemes.isActive, true)
          )
        );

      let totalModules = 0;
      let completedModules = 0;

      if (subthemes.length > 0) {
        // Fetch modules for this theme via subthemes
        const moduleRows = await db
          .select({ id: quizModules.id })
          .from(quizModules)
          .innerJoin(
            quizSubthemes,
            and(
              eq(quizModules.subthemeId, quizSubthemes.id),
              eq(quizSubthemes.themeId, theme.id),
              eq(quizSubthemes.isActive, true)
            )
          )
          .where(eq(quizModules.isActive, true));

        totalModules = moduleRows.length;

        if (totalModules > 0) {
          const moduleIds = moduleRows.map((m) => m.id);
          const progressRows = await db
            .select({
              moduleId: userModuleProgress.moduleId,
              status: userModuleProgress.status,
            })
            .from(userModuleProgress)
            .where(eq(userModuleProgress.userId, userId));

          completedModules = progressRows.filter(
            (p) =>
              p.status === "completed" && moduleIds.includes(p.moduleId)
          ).length;
        }
      }

      return {
        id: theme.id,
        slug: theme.slug,
        title: theme.title,
        description: theme.description,
        icon: theme.icon,
        color: theme.color,
        order: theme.order,
        totalModules,
        completedModules,
        progressPercent:
          totalModules > 0
            ? Math.round((completedModules / totalModules) * 100)
            : 0,
      };
    })
  );

  return NextResponse.json({ themes: themesWithProgress });
}
