import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { sendTemplatedEmail } from "../lib/email-utils"

type FulfillmentDeliveredData = {
  id: string
  order_id: string
}

export default async function sendDeliveryConfirmation({
  event: { data },
  container,
}: SubscriberArgs<FulfillmentDeliveredData>) {
  const logger = container.resolve("logger")

  logger.info(`[delivery-confirmation] Fulfillment delivered: ${data.id}`)

  try {
    const query = container.resolve("query")

    const { data: orders } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "display_id",
        "email",
        "customer.first_name",
        "customer.last_name",
        "items.*",
        "items.product.title",
      ],
      filters: {
        id: data.order_id,
      },
    })

    if (!orders || orders.length === 0) {
      logger.warn(`[delivery-confirmation] Order ${data.order_id} not found`)
      return
    }

    const order = orders[0]

    if (!order.email) {
      logger.warn(`[delivery-confirmation] Order ${data.order_id} has no email, skipping`)
      return
    }

    const storeCors = process.env.STORE_CORS?.split(",")[0] || "http://localhost:8000"

    const sent = await sendTemplatedEmail(container, "delivery-confirmation", order.email, {
      order_id: order.display_id,
      customer_name: [order.customer?.first_name, order.customer?.last_name]
        .filter(Boolean)
        .join(" ") || undefined,
      items: order.items,
      review_url: `${storeCors}/account/orders/${order.id}`,
    })

    if (sent) {
      logger.info(`[delivery-confirmation] Email sent to ${order.email} for order #${order.display_id}`)
    }
  } catch (error) {
    logger.error(`[delivery-confirmation] Failed: ${error.message}`)
  }
}

export const config: SubscriberConfig = {
  event: "order.fulfillment_delivered",
}
