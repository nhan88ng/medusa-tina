import {
  AbstractPaymentProvider,
  MedusaError,
} from "@medusajs/framework/utils"
import {
  InitiatePaymentInput,
  InitiatePaymentOutput,
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  ProviderWebhookPayload,
  WebhookActionResult,
} from "@medusajs/types"

class CodPaymentService extends AbstractPaymentProvider {
  static identifier = "cod"

  constructor(cradle: Record<string, unknown>, config?: Record<string, unknown>) {
    super(cradle, config)
  }

  async initiatePayment(
    input: InitiatePaymentInput
  ): Promise<InitiatePaymentOutput> {
    return {
      id: `cod_${Date.now()}`,
      data: {
        method: "cod",
        amount: input.amount,
        currency_code: input.currency_code,
      },
    }
  }

  async authorizePayment(
    input: AuthorizePaymentInput
  ): Promise<AuthorizePaymentOutput> {
    // COD is auto-authorized — payment happens on delivery
    return {
      status: "authorized",
      data: input.data ?? {},
    }
  }

  async capturePayment(
    input: CapturePaymentInput
  ): Promise<CapturePaymentOutput> {
    // Called when admin confirms delivery + cash received
    return {
      data: {
        ...(input.data ?? {}),
        captured: true,
        captured_at: new Date().toISOString(),
      },
    }
  }

  async cancelPayment(
    input: CancelPaymentInput
  ): Promise<CancelPaymentOutput> {
    return {
      data: {
        ...(input.data ?? {}),
        canceled: true,
      },
    }
  }

  async deletePayment(
    _input: DeletePaymentInput
  ): Promise<DeletePaymentOutput> {
    return {}
  }

  async getPaymentStatus(
    _input: GetPaymentStatusInput
  ): Promise<GetPaymentStatusOutput> {
    return { status: "authorized" }
  }

  async refundPayment(
    input: RefundPaymentInput
  ): Promise<RefundPaymentOutput> {
    return {
      data: {
        ...(input.data ?? {}),
        refunded: true,
      },
    }
  }

  async retrievePayment(
    input: RetrievePaymentInput
  ): Promise<RetrievePaymentOutput> {
    return { data: input.data ?? {} }
  }

  async updatePayment(
    input: UpdatePaymentInput
  ): Promise<UpdatePaymentOutput> {
    return { data: input.data ?? {} }
  }

  async getWebhookActionAndData(
    _data: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    return { action: "not_supported" }
  }
}

export default CodPaymentService
