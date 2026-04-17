import { sql } from "drizzle-orm";
import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ============================================================
// TABLE WORKSPACES — Espace partagé pour les comptes entreprise
// ============================================================
export const workspaces = pgTable("workspaces", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(), // identifiant URL-friendly, ex: "acme-corp"
  passwordHash: text("password_hash").notNull(), // bcrypt du mot de passe de workspace
  ownerId: integer("owner_id").notNull(), // userId du créateur — FK circulaire gérée via SQL
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================
// TABLE WORKSPACE_MEMBERS — Membres d'un workspace
// ============================================================
export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: serial("id").primaryKey(),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: integer("user_id").notNull(), // FK vers users — circulaire, pas de .references() ici
    role: text("role")
      .$type<"owner" | "admin" | "member">()
      .notNull()
      .default("member"),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("workspace_members_unique").on(table.workspaceId, table.userId)]
);

// ============================================================
// TABLE USERS - Etendue pour NextAuth + profil
// ============================================================
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified"),
  image: text("image"),
  password: text("password"), // Hashe avec bcrypt, nullable pour OAuth futur
  accountType: text("account_type").notNull().default("user"), // "user" | "business"

  // Rôle pour le RBAC (contrôle d'accès par route) — ne pas confondre avec accountType
  // "admin" → accès complet (back-office + portail)
  // "staff" → équipe interne / back-office uniquement
  // "user"  → utilisateurs du portail (ex-partenaires) uniquement
  role: text("role").$type<"admin" | "staff" | "user">().notNull().default("staff"),

  // Workspace (comptes entreprise) — null pour les comptes personnels
  workspaceId: integer("workspace_id").references(() => workspaces.id, { onDelete: "set null" }),

  // Champs de profil utilisateur
  bio: text("bio"),
  location: text("location"),
  website: text("website"),
  banner: text("banner"), // URL image de banniere

  // Background (gradient ou image)
  backgroundType: text("background_type").$type<"image" | "gradient" | null>(),
  backgroundGradient: jsonb("background_gradient").$type<{
    color1: string;
    color2: string;
    css: string;
  }>(),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================
// ASSISTANT IA — conversations persistées (AI SDK UIMessage[])
// ============================================================
export const assistantConversations = pgTable("assistant_conversations", {
  id: text("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title"),
  /** Snapshot des messages au format AI SDK (json). */
  messages: jsonb("messages").notNull().$type<unknown[]>().default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ============================================================
// TABLES NEXTAUTH - Necessaires pour le DrizzleAdapter
// ============================================================

// Table accounts (OAuth providers)
export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
});

// Table sessions
export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  sessionToken: text("session_token").notNull().unique(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires").notNull(),
});

// Table verification tokens (email verification)
export const verificationTokens = pgTable("verification_tokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull().unique(),
  expires: timestamp("expires").notNull(),
});