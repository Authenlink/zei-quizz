import type { LucideIcon } from "lucide-react";
import {
  Award,
  BarChart2,
  Calendar,
  FileText,
  Flame,
  Footprints,
  Leaf,
  Megaphone,
  Star,
  Trophy,
} from "lucide-react";

export const ACHIEVEMENT_ICON_MAP: Record<string, LucideIcon> = {
  FootprintsIcon: Footprints,
  LeafIcon: Leaf,
  FileTextIcon: FileText,
  BarChart2Icon: BarChart2,
  CalendarIcon: Calendar,
  MegaphoneIcon: Megaphone,
  StarIcon: Star,
  TrophyIcon: Trophy,
  FlameIcon: Flame,
  AwardIcon: Award,
};

export function achievementIconFor(iconKey: string): LucideIcon {
  return ACHIEVEMENT_ICON_MAP[iconKey] ?? Award;
}
