/** Payload GET /api/progress — dashboard & portail */

export type ProgressThemeRow = {
  themeId: number;
  slug: string;
  title: string;
  icon: string;
  color: string;
  totalModules: number;
  completedModules: number;
  progressPercent: number;
};

export type RecentQuizAttempt = {
  id: number;
  moduleId: number;
  moduleTitle: string;
  themeSlug: string;
  subthemeSlug: string;
  moduleSlug: string;
  href: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  timeTakenSeconds: number | null;
  completedAt: string;
};

export type RecommendedModule = {
  moduleId: number;
  title: string;
  themeSlug: string;
  subthemeSlug: string;
  moduleSlug: string;
  href: string;
  reason: "incomplete" | "low_score";
  bestScore?: number;
};

export type ProgressDashboardPayload = {
  globalProgressPercent: number;
  totalModules: number;
  completedModules: number;
  totalAttempts: number;
  averageScore: number;
  themes: ProgressThemeRow[];
  recentAttempts: RecentQuizAttempt[];
  recommendedModule: RecommendedModule | null;
};
