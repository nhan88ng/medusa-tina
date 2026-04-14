import fs from "fs"
import path from "path"

const MIGRATIONS_DIR = path.join(__dirname, "../migrations")

describe("review composite index migration", () => {
  it("migration file for composite index exists", () => {
    const files = fs.readdirSync(MIGRATIONS_DIR)
    const compositeIndexMigration = files.find((f) => f.includes("review_product_status"))
    expect(compositeIndexMigration).toBeDefined()
  })

  it("migration creates composite index on (product_id, status) filtered by deleted_at IS NULL", () => {
    const files = fs.readdirSync(MIGRATIONS_DIR)
    const migrationFile = files.find((f) => f.includes("review_product_status"))
    expect(migrationFile).toBeDefined()

    const content = fs.readFileSync(path.join(MIGRATIONS_DIR, migrationFile!), "utf8")
    // Must include both columns in the index
    expect(content).toMatch(/product_id.*status|status.*product_id/i)
    // Must be a partial index scoped to non-deleted rows
    expect(content).toMatch(/deleted_at IS NULL/i)
    // Must be a CREATE INDEX statement
    expect(content).toMatch(/CREATE INDEX/i)
  })

  it("migration includes a down() that drops the index", () => {
    const files = fs.readdirSync(MIGRATIONS_DIR)
    const migrationFile = files.find((f) => f.includes("review_product_status"))!
    const content = fs.readFileSync(path.join(MIGRATIONS_DIR, migrationFile), "utf8")
    expect(content).toMatch(/DROP INDEX/i)
  })
})
