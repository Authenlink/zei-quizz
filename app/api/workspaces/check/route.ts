import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { workspaces } from "@/lib/schema";
import { eq } from "drizzle-orm";

// ============================================================
// GET /api/workspaces/check?slug=acme-corp
//
// Vérifie si un slug de workspace existe ou est disponible.
// Utilisé côté client (formulaire signup) pour :
//   - création  : confirmer que le slug est LIBRE
//   - rejoindre : confirmer que le slug EXISTE
//
// Ne retourne jamais le passwordHash.
// ============================================================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  if (!slug) {
    return NextResponse.json(
      { error: "Le paramètre slug est requis" },
      { status: 400 }
    );
  }

  const [workspace] = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
    })
    .from(workspaces)
    .where(eq(workspaces.slug, slug))
    .limit(1);

  return NextResponse.json({
    exists: !!workspace,
    name: workspace?.name ?? null,
  });
}
