import BankTransferPaymentService from "../service"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

const MOCK_OPTIONS = {
  bank_name: "Vietcombank",
  account_number: "1234567890",
  account_holder: "NGUYEN VAN A",
  bank_branch: "HCM",
}

const MOCK_CRADLE = {
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}

describe("BankTransferPaymentService", () => {
  let service: BankTransferPaymentService

  beforeEach(() => {
    service = new BankTransferPaymentService(MOCK_CRADLE as any, MOCK_OPTIONS)
  })

  describe("initiatePayment", () => {
    it("returns a UUID-based ID with bank_transfer_ prefix", async () => {
      const result = await service.initiatePayment({
        amount: 200000,
        currency_code: "vnd",
        context: {},
      } as any)

      expect(result.id).toMatch(/^bank_transfer_/)
      const suffix = result.id!.replace("bank_transfer_", "")
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

    it("includes bank details from options in data", async () => {
      const result = await service.initiatePayment({
        amount: 300000,
        currency_code: "vnd",
        context: {},
      } as any)

      expect(result.data).toMatchObject({
        method: "bank-transfer",
        amount: 300000,
        currency_code: "vnd",
        bank_name: "Vietcombank",
        account_number: "1234567890",
        account_holder: "NGUYEN VAN A",
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

    it("returns pending by default", async () => {
      const result = await service.getPaymentStatus({ data: {} } as any)
      expect(result.status).toBe("pending")
    })
  })
})
