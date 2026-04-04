import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { PRODUCT_REVIEW_MODULE } from "../../modules/product-review"
import ProductReviewModuleService from "../../modules/product-review/service"

export type DeleteReviewStepInput = {
  id: string
}

export const deleteReviewStep = createStep(
  "delete-review-step",
  async (input: DeleteReviewStepInput, { container }) => {
    const reviewService: ProductReviewModuleService =
      container.resolve(PRODUCT_REVIEW_MODULE)

    await reviewService.deleteReviews(input.id)

    return new StepResponse({ id: input.id, deleted: true }, input.id)
  }
)
