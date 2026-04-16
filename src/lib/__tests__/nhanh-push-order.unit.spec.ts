import { pushNhanhOrder, NhanhApiError, NhanhOrderPayload } from "../nhanh"

const ENV = {
  NHANH_APP_ID: "test-app",
  NHANH_BUSINESS_ID: "test-biz",
  NHANH_ACCESS_TOKEN: "test-token",
}

const MINIMAL_PAYLOAD: NhanhOrderPayload = {
  info: { status: 54 },
  channel: { appOrderId: "order_01" },
  shippingAddress: { name: "Nguyen Van A", mobile: "0901234567", cityId: 1, districtId: 10, wardId: 100 },
  carrier: { carrierId: "SPX", sendCarrierType: 1, autoSend: 1 },
  products: [{ id: 999, price: 250000, quantity: 2 }],
  payment: {},
  locationVersion: "v1",
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

// ─── Happy path ─────────────────────────────────────────────────────────────

describe("pushNhanhOrder — happy path", () => {
  it("returns id and trackingUrl on success", async () => {
    mockFetchJson({
      code: 1,
      data: { id: 7777, trackingUrl: "https://track.example.com/7777" },
    })

    const result = await pushNhanhOrder(MINIMAL_PAYLOAD)

    expect(result).toEqual({ id: 7777, trackingUrl: "https://track.example.com/7777" })
  })

  it("coerces string id to number", async () => {
    mockFetchJson({ code: 1, data: { id: "8888", trackingUrl: "" } })

    const result = await pushNhanhOrder(MINIMAL_PAYLOAD)

    expect(result.id).toBe(8888)
    expect(typeof result.id).toBe("number")
  })

  it("returns empty string trackingUrl when API omits it", async () => {
    mockFetchJson({ code: 1, data: { id: 1 } })

    const result = await pushNhanhOrder(MINIMAL_PAYLOAD)

    expect(result.trackingUrl).toBe("")
  })

  it("wraps payload in data key when calling API", async () => {
    const spy = mockFetchJson({ code: 1, data: { id: 1, trackingUrl: "" } })

    await pushNhanhOrder(MINIMAL_PAYLOAD)

    const body = JSON.parse((spy.mock.calls[0][1] as RequestInit).body as string)
    expect(body).toHaveProperty("data")
    expect(body.data).toMatchObject(MINIMAL_PAYLOAD)
  })

  it("calls the correct endpoint with credentials in URL", async () => {
    const spy = mockFetchJson({ code: 1, data: { id: 1, trackingUrl: "" } })

    await pushNhanhOrder(MINIMAL_PAYLOAD)

    const url = spy.mock.calls[0][0] as string
    expect(url).toContain("/order/add")
    expect(url).toContain("appId=test-app")
    expect(url).toContain("businessId=test-biz")
  })
})

// ─── Error path ─────────────────────────────────────────────────────────────

describe("pushNhanhOrder — error paths", () => {
  it("throws NhanhApiError when code !== 1", async () => {
    mockFetchJson({ code: 0, messages: ["Duplicate order"] })

    await expect(pushNhanhOrder(MINIMAL_PAYLOAD)).rejects.toBeInstanceOf(NhanhApiError)
  })

  it("NhanhApiError.raw contains the full API response", async () => {
    const raw = { code: -1, messages: ["Access denied"] }
    mockFetchJson(raw)

    try {
      await pushNhanhOrder(MINIMAL_PAYLOAD)
      fail("should have thrown")
    } catch (err) {
      expect((err as NhanhApiError).raw).toEqual(raw)
    }
  })

  it("throws NhanhApiError with timeout message when fetch times out", async () => {
    const abortErr = Object.assign(new Error("The operation was aborted"), {
      name: "AbortError",
    })
    jest.spyOn(global, "fetch").mockRejectedValue(abortErr)

    try {
      await pushNhanhOrder(MINIMAL_PAYLOAD)
      fail("should have thrown")
    } catch (err) {
      expect(err).toBeInstanceOf(NhanhApiError)
      expect((err as NhanhApiError).message).toMatch(/timed out/i)
    }
  })

  it("re-throws non-abort network errors as-is", async () => {
    const netErr = new Error("ECONNREFUSED")
    jest.spyOn(global, "fetch").mockRejectedValue(netErr)

    await expect(pushNhanhOrder(MINIMAL_PAYLOAD)).rejects.toThrow("ECONNREFUSED")
  })

  it("throws when credentials are missing", async () => {
    delete process.env.NHANH_APP_ID

    await expect(pushNhanhOrder(MINIMAL_PAYLOAD)).rejects.toThrow(
      "Missing Nhanh.vn credentials"
    )
  })
})
