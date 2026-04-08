import {
  MedusaRequest,
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { PRODUCT_REVIEW_MODULE } from "../../../../../modules/product-review"
import ProductReviewModuleService from "../../../../../modules/product-review/service"
import { createReviewWorkflow } from "../../../../../workflows/create-review"
import { sendTemplatedEmail } from "../../../../../lib/email-utils"
import { CreateStoreReviewSchema } from "./validators"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { id: product_id } = req.params
  const reviewService: ProductReviewModuleService =
    req.scope.resolve(PRODUCT_REVIEW_MODULE)

  const limit = Number(req.query.limit) || 20
  const offset = Number(req.query.offset) || 0

  const [reviews, count] = await reviewService.listAndCountReviews(
    { product_id, status: "approved" },
    { take: limit, skip: offset, order: { created_at: "DESC" } }
  )

  const stats = await reviewService.getAverageRating(product_id)

  res.json({
    reviews,
    count,
    limit,
    offset,
    average_rating: stats.average,
    total_count: stats.count,
  })
}

export async function POST(
  req: AuthenticatedMedusaRequest<CreateStoreReviewSchema>,
  res: MedusaResponse
) {
  const { id: product_id } = req.params
  const customer_id = req.auth_context?.actor_id

  const { result: review } = await createReviewWorkflow(req.scope).run({
    input: {
      product_id,
      customer_id,
      ...req.validatedBody,
    },
  })

  // Send confirmation email (best-effort)
  if (req.auth_context?.actor_id) {
    try {
      const query = req.scope.resolve("query")
      const { data: customers } = await query.graph({
        entity: "customer",
        fields: ["id", "email", "first_name", "last_name"],
        filters: { id: customer_id },
      })
      const customer = customers?.[0]
      const { data: products } = await query.graph({
        entity: "product",
        fields: ["id", "title"],
        filters: { id: product_id },
      })
      const product = products?.[0]

      if (customer?.email) {
        await sendTemplatedEmail(
          req.scope,
          "review-submitted",
          customer.email,
          {
            customer_name:
              [customer.first_name, customer.last_name]
                .filter(Boolean)
                .join(" ") || undefined,
            product_title: product?.title ?? "",
            rating: review.rating,
            title: review.title,
            content: review.content,
          }
        )
      }
    } catch {
      // Non-critical, ignore errors
    }
  }

  res.status(201).json({ review })
}
