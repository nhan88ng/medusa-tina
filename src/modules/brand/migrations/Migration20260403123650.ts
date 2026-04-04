import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260403123650 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "brand" add column if not exists "handle" text not null default '';`);
    this.addSql(`update "brand" set "handle" = lower(regexp_replace(regexp_replace("name", '[^a-zA-Z0-9]+', '-', 'g'), '^-|-$', '', 'g')) where "handle" = '';`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_brand_handle_unique" ON "brand" ("handle") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "IDX_brand_handle_unique";`);
    this.addSql(`alter table if exists "brand" drop column if exists "handle";`);
  }

}
