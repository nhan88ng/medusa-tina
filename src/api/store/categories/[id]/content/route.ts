import type {
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: [category] } = await query.graph({
    entity: "product_category",
    fields: ["id", "entity_content.*"],
    filters: { id: req.params.id },
  })

  res.json({ entity_content: category?.entity_content ?? null })
}
