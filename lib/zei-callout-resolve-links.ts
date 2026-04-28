import {
  ZEI_PUBLIC_URL_CHECKLIST_COLLECTE_ESG,
  ZEI_PUBLIC_URL_EN_BREF_5_CSRD,
  ZEI_PUBLIC_URL_GUIDE_COLLECTE_ESG,
  ZEI_PUBLIC_URL_PLAQUETTE_SYNTHETIQUE_2026,
  ZEI_PUBLIC_URL_PROPOSITION_PORTALP,
  ZEI_PUBLIC_URL_RSE_2025_PERFORMANCE,
  ZEI_PUBLIC_URL_VSME_LANGAGE_COMMUN,
} from "@/lib/zei-knowledge-public-urls";

export type ZeiSourceLink = { label: string; url: string };

/**
 * Résout un lien catalogue pour un fragment de texte issu de « Source : ZEI — … »
 * (séeds `zeiCallout`, etc.). Ordre : des motifs les plus spécifiques aux plus généraux.
 */
function matchSegmentToLink(segment: string): ZeiSourceLink | null {
  const s = segment.trim();
  if (!s) return null;

  if (/proposition[- ]?portalp|proposition.*portalp|^portalp|portalp\s*—/i.test(s)) {
    return {
      label: "Exemple proposition Zei — Portalp France (Slides)",
      url: ZEI_PUBLIC_URL_PROPOSITION_PORTALP,
    };
  }
  if (/plaquette\s+synth[ée]tique|^plaquette\s+2026/i.test(s)) {
    return {
      label: "Plaquette synthétique 2026 (Slides)",
      url: ZEI_PUBLIC_URL_PLAQUETTE_SYNTHETIQUE_2026,
    };
  }
  if (/checklist|faites\s+le\s+point\s+sur\s+votre\s+collecte/i.test(s)) {
    return {
      label: "Checklist — Faites le point sur votre collecte ESG (PDF)",
      url: ZEI_PUBLIC_URL_CHECKLIST_COLLECTE_ESG,
    };
  }
  if (/guide\s+collecte|collecte\s+esg.*pilot|arr[eê]tez\s+de\s+bricoler/i.test(s)) {
    return {
      label: "Guide Zei — Collecte ESG (PDF)",
      url: ZEI_PUBLIC_URL_GUIDE_COLLECTE_ESG,
    };
  }
  if (/vsme|langage\s+commun.*esg|nouveau\s+langage\s+commun/i.test(s)) {
    return {
      label: "La VSME expliquée — Langage commun ESG (PDF)",
      url: ZEI_PUBLIC_URL_VSME_LANGAGE_COMMUN,
    };
  }
  if (
    /rse\s+de\s+performance|passer\s+[àa]\s+une\s+rse|rse-2025|livre\s+blanc.*rse\s+de\s+performance/i.test(
      s,
    )
  ) {
    return {
      label: "En 2025, comment passer à une RSE de performance ? (PDF)",
      url: ZEI_PUBLIC_URL_RSE_2025_PERFORMANCE,
    };
  }
  if (
    /en[- ]?bref|bref\s*5|en\s+bref|csrd.*compéti|compétitifs.*csrd|ce que vous devez comprendre/i.test(
      s,
    )
  ) {
    return {
      label: "En Bref 5 — CSRD (PDF)",
      url: ZEI_PUBLIC_URL_EN_BREF_5_CSRD,
    };
  }

  return null;
}

/** Extrait la partie « doc » après `Source : ZEI —` dans les callouts générés par les seeds. */
function extractDocPartFromZeiCalloutText(text: string): string | null {
  const needle = "Source : ZEI —";
  const idx = text.indexOf(needle);
  if (idx === -1) return null;
  let after = text.slice(idx + needle.length).trim();
  after = after.replace(/\s*\.\s*$/, "").trim();
  return after || null;
}

function dedupeLinks(links: ZeiSourceLink[]): ZeiSourceLink[] {
  const seen = new Set<string>();
  const out: ZeiSourceLink[] = [];
  for (const L of links) {
    if (seen.has(L.url)) continue;
    seen.add(L.url);
    out.push(L);
  }
  return out;
}

/**
 * Liens à afficher sous un callout « Vu par ZEI » : champs explicites en base,
 * ou résolution à partir du suffixe `Source : ZEI — …` (données seed existantes).
 */
export function resolveZeiCalloutSourceLinks(block: {
  title?: string;
  text: string;
  sourceLinks?: ZeiSourceLink[];
}): ZeiSourceLink[] {
  if (Array.isArray(block.sourceLinks) && block.sourceLinks.length > 0) {
    return dedupeLinks(block.sourceLinks);
  }

  if (block.title !== "Vu par ZEI") {
    return [];
  }

  const docPart = extractDocPartFromZeiCalloutText(block.text);
  if (!docPart) return [];

  const segments = docPart.split(";").map((x) => x.trim()).filter(Boolean);
  const resolved: ZeiSourceLink[] = [];

  for (const seg of segments) {
    const link = matchSegmentToLink(seg);
    if (link) resolved.push(link);
  }

  return dedupeLinks(resolved);
}
