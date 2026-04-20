"use client";

import { useId } from "react";
import { CheckCircle2, XCircle, Trophy, Repeat2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getAchievementMeta } from "@/lib/achievements";
import { achievementIconFor } from "@/components/learn/achievement-icons";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QuizResultItem {
  questionId: number;
  question: string;
  explanation: string;
  correctOptionId: number | null;
  selectedOptionId: number | null;
  isCorrect: boolean;
}

export interface QuizResultsData {
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  newAchievements: string[];
  results: QuizResultItem[];
}

// ---------------------------------------------------------------------------
// Score ring (SVG)
// ---------------------------------------------------------------------------

function ScoreRing({ score }: { score: number }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const color =
    score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="120" height="120" className="-rotate-90" aria-hidden>
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-muted/40"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold" style={{ color }}>
          {score}%
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface QuizResultsProps {
  results: QuizResultsData;
  onRetry?: () => void;
  onContinue?: () => void;
  className?: string;
}

export function QuizResults({
  results,
  onRetry,
  onContinue,
  className,
}: QuizResultsProps) {
  const passed = results.score >= 60;
  const regionId = useId();
  const scoreHeadingId = `${regionId}-score-heading`;
  const liveSummaryId = `${regionId}-live-summary`;

  const scoreLabel =
    results.score === 100
      ? "Score parfait !"
      : results.score >= 80
        ? "Excellent !"
        : results.score >= 60
          ? "Réussi !"
          : "Essayez encore";

  const liveSummary = `Score ${results.score} pour cent. ${results.correctAnswers} bonnes réponses sur ${results.totalQuestions}.`;

  return (
    <div
      role="region"
      aria-labelledby={scoreHeadingId}
      className={cn("space-y-6", className)}
    >
      <div
        id={liveSummaryId}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {liveSummary}
      </div>

      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <ScoreRing score={results.score} />
        <div>
          <p
            id={scoreHeadingId}
            className={cn(
              "text-lg font-bold",
              passed ? "text-emerald-600" : "text-rose-600",
            )}
          >
            {scoreLabel}
          </p>
          <p className="text-sm text-muted-foreground">
            {results.correctAnswers} bonne{results.correctAnswers !== 1 ? "s" : ""}{" "}
            réponse{results.correctAnswers !== 1 ? "s" : ""} sur{" "}
            {results.totalQuestions}
          </p>
        </div>
      </div>

      {results.newAchievements.length > 0 && (
        <div
          className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-4 space-y-2"
          aria-label="Nouveaux badges débloqués"
        >
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-2">
            <Trophy className="h-4 w-4 shrink-0" aria-hidden />
            Nouveau{results.newAchievements.length > 1 ? "x" : ""} badge
            {results.newAchievements.length > 1 ? "s" : ""} débloqué
            {results.newAchievements.length > 1 ? "s" : ""} !
          </p>
          <div className="flex flex-wrap gap-2">
            {results.newAchievements.map((type) => {
              const meta = getAchievementMeta(type);
              const Icon = achievementIconFor(meta.icon);
              return (
                <Badge
                  key={type}
                  variant="outline"
                  className="gap-1.5 border-amber-300 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {meta.label}
                </Badge>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        {onRetry && (
          <Button
            variant="outline"
            onClick={onRetry}
            className="flex-1 gap-2 min-w-0"
          >
            <Repeat2 className="h-4 w-4 shrink-0" aria-hidden />
            Réessayer
          </Button>
        )}
        {onContinue && (
          <Button onClick={onContinue} className="flex-1 min-w-0">
            Continuer
          </Button>
        )}
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Corrections détaillées
        </h3>

        {results.results.map((item, index) => (
          <div
            key={item.questionId}
            className={cn(
              "rounded-lg border p-4 space-y-2",
              item.isCorrect
                ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20"
                : "border-rose-200 bg-rose-50/50 dark:border-rose-800 dark:bg-rose-950/20",
            )}
          >
            <div className="flex items-start gap-2 min-w-0">
              {item.isCorrect ? (
                <CheckCircle2
                  className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500"
                  aria-hidden
                />
              ) : (
                <XCircle
                  className="mt-0.5 h-4 w-4 shrink-0 text-rose-500"
                  aria-hidden
                />
              )}
              <p className="text-sm font-medium min-w-0">
                <span className="text-muted-foreground mr-2">Q{index + 1}.</span>
                {item.question}
              </p>
            </div>

            {item.explanation && (
              <p className="pl-6 text-xs text-muted-foreground leading-relaxed">
                {item.explanation}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
