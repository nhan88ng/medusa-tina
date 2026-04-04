import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { EMAIL_TEMPLATE_MODULE } from "../../../modules/email-template"
import EmailTemplateModuleService from "../../../modules/email-template/service"
import { createEmailTemplateWorkflow } from "../../../workflows/create-email-template"
import { CreateEmailTemplateType } from "./validators"

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const service: EmailTemplateModuleService = req.scope.resolve(EMAIL_TEMPLATE_MODULE)

  const filters: Record<string, unknown> = {}
  if (req.query.category) {
    filters.category = req.query.category
  }

  const [templates, count] = await service.listAndCountEmailTemplates(
    filters,
    {
      order: { category: "ASC", name: "ASC" },
    }
  )

  res.json({ email_templates: templates, count })
}

export const POST = async (
  req: AuthenticatedMedusaRequest<CreateEmailTemplateType>,
  res: MedusaResponse
) => {
  const { result } = await createEmailTemplateWorkflow(req.scope).run({
    input: req.validatedBody,
  })

  res.json({ email_template: result })
}
