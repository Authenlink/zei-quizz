"use client";

import * as React from "react";
import { Bar, BarChart, Cell, XAxis, YAxis } from "recharts";

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProgressThemeRow } from "@/lib/types/progress-dashboard";

const chartConfig = {
  progressPercent: {
    label: "Progression",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

function barFill(color: string) {
  return /^#[0-9A-Fa-f]{6}$/i.test(color) ? color : "hsl(var(--primary))";
}

export function ThemeProgressBar({ themes }: { themes: ProgressThemeRow[] }) {
  const data = themes.map((t) => ({
    key: t.slug,
    title: t.title.length > 32 ? `${t.title.slice(0, 30)}…` : t.title,
    progressPercent: t.progressPercent,
    fill: barFill(t.color),
  }));

  const chartHeight = React.useMemo(
    () => Math.min(520, Math.max(200, data.length * 44 + 48)),
    [data.length]
  );

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Par thème</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Aucun thème disponible.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Par thème</CardTitle>
      </CardHeader>
      <CardContent className="pl-0">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto w-full justify-start"
          style={{ height: chartHeight }}
        >
          <BarChart
            accessibilityLayer
            layout="vertical"
            data={data}
            margin={{ left: 8, right: 20, top: 8, bottom: 8 }}
            barCategoryGap={10}
          >
            <XAxis type="number" domain={[0, 100]} hide />
            <YAxis
              type="category"
              dataKey="title"
              width={118}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Bar dataKey="progressPercent" radius={[0, 4, 4, 0]} maxBarSize={24}>
              {data.map((entry) => (
                <Cell key={entry.key} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
