import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { sendTemplatedEmail } from "../lib/email-utils"

export default async function abandonedCartJob(container: MedusaContainer) {
  const logger = container.resolve("logger")
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  logger.info("[abandoned-cart] Checking for abandoned carts...")

  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

    const { data: carts } = await query.graph({
      entity: "cart",
      fields: [
        "id",
        "email",
        "currency_code",
        "updated_at",
        "completed_at",
        "items.*",
        "items.product.title",
        "customer.first_name",
        "customer.last_name",
      ],
      filters: {
        completed_at: null as unknown as string,
        updated_at: { $lt: oneHourAgo },
      },
    })

    if (!carts || carts.length === 0) {
      logger.info("[abandoned-cart] No abandoned carts found")
      return
    }

    const cartsWithEmail = carts.filter(
      (cart: { email?: string | null; items?: unknown[] }) =>
        cart.email && cart.items && cart.items.length > 0
    )

    let sentCount = 0
    const storeCors = process.env.STORE_CORS?.split(",")[0] || "http://localhost:8000"

    for (const cart of cartsWithEmail) {
      try {
        const sent = await sendTemplatedEmail(container, "abandoned-cart", cart.email!, {
          customer_name: cart.customer
            ? [cart.customer.first_name, cart.customer.last_name]
                .filter(Boolean)
                .join(" ")
            : undefined,
          items: cart.items,
          currency_code: cart.currency_code,
          cart_url: `${storeCors}/cart`,
        })

        if (sent) sentCount++
      } catch (error) {
        logger.error(`[abandoned-cart] Failed for cart ${cart.id}: ${error.message}`)
      }
    }

    logger.info(`[abandoned-cart] Sent ${sentCount} abandoned cart emails`)
  } catch (error) {
    logger.error(`[abandoned-cart] Job failed: ${error.message}`)
  }
}

export const config = {
  name: "abandoned-cart-reminder",
  schedule: "0 * * * *", // Every hour
}
