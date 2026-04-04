import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { EMAIL_TEMPLATE_MODULE } from "../../../../modules/email-template"
import EmailTemplateModuleService from "../../../../modules/email-template/service"
import { updateEmailTemplateWorkflow } from "../../../../workflows/update-email-template"
import { deleteEmailTemplateWorkflow } from "../../../../workflows/delete-email-template"
import { UpdateEmailTemplateType } from "../validators"

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const service: EmailTemplateModuleService = req.scope.resolve(EMAIL_TEMPLATE_MODULE)
  const template = await service.retrieveEmailTemplate(req.params.id)
  res.json({ email_template: template })
}

export const POST = async (
  req: AuthenticatedMedusaRequest<UpdateEmailTemplateType>,
  res: MedusaResponse
) => {
  const { result } = await updateEmailTemplateWorkflow(req.scope).run({
    input: {
      id: req.params.id,
      ...req.validatedBody,
    },
  })

  res.json({ email_template: result })
}

export const DELETE = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  await deleteEmailTemplateWorkflow(req.scope).run({
    input: { id: req.params.id },
  })

  res.json({ id: req.params.id, object: "email_template", deleted: true })
}
