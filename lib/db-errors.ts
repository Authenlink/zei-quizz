/** PostgreSQL: undefined_table */
const PG_UNDEFINED_TABLE = "42P01";

/**
 * Vérifie si l’erreur (souvent enveloppée par Drizzle) indique qu’une relation
 * n’existe pas encore (migration non appliquée).
 */
export function isPostgresUndefinedTableError(e: unknown): boolean {
  let cur: unknown = e;
  for (let i = 0; i < 8 && cur; i++) {
    if (
      typeof cur === "object" &&
      cur !== null &&
      "code" in cur &&
      (cur as { code?: string }).code === PG_UNDEFINED_TABLE
    ) {
      return true;
    }
    cur =
      typeof cur === "object" && cur !== null && "cause" in cur
        ? (cur as { cause: unknown }).cause
        : null;
  }
  return false;
}
