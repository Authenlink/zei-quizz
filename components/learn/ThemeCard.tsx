import Link from "next/link";
import {
  Leaf,
  FileText,
  BarChart2,
  Calendar,
  Megaphone,
  Star,
  BookOpen,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

/** Mapping des noms d'icônes Lucide stockés en DB vers leurs composants */
const ICON_MAP: Record<string, LucideIcon> = {
  Leaf,
  LeafIcon: Leaf,
  FileText,
  FileTextIcon: FileText,
  BarChart2,
  BarChart2Icon: BarChart2,
  Calendar,
  CalendarIcon: Calendar,
  Megaphone,
  MegaphoneIcon: Megaphone,
  Star,
  StarIcon: Star,
  BookOpen,
  BookOpenIcon: BookOpen,
};

export interface ThemeCardData {
  id: number;
  slug: string;
  title: string;
  description: string;
  icon: string;
  /** CSS color string (ex: "#22c55e") ou classe Tailwind complète — utilisé en inline style */
  color: string;
  totalModules: number;
  completedModules: number;
  progressPercent: number;
}

interface ThemeCardProps {
  theme: ThemeCardData;
  className?: string;
}

export function ThemeCard({ theme, className }: ThemeCardProps) {
  const Icon: LucideIcon = ICON_MAP[theme.icon] ?? BookOpen;

  // color peut être un hex CSS ("#22c55e") ou un nom CSS ("green")
  const isCssColor =
    theme.color.startsWith("#") ||
    theme.color.startsWith("rgb") ||
    theme.color.startsWith("hsl") ||
    /^[a-z]+$/.test(theme.color);

  const iconStyle = isCssColor
    ? { backgroundColor: `${theme.color}20`, color: theme.color }
    : {};

  return (
    <Link href={`/learn/${theme.slug}`} className={cn("group block text-left", className)}>
      <Card className="h-full transition-shadow hover:shadow-md hover:border-primary/30">
        <CardHeader className="pb-3 text-left">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                !isCssColor && theme.color
              )}
              style={isCssColor ? iconStyle : undefined}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold leading-tight group-hover:text-primary transition-colors line-clamp-2">
                {theme.title}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                {theme.description}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0 text-left">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 text-left text-xs text-muted-foreground">
              <span>
                {theme.completedModules} / {theme.totalModules} module
                {theme.totalModules !== 1 ? "s" : ""}
              </span>
              <span className="font-medium text-foreground">
                {theme.progressPercent}%
              </span>
            </div>
            <Progress value={theme.progressPercent} className="h-1.5" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
