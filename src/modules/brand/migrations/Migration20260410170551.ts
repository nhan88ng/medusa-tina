import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260410170551 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "brand" drop constraint if exists "brand_external_id_unique";`);
    this.addSql(`alter table if exists "brand" add column if not exists "external_id" text null;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_brand_external_id_unique" ON "brand" ("external_id") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "IDX_brand_external_id_unique";`);
    this.addSql(`alter table if exists "brand" drop column if exists "external_id";`);
  }

}
