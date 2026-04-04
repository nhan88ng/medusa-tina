import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { deleteReviewStep } from "./steps/delete-review"

export const deleteReviewWorkflow = createWorkflow(
  "delete-review",
  function (input: { id: string }) {
    const result = deleteReviewStep(input)
    return new WorkflowResponse(result)
  }
)
