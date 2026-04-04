import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { deleteEmailTemplateStep } from "./steps/delete-email-template"

export const deleteEmailTemplateWorkflow = createWorkflow(
  "delete-email-template",
  function (input: { id: string }) {
    const result = deleteEmailTemplateStep(input.id)
    return new WorkflowResponse(result)
  }
)
