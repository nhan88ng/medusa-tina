import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { deleteBrandStep } from "./steps/delete-brand"

export const deleteBrandWorkflow = createWorkflow(
  "delete-brand",
  function (input: { id: string }) {
    const result = deleteBrandStep(input.id)
    return new WorkflowResponse(result)
  }
)
