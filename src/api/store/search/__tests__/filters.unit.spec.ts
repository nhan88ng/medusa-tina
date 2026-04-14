import { buildSearchFilters } from "../filters"

describe("buildSearchFilters", () => {
  it("always includes the published status filter", () => {
    const result = buildSearchFilters({})
    expect(result).toContainEqual(['status = "published"'])
  })

  it("adds category_id filter when provided", () => {
    const result = buildSearchFilters({ category_id: "cat_01abc" })
    expect(result).toContainEqual(['category_ids = "cat_01abc"'])
  })

  it("adds collection_id filter when provided", () => {
    const result = buildSearchFilters({ collection_id: "col-xyz-123" })
    expect(result).toContainEqual(['collection_id = "col-xyz-123"'])
  })

  it("includes all three filters when both IDs provided", () => {
    const result = buildSearchFilters({ category_id: "cat_01", collection_id: "col_02" })
    expect(result).toHaveLength(3)
  })

  it("throws on category_id with double quotes (injection attempt)", () => {
    expect(() =>
      buildSearchFilters({ category_id: 'foo" OR status = "published' })
    ).toThrow(/unsafe/)
  })

  it("throws on collection_id with injection characters", () => {
    expect(() =>
      buildSearchFilters({ collection_id: "id' AND 1=1" })
    ).toThrow(/unsafe/)
  })

  it("throws on category_id with spaces", () => {
    expect(() =>
      buildSearchFilters({ category_id: "cat id with spaces" })
    ).toThrow(/unsafe/)
  })

  it("allows UUID-formatted IDs", () => {
    const uuid = "01966b2e-4e5f-7000-b0b0-123456789abc"
    expect(() => buildSearchFilters({ category_id: uuid })).not.toThrow()
    expect(() => buildSearchFilters({ collection_id: uuid })).not.toThrow()
  })

  it("returns filters as array-of-arrays (safe MeiliSearch format)", () => {
    const result = buildSearchFilters({ category_id: "cat_01" })
    expect(Array.isArray(result)).toBe(true)
    result.forEach((clause) => expect(Array.isArray(clause)).toBe(true))
  })
})
