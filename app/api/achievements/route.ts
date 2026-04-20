import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ACHIEVEMENT_CATALOG } from "@/lib/achievements";
import { userAchievements } from "@/lib/schema";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const userId = Number(session.user.id);
  if (!Number.isFinite(userId)) {
    return NextResponse.json({ error: "Session invalide" }, { status: 400 });
  }

  const earned = await db
    .select()
    .from(userAchievements)
    .where(eq(userAchievements.userId, userId))
    .orderBy(desc(userAchievements.earnedAt));

  const earnedTypes = new Set(earned.map((a) => a.achievementType));

  const achievements = earned.map((a) => ({
    id: a.id,
    achievementType: a.achievementType,
    label: ACHIEVEMENT_CATALOG[a.achievementType]?.label ?? a.achievementType,
    description: ACHIEVEMENT_CATALOG[a.achievementType]?.description ?? "",
    icon: ACHIEVEMENT_CATALOG[a.achievementType]?.icon ?? "AwardIcon",
    earnedAt: a.earnedAt.toISOString(),
    metadata: a.metadata,
  }));

  const locked = Object.entries(ACHIEVEMENT_CATALOG)
    .filter(([type]) => !earnedTypes.has(type))
    .map(([type, info]) => ({
      achievementType: type,
      label: info.label,
      description: info.description,
      icon: info.icon,
    }));

  return NextResponse.json({ achievements, locked });
}
