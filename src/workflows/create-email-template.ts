import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { createEmailTemplateStep } from "./steps/create-email-template"

type CreateEmailTemplateWorkflowInput = {
  template_key: string
  name: string
  description?: string
  subject: string
  body: string
  is_enabled?: boolean
  category: string
  available_variables?: string
}

export const createEmailTemplateWorkflow = createWorkflow(
  "create-email-template",
  function (input: CreateEmailTemplateWorkflowInput) {
    const template = createEmailTemplateStep(input)
    return new WorkflowResponse(template)
  }
)
