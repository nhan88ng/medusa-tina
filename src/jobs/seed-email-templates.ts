import { MedusaContainer } from "@medusajs/framework/types"
import { EMAIL_TEMPLATE_MODULE } from "../modules/email-template"
import EmailTemplateModuleService from "../modules/email-template/service"
import { defaultTemplates } from "../modules/email-template/default-templates"

export default async function seedEmailTemplates(container: MedusaContainer) {
  const logger = container.resolve("logger")
  const service: EmailTemplateModuleService = container.resolve(EMAIL_TEMPLATE_MODULE)

  let created = 0

  for (const template of defaultTemplates) {
    const [existing] = await service.listAndCountEmailTemplates(
      { template_key: template.template_key },
      { take: 1 }
    )

    if (existing.length === 0) {
      await service.createEmailTemplates(template)
      created++
      logger.info(`[seed-email-templates] Created: ${template.template_key}`)
    }
  }

  if (created > 0) {
    logger.info(`[seed-email-templates] Seeded ${created} email templates`)
  } else {
    logger.info(`[seed-email-templates] All templates already exist, skipping`)
  }
}

export const config = {
  name: "seed-email-templates",
  schedule: "* * * * *", // Every minute — but numberOfExecutions: 1 ensures it only ever runs once
  numberOfExecutions: 1,
}
