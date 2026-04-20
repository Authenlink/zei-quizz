import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { quizModules, quizSubthemes, quizThemes } from "@/lib/schema";

const MAX_DESCRIPTION_LENGTH = 160;

function truncateDescription(text: string): string {
  const t = text.trim();
  if (t.length <= MAX_DESCRIPTION_LENGTH) return t;
  return `${t.slice(0, MAX_DESCRIPTION_LENGTH - 1).trimEnd()}…`;
}

export type ThemeSeo = { title: string; description: string };

export async function getThemeSeoBySlug(
  slug: string,
): Promise<ThemeSeo | null> {
  const [theme] = await db
    .select({
      title: quizThemes.title,
      description: quizThemes.description,
    })
    .from(quizThemes)
    .where(and(eq(quizThemes.slug, slug), eq(quizThemes.isActive, true)));

  if (!theme) return null;
  return {
    title: theme.title,
    description: truncateDescription(theme.description),
  };
}

export type ModuleSeo = {
  moduleTitle: string;
  themeTitle: string;
  description: string;
};

export async function getModuleSeoBySlugs(
  themeSlug: string,
  subthemeSlug: string,
  moduleSlug: string,
): Promise<ModuleSeo | null> {
  const [row] = await db
    .select({
      moduleTitle: quizModules.title,
      moduleDescription: quizModules.description,
      themeTitle: quizThemes.title,
    })
    .from(quizModules)
    .innerJoin(quizSubthemes, eq(quizModules.subthemeId, quizSubthemes.id))
    .innerJoin(quizThemes, eq(quizSubthemes.themeId, quizThemes.id))
    .where(
      and(
        eq(quizThemes.slug, themeSlug),
        eq(quizThemes.isActive, true),
        eq(quizSubthemes.slug, subthemeSlug),
        eq(quizSubthemes.isActive, true),
        eq(quizModules.slug, moduleSlug),
        eq(quizModules.isActive, true),
      ),
    )
    .limit(1);

  if (!row) return null;
  return {
    moduleTitle: row.moduleTitle,
    themeTitle: row.themeTitle,
    description: truncateDescription(row.moduleDescription),
  };
}
