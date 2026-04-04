import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import {
  removeFromWishlistStep,
  RemoveFromWishlistStepInput,
} from "./steps/remove-from-wishlist"

export const removeFromWishlistWorkflow = createWorkflow(
  "remove-from-wishlist",
  function (input: RemoveFromWishlistStepInput) {
    const result = removeFromWishlistStep(input)
    return new WorkflowResponse(result)
  }
)
