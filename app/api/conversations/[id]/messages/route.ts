import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import type { UIMessage } from "ai";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { assistantConversations } from "@/lib/schema";

type RouteContext = { params: Promise<{ id: string }> };

function firstUserMessageTitle(messages: UIMessage[]): string | null {
  for (const m of messages) {
    if (m.role !== "user") continue;
    const text = m.parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("")
      .trim();
    if (text.length > 0) {
      return text.length > 80 ? `${text.slice(0, 77)}…` : text;
    }
  }
  return null;
}

export async function GET(_req: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const userId = Number(session.user.id);
  if (!Number.isFinite(userId)) {
    return NextResponse.json({ error: "Session invalide" }, { status: 400 });
  }

  const { id } = await context.params;

  const [row] = await db
    .select({ messages: assistantConversations.messages })
    .from(assistantConversations)
    .where(
      and(
        eq(assistantConversations.id, id),
        eq(assistantConversations.userId, userId),
      ),
    )
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  return NextResponse.json({
    messages: (row.messages ?? []) as UIMessage[],
  });
}

export async function PUT(req: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const userId = Number(session.user.id);
  if (!Number.isFinite(userId)) {
    return NextResponse.json({ error: "Session invalide" }, { status: 400 });
  }

  const { id } = await context.params;
  const body = (await req.json()) as { messages?: UIMessage[] };
  const messages = Array.isArray(body.messages) ? body.messages : [];

  const title = firstUserMessageTitle(messages);

  const [updated] = await db
    .update(assistantConversations)
    .set({
      messages: messages as unknown[],
      ...(title ? { title } : {}),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(assistantConversations.id, id),
        eq(assistantConversations.userId, userId),
      ),
    )
    .returning({ id: assistantConversations.id });

  if (!updated) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
