import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { sendTemplatedEmail } from "../lib/email-utils"

export default async function sendOrderConfirmationEmail({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve("logger")

  logger.info(`[order-placed] Sending confirmation for order: ${data.id}`)

  try {
    const query = container.resolve("query")

    const { data: orders } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "display_id",
        "email",
        "total",
        "subtotal",
        "shipping_total",
        "tax_total",
        "currency_code",
        "customer.first_name",
        "customer.last_name",
        "items.*",
        "items.product.title",
        "shipping_address.*",
      ],
      filters: {
        id: data.id,
      },
    })

    if (!orders || orders.length === 0) {
      logger.error(`[order-placed] Order ${data.id} not found`)
      return
    }

    const order = orders[0]

    if (!order.email) {
      logger.warn(`[order-placed] Order ${data.id} has no email, skipping`)
      return
    }

    const sent = await sendTemplatedEmail(container, "order-confirmation", order.email, {
      order_id: order.display_id,
      customer_name: [order.customer?.first_name, order.customer?.last_name]
        .filter(Boolean)
        .join(" ") || undefined,
      items: order.items,
      total: order.total,
      subtotal: order.subtotal,
      shipping_total: order.shipping_total,
      tax_total: order.tax_total,
      currency_code: order.currency_code,
      shipping_address: order.shipping_address,
    })

    if (sent) {
      logger.info(
        `[order-placed] Confirmation email sent to ${order.email} for order #${order.display_id}`
      )
    }
  } catch (error) {
    logger.error(
      `[order-placed] Failed to send confirmation for order ${data.id}: ${error.message}`
    )
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
