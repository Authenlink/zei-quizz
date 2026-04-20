import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  quizModules,
  quizQuestions,
  quizQuestionOptions,
  userModuleProgress,
  userQuizAttempts,
  userQuestionAnswers,
} from "@/lib/schema";
import { checkAndAwardAchievements } from "@/lib/achievements/award";

type SubmitAnswer = {
  questionId: number;
  selectedOptionId: number | null;
};

type SubmitBody = {
  moduleId: number;
  answers: SubmitAnswer[];
  timeTakenSeconds?: number;
};

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const userId = Number(session.user.id);
  if (!Number.isFinite(userId)) {
    return NextResponse.json({ error: "Session invalide" }, { status: 400 });
  }

  let body: SubmitBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  const { moduleId, answers, timeTakenSeconds } = body;

  if (!moduleId || !Array.isArray(answers) || answers.length === 0) {
    return NextResponse.json(
      { error: "moduleId et answers sont requis" },
      { status: 400 }
    );
  }

  // Vérifier que le module existe
  const [mod] = await db
    .select({ id: quizModules.id })
    .from(quizModules)
    .where(eq(quizModules.id, moduleId));

  if (!mod) {
    return NextResponse.json({ error: "Module introuvable" }, { status: 404 });
  }

  // Charger les questions et leurs bonnes réponses
  const questions = await db
    .select({
      id: quizQuestions.id,
      points: quizQuestions.points,
    })
    .from(quizQuestions)
    .where(eq(quizQuestions.moduleId, moduleId));

  const correctOptions = await db
    .select({
      id: quizQuestionOptions.id,
      questionId: quizQuestionOptions.questionId,
    })
    .from(quizQuestionOptions)
    .where(eq(quizQuestionOptions.isCorrect, true));

  const correctMap = new Map(
    correctOptions.map((o) => [o.questionId, o.id])
  );

  // Évaluer chaque réponse
  let totalPoints = 0;
  let earnedPoints = 0;
  let correctAnswers = 0;

  const evaluatedAnswers = answers.map((a) => {
    const question = questions.find((q) => q.id === a.questionId);
    if (!question) return null;

    const expectedOptionId = correctMap.get(a.questionId);
    const isCorrect =
      a.selectedOptionId !== null &&
      a.selectedOptionId === expectedOptionId;

    totalPoints += question.points;
    if (isCorrect) {
      earnedPoints += question.points;
      correctAnswers++;
    }

    return { questionId: a.questionId, selectedOptionId: a.selectedOptionId, isCorrect };
  }).filter(Boolean) as {
    questionId: number;
    selectedOptionId: number | null;
    isCorrect: boolean;
  }[];

  const score =
    totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

  // Enregistrer la tentative
  const [attempt] = await db
    .insert(userQuizAttempts)
    .values({
      userId,
      moduleId,
      score,
      totalQuestions: questions.length,
      correctAnswers,
      timeTakenSeconds: timeTakenSeconds ?? null,
    })
    .returning({ id: userQuizAttempts.id });

  // Enregistrer les réponses individuelles
  if (evaluatedAnswers.length > 0) {
    await db.insert(userQuestionAnswers).values(
      evaluatedAnswers.map((a) => ({
        attemptId: attempt.id,
        questionId: a.questionId,
        selectedOptionId: a.selectedOptionId,
        isCorrect: a.isCorrect,
      }))
    );
  }

  // Mettre à jour la progression du module (upsert)
  const [existing] = await db
    .select()
    .from(userModuleProgress)
    .where(
      and(
        eq(userModuleProgress.userId, userId),
        eq(userModuleProgress.moduleId, moduleId)
      )
    );

  const newBestScore = Math.max(existing?.bestScore ?? 0, score);
  const newAttempts = (existing?.attempts ?? 0) + 1;
  const isCompleted = score >= 60; // seuil de réussite

  if (existing) {
    await db
      .update(userModuleProgress)
      .set({
        status: isCompleted ? "completed" : "in_progress",
        bestScore: newBestScore,
        attempts: newAttempts,
        completedAt: isCompleted ? new Date() : existing.completedAt,
      })
      .where(
        and(
          eq(userModuleProgress.userId, userId),
          eq(userModuleProgress.moduleId, moduleId)
        )
      );
  } else {
    await db.insert(userModuleProgress).values({
      userId,
      moduleId,
      status: isCompleted ? "completed" : "in_progress",
      bestScore: newBestScore,
      attempts: 1,
      completedAt: isCompleted ? new Date() : null,
    });
  }

  // Déclencher les achievements
  const newAchievements = await checkAndAwardAchievements(userId, {
    moduleId,
    score,
  });

  // Renvoyer les bonnes réponses avec explications
  const questionsWithCorrect = await db
    .select({
      id: quizQuestions.id,
      question: quizQuestions.question,
      explanation: quizQuestions.explanation,
    })
    .from(quizQuestions)
    .where(eq(quizQuestions.moduleId, moduleId));

  const correctAnswerMap = new Map(
    correctOptions.map((o) => [o.questionId, o.id])
  );

  const results = questionsWithCorrect.map((q) => {
    const answer = evaluatedAnswers.find((a) => a.questionId === q.id);
    return {
      questionId: q.id,
      question: q.question,
      explanation: q.explanation,
      correctOptionId: correctAnswerMap.get(q.id) ?? null,
      selectedOptionId: answer?.selectedOptionId ?? null,
      isCorrect: answer?.isCorrect ?? false,
    };
  });

  return NextResponse.json(
    {
      score,
      totalQuestions: questions.length,
      correctAnswers,
      attemptId: attempt.id,
      newAchievements,
      results,
    },
    { status: 201 }
  );
}
