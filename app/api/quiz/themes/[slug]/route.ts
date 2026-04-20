import { NextResponse } from "next/server";
import { and, asc, eq, inArray } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  quizThemes,
  quizSubthemes,
  quizModules,
  userModuleProgress,
} from "@/lib/schema";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const userId = Number(session.user.id);
  if (!Number.isFinite(userId)) {
    return NextResponse.json({ error: "Session invalide" }, { status: 400 });
  }

  const { slug } = await context.params;

  const [theme] = await db
    .select()
    .from(quizThemes)
    .where(and(eq(quizThemes.slug, slug), eq(quizThemes.isActive, true)));

  if (!theme) {
    return NextResponse.json({ error: "Thème introuvable" }, { status: 404 });
  }

  const subthemes = await db
    .select()
    .from(quizSubthemes)
    .where(
      and(eq(quizSubthemes.themeId, theme.id), eq(quizSubthemes.isActive, true))
    )
    .orderBy(asc(quizSubthemes.order));

  const subthemesWithModules = await Promise.all(
    subthemes.map(async (subtheme) => {
      const modules = await db
        .select()
        .from(quizModules)
        .where(
          and(
            eq(quizModules.subthemeId, subtheme.id),
            eq(quizModules.isActive, true)
          )
        )
        .orderBy(asc(quizModules.order));

      const moduleIds = modules.map((m) => m.id);

      const progressRows =
        moduleIds.length > 0
          ? await db
              .select()
              .from(userModuleProgress)
              .where(
                and(
                  eq(userModuleProgress.userId, userId),
                  inArray(userModuleProgress.moduleId, moduleIds)
                )
              )
          : [];

      const modulesWithProgress = modules.map((mod) => {
        const progress = progressRows.find((p) => p.moduleId === mod.id);
        const status = progress?.status ?? "not_started";
        const attempts = progress?.attempts ?? 0;
        const bestScore = progress?.bestScore ?? 0;
        const progressPercent =
          status === "completed"
            ? 100
            : attempts > 0
              ? Math.min(99, bestScore)
              : 0;
        return {
          id: mod.id,
          slug: mod.slug,
          title: mod.title,
          description: mod.description,
          order: mod.order,
          estimatedMinutes: mod.estimatedMinutes,
          difficulty: mod.difficulty,
          status,
          bestScore,
          attempts,
          progressPercent,
        };
      });

      const completed = modulesWithProgress.filter(
        (m) => m.status === "completed"
      ).length;

      return {
        id: subtheme.id,
        slug: subtheme.slug,
        title: subtheme.title,
        description: subtheme.description,
        order: subtheme.order,
        totalModules: modules.length,
        completedModules: completed,
        progressPercent:
          modules.length > 0
            ? Math.round((completed / modules.length) * 100)
            : 0,
        modules: modulesWithProgress,
      };
    })
  );

  return NextResponse.json({
    theme: {
      id: theme.id,
      slug: theme.slug,
      title: theme.title,
      description: theme.description,
      icon: theme.icon,
      color: theme.color,
    },
    subthemes: subthemesWithModules,
  });
}
