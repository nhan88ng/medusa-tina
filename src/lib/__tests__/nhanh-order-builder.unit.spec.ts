import { buildNhanhOrderPayload } from "../nhanh-order-builder"

// ─── Fixture helpers ─────────────────────────────────────────────────────────

function makeVariant(nhanhId: number | null | undefined, sku = "SKU-1") {
  return {
    id: "var_01",
    sku,
    metadata: nhanhId != null ? { nhanh_id: nhanhId } : {},
  }
}

function makeOrder(overrides: Record<string, any> = {}) {
  return {
    id: "order_01",
    customer: { first_name: "Nguyen", phone: "0901234567" },
    shipping_address: {
      first_name: "Nguyen",
      last_name: "Van A",
      phone: "0901234567",
      address_1: "123 Đường ABC",
      metadata: {
        nhanh_city_id: 1,
        nhanh_district_id: 10,
        nhanh_ward_id: 100,
      },
    },
    items: [
      {
        id: "item_01",
        unit_price: 250000,
        quantity: 2,
        variant: makeVariant(9999),
      },
    ],
    ...overrides,
  }
}

beforeEach(() => {
  process.env.NHANH_DEFAULT_CARRIER_ID = "SPX"
  process.env.NHANH_DEFAULT_SERVICE_ID = "SPX_STANDARD"
})

afterEach(() => {
  delete process.env.NHANH_DEFAULT_CARRIER_ID
  delete process.env.NHANH_DEFAULT_SERVICE_ID
})

// ─── Happy path ──────────────────────────────────────────────────────────────

describe("buildNhanhOrderPayload — happy path", () => {
  it("builds a valid payload from a well-formed order", () => {
    const payload = buildNhanhOrderPayload(makeOrder())

    expect(payload.info?.status).toBe(54)
    expect(payload.channel?.appOrderId).toBe("order_01")
    expect(payload.shippingAddress?.cityId).toBe(1)
    expect(payload.shippingAddress?.districtId).toBe(10)
    expect(payload.shippingAddress?.wardId).toBe(100)
    expect(payload.carrier?.carrierId).toBe("SPX")
    expect(payload.carrier?.serviceId).toBe("SPX_STANDARD")
    expect(payload.carrier?.sendCarrierType).toBe(1)
    expect(payload.carrier?.autoSend).toBe(1)
    expect(payload.products).toEqual([{ id: 9999, price: 250000, quantity: 2 }])
    expect(payload.payment).toEqual({})
    expect(payload.locationVersion).toBe("v1")
  })

  it("uses carrierOverride when provided", () => {
    const payload = buildNhanhOrderPayload(makeOrder(), {
      carrierOverride: { carrierId: "GHTK", serviceId: "GHTK_FAST" },
    })

    expect(payload.carrier?.carrierId).toBe("GHTK")
    expect(payload.carrier?.serviceId).toBe("GHTK_FAST")
  })

  it("omits serviceId when env var is not set and no override", () => {
    delete process.env.NHANH_DEFAULT_SERVICE_ID

    const payload = buildNhanhOrderPayload(makeOrder())

    expect(payload.carrier).not.toHaveProperty("serviceId")
  })

  it("rounds fractional unit_price to integer", () => {
    const order = makeOrder({
      items: [{ id: "item_01", unit_price: 99999.9, quantity: 1, variant: makeVariant(1) }],
    })

    const payload = buildNhanhOrderPayload(order)

    expect(payload.products![0].price).toBe(100000)
  })

  it("builds recipient name from shipping_address first_name + last_name", () => {
    const payload = buildNhanhOrderPayload(makeOrder())

    expect(payload.shippingAddress?.name).toBe("Nguyen Van A")
  })

  it("falls back to customer first_name when address has no name", () => {
    const order = makeOrder({
      shipping_address: {
        ...makeOrder().shipping_address,
        first_name: "",
        last_name: "",
      },
      customer: { first_name: "Tran Thi B", phone: "0909999999" },
    })

    const payload = buildNhanhOrderPayload(order)

    expect(payload.shippingAddress?.name).toBe("Tran Thi B")
  })

  it("uses fallback name 'Khách hàng' when no name available", () => {
    const order = makeOrder({
      shipping_address: {
        ...makeOrder().shipping_address,
        first_name: "",
        last_name: "",
      },
      customer: { first_name: "", phone: "0900000000" },
    })

    const payload = buildNhanhOrderPayload(order)

    expect(payload.shippingAddress?.name).toBe("Khách hàng")
  })

  it("maps multiple line items correctly", () => {
    const order = makeOrder({
      items: [
        { id: "item_01", unit_price: 100000, quantity: 1, variant: makeVariant(111) },
        { id: "item_02", unit_price: 200000, quantity: 3, variant: makeVariant(222) },
      ],
    })

    const payload = buildNhanhOrderPayload(order)

    expect(payload.products).toEqual([
      { id: 111, price: 100000, quantity: 1 },
      { id: 222, price: 200000, quantity: 3 },
    ])
  })
})

// ─── Validation / error paths ─────────────────────────────────────────────────

describe("buildNhanhOrderPayload — validation errors", () => {
  it("throws when NHANH_DEFAULT_CARRIER_ID is missing and no override", () => {
    delete process.env.NHANH_DEFAULT_CARRIER_ID

    expect(() => buildNhanhOrderPayload(makeOrder())).toThrow(
      /NHANH_DEFAULT_CARRIER_ID/
    )
  })

  it("does not throw when carrierOverride is provided without env var", () => {
    delete process.env.NHANH_DEFAULT_CARRIER_ID

    expect(() =>
      buildNhanhOrderPayload(makeOrder(), { carrierOverride: { carrierId: "VTP" } })
    ).not.toThrow()
  })

  it("throws when shipping_address is missing", () => {
    const order = makeOrder({ shipping_address: null })

    expect(() => buildNhanhOrderPayload(order)).toThrow(/no shipping_address/)
  })

  it("throws when nhanh_city_id is missing", () => {
    const order = makeOrder({
      shipping_address: {
        ...makeOrder().shipping_address,
        metadata: { nhanh_district_id: 10, nhanh_ward_id: 100 },
      },
    })

    expect(() => buildNhanhOrderPayload(order)).toThrow(/nhanh_city_id/)
  })

  it("throws when nhanh_district_id is missing", () => {
    const order = makeOrder({
      shipping_address: {
        ...makeOrder().shipping_address,
        metadata: { nhanh_city_id: 1, nhanh_ward_id: 100 },
      },
    })

    expect(() => buildNhanhOrderPayload(order)).toThrow(/nhanh_district_id/)
  })

  it("throws when nhanh_ward_id is missing", () => {
    const order = makeOrder({
      shipping_address: {
        ...makeOrder().shipping_address,
        metadata: { nhanh_city_id: 1, nhanh_district_id: 10 },
      },
    })

    expect(() => buildNhanhOrderPayload(order)).toThrow(/nhanh_ward_id/)
  })

  it("throws when phone is missing from both address and customer", () => {
    const order = makeOrder({
      shipping_address: {
        ...makeOrder().shipping_address,
        phone: "",
      },
      customer: { first_name: "A", phone: "" },
    })

    expect(() => buildNhanhOrderPayload(order)).toThrow(/no phone number/)
  })

  it("throws when a line item has no variant loaded", () => {
    const order = makeOrder({
      items: [{ id: "item_01", unit_price: 100000, quantity: 1, variant: null }],
    })

    expect(() => buildNhanhOrderPayload(order)).toThrow(/no variant relation/)
  })

  it("throws when a variant has no nhanh_id in metadata", () => {
    const order = makeOrder({
      items: [
        { id: "item_01", unit_price: 100000, quantity: 1, variant: makeVariant(null) },
      ],
    })

    expect(() => buildNhanhOrderPayload(order)).toThrow(/no nhanh_id in metadata/)
  })

  it("throws when order has no items", () => {
    const order = makeOrder({ items: [] })

    expect(() => buildNhanhOrderPayload(order)).toThrow(/no line items/)
  })
})
