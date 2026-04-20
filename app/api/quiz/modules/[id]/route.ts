import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  quizModules,
  quizLessons,
  quizQuestions,
  quizQuestionOptions,
} from "@/lib/schema";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await context.params;
  const moduleId = Number(id);
  if (!Number.isFinite(moduleId)) {
    return NextResponse.json({ error: "ID invalide" }, { status: 400 });
  }

  const [mod] = await db
    .select()
    .from(quizModules)
    .where(eq(quizModules.id, moduleId));

  if (!mod) {
    return NextResponse.json({ error: "Module introuvable" }, { status: 404 });
  }

  const lessons = await db
    .select()
    .from(quizLessons)
    .where(eq(quizLessons.moduleId, moduleId))
    .orderBy(asc(quizLessons.order));

  const questions = await db
    .select()
    .from(quizQuestions)
    .where(eq(quizQuestions.moduleId, moduleId))
    .orderBy(asc(quizQuestions.order));

  const questionsWithOptions = await Promise.all(
    questions.map(async (q) => {
      const options = await db
        .select({
          id: quizQuestionOptions.id,
          text: quizQuestionOptions.text,
          order: quizQuestionOptions.order,
          // isCorrect intentionally omitted — revealed only after submission
        })
        .from(quizQuestionOptions)
        .where(eq(quizQuestionOptions.questionId, q.id))
        .orderBy(asc(quizQuestionOptions.order));

      return {
        id: q.id,
        question: q.question,
        type: q.type,
        difficulty: q.difficulty,
        points: q.points,
        order: q.order,
        lessonId: q.lessonId,
        options,
      };
    })
  );

  return NextResponse.json({
    module: {
      id: mod.id,
      slug: mod.slug,
      title: mod.title,
      description: mod.description,
      estimatedMinutes: mod.estimatedMinutes,
      difficulty: mod.difficulty,
    },
    lessons,
    questions: questionsWithOptions,
  });
}
