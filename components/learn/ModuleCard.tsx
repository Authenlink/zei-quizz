import Link from "next/link";
import { Clock, CheckCircle2, Circle, PlayCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { DifficultyBadge } from "./DifficultyBadge";

type ModuleStatus = "not_started" | "in_progress" | "completed";
type Difficulty = "debutant" | "intermediaire" | "avance";

export interface ModuleCardData {
  id: number;
  slug: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  difficulty: Difficulty;
  status: ModuleStatus;
  bestScore: number;
  attempts: number;
  /** 0–100 : quiz non commencé, meilleur score jusqu’à réussite, puis 100 si terminé */
  progressPercent: number;
}

interface ModuleCardProps {
  module: ModuleCardData;
  href: string;
  className?: string;
}

const STATUS_CONFIG: Record<
  ModuleStatus,
  { icon: React.FC<{ className?: string }>; label: string; color: string }
> = {
  not_started: {
    icon: Circle,
    label: "À commencer",
    color: "text-muted-foreground",
  },
  in_progress: {
    icon: PlayCircle,
    label: "En cours",
    color: "text-blue-500",
  },
  completed: {
    icon: CheckCircle2,
    label: "Terminé",
    color: "text-emerald-500",
  },
};

export function ModuleCard({ module, href, className }: ModuleCardProps) {
  const statusConfig = STATUS_CONFIG[module.status];
  const StatusIcon = statusConfig.icon;

  return (
    <Link href={href} className={cn("group block", className)}>
      <Card
        className={cn(
          "h-full transition-all hover:shadow-sm hover:border-primary/30",
          module.status === "completed" && "border-emerald-200/60 bg-emerald-50/30 dark:bg-emerald-950/10",
          module.status === "in_progress" && "border-blue-200/60"
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <StatusIcon
              className={cn("mt-0.5 h-5 w-5 shrink-0", statusConfig.color)}
            />
            <div className="min-w-0 flex-1 space-y-2">
              <div>
                <h4 className="font-medium leading-snug group-hover:text-primary transition-colors line-clamp-2">
                  {module.title}
                </h4>
                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                  {module.description}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <DifficultyBadge difficulty={module.difficulty} />

                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {module.estimatedMinutes} min
                </span>

                {module.attempts > 0 && (
                  <span className="text-xs text-muted-foreground">
                    Meilleur score :{" "}
                    <span
                      className={cn(
                        "font-semibold",
                        module.bestScore >= 80
                          ? "text-emerald-600"
                          : module.bestScore >= 60
                          ? "text-amber-600"
                          : "text-rose-600"
                      )}
                    >
                      {module.bestScore}%
                    </span>
                  </span>
                )}
              </div>

              <div className="space-y-1 pt-0.5">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Progression</span>
                  <span className="font-medium text-foreground">
                    {module.progressPercent}%
                  </span>
                </div>
                <Progress value={module.progressPercent} className="h-1" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
