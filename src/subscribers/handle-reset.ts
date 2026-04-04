import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { sendTemplatedEmail } from "../lib/email-utils"

type PasswordResetData = {
  entity_id: string
  actor_type: string
  token: string
}

export default async function handlePasswordReset({
  event: { data },
  container,
}: SubscriberArgs<PasswordResetData>) {
  const logger = container.resolve("logger")

  const { entity_id: email, actor_type, token } = data

  logger.info(
    `[handle-reset] Password reset requested for ${actor_type}: ${email}`
  )

  try {
    let resetUrl: string

    if (actor_type === "customer") {
      const storeCors = process.env.STORE_CORS?.split(",")[0] || "http://localhost:8000"
      resetUrl = `${storeCors}/reset-password?token=${token}&email=${encodeURIComponent(email)}`
    } else {
      const adminCors = process.env.ADMIN_CORS?.split(",")[0] || "http://localhost:9000"
      resetUrl = `${adminCors}/app/reset-password?token=${token}&email=${encodeURIComponent(email)}`
    }

    const sent = await sendTemplatedEmail(container, "password-reset", email, {
      reset_url: resetUrl,
      actor_type,
    })

    if (sent) {
      logger.info(`[handle-reset] Password reset email sent to ${email}`)
    }
  } catch (error) {
    logger.error(
      `[handle-reset] Failed to send password reset email to ${email}: ${error.message}`
    )
  }
}

export const config: SubscriberConfig = {
  event: "auth.password_reset",
}
