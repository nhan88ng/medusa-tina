import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { removeFromWishlistWorkflow } from "../../../../../../workflows/remove-from-wishlist"

export async function DELETE(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const customer_id = req.auth_context.actor_id
  const { product_id } = req.params

  const { result } = await removeFromWishlistWorkflow(req.scope).run({
    input: { customer_id, product_id },
  })

  res.json(result)
}
