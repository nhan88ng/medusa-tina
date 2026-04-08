import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { sendTemplatedEmail } from "../lib/email-utils"

export default async function sendBankTransferInfoEmail({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve("logger")
  const query = container.resolve("query")

  try {
    const { data: orders } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "display_id",
        "email",
        "total",
        "currency_code",
        "customer.first_name",
        "customer.last_name",
        "payment_collections.payment_sessions.*",
      ],
      filters: { id: data.id },
    })

    const order = orders?.[0]
    if (!order?.email) return

    const isBankTransfer = order.payment_collections?.some((pc: any) =>
      pc.payment_sessions?.some(
        (ps: any) => ps.provider_id?.includes("bank-transfer")
      )
    )

    if (!isBankTransfer) return

    logger.info(
      `[bank-transfer-info] Sending bank transfer info for order #${order.display_id}`
    )

    await sendTemplatedEmail(container, "bank-transfer-info", order.email, {
      order_id: order.display_id,
      customer_name: [order.customer?.first_name, order.customer?.last_name]
        .filter(Boolean)
        .join(" ") || undefined,
      total: order.total,
      currency_code: order.currency_code,
      bank_name: process.env.BANK_NAME || "Vietcombank",
      account_number: process.env.BANK_ACCOUNT_NUMBER || "",
      account_holder: process.env.BANK_ACCOUNT_HOLDER || "TINA SHOP",
      bank_branch: process.env.BANK_BRANCH || "",
    })
  } catch (error) {
    logger.error(
      `[bank-transfer-info] Failed for order ${data.id}: ${error.message}`
    )
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
