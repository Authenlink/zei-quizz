import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, workspaces, workspaceMembers } from "@/lib/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { generateRandomGradient } from "@/lib/gradient-generator";

// ============================================================
// Helpers de validation
// ============================================================

function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length >= 2 && slug.length <= 50;
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50);
}

// ============================================================
// POST /api/auth/register
//
// Body pour un compte personnel :
//   { name, email, password, accountType: "user" }
//
// Body pour un compte entreprise — créer un workspace :
//   { name, email, password, accountType: "business",
//     workspace: { action: "create", name: "Acme Corp", slug: "acme-corp", password: "..." } }
//
// Body pour un compte entreprise — rejoindre un workspace :
//   { name, email, password, accountType: "business",
//     workspace: { action: "join", slug: "acme-corp", password: "..." } }
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, accountType = "user", workspace } = body;

    // --- Validations de base ---
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Nom, email et mot de passe sont requis" },
        { status: 400 }
      );
    }

    if (accountType !== "user" && accountType !== "business") {
      return NextResponse.json(
        { error: "Type de compte invalide" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Format d'email invalide" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Le mot de passe doit contenir au moins 8 caractères" },
        { status: 400 }
      );
    }

    // --- Validation workspace pour comptes entreprise ---
    if (accountType === "business") {
      if (!workspace || !workspace.action || !workspace.slug || !workspace.password) {
        return NextResponse.json(
          { error: "Les informations du workspace sont requises pour un compte entreprise" },
          { status: 400 }
        );
      }

      if (workspace.action !== "create" && workspace.action !== "join") {
        return NextResponse.json(
          { error: "Action workspace invalide (create ou join)" },
          { status: 400 }
        );
      }

      if (!isValidSlug(workspace.slug)) {
        return NextResponse.json(
          { error: "Identifiant de workspace invalide (lettres minuscules, chiffres et tirets uniquement)" },
          { status: 400 }
        );
      }

      if (workspace.action === "create") {
        if (!workspace.name || workspace.name.trim().length < 2) {
          return NextResponse.json(
            { error: "Le nom du workspace doit contenir au moins 2 caractères" },
            { status: 400 }
          );
        }
        if (workspace.password.length < 6) {
          return NextResponse.json(
            { error: "Le mot de passe du workspace doit contenir au moins 6 caractères" },
            { status: 400 }
          );
        }
      }
    }

    // --- Vérifier si l'email existe déjà ---
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: "Cet email est déjà utilisé" },
        { status: 409 }
      );
    }

    // --- Hacher le mot de passe utilisateur ---
    const hashedPassword = await bcrypt.hash(password, 10);
    const userGradient = generateRandomGradient();

    // ============================================================
    // Compte personnel — création simple
    // ============================================================
    if (accountType === "user") {
      const newUser = await db
        .insert(users)
        .values({
          email,
          name,
          password: hashedPassword,
          accountType,
          role: "staff",
          backgroundType: "gradient",
          backgroundGradient: userGradient,
        })
        .returning();

      const createdUser = newUser[0];
      return NextResponse.json(
        {
          message: "Compte créé avec succès",
          user: {
            id: createdUser.id,
            email: createdUser.email,
            name: createdUser.name,
            accountType: createdUser.accountType,
          },
        },
        { status: 201 }
      );
    }

    // ============================================================
    // Compte entreprise — création atomique avec workspace
    // ============================================================
    return await db.transaction(async (tx) => {
      if (workspace.action === "create") {
        // Vérifier que le slug n'est pas déjà pris
        const existingWorkspace = await tx
          .select({ id: workspaces.id })
          .from(workspaces)
          .where(eq(workspaces.slug, workspace.slug))
          .limit(1);

        if (existingWorkspace.length > 0) {
          return NextResponse.json(
            { error: "Cet identifiant de workspace est déjà utilisé" },
            { status: 409 }
          );
        }

        // Hacher le mot de passe du workspace
        const wsPasswordHash = await bcrypt.hash(workspace.password, 10);

        // Créer le workspace (ownerId mis à jour après création de l'user)
        const [createdWorkspace] = await tx
          .insert(workspaces)
          .values({
            name: workspace.name.trim(),
            slug: workspace.slug,
            passwordHash: wsPasswordHash,
            ownerId: 0, // placeholder — mis à jour juste après
          })
          .returning();

        // Créer l'utilisateur avec le workspaceId
        const [createdUser] = await tx
          .insert(users)
          .values({
            email,
            name,
            password: hashedPassword,
            accountType,
            role: "staff",
            workspaceId: createdWorkspace.id,
            backgroundType: "gradient",
            backgroundGradient: userGradient,
          })
          .returning();

        // Mettre à jour ownerId maintenant qu'on a l'userId
        await tx
          .update(workspaces)
          .set({ ownerId: createdUser.id })
          .where(eq(workspaces.id, createdWorkspace.id));

        // Ajouter l'utilisateur comme membre (role: owner)
        await tx.insert(workspaceMembers).values({
          workspaceId: createdWorkspace.id,
          userId: createdUser.id,
          role: "owner",
        });

        return NextResponse.json(
          {
            message: "Compte et workspace créés avec succès",
            user: {
              id: createdUser.id,
              email: createdUser.email,
              name: createdUser.name,
              accountType: createdUser.accountType,
              workspaceId: createdWorkspace.id,
              workspaceName: createdWorkspace.name,
            },
          },
          { status: 201 }
        );
      }

      // --- Action: join ---
      const [existingWorkspace] = await tx
        .select()
        .from(workspaces)
        .where(eq(workspaces.slug, workspace.slug))
        .limit(1);

      if (!existingWorkspace) {
        return NextResponse.json(
          { error: "Aucun workspace trouvé avec cet identifiant" },
          { status: 404 }
        );
      }

      const isWsPasswordValid = await bcrypt.compare(
        workspace.password,
        existingWorkspace.passwordHash
      );

      if (!isWsPasswordValid) {
        return NextResponse.json(
          { error: "Mot de passe de workspace incorrect" },
          { status: 401 }
        );
      }

      // Créer l'utilisateur et le rattacher au workspace
      const [createdUser] = await tx
        .insert(users)
        .values({
          email,
          name,
          password: hashedPassword,
          accountType,
          role: "staff",
          workspaceId: existingWorkspace.id,
          backgroundType: "gradient",
          backgroundGradient: userGradient,
        })
        .returning();

      await tx.insert(workspaceMembers).values({
        workspaceId: existingWorkspace.id,
        userId: createdUser.id,
        role: "member",
      });

      return NextResponse.json(
        {
          message: "Compte créé et workspace rejoint avec succès",
          user: {
            id: createdUser.id,
            email: createdUser.email,
            name: createdUser.name,
            accountType: createdUser.accountType,
            workspaceId: existingWorkspace.id,
            workspaceName: existingWorkspace.name,
          },
        },
        { status: 201 }
      );
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
