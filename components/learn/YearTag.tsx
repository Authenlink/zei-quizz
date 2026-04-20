import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface YearTagProps {
  year: number;
  className?: string;
}

export function YearTag({ year, className }: YearTagProps) {
  const is2025 = year === 2025;
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-mono text-xs",
        is2025
          ? "bg-blue-50 text-blue-700 border-blue-200"
          : "bg-violet-50 text-violet-700 border-violet-200",
        className
      )}
    >
      {year}
    </Badge>
  );
}
