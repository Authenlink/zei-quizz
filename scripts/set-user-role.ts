/**
 * Script one-shot : met à jour le rôle RBAC d'un compte existant.
 *
 * Utile pour les comptes créés avant que la valeur par défaut soit corrigée
 * (ils ont été enregistrés en `role = "staff"` au lieu de `role = "user"`).
 *
 * Usage :
 *   npx tsx scripts/set-user-role.ts <email> <role>
 *
 * Exemples :
 *   npx tsx scripts/set-user-role.ts moi@example.com user
 *   npx tsx scripts/set-user-role.ts admin@zei.fr admin
 */
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env" });
config({ path: ".env.local", override: true });

const VALID_ROLES = ["admin", "staff", "user"] as const;
type Role = (typeof VALID_ROLES)[number];

const [, , email, role] = process.argv;

if (!email || !role) {
  console.error("Usage : npx tsx scripts/set-user-role.ts <email> <role>");
  console.error(`Rôles valides : ${VALID_ROLES.join(", ")}`);
  process.exit(1);
}

if (!VALID_ROLES.includes(role as Role)) {
  console.error(`Rôle invalide : "${role}". Attendu : ${VALID_ROLES.join(", ")}`);
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL!);

(async () => {
  try {
    const result = await sql<{ id: number; email: string; role: string }[]>`
      UPDATE users
      SET role = ${role}
      WHERE email = ${email}
      RETURNING id, email, role
    `;

    if (result.length === 0) {
      console.error(`Aucun utilisateur trouvé avec l'email "${email}".`);
      process.exit(1);
    }

    console.log(`OK — utilisateur mis à jour :`, result[0]);
  } catch (err) {
    console.error("Erreur :", err);
    process.exit(1);
  } finally {
    await sql.end();
  }
})();
