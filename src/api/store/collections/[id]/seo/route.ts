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

  const { data: [collection] } = await query.graph({
    entity: "product_collection",
    fields: ["id", "seo_metadata.*"],
    filters: { id: req.params.id },
  })

  res.json({ seo_metadata: collection?.seo_metadata ?? null })
}
