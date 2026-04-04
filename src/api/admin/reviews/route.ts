import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { PRODUCT_REVIEW_MODULE } from "../../../modules/product-review"
import ProductReviewModuleService from "../../../modules/product-review/service"
import { GetAdminReviewsSchema } from "./validators"

export async function GET(
  req: MedusaRequest<GetAdminReviewsSchema>,
  res: MedusaResponse
) {
  const reviewService: ProductReviewModuleService =
    req.scope.resolve(PRODUCT_REVIEW_MODULE)

  const { status, product_id, limit = 50, offset = 0 } = req.validatedQuery as any

  const filters: Record<string, any> = {}
  if (status) filters.status = status
  if (product_id) filters.product_id = product_id

  const [reviews, count] = await reviewService.listAndCountReviews(filters, {
    take: limit,
    skip: offset,
    order: { created_at: "DESC" },
  })

  res.json({
    reviews,
    count,
    limit,
    offset,
  })
}
