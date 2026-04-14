import { SearchQuerySchema } from "../validators"

describe("SearchQuerySchema", () => {
  it("accepts a basic search with defaults", () => {
    const result = SearchQuerySchema.safeParse({ q: "túi xách" })
    expect(result.success).toBe(true)
    expect(result.data?.limit).toBe(20)
    expect(result.data?.offset).toBe(0)
  })

  it("coerces limit and offset from strings (query params are strings)", () => {
    const result = SearchQuerySchema.safeParse({ limit: "10", offset: "5" })
    expect(result.success).toBe(true)
    expect(result.data?.limit).toBe(10)
    expect(result.data?.offset).toBe(5)
  })

  it("rejects limit above 100", () => {
    const result = SearchQuerySchema.safeParse({ limit: "101" })
    expect(result.success).toBe(false)
  })

  it("rejects negative limit", () => {
    const result = SearchQuerySchema.safeParse({ limit: "-1" })
    expect(result.success).toBe(false)
  })

  it("rejects negative offset", () => {
    const result = SearchQuerySchema.safeParse({ offset: "-5" })
    expect(result.success).toBe(false)
  })

  it("rejects non-numeric limit", () => {
    const result = SearchQuerySchema.safeParse({ limit: "many" })
    expect(result.success).toBe(false)
  })

  it("accepts valid category_id", () => {
    const result = SearchQuerySchema.safeParse({ category_id: "cat_01abc-XYZ" })
    expect(result.success).toBe(true)
  })

  it("rejects category_id with unsafe characters", () => {
    const result = SearchQuerySchema.safeParse({ category_id: 'foo"bar' })
    expect(result.success).toBe(false)
  })

  it("rejects collection_id with spaces", () => {
    const result = SearchQuerySchema.safeParse({ collection_id: "col id" })
    expect(result.success).toBe(false)
  })

  it("accepts empty query (browse mode)", () => {
    const result = SearchQuerySchema.safeParse({})
    expect(result.success).toBe(true)
    expect(result.data?.q).toBe("")
  })
})
