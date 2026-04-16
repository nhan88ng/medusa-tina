import { fetchNhanhLocations, getNhanhProductIdFromVariant, NhanhApiError } from "../nhanh"

const ENV = {
  NHANH_APP_ID: "test-app",
  NHANH_BUSINESS_ID: "test-biz",
  NHANH_ACCESS_TOKEN: "test-token",
}

function mockFetchJson(body: unknown) {
  return jest.spyOn(global, "fetch").mockResolvedValue({
    json: async () => body,
  } as Response)
}

beforeEach(() => {
  Object.assign(process.env, ENV)
  jest.restoreAllMocks()
})

afterEach(() => {
  delete process.env.NHANH_APP_ID
  delete process.env.NHANH_BUSINESS_ID
  delete process.env.NHANH_ACCESS_TOKEN
})

// ─── fetchNhanhLocations ────────────────────────────────────────────────────

describe("fetchNhanhLocations", () => {
  it("returns array of locations when code === 1", async () => {
    mockFetchJson({
      code: 1,
      data: [
        { id: 1, name: "Hà Nội" },
        { id: 2, name: "TP. Hồ Chí Minh", otherName: "Sài Gòn" },
      ],
    })

    const result = await fetchNhanhLocations("CITY")

    expect(result).toEqual([
      { id: 1, name: "Hà Nội" },
      { id: 2, name: "TP. Hồ Chí Minh", otherName: "Sài Gòn" },
    ])
  })

  it("sends version=v1 by default", async () => {
    const spy = mockFetchJson({ code: 1, data: [] })

    await fetchNhanhLocations("DISTRICT", 1)

    const body = JSON.parse((spy.mock.calls[0][1] as RequestInit).body as string)
    expect(body.data.version).toBe("v1")
    expect(body.data.parentId).toBe(1)
  })

  it("omits parentId when not provided", async () => {
    const spy = mockFetchJson({ code: 1, data: [] })

    await fetchNhanhLocations("CITY")

    const body = JSON.parse((spy.mock.calls[0][1] as RequestInit).body as string)
    expect(body.data).not.toHaveProperty("parentId")
  })

  it("sends explicit version=v2 when requested", async () => {
    const spy = mockFetchJson({ code: 1, data: [] })

    await fetchNhanhLocations("WARD", 100, "v2")

    const body = JSON.parse((spy.mock.calls[0][1] as RequestInit).body as string)
    expect(body.data.version).toBe("v2")
  })

  it("throws NhanhApiError when code !== 1", async () => {
    mockFetchJson({ code: 0, messages: ["Invalid credentials"] })

    await expect(fetchNhanhLocations("CITY")).rejects.toMatchObject({
      name: "NhanhApiError",
    })
  })

  it("NhanhApiError includes raw response", async () => {
    const raw = { code: -1, messages: ["Expired token"] }
    mockFetchJson(raw)

    try {
      await fetchNhanhLocations("CITY")
      fail("should have thrown")
    } catch (err) {
      expect(err).toBeInstanceOf(NhanhApiError)
      expect((err as NhanhApiError).raw).toEqual(raw)
    }
  })

  it("throws when credentials are missing", async () => {
    delete process.env.NHANH_APP_ID

    await expect(fetchNhanhLocations("CITY")).rejects.toThrow(
      "Missing Nhanh.vn credentials"
    )
  })
})

// ─── getNhanhProductIdFromVariant ───────────────────────────────────────────

describe("getNhanhProductIdFromVariant", () => {
  it("returns integer id for numeric metadata.nhanh_id", () => {
    expect(getNhanhProductIdFromVariant({ metadata: { nhanh_id: 12345 } })).toBe(12345)
  })

  it("parses numeric string as integer", () => {
    expect(getNhanhProductIdFromVariant({ metadata: { nhanh_id: "99" } })).toBe(99)
  })

  it("returns null when metadata is missing", () => {
    expect(getNhanhProductIdFromVariant({ metadata: null })).toBeNull()
    expect(getNhanhProductIdFromVariant({})).toBeNull()
  })

  it("returns null when nhanh_id is missing from metadata", () => {
    expect(getNhanhProductIdFromVariant({ metadata: { sku: "SKU-1" } })).toBeNull()
  })

  it("returns null for zero", () => {
    expect(getNhanhProductIdFromVariant({ metadata: { nhanh_id: 0 } })).toBeNull()
  })

  it("returns null for negative number", () => {
    expect(getNhanhProductIdFromVariant({ metadata: { nhanh_id: -5 } })).toBeNull()
  })

  it("returns null for non-numeric string", () => {
    expect(getNhanhProductIdFromVariant({ metadata: { nhanh_id: "abc" } })).toBeNull()
  })

  it("returns null for float (non-integer)", () => {
    expect(getNhanhProductIdFromVariant({ metadata: { nhanh_id: 1.5 } })).toBeNull()
  })
})
