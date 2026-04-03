import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: [product] } = await query.graph({
    entity: "product",
    fields: ["id", "brand.*"],
    filters: { id: req.params.id },
  })

  res.json({ brand: product?.brand || null })
}
