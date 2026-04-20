import type { Metadata } from "next";

import { getModuleSeoBySlugs } from "@/lib/quiz-metadata";

const SITE = "ZEI Quizz";

type ModuleParams = Promise<{
  themeSlug: string;
  subthemeSlug: string;
  moduleSlug: string;
}>;

export async function generateMetadata({
  params,
}: {
  params: ModuleParams;
}): Promise<Metadata> {
  const { themeSlug, subthemeSlug, moduleSlug } = await params;
  const mod = await getModuleSeoBySlugs(themeSlug, subthemeSlug, moduleSlug);

  if (!mod) {
    return {
      title: `Module | ${SITE}`,
      description:
        "Module de formation — quiz et contenu pédagogique sur ZEI Quizz.",
    };
  }

  const title = `${mod.moduleTitle} — ${mod.themeTitle} | ${SITE}`;

  return {
    title,
    description: mod.description,
    openGraph: {
      title,
      description: mod.description,
    },
  };
}

export default function LearnModuleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
