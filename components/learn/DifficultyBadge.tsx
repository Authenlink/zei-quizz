import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Difficulty = "debutant" | "intermediaire" | "avance";

const DIFFICULTY_CONFIG: Record<
  Difficulty,
  { label: string; className: string }
> = {
  debutant: {
    label: "Débutant",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  intermediaire: {
    label: "Intermédiaire",
    className: "bg-amber-100 text-amber-700 border-amber-200",
  },
  avance: {
    label: "Avancé",
    className: "bg-rose-100 text-rose-700 border-rose-200",
  },
};

interface DifficultyBadgeProps {
  difficulty: Difficulty;
  className?: string;
}

export function DifficultyBadge({ difficulty, className }: DifficultyBadgeProps) {
  const config = DIFFICULTY_CONFIG[difficulty] ?? DIFFICULTY_CONFIG.debutant;
  return (
    <Badge
      variant="outline"
      className={cn(config.className, className)}
    >
      {config.label}
    </Badge>
  );
}
