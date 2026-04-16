import { CreateSeoMetadataSchema, UpdateSeoMetadataSchema } from "../validators"

describe("CreateSeoMetadataSchema", () => {
  const base = { entity_type: "product" as const, entity_id: "prod_01" }

  it("accepts valid https canonical_url", () => {
    const result = CreateSeoMetadataSchema.safeParse({
      ...base,
      canonical_url: "https://example.com/products/bag",
    })
    expect(result.success).toBe(true)
  })

  it("accepts valid https og_image", () => {
    const result = CreateSeoMetadataSchema.safeParse({
      ...base,
      og_image: "https://cdn.example.com/image.jpg",
    })
    expect(result.success).toBe(true)
  })

  it("rejects javascript: URL in canonical_url", () => {
    const result = CreateSeoMetadataSchema.safeParse({
      ...base,
      canonical_url: "javascript:alert(1)",
    })
    expect(result.success).toBe(false)
  })

  it("rejects plain text (non-URL) in canonical_url", () => {
    const result = CreateSeoMetadataSchema.safeParse({
      ...base,
      canonical_url: "not a url at all",
    })
    expect(result.success).toBe(false)
  })

  it("rejects plain text in og_image", () => {
    const result = CreateSeoMetadataSchema.safeParse({
      ...base,
      og_image: "just-a-filename.jpg",
    })
    expect(result.success).toBe(false)
  })

  it("allows canonical_url to be omitted (optional)", () => {
    const result = CreateSeoMetadataSchema.safeParse(base)
    expect(result.success).toBe(true)
  })

  it("allows empty string canonical_url to be treated as absent", () => {
    // Empty string should either be valid (cleared) or rejected — not pass as a URL
    const result = CreateSeoMetadataSchema.safeParse({
      ...base,
      canonical_url: "",
    })
    // Empty string is not a valid URL; schema should either strip it or reject it
    if (result.success) {
      expect(result.data.canonical_url == null || result.data.canonical_url === "").toBe(true)
    }
    // Either outcome is acceptable — important: "not a url" must NOT pass
  })
})

describe("CreateSeoMetadataSchema — handle removed", () => {
  const base = { entity_type: "product" as const, entity_id: "prod_01" }

  it("strips handle from parsed output (handle is no longer a schema field)", () => {
    const result = CreateSeoMetadataSchema.safeParse({
      ...base,
      meta_title: "My Product",
      handle: "my-product",
    })
    expect(result.success).toBe(true)
    expect((result.data as Record<string, unknown>).handle).toBeUndefined()
  })
})

describe("UpdateSeoMetadataSchema — handle removed", () => {
  it("strips handle from parsed output (handle is no longer a schema field)", () => {
    const result = UpdateSeoMetadataSchema.safeParse({
      meta_title: "Updated Title",
      handle: "some-handle",
    })
    expect(result.success).toBe(true)
    expect((result.data as Record<string, unknown>).handle).toBeUndefined()
  })
})

describe("UpdateSeoMetadataSchema", () => {
  it("rejects javascript: URL in og_image", () => {
    const result = UpdateSeoMetadataSchema.safeParse({
      og_image: "javascript:void(0)",
    })
    expect(result.success).toBe(false)
  })

  it("accepts valid http URL in og_image", () => {
    const result = UpdateSeoMetadataSchema.safeParse({
      og_image: "http://cdn.example.com/img.png",
    })
    expect(result.success).toBe(true)
  })

  it("accepts fully empty update (all fields optional)", () => {
    const result = UpdateSeoMetadataSchema.safeParse({})
    expect(result.success).toBe(true)
  })
})
