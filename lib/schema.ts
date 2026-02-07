import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  jsonb,
  boolean,
} from "drizzle-orm/pg-core";

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