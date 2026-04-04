import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { EMAIL_TEMPLATE_MODULE } from "../../modules/email-template"
import EmailTemplateModuleService from "../../modules/email-template/service"

type CreateEmailTemplateInput = {
  template_key: string
  name: string
  description?: string
  subject: string
  body: string
  is_enabled?: boolean
  category: string
  available_variables?: string
}

export const createEmailTemplateStep = createStep(
  "create-email-template-step",
  async (input: CreateEmailTemplateInput, { container }) => {
    const service: EmailTemplateModuleService = container.resolve(EMAIL_TEMPLATE_MODULE)
    const template = await service.createEmailTemplates(input)
    return new StepResponse(template, template.id)
  },
  async (id: string | undefined, { container }) => {
    if (!id) return
    const service: EmailTemplateModuleService = container.resolve(EMAIL_TEMPLATE_MODULE)
    await service.deleteEmailTemplates(id)
  }
)
