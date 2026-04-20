import { sql } from "drizzle-orm";
import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  jsonb,
  boolean,
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

// ============================================================
// QUIZ — Hiérarchie du contenu e-learning
// ============================================================

export const quizThemes = pgTable("quiz_themes", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  color: text("color").notNull(),
  order: integer("order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const quizSubthemes = pgTable("quiz_subthemes", {
  id: serial("id").primaryKey(),
  themeId: integer("theme_id")
    .notNull()
    .references(() => quizThemes.id, { onDelete: "cascade" }),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  order: integer("order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
});

export const quizModules = pgTable("quiz_modules", {
  id: serial("id").primaryKey(),
  subthemeId: integer("subtheme_id")
    .notNull()
    .references(() => quizSubthemes.id, { onDelete: "cascade" }),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  order: integer("order").notNull().default(0),
  estimatedMinutes: integer("estimated_minutes").notNull().default(10),
  difficulty: text("difficulty")
    .$type<"debutant" | "intermediaire" | "avance">()
    .notNull()
    .default("debutant"),
  isActive: boolean("is_active").notNull().default(true),
});

export const quizLessons = pgTable("quiz_lessons", {
  id: serial("id").primaryKey(),
  moduleId: integer("module_id")
    .notNull()
    .references(() => quizModules.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: jsonb("content").notNull().$type<unknown>(),
  type: text("type")
    .$type<"lesson" | "regulatory_update" | "case_study" | "zei_spotlight">()
    .notNull()
    .default("lesson"),
  applicableYear: integer("applicable_year"),
  companySize: text("company_size")
    .$type<"all" | "large" | "sme">()
    .notNull()
    .default("all"),
  order: integer("order").notNull().default(0),
});

export const quizQuestions = pgTable("quiz_questions", {
  id: serial("id").primaryKey(),
  moduleId: integer("module_id")
    .notNull()
    .references(() => quizModules.id, { onDelete: "cascade" }),
  lessonId: integer("lesson_id").references(() => quizLessons.id, {
    onDelete: "set null",
  }),
  question: text("question").notNull(),
  type: text("type")
    .$type<"mcq" | "true_false" | "ordering">()
    .notNull()
    .default("mcq"),
  explanation: text("explanation").notNull(),
  difficulty: text("difficulty")
    .$type<"debutant" | "intermediaire" | "avance">()
    .notNull()
    .default("debutant"),
  points: integer("points").notNull().default(1),
  order: integer("order").notNull().default(0),
});

export const quizQuestionOptions = pgTable("quiz_question_options", {
  id: serial("id").primaryKey(),
  questionId: integer("question_id")
    .notNull()
    .references(() => quizQuestions.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  isCorrect: boolean("is_correct").notNull().default(false),
  order: integer("order").notNull().default(0),
});

// ============================================================
// QUIZ — Suivi utilisateur
// ============================================================

export const userModuleProgress = pgTable(
  "user_module_progress",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    moduleId: integer("module_id")
      .notNull()
      .references(() => quizModules.id, { onDelete: "cascade" }),
    status: text("status")
      .$type<"not_started" | "in_progress" | "completed">()
      .notNull()
      .default("not_started"),
    bestScore: integer("best_score").notNull().default(0),
    attempts: integer("attempts").notNull().default(0),
    completedAt: timestamp("completed_at"),
  },
  (table) => [
    uniqueIndex("user_module_progress_unique").on(table.userId, table.moduleId),
  ]
);

export const userQuizAttempts = pgTable("user_quiz_attempts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  moduleId: integer("module_id")
    .notNull()
    .references(() => quizModules.id, { onDelete: "cascade" }),
  score: integer("score").notNull().default(0),
  totalQuestions: integer("total_questions").notNull(),
  correctAnswers: integer("correct_answers").notNull().default(0),
  timeTakenSeconds: integer("time_taken_seconds"),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
});

export const userQuestionAnswers = pgTable("user_question_answers", {
  id: serial("id").primaryKey(),
  attemptId: integer("attempt_id")
    .notNull()
    .references(() => userQuizAttempts.id, { onDelete: "cascade" }),
  questionId: integer("question_id")
    .notNull()
    .references(() => quizQuestions.id, { onDelete: "cascade" }),
  selectedOptionId: integer("selected_option_id").references(
    () => quizQuestionOptions.id,
    { onDelete: "set null" }
  ),
  isCorrect: boolean("is_correct").notNull().default(false),
});

export const userAchievements = pgTable("user_achievements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  achievementType: text("achievement_type").notNull(),
  earnedAt: timestamp("earned_at").defaultNow().notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
});