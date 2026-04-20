"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RecommendedModule } from "@/lib/types/progress-dashboard";

export function RecommendedModuleCard({
  recommendedModule,
}: {
  recommendedModule: RecommendedModule | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-amber-500" />
          Module recommandé
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {recommendedModule ? (
          <>
            <div>
              <p className="font-semibold leading-snug">{recommendedModule.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {recommendedModule.reason === "incomplete"
                  ? "Poursuivez le parcours à votre rythme."
                  : `Renforcez ce module (meilleur score : ${recommendedModule.bestScore ?? 0}%).`}
              </p>
            </div>
            <Button asChild className="w-full sm:w-auto">
              <Link href={recommendedModule.href}>
                <BookOpen className="mr-2 h-4 w-4" />
                Ouvrir le module
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Tous vos modules sont complétés avec un bon niveau. Explorez une autre
              formation ou révisez un thème au choix.
            </p>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/learn/formations">
                Voir les formations
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
