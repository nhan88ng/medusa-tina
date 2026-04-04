import Handlebars from "handlebars"
import type { MedusaContainer } from "@medusajs/framework/types"
import type EmailTemplateModuleService from "../modules/email-template/service"
import { EMAIL_TEMPLATE_MODULE } from "../modules/email-template"

// Register Handlebars helpers
Handlebars.registerHelper("formatPrice", (amount: number, currency: string) => {
  if (amount == null || currency == null) return ""
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount)
})

Handlebars.registerHelper("formatDate", (date: string | Date) => {
  if (!date) return ""
  return new Date(date).toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
})

Handlebars.registerHelper("eq", (a: unknown, b: unknown) => a === b)

Handlebars.registerHelper("currentYear", () => new Date().getFullYear())

export async function sendTemplatedEmail(
  container: MedusaContainer,
  templateKey: string,
  to: string,
  templateData: Record<string, unknown>
): Promise<boolean> {
  const logger = container.resolve("logger")

  let emailTemplateService: EmailTemplateModuleService
  try {
    emailTemplateService = container.resolve(EMAIL_TEMPLATE_MODULE)
  } catch {
    logger.warn(`[email] emailTemplate module not available, skipping "${templateKey}"`)
    return false
  }

  const [templates] = await emailTemplateService.listAndCountEmailTemplates(
    { template_key: templateKey },
    { take: 1 }
  )

  if (!templates.length) {
    logger.warn(`[email] Template "${templateKey}" not found in DB`)
    return false
  }

  const template = templates[0]
  if (!template.is_enabled) {
    logger.info(`[email] Template "${templateKey}" is disabled, skipping`)
    return false
  }

  const data = {
    ...templateData,
    currentYear: new Date().getFullYear(),
  }

  const subject = Handlebars.compile(template.subject)(data)
  const html = Handlebars.compile(template.body)(data)

  const notificationService = container.resolve("notification")
  await notificationService.createNotifications({
    to,
    channel: "email",
    template: templateKey,
    data: {
      ...templateData,
      _rendered: { subject, html },
    },
  })

  logger.info(`[email] "${templateKey}" sent to ${to}`)
  return true
}

export function renderTemplate(
  subject: string,
  body: string,
  data: Record<string, unknown>
): { subject: string; html: string } {
  const fullData = {
    ...data,
    currentYear: new Date().getFullYear(),
  }
  return {
    subject: Handlebars.compile(subject)(fullData),
    html: Handlebars.compile(body)(fullData),
  }
}
