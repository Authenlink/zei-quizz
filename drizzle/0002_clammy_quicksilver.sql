CREATE TABLE "user_zei_enriched_module_views" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"module_id" integer NOT NULL,
	"first_viewed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_zei_enriched_module_views" ADD CONSTRAINT "user_zei_enriched_module_views_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "user_zei_enriched_module_views" ADD CONSTRAINT "user_zei_enriched_module_views_module_id_quiz_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."quiz_modules"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "user_zei_enriched_module_views_unique" ON "user_zei_enriched_module_views" USING btree ("user_id","module_id");
