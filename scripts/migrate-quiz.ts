/**
 * Script one-shot : crée uniquement les tables quiz qui n'existent pas encore.
 * Usage : npx tsx scripts/migrate-quiz.ts
 */
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env" });
config({ path: ".env.local", override: true });

const sql = postgres(process.env.DATABASE_URL!);

const statements = [
  `CREATE TABLE IF NOT EXISTS "quiz_themes" (
    "id" serial PRIMARY KEY NOT NULL,
    "slug" text NOT NULL,
    "title" text NOT NULL,
    "description" text NOT NULL,
    "icon" text NOT NULL,
    "color" text NOT NULL,
    "order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "quiz_themes_slug_unique" UNIQUE("slug")
  )`,
  `CREATE TABLE IF NOT EXISTS "quiz_subthemes" (
    "id" serial PRIMARY KEY NOT NULL,
    "theme_id" integer NOT NULL,
    "slug" text NOT NULL,
    "title" text NOT NULL,
    "description" text NOT NULL,
    "order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "quiz_modules" (
    "id" serial PRIMARY KEY NOT NULL,
    "subtheme_id" integer NOT NULL,
    "slug" text NOT NULL,
    "title" text NOT NULL,
    "description" text NOT NULL,
    "order" integer DEFAULT 0 NOT NULL,
    "estimated_minutes" integer DEFAULT 10 NOT NULL,
    "difficulty" text DEFAULT 'debutant' NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "quiz_lessons" (
    "id" serial PRIMARY KEY NOT NULL,
    "module_id" integer NOT NULL,
    "title" text NOT NULL,
    "content" jsonb NOT NULL,
    "type" text DEFAULT 'lesson' NOT NULL,
    "applicable_year" integer,
    "company_size" text DEFAULT 'all' NOT NULL,
    "order" integer DEFAULT 0 NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "quiz_questions" (
    "id" serial PRIMARY KEY NOT NULL,
    "module_id" integer NOT NULL,
    "lesson_id" integer,
    "question" text NOT NULL,
    "type" text DEFAULT 'mcq' NOT NULL,
    "explanation" text NOT NULL,
    "difficulty" text DEFAULT 'debutant' NOT NULL,
    "points" integer DEFAULT 1 NOT NULL,
    "order" integer DEFAULT 0 NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "quiz_question_options" (
    "id" serial PRIMARY KEY NOT NULL,
    "question_id" integer NOT NULL,
    "text" text NOT NULL,
    "is_correct" boolean DEFAULT false NOT NULL,
    "order" integer DEFAULT 0 NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "user_module_progress" (
    "id" serial PRIMARY KEY NOT NULL,
    "user_id" integer NOT NULL,
    "module_id" integer NOT NULL,
    "status" text DEFAULT 'not_started' NOT NULL,
    "best_score" integer DEFAULT 0 NOT NULL,
    "attempts" integer DEFAULT 0 NOT NULL,
    "completed_at" timestamp
  )`,
  `CREATE TABLE IF NOT EXISTS "user_quiz_attempts" (
    "id" serial PRIMARY KEY NOT NULL,
    "user_id" integer NOT NULL,
    "module_id" integer NOT NULL,
    "score" integer DEFAULT 0 NOT NULL,
    "total_questions" integer NOT NULL,
    "correct_answers" integer DEFAULT 0 NOT NULL,
    "time_taken_seconds" integer,
    "completed_at" timestamp DEFAULT now() NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "user_question_answers" (
    "id" serial PRIMARY KEY NOT NULL,
    "attempt_id" integer NOT NULL,
    "question_id" integer NOT NULL,
    "selected_option_id" integer,
    "is_correct" boolean DEFAULT false NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "user_achievements" (
    "id" serial PRIMARY KEY NOT NULL,
    "user_id" integer NOT NULL,
    "achievement_type" text NOT NULL,
    "earned_at" timestamp DEFAULT now() NOT NULL,
    "metadata" jsonb
  )`,
  // Foreign keys (IF NOT EXISTS not available for constraints; use DO $$ blocks)
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quiz_subthemes_theme_id_quiz_themes_id_fk') THEN
      ALTER TABLE "quiz_subthemes" ADD CONSTRAINT "quiz_subthemes_theme_id_quiz_themes_id_fk"
        FOREIGN KEY ("theme_id") REFERENCES "quiz_themes"("id") ON DELETE cascade;
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quiz_modules_subtheme_id_quiz_subthemes_id_fk') THEN
      ALTER TABLE "quiz_modules" ADD CONSTRAINT "quiz_modules_subtheme_id_quiz_subthemes_id_fk"
        FOREIGN KEY ("subtheme_id") REFERENCES "quiz_subthemes"("id") ON DELETE cascade;
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quiz_lessons_module_id_quiz_modules_id_fk') THEN
      ALTER TABLE "quiz_lessons" ADD CONSTRAINT "quiz_lessons_module_id_quiz_modules_id_fk"
        FOREIGN KEY ("module_id") REFERENCES "quiz_modules"("id") ON DELETE cascade;
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quiz_questions_module_id_quiz_modules_id_fk') THEN
      ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_module_id_quiz_modules_id_fk"
        FOREIGN KEY ("module_id") REFERENCES "quiz_modules"("id") ON DELETE cascade;
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quiz_questions_lesson_id_quiz_lessons_id_fk') THEN
      ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_lesson_id_quiz_lessons_id_fk"
        FOREIGN KEY ("lesson_id") REFERENCES "quiz_lessons"("id") ON DELETE set null;
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quiz_question_options_question_id_quiz_questions_id_fk') THEN
      ALTER TABLE "quiz_question_options" ADD CONSTRAINT "quiz_question_options_question_id_quiz_questions_id_fk"
        FOREIGN KEY ("question_id") REFERENCES "quiz_questions"("id") ON DELETE cascade;
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_module_progress_user_id_users_id_fk') THEN
      ALTER TABLE "user_module_progress" ADD CONSTRAINT "user_module_progress_user_id_users_id_fk"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade;
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_module_progress_module_id_quiz_modules_id_fk') THEN
      ALTER TABLE "user_module_progress" ADD CONSTRAINT "user_module_progress_module_id_quiz_modules_id_fk"
        FOREIGN KEY ("module_id") REFERENCES "quiz_modules"("id") ON DELETE cascade;
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'user_module_progress_unique') THEN
      CREATE UNIQUE INDEX "user_module_progress_unique" ON "user_module_progress" ("user_id", "module_id");
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_quiz_attempts_user_id_users_id_fk') THEN
      ALTER TABLE "user_quiz_attempts" ADD CONSTRAINT "user_quiz_attempts_user_id_users_id_fk"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade;
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_quiz_attempts_module_id_quiz_modules_id_fk') THEN
      ALTER TABLE "user_quiz_attempts" ADD CONSTRAINT "user_quiz_attempts_module_id_quiz_modules_id_fk"
        FOREIGN KEY ("module_id") REFERENCES "quiz_modules"("id") ON DELETE cascade;
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_question_answers_attempt_id_user_quiz_attempts_id_fk') THEN
      ALTER TABLE "user_question_answers" ADD CONSTRAINT "user_question_answers_attempt_id_user_quiz_attempts_id_fk"
        FOREIGN KEY ("attempt_id") REFERENCES "user_quiz_attempts"("id") ON DELETE cascade;
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_question_answers_question_id_quiz_questions_id_fk') THEN
      ALTER TABLE "user_question_answers" ADD CONSTRAINT "user_question_answers_question_id_quiz_questions_id_fk"
        FOREIGN KEY ("question_id") REFERENCES "quiz_questions"("id") ON DELETE cascade;
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_question_answers_selected_option_id_quiz_question_options_id_fk') THEN
      ALTER TABLE "user_question_answers" ADD CONSTRAINT "user_question_answers_selected_option_id_quiz_question_options_id_fk"
        FOREIGN KEY ("selected_option_id") REFERENCES "quiz_question_options"("id") ON DELETE set null;
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_achievements_user_id_users_id_fk') THEN
      ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_users_id_fk"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade;
    END IF;
  END $$`,
];

async function run() {
  console.log("Running quiz schema migration...");
  for (const stmt of statements) {
    try {
      await sql.unsafe(stmt);
      console.log("✓", stmt.trim().slice(0, 60) + "...");
    } catch (err) {
      console.error("✗", stmt.trim().slice(0, 60));
      console.error(err);
      process.exit(1);
    }
  }
  console.log("\n✅ Quiz schema migration complete.");
  await sql.end();
}

run();
