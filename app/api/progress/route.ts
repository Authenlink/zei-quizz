import { NextResponse } from "next/server";
import { and, asc, desc, eq, inArray } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { RecommendedModule } from "@/lib/types/progress-dashboard";
import {
  quizThemes,
  quizSubthemes,
  quizModules,
  userModuleProgress,
  userQuizAttempts,
} from "@/lib/schema";

function learnModuleHref(
  themeSlug: string,
  subthemeSlug: string,
  moduleSlug: string
) {
  return `/learn/${themeSlug}/${subthemeSlug}/${moduleSlug}`;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const userId = Number(session.user.id);
  if (!Number.isFinite(userId)) {
    return NextResponse.json({ error: "Session invalide" }, { status: 400 });
  }

  // Récupérer tous les thèmes actifs
  const themes = await db
    .select()
    .from(quizThemes)
    .where(eq(quizThemes.isActive, true))
    .orderBy(asc(quizThemes.order));

  // Progression utilisateur sur tous les modules
  const allProgress = await db
    .select()
    .from(userModuleProgress)
    .where(eq(userModuleProgress.userId, userId));

  const progressByModule = new Map(
    allProgress.map((p) => [p.moduleId, p])
  );

  // Activité récente (5 dernières tentatives — les plus récentes d'abord)
  const recentAttempts = await db
    .select({
      id: userQuizAttempts.id,
      moduleId: userQuizAttempts.moduleId,
      score: userQuizAttempts.score,
      totalQuestions: userQuizAttempts.totalQuestions,
      correctAnswers: userQuizAttempts.correctAnswers,
      timeTakenSeconds: userQuizAttempts.timeTakenSeconds,
      completedAt: userQuizAttempts.completedAt,
    })
    .from(userQuizAttempts)
    .where(eq(userQuizAttempts.userId, userId))
    .orderBy(desc(userQuizAttempts.completedAt))
    .limit(5);

  const recentModuleIds = [...new Set(recentAttempts.map((a) => a.moduleId))];
  const moduleMetaById = new Map<
    number,
    {
      moduleTitle: string;
      themeSlug: string;
      subthemeSlug: string;
      moduleSlug: string;
    }
  >();

  if (recentModuleIds.length > 0) {
    const rows = await db
      .select({
        moduleId: quizModules.id,
        moduleTitle: quizModules.title,
        moduleSlug: quizModules.slug,
        subthemeSlug: quizSubthemes.slug,
        themeSlug: quizThemes.slug,
      })
      .from(quizModules)
      .innerJoin(quizSubthemes, eq(quizModules.subthemeId, quizSubthemes.id))
      .innerJoin(quizThemes, eq(quizSubthemes.themeId, quizThemes.id))
      .where(inArray(quizModules.id, recentModuleIds));

    for (const r of rows) {
      moduleMetaById.set(r.moduleId, {
        moduleTitle: r.moduleTitle,
        themeSlug: r.themeSlug,
        subthemeSlug: r.subthemeSlug,
        moduleSlug: r.moduleSlug,
      });
    }
  }

  // Tous les modules actifs ordonnés (parcours catalogue) — module recommandé + métadonnées
  const modulesRanked = await db
    .select({
      moduleId: quizModules.id,
      moduleTitle: quizModules.title,
      moduleSlug: quizModules.slug,
      subthemeSlug: quizSubthemes.slug,
      themeSlug: quizThemes.slug,
    })
    .from(quizModules)
    .innerJoin(
      quizSubthemes,
      and(
        eq(quizModules.subthemeId, quizSubthemes.id),
        eq(quizSubthemes.isActive, true)
      )
    )
    .innerJoin(
      quizThemes,
      and(eq(quizSubthemes.themeId, quizThemes.id), eq(quizThemes.isActive, true))
    )
    .where(eq(quizModules.isActive, true))
    .orderBy(
      asc(quizThemes.order),
      asc(quizSubthemes.order),
      asc(quizModules.order)
    );

  /**
   * Module recommandé :
   * 1) Premier module du catalogue non « completed » (pas de ligne ou status ≠ completed).
   * 2) Sinon premier module completed avec bestScore < 80 (tri par bestScore croissant).
   * 3) Sinon null (tout complété avec bestScore ≥ 80).
   */
  let recommendedModule: RecommendedModule | null = null;
  const firstIncomplete = modulesRanked.find((m) => {
    const p = progressByModule.get(m.moduleId);
    return !p || p.status !== "completed";
  });
  if (firstIncomplete) {
    recommendedModule = {
      moduleId: firstIncomplete.moduleId,
      title: firstIncomplete.moduleTitle,
      themeSlug: firstIncomplete.themeSlug,
      subthemeSlug: firstIncomplete.subthemeSlug,
      moduleSlug: firstIncomplete.moduleSlug,
      href: learnModuleHref(
        firstIncomplete.themeSlug,
        firstIncomplete.subthemeSlug,
        firstIncomplete.moduleSlug
      ),
      reason: "incomplete",
      bestScore: progressByModule.get(firstIncomplete.moduleId)?.bestScore,
    };
  } else {
    const lowScoreCandidates = modulesRanked
      .map((m) => {
        const p = progressByModule.get(m.moduleId);
        return p && p.status === "completed" && p.bestScore < 80
          ? { m, bestScore: p.bestScore }
          : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => a.bestScore - b.bestScore);

    if (lowScoreCandidates.length > 0) {
      const { m } = lowScoreCandidates[0];
      recommendedModule = {
        moduleId: m.moduleId,
        title: m.moduleTitle,
        themeSlug: m.themeSlug,
        subthemeSlug: m.subthemeSlug,
        moduleSlug: m.moduleSlug,
        href: learnModuleHref(m.themeSlug, m.subthemeSlug, m.moduleSlug),
        reason: "low_score",
        bestScore: lowScoreCandidates[0].bestScore,
      };
    }
  }

  // Construire la progression par thème
  const themesProgress = await Promise.all(
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

      if (subthemes.length === 0) {
        return {
          themeId: theme.id,
          slug: theme.slug,
          title: theme.title,
          icon: theme.icon,
          color: theme.color,
          totalModules: 0,
          completedModules: 0,
          progressPercent: 0,
        };
      }

      const modules = await db
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

      const totalModules = modules.length;
      const completedModules = modules.filter(
        (m) => progressByModule.get(m.id)?.status === "completed"
      ).length;

      return {
        themeId: theme.id,
        slug: theme.slug,
        title: theme.title,
        icon: theme.icon,
        color: theme.color,
        totalModules,
        completedModules,
        progressPercent:
          totalModules > 0
            ? Math.round((completedModules / totalModules) * 100)
            : 0,
      };
    })
  );

  // Progression globale
  const totalModulesAll = themesProgress.reduce(
    (acc, t) => acc + t.totalModules,
    0
  );
  const completedModulesAll = themesProgress.reduce(
    (acc, t) => acc + t.completedModules,
    0
  );
  const globalProgressPercent =
    totalModulesAll > 0
      ? Math.round((completedModulesAll / totalModulesAll) * 100)
      : 0;

  // Statistiques globales
  const totalAttempts = allProgress.reduce((acc, p) => acc + p.attempts, 0);
  const averageScore =
    allProgress.length > 0
      ? Math.round(
          allProgress.reduce((acc, p) => acc + p.bestScore, 0) /
            allProgress.length
        )
      : 0;

  return NextResponse.json({
    globalProgressPercent,
    totalModules: totalModulesAll,
    completedModules: completedModulesAll,
    totalAttempts,
    averageScore,
    themes: themesProgress,
    recentAttempts: recentAttempts.map((a) => {
      const meta = moduleMetaById.get(a.moduleId);
      const themeSlug = meta?.themeSlug ?? "";
      const subthemeSlug = meta?.subthemeSlug ?? "";
      const moduleSlug = meta?.moduleSlug ?? "";
      const href =
        meta !== undefined
          ? learnModuleHref(themeSlug, subthemeSlug, moduleSlug)
          : "";
      return {
        id: a.id,
        moduleId: a.moduleId,
        moduleTitle: meta?.moduleTitle ?? "Module",
        themeSlug,
        subthemeSlug,
        moduleSlug,
        href,
        score: a.score,
        totalQuestions: a.totalQuestions,
        correctAnswers: a.correctAnswers,
        timeTakenSeconds: a.timeTakenSeconds,
        completedAt: a.completedAt.toISOString(),
      };
    }),
    recommendedModule,
  });
}
