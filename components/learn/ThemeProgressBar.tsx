"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  XAxis,
  YAxis,
} from "recharts";

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ProgressThemeRow } from "@/lib/types/progress-dashboard";
import { cn } from "@/lib/utils";

const chartConfig = {
  progressPercent: {
    label: "Modules complétés",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

function barFill(color: string) {
  return /^#[0-9A-Fa-f]{6}$/i.test(color) ? color : "hsl(var(--primary))";
}

/**
 * Piste d’objectif (fond) : teinte du thème adoucie et mélangée aux couleurs sémantiques
 * (clair / sombre, surface carte) pour chaque ligne — pas une teinte grise unique.
 */
function trackFillForTheme(color: string): string {
  const c = barFill(color);
  if (/^#[0-9A-Fa-f]{6}$/i.test(c)) {
    return `color-mix(in srgb, ${c} 30%, hsl(var(--card)) 70%)`;
  }
  return `color-mix(in srgb, ${c} 34%, hsl(var(--card)) 66%)`;
}

type ThemeBarDatum = {
  key: string;
  title: string;
  rawTitle: string;
  progressPercent: number;
  completedModules: number;
  totalModules: number;
  fill: string;
  /** Piste 100 % : dérivée de la couleur thème + tokens UI */
  trackFill: string;
};

export function ThemeProgressBar({
  themes,
  className,
}: {
  themes: ProgressThemeRow[];
  className?: string;
}) {
  const data: ThemeBarDatum[] = themes.map((t) => ({
    key: t.slug,
    title: t.title.length > 32 ? `${t.title.slice(0, 30)}…` : t.title,
    rawTitle: t.title,
    progressPercent: t.progressPercent,
    completedModules: t.completedModules,
    totalModules: t.totalModules,
    fill: barFill(t.color),
    trackFill: trackFillForTheme(t.color),
  }));

  const chartHeight = React.useMemo(
    () => Math.min(560, Math.max(220, data.length * 48 + 64)),
    [data.length],
  );

  if (data.length === 0) {
    return (
      <Card className={cn("flex h-full min-h-0 flex-col", className)}>
        <CardHeader className="shrink-0">
          <CardTitle className="text-base">Par thème</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col justify-center">
          <p className="text-sm text-muted-foreground">
            Aucun thème disponible.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="shrink-0 space-y-1 pb-2">
        <CardTitle className="text-base">Par thème</CardTitle>
        <CardDescription className="text-xs leading-relaxed sm:text-sm">
          <span className="inline-flex items-center">
            <span
              className="inline-block h-2 w-7 rounded-sm border border-border/50 bg-gradient-to-r from-primary/25 via-card to-card"
              aria-hidden
            />
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="min-h-0 pl-0 pr-1 pt-0 sm:pr-2">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto w-full min-h-[220px] justify-start"
          style={{ height: chartHeight }}
        >
          <BarChart
            accessibilityLayer
            layout="vertical"
            data={data}
            margin={{ left: 4, right: 36, top: 4, bottom: 4 }}
            barCategoryGap={12}
            barGap={2}
          >
            <CartesianGrid
              horizontal={false}
              vertical
              strokeDasharray="3 6"
              className="stroke-border/40"
            />
            <XAxis
              type="number"
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tickFormatter={(v) => `${v} %`}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10 }}
            />
            <YAxis
              type="category"
              dataKey="title"
              width={128}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
            />
            <ChartTooltip
              cursor={{ className: "fill-muted/20" }}
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const p = payload[0].payload as ThemeBarDatum;
                return (
                  <div className="grid min-w-[10rem] gap-1 rounded-lg border border-border/60 bg-background/95 px-3 py-2 text-xs shadow-lg backdrop-blur-sm">
                    <p className="font-medium leading-tight text-foreground">
                      {p.rawTitle}
                    </p>
                    <p className="text-muted-foreground">
                      {p.completedModules} / {p.totalModules} modules
                      <span className="text-foreground">
                        {" "}
                        — {p.progressPercent} %
                      </span>
                    </p>
                  </div>
                );
              }}
            />
            <Bar
              dataKey="progressPercent"
              radius={[0, 6, 6, 0]}
              maxBarSize={28}
              minPointSize={2}
              background={(barProps) => {
                const payload = barProps.payload as ThemeBarDatum | undefined;
                const g = barProps.background;
                if (!g || payload == null) return null;
                const { x, y, width, height } = g;
                if (x == null || y == null || width == null || height == null) {
                  return null;
                }
                return (
                  <rect
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    rx={6}
                    ry={6}
                    fill={payload.trackFill}
                    stroke="hsl(var(--border) / 0.5)"
                    strokeWidth={1}
                    className="recharts-bar-background-rectangle"
                  />
                );
              }}
            >
              {data.map((entry) => (
                <Cell
                  key={entry.key}
                  fill={entry.fill}
                  className="drop-shadow-sm"
                />
              ))}
              <LabelList
                dataKey="progressPercent"
                position="right"
                className="fill-foreground/85"
                fontSize={10}
                fontWeight={600}
                offset={6}
                formatter={(label) => {
                  const v = Number(label);
                  if (!Number.isFinite(v)) return "";
                  return `${Math.round(v)} %`;
                }}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
