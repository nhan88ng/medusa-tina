import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { addToWishlistStep, AddToWishlistStepInput } from "./steps/add-to-wishlist"

export const addToWishlistWorkflow = createWorkflow(
  "add-to-wishlist",
  function (input: AddToWishlistStepInput) {
    const item = addToWishlistStep(input)
    return new WorkflowResponse(item)
  }
)
