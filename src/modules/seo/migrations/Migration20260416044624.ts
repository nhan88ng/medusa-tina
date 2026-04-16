import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260416044624 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "seo_metadata" drop column if exists "handle";`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "seo_metadata" add column if not exists "handle" text null;`);
  }

}
