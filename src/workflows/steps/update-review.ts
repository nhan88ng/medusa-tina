import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { PRODUCT_REVIEW_MODULE } from "../../modules/product-review"
import ProductReviewModuleService from "../../modules/product-review/service"

export type UpdateReviewStepInput = {
  id: string
  status?: "pending" | "approved" | "rejected"
  title?: string
  content?: string
  rating?: number
}

export const updateReviewStep = createStep(
  "update-review-step",
  async (input: UpdateReviewStepInput, { container }) => {
    const reviewService: ProductReviewModuleService =
      container.resolve(PRODUCT_REVIEW_MODULE)

    const previous = await reviewService.retrieveReview(input.id)

    const { id, ...updateData } = input
    const review = await reviewService.updateReviews({
      id,
      ...updateData,
    })

    return new StepResponse(review, { id: previous.id, previous })
  },
  async ({ id, previous }: { id: string; previous: any }, { container }) => {
    const reviewService: ProductReviewModuleService =
      container.resolve(PRODUCT_REVIEW_MODULE)
    await reviewService.updateReviews({
      id,
      status: previous.status,
      title: previous.title,
      content: previous.content,
      rating: previous.rating,
    })
  }
)
