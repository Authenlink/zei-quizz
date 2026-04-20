import type { Metadata } from "next";

import { getThemeSeoBySlug } from "@/lib/quiz-metadata";

const SITE = "ZEI Quizz";

type ThemeParams = Promise<{ themeSlug: string }>;

export async function generateMetadata({
  params,
}: {
  params: ThemeParams;
}): Promise<Metadata> {
  const { themeSlug } = await params;
  const theme = await getThemeSeoBySlug(themeSlug);

  if (!theme) {
    return {
      title: `Formation | ${SITE}`,
      description:
        "Parcours e-learning RSE, CSRD, ESG et conformité — suivez vos formations sur ZEI Quizz.",
    };
  }

  return {
    title: `${theme.title} — Formation | ${SITE}`,
    description: theme.description,
    openGraph: {
      title: `${theme.title} — Formation | ${SITE}`,
      description: theme.description,
    },
  };
}

export default function LearnThemeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
