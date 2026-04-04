import {
  createWorkflow,
  WorkflowResponse,
  transform,
} from "@medusajs/framework/workflows-sdk"
import { createRemoteLinkStep } from "@medusajs/medusa/core-flows"
import { Modules } from "@medusajs/framework/utils"
import { createReviewStep, CreateReviewStepInput } from "./steps/create-review"
import { PRODUCT_REVIEW_MODULE } from "../modules/product-review"

export const createReviewWorkflow = createWorkflow(
  "create-review",
  function (input: CreateReviewStepInput) {
    const review = createReviewStep(input)

    const linkData = transform({ review, input }, ({ review, input }) => [
      {
        [Modules.PRODUCT]: {
          product_id: input.product_id,
        },
        [PRODUCT_REVIEW_MODULE]: {
          review_id: review.id,
        },
      },
    ])

    createRemoteLinkStep(linkData)

    return new WorkflowResponse(review)
  }
)
