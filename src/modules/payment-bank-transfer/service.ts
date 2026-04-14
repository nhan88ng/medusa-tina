import { AbstractPaymentProvider } from "@medusajs/framework/utils"
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
import { Logger } from "@medusajs/framework/types"

type BankTransferOptions = {
  bank_name: string
  account_number: string
  account_holder: string
  bank_branch?: string
}

type InjectedDependencies = {
  logger: Logger
}

class BankTransferPaymentService extends AbstractPaymentProvider<BankTransferOptions> {
  static identifier = "bank-transfer"

  protected logger_: Logger
  protected options_: BankTransferOptions

  constructor(
    cradle: InjectedDependencies & Record<string, unknown>,
    options: BankTransferOptions
  ) {
    super(cradle, options)
    this.logger_ = cradle.logger
    this.options_ = options
  }

  async initiatePayment(
    input: InitiatePaymentInput
  ): Promise<InitiatePaymentOutput> {
    return {
      id: `bank_transfer_${crypto.randomUUID()}`,
      data: {
        method: "bank-transfer",
        amount: input.amount,
        currency_code: input.currency_code,
        bank_name: this.options_.bank_name,
        account_number: this.options_.account_number,
        account_holder: this.options_.account_holder,
        bank_branch: this.options_.bank_branch ?? "",
      },
    }
  }

  async authorizePayment(
    input: AuthorizePaymentInput
  ): Promise<AuthorizePaymentOutput> {
    // Returns "pending" — waiting for admin to confirm transfer receipt
    return {
      status: "pending",
      data: input.data ?? {},
    }
  }

  async capturePayment(
    input: CapturePaymentInput
  ): Promise<CapturePaymentOutput> {
    // Called when admin confirms bank transfer received
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
    input: GetPaymentStatusInput
  ): Promise<GetPaymentStatusOutput> {
    const data = input.data ?? {}
    if (data.captured) return { status: "captured" }
    if (data.canceled) return { status: "canceled" }
    return { status: "pending" }
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

export default BankTransferPaymentService
