"use client";

import * as React from "react";
import { PolarAngleAxis, RadialBar, RadialBarChart } from "recharts";

import { type ChartConfig, ChartContainer } from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const chartConfig = {
  value: {
    label: "Progression",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export function ProgressRing({
  globalProgressPercent,
}: {
  globalProgressPercent: number;
}) {
  const pct = Math.min(100, Math.max(0, globalProgressPercent));
  const data = React.useMemo(() => [{ name: "progress", value: pct }], [pct]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-0">
        <CardTitle className="text-base">Progression globale</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center pb-4 pt-2">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square h-[200px] max-h-[220px] w-full max-w-[220px]"
        >
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="58%"
            outerRadius="92%"
            barSize={14}
            data={data}
            startAngle={90}
            endAngle={-270}
          >
            <PolarAngleAxis
              type="number"
              domain={[0, 100]}
              angleAxisId={0}
              tick={false}
            />
            <RadialBar
              dataKey="value"
              cornerRadius={8}
              fill="var(--color-value)"
              background={{ className: "fill-muted" }}
            />
          </RadialBarChart>
        </ChartContainer>
        <p className="-mt-2 text-center text-3xl font-bold tabular-nums">
          {pct}%
        </p>
        <p className="text-center text-xs text-muted-foreground">
          Modules complétés sur l’ensemble des parcours
        </p>
      </CardContent>
    </Card>
  );
}
