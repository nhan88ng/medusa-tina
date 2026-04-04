import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { deleteEntityContentStep } from "./steps/delete-entity-content"

export const deleteEntityContentWorkflow = createWorkflow(
  "delete-entity-content",
  function (input: { id: string }) {
    const result = deleteEntityContentStep(input.id)
    return new WorkflowResponse(result)
  }
)
