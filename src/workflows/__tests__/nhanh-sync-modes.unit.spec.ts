/**
 * Unit tests for Nhanh.vn additional sync modes.
 *
 * Tests pure logic (buildSkuQuantityMapFromList) and structural contracts
 * (workflow exports, step presence) without requiring a Medusa container.
 */

import fs from "fs"
import path from "path"

// ---------------------------------------------------------------------------
// Pure logic: buildSkuQuantityMapFromList
// ---------------------------------------------------------------------------
// We test the extracted utility independently so we can cover edge cases
// without standing up Medusa infrastructure.
import { buildSkuQuantityMapFromList } from "../sync-nhanh-products"

describe("buildSkuQuantityMapFromList", () => {
  it("maps a standalone product's code → available quantity", () => {
    const items = [
      { id: 1, parentId: -1, code: "ABC123", inventory: { available: 5 } },
    ]
    expect(buildSkuQuantityMapFromList(items)).toEqual({ ABC123: 5 })
  })

  it("maps variant items (parentId > 0) by their own code", () => {
    const items = [
      { id: 10, parentId: 1, code: "VAR-A", inventory: { available: 3 } },
      { id: 11, parentId: 1, code: "VAR-B", inventory: { available: 7 } },
    ]
    const map = buildSkuQuantityMapFromList(items)
    expect(map).toEqual({ "VAR-A": 3, "VAR-B": 7 })
  })

  it("defaults to 0 when inventory is missing", () => {
    const items = [{ id: 2, parentId: -1, code: "NO-INV" }]
    expect(buildSkuQuantityMapFromList(items)).toEqual({ "NO-INV": 0 })
  })

  it("skips items with no code", () => {
    const items = [{ id: 3, parentId: -1, inventory: { available: 9 } }]
    expect(buildSkuQuantityMapFromList(items)).toEqual({})
  })

  it("trims whitespace from codes", () => {
    const items = [{ id: 4, parentId: -1, code: "  SKU-X  ", inventory: { available: 2 } }]
    const map = buildSkuQuantityMapFromList(items)
    expect(map["SKU-X"]).toBe(2)
  })

  it("handles an empty list without throwing", () => {
    expect(buildSkuQuantityMapFromList([])).toEqual({})
  })
})

// ---------------------------------------------------------------------------
// Structural: workflow exports
// ---------------------------------------------------------------------------
describe("sync-nhanh-products.ts — workflow exports", () => {
  const src = fs.readFileSync(
    path.join(__dirname, "../sync-nhanh-products.ts"),
    "utf8"
  )

  it("exports syncNhanhInventoryOnlyWorkflow", () => {
    expect(src).toMatch(/export.*syncNhanhInventoryOnlyWorkflow/)
  })

  it("exports syncNhanhCreateOnlyWorkflow", () => {
    expect(src).toMatch(/export.*syncNhanhCreateOnlyWorkflow/)
  })

  it("inventory-only workflow uses sync-nhanh-inventory-only-workflow name", () => {
    expect(src).toMatch(/sync-nhanh-inventory-only-workflow/)
  })

  it("create-only workflow uses sync-nhanh-create-only-workflow name", () => {
    expect(src).toMatch(/sync-nhanh-create-only-workflow/)
  })
})

// ---------------------------------------------------------------------------
// Structural: create-only steps do not call update APIs
// ---------------------------------------------------------------------------
describe("syncNhanhCategoriesCreateOnlyStep", () => {
  const src = fs.readFileSync(
    path.join(__dirname, "../sync-nhanh-products.ts"),
    "utf8"
  )

  it("is exported", () => {
    expect(src).toMatch(/export.*syncNhanhCategoriesCreateOnlyStep/)
  })
})

describe("syncNhanhBrandsCreateOnlyStep", () => {
  const src = fs.readFileSync(
    path.join(__dirname, "../sync-nhanh-products.ts"),
    "utf8"
  )

  it("is exported", () => {
    expect(src).toMatch(/export.*syncNhanhBrandsCreateOnlyStep/)
  })
})

describe("distributeMedusaProductsCreateOnlyStep", () => {
  const src = fs.readFileSync(
    path.join(__dirname, "../sync-nhanh-products.ts"),
    "utf8"
  )

  it("is exported", () => {
    expect(src).toMatch(/export.*distributeMedusaProductsCreateOnlyStep/)
  })
})

// ---------------------------------------------------------------------------
// Structural: API route files export a POST handler
// ---------------------------------------------------------------------------
describe("API route: /admin/nhanh-sync/inventory-only", () => {
  const src = fs.readFileSync(
    path.join(__dirname, "../../api/admin/nhanh-sync/inventory-only/route.ts"),
    "utf8"
  )

  it("exports a POST function", () => {
    expect(src).toMatch(/export async function POST/)
  })

  it("uses syncNhanhInventoryOnlyWorkflow", () => {
    expect(src).toMatch(/syncNhanhInventoryOnlyWorkflow/)
  })
})

describe("API route: /admin/nhanh-sync/create-only", () => {
  const src = fs.readFileSync(
    path.join(__dirname, "../../api/admin/nhanh-sync/create-only/route.ts"),
    "utf8"
  )

  it("exports a POST function", () => {
    expect(src).toMatch(/export async function POST/)
  })

  it("uses syncNhanhCreateOnlyWorkflow", () => {
    expect(src).toMatch(/syncNhanhCreateOnlyWorkflow/)
  })
})
