"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, Circle } from "lucide-react";

export interface QuizOption {
  id: number;
  text: string;
  order: number;
}

export interface QuizQuestionData {
  id: number;
  question: string;
  type: "mcq" | "true_false" | "ordering";
  difficulty: "debutant" | "intermediaire" | "avance";
  points: number;
  options: QuizOption[];
}

interface QuizQuestionProps {
  question: QuizQuestionData;
  /** Currently selected option id (null = nothing selected) */
  selectedOptionId: number | null;
  /** Set when answers have been revealed (post-submit) */
  correctOptionId?: number | null;
  /** Whether the answer has been submitted (locks interaction) */
  submitted?: boolean;
  onSelect: (optionId: number) => void;
}

export function QuizQuestion({
  question,
  selectedOptionId,
  correctOptionId,
  submitted = false,
  onSelect,
}: QuizQuestionProps) {
  const baseId = useId();
  const promptId = `${baseId}-prompt`;
  const groupName = `quiz-q-${question.id}`;

  return (
    <div className="space-y-4">
      <p
        id={promptId}
        className="text-base font-medium leading-relaxed"
      >
        {question.question}
      </p>

      <div
        role="radiogroup"
        aria-labelledby={promptId}
        aria-disabled={submitted}
        className="space-y-2"
      >
        {question.options.map((option) => {
          const isSelected = selectedOptionId === option.id;
          const isCorrect = submitted && correctOptionId === option.id;
          const isWrong = submitted && isSelected && !isCorrect;

          return (
            <div key={option.id} className="relative">
              <button
                type="button"
                role="radio"
                name={groupName}
                aria-checked={isSelected}
                aria-disabled={submitted}
                disabled={submitted}
                onClick={() => onSelect(option.id)}
                className={cn(
                  "w-full flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-all",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  !submitted && !isSelected && "hover:bg-muted/60 border-border",
                  !submitted &&
                    isSelected &&
                    "border-primary bg-primary/5 ring-1 ring-primary/30",
                  isCorrect &&
                    "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 ring-1 ring-emerald-400/50",
                  isWrong &&
                    "border-rose-400 bg-rose-50 dark:bg-rose-950/30 ring-1 ring-rose-400/50",
                  submitted &&
                    !isSelected &&
                    !isCorrect &&
                    "opacity-60 border-border",
                )}
              >
                <span className="flex-1">{option.text}</span>
                {submitted && isCorrect && (
                  <CheckCircle2
                    className="h-4 w-4 shrink-0 text-emerald-500"
                    aria-hidden
                  />
                )}
                {isWrong && (
                  <XCircle className="h-4 w-4 shrink-0 text-rose-500" aria-hidden />
                )}
                {!submitted && isSelected && (
                  <Circle
                    className="h-4 w-4 shrink-0 fill-primary text-primary"
                    aria-hidden
                  />
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
