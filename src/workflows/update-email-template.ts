import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { updateEmailTemplateStep } from "./steps/update-email-template"

type UpdateEmailTemplateWorkflowInput = {
  id: string
  name?: string
  description?: string
  subject?: string
  body?: string
  is_enabled?: boolean
  category?: string
  available_variables?: string
}

export const updateEmailTemplateWorkflow = createWorkflow(
  "update-email-template",
  function (input: UpdateEmailTemplateWorkflowInput) {
    const template = updateEmailTemplateStep(input)
    return new WorkflowResponse(template)
  }
)
