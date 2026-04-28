"use client";

import { Award, BookOpenCheck, Layers, Sparkles, Target } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { ProgressThemeRow } from "@/lib/types/progress-dashboard";

export function StatsCards({
  completedModules,
  totalModules,
  averageScore,
  totalAttempts,
  zeiEnrichedModulesConsulted,
  themes,
}: {
  completedModules: number;
  totalModules: number;
  averageScore: number;
  totalAttempts: number;
  zeiEnrichedModulesConsulted: number;
  themes: ProgressThemeRow[];
}) {
  const themesWithProgress = themes.filter((t) => t.completedModules > 0).length;

  const items = [
    {
      label: "Modules complétés",
      value: totalModules > 0 ? `${completedModules} / ${totalModules}` : "—",
      hint: "Parcours actifs",
      icon: BookOpenCheck,
    },
    {
      label: "Score moyen (meilleurs)",
      value:
        completedModules === 0 && totalAttempts === 0
          ? "—"
          : `${averageScore}%`,
      hint: "Moyenne des meilleurs scores par module tenté",
      icon: Target,
    },
    {
      label: "Tentatives quiz",
      value: totalAttempts > 0 ? String(totalAttempts) : "0",
      hint: "Toutes sessions confondues",
      icon: Layers,
    },
    {
      label: "Thèmes avancés",
      value: `${themesWithProgress} / ${themes.length || 0}`,
      hint: "Au moins un module complété par thème",
      icon: Award,
    },
    {
      label: "Modules enrichis ZEI consultés",
      value: String(zeiEnrichedModulesConsulted),
      hint: "Fiches modules avec contenu ZEI ouverts au moins une fois",
      icon: Sparkles,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent className="flex items-start gap-3 pt-6">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <item.icon className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
              <p className="text-2xl font-bold tabular-nums tracking-tight">{item.value}</p>
              <p className="text-xs text-muted-foreground">{item.hint}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
