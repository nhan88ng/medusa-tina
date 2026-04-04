import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { sendTemplatedEmail } from "../lib/email-utils"

export default async function reviewRequestJob(container: MedusaContainer) {
  const logger = container.resolve("logger")
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  logger.info("[review-request] Checking for orders to request reviews...")

  try {
    // Find orders completed 5 days ago
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)

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
        "fulfillments.*",
      ],
      filters: {
        created_at: {
          $gte: sixDaysAgo.toISOString(),
          $lt: fiveDaysAgo.toISOString(),
        },
      },
    })

    if (!orders || orders.length === 0) {
      logger.info("[review-request] No orders eligible for review request")
      return
    }

    const storeCors = process.env.STORE_CORS?.split(",")[0] || "http://localhost:8000"
    let sentCount = 0

    for (const order of orders) {
      if (!order.email) continue

      // Only send for orders that have fulfillments
      if (!order.fulfillments || order.fulfillments.length === 0) continue

      try {
        const sent = await sendTemplatedEmail(container, "review-request", order.email, {
          order_id: order.display_id,
          customer_name: [order.customer?.first_name, order.customer?.last_name]
            .filter(Boolean)
            .join(" ") || undefined,
          items: order.items,
          review_url: `${storeCors}/account/orders/${order.id}`,
        })

        if (sent) sentCount++
      } catch (error) {
        logger.error(`[review-request] Failed for order ${order.id}: ${error.message}`)
      }
    }

    logger.info(`[review-request] Sent ${sentCount} review request emails`)
  } catch (error) {
    logger.error(`[review-request] Job failed: ${error.message}`)
  }
}

export const config = {
  name: "review-request",
  schedule: "0 9 * * *", // Every day at 9 AM
}
