import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260403171109 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "entity_content" ("id" text not null, "content" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "entity_content_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_entity_content_deleted_at" ON "entity_content" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "entity_content" cascade;`);
  }

}
