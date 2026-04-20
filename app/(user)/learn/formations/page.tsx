"use client";

import { LearnCatalogView } from "@/components/learn/learn-catalog-view";

export default function ToutesLesFormationsPage() {
  return (
    <LearnCatalogView
      breadcrumbCurrent="Toutes les formations"
      title="Toutes les formations"
      subtitle="Vue d’ensemble de vos parcours RSE, CSRD, ESG et autres thèmes — suivez votre progression sur chaque formation."
    />
  );
}
