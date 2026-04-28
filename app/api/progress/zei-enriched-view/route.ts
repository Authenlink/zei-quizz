import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isPostgresUndefinedTableError } from "@/lib/db-errors";
import { isZeiEnrichedModuleLessons } from "@/lib/quiz-zei-enriched";
import { quizLessons, userZeiEnrichedModuleViews } from "@/lib/schema";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const userId = Number(session.user.id);
  if (!Number.isFinite(userId)) {
    return NextResponse.json({ error: "Session invalide" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  const moduleId =
    typeof body === "object" &&
    body !== null &&
    "moduleId" in body &&
    typeof (body as { moduleId: unknown }).moduleId === "number"
      ? (body as { moduleId: number }).moduleId
      : typeof body === "object" &&
          body !== null &&
          "moduleId" in body &&
          typeof (body as { moduleId: unknown }).moduleId === "string"
        ? Number((body as { moduleId: string }).moduleId)
        : NaN;

  if (!Number.isFinite(moduleId)) {
    return NextResponse.json({ error: "moduleId requis" }, { status: 400 });
  }

  const lessons = await db
    .select({
      type: quizLessons.type,
      content: quizLessons.content,
    })
    .from(quizLessons)
    .where(eq(quizLessons.moduleId, moduleId));

  if (!isZeiEnrichedModuleLessons(lessons)) {
    return NextResponse.json({ recorded: false });
  }

  try {
    await db
      .insert(userZeiEnrichedModuleViews)
      .values({ userId, moduleId })
      .onConflictDoNothing({
        target: [
          userZeiEnrichedModuleViews.userId,
          userZeiEnrichedModuleViews.moduleId,
        ],
      });
  } catch (e) {
    if (isPostgresUndefinedTableError(e)) {
      return NextResponse.json({ recorded: false });
    }
    throw e;
  }

  return NextResponse.json({ recorded: true });
}
