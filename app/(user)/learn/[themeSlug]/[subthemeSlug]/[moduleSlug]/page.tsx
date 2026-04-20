"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useState,
} from "react";
import { useSession } from "next-auth/react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  BookOpen,
  ChevronRight,
  Play,
  Zap,
  ChevronDown,
} from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useScrollContainer } from "@/hooks/use-scroll";
import { useDashboardScrollRef } from "@/components/dashboard-scroll-area";
import { useSetToc } from "@/hooks/use-toc";
import { LessonContent } from "@/components/learn/LessonContent";
import { DifficultyBadge } from "@/components/learn/DifficultyBadge";
import {
  QuizQuestion,
  type QuizQuestionData,
} from "@/components/quiz/QuizQuestion";
import { QuizProgress } from "@/components/quiz/QuizProgress";
import {
  QuizResults,
  type QuizResultsData,
} from "@/components/quiz/QuizResults";
import { getAchievementMeta } from "@/lib/achievements";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Lesson {
  id: number;
  title: string;
  content: unknown;
  type: "lesson" | "regulatory_update" | "case_study" | "zei_spotlight";
  applicableYear: number | null;
  companySize: "all" | "large" | "sme";
  order: number;
}

interface ModuleData {
  id: number;
  slug: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  difficulty: "debutant" | "intermediaire" | "avance";
}

interface ThemeInfo {
  slug: string;
  title: string;
}

interface SubthemeInfo {
  slug: string;
  title: string;
}

type QuizPhase = "lessons" | "quiz" | "results";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function lessonTypeLabel(type: Lesson["type"]): string {
  switch (type) {
    case "regulatory_update":
      return "Mise à jour réglementaire";
    case "case_study":
      return "Étude de cas";
    case "zei_spotlight":
      return "ZEI en pratique";
    default:
      return "Leçon";
  }
}

function lessonTypeBadgeVariant(type: Lesson["type"]) {
  switch (type) {
    case "regulatory_update":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200";
    case "case_study":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200";
    case "zei_spotlight":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function ModulePageSkeleton() {
  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2">
        <div className="flex items-center gap-2 px-4">
          <Skeleton className="h-6 w-6" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <Skeleton className="h-4 w-80" />
        </div>
      </header>
      <div className="w-full px-6 sm:px-8 py-8 flex flex-col gap-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-96" />
        <div className="space-y-8">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Inner page (useSearchParams)
// ---------------------------------------------------------------------------

function ModulePageInner() {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = useParams();
  const themeSlug = params.themeSlug as string;
  const subthemeSlug = params.subthemeSlug as string;
  const moduleSlug = params.moduleSlug as string;
  const scrollRef = useDashboardScrollRef();
  const hasScrolled = useScrollContainer(scrollRef);

  const [themeInfo, setThemeInfo] = useState<ThemeInfo | null>(null);
  const [subthemeInfo, setSubthemeInfo] = useState<SubthemeInfo | null>(null);
  const [module, setModule] = useState<ModuleData | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [questions, setQuestions] = useState<QuizQuestionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [quizPhase, setQuizPhase] = useState<QuizPhase>("lessons");
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Map<number, number | null>>(new Map());
  const [quizResults, setQuizResults] = useState<QuizResultsData | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useSetToc([
    ...lessons.map((l) => ({
      id: `lesson-${l.id}`,
      title: l.title,
      level: 1 as const,
    })),
    ...(questions.length > 0
      ? [{ id: "quiz", title: "Quiz", level: 1 as const }]
      : []),
  ]);

  const startQuiz = useCallback(() => {
    setQuizPhase("quiz");
    setCurrentQuestionIdx(0);
    setAnswers(new Map());
    setQuizResults(null);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated" || !themeSlug) return;
    fetch(`/api/quiz/themes/${themeSlug}`)
      .then((r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((d) => {
        if (!d) return;
        setThemeInfo({ slug: d.theme.slug, title: d.theme.title });
        const st = d.subthemes?.find(
          (s: { slug: string; title: string }) => s.slug === subthemeSlug,
        );
        if (st) setSubthemeInfo({ slug: st.slug, title: st.title });
      })
      .catch(() => {});
  }, [status, themeSlug, subthemeSlug]);

  useEffect(() => {
    if (status !== "authenticated" || !themeSlug || !subthemeSlug || !moduleSlug)
      return;

    fetch(`/api/quiz/themes/${themeSlug}`)
      .then((r) => {
        if (!r.ok) throw new Error("Thème introuvable");
        return r.json();
      })
      .then(async (d) => {
        const st = d.subthemes?.find((s: { slug: string }) => s.slug === subthemeSlug);
        if (!st) throw new Error("Sous-thème introuvable");
        const mod = st.modules?.find((m: { slug: string }) => m.slug === moduleSlug);
        if (!mod) throw new Error("Module introuvable");

        const res = await fetch(`/api/quiz/modules/${mod.id}`);
        if (!res.ok) throw new Error("Impossible de charger le module");
        return res.json();
      })
      .then((d) => {
        setModule(d.module);
        setLessons(d.lessons ?? []);
        setQuestions(d.questions ?? []);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [status, themeSlug, subthemeSlug, moduleSlug]);

  useEffect(() => {
    if (loading || !module || questions.length === 0) return;
    if (searchParams.get("review") !== "1") return;
    startQuiz();
    router.replace(pathname, { scroll: false });
  }, [loading, module, questions.length, pathname, router, searchParams, startQuiz]);

  const handleSelect = useCallback((questionId: number, optionId: number) => {
    setAnswers((prev) => new Map(prev).set(questionId, optionId));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!module) return;
    setSubmitting(true);
    try {
      const payload = {
        moduleId: module.id,
        answers: questions.map((q) => ({
          questionId: q.id,
          selectedOptionId: answers.get(q.id) ?? null,
        })),
      };
      const res = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Erreur lors de la soumission");
      const data: QuizResultsData = await res.json();
      const unlocked = data.newAchievements ?? [];
      if (unlocked.length > 0) {
        if (unlocked.length <= 2) {
          for (const type of unlocked) {
            const { label } = getAchievementMeta(type);
            toast.success("Badge débloqué", { description: label });
          }
        } else {
          const names = unlocked.map((t) => getAchievementMeta(t).label);
          toast.success(`${unlocked.length} nouveaux badges`, {
            description: names.join(" · "),
          });
        }
      }
      setQuizResults(data);
      setQuizPhase("results");
    } catch {
      // keep quiz state
    } finally {
      setSubmitting(false);
    }
  }, [module, questions, answers]);

  const handleRetry = useCallback(() => {
    setAnswers(new Map());
    setCurrentQuestionIdx(0);
    setQuizResults(null);
    setQuizPhase("quiz");
  }, []);

  if (status === "loading" || (status === "authenticated" && loading)) {
    return <ModulePageSkeleton />;
  }

  if (error || !module) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
        <p className="text-sm text-destructive">{error ?? "Module introuvable."}</p>
        <Link
          href={`/learn/${themeSlug}/${subthemeSlug}`}
          className="text-sm text-primary underline"
        >
          ← Retour au sous-thème
        </Link>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIdx];
  const isLastQuestion = currentQuestionIdx === questions.length - 1;
  const allAnswered = questions.every(
    (q) => answers.has(q.id) && answers.get(q.id) !== null,
  );

  const scrollToLesson = (lessonId: number) => {
    document
      .getElementById(`lesson-${lessonId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <header
        className={`sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 ${
          hasScrolled ? "border-b" : ""
        }`}
      >
        <div className="flex min-w-0 items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1 shrink-0" />
          <Separator
            orientation="vertical"
            className="mr-2 shrink-0 data-[orientation=vertical]:h-4"
          />
          <Breadcrumb className="min-w-0">
            <BreadcrumbList className="flex-wrap">
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink asChild>
                  <Link href="/learn/formations">Formation</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block">
                <ChevronRight className="h-4 w-4" />
              </BreadcrumbSeparator>
              {themeInfo && (
                <>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink asChild>
                      <Link href={`/learn/${themeSlug}`}>{themeInfo.title}</Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block">
                    <ChevronRight className="h-4 w-4" />
                  </BreadcrumbSeparator>
                </>
              )}
              {subthemeInfo && (
                <>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink asChild>
                      <Link href={`/learn/${themeSlug}/${subthemeSlug}`}>
                        {subthemeInfo.title}
                      </Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block">
                    <ChevronRight className="h-4 w-4" />
                  </BreadcrumbSeparator>
                </>
              )}
              <BreadcrumbItem className="min-w-0 max-w-[12rem] sm:max-w-none">
                <BreadcrumbPage className="truncate">{module.title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="w-full min-w-0 px-4 py-8 sm:px-8 flex flex-col gap-10">
        <div className="space-y-3 pb-2 border-b">
          <div className="flex flex-wrap items-center gap-2">
            <DifficultyBadge difficulty={module.difficulty} />
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 shrink-0" />
              {module.estimatedMinutes} min de lecture
            </span>
            {questions.length > 0 && (
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Play className="h-3 w-3 shrink-0" />
                {questions.length} questions
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{module.title}</h1>
          {module.description && (
            <p className="text-base text-muted-foreground leading-relaxed">
              {module.description}
            </p>
          )}

          {quizPhase === "lessons" && questions.length > 0 && (
            <div className="flex flex-col gap-2 rounded-xl border border-dashed border-muted-foreground/25 bg-muted/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <div className="flex min-w-0 items-start gap-2">
                <Zap
                  className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium">Révision rapide</p>
                  <p className="text-xs text-muted-foreground">
                    Aller au quiz sans relire les leçons — idéal si vous maîtrisez
                    déjà le sujet.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-full shrink-0 sm:w-auto"
                onClick={startQuiz}
              >
                Aller au quiz
              </Button>
            </div>
          )}
        </div>

        {quizPhase === "lessons" && (
          <>
            {lessons.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                Aucune leçon disponible.
              </p>
            ) : (
              <div className="flex flex-col gap-12">
                {lessons.map((lesson, idx) => {
                  const next = lessons[idx + 1];
                  return (
                    <section
                      key={lesson.id}
                      id={`lesson-${lesson.id}`}
                      className={cn(
                        "animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both",
                      )}
                      style={{
                        animationDelay: `${Math.min(idx, 14) * 55}ms`,
                      }}
                    >
                      <div className="flex flex-wrap items-baseline gap-2 mb-5">
                        <span className="text-xs font-mono text-muted-foreground/60 tabular-nums w-5 shrink-0">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <h2 className="text-xl font-semibold tracking-tight min-w-0">
                          {lesson.title}
                        </h2>
                        {lesson.type !== "lesson" && (
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${lessonTypeBadgeVariant(lesson.type)}`}
                          >
                            {lessonTypeLabel(lesson.type)}
                          </span>
                        )}
                        {lesson.applicableYear && (
                          <Badge variant="outline" className="text-xs font-mono">
                            {lesson.applicableYear}
                          </Badge>
                        )}
                      </div>
                      <LessonContent content={lesson.content} />
                      {next && (
                        <div className="mt-8 flex justify-center border-t pt-6">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="gap-1.5 text-muted-foreground"
                            onClick={() => scrollToLesson(next.id)}
                          >
                            Leçon suivante
                            <ChevronDown className="h-4 w-4" aria-hidden />
                          </Button>
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            )}

            {questions.length > 0 && (
              <div id="quiz">
                <Separator className="mb-8" />
                <div className="rounded-2xl border-2 border-dashed border-primary/20 bg-primary/5 px-4 py-6 sm:px-8 sm:py-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Play className="h-5 w-5 text-primary" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold">Quiz du module</h3>
                      <p className="text-sm text-muted-foreground">
                        {questions.length} question{questions.length > 1 ? "s" : ""}{" "}
                        pour valider vos connaissances sur ce module.
                      </p>
                    </div>
                  </div>
                  <Button
                    size="lg"
                    onClick={startQuiz}
                    className="w-full shrink-0 px-8 sm:w-auto"
                  >
                    Démarrer le quiz
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {quizPhase === "quiz" && currentQuestion && (
          <div className="space-y-6 min-w-0">
            <QuizProgress
              current={currentQuestionIdx + 1}
              total={questions.length}
            />

            <Card className="shadow-sm min-w-0">
              <CardHeader className="pb-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                  Question {currentQuestionIdx + 1} sur {questions.length}
                </p>
              </CardHeader>
              <CardContent className="min-w-0">
                <QuizQuestion
                  question={currentQuestion}
                  selectedOptionId={answers.get(currentQuestion.id) ?? null}
                  onSelect={(optionId) => handleSelect(currentQuestion.id, optionId)}
                />
              </CardContent>
            </Card>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button
                variant="outline"
                disabled={currentQuestionIdx === 0}
                onClick={() => setCurrentQuestionIdx((i) => i - 1)}
                className="w-full sm:w-auto"
              >
                Précédent
              </Button>

              {!isLastQuestion ? (
                <Button
                  onClick={() => setCurrentQuestionIdx((i) => i + 1)}
                  disabled={!answers.has(currentQuestion.id)}
                  className="w-full sm:w-auto"
                >
                  Question suivante →
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !allAnswered}
                  aria-busy={submitting}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white sm:w-auto"
                >
                  {submitting ? "Envoi en cours…" : "Soumettre le quiz"}
                </Button>
              )}
            </div>

            <div className="pt-2">
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                onClick={() => setQuizPhase("lessons")}
              >
                ← Revenir aux leçons
              </button>
            </div>
          </div>
        )}

        {quizPhase === "results" && quizResults && (
          <div className="space-y-4 min-w-0">
            <h2 id="quiz-results-heading" className="text-xl font-semibold tracking-tight">
              Résultats du quiz
            </h2>
            <QuizResults
              results={quizResults}
              onRetry={handleRetry}
              onContinue={() =>
                router.push(`/learn/${themeSlug}/${subthemeSlug}`)
              }
            />
          </div>
        )}
      </div>
    </>
  );
}

export default function ModulePage() {
  return (
    <Suspense fallback={<ModulePageSkeleton />}>
      <ModulePageInner />
    </Suspense>
  );
}
