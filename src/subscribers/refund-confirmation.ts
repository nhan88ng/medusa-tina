import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { sendTemplatedEmail } from "../lib/email-utils"

type RefundCreatedData = {
  id: string
  order_id: string
  amount: number
  reason?: string
}

export default async function sendRefundConfirmation({
  event: { data },
  container,
}: SubscriberArgs<RefundCreatedData>) {
  const logger = container.resolve("logger")

  logger.info(`[refund-confirmation] Refund created: ${data.id}`)

  try {
    const query = container.resolve("query")

    const { data: orders } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "display_id",
        "email",
        "currency_code",
        "customer.first_name",
        "customer.last_name",
      ],
      filters: {
        id: data.order_id,
      },
    })

    if (!orders || orders.length === 0) {
      logger.warn(`[refund-confirmation] Order ${data.order_id} not found`)
      return
    }

    const order = orders[0]

    if (!order.email) {
      logger.warn(`[refund-confirmation] Order ${data.order_id} has no email, skipping`)
      return
    }

    const sent = await sendTemplatedEmail(container, "refund-confirmation", order.email, {
      order_id: order.display_id,
      customer_name: [order.customer?.first_name, order.customer?.last_name]
        .filter(Boolean)
        .join(" ") || undefined,
      refund_amount: data.amount,
      currency_code: order.currency_code,
      reason: data.reason,
    })

    if (sent) {
      logger.info(`[refund-confirmation] Email sent to ${order.email} for order #${order.display_id}`)
    }
  } catch (error) {
    logger.error(`[refund-confirmation] Failed: ${error.message}`)
  }
}

export const config: SubscriberConfig = {
  event: "refund.created",
}
