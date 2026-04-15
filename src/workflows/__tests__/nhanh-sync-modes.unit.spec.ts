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
import { buildSkuQuantityMapFromList, filterNewProducts } from "../sync-nhanh-products"

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
// Pure logic: filterNewProducts
// ---------------------------------------------------------------------------
// This is the core rule of the create-only sync: skip products that already
// exist in Medusa (by external_id or by any variant SKU).

describe("filterNewProducts", () => {
  const product = (
    externalId: string,
    skus: string[]
  ) => ({
    external_id: externalId,
    variants: skus.map((sku) => ({ sku })),
  })

  it("returns all products when none exist yet", () => {
    const products = [product("nhanh-1", ["SKU-A"]), product("nhanh-2", ["SKU-B"])]
    const result = filterNewProducts(products, new Set(), new Set())
    expect(result).toHaveLength(2)
  })

  it("skips a product whose external_id is already in Medusa", () => {
    const products = [product("nhanh-1", ["SKU-A"]), product("nhanh-2", ["SKU-B"])]
    const result = filterNewProducts(products, new Set(["nhanh-1"]), new Set())
    expect(result).toHaveLength(1)
    expect(result[0].external_id).toBe("nhanh-2")
  })

  it("skips a product whose variant SKU already exists (exact match)", () => {
    const products = [product("nhanh-3", ["SKU-X"]), product("nhanh-4", ["SKU-Y"])]
    const result = filterNewProducts(products, new Set(), new Set(["SKU-X"]))
    expect(result).toHaveLength(1)
    expect(result[0].external_id).toBe("nhanh-4")
  })

  it("SKU matching is case-insensitive — upper in existingSkus matches lower in product", () => {
    const products = [product("nhanh-5", ["sku-abc"])]
    const result = filterNewProducts(products, new Set(), new Set(["SKU-ABC"]))
    expect(result).toHaveLength(0)
  })

  it("SKU matching is case-insensitive — lower in existingSkus matches upper in product", () => {
    const products = [product("nhanh-6", ["SKU-DEF"])]
    const result = filterNewProducts(products, new Set(), new Set(["sku-def"]))
    expect(result).toHaveLength(0)
  })

  it("skips product if ANY of its variant SKUs already exists", () => {
    const products = [{ external_id: "nhanh-7", variants: [{ sku: "V-1" }, { sku: "V-2" }] }]
    // Only V-2 is known — the whole product should still be skipped
    const result = filterNewProducts(products, new Set(), new Set(["V-2"]))
    expect(result).toHaveLength(0)
  })

  it("includes a product whose external_id differs and no SKU matches", () => {
    const products = [product("nhanh-8", ["NEW-SKU"])]
    const result = filterNewProducts(
      products,
      new Set(["nhanh-99"]),
      new Set(["OTHER-SKU"])
    )
    expect(result).toHaveLength(1)
  })

  it("handles products with no variants gracefully", () => {
    const products = [{ external_id: "nhanh-9", variants: [] }]
    const result = filterNewProducts(products, new Set(), new Set(["SKU-X"]))
    // No variant → no SKU match → product is new
    expect(result).toHaveLength(1)
  })

  it("handles products without an external_id (skips ext-id check)", () => {
    const products = [{ external_id: undefined, variants: [{ sku: "FRESH" }] }]
    const result = filterNewProducts(products, new Set(), new Set())
    expect(result).toHaveLength(1)
  })

  it("returns empty array when all products are known", () => {
    const products = [product("nhanh-10", ["S-A"]), product("nhanh-11", ["S-B"])]
    const result = filterNewProducts(
      products,
      new Set(["nhanh-10", "nhanh-11"]),
      new Set()
    )
    expect(result).toHaveLength(0)
  })

  it("handles an empty product list without throwing", () => {
    expect(filterNewProducts([], new Set(["X"]), new Set(["Y"]))).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Structural: create-only steps do not call brand/category update on matches
// ---------------------------------------------------------------------------
describe("syncNhanhBrandsCreateOnlyStep — no update on existing brands", () => {
  const src = fs.readFileSync(
    path.join(__dirname, "../sync-nhanh-products.ts"),
    "utf8"
  )

  it("does not call updateBrands when a brand already exists (no backfill)", () => {
    // Extract just the create-only brand step body (between its step name and the next createStep).
    const stepStart = src.indexOf("sync-nhanh-brands-create-only")
    const stepEnd = src.indexOf("createStep", stepStart + 1)
    const stepBody = src.slice(stepStart, stepEnd)

    expect(stepBody).not.toMatch(/updateBrands/)
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
