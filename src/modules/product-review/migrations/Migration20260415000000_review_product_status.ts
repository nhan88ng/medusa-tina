import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260415000000 extends Migration {
  override async up(): Promise<void> {
    // Composite partial index supports getAverageRating queries:
    // WHERE product_id = ? AND status = 'approved' AND deleted_at IS NULL
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_review_product_status" ON "review" ("product_id", "status") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`DROP INDEX IF EXISTS "IDX_review_product_status";`)
  }
}
