import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ============================================================
// MIDDLEWARE — Protection des routes et redirections par rôle
//
// Décommenter le bloc RBAC ci-dessous pour activer les
// redirections automatiques selon le rôle utilisateur.
// Nécessite que `role` soit présent dans le token JWT
// (configurer le callback `jwt` dans auth.ts).
// ============================================================

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- Routes publiques : toujours accessibles ---
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/api/auth") ||
    pathname === "/"
  ) {
    return NextResponse.next();
  }

  // ============================================================
  // RBAC — Décommenter pour activer les redirections par rôle
  //
  // import { getToken } from "next-auth/jwt";
  //
  // const token = await getToken({ req: request });
  //
  // if (!token) {
  //   return NextResponse.redirect(new URL("/login", request.url));
  // }
  //
  // const role = token.role as string | undefined;
  //
  // // Seuls les admins / équipe interne accèdent au back-office
  // if (pathname.startsWith("/dashboard") || pathname.startsWith("/profile")) {
  //   if (!canAccessInternal(role)) {
  //     return NextResponse.redirect(new URL("/portal", request.url));
  //   }
  // }
  //
  // // Seuls les partenaires (et admins) accèdent au portail
  // if (pathname.startsWith("/portal")) {
  //   if (!canAccessPortal(role)) {
  //     return NextResponse.redirect(new URL("/dashboard", request.url));
  //   }
  // }
  // ============================================================

  return NextResponse.next();
}

// ============================================================
// Helpers RBAC (à aligner avec lib/authz.ts)
// ============================================================

// function canAccessInternal(role?: string): boolean {
//   return role === "admin" || role === "user";
// }

// function canAccessPortal(role?: string): boolean {
//   return role === "partner" || role === "admin";
// }

export const config = {
  matcher: [
    /*
     * Applique le middleware à toutes les routes sauf :
     * - _next/static  (fichiers statiques)
     * - _next/image   (optimisation images)
     * - favicon.ico
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
