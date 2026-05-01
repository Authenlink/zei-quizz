"use client";

import {
  Award,
  Factory,
  Handshake,
  Leaf,
  Scale,
  type LucideIcon,
} from "lucide-react";

import type { ResourceCategoryIconKey } from "@/lib/resources";
import { cn } from "@/lib/utils";

const CATEGORY_ICONS: Record<ResourceCategoryIconKey, LucideIcon> = {
  leaf: Leaf,
  scale: Scale,
  factory: Factory,
  award: Award,
  handshake: Handshake,
};

export function CategoryGlyph({
  iconKey,
  className,
}: {
  iconKey: ResourceCategoryIconKey;
  className?: string;
}) {
  const Icon = CATEGORY_ICONS[iconKey];
  return <Icon className={cn("size-5 shrink-0", className)} aria-hidden />;
}
