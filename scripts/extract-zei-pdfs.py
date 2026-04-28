#!/usr/bin/env python3
"""
Extraction PDF -> texte brut pour la knowledge base ZEI (Phase 13 V2).

Itère les 7 PDFs sources dans docs/ et génère un fichier texte par document
dans docs/zei-knowledge/.tmp/<slug>.txt. Ces fichiers servent de matière
première pour la rédaction manuelle des Markdown finaux dans
docs/zei-knowledge/<category>/<slug>.md.

Pour chaque page d'un PDF :
  - "## Page N" en en-tête
  - texte brut via page.extract_text() (pdfplumber)
  - tables détectées via page.extract_tables() rendues en Markdown brut

Idempotent : ré-écrase les sorties à chaque exécution.

Usage :
    python3 scripts/extract-zei-pdfs.py
"""

from __future__ import annotations

import sys
from pathlib import Path

import pdfplumber

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"
TMP = ROOT / "docs" / "zei-knowledge" / ".tmp"

# Mapping PDF source -> nom de fichier slug pour l'extraction.
# Les slugs reflètent les noms .md cibles (cf. PLAN.md V2).
PDF_MAP: list[tuple[str, str]] = [
    (
        "En Bref 5 - CSRD, ce que vous devez comprendre avant vos concurrents pour rester compétitifs - Zei.pdf",
        "en-bref-5-csrd",
    ),
    (
        "Zei - La VSME expliquée - Le nouveau langage commun de la données ESG en Europe.pdf",
        "vsme-langage-commun",
    ),
    (
        "Guide Zei - Collecte ESG  arrêtez de bricoler, commencez à piloter.pdf",
        "guide-collecte-esg",
    ),
    (
        "Zei - Checklist Faites le point sur votre collecte ESG.pdf",
        "checklist-collecte-esg",
    ),
    (
        "Zei - En 2025 comment passer à une RSE de performance _.pdf",
        "rse-2025-performance",
    ),
    (
        "Zei - Plaquette synthétique 2026 (1).pdf",
        "plaquette-synthetique-2026",
    ),
    (
        "Exemple Proposition Zei - Portalp France.pdf",
        "proposition-portalp",
    ),
]


def _table_to_md(table: list[list[str | None]]) -> str:
    """Rend une table pdfplumber en Markdown brut (lignes pipe-separated)."""
    rows: list[str] = []
    for row in table:
        cells = ["" if c is None else str(c).replace("\n", " ").strip() for c in row]
        rows.append("| " + " | ".join(cells) + " |")
    return "\n".join(rows)


def extract_pdf(pdf_path: Path, out_path: Path) -> tuple[int, int]:
    """Extrait pdf_path vers out_path. Retourne (n_pages, n_tables)."""
    n_pages = 0
    n_tables = 0
    parts: list[str] = []
    parts.append(f"# {pdf_path.name}\n")

    with pdfplumber.open(str(pdf_path)) as pdf:
        for i, page in enumerate(pdf.pages, start=1):
            n_pages += 1
            parts.append(f"\n\n## Page {i}\n")
            text = page.extract_text() or ""
            if text.strip():
                parts.append(text.strip())
            tables = page.extract_tables() or []
            for j, table in enumerate(tables, start=1):
                if not table:
                    continue
                n_tables += 1
                parts.append(f"\n\n### [Tableau page {i} - {j}]\n")
                parts.append(_table_to_md(table))

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text("\n".join(parts) + "\n", encoding="utf-8")
    return n_pages, n_tables


def main() -> int:
    if not TMP.exists():
        TMP.mkdir(parents=True, exist_ok=True)

    missing: list[str] = []
    for filename, _slug in PDF_MAP:
        if not (DOCS / filename).exists():
            missing.append(filename)
    if missing:
        print("PDFs manquants dans docs/ :", file=sys.stderr)
        for m in missing:
            print(f"  - {m}", file=sys.stderr)
        return 1

    total_pages = 0
    total_tables = 0
    for filename, slug in PDF_MAP:
        pdf_path = DOCS / filename
        out_path = TMP / f"{slug}.txt"
        n_pages, n_tables = extract_pdf(pdf_path, out_path)
        total_pages += n_pages
        total_tables += n_tables
        print(f"  {slug:30s}  pages={n_pages:3d}  tables={n_tables:3d}  -> {out_path.relative_to(ROOT)}")

    print(
        f"\n✓ Extraction terminée : {len(PDF_MAP)} PDFs, "
        f"{total_pages} pages, {total_tables} tables.\n"
        f"  Sortie : {TMP.relative_to(ROOT)}/<slug>.txt"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
