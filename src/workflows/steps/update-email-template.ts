import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { EMAIL_TEMPLATE_MODULE } from "../../modules/email-template"
import EmailTemplateModuleService from "../../modules/email-template/service"

type UpdateEmailTemplateInput = {
  id: string
  name?: string
  description?: string
  subject?: string
  body?: string
  is_enabled?: boolean
  category?: string
  available_variables?: string
}

export const updateEmailTemplateStep = createStep(
  "update-email-template-step",
  async (input: UpdateEmailTemplateInput, { container }) => {
    const service: EmailTemplateModuleService = container.resolve(EMAIL_TEMPLATE_MODULE)
    const previous = await service.retrieveEmailTemplate(input.id)
    const template = await service.updateEmailTemplates(input)
    return new StepResponse(template, previous)
  },
  async (previous, { container }) => {
    if (!previous) return
    const service: EmailTemplateModuleService = container.resolve(EMAIL_TEMPLATE_MODULE)
    await service.updateEmailTemplates(previous)
  }
)
