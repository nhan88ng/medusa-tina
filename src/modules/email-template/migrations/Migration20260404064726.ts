import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260404064726 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "email_template" drop constraint if exists "email_template_template_key_unique";`);
    this.addSql(`create table if not exists "email_template" ("id" text not null, "template_key" text not null, "name" text not null, "description" text null, "subject" text not null, "body" text not null, "is_enabled" boolean not null default true, "category" text not null, "available_variables" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "email_template_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_email_template_template_key_unique" ON "email_template" ("template_key") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_email_template_deleted_at" ON "email_template" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "email_template" cascade;`);
  }

}
