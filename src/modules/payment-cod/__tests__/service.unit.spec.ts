import CodPaymentService from "../service"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

describe("CodPaymentService", () => {
  let service: CodPaymentService

  beforeEach(() => {
    service = new CodPaymentService({} as any, {})
  })

  describe("initiatePayment", () => {
    it("returns a UUID-based ID with cod_ prefix", async () => {
      const result = await service.initiatePayment({
        amount: 100000,
        currency_code: "vnd",
        context: {},
      } as any)

      expect(result.id).toMatch(/^cod_/)
      const suffix = result.id!.replace("cod_", "")
      expect(suffix).toMatch(UUID_REGEX)
    })

    it("returns unique IDs on concurrent calls", async () => {
      const results = await Promise.all(
        Array.from({ length: 5 }, () =>
          service.initiatePayment({ amount: 100, currency_code: "vnd", context: {} } as any)
        )
      )
      const ids = results.map((r) => r.id)
      expect(new Set(ids).size).toBe(5)
    })

    it("includes method, amount, and currency_code in data", async () => {
      const result = await service.initiatePayment({
        amount: 50000,
        currency_code: "vnd",
        context: {},
      } as any)

      expect(result.data).toMatchObject({
        method: "cod",
        amount: 50000,
        currency_code: "vnd",
      })
    })
  })

  describe("getPaymentStatus", () => {
    it("returns captured when data.captured is set", async () => {
      const result = await service.getPaymentStatus({ data: { captured: true } } as any)
      expect(result.status).toBe("captured")
    })

    it("returns canceled when data.canceled is set", async () => {
      const result = await service.getPaymentStatus({ data: { canceled: true } } as any)
      expect(result.status).toBe("canceled")
    })

    it("returns authorized by default (COD is auto-authorized on initiation)", async () => {
      const result = await service.getPaymentStatus({ data: {} } as any)
      expect(result.status).toBe("authorized")
    })
  })
})
