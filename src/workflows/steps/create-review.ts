import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { PRODUCT_REVIEW_MODULE } from "../../modules/product-review"
import ProductReviewModuleService from "../../modules/product-review/service"

export type CreateReviewStepInput = {
  product_id: string
  customer_id?: string
  rating: number
  title?: string
  content: string
  first_name: string
  last_name: string
  images?: string[]
}

export const createReviewStep = createStep(
  "create-review-step",
  async (input: CreateReviewStepInput, { container }) => {
    const reviewService: ProductReviewModuleService =
      container.resolve(PRODUCT_REVIEW_MODULE)

    const review = await reviewService.createReviews({
      product_id: input.product_id,
      customer_id: input.customer_id,
      rating: input.rating,
      title: input.title,
      content: input.content,
      first_name: input.first_name,
      last_name: input.last_name,
      status: "pending",
      images: (input.images ?? null) as any,
    })

    return new StepResponse(review, review.id)
  },
  async (reviewId: string, { container }) => {
    const reviewService: ProductReviewModuleService =
      container.resolve(PRODUCT_REVIEW_MODULE)
    await reviewService.deleteReviews(reviewId)
  }
)
