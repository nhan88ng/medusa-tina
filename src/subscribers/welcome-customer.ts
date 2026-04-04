import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { sendTemplatedEmail } from "../lib/email-utils"

type CustomerCreatedData = {
  id: string
}

export default async function sendWelcomeEmail({
  event: { data },
  container,
}: SubscriberArgs<CustomerCreatedData>) {
  const logger = container.resolve("logger")

  logger.info(`[welcome-customer] New customer created: ${data.id}`)

  try {
    const query = container.resolve("query")

    const { data: customers } = await query.graph({
      entity: "customer",
      fields: ["id", "email", "first_name", "last_name"],
      filters: {
        id: data.id,
      },
    })

    if (!customers || customers.length === 0) {
      logger.warn(`[welcome-customer] Customer ${data.id} not found`)
      return
    }

    const customer = customers[0]

    if (!customer.email) {
      logger.warn(`[welcome-customer] Customer ${data.id} has no email, skipping`)
      return
    }

    const storeCors = process.env.STORE_CORS?.split(",")[0] || "http://localhost:8000"

    const sent = await sendTemplatedEmail(container, "welcome-customer", customer.email, {
      customer_name: [customer.first_name, customer.last_name]
        .filter(Boolean)
        .join(" ") || undefined,
      email: customer.email,
      store_url: storeCors,
    })

    if (sent) {
      logger.info(`[welcome-customer] Welcome email sent to ${customer.email}`)
    }
  } catch (error) {
    logger.error(`[welcome-customer] Failed: ${error.message}`)
  }
}

export const config: SubscriberConfig = {
  event: "customer.created",
}
