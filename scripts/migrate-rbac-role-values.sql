-- Migration ponctuelle des valeurs RBAC (ANCIEN modèle → NOUVEAU)
--
-- Ancien : role IN ('admin', 'user', 'partner')
--   - 'user'    = équipe interne / back-office
--   - 'partner' = portail
-- Nouveau : role IN ('admin', 'staff', 'user')
--   - 'staff' = équipe interne / back-office
--   - 'user'  = portail
--
-- À exécuter UNE SEULE FOIS sur une base qui utilise encore l’ancien schéma.
-- Ne pas lancer si les rôles ont déjà été renommés (sinon les `user` du portail
-- seraient convertis en `staff` par erreur).
--
-- psql "$DATABASE_URL" -f scripts/migrate-rbac-role-values.sql

BEGIN;

UPDATE users SET role = 'staff' WHERE role = 'user';
UPDATE users SET role = 'user' WHERE role = 'partner';

ALTER TABLE users ALTER COLUMN role SET DEFAULT 'staff';

COMMIT;
