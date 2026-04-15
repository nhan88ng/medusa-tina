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
import {
  buildSkuQuantityMapFromList,
  filterNewProducts,
  buildCategoryParentUpdates,
  buildCatsWithContent,
} from "../sync-nhanh-products"

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

// ---------------------------------------------------------------------------
// Pure logic: buildCategoryParentUpdates
// ---------------------------------------------------------------------------
// Bug fix: parent-linking in the create-only step was running for ALL categories
// in idMap (including pre-existing ones). It should only run for newly created ones.

describe("buildCategoryParentUpdates", () => {
  it("returns parent update only for a newly created category", () => {
    const cats = [{ id: 10, parentId: 1 }]
    const idMap = { 1: "medusa-parent", 10: "medusa-new-child" }
    const newlyCreatedIds = new Set(["medusa-new-child"])
    const updates = buildCategoryParentUpdates(cats, idMap, newlyCreatedIds)
    expect(updates).toEqual([{ id: "medusa-new-child", parent_category_id: "medusa-parent" }])
  })

  it("does NOT return a parent update for an existing category", () => {
    const cats = [{ id: 10, parentId: 1 }]
    const idMap = { 1: "medusa-parent", 10: "medusa-existing-child" }
    // medusa-existing-child was matched, not created — absent from newlyCreatedIds
    const newlyCreatedIds = new Set<string>()
    const updates = buildCategoryParentUpdates(cats, idMap, newlyCreatedIds)
    expect(updates).toHaveLength(0)
  })

  it("skips categories whose parent is not in idMap", () => {
    const cats = [{ id: 5, parentId: 999 }] // 999 not in idMap
    const idMap = { 5: "medusa-new" }
    const newlyCreatedIds = new Set(["medusa-new"])
    expect(buildCategoryParentUpdates(cats, idMap, newlyCreatedIds)).toHaveLength(0)
  })

  it("skips root-level categories (parentId <= 0)", () => {
    const cats = [{ id: 3, parentId: 0 }, { id: 4, parentId: -1 }]
    const idMap = { 3: "m3", 4: "m4" }
    const newlyCreatedIds = new Set(["m3", "m4"])
    expect(buildCategoryParentUpdates(cats, idMap, newlyCreatedIds)).toHaveLength(0)
  })

  it("handles mixed new and existing categories correctly", () => {
    const cats = [
      { id: 10, parentId: 1 }, // existing
      { id: 20, parentId: 1 }, // new
    ]
    const idMap = { 1: "root", 10: "existing", 20: "brand-new" }
    const newlyCreatedIds = new Set(["brand-new"])
    const updates = buildCategoryParentUpdates(cats, idMap, newlyCreatedIds)
    expect(updates).toHaveLength(1)
    expect(updates[0].id).toBe("brand-new")
  })

  it("returns empty array for empty cats list", () => {
    expect(buildCategoryParentUpdates([], {}, new Set())).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Pure logic: buildCatsWithContent
// ---------------------------------------------------------------------------
// Bug fix: catsWithContent was including existing categories (idMap has both),
// causing syncCategoryContentStep to overwrite manually edited content in Medusa.

describe("buildCatsWithContent", () => {
  it("returns content only for newly created categories", () => {
    const cats = [
      { id: 1, content: "<p>Hello</p>" },
      { id: 2, content: "<p>World</p>" },
    ]
    const idMap = { 1: "medusa-existing", 2: "medusa-new" }
    const newlyCreatedIds = new Set(["medusa-new"])
    const result = buildCatsWithContent(cats, idMap, newlyCreatedIds)
    expect(result).toEqual([{ medusaId: "medusa-new", content: "<p>World</p>" }])
  })

  it("does NOT return content for an existing category", () => {
    const cats = [{ id: 1, content: "<p>Existing</p>" }]
    const idMap = { 1: "medusa-existing" }
    const newlyCreatedIds = new Set<string>() // existing, not newly created
    expect(buildCatsWithContent(cats, idMap, newlyCreatedIds)).toHaveLength(0)
  })

  it("skips categories with no content", () => {
    const cats = [{ id: 1, content: "" }, { id: 2 }]
    const idMap = { 1: "m1", 2: "m2" }
    const newlyCreatedIds = new Set(["m1", "m2"])
    expect(buildCatsWithContent(cats, idMap, newlyCreatedIds)).toHaveLength(0)
  })

  it("skips categories not in idMap", () => {
    const cats = [{ id: 99, content: "<p>Orphan</p>" }]
    const idMap = {}
    const newlyCreatedIds = new Set<string>()
    expect(buildCatsWithContent(cats, idMap, newlyCreatedIds)).toHaveLength(0)
  })

  it("returns empty array when nothing newly created has content", () => {
    expect(buildCatsWithContent([], {}, new Set())).toEqual([])
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
