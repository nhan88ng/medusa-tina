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

  const { data: [category] } = await query.graph({
    entity: "product_category",
    fields: ["id", "seo_metadata.*"],
    filters: { id: req.params.id },
  })

  res.json({ seo_metadata: category?.seo_metadata ?? null })
}
