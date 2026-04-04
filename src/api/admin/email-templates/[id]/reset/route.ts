import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { EMAIL_TEMPLATE_MODULE } from "../../../../../modules/email-template"
import EmailTemplateModuleService from "../../../../../modules/email-template/service"
import { defaultTemplates } from "../../../../../modules/email-template/default-templates"
import { updateEmailTemplateWorkflow } from "../../../../../workflows/update-email-template"

export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const service: EmailTemplateModuleService = req.scope.resolve(EMAIL_TEMPLATE_MODULE)
  const template = await service.retrieveEmailTemplate(req.params.id)

  const defaultTemplate = defaultTemplates.find(
    (t) => t.template_key === template.template_key
  )

  if (!defaultTemplate) {
    res.status(404).json({
      message: `No default template found for "${template.template_key}"`,
    })
    return
  }

  const { result } = await updateEmailTemplateWorkflow(req.scope).run({
    input: {
      id: req.params.id,
      subject: defaultTemplate.subject,
      body: defaultTemplate.body,
      name: defaultTemplate.name,
      description: defaultTemplate.description,
      available_variables: defaultTemplate.available_variables,
    },
  })

  res.json({ email_template: result })
}
