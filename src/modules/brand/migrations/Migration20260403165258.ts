import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20260403165258 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "brand" add column if not exists "content" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "brand" drop column if exists "content";`);
  }

}
