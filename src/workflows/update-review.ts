import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import {
  updateReviewStep,
  UpdateReviewStepInput,
} from "./steps/update-review"

export const updateReviewWorkflow = createWorkflow(
  "update-review",
  function (input: UpdateReviewStepInput) {
    const review = updateReviewStep(input)
    return new WorkflowResponse(review)
  }
)
