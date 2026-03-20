/** Libellé court pour distinguer compte personnel / entreprise (ex. sidebar, menu user). */
export function getAccountContextLabel(user: {
  accountType?: "user" | "business" | null;
  workspaceName?: string | null;
} | null | undefined): string {
  if (!user || user.accountType !== "business") {
    return "Compte personnel";
  }
  const name = user.workspaceName?.trim();
  return name && name.length > 0 ? name : "Espace entreprise";
}
