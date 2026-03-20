// ============================================================
// AUTHZ — Politiques d'accès centralisées
//
// Utiliser ces fonctions dans :
//   - middleware.ts  (redirections côté edge)
//   - app/api/**/route.ts  (vérifications côté serveur)
//   - Server Components  (via auth() de next-auth)
//
// Le type `UserRole` doit rester synchronisé avec le champ
// `role` dans lib/schema.ts.
// ============================================================

export type UserRole = "admin" | "user" | "partner";

/**
 * Accès au shell interne (back-office, dashboard, profil...).
 * Autorisé : équipe interne (user) + administrateurs.
 */
export function canAccessInternal(role?: UserRole | string | null): boolean {
  return role === "admin" || role === "user";
}

/**
 * Accès au shell portail (espace partenaire, leads...).
 * Autorisé : partenaires + administrateurs.
 */
export function canAccessPortal(role?: UserRole | string | null): boolean {
  return role === "partner" || role === "admin";
}

/**
 * Accès admin uniquement (actions sensibles, gestion des users...).
 */
export function isAdmin(role?: UserRole | string | null): boolean {
  return role === "admin";
}

// ============================================================
// WORKSPACE — Politiques d'accès aux données partagées
// ============================================================

export type WorkspaceMemberRole = "owner" | "admin" | "member";

/**
 * Vérifie qu'un utilisateur appartient au workspace qu'il tente de manipuler.
 */
export function isMemberOfWorkspace(
  userWorkspaceId: number | null | undefined,
  targetWorkspaceId: number
): boolean {
  return userWorkspaceId === targetWorkspaceId;
}

/**
 * Vérifie qu'un membre est propriétaire ou admin du workspace.
 */
export function isWorkspaceOwnerOrAdmin(role: WorkspaceMemberRole): boolean {
  return role === "owner" || role === "admin";
}

/**
 * Vérifie qu'un membre est propriétaire du workspace.
 */
export function isWorkspaceOwner(role: WorkspaceMemberRole): boolean {
  return role === "owner";
}

// ============================================================
// Exemples d'utilisation dans une route API :
//
//   import { auth } from "@/lib/auth";
//   import { canAccessInternal, isMemberOfWorkspace } from "@/lib/authz";
//
//   export async function GET(req, { params }) {
//     const session = await auth();
//     if (!session || !canAccessInternal(session.user.role)) {
//       return new Response("Unauthorized", { status: 401 });
//     }
//     if (!isMemberOfWorkspace(session.user.workspaceId, params.workspaceId)) {
//       return new Response("Forbidden", { status: 403 });
//     }
//     // ...
//   }
// ============================================================
