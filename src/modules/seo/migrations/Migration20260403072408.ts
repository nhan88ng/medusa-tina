import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260403072408 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "seo_metadata" ("id" text not null, "meta_title" text null, "meta_description" text null, "meta_keywords" text null, "og_title" text null, "og_description" text null, "og_image" text null, "canonical_url" text null, "handle" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "seo_metadata_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_seo_metadata_deleted_at" ON "seo_metadata" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "seo_metadata" cascade;`);
  }

}
