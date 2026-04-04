import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { PRODUCT_REVIEW_MODULE } from "../../../../modules/product-review"
import ProductReviewModuleService from "../../../../modules/product-review/service"
import { updateReviewWorkflow } from "../../../../workflows/update-review"
import { deleteReviewWorkflow } from "../../../../workflows/delete-review"
import { UpdateReviewSchema } from "../validators"

export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params
  const reviewService: ProductReviewModuleService =
    req.scope.resolve(PRODUCT_REVIEW_MODULE)

  const review = await reviewService.retrieveReview(id).catch(() => null)
  if (!review) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Review not found")
  }

  res.json({ review })
}

export async function POST(
  req: AuthenticatedMedusaRequest<UpdateReviewSchema>,
  res: MedusaResponse
) {
  const { id } = req.params

  const { result: review } = await updateReviewWorkflow(req.scope).run({
    input: { id, ...req.validatedBody },
  })

  res.json({ review })
}

export async function DELETE(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const { id } = req.params

  const { result } = await deleteReviewWorkflow(req.scope).run({
    input: { id },
  })

  res.json(result)
}
