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
    fields: ["id", "entity_content.*"],
    filters: { id: req.params.id },
  })

  res.json({ entity_content: product?.entity_content ?? null })
}
