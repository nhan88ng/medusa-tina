import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { EMAIL_TEMPLATE_MODULE } from "../../modules/email-template"
import EmailTemplateModuleService from "../../modules/email-template/service"

export const deleteEmailTemplateStep = createStep(
  "delete-email-template-step",
  async (id: string, { container }) => {
    const service: EmailTemplateModuleService = container.resolve(EMAIL_TEMPLATE_MODULE)
    const template = await service.retrieveEmailTemplate(id)
    await service.deleteEmailTemplates(id)
    return new StepResponse(null, template)
  },
  async (template, { container }) => {
    if (!template) return
    const service: EmailTemplateModuleService = container.resolve(EMAIL_TEMPLATE_MODULE)
    await service.createEmailTemplates(template)
  }
)
