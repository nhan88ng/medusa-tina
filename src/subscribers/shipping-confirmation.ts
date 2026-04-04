import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { sendTemplatedEmail } from "../lib/email-utils"

type FulfillmentCreatedData = {
  id: string
  order_id: string
}

export default async function sendShippingConfirmation({
  event: { data },
  container,
}: SubscriberArgs<FulfillmentCreatedData>) {
  const logger = container.resolve("logger")

  logger.info(`[shipping-confirmation] Fulfillment created: ${data.id}`)

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
        "items.*",
        "items.product.title",
        "fulfillments.*",
      ],
      filters: {
        id: data.order_id,
      },
    })

    if (!orders || orders.length === 0) {
      logger.warn(`[shipping-confirmation] Order ${data.order_id} not found`)
      return
    }

    const order = orders[0]

    if (!order.email) {
      logger.warn(`[shipping-confirmation] Order ${data.order_id} has no email, skipping`)
      return
    }

    const fulfillment = order.fulfillments?.find((f) => f && (f as { id: string }).id === data.id)
    const trackingLinks = fulfillment ? (fulfillment as unknown as Record<string, unknown>)?.tracking_links as { tracking_number?: string; url?: string }[] | undefined : undefined

    const sent = await sendTemplatedEmail(container, "shipping-confirmation", order.email, {
      order_id: order.display_id,
      customer_name: [order.customer?.first_name, order.customer?.last_name]
        .filter(Boolean)
        .join(" ") || undefined,
      tracking_number: trackingLinks?.[0]?.tracking_number || undefined,
      tracking_url: trackingLinks?.[0]?.url || undefined,
      items: order.items,
    })

    if (sent) {
      logger.info(`[shipping-confirmation] Email sent to ${order.email} for order #${order.display_id}`)
    }
  } catch (error) {
    logger.error(`[shipping-confirmation] Failed: ${error.message}`)
  }
}

export const config: SubscriberConfig = {
  event: "order.fulfillment_created",
}
