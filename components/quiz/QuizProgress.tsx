"use client";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface QuizProgressProps {
  current: number;
  total: number;
  className?: string;
}

export function QuizProgress({ current, total, className }: QuizProgressProps) {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;
  const label = `Question ${current} sur ${total}, ${percent} pour cent complété`;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="flex items-center justify-between text-xs text-muted-foreground"
      >
        <span>
          Question{" "}
          <span className="font-semibold text-foreground">{current}</span>
          {" / "}
          <span className="font-semibold text-foreground">{total}</span>
        </span>
        <span>{percent}%</span>
      </div>
      <Progress
        value={percent}
        className="h-2"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      />
    </div>
  );
}
